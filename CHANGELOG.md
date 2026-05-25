# Changelog

All notable changes to this project. Convention:
- **MAJOR** (X.0.0) — sweeping rewrites / breaking model changes
- **MINOR** (0.X.0) — phase rollouts (Phase 1 → 0.1.x, Phase 4 → 0.4.x)
- **PATCH** (0.0.X) — every shipping commit gets a bump + a one-line entry
  below so support conversations can pinpoint the exact build a club
  is running. Manual migration steps called out where applicable.

---

## v0.5.x — Phase 5: member-to-member replies + DM affordances

Reusable threaded-reply system on every member-generated content
surface, paired with DM buttons when DMs are enabled. The point is
that no post is a dead end anymore.

- **v0.5.5** — Removed Golf Partners card from Community section nav
  (added by mistake in v0.5.4). Golf-coordination already lives in
  GolfHub's Partners tile; duplicating it in Community blurred the
  "is this a golf thing or a community thing" line. Community now
  shows only what's genuinely member-to-member general: Bulletin
  Board, and Member Directory when the flag is on.
- **v0.5.4** — Member Directory exposed in Community tab; split
  directory visibility from DMs. Two flags now:
    · `member_directory` (NEW, basic tier, default off) — controls
      whether the roster is visible at all
    · `dms` (existing, standard tier) — controls whether per-row
      Message buttons appear inside the directory
  Migration 28 grandfathers existing clubs to `member_directory=on`
  so Clinton + Oakgrove don't lose access mid-deploy.
  Community tab now has a section-card row at the top (Bulletin
  Board · Golf Partners · Member Directory when flag is on). The
  old "Bulletin Board" button in the header is gone — that surface
  is a proper card now. Header tagline updated from "Events &
  Calendar" to "Events & member channels" to reflect the broader
  scope. MyClub directory tile and the MemberDirectory screen
  gate both moved from the dms flag to the new directory flag.
- **v0.5.3** — Reply pattern audit, no code changes. Confirmed every
  public member-generated content surface has the two-option pattern
  wired:
    · Bulletin Board — Replies + DM button (v0.5.0)
    · Partner Board — Replies (v0.5.1) + Contact-or-clubhouse fallback (v0.4.10)
    · Event Detail — Replies, default-open (v0.5.1)
  Documented exemptions:
    · Pro Shop inquiries — private by design (member↔staff via clubhouse)
    · Food orders — private; each has its own kind='order' thread
    · News + notification broadcasts — staff-generated, out of
      member-generated scope; could be added later in ~5 min (add
      values to post_replies.post_table CHECK constraint + drop the
      <Replies> component into the renderer)
  Member Directory is a profile surface, not a post surface, so
  the DM button per row covers the use case.
- **v0.5.2** — Brightened text/icons on dark green backgrounds for
  legibility. The two main offenders: `#446854` (BottomNav inactive
  labels + icons, ~2:1 contrast against the `#152E24` nav bar) and
  `#7AAC88` (used everywhere as the sub-head/tagline color on the
  `#1B3A2D` brand strip). Both swept to `#A8D8B8` — the existing
  bright sage already in the palette as `G.openTxt` — which gives
  WCAG-AA-ish contrast and still feels on-brand. Touched 14 files
  (App.jsx, BellChip, BottomNav, NavIcon, Headers, BulletinBoard,
  CourseMap, EventDetail, Events, FoodMenu, GolfHub, Home,
  LessonRequest, Login, MemberCard, MyClub, PartnerBoard, TermsGate).
  Also documented the major/minor/patch convention explicitly in
  version.js per user preference (two-digit segments OK).
- **v0.5.1** — Reply thread extended to Partner Board cards and
  Event Detail. Same `<Replies>` component, no new code path —
  proves the polymorphic design works. Partner posts get the thread
  alongside the existing Contact/Message button so members can
  coordinate publicly ("count me in" / "what tee time?"). Event
  detail gets a "Member Discussion" panel that defaults open so
  attendees can coordinate carpools, ask format questions, etc.
  Pro shop inquiry replies are pending a member-side "My Inquiries"
  view to render against — the table already supports
  `post_table='pro_shop_inquiries'` so it's just a UI surface away.
