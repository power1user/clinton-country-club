# The Grounds — Country Club Member App

A mobile-first member engagement platform for country clubs. Architected
as a multi-tenant SaaS: one codebase + one database serves every club,
isolated by `club_id` and RLS, white-labeled per club. Onboarding a new
club is a few clicks from the Super Admin's Platform area + an automated
Cloudflare DNS provision — not a code change or a new deploy.

**Currently deployed:**
- `clintoncc.groundslive.com` — Clinton Country Club (Clinton, IL — 9-hole, par 35, founded 1921)
- `oakgrovecc.groundslive.com` — Oakgrove Country Club
- `windhavencc.groundslive.com` — Windhaven Country Club

**Current version:** `v0.16.11` (Phase 18 — Security & Hardening Pass, complete)

> Phase 18 (v0.16.x) is the security/hardening audit response. Three
> rounds of external code review surfaced 21 findings across
> security, code quality, and operational risk. v0.16.x closed every
> one through v0.16.11.
>
> - **v0.16.0** opened the phase with the 5 small-surface fixes:
>   `send-push` was filtering `user_roles` by `tenant_id` (wrong
>   column → support pushes silently broken), `check-club-health` had
>   no auth on a service-role endpoint, MemberAIBubble's dismissal
>   key was broken per-user, diagnostic Edge Function endpoints
>   exposed secret-presence to anons, and `public/_headers` had no
>   baseline security headers (CSP, HSTS, X-Content-Type-Options,
>   Referrer-Policy, Permissions-Policy).
> - **v0.16.1-2** — `send-push` shared-secret gate (safe-rollout),
>   useAuth club-load error surface, and CORS narrowed from `*` to a
>   groundslive-origin allowlist across all 6 browser-invoked Edge
>   Functions.
> - **v0.16.3** — pulled live Supabase schema + RLS + 6 missing Edge
>   Functions into the repo, fixing audit finding #6 ("no review
>   surface for the security boundary"). From v0.16.3 forward, every
>   schema/RLS/function change ships as a numbered SQL file in
>   `supabase/migrations/` BEFORE being applied via MCP.
> - **v0.16.4** — centralized admin auth (ONE `meetsRequirements()`
>   predicate gating both menu visibility and SectionContent render).
> - **v0.16.5** — opened the `sections.jsx` split (5,639 → 4,845
>   lines by extracting the Platform domain).
> - **v0.16.6** — Vitest + 56 focused tests pinning the permission
>   matrix, the auth-guard predicate, and the CORS allowlist.
> - **v0.16.7** — audited 25 `react-hooks/exhaustive-deps` disable
>   sites; documented every one in `src/REACT_HOOKS_DEPS_NOTES.md`.
> - **v0.16.8** — shared `ConfirmModal` + `ConfirmProvider` to retire
>   native `confirm()`/`alert()` from admin (foundation + 2
>   conversions; remaining 21 sweep queued).
> - **v0.16.9** — defensive `id AND club_id` scoping on admin
>   mutations.
> - **v0.16.10** — guest-flow security audit at
>   `supabase/audits/guest-flow.md`. Guest writes are correctly
>   locked down by RLS; the remaining gaps (no rate limit on
>   guest-register, no CAPTCHA) are operational DoS concerns
>   queued for follow-up.
> - **v0.16.11** — Phase 18 closeout (this README refresh).
>
> See `src/lib/version.js` for the full Phase 18 patch index;
> `CHANGELOG.md` for what each v0.16.x patch shipped.

> Phase 17 (v0.15.13-15) shipped Departments + Topic Routing:
> per-club staff groups (`club_departments` + `user_departments`)
> with topic-based push routing for clubhouse messages
> (`clubs.clubhouse_topic_routing` jsonb). New People → Departments
> admin section (manager-only) + per-person assignment chips in
> PersonEditModal + Topic Routing config under Club Settings.
> `send-push v20` routes clubhouse fan-out via topic → departments
> → users.

> Phase 16 (v0.15.0-12) was People Lifecycle Management: the `people`
> table as canonical identity + `people_audit_log` for compliance +
> lifecycle RPCs (convert guest→member, demote member→guest, change
> status, promote/demote staff) all audit-logged. v0.15.6+ shipped
> the unified People admin view. v0.15.16 redesigned PersonEditModal
> with an identity-strip + status/role pills → sub-modal lifecycle UX.

> Phase 15 (v0.14.0-8) was **two-agent embedded AI** built on Claude
> Haiku 4.5 with Anthropic prompt caching. **Admin AI** lives in the
> admin topbar; knows the full admin manual + bills to The Grounds.
> **Member AI** is a dismissible floating bubble on every member
> screen, gated per-club by `feature_flags.member_ai` (default OFF);
> has 5 live-data tools and bills per-club. One `ai_usage_log` table;
> the `mode` column is the billing axis.

> Phase 14 (v0.13.0 → v0.13.9) shipped the Platform Support Inbox —
> a super_admin-only triage surface that lands
> `support@groundslive.com` mail in three places at once:
> the platform team's existing personal inboxes (Cloudflare Email Routing
> forward to a list managed in-app), a persistent in-app inbox under
> Platform → Support with full thread view + inline reply via Resend, and
> Web Push to every super_admin's installed PWA with OS app-badge sync.
> Replies thread correctly on Gmail/Outlook (proper In-Reply-To +
> References headers); attachments stored in a private Supabase Storage
> bucket with signed-URL downloads from the admin UI. The member app stays
> mobile-first PWA forever; the **admin section** renders in two layout
> shells — `AdminLayoutMobile` (current 3-level drill-down, &lt;768px) and
> `AdminLayoutDesktop` (persistent sidebar + topbar + main, ≥768px) —
> sharing the same section components. Desktop lands on the
> dashboard by default. For anything between releases, see
> [`CHANGELOG.md`](./CHANGELOG.md).

---

## What this is

A PWA-ready web app that gives club members live operational visibility —
what's open right now, today's pin placements, this week's events,
who's on the bulletin board — alongside a real messaging inbox
(clubhouse threads, order chat, member DMs) and a public guest-pass
flow, all backed by a shared admin panel staff use to run day-to-day
ops.

The "platform" layer ("The Grounds") sits above each club: same
codebase + database, isolated by `club_id`, white-labeled per club via
logo + 3 brand colors + hero photo + tagline.

---

## Tech stack

