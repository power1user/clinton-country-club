# The Grounds — Country Club Member App

A mobile-first member engagement platform for country clubs. Currently
deployed for **Clinton Country Club** (Clinton, IL — 9-hole, par 35,
founded 1921) at `https://clintoncc.groundslive.com`. Architected as a
multi-tenant SaaS — onboarding a second club is a few clicks from the
Super Admin's Platform area, not a code change or a new deploy.

**Current version:** `v0.4.0`

---

## What this is

A web app (PWA-ready) that gives club members live operational visibility
into their club — what's open right now, today's pin placements, who's
on the bulletin board, this week's events — alongside a real messaging
inbox (clubhouse threads, order chat, member DMs), all backed by a
shared admin panel staff use to run day-to-day ops.

The "platform" layer ("The Grounds") sits above each club: the same
codebase + database serves every club, isolated by `club_id` and RLS,
white-labeled per club via logo + colors + photos.

---

## Tech stack

| Layer | What |
|---|---|
| Frontend | React 19 + Vite, plain JS (no TS), inline JSX styling |
| Auth | Supabase Auth (email/password + magic-link via `signInWithOtp`) |
| Database | Supabase Postgres, RLS-enforced isolation by `club_id` |
| Realtime | Supabase Realtime — every content table subscribed; admin edits push live |
| Storage | Supabase Storage `club-assets` bucket (logos, hero photos) |
| Edge | Supabase Edge Functions (Deno) — `send-push` for Web Push fanout |
| Map | MapLibre GL JS + MapTiler (course satellite) |
| Weather | OpenWeatherMap (current + 3-hour forecast at club coords) |
| Twilight | sunrise-sunset.org API (powers "closes at dusk" logic) |
| Hosting | Cloudflare Pages (frontend) + Cloudflare Workers (deploy target) |
| Push | Self-hosted Web Push (VAPID + service worker + `web-push` npm) |

---

## Feature inventory

### 🏗️ Platform Foundation
- Real authentication (email/password + magic-link invites)
- Realtime sync across every content table
- Row-Level Security on every table, multi-tenant safe via `club_id`
- All content database-driven (no hardcoded mock data in production)
- Subdomain-driven club resolution: `<slug>.groundslive.com` → that club's data
- Query-param `?club=slug` override for dev/preview
- Timezone-aware time logic — open/close + dusk computed in club's IANA timezone

### 🔐 Authentication & Roles
- 4-role hierarchy: `super_admin` / `club_manager` / `club_admin` / `member`
- `user_roles` table with `permissions` jsonb (14 granular flag keys)
- super_admin is platform-wide (null `club_id`), bypasses all club checks
- club_manager has all club permissions implicitly
- club_admin only has permissions explicitly granted
- "Member" role is implicit (presence of a `members` row)
- Auto-claim pending member row by email match on first sign-in; falls
  back to creating a fresh pending row so every signup appears in the
  Members roster
- Manager-configurable **pending member access** — `read_only` (default)
  / `full` / `locked` — controls what a new signup can see + do before
  staff promotes them to active
- Permission gating throughout admin: hidden area cards, hidden section
  cards, disabled write buttons, "view only" notes inside modals

### 👤 Member-Facing App
- Home screen with status pills (Course / Bar / Restaurant / Kitchen /
  Lounge), CSS-grid equal-width layout