- **v0.5.0** — Reply system foundation. New `post_replies` table
  (polymorphic: keyed by `post_table` + `post_id` so the same
  scaffolding works for bulletin posts, partner posts, event RSVPs,
  pro shop inquiries — all four covered by the CHECK constraint).
  RLS: anyone in the club reads, authors write their own, staff can
  hide. New `<Replies>` component renders a count + expand toggle
  on the post card with realtime updates and inline compose; iOS
  zoom prevented via 16px input font. BulletinBoard wires it in:
  every post now has an always-visible reply thread plus a Message
  button when DMs are enabled and the poster has a known user_id.
  Bulletin compose inputs also bumped to 16px.

## v0.4.x — Patch releases (after Phase 4 ship)

These are post-Phase-4 ops and quality work. Each line is one commit
on `main` that bumped `src/lib/version.js`.

- **v0.4.1** — Micro version tracking: bump patch on every commit;
  CHANGELOG line per bump. Sets the convention going forward.
- **v0.4.2** — Sender identity on every message surface. Thread messages
  show the sender name above the bubble for non-own messages; system
  messages display "The Grounds" (orders) or "The Clubhouse" (clubhouse
  threads). Inbox notification rows surface the staff member who sent
  the broadcast (or "The Clubhouse" for system broadcasts). Names
  resolve from `members.name` for members, `user_roles.display_name`
  for staff, falling back to "Staff" / "The Clubhouse" when neither.
- **v0.4.10** — Partner Board overhaul: wired Contact button + card
  redesign + DM-disabled fallback. The Contact button used to be a
  dead end (opened a sheet that just closed itself). Now it routes
  intelligently:
  · If DMs are enabled at the club AND the post has a known author
    user_id → calls `get_or_create_dm` and drops the member into
    the DM thread.
  · Otherwise (DMs off or orphan/anonymous post) → creates a
    clubhouse thread with subject "Golf Partner Inquiry: <title>"
    so front office can route. The button label changes to "Contact
    via clubhouse" so the path is obvious before tapping.
  · Suppressed on the member's own posts (replaced with a small
    "Your post" label).
  Card redesign surfaces all the at-a-glance info in chips: game
  type, the date the member wants to play (`date_wanted` is now in
  the NewPartnerSheet form + displayed as an emerald chip), filled
  status, posted-on. Errors during contact open a dismissible
  banner under the category nav.
- **v0.4.9** — Author attribution surfaced on Bulletin + Partner
  board cards. Audit confirmed the queries were already joining
  `members(name)` and rendering it — the issue was visibility (small
  text at the bottom). Expanded the join to also pull `tier` and
  `member_since`, then added a prominent author row with a circle
  initial + name + "Tier · Member since YYYY" subline near the top
  of each card. Partner cards also keep the post-snapshot Hcp on
  that subline. Fallback for orphan posts is now "Anonymous" instead
  of the misleading "Member" so a missing author is visually obvious.
