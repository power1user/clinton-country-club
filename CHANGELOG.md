# Changelog

All notable changes to this project. Convention:
- **MAJOR** (X.0.0) — sweeping rewrites / breaking model changes
- **MINOR** (0.X.0) — phase rollouts (Phase 1 → 0.1.x, Phase 4 → 0.4.x)
- **PATCH** (0.0.X) — every shipping commit gets a bump + a one-line entry
  below so support conversations can pinpoint the exact build a club
  is running. Manual migration steps called out where applicable.

---

## v0.7.x — Phase 7: Operational control plane

Every member-facing surface becomes a manager-toggleable flag, with
a separate platform-level lock super_admin can pin from Platform →
All Clubs. New top-level **Features** admin area is the single home
for these toggles; the inline toggle list in Club Settings is gone
(pointer left in its place). Schema migration 39 adds
`clubs.feature_flags_locked jsonb` (default `'{}'`) — a platform pin
present here wins over the manager's own override and the catalog
default. Existing behavior is unchanged for any club that doesn't
touch their Features panel — previously-hardcoded-visible surfaces
default to ON in the catalog.

- **v0.7.1** — Pull-to-refresh re-audit + one realtime gap closed.
  Background: v0.5.7 explicitly decided AGAINST pull-to-refresh on the
  grounds that every member-facing screen was already realtime. v0.7.1
  re-verified the seven hooks the original spec called out (useNews,
  useEvents, useMenu, useProShopItems, useBulletinPosts,
  usePartnerPosts, MemberDirectory) and the broader set in
  useClubData. Six of seven still have active supabase subscriptions —
  no work needed.
  The seventh — **MemberDirectory** — was missing its subscription
  despite v0.5.7 documenting it as "(inline in component)" realtime.
  Either the audit was wrong then or a refactor stripped it; the fix
  is the same regardless: restored the subscription in
  `MemberDirectory.jsx` using the same channel pattern every other
  hook uses (`members_directory:<club_id>` listening for `*` events
  on `members` filtered by club_id, just calls `load()` on any
  change).
  Schema side: migration 40 adds `public.members` to the
  `supabase_realtime` publication. Without it the subscription would
  open successfully but never receive events. Confirmed via
  `pg_publication_tables` query after applying.
  Net effect: a member joining the directory, uploading a profile
  photo, changing their name, toggling DM opt-out, or being
  activated/deactivated now shows on every other member's directory
  view live, without a manual refresh. Same UX as every other
  member-facing surface.
  No pull-to-refresh component built — would be cruft now that the
  one gap is closed.