| Layer | What |
|---|---|
| Frontend | React 19 + Vite, plain JS (no TS), inline JSX styling |
| Auth | Supabase Auth (email/password + magic-link via `signInWithOtp`) |
| Database | Supabase Postgres, RLS-enforced isolation by `club_id` |
| Realtime | Supabase Realtime — every content table subscribed; admin edits push live |
| Storage | Supabase Storage `club-assets` + `avatars` buckets (logos, hero photos, profile pics) |
| Edge | Supabase Edge Functions (Deno) — push, DNS provisioning, guest QR / magic-link |
| Map | MapLibre GL JS + MapTiler (course satellite) |
| Weather | OpenWeatherMap (current + 3-hour forecast at club coords) |
| Twilight | sunrise-sunset.org API (powers "opens at dawn" / "closes at dusk" logic) |
| Hosting | Cloudflare Pages (frontend) + Cloudflare Workers (deploy target) |
| Push | Self-hosted Web Push (VAPID + service worker + `web-push` npm) |
| QR security | HMAC-SHA256 signed tokens; key derived from `SUPABASE_SERVICE_ROLE_KEY + ':guest-qr-v1'` |

---

## Feature inventory

### 🏗️ Platform Foundation
- Real authentication (email/password + magic-link invites)
- Realtime sync across every content table
- Row-Level Security on every table, multi-tenant safe via `club_id`
- All content database-driven (no hardcoded mock data in production)
- Subdomain-driven club resolution: `<slug>.groundslive.com` → that club's data
- Query-param `?club=<slug>` override for dev/preview
- Timezone-aware time logic — open/close + dawn/dusk computed in club's IANA timezone
- Automated Cloudflare DNS provisioning on new-club onboarding (Edge Function `provision-club-domain`)
- Provisioning audit log (`club_provision_log`) so failed/partial DNS attempts are inspectable

### 🔐 Authentication & Roles (5-role hierarchy)
1. **super_admin** — platform-wide, NULL `club_id`, bypasses all club checks
2. **club_manager** — has all club permissions implicitly
3. **club_admin** — only has permissions explicitly granted (14 granular flag keys)
4. **member** — implicit (presence of a `members` row)
5. **guest** — Phase 8: time-limited access via QR + magic link, three access modes (`data_only` / `read_only` / `full_temporary`)

- Auto-claim pending member row by email on first sign-in; falls back
  to creating a fresh pending row so every signup appears in the roster
- Manager-configurable **pending member access** mode — `read_only`
  (default) / `full` / `locked`
- Permission gating throughout admin: hidden area cards, hidden section
  cards, disabled write buttons, "view only" notes
- Terms of Use acceptance gate on first login (per-club configurable)

### 👤 Member-Facing App
- Home screen with status pills (Course / Bar / Restaurant / Kitchen /
  Lounge), CSS-grid equal-width layout
