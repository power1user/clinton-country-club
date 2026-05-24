# Changelog

All notable changes to this project. Convention:
- **MAJOR** (X.0.0) — sweeping rewrites / breaking model changes
- **MINOR** (0.X.0) — phase rollouts (Phase 1 → 0.1.x, Phase 4 → 0.4.x)
- **PATCH** (0.0.X) — every shipping commit gets a bump + a one-line entry
  below so support conversations can pinpoint the exact build a club
  is running. Manual migration steps called out where applicable.

---

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
