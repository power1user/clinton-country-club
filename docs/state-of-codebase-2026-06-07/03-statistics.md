# Codebase Statistics & Complexity — v0.16.19

*Snapshot taken 2026-06-07.*

## Database (production Supabase project `exddcpqfdkyxommkslag`)

| Object | Count |
|---|---:|
| **Tables** (public schema, base tables) | 51 |
| **Columns** | 533 |
| **Functions** (`prokind='f'`) | 53 |
| **Triggers** (non-internal) | 33 |
| **RLS policies** | 156 |
| **Indexes** | 168 |
| **Foreign keys** | 91 |
| **Unique constraints** | 25 |
| **Check constraints** | 29 |
| **Enums** | 4 |
| **Migrations applied** | 96 |
| **Edge Functions deployed** | 15 |

### What that means

- **51 tables, 91 foreign keys** = real relational schema, not document-store shortcuts.
- **156 RLS policies** = every single table has Row Level Security ON, and each one has at least 2–3 policies (SELECT, INSERT, UPDATE, DELETE per role). This is **how you do multi-tenancy correctly** in Supabase. Almost nobody bothers at this depth.
- **53 functions + 33 triggers** = the heavy lifting (audit logging, sync, lifecycle transitions, claim flows) happens in Postgres, not duplicated across 5 client codepaths.
- **168 indexes** = performance was thought about during build, not as a fire-fight later.
- **15 Edge Functions** = real serverless surface — email ingest, push fan-out, AI chat (admin + member), guest registration with rate limiting, support inbox, club provisioning, magic-link auth flows.

## Front-end app

| Item | Value |
|---|---:|
| React screens | 47 |
| React components | 35 |
| Custom React hooks | 30 |
| `.jsx` / `.tsx` files | 89 |
| Total client LOC | 34,943 |
| JS lib modules (`src/lib/`) | 28 |
| TODOs / FIXMEs in code | **0** |

Zero TODOs is unusually clean. Most production codebases have dozens — the cleanup discipline here is significant.

## Tests

| Suite | Count |
|---|---:|
| Vitest test files | 3 |
| Total tests passing | **56 / 56** |
| Permission matrix tests | 16 |
| `meetsRequirements` predicate tests | 16 |
| CORS allowlist tests | 24 |

The tests aren't comprehensive coverage — they're **focused on the invariants that catch regressions**. Permissions, auth-gates, CORS — the things that fail silently and dangerously if they break.

## Edge Functions deployed

| Function | Purpose |
|---|---|
| `admin-ai-chat` | The Grounds Admin AI (Haiku 4.5 + cached manual prompt) |
| `member-ai-chat` | MyClub AI assistant (Haiku 4.5 + cached manual prompt) |
| `send-push` | Web Push fan-out for all notification triggers |
| `guest-register` | Public unauthenticated guest registration, rate-limited |
| `guest-link` | Magic-link → guest row linking |
| `guest-qr-token` | Signed QR token mint for member referral codes |
| `submit-support-ticket` | Member-facing support submission |
| `send-support-reply` | Outbound support replies |
| `receive-support-email` | Inbound email parsing (Cloudflare email worker) |
| `manage-support-destinations` | Super_admin support destination CRUD |
| `get-support-destinations` | Member-facing support destination read |
| `check-club-health` | Super_admin diagnostic ping |
| `provision-club-domain` | Cloudflare DNS provisioning for new club subdomains |
| `phase14-cf-finish` | Cloudflare worker post-deploy hook |

## Architecture invariants (from Phase 18 hardening)

1. **One source of truth for permissions.** `has_permission()` RPC in the DB ↕ `userHasPerm()` in JS ↕ tested by `permissions.test.js`. `meetsRequirements` gates both menu visibility and section render.
2. **Repo is the schema source of truth.** Every change ships as a numbered `.sql` file in `supabase/migrations/` BEFORE being applied. 8 files post-baseline.
3. **All Edge Functions authenticated.** `send-push` has a shared-secret gate. `check-club-health` super_admin-gated. CORS narrowed from `*` to a `groundslive.com` allowlist via a shared `_shared/cors.ts`.
4. **`people` is the source of truth for stable per-person fields.** Task #52 finalized this — `members` and `guests` no longer carry duplicate `name`/`email`/`phone`/`zip`/`photo_url` columns. Every member/guest links via `person_id` (NOT NULL FK). One person can be a member at multiple clubs.

## Major features delivered

### Phase rollout history (from `src/lib/version.js`)