- Auto-toggling Open / Limited / Closed pills based on weekly hours +
  "opens at dawn" + "closes at dusk" + members-only flags (in club's tz)
- Live clock + date (minute-aligned tick)
- Weather widget at club coords (current + hourly forecast)
- Pace of play indicator
- **News** feed with category filters + article detail (optional date picker)
- **Events** screen — list view + dedicated Calendar surface for browsing by date
- **FoodMenu** — categories from the DB-backed `menu_categories` table;
  configurable per-club whether guests can order
- **Bulletin Board** (classifieds / wanted / general) + member replies
- **Partner Finder** (Phase 9 redesign): card surfaces who / game type / when / spots-needed at a glance with handicap as a small optional tag. Compose flow takes under 30 seconds. Contact button never dead-ends — DM (if poster allows) → clubhouse fallback ("Golf Partner Inquiry: …") → plain-text "ask the front desk" for the rare neither-available case
- **Pro Shop** catalog + member-side "My Inquiries" read-only view
- **Lesson Requests** form routed to lesson pros
- **Membership Card** screen with QR code + display-mode toggle
- **MyClub** screen — member info + Message Clubhouse + Pro Shop + Lessons +
  Member Guide + "Contact the Club" (address opens maps · phone calls · email mails)
- **Community** tab (own screen) — Bulletin / Partner / Calendar / Member Directory
- **Settings** screen — profile photo, display mode, DM opt-out, PWA install entry, notifications
- Per-hole green diagrams with realtime pin placements
- Swipe-gesture navigation between main tabs
- Page transition animations (directional slide)
- Profile photos shown on every message surface (sender identity audit)

### 💬 Unified Messaging
- One schema (`threads` + `thread_participants` + `messages`) backs three
  kinds: **order chat**, **clubhouse inbox**, **member DMs**
- Auto-thread per food order with system status messages
- Participants-only read/write via RLS; staff see all order + clubhouse
  threads in their club
- Per-member soft delete (`thread_participants.hidden_at`) so a member
  can dismiss their copy without affecting other participants
- In-thread message deletion (soft delete with audit trail)

### 💬 Reusable Replies (post_replies)
- One table, one component (`Replies.jsx`) backs reply UX on every
  member-generated surface: Bulletin posts, Partner posts, Events,
  Pro Shop inquiries
- DM affordance per reply (opens chat with the replier)

### 🔔 Web Push (self-hosted, no third party)
- VAPID-signed Web Push via Supabase Edge Function (`send-push`) calling
  `web-push` library
- Service worker (`/sw.js`) handles incoming pushes + notification clicks
- Per-user `push_subscriptions` storage; stale endpoints (404/410) pruned
  on send
- Opt-in via dismissible banner at top of Inbox + Settings toggle
- Android PWA badge support via `navigator.setAppBadge`

### 📬 Inbox + Bell
- Bell chip with unread badge on every main tab (Home / Golf / Food /
  Community / MyClub)
- Unified Inbox feed mixing admin broadcasts + threads, sorted by recency
- Per-row source chip, absolute date + relative time, dismiss X for threads
- Tap notification → expand + mark read; tap thread → open chat view

### 🏌️ Clubhouse Inbox
- Member-side "Message Clubhouse" card on MyClub with topic picker
- Admin queue under People area, grouped by topic
- Permission key `can_view_clubhouse_inbox`

### 👥 Member DMs
- Manager toggle in Club Settings (`enable_member_dms`, default off)
- Member Directory in the Community tab when on (gated by feature flag)
- Per-member DM opt-out toggle in Settings
- `get_or_create_dm()` Postgres RPC for atomic find-or-create

### 🎨 White-Label Branding
- Per-club configurable: logo, hero photo, 3 colors (primary / secondary
  / accent), tagline, contact phone/email
- Platform-managed (super_admin only): address, city, state, timezone,
  lat/lng, founded year, holes/par/yards
- CSS custom properties applied at runtime — no rebuild needed
- Realtime palette sync — manager edits push to every open session
- Logo + hero in `club-assets` bucket (RLS-scoped per club)

### 🏷️ Parent Brand ("The Grounds")
- Loading splash with grounds-icon + wordmark + tagline (min 1500ms floor
  so brand is actually visible on fast loads)
- Sign-in footer "Powered by The Grounds"
- MyClub bottom: "Powered by The Grounds · v{VERSION}" (reads from `version.js`)
- Favicon + Apple touch icon + PWA manifest icons all use the platform mark
- Service worker push notification badge uses the platform mark

### 🎯 Club Features Control Panel (Phase 7)
- **Every** member-facing surface (Pro Shop, Bulletin, Calendar, Lockers,
  Cart, Parking, etc.) is a named, manager-toggleable feature flag
- Platform lock — super_admin can pin a flag's value the manager can't undo
- Subscription tier (`base` / `pro` / `enterprise`) gates which flags a
  given club can even see
- Tier-based defaults — bumping a club's tier reveals new flags
- Top-level **Features** area card in admin

### 🎯 Guest Management (Phase 8)
- Public landing at `/guest/<club_slug>` (no JWT) — QR-driven
- Two QR types:
  - **Member-linked QR** (`MemberGuestQR.jsx` on MyClub) — pre-populates
    `referring_member_id` on the guest's record
  - **Clubhouse QR** — no referring member, for public play. Visit type
    configurable per-club (`clubhouse_qr_visit_type`)
- HMAC-SHA256 signed token (constant-time compare); key derived from
  service role + suffix
- Real Supabase Auth accounts (magic-link via `signInWithOtp`)
- Time-limited access — per-club configurable duration days or indefinite
- Three access modes — `data_only` (read club info only) / `read_only`
  (full read across surfaces) / `full_temporary` (write where it makes sense)
- Optional PWA install gate on registration (`guest_pwa_required`)
- Optional phone collection (`guest_phone_collection`)
- Guest visit history (`guest_visits`) — admin can filter by status, search,
  referring member; CSV export of guests OR full visit history
- Per-club opt-in for guest food ordering (`guests_can_order_food`)
- `is_active_guest(club_id)` SECURITY DEFINER helper used in RLS

### 📨 Platform Support Inbox (Phase 14)
- **Email-in pipeline.** `support@groundslive.com` is fronted by
  Cloudflare Email Routing → a Cloudflare Email Worker that does two
  things in parallel: (1) forwards to a list of platform team members
  managed in the app (no Worker code edits when a person joins/leaves),
  and (2) POSTs the raw RFC-822 message to a Supabase Edge Function
  `receive-support-email` which parses via `postal-mime`, dedups on
  Message-ID, threads via In-Reply-To, and inserts the message.
- **Email-out pipeline.** Reply composer in the admin UI hits
  `send-support-reply` Edge Function which sends via Resend appearing as
  `support@groundslive.com` with proper `In-Reply-To` + `References` +
  `Message-ID` headers — Gmail / Outlook / Apple Mail thread the reply
  correctly on the recipient side. Outbound row inserted into
  `support_messages` with `direction='out'`; trigger auto-flips thread
  `status` to `'answered'`.
- **App-managed forward list.** Platform → Support → **Team** sub-tab.
  Lists destination addresses with Verified / Pending / Inactive status
  badges. `+ Add team member` calls Cloudflare's Email Routing
  destinations API (super_admin auth) which sends a verification email
  to the new address. `Sync with Cloudflare` reconciles DB with
  Cloudflare's actual destination list (backfills `cf_destination_id`,
  flips `verified_at` on newly-verified rows).
- **Admin thread inbox.** Platform → Support → **Inbox** sub-tab. Thread
  list filterable by Active / All / Closed, per-`(thread, super_admin)`
  unread dot driven by `support_reads.read_at` vs
  `support_threads.last_message_at`, chat-bubble thread detail (inbound
  left card-bg, outbound right green), inline reply composer that calls
  `send-support-reply`, Close/Reopen status controls.
- **Web Push + OS app-badge sync.** Every inbound message fires push
  notifications to every super_admin's installed PWA via
  `fn_send_push_on_support_message` trigger + `send-push` v9
  `handleSupportTicket` branch. The bell chip in the admin top bar
  picks up a brass-tinted "support" counterpart (`SupportBellChip`)
  that surfaces only when there's unread + the viewer is super_admin.
  `useInboxUnread` folds support count into `navigator.setAppBadge`
  total so the launcher icon on Android Chrome / Edge / installed
  desktop PWAs shows ONE combined unread number.
- **Realtime everywhere.** Supabase realtime channels on
  `support_threads` + `support_messages` + `support_reads` keep the
  thread list and open thread detail fresh without a refresh — new
  ticket arrives mid-session, badge tick and list row appear within
  ~1 second.
- **Attachments via Supabase Storage.** Inbound emails with
  attachments get the binary contents extracted, uploaded to a private
  `support-attachments` bucket (10 MB cap per file), and recorded in
  the `support_attachments` table linked to the message. Admin UI
  renders an attachment chip per file with size; click → 60-second
  signed URL → browser handles download / inline view by MIME.

### 🍳 Operational Polish (Phase 13)
- **Food Orders → Dining area.** `inbox_food` was a Communications
  sub-queue since v0.9.4 — the right home when it was the only
  realtime order-of-business view. Now Dining groups Food Orders +
  Menu Categories + Menu Items so the day-of kitchen view sits next
  to the menu CRUDs the kitchen owns. Section ID kept as
  `inbox_food` so workspaces, dashboard tiles, useCommsUnread
  counts, and saved per-(user, club) layouts continue to resolve.
- **Generic sidebar badge logic.** `AdminLayoutDesktop` was
  Comms-special-cased: only `inbox` summed its sections' unread
  counts. Now every area sums whatever sections' counts exist in
  `commsUnread.counts` so the Dining area badge picks up Food
  Orders unread automatically.
- **Daily Ops workspace updated.** Seeded `default_daily` workspace
  expands `dining` and lands on `inbox_food`. Per-(user, club)
  overrides untouched.
