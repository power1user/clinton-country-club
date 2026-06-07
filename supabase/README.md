# Supabase

The Grounds' database, RLS, Edge Functions, and migration history. As of v0.16.3 (Phase 18), this folder is the **authoritative source for the Supabase side of the project** — no more out-of-band changes.

## Layout

```
supabase/
  README.md            — this file
  MIGRATIONS.md        — the new "migrations live in repo first" workflow
  migrations/          — every schema/RLS/function change as a numbered SQL file
    0000_phase18_baseline_README.md      — what the baseline covers
    0001_phase18_baseline_helpers.sql    — the RLS helper functions (security boundary)
    APPLIED_MIGRATIONS.md                — chronology of the 89 historical migrations
  functions/           — every Edge Function (slug = directory name)
    admin-ai-chat/
    check-club-health/
    docs/
    get-support-destinations/
    guest-link/
    guest-qr-token/
    guest-register/
    manage-support-destinations/
    member-ai-chat/
    phase14-cf-finish/
    provision-club-domain/
    receive-support-email/
    send-push/
    send-support-reply/
    submit-support-ticket/
    _shared/cors.ts    — shared CORS helper (v0.16.2)
```

## Migration workflow

See [`MIGRATIONS.md`](./MIGRATIONS.md). The summary: every schema/RLS/function change ships as `migrations/NNNN_description.sql`, committed BEFORE being applied via MCP.

To inspect what's currently live:

- **Migration history**: `migrations/APPLIED_MIGRATIONS.md` or `mcp__supabase__list_migrations`
- **RLS policies**: `pg_policies` (see queries in `MIGRATIONS.md`)
- **Function definitions**: `pg_get_functiondef(p.oid)` from `pg_proc`
- **Per-release context**: [`../CHANGELOG.md`](../CHANGELOG.md) ties each app version to the migration that supports it

## Edge Functions

All 15 live Edge Functions are checked in under `functions/` as of v0.16.3.

| Slug | Auth | Purpose |
|---|---|---|
| `send-push` | Shared secret (v0.16.1) | DB webhook target; fans Web Push to non-sender participants. Routes clubhouse messages via topic → department → users (v0.15.13). |
| `provision-club-domain` | super_admin JWT | Super Admin → New Club creates the Cloudflare Pages custom domain + DNS |
| `guest-register` | Public (no JWT) | Backs `/guest/<slug>` — validates HMAC-signed QR token, creates auth user via magic link, inserts guest + initial visit. **Public surface — see `0000_phase18_baseline_README.md` for the validation chain.** |
| `guest-link` | JWT | Links a freshly-authenticated guest's auth.uid to existing guests-table rows by email |
| `guest-qr-token` | JWT | Mints signed QR URLs in two modes: `member` (member-referral) and `clubhouse` (per-club QR) |
| `admin-ai-chat` | JWT (admin role-checked) | GroundsLive Admin AI (Anthropic Haiku 4.5 + prompt-cached manual). Logs to `ai_usage_log` mode=`admin` |
| `member-ai-chat` | JWT (member-feature-gated) | GroundsLive Member AI. Logs to `ai_usage_log` mode=`member` |
| `submit-support-ticket` | JWT (admin role) | In-app "Contact Support" form for admins |
| `send-support-reply` | super_admin JWT | Outbound support reply via Resend with proper threading headers |
| `receive-support-email` | Shared secret (INGEST) | Inbound Cloudflare Email Worker → Supabase. Postal-mime parsing + Message-ID dedup + In-Reply-To threading |
| `get-support-destinations` | Shared secret (INGEST) | Cloudflare Email Worker fetches the current forward list |
| `manage-support-destinations` | super_admin JWT | Super Admin → Support → Team CRUD wrapping Cloudflare Email Routing API |
| `check-club-health` | super_admin JWT (v0.16.0) | One-click health check across every club subdomain |
| `docs` | Public | Serves the architecture doc HTML from Supabase Storage with the proper Content-Type |
| `phase14-cf-finish` | Shared secret (INGEST) | One-shot bootstrap for the support@ Cloudflare Email Worker (Phase 14 leftover) |

## Secrets that must be set

Edge Functions read these from the Supabase Dashboard → Edge Functions → Manage secrets:

| Secret | Used by | Purpose |
|---|---|---|
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | send-push | Web Push signing |
| `SEND_PUSH_SECRET` (v0.16.1) | send-push | Shared secret the DB trigger must supply on every push call. Safe-rollout: missing = no-op with warning |
| `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_PAGES_PROJECT` / `CLOUDFLARE_ROOT_DOMAIN` | provision-club-domain | Cloudflare Pages domain provisioning |
| `CLOUDFLARE_EMAIL_ROUTING_TOKEN` | manage-support-destinations, phase14-cf-finish | Cloudflare Email Routing API |
| `GUEST_QR_SIGNING_SECRET` (optional) | guest-register, guest-qr-token | HMAC seed for guest-QR signatures. Defaults to SHA-256 of `SUPABASE_SERVICE_ROLE_KEY + ':guest-qr-v1'` if absent — same derivation across both functions so tokens minted in one verify in the other |
| `RESEND_API_KEY` / `RESEND_FROM_ADDRESS` | send-support-reply | Outbound email |
| `SUPPORT_INGEST_SECRET` | receive-support-email, get-support-destinations, phase14-cf-finish | Shared bearer with the Cloudflare Email Worker |
| `ANTHROPIC_API_KEY` | admin-ai-chat, member-ai-chat | Anthropic API |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | (all) | Auto-injected |

## Realtime publication

Every content table is in the `supabase_realtime` publication. Adding a new content table? Include `alter publication supabase_realtime add table public.<your_table>` in its migration.

## Audit findings closed by Phase 18

| Finding | Closed in |
|---|---|
| send-push `tenant_id` regression (real bug) | v0.16.0 |
| check-club-health no auth | v0.16.0 |
| MemberAIBubble dismissal key broken | v0.16.0 |
| Diagnostic endpoints unauthenticated | v0.16.0 |
| Missing security headers in `_headers` | v0.16.0 |
| send-push no auth at all | v0.16.1 (safe-rollout) |
| useAuth swallowed club-load errors | v0.16.1 |
| CORS `*` everywhere | v0.16.2 |
| Schema / RLS / functions not in repo (no review surface) | v0.16.3 (this patch) |

Pending: admin auth centralization (v0.16.4), sections.jsx split (v0.16.5), test scaffold (v0.16.6), exhaustive-deps sweep (v0.16.7), confirm/alert → shared modal (v0.16.8), defensive mutation scoping + select tightening (v0.16.9), guest flow audit (v0.16.10), Phase 18 closeout (v0.16.11).