- **v0.7.0** — Phase 7 lands. Five parts:

  **1. Catalog expansion.** `src/lib/features.js` grows from 4 flags
  (`dms`, `member_directory`, `display_mode`, `profile_photos`) to
  17. New flags, each with the screen they control:
    · `pro_shop`            — MyClub → Pro Shop (default ON)
    · `lesson_booking`      — MyClub → Book a Lesson (default ON)
    · `bulletin_board`      — Community → Bulletin Board (default ON)
    · `partner_board`       — Golf → Golf Partners (default ON)
    · `events_calendar`     — Community tab's calendar section (default ON)
    · `food_ordering`       — Food & Drink tab itself (default ON)
    · `pace_of_play`        — Golf hub's live pace strip (default ON)
    · `course_map`          — Golf → Course Map (default ON)
    · `pin_placements`      — Golf → Pin Placement (default ON)
    · `tee_time_booking`    — Golf → Book Tee Time (default OFF, marked
      placeholder: scaffold exists, no real backend yet)
    · `lockers`             — locker row on MyClub → My Account (default ON)
    · `cart_assignments`    — cart row (default ON)
    · `parking_assignments` — parking row (default ON)
  Defaults preserve current behavior so every existing club keeps
  every surface visible without touching anything.

  **2. Platform lock.** Migration 39 adds
  `clubs.feature_flags_locked jsonb default '{}'`. Resolution
  order in `isFeatureOn`/`featureState`: tier → lock → manager
  override → catalog default. New `featureState` reason
  `'platform-locked'`; new `withFlagLock(currentLocks, key, value)`
  helper (pass `null` to clear). RLS unchanged — clubs UPDATE
  policy already gates writes.

  **3. New top-level admin area: Features.** Sits between People
  and Platform on the admin hub (manager-visible, not super-only).
  Single section "Feature Toggles" opens `<FeaturesPanel
  mode='manager' />` — one card per category (Golf, Pro Shop,
  Dining, Community, Messaging, Member Info, Appearance) with
  every flag in that category as a Toggle row. Tier-locked flags
  render greyscale + lock icon + "Requires X tier" hint.
  Platform-locked flags render a "Set by The Grounds" brass badge
  + disabled toggle. Every toggle flip is a live supabase write —
  no Save button, no race against pending edits.

  **4. Super admin overrides.** Platform → All Clubs → club
  detail now renders `<FeaturesPanel mode='platform' />` BELOW the
  existing branding/contact form. Each non-tier-locked row shows
  a small "🔒 Lock for this club" link; clicking pins the current
  effective value into `feature_flags_locked`. Locked rows flip to
  "✕ Unlock — let the club manager decide" and the badge reads
  "Locked On/Off" instead of "Set by The Grounds." Toggles in
  platform mode stay interactive even when locked (super_admin
  can flip the locked value); manager-mode toggles disable.

  **5. Gating audit.** Wired `useFlag(...)` early-returns into
  every member-facing surface listed above: `ProShop.jsx`,
  `LessonRequest.jsx`, `BulletinBoard.jsx`, `PartnerBoard.jsx`,
  `FoodMenu.jsx`, `CourseMap.jsx`, `PinMap.jsx`, `TeeTime.jsx`.
  Each renders the new shared `<FeatureOff label="…" />` (lives in
  `src/components/FeatureOff.jsx`) when their flag is off — a
  friendly "isn't available" screen with a BackHeader as the
  escape hatch. Nav tiles + tab strips ALSO filter by flag so
  members don't normally land on a FeatureOff screen in the first
  place: `MyClub.jsx` filters its 5-tile grid + My Account rows;
  `GolfHub.jsx` filters its 4-tile grid + the pace-of-play strip +
  the next-tee-times preview block; `Events.jsx` filters its
  section nav AND the calendar/day-detail section; `BottomNav.jsx`
  hides the Food tab when food_ordering is off; `App.jsx`'s
  `TAB_ORDER` is now reactive — swipe-nav skips the Food tab when
  off so swiping from Golf goes straight to Community.

  Files touched, in summary: `src/lib/features.js` (catalog +
  lock helpers), `src/lib/version.js` (0.6.15 → 0.7.0 + Phase 7
  history line), `src/screens/AdminPanel.jsx` (new Features
  area), `src/screens/admin/sections.jsx` (FeaturesPanel +
  FeaturesAdmin; removed inline toggles from ClubSettingsForm;
  platform-mode panel added to AllClubsAdmin's detail view),
  `src/screens/{ProShop,LessonRequest,BulletinBoard,PartnerBoard,FoodMenu,CourseMap,PinMap,TeeTime,Events,MyClub,GolfHub}.jsx`
  (gating + tile filters), `src/components/{BottomNav,FeatureOff}.jsx`,
  `src/App.jsx` (reactive TAB_ORDER), DB migration 39.

  **Not in this commit (next four v0.7.x patches):** pull-to-
  refresh re-audit (v0.7.1), dawn flag mirroring dusk (v0.7.2),
  Android PWA badge via `navigator.setAppBadge` (v0.7.3), bulletin
  /partner author attribution edge cases (v0.7.4). Wallet stays
  parked at v0.8.0+ pending Apple/Google credentials.

  **Heads-up for managers:** every previously-visible feature is
  ON by default, so nothing disappears for members on upgrade.
  Open Admin → Features to see the new switchboard.

## v0.6.x — Phase 6: News/Events split + calendar view

Events get a calendar as their primary surface (was a flat list).
News stays as cards on Home but gets an optional date picker in the
admin composer (was a required free-text label).

- **v0.6.15** — Photo upload robustness + cleanup of the diagnostic
  policy. Two changes:
  1. **Unique filename per upload.** Was `avatar.jpg` (fixed path
     that conflicted on re-upload from a stale PWA cache or a
     second device). Now `avatar-<timestamp>.jpg` — every upload is
     a guaranteed-new path, no "already exists" conflicts possible.
     Pre-upload step lists the member's folder and removes any
     existing files so storage doesn't accumulate orphans.
     `removePhoto` similarly lists+removes-all rather than
     hardcoding the old single filename.
  2. **Dropped the diagnostic "totally open" policy** from
     migration 35/36/37 (migration 38). It was only there to prove
     RLS wasn't the bottleneck; v0.6.14 confirmed the real issue
     was apikey, not RLS. The tight per-member policy
     (`members upload own avatar`) stays as the production rule.
- **v0.6.14** — Profile photo upload — finally pinned the actual
  cause. Server response body was:
    `{ "message": "No API key found in request",
       "hint": "No \`apikey\` request header or url param was found." }`
  Our anon key is the new `sb_publishable_*` format (Supabase
  introduced this recently as a more secure replacement for the
  legacy `eyJ...` JWT-style keys). The storage client in
  supabase-js 2.105.4 wasn't including the apikey header on
  upload requests, even though other services (auth, postgrest,
  realtime) were attaching it fine.
  Fix: explicitly set `apikey` as a global header on the supabase
  client config:
    ```
    createClient(url, key, {
      auth: { ... },
      global: { headers: { apikey: key } },  // NEW
    });
    ```
  Now the apikey is attached to every outgoing request regardless
  of which service the supabase-js client is talking to. Storage
  uploads work. Auth/postgrest/realtime continue to work
  (redundant header is harmless). When supabase-js patches the
  storage client to handle publishable keys natively we can drop
  the override; for now this is the cleanest workaround.
  Background on the chase: this was actually a 5-iteration debug
  spiral (v0.6.9 → v0.6.13) because the supabase-js error wrapper
  was mistranslating the server's response into "row violates RLS"
  and then "Object not found" — neither of which was the real
  cause. Lesson logged in code comments to read the raw network
  response BEFORE trusting the client's error message.
- **v0.6.13** — Profile photo upload — strike five but with the
  actual cause finally identified. Network tab response body
  revealed the real server response was HTTP 400 with body
  `{statusCode: 404, error: not_found, message: Object not found}`.
  NOT an RLS error. The supabase-js client misreported it as
  "row violates row-level security policy" — a bad heuristic on
  its end.
  Root cause: `upload(path, blob, { upsert: true })` in our
  supabase-js version appears to attempt UPDATE-first, and 404s
  on the first upload when there's no existing object to update
  (instead of falling back to INSERT). Explains why all prior
  RLS-policy fixes had no effect — the request was never being
  checked against RLS; it was being rejected by the storage
  routing as "no such object to update."
  Workaround: do an explicit `remove([path])` (idempotent, no
  error if doesn't exist) followed by a plain `upload()` without
  upsert. Two HTTP calls instead of one but reliable. Will revisit
  if/when supabase-js fixes the upsert path.
- **v0.6.12** — Profile photo upload fix attempt #4 — SELECT policy
  on storage.buckets. DB-only fix (migration 34).
  Diagnostic that cracked it: count(*) on storage.objects where
  bucket_id='club-assets' returned **0**. No upload has ever
  succeeded on this bucket, including admin logo/hero/pro-shop
  image uploads that were supposed to work since Phase 3. Three
  attempts to fix the object-level INSERT policy (v0.6.9, v0.6.11)
  didn't move the needle because the object policy wasn't the
  bottleneck.
  Root cause: storage.buckets has RLS enabled in this project but
  ZERO policies. Default deny-all for non-admin. Supabase Storage
  looks up the bucket row before any object operation to check
  the public flag, mime allowlist, size limit, etc. The bucket
  lookup was failing silently and the eventual write returned a
  misleading "row violates RLS" error pointing at storage.objects.
  Buckets were created via SQL in Phase 3, which skipped the
  policy creation the dashboard does automatically.
  Fix: `create policy "anyone can read bucket info" on
  storage.buckets for select using (true);`. Bucket info is
  configuration, not member data — safe to read publicly. Same
  default Supabase dashboard would have set if buckets had been
  created through the UI.
- **v0.6.11** — Profile photo upload finally works. DB-only fix
  (migration 33), no JS change needed. v0.6.10's diagnostics
  confirmed the failure was at the storage RLS layer: "new row
  violates row-level security policy."
  Root cause: v0.6.9 / v0.6.5 used `storage.foldername()` to
  parse the path. The function returns the right text[] in plain
  SELECT (verified) but the policy evaluator was still rejecting.
  Likely a runtime-context issue with how foldername interacts
  with the policy checker in Supabase's storage code path.
  Fix: switched the policy to `split_part(name, '/', N)` — the
  exact pattern the existing `club_assets_staff_insert` policy
  uses (and that's been working for logo / hero uploads since
  Phase 3). Also dropped the `to authenticated` clause since the
  staff policy doesn't have it; Supabase wires the role grant
  separately.
  No JS code change — the path the app constructs (using
  session.user.id) is the same. Just the SQL got simpler and
  matches the proven pattern.
- **v0.6.10** — Better diagnostics on profile photo upload failures.
  The v0.6.9 fix didn't resolve the user's "permission denied"
  error in production, and the friendly error message hid which
  step actually failed (storage upload vs members table update vs
  something else entirely). This commit:
    · Tags each step with a specific failure prefix in the UI:
      "Storage upload failed: …" or "Saving photo to your profile
      failed: …"
    · Logs structured debug info to the browser console for each
      failure (path attempted, error object)
    · Surfaces the raw underlying error message in the UI instead
      of a friendly summary, so the user can copy/paste it
  No behavior change for successful uploads.
- **v0.6.9** — Fix "You don't have permission to update your photo"
  on profile photo upload. The v0.6.5 storage policy did a subquery
  on `public.members` to map auth.uid() → members.id, then compared
  that to the path's third segment. Subquery hit members' SELECT
  RLS, which uses a SECURITY DEFINER function — works in most
  contexts but fails in some storage RLS evaluation paths, returning
  empty and tripping the WITH CHECK.
  Fix (migration 32): drop the subquery. Store avatars under the
  user's auth UID instead of members.id:
    Old: `<club_id>/members/<member.id>/avatar.jpg`
    New: `<club_id>/members/<auth.uid()>/avatar.jpg`
  Storage policy becomes a one-liner: `(storage.foldername(name))[3]
  = auth.uid()::text`. No cross-table reads, no chance of the same
  bug coming back.
  ProfilePhotoCard updated to use `session.user.id` for path. No
  existing avatars to migrate (members.photo_url was empty across
  the board pre-fix).
- **v0.6.8** — Message deletion audit + in-message Delete button.
  Audit findings (all from v0.4.3):
    · Threads: hideThread writes thread_participants.hidden_at;
      useInbox filters hidden_at out; new message clears it via
      DB trigger. ✓ Working.
    · Notifications: hideNotification writes notification_reads.
      hidden_at; useInbox + useInboxUnread both filter on it. ✓
      Working. (User's earlier "broken" note predates v0.4.3 fix.)
    · Inbox row X button + confirmation modal handle both types.
    · Thread view kebab → "Delete conversation" handles in-thread.
    · Admin NotificationsAdmin → full CRUD deletes the broadcast
      row, which removes it for all recipients (the spec's
      "staff deleting a broadcast removes it for everyone").
  Added: per the spec's "delete option inside every open message
  view" — Inbox now renders a Delete button inside the expanded
  body for notifications (threads already had it via Thread's
  kebab). Same confirmation modal as the row X button. Order
  thread system messages remain non-deletable for any user (they
  represent order history) — covered by the existing absence of
  delete UI on those bubbles.
- **v0.6.7** — Real scannable QR on the Membership Card. The old
  "QR" view was a hand-drawn pattern of rectangles — looked QR-ish
  but encoded nothing. Replaced with a real QR generated by
  qrcode.react (added as a dep, ~20KB) encoding the member's
  `membership_number` as plain text. Standard format, scannable by
  any QR reader (Apple Camera, Android, dedicated apps). 160px on
  the card at error-correction level M gives reliable arm's-length
  reads under typical glare. Black on white for maximum contrast.
  Empty/missing membership_number renders the QR for "-" and the
  caption shows "Member No. —" so the screen doesn't break.
- **v0.6.6** — Persistent "Install App" entry in Settings → App.
  Different from the existing InstallCard (session-dismissible, on
  MyClub + Login): this one always renders unless the app is
  already running standalone, so members who dismissed an earlier
  prompt can come back to install when they're ready.
  Platform branching:
    · Already standalone → renders nothing
    · iOS Safari (no install API) → step-by-step instruction list:
      1. Tap Share, 2. Tap Add to Home Screen, 3. Tap Add. Each
      step has a hint icon (share / plus / check).
    · Android Chrome / Edge / Brave → tappable "Install" button
      that fires the deferred beforeinstallprompt event
    · Anything else → small italic note explaining the browser
      doesn't support installs (no dead button)
  The MyClub InstallCard stays in place — it already auto-hides
  when standalone per the spec's "follow same logic" note. Settings
  InstallEntry is the persistent backstop alongside it.
- **v0.6.5** — Member profile photos. Lands across every surface
  the spec called out: Settings (upload/camera/remove), Membership
  Card (52px next to name), Member Directory (34px per row),
  Bulletin + Partner board author rows (26-28px), Thread message
  bubbles (26px next to non-own bubbles).
  Schema (migration 31):
    · members.photo_url text
    · Storage policies on club-assets for the path
      `<club_id>/members/<member_id>/avatar.jpg` — members can
      insert/update/delete only their own avatar; reads stay public
  Catalog: new `profile_photos` flag (basic tier, default off).
  When off, the upload card hides AND every consumer falls back to
  the initials avatar even if a photo exists (member's earlier
  upload preserved, just not shown).
  Components:
    · `<Avatar>` — single source of truth used everywhere; takes
      photoUrl + name + size; falls back to initials circle
    · `<ProfilePhotoCard>` — Settings widget with two file inputs
      (upload + camera w/ capture="user"). Canvas-resizes to 800px
      max edge at 0.85 JPEG quality (~50-120KB typical). Cache-busts
      via `?v=timestamp` on update.
  Hooks: useBulletinPosts + usePartnerPosts pull photo_url; Thread
  sender map merges photo_url from members onto staff records (staff
  are also members of the club).
- **v0.6.4** — Display Mode personalization. Three brightness-shifted
  palettes — Light, Medium, Dark — that stay inside the club's
  brand family (no off-palette color introduced).
  Schema: members.display_mode text with check constraint
  (light|medium|dark, default medium; migration 30). New
  display_mode feature flag in features.js (basic tier, default off
  — manager opts in via Subscription & Features).
  Theme plumbing:
    · theme.js: G.bg, G.card, G.border, G.text, G.muted now route
      through CSS custom properties (`var(--g-bg, …)` etc) with the
      medium values as fallbacks
    · index.css: `:root` / `[data-theme='medium']` define the
      defaults; `[data-theme='light']` shifts to brighter beige
      backgrounds; `[data-theme='dark']` to a deeper beige (NOT a
      true black dark-theme — that's a bigger redesign)
    · useAuth: applies `data-theme` on `<html>` from the member's
      saved value, forced to 'medium' when the club has the flag off
      (so a member can't be stuck on a half-broken theme if the club
      later disables the feature)
  UI: DisplayModePicker in Settings → Appearance section. Segmented
  control with three options. Auto-hides when club flag off.
- **v0.6.3** — Member-level DM opt-out. Lands in Settings under a
  new "Privacy" section. Schema: members.allow_dms boolean (default
  true, migration 29). When a member turns it off:
    · Their Message button is hidden from every other member's
      directory row (client-side gate)
    · get_or_create_dm RPC raises "This member has turned off direct
      messages" before creating a thread (server-side gate; defense
      in depth)
    · Existing threads stay accessible to both parties — the opt-out
      only blocks NEW thread creation
  Toggle hides itself entirely when the club's dms flag is off
  (no point letting a member toggle a flag that won't matter).
  Bonus: get_or_create_dm now checks feature_flags->>'dms' instead
  of the deprecated enable_member_dms column (the column was being
  mirrored as a safety net since v0.4.1; this is the first place
  the new path is used directly server-side).
- **v0.6.2** — Settings screen scaffold + Add-to-Wallet removed. New
  `/myclub/settings` screen accessible via a gear icon in the MyClub
  header. Houses the push-notifications toggle (moved out of MyClub);
  scaffolded with comment-stubbed slots for Privacy (DM opt-out),
  Appearance (display mode), Profile (photo), and App (install) —
  each landing in v0.6.3 through v0.6.6.
  Removed the "Add to Wallet" button from MemberCard since neither
  Apple Developer nor Google Wallet credentials are in hand yet.
  Tracked as future work; explicitly not leaving a "Coming soon"
  stub (reads as broken). When credentials arrive the wallet
  feature lands as v0.7.0 or later.
- **v0.6.1** — Directional slide transitions on tab switches. Tapping
  a tab to the right (or swiping left) slides the new screen in
  from the right; tapping to the left slides in from the left.
  Matches the swipe gesture's mental model. Implementation is pure
  CSS keyframes on `transform: translateX` — no animation library,
  no double-render. Tab slide is 18px / 200ms (lighter than the
  28px / 220ms drill-down slide) so lateral moves don't feel like
  nested ones. Falls back to a quick fade for users with
  `prefers-reduced-motion`.
  Direction picked in `useNav.goTab` by comparing TABS-array index
  of the source and target tab. Outgoing screen doesn't co-animate
  (would require double-rendering during transition + brings
  keyboard / scroll-position complications); incoming-only slide
  delivers ~80% of the perceived improvement at much lower risk.
- **v0.6.0** — Calendar view in Community + optional News date.
  New `<Calendar>` component (`src/components/Calendar.jsx`):
  standard 7-col month grid with prev/next nav + "Today" shortcut,
  dots on days with events, today gets a brass ring, selected day
  gets a filled green cell. Tap a day → events for that day render
  underneath; selecting an empty day falls back to "Next Up" so the
  panel never looks broken on sparse months.
  `useEvents` hook now exposes the raw `event_date` so the calendar
  can bucket events by ISO day. The category-filter tabs were
  removed — calendar's per-day filter is more useful than
  filter-by-type for the kind of small clubs we serve.
  News admin: `date_label` field changed from required text
  ("Today, May 14, …") to an optional date picker. Empty = no date
  on the card. Old free-text values stay rendered as-is via the new
  `formatNewsDate()` helper in `useClubData.jsx` — backward-compat
  guaranteed.

## v0.5.x — Phase 5: member-to-member replies + DM affordances

Reusable threaded-reply system on every member-generated content
surface, paired with DM buttons when DMs are enabled. The point is
that no post is a dead end anymore.

- **v0.5.7** — Realtime audit + close out the "refresh mechanism"
  task. Decided against pull-to-refresh in favor of just making
  every member-facing screen realtime — same end state (fresh data
  without member action), no extra gesture to teach.
  Audit of hooks:
    · **Already realtime**: useClubStatus (3 subs), usePaceOfPlay,
      useNews, useEvents, useMenu, usePinPlacements, useProShopItems,
      useInbox / useInboxUnread, Thread message stream, MemberDirectory
      (inline in component), lesson_pros (inline in LessonRequest),
      post_replies (inline in Replies component)
    · **Added realtime in this commit**: useBulletinPosts,
      usePartnerPosts (tables already in the supabase_realtime
      publication, just hadn't been subscribed)
    · **Skipped on purpose**: useOnboarding (club_content rarely
      changes; not in realtime publication), useWeather (external
      API), useNow / useDusk (local clock/computed)
  Pull-to-refresh component intentionally not built — would be
  cruft now that every meaningful screen reflects DB changes live.
- **v0.5.6** — Removed Member Directory tile from MyClub. Directory
  lives in Community only now. Two paths to the same destination
  was muddier than helpful: Community is "find/talk to other
  members," MyClub is "things about me." Member directory belongs
  squarely in the first bucket.
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