- **v0.4.8** — Fix Thread expanding past viewport on iPhone after
  typing. Root cause was iOS Safari auto-zooming any focused input
  with font-size < 16px — the textarea was 14px. Bumped to 16. Added
  `min-width: 0` on the textarea + its flex parent so a long unbroken
  word can't push the row out, and `overflow-x: hidden` + `max-width:
  100%` on the thread root and messages container as defensive
  clipping. Tested in Safari tab and installed PWA.
- **v0.4.7** — FoodMenu rework. Three fixes in one screen:
  (1) Removed the "Order Ahead" green pill — redundant with the
  floating "View Order" CTA that already appears once items are in
  the cart.
  (2) Removed the hardcoded "Kitchen / Pub / Order to course" info
  strip — duplicated live status pills on Home and used facility
  names that didn't match the actual club_status labels (which are
  per-club: Clinton uses "Restaurant" / "Bar"). Each club's real
  facility names + status are still authoritative on Home.
  (3) Replaced the horizontal-scrolling category tabs with a sticky
  chip nav that anchor-jumps to vertical sections. All categories
  render in one continuous list. Fixes the conflict with the new
  swipe-between-tabs gesture (B4). Specials get a brass-accent
  section header at the top; the active section's chip highlights
  as the member scrolls.
- **v0.4.6** — UI polish: money fields show `$` + 2 decimals.
  CrudSection gains a `money` field type that renders an inline `$`
  glyph in the input gutter, blurs to a 2-decimal display, and stores
  as Number so sorts and totals stay sane. Applied to
  pro_shop_items.price (was a bare number input). Menu items and
  event prices remain text because they support free-form values
  like "Market" or "$125 / $150 guest"; both already had clear `$…`
  placeholders. Also audited every date input in the app — all of
  them already use native HTML date pickers (type="date" or
  "datetime-local"), no fix needed.
- **v0.4.5** — Fix Cloudflare Pages deploy that started failing under
  the new unified Workers+Static-Assets backend. Their wrangler
  rejects the canonical SPA pattern `/* /index.html 200` in
  `_redirects` with a false-positive "infinite loop" validation
  (error code 100324). Switched to `wrangler.toml` with
  `not_found_handling = "single-page-application"`, deleted
  `public/_redirects`. Same end behavior; passes validation.
- **v0.4.4** — Cloudflare DNS automation on new-club onboarding. Super
  admin → Platform → All Clubs → Onboard New Club now does two stages:
  (1) INSERT the clubs row, (2) call new `provision-club-domain` Edge
  Function which POSTs to Cloudflare's Pages Custom Domains API. CF
  auto-creates the DNS Worker route + provisions the TLS cert. Modal
  surfaces success ("Live at https://slug.groundslive.com") or
  failure (with the manual fallback steps). Stage 2 is non-fatal —
  manager can continue and add the Custom Domain in the dashboard if
  the automated path errored. Idempotent: re-running on an existing
  hostname returns success ("already configured").
  Requires three Supabase Edge Function secrets:
  `CLOUDFLARE_API_TOKEN` (Account.Cloudflare Pages.Edit scope),
  `CLOUDFLARE_ACCOUNT_ID`, optional `CLOUDFLARE_PAGES_PROJECT` +
  `CLOUDFLARE_ROOT_DOMAIN` (defaults: "the-grounds", "groundslive.com").
- **v0.4.3** — Message deletion works for every inbox type. Notifications
  (broadcasts) get the same dismiss-from-my-view affordance threads
  already had — X button on the row, confirmation modal, view-only
  removal. Inside an open thread the kebab menu "Hide conversation"
  was renamed to "Delete conversation" to match member expectations
  (the underlying behavior is still a per-user hide that resurfaces
  when a new message lands). Schema: `notification_reads.hidden_at`
  added in migration 27 with a partial index on visible rows; reuses
  the existing per-self RLS policy. Admin-side delete of a broadcast
  via NotificationsAdmin already removed it for everyone — unchanged.

---

## v0.4.0 — Phase 4: Messaging

Unified messaging stack — order chat, clubhouse inbox, member DMs —
plus Web Push and the supporting UI. The biggest single phase to date.

### Schema (Supabase migrations 18 + 19 + 20 + 21 + 22)
- New tables: `threads` · `thread_participants` · `messages` · `push_subscriptions`
- New columns: `clubs.timezone` · `clubs.pending_member_access` · `clubs.enable_member_dms` · `thread_participants.hidden_at`
- New helpers: `is_thread_participant(uuid)` · `get_or_create_dm(uuid)` · `claim_or_create_member(uuid)` · `fn_order_thread_create()` · `fn_order_status_message()` · `fn_message_bumps_thread()` · `fn_clear_hidden_on_new_message()`
- Triggers on `food_orders` (insert + status update) and `messages` (insert)
- Comprehensive RLS restore (migration 21) — recovered ~20 policies dropped silently by earlier function-cascade drops
- Backfilled 5 historical food orders → threads + member participants
- Restored `members` RLS (lost in migration 17's cascade)
- 4 orphan auth users backfilled into Clinton's roster with status='pending'

### Web Push backend
- VAPID keypair generated, `web-push` library called from Supabase Edge Function `send-push`
- Service worker at `/sw.js` handles push events + notification clicks
- `src/lib/push.js`: subscribe / unsubscribe / register / permission probe helpers
- Stale subscriptions (HTTP 404/410) auto-pruned on send

### Frontend
- **Inbox screen** replaces old Notifications.jsx — unified feed of
  threads + admin broadcasts, sorted by recency, with absolute date +
  relative time + per-thread dismiss (X). Push opt-in banner.
- **BellChip** on every main tab (Home / Golf / Food / Community /
  MyClub) with numbered unread badge
- **Thread view** — context-aware header (order status pill, clubhouse
  topic, DM partner name), iMessage-style asymmetric bubbles, system
  message chips, auto-growing compose, auto-scroll, realtime
- **Message Clubhouse** screen — topic picker (Pro Shop / Restaurant /
  Tee Times / Course / General); creates thread; drops into Thread view
- **Clubhouse Inbox** admin section (under People) grouped by topic
- **Member Directory** screen (when `enable_member_dms` is on) with
  searchable roster + Message buttons → `get_or_create_dm` RPC
- **PendingGuard** wraps every write surface (food order · RSVP ·
  clubhouse · DM · lesson request · thread compose). Banner on Home.
- App.jsx Gate renders **locked splash** when manager has set
  `pending_member_access='locked'`

### Polish that came after the smoke test
- Timezone-aware status pills via new `src/lib/timezone.js`
- iOS-style **Toggle** component (replaces DM checkbox)
- Address + phone + email surfaced on MyClub as a tappable
  "Contact the Club" section (maps · tel · mailto)
- Governance split: manager-only ClubSettingsForm hides immutable-ish
  fields (address, lat/lng, founded, par, yardage, holes, timezone);
  super_admin sees everything via Platform → All Clubs
- Three-dots `●●●` removed from every status bar
- Admin hub gets a **search bar** that filters every section flat
- "Coming in Phase 3" placeholder cards removed (PlatformSettings /
  CrossClubMetrics) — the components still exist for later
- Renamed Marketing area → **Communications**
- Six new CRUDs filling content-edit gaps:
  - **Holes** (par, yards by tee, name, description, image)
  - **Menu Items** (item-level CRUD with category dropdown)
  - **Events** (full CRUD with auto-derived display fields)
  - **News** upgraded from composer-only to full list+edit+delete
  - **Club Guide** (onboarding pages, `club_content` table)
  - **Member Posts** (bulletin + partner moderation)
- Menu categories table seeded for Clinton + 30 menu items linked via
  `category_id` FK
- `useMenu` rewritten to load categories from DB; FoodMenu tabs now
  dynamic + reflect manager renames in realtime

### Manual setup required (one-time, post-deploy)
1. Supabase → Edge Functions → `send-push` → Secrets: add
   `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
2. Supabase → Database → Webhooks → create `send-push-on-message`,
   table `public.messages`, event Insert, type Supabase Edge Functions,
   function `send-push`
3. Cloudflare Pages → Variables: add `VITE_VAPID_PUBLIC_KEY`

---

## v0.3.0 — Phase 3: White-Label Branding + Subdomain Routing

Made the app multi-tenant SaaS-ready and added "The Grounds" parent
brand attribution.

### Schema (migrations 16 + 17)
- `clubs` gets: `logo_url` · `hero_image_url` · `primary_color` ·
  `secondary_color` · `accent_color` · `tagline` · `contact_email` ·
  `contact_phone` · `address`
- Slug format constraint: `^[a-z0-9]([a-z0-9-]{0,28}[a-z0-9])?$`
- Hardened `clubs` RLS: super_admin only for INSERT/DELETE; manager+
  for UPDATE on their own club; SELECT open for the pre-auth slug lookup
- Dropped broken pre-Phase-2 helpers (`is_club_admin`,
  `is_club_super_admin`) that still pointed at the deleted `admin_users`
  (this silently took out a chunk of write policies — fully restored
  later in migration 21)

### Frontend
- `theme.js` exports `G.green` / `G.greenMid` / `G.brass` as `var()`
  expressions backed by `--g-primary` / `--g-secondary` / `--g-accent`
- `applyClubPalette(club)` sets the CSS variables at runtime; called
  from `useAuth` on club load + whenever the realtime subscription
  fires an UPDATE on the clubs row
- Slug resolution: subdomain in prod (`<slug>.groundslive.com`) →
  `?club=` override → `VITE_DEFAULT_CLUB_SLUG` env → `'clintoncc'` fallback
- **Club Settings** admin section (manager): tagline, logo upload, hero
  upload, colors via native `<input type="color">` + hex inputs,
  contact info, **member DM toggle**
- **All Clubs** admin section (super_admin): list every club with
  swatch + logo, tap to edit any club's settings, **+ New Club**
  onboarding modal
- "The Grounds" attribution: loading splash with wordmark, sign-in
  footer, MyClub About row
- `clubs` added to the `supabase_realtime` publication so branding
  edits push to every open session
- Version bumped to `v0.3.0`; `src/lib/version.js` centralizes the
  version + platform name

---

## v0.2.0 — Phase 2: 4-Role Hierarchy + Permissions

Replaced the 2-tier `admin_users` model with a proper 4-role system
backed by a `user_roles` table.

### Schema (migration 15)
- `user_roles` (id, user_id, club_id [nullable for super_admin], role,
  permissions jsonb, display_name, created_at, created_by)
- Roles: `super_admin` · `club_manager` · `club_admin` (member is implicit)
- Helpers: `is_super_admin()` · `is_club_manager(uuid)` ·
  `is_staff_of(uuid)` · `is_member_or_staff_of(uuid)` ·
  `has_permission(uuid, text)`
- Migrated old `admin_users` rows: Marc → `super_admin` with NULL
  `club_id`; Matt → `club_manager` at Clinton
- Storage bucket RLS rewritten to use `is_staff_of()`
- `admin_users` dropped

### Frontend
- `useAuth` exposes `role` · `permissions` · `isSuperAdmin` · `isManager`
  · `isClubAdmin` · `isAdmin` (back-compat) · `hasPerm(key)`
- `src/lib/permissions.js`: 14 PERMISSION_KEYS, PERMISSION_GROUPS by
  area, `highestRole(rows)`, `userHasPerm(role, perms, key)`
- **StaffAdmin** rewritten — list shows role + perm-count chip, tap a
  row → modal with role dropdown (locked unless super_admin) + grouped
  permission checkboxes with All-on / All-off shortcuts
- Permission gating throughout admin: hidden area cards, hidden section
  cards, disabled write buttons, "view only" notes inside modals
- **Platform area** added to admin hub (super_admin only). Sub-sections:
  Super Admins (promote / demote / remove), All Clubs (placeholder
  becomes real in Phase 3), Platform Settings + Cross-Club Metrics
  (placeholders — eventually removed in Phase 4 polish)

---

## v0.1.0 — Phase 1: DB-driven content + admin hub

Migrated every screen off mock data and added scaffolded admin sections
for every content table.

### Schema (migration 14)
- 9 new tables: `menu_categories` · `schedule_overrides` ·
  `food_order_items` · `pro_shop_items` · `notification_messages` ·
  `notification_reads` · `hole_sponsors` · `sponsor_banners`
- Extended: `event_registrations` (+ club_id, status, guests_count,
  notes) · `pro_shop_inquiries` (+ preferred_time, skill_level) ·
  `menus` (+ category_id FK)
- RLS helpers + per-table policies (later partially nuked in 15/17's
  cascades — restored in 21)
- Realtime publication includes every new table
- Storage bucket `club-assets` (public read, RLS write by club staff
  via path prefix)
- Clinton slug renamed from `windhaven` → `clintoncc`

### Frontend
- Mock data fallbacks (`src/data/mock.js`) stripped entirely
- New content tables wired into the admin hub via a shared
  `<CrudSection>` scaffold (list + add modal + edit modal)
- Scaffolded admins: Menu Categories · Schedule Overrides · Pro Shop
  Items · Hole Sponsors · Sponsor Banners · Notifications · Food
  Orders queue · Event RSVPs · Lesson Requests
- Admin hub restructured to two levels: 6 area cards (Course / Dining /
  Events / Marketing / Pro Shop / People) → sections (Phase 4 polish
  reorganizes this further)
- Members admin: list + search + Add Member modal + CSV bulk import
  with quote-aware parser + magic-link invite per member
- Staff admin: role dropdown (admin/manager) + add/remove
- Real Clinton CC scorecard data: 9 holes, par 35, 2784 yards (blue),
  multi-tee yardages, real hole names + descriptions
- Real Clinton CC menu (5 categories × ~6 items) from photos provided
  by the club
- SVG illustrations for each green based on tee-marker photos
- Course overview SVG matching the master course map
- Live time + date everywhere (minute-aligned tick)
- Per-day weekly hours with "closes at dusk" via sunrise-sunset.org
- "Members only" brass-badged days per facility
- Status pill auto-toggling Open ↔ Closed based on today's hours
- Realtime subscriptions on pin placements + news + events + menus +
  food orders + bulletin + partner posts

---

## v0.0.x — Pre-phase (October 2025 → early May 2026)

Building blocks before the formal phasing started. Major moves:
- Project scaffolded from the Windhaven CC design handoff
- Supabase wired up; schema for clubs / members / status / news /
  events / menus / pin placements / pace
- Real auth (email/password) + admin_users table for staff
- Map switched from Mapbox to MapTiler/MapLibre for cost predictability
- Hosting switched from Netlify to Cloudflare Pages / Workers
- Original mock data replaced with real Clinton CC content
- Equal-width status pill rows via CSS grid
- Tap-to-place pin editor in admin
- "Done" button after order navigates back to Food tab properly
- Status pill admin re-sync fix (dirty ref pattern)
- Realtime subscriptions added to pin_placements / news / events / menus
- Admin Hub landing page (6-card grid) replaces scrolling section tabs

The version bumped to `v0.1.0` once the Phase 1 work landed and the
admin hub stabilized.

---

## Migration index

| # | Name | Phase | Notes |
|---|---|---|---|
| 14 | `14_phase1_content_schema` | 1 | 9 new tables · RLS · realtime · storage · slug rename |
| 15 | `15_phase2_user_roles_and_permissions` | 2 | `user_roles` · helpers · cascade-dropped `is_member_or_staff_of` (and re-created it) |
| 16 | `16_phase3_branding_columns` | 3 | Branding + contact columns on `clubs` |
| 17 | `17_phase3_clubs_rls_for_super_admin` | 3 | clubs RLS hardening + cascade drop of legacy helpers (silently broke a chunk of write policies) |
| 18 | `18_phase4_messaging_schema` | 4 | threads / participants / messages / push_subscriptions |
| 19 | `19_restore_members_rls` | 4 | restored members RLS (lost in 17 cascade) |
| 20 | `20_clubs_timezone` | 4 polish | IANA timezone column on clubs |
| 21 | `21_restore_rls_and_auto_member` | 4 polish | comprehensive RLS restore across ~20 tables + `claim_or_create_member` RPC + backfill orphan auth users |
| 22 | `22_pending_access_and_thread_hide` | 4 polish | `clubs.pending_member_access` + `thread_participants.hidden_at` + clear-hidden trigger |