- **Event RSVPs accordion.** The Comms `inbox_rsvps` sub-queue,
  previously a flat reverse-chrono list of every registration, is
  now a **collapsed-by-default inline accordion grouped by event**.
  Each row: title, event date, registered count vs capacity, and a
  Spots Remaining badge (red **Full** / amber **N left** at ≤3 /
  green **N left**). Click an event to expand inline → registrant
  list with the same status pill + status dropdown. Events sorted
  by most-recent registration activity so events with new RSVPs
  surface first.
- **Kitchen reply on Food Orders queue** (v0.12.1). Each active
  order card gets a **Reply** button next to the status select.
  Open it inline → textarea + Send → the kitchen's message lands
  in the member's inbox + fires a push notification with the staff
  sender label (e.g. "Chef Sarah · …"), reusing the send-push
  pipeline from v0.10.9. No schema change — the reply posts into
  the order's existing auto-thread (`threads` with
  `context_table='food_orders'`, `context_id=order.id`) with
  `sender_user_id = current staff auth.uid()`, so the existing
  `fn_send_push_on_message` trigger fires the push automatically.
  Visible "Message sent ✓" pill for 2.5s; defensive error states
  for send-failed and no-thread.
- **Notification dismissal: swipe + bulk-select + Undo** (v0.12.2).
  Two new dismissal affordances on top of the existing X + confirm
  modal:
  · **Swipe a row left to dismiss.** Translates over a red
    "Dismiss" rail; releasing past the 90px threshold commits,
    short of it springs back. Direction locked after 8px of motion
    so vertical scroll isn't misread; click suppression on swipe
    so a near-threshold spring-back doesn't also open the item.
  · **Select / bulk-dismiss mode.** Inbox sub-header `Select`
    toggle turns row taps into selection toggles (checkbox
    replaces the unread dot, no layout jitter). Sticky bottom bar:
    `N selected · Cancel · Dismiss N`. One call runs `hideThreads`
    + `hideNotifications` in parallel.
  Every dismiss path — swipe, bulk, even the existing X + confirm
  — surfaces an **Undo snackbar** for 5 seconds. `UNDO` restores
  via new `unhideThread` / `unhideNotification` helpers (set
  `hidden_at = null`). Per "from view only" rule: never hard-
  deletes — just toggles `hidden_at` on `notification_reads` /
  `thread_participants`. Admin's broadcast list still shows every
  notification ever sent; the existing
  `fn_clear_hidden_on_new_message` trigger still resurfaces
  dismissed threads on the next message. No migration — `hidden_at`
  columns existed from v0.6.x.
