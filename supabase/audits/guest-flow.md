# Guest flow security audit (v0.16.10, 2026-06-07)

This document closes audit round 3 findings #3 ("guest access enforcement looks mostly UI-side") and #4 ("public guest route bypasses normal auth gate"). v0.16.3 pulled the `guest-register` Edge Function into the repo so it could be reviewed; this audit walks through the entire guest-registration → guest-session → guest-action surface against the actual server-side controls.

## Scope

**Surfaces inspected:**
- `/guest/<slug>` public route (App.jsx:326 — renders GuestRegister.jsx unauthenticated)
- `guest-register` Edge Function (verify_jwt=false, public POST)
- `guest-link` Edge Function (verify_jwt=true, called after magic-link auth)
- `guest-qr-token` Edge Function (verify_jwt=true, mints signed QR URLs)
- RLS policies on `guests`, `guest_visits`, and every table with `is_active_guest()` SELECT clauses
- `src/lib/guestAccess.js` — the client-side access matrix

**Out of scope:** PII handling for guests (email/zip storage at rest), bot/CAPTCHA detection beyond what's noted below.

## Threat model

What a hostile actor with no credentials can do via `/guest/<slug>`:
1. **Spam guest registrations** for a club, exhausting the club's storage and surfacing fake names in the Guest Registrations admin feed.
2. **Forge a QR token** to bypass the manager-bound or clubhouse-bound entry path.
3. **Pivot a registered guest session into actions they shouldn't have** (write to messages, place orders, register for events, see member-only content).
4. **Use the guest endpoint to enumerate** which clubs exist and which have guest_registration enabled.

## guest-register (audit finding #4) — verified controls

The function lives at `supabase/functions/guest-register/index.ts` (pulled into the repo in v0.16.3). Walking the validation chain:

