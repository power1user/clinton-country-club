# Feature Inventory — v0.16.19

*Complete feature list across both the member-facing PWA and the admin surface, as of 2026-06-07.*

## Member-facing PWA (the "MyClub" app)

### Identity & onboarding
- Magic-link email auth (Supabase Auth)
- Multi-club subdomain routing (`{clubslug}.groundslive.com`)
- Pending member status with read-only / locked / full access tiers (manager-configurable)
- Terms of Use gate with versioned acceptance
- Member profile (photo upload, display mode, DM opt-out, allow-DMs)
- Digital membership card with QR

### Home / Hub
- Today's club status (open/closed/limited) per facility
- Pace of play indicator
- Pin placement of the day
- Weather widget
- Next event surfaced inline
- Recent news preview

### News & Events
- News feed with optional date label
- Events with calendar view + RSVP + spots + recurrence + auto-create-club-status
- Event registrations feed for admin

### Food & Drink
- Food ordering with delivery + to-go + eat-in modes
- Menu browsing per facility
- Cart with line totals (safe price coercion)
- Order status + admin receive

### Course
- Pin placements + course map
- Hole-by-hole reference

### Community
- Member directory (with photos, opt-in for DMs)
- Bulletin posts (clubwide announcements + member-generated)
- Partner board (golf game seekers with handicap)
- Post replies (threaded)
- Direct messages (member-to-member, opt-out controlled)
- **Trophy Case** — digital wall of badges/honors per member
- Guest invite (member can mint a signed QR for a friend)

### Clubhouse messaging
- 5-topic clubhouse inbox (Pro Shop, Restaurant, Tee Times, Course, General)
- Topic → department → user routing (manager configures)
- Real-time message thread with sender labels

### Pro shop
- Inquiry submission + lesson request flow
- Lesson Pro browsing (manager-configurable list)

### Notifications
- Web Push subscriptions (VAPID-keyed)
- Per-user notification preferences
- Inbox with read/unread + hide

### Guest flow (no-account members)
- Public `/guest/{slug}` registration page
- 3-tier access (`data_only` / `read_only` / `full_temporary`)
- Time-limited (configurable per club)
- Rate-limited submissions (IP + email buckets)
- Magic-link verification + auto-claim to people row
- Guest QR check-in via clubhouse or member-referral

### AI
- Member AI assistant (Haiku 4.5, prompt-cached manual)
- Knows the app, routes the user to features, answers FAQs

### Personalization
- Display mode (light/medium/dark)
- Smart relative timestamps on messages
- Settings screen for profile, push subscriptions, DM opt-out, terms re-read

## Admin surface

### People area
- **Unified People view** — every member, guest, staff person in one searchable, paginated list
- Filter by relation (member / guest / staff)
- Server-side search across name, email, phone
- Per-row kebab with quick actions (Edit, Magic Link, Convert, Approve, Promote, Demote)
- Click row → identity-strip edit modal with status + role pills (each opens a sub-modal with reason + audit)
- Bulk CSV import
- Per-person audit history (manager-only) showing every lifecycle event
- Photo upload from the modal (writes to `people.photo_url` via storage bucket)
- Pre-auth (admin-added before user login) member/guest support — first-class
- **Departments** management (membership + drag-to-add staff)
- **Clubhouse topic routing** config (5 topics → departments)
- **Membership tiers** (per-club configurable list)

### Content
- Daily club status (per-facility, per-day) with overrides
- Pin placements editor
- Pace of play (manual + auto-set)
- News editor (with optional date)
- Events editor (with recurrence + spots + auto-status)
- Member Guide editor
- Bulletin posts moderation (hide/delete)
- Partner posts moderation
- Trophy Case badges catalog (manager creates + awards per member)
- Lesson Pros directory
- Menu management (categories, items, prices)
- Food order queue (kitchen-facing)