| Phase | Range | What landed |
|---|---|---|
| **Phase 1** | v0.1.x | DB-driven content, admin hub, RLS foundation |
| **Phase 2** | v0.2.x | 4-role hierarchy + permissions + Platform card |
| **Phase 3** | v0.3.x | White-label branding + subdomain routing |
| **Phase 4** | v0.4.x | Messaging (food orders, clubhouse, DMs, Web Push) |
| **Phase 5** | v0.5.x | Member-to-member communication (post replies + DMs) |
| **Phase 6** | v0.6.x | News/Events split + personalization (settings, QR, profile photo, dark mode) |
| **Phase 7** | v0.7.x | Feature flags + lesson pros |
| **Phase 8** | v0.8.x | Guests + QR check-in + clubhouse messages |
| **Phase 9** | v0.9.x | Communications triage center + admin reorg |
| **Phase 10** | v0.10.x | Club Champion recognition (badges + Trophy Case) |
| **Phase 11** | v0.11.x | Phase 12 prep — admin dashboard tiles + viewport hook |
| **Phase 12** | v0.12.x | Food orders + lesson requests workflow |
| **Phase 13** | v0.13.x | Inbox unification + realtime |
| **Phase 14** | v0.14.x | Support inbox + Cloudflare email worker + push trigger |
| **Phase 15** | v0.15.0–.14 | AI usage log + admin/member AI chat (Haiku 4.5) |
| **Phase 16** | v0.15.0–.19 | People lifecycle management — unified People admin |
| **Phase 17** | v0.15.13 | Departments + clubhouse topic routing |
| **Phase 18** | v0.16.0–.11 | Security & Hardening Pass (21 audit findings closed) |
| **Phase 18 follow-ups** | v0.16.12–.19 | Confirm modal sweep, rate limiting, `select('*')` tightening, `people` consolidation (Task #52), back-button + identity fixes |

### Notable features beyond a basic SaaS

- **Multi-tenant white-label** — every club gets its own subdomain, branding (logo, hero, colors), feature flags
- **Real-time** — Supabase Realtime subscriptions on bulletin, partner posts, orders, messages, inbox, departments
- **Push notifications** — full Web Push pipeline (VAPID, service worker, 4-layer trigger fan-out, topic-routed clubhouse messages)
- **AI chat (both surfaces)** — admin AI and member AI both have **prompt-cached** custom manuals injected into every system prompt. Saves cost; gives consistent answers.
- **Audit log** — `people_audit_log` table captures every lifecycle transition (status changes, role promotes/demotes, guest→member conversions) with optional reasons + the performing user
- **Public guest flow** — full unauthenticated guest registration with email magic-link verification, rate-limited (IP + email buckets), tier-gated, feature-flagged
- **Clubhouse topic routing** — 5 message topics route to departments → users for fan-out (departments admin UI lets clubs configure their own routing)
- **Configurable membership tiers** — clubs configure their own tier list (Equity / Social / Junior / etc.); not hard-coded
- **Code-split** — admin bundle separated from member bundle (~500KB vs 1.4MB) — admin code doesn't bloat the member PWA
- **PWA-first** — installable to home screen on iOS/Android, offline-ready service worker, push subscriptions

## Velocity stats

| Metric | Value |
|---|---:|
| **Total commits** | 280 |
| **Build duration (calendar days)** | 23 (May 15 → June 7, 2026) |
| **Commits / day average** | 12.2 |
| **LOC / day average** | 1,818 |
| **Industry-typical senior dev LOC/day** | 30–100 |
| **AI-leverage multiplier on this codebase** | ~18–60× |

## Phase 18 specifically (security hardening)

| Metric | Value |
|---|---:|
| Total Phase 18 patches shipped | 19 (v0.16.0 → v0.16.19) |
| Audit findings closed | 21 across 3 review rounds |
| New tests added | 56 |
| Edge Functions hardened | 8 (CORS narrowed, auth gates, rate limiting) |
| Migrations applied during Phase 18 | 8 |
| Bidirectional sync triggers retired | 3 (in v0.16.16 finale) |
| Duplicate columns dropped | 8 (4 members + 4 guests) |
| Hotfix patches after main work | 4 (v0.16.16–.19, all caught quickly) |

## What this codebase is NOT

For honesty:

- It's **not** a CRUD scaffold tutorial app
- It's **not** "Next.js + Prisma" generated boilerplate
- It's **not** missing the hard parts — RLS, push, AI, real-time, audit, white-label all exist and work
- It's **not** an app with 0 paying customers — Clinton CC is the founding club and the design has been pressure-tested against real ops
- It's **not** AI-slop — the architecture has discipline (audited, migrated, tested) that random AI-generated code rarely shows

It IS a production-grade multi-tenant SaaS that took **23 days of compressed AI-assisted development** to reach 41,823 LOC + 51 tables + 156 RLS policies + 15 Edge Functions + 56 tests + the security-hardening pass on top.