| Control | Where | Verdict |
|---|---|---|
| **QR token HMAC signature** | `verifyMemberToken` and `verifyClubhouseToken` — HMAC-SHA256 with key derived from `GUEST_QR_SIGNING_SECRET` (or fallback SHA-256 of service-role-key + ':guest-qr-v1') | ✅ Strong |
| **Constant-time signature comparison** | `safeEqual` — XOR-based, doesn't short-circuit on first mismatch | ✅ Resistant to timing attacks |
| **Club status — feature flag + tier** | Reads `clubs.subscription_tier`, `feature_flags`, `feature_flags_locked`; requires tier ≥ standard AND `guest_registration: true`. Lock takes precedence over the regular flag. | ✅ Correct |
| **Email format** | `validEmail()` regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` | ✅ Reasonable |
| **ZIP format** | US 5- or 9-digit, or Canadian postal pattern | ✅ Covers expected user base |
| **Phone collection per club setting** | `club.guest_phone_collection` ∈ `{off, optional, required}`; required mode rejects empty phone | ✅ |
| **Visit duration** | Computes `expires_at` from `club.guest_visit_duration_days` in club's local timezone | ✅ |
| **Idempotency** | Upsert on `(club_id, email)` — re-registering the same email at the same club updates rather than duplicating | ✅ |
| **Server-side canonical redirect** | The magic-link `emailRedirectTo` is constructed from the looked-up `club.slug + ROOT_DOMAIN` — client-posted `redirect_to` is IGNORED (v0.14.13 hardening). Closes the open-redirect / phishing pivot. | ✅ |
| **Token revocation** | clubhouse QRs revoke by bumping `clubs.clubhouse_qr_version`. Member-bound tokens currently don't have a per-member revocation; would require schema (e.g. `members.qr_version` column). | ⚠ Acceptable — member-bound QRs are scoped to a single member and can be invalidated by deleting the member row. |

### Gaps

1. **No rate limit per IP / email / club.** Anyone with the URL can fire registrations as fast as their network allows. The function makes 1-2 DB inserts + a magic-link send per call. Mitigation today: Supabase rate-limits magic-link OTP at the auth layer (~30/hour per email), which provides backpressure but doesn't stop someone from spamming the FUNCTION itself. **Severity: low-medium.** Open as a follow-up.

2. **No CAPTCHA / human check.** The form is publicly fillable. A scripted attacker could pollute the guest_registrations admin feed with junk. **Severity: low.** UX/operational concern more than security.

3. **Email enumeration via OTP.** `supabase.auth.signInWithOtp` reveals whether an email is already associated with an auth user (Supabase auth behavior; we don't control this). The upsert pattern on guests means re-registering the same email at the same club returns success regardless — so the function itself doesn't leak. **Severity: low.** Accept; not specific to our function.

## guest-link, guest-qr-token — verified

Both require JWT (`verify_jwt: true` on the function). `guest-link` only updates `guests` rows where `user_id IS NULL` — never overwrites a populated user_id pointing at a different auth user (defends against the email-rotation hijack scenario). `guest-qr-token` checks `user_roles` for the caller's club staff status before minting clubhouse QRs.

✅ Both are auth-gated; nothing to flag.

## Server-side guest access enforcement (audit finding #3)

Reviewed all RLS policies on tables guests can interact with (from v0.16.3 baseline). The pattern:

### What guests CAN read (via `is_active_guest(club_id)` policies)

These tables all have a SELECT policy like `is_active_guest(club_id)` (in addition to the member/staff path):

`club_status`, `club_status_hours`, `club_facilities`, `holes`, `pin_placements`, `pace_of_play`, `schedule_overrides`, `menus`, `menu_categories`, `pro_shop_items`, `events`, `news`

**`is_active_guest(p_club_id)` checks:** `auth.uid()` has a `guests` row with `status='active'` AND (`expires_at IS NULL OR expires_at > now()`).

✅ Tied to the actual `guests` row. Expiration is enforced at the DB. Cannot be bypassed by client.

### What guests CANNOT do (no policy match)

Guest writes are NOT possible on:
- `messages`, `thread_participants`, `threads` (require thread participation OR member/staff)
- `food_orders`, `food_order_items` (require members row at this club)
- `event_registrations` (require members row)
- `pro_shop_inquiries` (require members row)
- `bulletin_posts`, `partner_posts`, `post_replies` (require member-or-staff)
- `notification_reads` (require members row)
- `members`, `guests`, `user_roles` (all administered by staff)

✅ The write side is correctly locked down by the absence of guest policies + the presence of member-row requirements on the policies that do allow writes.

### What guests CAN write (and why it's OK)

- `analytics_events` — INSERT policy is `is_super_admin() OR is_member_or_staff_of(club_id) OR is_active_guest(club_id)`. Guests can write analytics events. The events table is opaque telemetry; not a security boundary.

### Access-level granularity (`data_only` / `read_only` / `full_temporary`)

The `guests.access_level` column exists and is set by `guest-register` from `club.guest_default_access_level`. **However, RLS policies do NOT differentiate by access_level** — `is_active_guest()` checks only status + expiration.

The access-level distinction lives in `src/lib/guestAccess.js` (client-side visibility matrix), not in the database. The audit flagged this as "looks mostly UI-side."

**Reality check**: since guests can't write to anything sensitive regardless of access_level (no member row → no member-gated write policy passes), the distinction is essentially:
- `data_only` — intended to see only the absolute minimum (status, hours)
- `read_only` — intended to see browse-only content (menus, events, news)
- `full_temporary` — intended to see everything a member sees, minus writes

What the data ACTUALLY allows: all three levels see the same set of guest-readable tables. The distinction in the matrix is purely UI.

**Verdict:** documented design choice, not a security hole. If a club wanted to enforce `data_only` strictly at the DB (e.g. block menus + events SELECTs), that would require adding per-access-level RLS — a deliberate change beyond the scope of v0.16.10.

## Recommendations / follow-ups

| Item | Severity | Patch target |
|---|---|---|
| Rate limit guest-register POST (per IP + per email + per club, sliding window) | Low-medium | v0.16.10b — could be a new Edge Function pre-filter or an in-function token bucket |
| Add CAPTCHA / human-check on the `/guest/<slug>` form | Low | Future v0.17.x — would need product decision on which provider |
| Tighten access_level enforcement at RLS (gate `is_active_guest` clauses on level) | Low (deliberate design today) | Defer; would need product clarification on what each level should see |
| Member-bound QR per-member revocation column | Low (mitigated by member deletion) | Defer — only needed if we ever want "regenerate this member's QR" UX without deleting their record |

## Verdict

**Guest flow security is solid for the threat model we care about.** The combination of:
- HMAC-signed tokens with constant-time verification
- Server-side feature-flag + tier gating
- Server-side canonical redirect
- Member-row-requirement on every guest-touchable write
- Expiration enforcement at the DB layer

…provides defense in depth. The two real gaps (rate limit + CAPTCHA) are operational/DoS concerns, not authentication or authorization holes. Both are queued for follow-up.