- Auto-toggling Open / Limited / Closed pills based on weekly hours +
  "closes at dusk" + members-only flags (computed in club's local tz)
- Live clock + date (minute-aligned tick)
- Weather widget at club coords (current + hourly forecast)
- Pace of play indicator
- News feed with category filters + article detail
- Events calendar with RSVP flow
- Menu screen — categories driven by the DB-backed `menu_categories` table
- Bulletin board (classifieds / wanted / general)
- Partner finder (looking for foursome / single / cart-share / etc.)
- Pro shop catalog
- Membership card screen with QR code toggle
- MyClub screen — member info + Message Clubhouse + Member Directory
  (when DMs enabled) + Pro Shop + Lessons + Member Guide + "Contact the
  Club" (address opens maps · phone calls · email mails)
- Per-hole green diagrams with realtime pin placements

### 💬 Unified Messaging
- One schema (`threads` + `thread_participants` + `messages`) backs three
  kinds: **order chat**, **clubhouse inbox**, **member DMs**
- Auto-thread per food order with system status messages
- Participants-only read/write via RLS; staff see all order + clubhouse
  threads in their club
- Per-member soft delete (`thread_participants.hidden_at`) so a member
  can dismiss their copy without affecting other participants

### 🔔 Web Push (self-hosted, no third party)
- VAPID-signed Web Push via Supabase Edge Function (`send-push`) calling
  `web-push` library
- Service worker (`/sw.js`) handles incoming pushes + notification clicks
- Per-user `push_subscriptions` storage; stale endpoints (404/410) pruned
  automatically on send
- Opt-in via dismissible banner at top of Inbox

### 📬 Inbox + Bell
- Bell chip with unread badge on every main tab (Home / Golf / Food /
  Community / MyClub)
- Unified Inbox feed mixing admin broadcasts + threads, sorted by recency
- Per-row source chip (Order / Clubhouse / Message / Urgent / Alert /
  Notice), absolute date + relative time, dismiss X for threads
- Tap notification → expand + mark read; tap thread → open chat view

### 💭 Thread / Chat View
- Context-aware header strip: order status pill + items for order
  threads, topic for clubhouse, partner name for DMs
- iMessage-style asymmetric bubbles; system messages as centered italic chips
- Enter-to-send compose with auto-growing textarea; optimistic UI
- Live realtime + auto-scroll + auto-mark-read
- Compose hidden behind PendingGuard for read-only pending members

### 🏌️ Clubhouse Inbox
- Member-side "Message Clubhouse" card on MyClub with topic picker (Pro
  Shop / Restaurant / Tee Times / Course / General)
- Admin queue under People area, grouped by topic
- Permission key `can_view_clubhouse_inbox`

### 👥 Member DMs
- Manager toggle in Club Settings (`enable_member_dms`, default off)
- iOS-style toggle component
- When on, Member Directory card appears on MyClub with searchable
  roster + Message button per row
- `get_or_create_dm()` Postgres RPC for atomic find-or-create
- When off, all DM entry points hidden across the app

### 🎨 White-Label Branding
- Per-club configurable: logo, hero photo, 3 colors (primary / secondary
  / accent), tagline, contact phone/email
- Platform-managed (super_admin only): address, city, state, timezone,
  lat/lng, founded year, holes/par/yards
- CSS custom properties applied at runtime — no rebuild needed
- Realtime palette sync — manager edits push to every open session
- Logo + hero stored in `club-assets` bucket (RLS-scoped per club)

### 🏷️ Parent Brand ("The Grounds")
- Loading splash with wordmark + tagline
- Sign-in footer "Powered by The Grounds"
- MyClub bottom: "Powered by The Grounds · v0.4.0"
- Centralized `src/lib/version.js`

### 🎯 Admin Hub
- Two-level: 7 area cards → sub-hub of sections → section content
- **Search bar** filters every section across all areas; jumps direct
- Areas: Course / Dining / Events / Communications / Pro Shop / People
- Platform area (super_admin only) for Super Admins + All Clubs management

#### Per-area sections
- **Course**: Club Status · Schedule Overrides · Pace of Play · Pin
  Positions · Holes · Hole Sponsors
- **Dining**: Menu Categories · Menu Items · Food Orders queue
- **Events**: Events (full CRUD) · Event RSVPs queue
- **Communications**: News (full CRUD) · Notifications composer · Sponsor
  Banners · Member Posts (bulletin + partner moderation) · Club Guide
  (onboarding pages)
- **Pro Shop**: Pro Shop Items · Lesson Requests queue
- **People**: Members (search + CSV import + magic-link invites) ·
  Staff (role + permission checkboxes) · Clubhouse Inbox · Club Settings
  (branding + DM toggle + pending access mode)
- **Platform** (super_admin only): Super Admins promote/demote · All
  Clubs cross-club editor + new-club onboarding

---

## Repo layout

```
windhaven-app/
├── package.json
├── public/
│   ├── sw.js                       # Web Push service worker
│   └── greens/                     # Hole SVG illustrations
├── src/
│   ├── App.jsx                     # Auth gate + route table + service-worker registration
│   ├── theme.js                    # CSS-var-backed color palette + applyClubPalette
│   ├── index.css
│   ├── lib/
│   │   ├── supabase.js             # Supabase client + slug resolution
│   │   ├── permissions.js          # PERMISSION_KEYS + helpers
│   │   ├── push.js                 # subscribeToPush / unsubscribe / SW registration
│   │   ├── timezone.js             # clubLocalParts (IANA-aware)
│   │   └── version.js              # VERSION / PLATFORM_NAME
│   ├── hooks/
│   │   ├── useAuth.jsx             # Session, club, member, role, permissions, pending gating
│   │   ├── useNav.jsx              # Per-tab stack navigation
│   │   ├── useBrand.jsx            # Tag/legend strings from current club
│   │   ├── useClubData.jsx         # useClubStatus / useNews / useMenu / etc.
│   │   └── useInbox.js             # useInbox / useInboxUnread / hideThread / markRead
│   ├── components/
│   │   ├── BellChip.jsx            # Inbox bell with unread badge
│   │   ├── BottomNav.jsx           # 5-tab nav
│   │   ├── StatusPill.jsx          # Auto-toggling open/closed pill
│   │   ├── Toggle.jsx              # iOS-style switch
│   │   ├── PendingGuard.jsx        # Wraps write surfaces — pending-member gate
│   │   ├── Buttons.jsx
│   │   └── Headers.jsx
│   └── screens/
│       ├── Home.jsx
│       ├── Login.jsx
│       ├── GolfHub.jsx · CourseMap.jsx · PinMap.jsx · TeeTime.jsx · PartnerBoard.jsx
│       ├── FoodMenu.jsx · CourseOrder.jsx · OrderConfirm.jsx
│       ├── Events.jsx · EventDetail.jsx · BulletinBoard.jsx
│       ├── MyClub.jsx · MemberCard.jsx · MemberDirectory.jsx · OnboardingGuide.jsx
│       ├── ProShop.jsx · LessonRequest.jsx
│       ├── Inbox.jsx · Thread.jsx · MessageClubhouse.jsx
│       └── AdminPanel.jsx          # Admin hub + search + section router
│           └── admin/
│               ├── CrudSection.jsx # Generic list+add+edit+delete scaffold
│               └── sections.jsx    # Every admin sub-section component
```

(`supabase/` migrations are applied via the Supabase MCP server in this
project's build conversation; see `CHANGELOG.md` for the full history.)

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
  Platform → All Clubs → New Club modal. No schema migration, no
  redeploy. DNS for the new subdomain still needs to point at the Pages
  project (wildcard `*.groundslive.com` covers it once configured).

### Role + permission model
- `user_roles` (id, user_id, club_id [nullable for super_admin], role,
  permissions jsonb, display_name, created_by, created_at).
- Helper functions: `is_super_admin()`, `is_club_manager(uuid)`,
  `is_staff_of(uuid)`, `is_member_or_staff_of(uuid)`,
  `has_permission(uuid, text)`. All SECURITY DEFINER with the right
  `search_path` so they can be called from RLS policies safely.
- Pending members: presence of a `members` row with status='pending' +
  no elevated role. Gated client-side via `useAuth().canMemberWrite`
  per the club's `pending_member_access` mode.

### Messaging
- Single `threads` table backs all three kinds (`order` / `clubhouse` /
  `dm`). Triggers auto-create a thread per food order and post a system
  message on every status change. Per-member soft delete via
  `thread_participants.hidden_at`; a fresh message clears it (DB trigger).

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
  components don't need any changes — they pick up the variables.
- Logo + hero served from `club-assets` bucket, club-id-prefixed paths,
  RLS write-scoped to staff of that club.

---

## Deployment

### Frontend (Cloudflare Pages)
- Build command: `npm run build`
- Output: `dist/`
- Production branch: `main`
- Required env vars (Cloudflare Pages → Variables and secrets):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_DEFAULT_CLUB_SLUG` (=`clintoncc` for the current single-club setup)
  - `VITE_MAPTILER_KEY`
  - `VITE_OPENWEATHER_API_KEY`
  - `VITE_VAPID_PUBLIC_KEY`

Vite bakes env vars at build time, so any env-var change requires a
fresh build (push any commit to trigger).

### Backend (Supabase)
- Project: `exddcpqfdkyxommkslag`
- Edge Function: `send-push` (calls `web-push` via npm specifier)
- Secrets that must be set on the Edge Function (Settings → Edge
  Functions → send-push → Secrets):
  - `VAPID_PUBLIC_KEY` — same value as `VITE_VAPID_PUBLIC_KEY`
  - `VAPID_PRIVATE_KEY` — keep secret
  - `VAPID_SUBJECT` — `mailto:you@yourdomain.com`
- Database Webhook (Database → Webhooks): `send-push-on-message`,
  table `public.messages`, event Insert, type Supabase Edge Functions,
  target `send-push`.

### DNS (groundslive.com → Cloudflare)
- `clintoncc.groundslive.com` CNAME → Cloudflare Pages project
- For onboarding additional clubs: wildcard `*.groundslive.com` CNAME →
  Pages, OR add specific subdomains per club as they sign up.

---

## Onboarding a new club (super_admin runbook)

1. Sign in as super_admin (Marc).
2. Admin tab → **Platform → All Clubs → + New Club**.
3. Fill in: club name, slug (the subdomain — lowercase, 2–30 chars),
   address, city, state, timezone, founded year, holes, par, yards,
   lat/lng. Hit Create.
4. You land in that new club's Settings — upload logo, hero photo, set
   colors, contact phone/email, set Pending Member Access mode.
5. Add the new club's DNS: `<slug>.groundslive.com` CNAME → the Pages
   project. If the wildcard is already set up, skip this.
6. Seed the new club's content (or import via CSV). Today: news,
   events, menu items, holes, club content — all via the admin UI now.
7. Promote one of the club's signed-up users to **club_manager** via
   Platform → Super Admins (or under People → Staff once a member
   account exists).
8. Hand off to the new club_manager. They take it from there.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| App shows blank / no data | Cloudflare env var `VITE_DEFAULT_CLUB_SLUG` doesn't match a `clubs.slug` in the DB | Set to `clintoncc` (or unset). Trigger a rebuild. |
| Push notifications never arrive | One of the 3 manual setup steps not done | Edge Function secrets (3) + Database Webhook + Cloudflare env var. See Deployment. |
| Admin saves don't persist | Stale RLS policy (broken cascade) | Re-run the comprehensive RLS restore from migration 21. Check `select tablename, count(*) from pg_policies group by tablename` — every content table should have ≥ 2 policies. |
| New signup doesn't show in Members | Old auth flow without auto-create | `claim_or_create_member` RPC handles this now. Backfill any orphans with migration 21's `do $$ ... end $$` block. |
| Status pills show wrong open/closed | Timezone misconfigured | Check `clubs.timezone` is a valid IANA name (e.g. `America/Chicago`). |
| Git push fails with 403 to `power1user/...` | Windows Credential Manager has a stale `ilchiro` credential | `cmdkey /delete:LegacyGeneric:target=git:https://github.com` then retry `git push`. |
| OneDrive prompts to delete 1000+ files | Vite cache invalidation inside `node_modules/.vite/` | Safe to "Delete all items" every time; node_modules regenerates. Better: move the project out of OneDrive. |

---

## License + attribution

Private project. "Powered by The Grounds" appears in three places in the
app per the platform-brand design (loading splash, sign-in footer,
MyClub about row). Country club content is owned by each club.

For the version-by-version history, see [`CHANGELOG.md`](./CHANGELOG.md).