- **Event recurrence: weekly interval** (v0.12.3). Weekly recurring
  events get a new **Every [N] week(s) on [weekday]** picker.
  N=1 = the back-compat default ("every week on Thursday"); N=2 =
  biweekly leagues / board meetings; N=3-12 covers monthly-by-
  weekday-of-week tournaments where the existing
  `monthly_first/_nth` rules would misalign with the actual series
  cadence. Pattern description line ("Pattern: every 2 weeks on
  Tuesday.") spells out the cadence before the occurrence-count
  preview so the manager can verify before committing the
  multi-row insert. Capped at `MAX_WEEKLY_INTERVAL = 12 weeks`;
  the v0.9.12 `MAX_OCCURRENCES = 52` hard cap still applies. No
  schema change — N is a `generateOccurrences()` parameter at
  create time; materialized rows look identical to single-weekly
  events.

### 📊 Hybrid Analytics + Admin Dashboard (Phase 12 v2)
- **Hybrid GA4 + Supabase analytics layer.** Every member-app event
  fires to BOTH GA4 (member-app property, strategic layer — ML
  audiences, BigQuery export, exploration UI, future marketing
  attribution) AND a first-party `analytics_events` table in Supabase
  (operational layer — fast multi-tenant SQL queries for the admin
  dashboard, RLS-scoped by `club_id`, sub-50ms response). The two
  layers have non-overlapping domains; `useAnalytics.js` dual-writes
  via fire-and-forget so analytics never block member UX.
- **`analytics_events` table** (migration 62) — `(club_id, member_id,
  user_id, event_name, properties jsonb, url_path, user_agent, ts)`
  with indexes on `(club_id, ts desc)` and `(club_id, event_name, ts
  desc)` for the dashboard's hot-path queries. RLS: members/staff/
  guests of the club can INSERT; only staff (or super_admin) can
  SELECT. No UPDATE or DELETE — events are immutable.
- **Dashboard aggregation RPCs** (migration 63) — `dashboard_dau_today`,
  `dashboard_dau_yesterday`, `dashboard_dau_7d`, `dashboard_top_screens_today`.
  All `SECURITY INVOKER` with `search_path` pinned per Supabase
  hardening guidance; all timezone-aware against the club's local
  timezone via `clubs.timezone`.
- **AdminDashboard** (`src/components/AdminDashboard.jsx`) — the
  default landing on desktop admin (root state = no area + no section).
  Eight live tiles:
  1. **Today's Activity** — DAU + ↑/↓ vs yesterday + 7-day sparkline
  2. **Open Work** — food orders / lessons / pro shop inquiries
     waiting (server-truth, shared subscription with the sidebar badges)
  3. **Top Screens Today** — most-viewed member-app screens
  4. **Community Pulse** — bulletin + partner + RSVP activity this week
  5. **Upcoming Events** — next 3 with RSVP counts
  6. **New Members This Week** — count + recent names
  7. **Badges Awarded Recently** — last 5 awards
  8. **Recent Bulletin Posts** — last 5 posts
- **Tile flexibility:**
  · **Drag-and-drop** reorder via `@dnd-kit`. Grip handle in each
    tile's top-right; rest of the tile stays click-interactive.
  · **Show/hide toggle** via "⚙ Manage tiles" header button.
    Persisted as `dashboard_hidden_tiles` admin_preference.
  · **Persisted order** as `dashboard_tile_order` admin_preference,
    per (user, club). New tiles added in future patches append to
    the end so existing layouts aren't disturbed.
  · **Role-gated catalog** — each tile declares the minimum role
    (`staff` / `manager` / `super_admin`); hidden from anyone below.
- **Per-workspace dashboard layouts** — workspaces (v0.11.11) gain
  an optional `dashboardLayout: { order, hidden }` snapshot. Applying
  a workspace flips the dashboard tile arrangement to match. Five
  seeded workspaces ship with role-tuned layouts:
  · **Daily Ops** — Open Work first (kitchen / pro shop scan)
  · **Member Services** — Community Pulse first (member touchpoints)
  · **Events** — Top Screens first (event-surface attention)
  · **Broadcasts** — Today's Activity first (audience size before send)
  · **Setup** — Today's Activity + Top Screens only; ops + community hidden
- **Dashboard sidebar item** — always-visible at the top of the
  desktop sidebar; one click returns to the dashboard from any
  section. Custom 4-pane grid icon.
- **DashboardErrorBoundary** — class-based React error boundary
  wraps the dashboard so a render-phase crash falls back to the
  empty state instead of blanking the admin. Catches what
  `getDerivedStateFromError` can catch; doesn't catch errors thrown
  from inside `useEffect` (the v0.11.27 fix removed the one such
  case that was blanking the admin during this phase).

### 🖥️ Responsive Admin (Phase 12)
- **Two layout shells, one component tree.** Same admin sections, two
  layouts: `AdminLayoutMobile` (current 3-level drill-down, &lt;768px)
  and `AdminLayoutDesktop` (persistent left sidebar + top bar + main
  content area, ≥768px). Mobile UX is unchanged — Phase 12 is purely
  additive for tablet + desktop managers.
- **`useViewport` hook** (`src/hooks/useViewport.js`) — single source
  of truth for breakpoints: `BREAKPOINT_TABLET = 768`,
  `BREAKPOINT_DESKTOP = 1024`. Returns `{ viewport, isMobile, isTablet,
  isDesktop, isTabletUp, isDesktopUp }`. Debounced via
  `requestAnimationFrame`. SSR-safe (mobile fallback).
- **Desktop sidebar** — collapsible area groups with persisted
  collapse state, active-section highlighting (brass left bar +
  cream background), area-level unread badges, breadcrumbs in the top
  bar (Admin › Area › Section), "Back to MyClub" + dark-mode toggle in
  the footer.
- **Tablet compact mode** — same shell, dimensions tuned smaller:
  200px sidebar (vs 260px desktop), tighter sidebar + main padding.
  Triggered by `compact={isTablet}` in `AdminLayoutDesktop`.
- **`AdminTable`** (`src/components/AdminTable.jsx`) — desktop table
  primitive. Sortable columns (3-state cycle), bulk-select checkboxes,
  custom cell renderers, sticky header, striped rows, row hover, row
  click, loading + empty states. Drop-in for any section that wants a
  table on desktop while keeping the mobile card layout.
- **`SidePanel`** (`src/components/SidePanel.jsx`) — slide-in detail
  panel. Mounts inside the main content area (not document body) so
  it overlays just the section, not the sidebar/topbar. Backdrop +
  Esc + focus restoration. 220ms translateX. Default 420px wide.
- **`AdminSearchPalette`** (`src/components/AdminSearchPalette.jsx`)
  — Cmd+K / Ctrl+K command palette. Fuzzy-matches across every admin
  section by label, area name, description. Arrow keys + Enter +
  Esc. `SearchTrigger` button mounted in the top bar between
  breadcrumbs and BellChip as the discoverability affordance.
- **`useKeyboardShortcuts`** (`src/hooks/useKeyboardShortcuts.js`) —
  single-key bindings + Gmail/GitHub "g + letter" chord pairs (1.2s
  window). Auto-skips when focus is in an input. Wired in the desktop
  shell: `/` opens search, `g h` home, `g i` Communications, `g p`
  People, `g s` Club Settings, `g b` Broadcasts, `g e` Events.
- **`admin_preferences` table** (migration 61) — parallels member-side
  `user_preferences` but keyed by `(user_id, club_id?, key)`. Super_
  admins don't have a member row in every club, so admin UI state
  lives on the auth identity. `club_id` NULL = cross-club preference;
  non-NULL = per-club. RLS scoped to `user_id = auth.uid()`.
- **`useAdminPreference(key, default, { clubScoped })`** hook
  (`src/hooks/useAdminPreference.js`) — mirrors `useUserPreference`
  API: `[value, setValue, ready]` with debounced writes + flush on
  unmount. Powers every persisted admin preference.
- **Persisted admin UI state** — `sidebar_collapsed` (which areas the
  manager collapsed), `last_section` (lands back where you left off
  on reload), `theme` (cross-club light/dark toggle).
- **Dark mode** — cross-club preference. Sets CSS custom properties
  (`--g-bg`, `--g-card`, `--g-text`, `--g-muted`, `--g-border`) on
  `documentElement` via `applyThemeMode()` in `theme.js`. Existing
  `G.*` references resolve via `var(--g-…, fallback)` so the swap
  propagates everywhere without per-component wiring.
- **Workspaces / personas** (`AdminWorkspaceSwitcher.jsx`) — named
  snapshots of `{ collapsed, lastSection }`. Manager defines
  workspaces like "Daily ops" / "Setup" / "Member services" and flips
  between them in one click via a chip in the sidebar header.
  Catalog is cross-club (workspaces follow the admin); active
  workspace is per-club (a manager may wear different hats at
  different clubs).

### 🗓️ Calendar, News, Menu, Push Polish (Phase 11)
- **Calendar override indicators** — hollow brass rings on dates with schedule overrides (holiday closures, members-only days, reduced hours); day-detail Facility Notes section resolves the facility name via `schedule_overrides.status_id` → `club_status` → `club_facilities`, surfaces the state pill + hours line + manager's reason
- **Calendar entry points** — "View all →" link in the Home Next Event header; Lucide Calendar icon in every event-detail back-header for a one-tap escape from any event surface (Home, inbox, My Events, deep links all route through `community/event`)
- **Event filter pills** — horizontal scrollable category pills above both `EventsCalendar` upcoming list + `EventsUpcoming` paginated list. "All" pill + one per distinct future-event category, multi-select, hides itself when only one category exists. Selection persists per-member via `user_preferences` so the filter follows you between surfaces and survives sign-in
- **`user_preferences` table** (migration 58) — generic per-member JSONB key-value store; unique on (member_id, key); RLS scopes reads + writes to the owning member; `useUserPreference(key, default)` hook with debounced writes + flush-on-unmount; reusable for any future per-member setting
- **News contextual action links** — generic `category → {label, route}` mapping in `src/lib/newsActionLinks.js`; replaces the v0.10-era broken hardcoded "Related" card (text-only divs with `cursor: pointer` and no `onClick` handlers); shipped categories: Dining → food menu, Events → calendar, Course → pin placements, Golf → course conditions, ProShop → pro shop; outlined button below the article body + smaller inline link on Home feed cards with `stopPropagation` so the link doesn't steal the card's own tap
- **Menu Category drag-and-drop** — Lucide `GripVertical` handle on every row; reorder via drag or arrow keys (keyboard a11y via `@dnd-kit/sortable`'s `sortableKeyboardCoordinates`); `sort_order` recomputed with *10 spacing on drop so single-row inserts don't trigger a full renumber; parallel UPDATEs on drop; optimistic local reorder + realtime so two managers reordering at once converge; reusable `SortableSimpleAdmin` helper for any future "name + active toggle + sort_order" surface
- **Push notification sender identity** — `send-push` Edge Function v6; notification titles now identify the sender (members.name resolved by `sender_user_id` + `thread.club_id`) instead of the generic "<Club> · Message"; falls back to "New message" / "Clubhouse" for staff-side accounts without a member row
- **New dep:** `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`

### 🏆 Club Champion Recognition (Phase 10)
- Shield-shaped badge system — pointed-bottom heraldic SVG, manager-chosen color fill, white Lucide icon centered, optional year label
- Reusable `Badge` component (`src/components/Badge.jsx`) — three sizes: **mini 28px** (cards / message bubbles), **small 64px** (directory / Trophy Case grid), **large 96px** (profile / detail view) — single source of truth
- Two new tables (migration 55): `badges` (catalog per club) + `member_badges` (assignments) with RLS scoped to club + `can_manage_members` permission for writes
- Admin **People → Badges** library with Quick add row (six pre-defined templates: Club Champion / Member-Guest / Hole In One / Senior Champion / Most Improved / 25-Year Member), inline form with live large-shield preview, edit + delete with holder-count confirm
- Curated 24-icon Lucide picker (Trophy, Award, Medal, Crown, Star, Flag, Target, Compass, Sun, TreePine, Mountain, Users, Heart, Coffee, Wine, Gem, plus 8 more) + 8 club-themed color swatches + native color picker for full custom
- Per-member assignment from the expanded member detail panel in Directory — inline picker filters to badges the member doesn't already hold
- Member-facing surfaces: mini row on the membership card (max 5 + "+N" overflow chip; card grows 218→258px only when badges held) and mini strip on each member directory row (max 4 + overflow)
- Realtime everywhere — awards land on every surface within seconds without a refresh
- v0.10.1 brings a dedicated **Trophy Case** on the Community tab (Club Honors grid + My Badges) with a custom section name configurable per club

### 📥 Communications Triage (Phase 9)
- Single inbound-activity destination for staff. Six role-scoped
  sub-queues: Food Orders · Lesson Requests · Pro Shop Inquiries ·
  Guest Registrations · Clubhouse Messages · Event RSVPs.
- Per-sub-queue **unread badges** (numeric red dots) on the area
  card and on each sub-queue header. Counts are per-device
  (`localStorage` keyed by club id), update live via Supabase
  realtime, and clear when the staff member views the sub-queue.
- Per-sub-queue permission gating via existing keys (`can_view_orders`,
  `can_manage_lessons`, `can_manage_members`, `can_view_clubhouse_inbox`,
  `can_manage_events`) so a bartender only sees Food Orders, the
  pro only sees Lesson Requests, the manager sees everything.
- Lesson Requests + Pro Shop Inquiries split from the shared
  `pro_shop_inquiries` table via `kind` discriminator.
- "Reply via clubhouse" button on Lesson + Pro Shop rows creates
  a clubhouse thread with both staff and requester as participants
  — no more email-and-copy-paste.

### 🎯 Admin Hub (9 areas, Phase 9 reorg)
- Two-level: 9 area cards → sub-hub of sections → section content
- **Search bar** filters every section across all areas; jumps direct
- **Daily Status quick-access** banner on admin home for users with
  `can_edit_course_status` — flip today's open/limited/closed pills
  in 2 taps from cold-load

#### Area ordering
1. **Communications** *(new in v0.9.4 — inbound triage)* — Lesson Requests · Pro Shop Inquiries · Guest Registrations · Clubhouse Messages · Event RSVPs (accordion view, v0.12.0). Food Orders moved to Dining in v0.12.0. Each sub-queue is permission-gated and shows a numeric **unread badge** on the area card and its own header. Realtime. (Demo Requests deferred until landing page exists.)
2. **Broadcasts** *(renamed from "Communications" in v0.9.4)* — News · Push Broadcasts · Sponsor Banners · Hole Sponsors
3. **Events** — Events (full CRUD, incl. N-week interval recurrence in v0.12.3). RSVPs moved to Comms sub-queue.
4. **Golf Course** — Daily Status · Pace · Daily Pins · Hole Details. Hours config + Date Overrides moved to Club Settings.
5. **Pro Shop** — Pro Shop Items · Lesson Pros. Lesson Queue moved to Comms.
6. **Dining** — **Food Orders** *(landing section, kitchen reply inline, v0.12.0–12.1)* · Menu Categories · Menu Items.
7. **People** — Directory (find anyone) · Manage Members · Moderate Posts · **Badges** *(new in v0.10.0)* · Guest Settings & QR · Manage Staff
8. **Club Settings** *(renamed from "Club Setup" in v0.9.0)* — Branding & Contact · Feature Toggles · Facility Hours · Date Overrides · Member Guide
9. **Platform** (super_admin only) — Super Admins · All Clubs cross-club editor + new-club onboarding · Provisioning log · **Support** *(new in v0.13.0, Inbox + Team tabs)*

---

## Repo layout

```
windhaven-app/
├── package.json
├── wrangler.toml                  # Cloudflare Workers/Pages config
├── CHANGELOG.md                   # Per-version notes; the source of truth for release history
├── public/
│   ├── sw.js                      # Web Push service worker
│   ├── manifest.webmanifest       # PWA manifest
│   ├── favicon.svg / icon.svg     # Platform mark
│   ├── grounds-icon.png           # Platform icon (splash, install card)
│   ├── grounds-lockup.png         # Platform wordmark lockup
│   ├── grounds-mark.png           # Service worker notification badge
│   └── greens/                    # Hole SVG illustrations
├── supabase/
│   ├── README.md                  # Edge Function inventory + secrets. Schema lives in MCP-applied migrations.
│   └── functions/
│       └── send-push/             # Web Push fan-out Edge Function (v5 — tracked because the ?diag=1 endpoint is the canonical debug surface)
├── src/
│   ├── App.jsx                    # Auth gate + route table + service-worker registration + splash
│   ├── theme.js                   # CSS-var-backed palette + applyClubPalette
│   ├── index.css
│   ├── lib/
│   │   ├── supabase.js            # Supabase client + slug resolution
│   │   ├── permissions.js         # PERMISSION_KEYS + helpers
│   │   ├── features.js            # Feature flag catalog (min_tier, defaults, lock semantics)
│   │   ├── guestAccess.js         # Access-mode logic for guest gating
│   │   ├── terms.js               # Terms of Use version tracking
│   │   ├── push.js                # subscribeToPush / unsubscribe / SW registration
│   │   ├── commsUnread.js         # Communications-area unread tracking (Phase 9)
│   │   ├── timezone.js            # clubLocalParts (IANA-aware)
│   │   └── version.js             # VERSION / PLATFORM_NAME / phase history
│   ├── hooks/
│   │   ├── useAuth.jsx            # Session, club, member, role, permissions, pending + guest gating
│   │   ├── useNav.jsx             # Per-tab stack navigation + swipe gestures
│   │   ├── useBrand.jsx           # Tag/legend strings from current club
│   │   ├── useClubData.jsx        # useClubStatus / useNews / useMenu / etc.
│   │   ├── useInbox.js            # useInbox / useInboxUnread / hideThread / markRead
│   │   ├── useFlag.js             # Feature-flag reader with tier + lock awareness
│   │   ├── usePWAInstall.js       # beforeinstallprompt + isStandalone detection
│   │   ├── useScrollRestore.js
│   │   ├── useUserPreference.js   # Per-member JSONB key-value (Phase 11)
│   │   ├── useViewport.js         # Responsive breakpoints (Phase 12)
│   │   ├── useAdminPreference.js  # Per-admin (user_id, club_id?, key) prefs (Phase 12)
│   │   └── useKeyboardShortcuts.js # Single-key + g+letter chords (Phase 12)
│   ├── components/
│   │   ├── BellChip.jsx · BottomNav.jsx · NavIcon.jsx
│   │   ├── StatusPill.jsx · Toggle.jsx · Headers.jsx · Buttons.jsx
│   │   ├── PendingGuard.jsx · FeatureOff.jsx
│   │   ├── Calendar.jsx           # Calendar UI (Events Calendar surface)
│   │   ├── Replies.jsx            # Reusable post_replies UX
│   │   ├── Avatar.jsx · ProfilePhotoCard.jsx · Badge.jsx
│   │   ├── DisplayModePicker.jsx · DmOptOutToggle.jsx · NotificationsToggle.jsx
│   │   ├── InstallCard.jsx · InstallEntry.jsx
│   │   ├── AdminTable.jsx               # Phase 12 desktop table primitive
│   │   ├── SidePanel.jsx                # Phase 12 slide-in detail panel
│   │   ├── AdminSearchPalette.jsx       # Phase 12 Cmd+K command palette
│   │   ├── AdminWorkspaceSwitcher.jsx   # Phase 12 named workspace switcher
│   │   ├── AdminDashboard.jsx           # Phase 12 v2 admin landing dashboard
│   │   └── DashboardErrorBoundary.jsx   # Phase 12 v2 dashboard crash guard
│   └── screens/
│       ├── Home.jsx · Login.jsx
│       ├── GolfHub.jsx · CourseMap.jsx · PinMap.jsx · TeeTime.jsx · PartnerBoard.jsx
│       ├── FoodMenu.jsx · CourseOrder.jsx · OrderConfirm.jsx
│       ├── Events.jsx · EventsCalendar.jsx · EventDetail.jsx
│       ├── NewsDetail.jsx · BulletinBoard.jsx
│       ├── MyClub.jsx · MemberCard.jsx · MemberDirectory.jsx · MemberGuestQR.jsx
│       ├── ProShop.jsx · LessonRequest.jsx · MyInquiries.jsx
│       ├── Inbox.jsx · Thread.jsx · MessageClubhouse.jsx
│       ├── Settings.jsx · TermsGate.jsx · OnboardingGuide.jsx
│       ├── GuestRegister.jsx · GuestThankYou.jsx
│       └── AdminPanel.jsx         # Admin hub + search + section router
│           └── admin/
│               ├── CrudSection.jsx
│               └── sections.jsx   # Every admin sub-section component
```

---

## Getting started (local dev)

1. **Install:**
   ```bash
   npm install
   ```
2. **Configure environment.** Copy `.env.example` to `.env.local` and fill in:
   ```
   VITE_SUPABASE_URL=https://exddcpqfdkyxommkslag.supabase.co
   VITE_SUPABASE_ANON_KEY=<publishable key from Supabase Settings → API>
   VITE_DEFAULT_CLUB_SLUG=clintoncc
   VITE_MAPTILER_KEY=<your MapTiler key>
   VITE_OPENWEATHER_API_KEY=<your OpenWeatherMap key>
   VITE_VAPID_PUBLIC_KEY=<your VAPID public key>
   ```
3. **Run:**
   ```bash
   npm run dev
   ```
4. Open `http://localhost:5173`. Sign in with an existing member email + password.

To test a different club locally without touching DNS: append `?club=<slug>` to the URL.

---

## Architecture notes

### Multi-tenant model
- Every domain table has a `club_id` FK to `clubs(id)`.
- RLS policies enforce isolation: members + staff only see their own
  club's rows. Super_admin (NULL `club_id` in `user_roles`) bypasses.
- Onboarding a new club = one INSERT to `clubs` from the Super Admin's
  Platform → All Clubs → New Club modal. The `provision-club-domain`
  Edge Function then auto-creates the Cloudflare DNS CNAME. No schema
  migration, no redeploy.

### Role + permission model
- `user_roles` (id, user_id, club_id [nullable for super_admin], role,
  permissions jsonb, display_name, created_by, created_at).
- Helper functions: `is_super_admin()`, `is_club_manager(uuid)`,
  `is_staff_of(uuid)`, `is_member_or_staff_of(uuid)`,
  `is_active_guest(uuid)`, `has_permission(uuid, text)`. All SECURITY
  DEFINER with `search_path` pinned so they can be called from RLS
  policies safely.
- Pending members: presence of a `members` row with status='pending' +
  no elevated role. Gated client-side via `useAuth().canMemberWrite`
  per the club's `pending_member_access` mode.
- Guests: rows in `guests` (linked to `auth.users`) with `access_mode`,
  `expires_at`, optional `referring_member_id`. `is_active_guest()`
  returns true when guest exists for the club and hasn't expired.

### Feature flags + subscription tier
- Catalog in `src/lib/features.js` — each flag has `min_tier`, a default
  value, and whether platform lock is allowed.
- `clubs.feature_flags` jsonb stores per-club overrides; `clubs.feature_flags_locked`
  stores super_admin pins that the manager can't override.
- `useFlag(key)` returns the resolved value taking lock > override >
  default into account.

### Messaging
- Single `threads` table backs all three kinds (`order` / `clubhouse` /
  `dm`). Triggers auto-create a thread per food order and post a system
  message on every status change. Per-member soft delete via
  `thread_participants.hidden_at`; a fresh message clears it (DB trigger).

### Replies
- `post_replies` table — polymorphic via `(post_type, post_id)`. One
  React component (`Replies.jsx`) renders across Bulletin / Partner /
  Events / Pro Shop inquiries.

### Push
- VAPID keys generated locally via `npx web-push generate-vapid-keys`.
  Public key shipped to client; private key is a Supabase Edge Function
  secret. Database Webhook on `messages` INSERT → calls `send-push` →
  fans out to each non-sender participant's subscriptions.

### Realtime
- All content tables are in the `supabase_realtime` publication. Hooks
  subscribe to `postgres_changes` filtered by `club_id` so member views
  refresh on admin edits (and vice versa) without a manual reload.

### Branding
- 3 colors per club applied at runtime as CSS custom properties
  (`--g-primary` / `--g-secondary` / `--g-accent`). `theme.js` exports
  `G.green` / `G.greenMid` / `G.brass` as `var()` strings so existing
  components don't need any changes.
- Logo + hero served from `club-assets` bucket; profile photos from
  `avatars` bucket. RLS write-scoped to staff of that club (or the
  member themselves for avatars).

### Guest QR security
- Token format: `<club_slug>.<expiry_unix>.<signature>` (member-linked
  variant also embeds `referring_member_id`).
- Signature: HMAC-SHA256 using key = `SUPABASE_SERVICE_ROLE_KEY + ':guest-qr-v1'`.
- Verified inside `guest-register` Edge Function with constant-time
  comparison (safeEqual).

---

## Deployment

### Frontend (Cloudflare Pages)
- Build command: `npm run build`
- Output: `dist/`
- Production branch: `main`
- Required env vars (Cloudflare Pages → Variables and secrets):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_DEFAULT_CLUB_SLUG`
  - `VITE_MAPTILER_KEY`
  - `VITE_OPENWEATHER_API_KEY`
  - `VITE_VAPID_PUBLIC_KEY`

Vite bakes env vars at build time, so any env-var change requires a
fresh build (push any commit to trigger).

### Backend (Supabase)
- Project: `exddcpqfdkyxommkslag`
- 5 Edge Functions deployed via MCP (see `supabase/README.md` for the
  inventory)
- Required secrets:
  - `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` — push
  - `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ZONE_ID` — DNS provisioning
  - `SUPABASE_SERVICE_ROLE_KEY` is auto-injected; doubles as the HMAC
    seed for guest QR signatures
- Database Webhook on `public.messages` INSERT → `send-push`

### DNS (groundslive.com → Cloudflare)
- Wildcard `*.groundslive.com` CNAME → Pages project covers any new club
- `provision-club-domain` Edge Function creates per-club CNAMEs
  automatically on new-club onboarding (with the `club_provision_log`
  audit trail)

---

## Onboarding a new club (super_admin runbook)

1. Sign in as super_admin.
2. Admin tab → **Platform → All Clubs → + New Club**.
3. Fill in: club name, slug, address, city, state, timezone, founded
   year, holes, par, yards, lat/lng. Hit Create. Cloudflare DNS is
   auto-provisioned via `provision-club-domain`; check the
   provisioning log if anything looks off.
4. You land in that new club's Settings — upload logo, hero photo, set
   colors, contact phone/email, pending access mode, guest defaults.
5. Configure feature flags under **Club Settings → Feature Toggles** (turn on what
   the club has paid for; pin any flags via platform lock).
6. Seed the new club's content (or import via CSV). News, events, menu
   items, holes, club guide pages — all via the admin UI.
7. Promote one of the club's signed-up users to **club_manager** via
   Platform → Super Admins (or under People → Staff once a member
   account exists).
8. Hand off to the new club_manager.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| App shows blank / no data | Cloudflare env var `VITE_DEFAULT_CLUB_SLUG` doesn't match a `clubs.slug` in the DB | Set to a valid slug or unset. Trigger a rebuild. |
| Push notifications never arrive | One of the 3 manual setup steps not done | Edge Function secrets + Database Webhook + Cloudflare env var. See Deployment. |
| Admin saves don't persist | Stale RLS policy | Run advisor (`get_advisors`) to surface missing policies. Every content table should have ≥ 2 policies. |
| New signup doesn't show in Members | Stale auth flow | `claim_or_create_member` RPC handles this. Check `members` for orphans with no `user_id`. |
| Status pills show wrong open/closed | Timezone misconfigured | Check `clubs.timezone` is a valid IANA name (e.g. `America/Chicago`). |
| Guest QR scan returns "invalid token" | Token expired or signature mismatch | Regenerate via `guest-qr-token` (clubhouse) or the member's MyClub → Share Guest Access (member-linked). |
| Home-screen PWA icon doesn't update | OS caches PWA icons | Uninstall + reinstall the PWA. iOS especially. |
| OneDrive prompts to delete 1000+ files | Vite cache invalidation inside `node_modules/.vite/` | Safe to "Delete all items"; node_modules regenerates. Better: move the project out of OneDrive. |

---

## Release cadence

- **PATCH** (`0.0.X`) — every commit. Bug fixes, UI polish, content,
  copy. One CHANGELOG entry per bump.
- **MINOR** (`0.X.0`) — "big lifts" / new phases. Bumps come with a
  named Phase header in `version.js` and a dedicated CHANGELOG section.
  **This README is refreshed at every MINOR bump.**
- **MAJOR** (`X.0.0`) — sweeping rewrites / breaking model changes.
  Stays at `0` until we cut a true `1.0` release.

See [`CHANGELOG.md`](./CHANGELOG.md) for the per-version history and
[`src/lib/version.js`](./src/lib/version.js) for the Phase index.

---

## License + attribution

Private project. "Powered by The Grounds" appears in three places per
the platform-brand design (loading splash, sign-in footer, MyClub
footer). Country club content is owned by each club.