### Communications inbox
- **Triage center** — every inbound channel in one place with realtime + unread badges
  - Food orders
  - Lesson requests
  - Pro shop inquiries
  - Guest registrations
  - Clubhouse messages
  - Event RSVPs

### Operations
- Schedule overrides (per-facility, per-day exceptions)
- Facility hours editor (per-day, per-facility)
- Provision log (admin actions audit)
- Guest registration management (auto-approve, phone collection, default access level, visit duration)

### Club Settings (manager-only)
- Branding (logo, hero, primary/secondary/accent colors, tagline)
- Subscription tier visibility
- Feature flags (per-club override)
- Timezone
- Pending member access mode (read_only / full / locked)
- Member DMs enable
- Trophy Case display name
- Topic routing
- Member tiers list
- Add-ons

### Staff management (manager-only)
- Promote member → club_admin (with permission keys)
- Promote member → club_manager
- Demote staff → member (with reason, audited)
- Per-staff permission grant (granular keys: `can_manage_members`, `can_edit_news`, `can_post_clubhouse`, etc.)

### AI
- Admin AI assistant (Haiku 4.5, prompt-cached manual)
- Answers admin operational questions, navigates manager to the right section
- AI usage log (admin sees usage; super_admin sees aggregate)

### Platform (super_admin only)
- All clubs list
- Provision new club (Cloudflare DNS + Supabase setup)
- Provision log
- AI usage rollup
- Support inbox (cross-club tickets via Cloudflare email worker)
- Support destinations management
- Super_admins admin (add/remove cross-platform admins)

## Cross-cutting capabilities

### Auth & permissions
- Multi-tenant Postgres RLS (156 policies)
- 4-tier role system (super_admin / club_manager / club_admin / member, plus guest)
- Granular permission keys for club_admin (jsonb array per user_role row)
- Centralized `meetsRequirements` predicate gates both menu and section render
- Single source of truth for `has_permission()` (DB) ↔ `userHasPerm()` (JS) ↔ tests

### Data architecture
- **`people` table** = source of truth for stable per-person fields
- Members + guests = per-club relations, linked via `person_id` FK
- Audit log captures all lifecycle events
- Bidirectional sync triggers retired post-Task-#52 (one direction of truth now)
- 8 numbered migrations post-Phase-18-baseline

### Security
- Rate limiting on public endpoints (`rate_limit_events` table + `check_and_record_rate_limit` RPC)
- CORS narrowed to `*.groundslive.com` allowlist
- All Edge Functions auth-gated (shared-secret for `send-push`, super_admin RPC checks elsewhere)
- Defense-in-depth client mutation scoping (`.eq('id', x).eq('club_id', club.id)`)
- `select('*')` audited — only used for self-hydration of RLS-gated own rows
- 56 tests pin permission + auth-guard + CORS invariants
- Guest-flow security audit documented in `supabase/audits/guest-flow.md`

### Performance
- Code-split admin bundle (admin code doesn't bloat member PWA)
- Server-side pagination + filter on People list
- CTE-based aggregates in heavy RPCs (e.g. `all_people_at_club`)
- 168 indexes on the 51 production tables
- Prompt-cached AI manuals (byte-stable strings) cut Haiku 4.5 cost
- Realtime subscriptions debounced

### Reliability
- Service worker handles offline + push
- Migration files committed to repo BEFORE applying (no untracked DB changes)
- Confirm-modal pattern across all destructive actions
- Phone back-button cascade across modal + admin-nav + tab-stack handlers
- 280 commits with detailed messages — full reconstruction history

---

## What's NOT yet shipped (open queue)

| Item | Status |
|---|---|
| Smoke-test ALL 5 clubhouse topics on real devices | Pending Marc on phone (Task #30) |
| Future: CAPTCHA on guest-register (DoS hardening) | Deferred, low-priority |
| Future: Photo upload for pre-auth members | Deferred (path is keyed by auth user) |
| Future: `?? row.X` lift-helper fallback cleanup | Trivial follow-up |
