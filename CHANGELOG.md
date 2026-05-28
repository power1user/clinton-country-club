# Changelog

All notable changes to this project. Convention:
- **MAJOR** (X.0.0) — sweeping rewrites / breaking model changes
- **MINOR** (0.X.0) — phase rollouts (Phase 1 → 0.1.x, Phase 4 → 0.4.x)
- **PATCH** (0.0.X) — every shipping commit gets a bump + a one-line entry
  below so support conversations can pinpoint the exact build a club
  is running. Manual migration steps called out where applicable.

---

## v0.9.x — Phase 9: Communications triage center + admin reorg

A new top-level Communications area unifies all inbound activity
(food orders, lesson requests, pro shop inquiries, guest
registrations, clubhouse messages, event RSVPs) into role-scoped
sub-queues with realtime + unread badges. Configuration-side reorg
moves Club Status setup into Club Settings (renamed from Club
Setup) and adds Member Guide CRUD there. Partner Board redesigned
with a stripped-down card, handicap field, and a Contact button
that finally works.

Shipping plan (multi-commit minor per Marc's preference):
v0.9.0 rename → 0.9.1 Member Guide CRUD → 0.9.2 Club Status move
→ 0.9.3 Partner Board redesign → 0.9.4 Communications scaffold →
0.9.5–6 sub-queues → 0.9.7 cleanup + README refresh.

---

## v0.10.x — Phase 10: Club Champion Recognition (badges)

Shield-shaped badges become a first-class feature. Managers can
create a club-specific catalog of honors (Club Champion,
Member-Guest, Hole In One, milestone memberships, whatever the
club wants to recognize) and award them to specific members.
Recipients see their badges everywhere — membership card,
directory listing — and v0.10.1 adds a dedicated Trophy Case
screen on the Community tab that feels like a digital clubhouse
wall.

Shipping plan (multi-commit minor):
v0.9.21 preview → v0.9.22 admin CRUD → v0.9.23 member assignment
→ **v0.10.0** member-facing surfaces + Phase 10 wrap → v0.10.1
Trophy Case → v0.10.2 sponsor placement + add-on gating → v0.10.3
My Events RSVP history.

- **v0.10.2** — Phase 10: Sponsor banner placement + add-on gating.

  **Two new banner placements:**
  · **Home news feed** — sponsor banner injects after the 2nd news
    post (or the last post if fewer than 2). Layout collapses
    cleanly when no banner is active. `location='home_feed'`.
  · **Golf tab bottom** — sponsor banner renders below the feature
    grid, above the page padding. `location='golf_tab'`.

  **Add-on gating** (per Marc's "different cost" spec):
  · New `clubs.addons` jsonb column (migration 57) tracks which
    paid add-ons each club has purchased. `{sponsor_banners: true}`
    when enabled.
  · New `flag.addon: true` property in the features catalog marks
    a flag as a paid extra. `featureState()` returns
    `reason: 'addon-not-enabled'` and forces the value to false
    when the addon isn't purchased.
  · Manager Features panel: addon row shows a gold "ADD-ON" pill
    next to the label, an italic "Contact The Grounds to enable"
    blurb, and a disabled toggle when the addon isn't purchased.
    When purchased, the row works like a normal feature flag.
  · Platform Features panel (super_admin): adds an inline
    "★ Enable add-on for this club" / "✕ Disable add-on" link
    below the description. Toggles `clubs.addons.<key>`.
  · Standard `feature_flags_locked` lock affordance still applies
    *after* the addon is enabled — super_admin can pin the value
    once they've purchased.

  **Component:** New reusable `SponsorBanner` (`src/components/
  SponsorBanner.jsx`) — takes a `location` prop, internally loads
  the active banner via realtime, opens the click-through URL in
  an external tab with `noopener,noreferrer`. "Sponsored" pill in
  the top-right of every render. Returns null when there's no
  active banner — no empty placeholder, no layout gap.

  **Admin:** `SponsorBannersAdmin` now offers `home_feed` and
  `golf_tab` as the first two location options (the existing
  generic ones — `home`, `news`, `menu`, `events`, `bulletin` —
  kept available for forward-compat). `active_from` / `active_to`
  windowing applied client-side so scheduled banners go live
  exactly when the window opens without a refresh.

- **v0.10.1** — Phase 10: Trophy Case lands on the Community tab.

  New member-facing screen at `community/trophy-case`, accessible
  via a new card on the Community hub. Two sections stacked:

  · **Club Honors** — deep-green felt-board panel, cream/gold
    typography. Every badge in the club library grouped by category
    (Championships → Recognition → Membership). Empty categories
    skipped. Each shield shows name, year, holder count.

  · **My Badges** — the current member's own awards on a lighter
    background. Empty state for members who don't have any yet:
    *"No badges yet — get out on the course."*

  Tapping any shield opens a bottom-sheet detail with the large
  badge, name/category/year header, and the full holder list with
  avatars + names + award dates. If the viewer holds this badge
  themselves, a green callout shows their own award date front-
  and-center.

  **Custom name:** new `clubs.trophy_case_name` column (migration
  56). Manager edits it from Club Settings → Brand Identity. Empty
  → renders as "Trophy Case" everywhere it appears (Community card,
  screen header, breadcrumbs).

  **Feature flag:** `trophy_case` (Community category, basic tier,
  default on). Manager can disable from Club Features; super_admin
  can pin via the standard `feature_flags_locked` mechanism.

  Realtime on both badges + member_badges so freshly-created
  badges and awards appear in the case within seconds.

- **v0.10.0** — Phase 10: badges surface on member-facing screens.

  Member-facing surfaces light up across the app:

  · **Membership Card** — mini row (28px shields) below the
    member's name on their digital card. Max 5 visible; the rest
    roll into a "+N" overflow pill. The card grows from 218px →
    258px only when at least one badge is held, so members with
    no badges yet see no layout change.

  · **Member Directory** — mini badge strip below name/tier on
    each directory row. Capped at 4 visible plus a "+N" overflow
    chip (rows are tight; Message button stays in view). One
    `member_badges` query covers the whole directory, mapped by
    `member_id` so per-row lookup is O(1).

  Both surfaces subscribe to `member_badges` realtime, so a badge
  awarded by an admin appears within seconds without the member
  refreshing.

  README refreshed (minor-bump cadence). Phase 10 entry added to
  the phase history in `version.js`.

- **v0.9.23** — Phase 10: Badge assignment from member detail.

  Every member row in Admin → People → Directory now has a Badges
  section in the expanded detail panel. Shows the member's current
  badges as small shields (with a remove × on each) and an
  "+ Assign badge" button that opens an inline picker of the
  club's library minus what they already hold.

  Tap a badge in the picker → INSERT into member_badges with
  awarded_by set to the current admin's member.id (NULL for super
  admins who don't have a member row in the assigning club).
  Realtime channels on both badges + member_badges keep the row
  live so awards/removals show up across every staff session
  instantly. Inline confirm on removal so a misclick doesn't nuke
  someone's Club Champion title.

  Member-facing surfaces (membership card mini-row, directory
  thumbnails, profile grid) land in the v0.10.0 wrap.

- **v0.9.22** — Phase 10: Badges admin CRUD lands.

  Migration 55 (badges + member_badges tables) applied earlier;
  this patch wires up the admin UI. Admin → People → Badges now
  has the full library: Quick add row with six pre-defined
  templates (Club Champion / Member-Guest / Hole In One / Senior
  Champion / Most Improved / 25-Year Member), an Add Custom Badge
  flow, and an inline form with live large-shield preview.

  Form fields:
    · Name (free text)
    · Category (Championship / Recognition / Membership)
    · Year (optional integer)
    · Color (eight club-themed swatches + native picker)
    · Icon (curated 24-icon Lucide grid: Trophy, Award, Medal,
      Crown, Star, Flag, Target, Compass, Sun, TreePine, Mountain,
      Users, Heart, Coffee, Wine, Gem, plus 8 more)

  Existing badges render as a list with mini-shield previews, name,
  category, holder count, and Edit + Delete buttons. Delete confirm
  surfaces the holder count so the manager knows the blast radius;
  the FK cascade removes member_badges rows automatically.

  Realtime subscription on badges + member_badges keeps the library
  + holder counts live for every staff session.

  Member assignment (writing to member_badges from each member's
  detail panel) and the member-facing surfaces (membership card,
  directory, profile) land in v0.9.23 + the v0.10.0 wrap.

- **v0.9.21** — Phase 10 preview: shield-shaped badge visual in
  Admin → People → Badges. Visual review only ahead of the actual
  v0.10.0 schema landing.

  Adds the reusable `Badge` component (`src/components/Badge.jsx`) —
  pointed-bottom heraldic shield SVG with a manager-chosen color
  fill, white Lucide icon centered in the upper mass, and three
  size variants (mini 28px / small 64px / large 96px). Single
  source of truth so every badge surface renders identically once
  we layer on the directory, profile, Trophy Case, and membership
  card surfaces in v0.10.0–.1.

  New **Badges** section under the People area renders six sample
  badges across all three sizes so Marc can react to the shape,
  color depth, and typography before the CRUD lands. No DB tables
  yet, no member-facing surfaces, no writes anywhere — pure visual
  preview. Once the shape is approved the section body flips to
  the real badge library (CREATE/EDIT/DELETE against the badges
  table) + member assignment hookup. `lucide-react@1.x` added as
  a dependency.

  Carrying the preview as a v0.9.x patch (rather than calling it
  v0.10.0 already) so the v0.10.0 footer accurately marks the
  schema + CRUD landing, not the visual.

- **v0.9.20** — People area: action-verb sub-card names for clarity.

  The v0.9.18 names conflated browse with manage and left "Guest
  Management" misleading after the guest list moved into the new
  Directory card. Marc flagged the ambiguity. Renamed every sub-
  card to a verb-led label that signals its purpose at a glance.

  Old → New:
    · **People** → **Directory** ("Find anyone: members, guests, staff")
    · **Member Roster** → **Manage Members** ("Add, edit, import roster + magic-link invites")
    · Moderate Posts (unchanged)
    · **Guest Management** → **Guest Settings & QR** ("Access rules, expiration, clubhouse QR code")
    · **Staff** → **Manage Staff** ("Roles + permissions (admin / manager / super)")

  Also updated the inline cross-references in PeopleAdmin's
  detail panels and GuestRegistrationsFeed copy so they all
  point at the new names. Area description tweaked from
  "Unified directory: members, guests, staff" to the broader
  "Directory + member ops + guest settings + staff roles" so
  the area card itself signals what's inside.

  No functional change. Pure label clarity.

- **v0.9.19** — Fix PeopleAdmin black screen (missing useMemo import).

  Exact repeat of the v0.9.13 EventsAdmin bug. PeopleAdmin uses
  `useMemo` four times (rolesByUser, people, visible, counts) but
  AdminPanel.jsx's React import was `useState, useEffect, useRef`
  only. ReferenceError on first render → React unmounts the
  AdminPanel tree → black screen the moment a staff member taps
  the new People card.

  One-line fix: add `useMemo` to the import.

  Lesson re-applied: preview-test every new admin surface in
  Chrome before declaring a ship done. The local build catches
  syntax errors but not undefined runtime identifiers.

- **v0.9.18** — Unified People view + orphan-signup fix.

  Real-world bug: Marc reported a guest (Brian Jones, Clinton)
  signed up but didn't appear in any admin section. Forensics:
    · `auth.users` had Brian (May 25 15:17 UTC, email_verified=false,
      never clicked the magic link)
    · `guests` table had zero rows for him
    · So guest-register either failed mid-flow OR the row was
      deleted later; either way he was invisible to staff

  The architectural fix has three parts:

  **Migration 54:**
    · Widened `guests.status` CHECK constraint to allow a new value
      `pending_authentication` — used while a guest has submitted the
      form but hasn't verified their email yet.
    · New `fn_guest_email_verified()` trigger function on
      `auth.users` UPDATE OF email_confirmed_at: when a guest
      verifies their email, flip any matching guests row from
      `pending_authentication` to `active` or `pending` (per the
      club's `guest_auto_approve` setting) AND link
      `guests.user_id = auth.users.id`.
    · Backfilled Brian Jones with a `guests` row at status
      `pending_authentication` so he shows up in the new People
      list. Staff can now see him and decide what to do.

  **guest-register v10:**
    · Inserts the `guests` row FIRST with status
      `pending_authentication` — order matters, so a partial
      failure can never leave an orphan auth user.
    · Then logs the visit attempt.
    · Then calls `auth.signInWithOtp` server-side (was previously
      called by the client). Returns `ok: true, otp_sent: bool`
      regardless of OTP outcome — the guests row exists either
      way, so staff can follow up if the email send fails.

  **GuestRegister.jsx:**
    · Removed the redundant client-side `signInWithOtp` call.
      Function handles OTP now.
    · New softer error path when `otp_sent === false`: confirm
      registration is recorded + tell the user the club will reach
      out. They're not stuck.

  **New `PeopleAdmin` section** (People area, first card):
    · One unified list of every member + guest + staff at the
      club. Color-coded role badges:
        - **Member** (green) — primary identity
        - **Guest** (brass) — registered guest
        - **Manager / Admin / Super** (dark green / red) —
          staff role stacks on top of Member badge
    · Status sub-badges for guests: `pending auth` /
      `pending` / `active` / `revoked`. The `pending auth`
      badge is red so orphan signups stand out.
    · Search by name or email.
    · Filter chips: All / Members / Guests / Staff / Pending
      auth. The "Pending auth" chip is hidden when there are
      none — keeps the row uncluttered until there's something
      to deal with.
    · Tap a row → inline detail panel with all relevant fields.
      Member panel points to "Member Roster" section for edits;
      Guest panel points to "Guest Management" for QR codes +
      settings. The unified view is a browse surface, not a
      replacement for the deep editors.
    · Realtime subscriptions on members + guests + user_roles
      so changes anywhere propagate.

  **AREAS reorg** — People area now leads with:
    1. **People** (NEW) — unified browse
    2. **Member Roster** (renamed from "Members") — CSV + invites
    3. Moderate Posts
    4. Guest Management — settings + QR codes
    5. Staff

  Brian Jones now visible in `People → Guests → Pending auth`. If
  he eventually clicks the May-25 magic link, the trigger fires
  and flips him to `active` automatically.

- **v0.9.17** — Architecture doc: switch flowchart to ELK renderer.

  System architecture flowchart was bombing with "Syntax error in
  text" + mermaid bomb-icon. Diagnosis via Chrome automation: not
  actually a syntax error — Mermaid's default dagre layout couldn't
  solve "Could not find a suitable point for the given distance"
  on the dense graph (nested subgraph CLIENT + SUPA + nested EDGE,
  20+ edges crossing subgraph boundaries).

  One-line fix: prepend the init directive
  `%%{init: {'flowchart': {'defaultRenderer': 'elk'}}}%%` to switch
  that one diagram to the ELK layout engine. ELK handles dense
  graphs and nested subgraphs much better than dagre. Verified
  rendering in Chrome before deploy.

  ERD diagram unchanged — it was already rendering cleanly with
  the default renderer.

- **v0.9.16** — Architecture doc moves to Cloudflare Pages.

  v0.9.15's attempt to host `grounds-architecture.html` on Supabase
  Storage + an Edge Function returned `text/plain` to every real
  browser navigation despite the function correctly setting
  `Content-Type: text/html`. Tested empirically via Chrome
  automation: `document.contentType === 'text/plain'` regardless of
  cache-busting, query strings, or any header trick I tried. Curl
  with Chrome's exact UA + Accept headers got `text/html` cleanly,
  but real browser top-level navigations hit a Supabase gateway
  rewrite that downgrades HTML responses platform-wide. This is an
  intentional security policy (prevents stored XSS via uploaded
  HTML executing on supabase.co).

  Fix: move the file to `public/grounds-arch-9a47e3b8.html` so
  Vite includes it in `dist/` and Cloudflare Pages serves it
  natively. Cloudflare honors the `.html` extension as text/html.
  Filename has a random hex suffix so the URL itself is
  unguessable on top of the password gate — two layers.

  Leftovers from v0.9.15 (in Supabase, harmless, can delete via
  Dashboard later):
    · Storage bucket `docs` + RLS policies
    · Edge Function `docs` (v1, ACTIVE, verify_jwt=false)
    · The `grounds-architecture.html` blob in the bucket

  No app behavior change — the architecture doc is a static asset
  bundled with the build; member-facing app is untouched.

- **v0.9.15** — Custom Facility Names (Migration 53 + admin).

  Display names for the five status pills move from being baked
  into `club_status.label` (per-row, scattered) to a normalized
  catalog table `club_facilities`. Managers can rename, reorder,
  toggle off, and add custom facilities (Pickleball, Tennis,
  Locker Room) without code changes. Display name + ordering
  propagate to every facility-name surface live via realtime.

  **Migration 53 (`53_club_facilities`):**
    · New table `club_facilities` with `id, club_id, facility_key,
      display_name, default_name, is_default, active, sort_order,
      created_at, updated_at`. Unique `(club_id, facility_key)`.
    · Index on `(club_id, sort_order)`.
    · `updated_at` trigger.
    · **Seeded existing clubs by mirroring their current
      `club_status` rows** — Clinton's 5 facilities (Restaurant,
      Bar, Banquet Room, Course, Pool) come over exactly as they
      are. Each marked `is_default=true` so they can't be deleted
      (renamable + toggleable yes; deletable no).
    · **Seeded empty clubs** (Oakgrove, Windhaven) with the
      Marc-approved standard starter set: Course, Bar,
      Restaurant, Pool, Banquet Room. All active. All
      is_default=true.
    · `club_status.facility_id` FK added + backfilled by joining
      on `(club_id, category = facility_key)`.
    · Added to `supabase_realtime` publication.
    · RLS: read = club members + staff + active guests; write =
      staff of the club only.

  **`useFacilities()` hook** (`useClubData.jsx`):
    · Returns `{ data, all, byKey, loading }` where `data` is
      active facilities sorted by `sort_order`, `all` includes
      inactive (for admin), and `byKey` is `{ facility_key: row }`
      for label lookups.
    · Realtime sub on `club_facilities` — manager edits push live.

  **`useClubStatus` upgraded** (same file):
    · Joins `club_facilities` via the new `facility_id` FK.
    · Surfaces `label` from `facility.display_name` (fallback to
      legacy `club_status.label` for any unlinked row).
    · Surfaces `active` from facility.
    · Re-sorts result by `facility.sort_order` so manager-driven
      reordering propagates everywhere.
    · Additional realtime sub on `club_facilities` so a rename
      pushes through to every open member session.

  **New admin section `FacilitiesAdmin`** (Club Settings →
  Facilities):
    · List of all facilities with inline-editable display_name
      input (blur saves; clearing reverts to default_name).
    · Active toggle (Toggle.jsx) — flip flips the facility on/off
      for members instantly.
    · ↑↓ reorder buttons (sort_order swap with neighbor;
      atomic two-statement update).
    · Inline tags: "OFF" (red) when inactive, "CUSTOM" (brass)
      for manager-added facilities.
    · Delete button only shown for custom facilities. Defaults
      are renamable + toggle-off-able, never deletable
      (UI + spec contract; not enforced in DB since DELETE RLS
      already requires staff anyway).
    · "+ Add facility" form: name field + Enter to submit. Auto-
      derives `facility_key` via slugify (a→z, 0-9, underscores;
      length-capped 40); collision suffix on name conflict.
    · Permission: gated by `can_edit_course_status` (same gate
      as Daily Status — managing the facility catalog is a
      facility-config decision).
    · Realtime sub keeps the admin list synced when another
      session edits.

  **OFF indicators added to admin surfaces:**
    · `DailyStatusAdmin` per-facility header now shows a red
      "OFF" chip when the underlying facility is inactive.
    · `FacilityHoursAdmin` rows fade (opacity 0.55) + show the
      OFF chip when inactive.
    · `DailyStatusQuickAccess` (admin home banner) filters to
      active-only so the banner mirrors what members see.
    · Member-facing Home status pill row filters
      `pill.active !== false` so inactive facilities disappear
      from the dashboard live.

  **Wired into Club Settings area:**
    · New `facilities` section card sits between Branding &
      Contact and Feature Toggles. Description: "Rename,
      reorder, add/remove facilities."
    · Manager-only.

  **Scope notes:**
    · Communications sub-queues stayed OUT of facility naming
      per Marc's call (Q1) — they're work-kind queues, not
      facilities.
    · `ScheduleOverridesAdmin` facility selector still uses the
      pill data from `useClubStatus`, which now resolves names
      via the new system, so override entries automatically pick
      up renames. No separate refactor needed.

- **v0.9.14** — MyInquiries empty-state CTAs.

  Marc's My Inquiries spec asked for an empty state with "a button
  linking to the lesson booking or pro shop contact form." The
  existing empty state (v0.7.6) had clean copy but no action — it
  was a dead-end on a first visit.

  Added two CTAs side-by-side in the empty state:
    · **Book a lesson →** (green) — links to `myclub/lessons`.
      Only renders when the `lesson_booking` flag is on.
    · **Browse Pro Shop →** (outline) — links to `myclub/proshop`.
      Only renders when the `pro_shop` flag is on.

  If both flags are off the FeatureOff screen catches the route
  earlier so the empty state never renders without at least one
  CTA. No schema or hook changes.

- **v0.9.13** — Fix EventsAdmin black screen.

  Missing import in v0.9.12: the new `EventsAdmin` component used
  `useMemo` to group rows by `recurrence_group_id`, but
  `sections.jsx`'s React import only included `useEffect, useRef,
  useState`. ReferenceError on the module's first render →
  AdminPanel tree unmounted → black screen the moment a staff
  member tapped the Events admin section.

  One-line fix: add `useMemo` to the import.

  Build was clean because the bundler doesn't resolve runtime
  globals at build time. Lesson: also run the area once in the
  preview tab before declaring a ship done.

- **v0.9.12** — Recurring events + time-picker migration.

  Per Marc's spec: managers can create recurring event series with
  weekly / monthly-first / monthly-last / monthly-Nth patterns;
  each occurrence materializes as its own row so RSVPs, replies,
  cancellations, and per-occurrence overrides all "just work."
  Time entry switches from free-form text to start/end time
  pickers so data quality stays clean across long recurring runs.

  **Migration 52** adds three columns to events:
    · `recurrence_group_id uuid` — rows sharing the value belong
      to the same series. NULL = standalone. Indexed (partial
      index on non-NULL).
    · `event_time_start time` — structured start time.
    · `event_time_end time` — structured end (optional).
    · Legacy `event_time text` retained as a display fallback for
      pre-migration rows (no risky backfill across the wild
      variety of strings managers have typed).

  **EventsAdmin rewritten** as a custom component (was generic
  CrudSection). Three new capabilities:

  1. **Time picker.** Two `<input type="time">` controls (Start +
     End optional) replace the old free-text Time field. Validates
     end > start. Format helper renders "7:00pm – 9:30pm" or
     "7:00pm" depending on whether end is set. Old rows show
     whatever text they had (display fallback in formatEventTime).

  2. **Recurrence picker** (only shown on add). Options:
       · Does not repeat
       · Weekly on the same day (auto-anchors to start date's DOW;
         editable)
       · Monthly · first of the month (pick weekday)
       · Monthly · last of the month (pick weekday)
       · Monthly · Nth weekday (pick N + weekday)
     Plus a **Recurs until** date picker capped at today + 1 year.
     **Live occurrence-count preview** below the picker:
     *"Will create 26 occurrences — first Thu Jun 5, last Thu Dec 4."*
     **Dual cap** at min(1 year out, 52 occurrences) prevents
     runaway materialization. On save, `crypto.randomUUID()`
     generates the group_id; rows insert in a single payload.

  3. **Series-aware edit + delete.** When the manager opens an
     event that has a recurrence_group_id, a radio at the top of
     the editor offers:
       · **Just this one occurrence** (default)
       · **This and all future occurrences in the series**
     Edit-future propagates field changes (title, category, time,
     spots, price, description) to all sibling rows where
     event_date > the touched row's event_date. Per-occurrence
     fields (event_date itself + denormalized dow/day_num/
     date_label) are NEVER propagated — they're inherently
     per-occurrence. Delete-future scopes the DELETE the same
     way. Past occurrences in the series stay as historical
     record.

  **Admin Events list grouped by series.** Recurring series
  collapse into a single header row:
  *"🔁 Thursday Cookout · 26 occurrences · Thu Jun 5 → Thu Dec 4"*
  Tap to expand → individual occurrence rows underneath, sorted
  by date. Standalone events render as plain rows below the
  series list. Volume problem solved — a manager with 4 weekly
  series sees 4 headers + their one-offs, not 100+ flat rows.

  **Data shape changes used by display surfaces.** useEvents
  hook now surfaces `time` (formatted from start/end with legacy
  fallback), `timeStart`, `timeEnd`, and `recurrenceGroupId` on
  each event object. Existing consumers (Home Next Event card,
  EventsCalendar lists, EventsUpcoming, EventDetail) keep using
  `ev.time` and get clean formatted output automatically.

  **What's NOT in v1 (deliberately):**
    · Changing the recurrence rule on an existing series. Delete
      + recreate is the v1 workflow. We can add "edit series
      rule" later if it becomes a real friction point.
    · Auto-extension toast ("series ends in 2 weeks — extend?").
      Manager re-opens the last occurrence and uses "this and
      all future" or just creates a new series.

- **v0.9.11** — Events UX: past-filter, Next Event card, paginated upcoming, search.

  Member-facing events surfaces now correctly hide past events from
  every flat list. Calendar tapping past dates still works for
  reviewing what happened (RSVPs, photos, etc. tied to historical
  events stay accessible). No schema changes.

  **Home → "Next Event" card** (was "Today's Events"):
    · Shows the single next upcoming event in a large card with
      date medallion + category chip + relative-date chip
      ("Today" / "Tomorrow" / "Sat May 30") + RSVP target.
    · If a 2nd event lands within 7 days, a small "Also this
      week: <title> · <date>" chip appears below the main card so
      same-week density isn't hidden.
    · Past events never appear — even after midnight on a past
      cookout, Home flips to the next future event.

  **EventsCalendar restructure**:
    · Two distinct sections under the calendar grid now:
        ◇ **Day detail** (only when selected date has events) —
          shows that day's events, past or future. Tapping a past
          date with events still works for history.
        ◇ **Upcoming** (always visible) — next 5 future events,
          excluding anything already shown in the day-detail
          section above to avoid double-rendering today's events.
    · Empty-state copy differentiates "Nothing on <selected
      date>" from "No upcoming events scheduled."
    · New **"See all upcoming events · Search →"** link below
      the Upcoming list — opens the full paginated/searchable
      list (new screen below).

  **New screen `EventsUpcoming`** (`community/upcoming`):
    · All upcoming events (event_date >= today), sorted chrono.
    · **Search box** — live filter by title, category, time,
      relative-date string. Empty matches show "No events match
      <query>." Search resets pagination to page 1.
    · **10 per page** with prev/next pagination + page indicator.
      Hidden when only one page (no chrome when not useful).
    · Same card shape as the Calendar's day list for visual
      consistency.
    · Gated by `events_calendar` flag (same gate as calendar
      screen) — direct nav lands on FeatureOff if disabled.

  **Past-event semantics — no leaks confirmed:**
    · Home: filters event_date >= today
    · EventsCalendar Upcoming section: filters event_date >= today
    · EventsUpcoming screen: filters event_date >= today
    · EventsCalendar Day Detail: NO filter (correct — historical
      events appear when manager taps their past date)
    · Today comparison done with isoToday() in client tz; v0.9.12
      may switch to club tz once the migration lands.

- **v0.9.10** — News archive (expires_at) + new splash tagline.

  **Migration 51** adds `news.expires_at timestamptz NULL`. NULL =
  evergreen (never archives). Otherwise the row only shows on the
  member feed while expires_at > now().

  **Member-facing `useNews`** now filters
  `expires_at IS NULL OR expires_at > now()` via a Supabase `.or()`
  predicate. Archived items disappear from the Home + News feed at
  their archive moment without any manual refresh.

  **NewsAdminFull rewritten** as a custom component (was a generic
  CrudSection) to wire the archive UX Marc specced:
    · `expires_at` date picker with **smart default = 14 days after
      max(today, event-date)** — prefilled when adding, so the
      no-thought case archives sensibly two weeks after the event.
      The default is also re-suggested when the event date is
      changed on a new item (unless the manager has already
      manually touched the archive date — then their pick is sticky).
    · **"Never" button** next to the picker clears expires_at to
      NULL = evergreen for the rare permanent announcement.
    · Inline helper text below the picker reads either "Evergreen —
      stays on the member feed forever." or "Hidden from the member
      feed on <date>." so the manager always knows the consequence
      of the current setting.
    · Admin list shows **all** items with archived rows visually
      faded + an "ARCHIVED" tag inline. Default view hides archived
      to mirror what members see; "Show archived" / "Hide archived"
      toggles flip between modes.
    · Smart parser only treats date_label as a real date when it
      matches the strict ISO YYYY-MM-DD shape (the v0.6.0+ format).
      Legacy free-text labels like "Today" or "May 14" are
      ignored for the smart-default calculation and just don't
      contribute to the baseline.

  **Splash tagline** changed from
  `Country-club apps, white-labeled.` to
  `Your club. Your community. Always on.`
  (Constant in `src/lib/version.js` → rendered by the splash screen
  + any other surface that reads PLATFORM_TAGLINE.)

  No back-compat issues: existing news rows get expires_at = NULL
  → evergreen → visible as they were pre-migration.

- **v0.9.9** — Event signup RLS denial: missing club_id in insert.

  Member tap Register on an event → "new row violates row-level
  security policy for table event_registrations." Diagnostics:
    · `event_registrations_member_insert` policy requires
      `m.club_id = event_registrations.club_id`.
    · `EventDetail.handleRegister()` was passing only
      `{ event_id, member_id }` — `club_id` omitted entirely.
    · So `event_registrations.club_id` was NULL, the predicate
      `m.club_id = NULL` evaluated to NULL (falsy in SQL), and
      the insert was denied.

  Fix: pull `club` from useAuth and include `club_id: club.id`
  in the insert payload. No schema or policy changes.

- **v0.9.8** — Four bug fixes from Marc's v0.9.7 smoke test.

  **1. Member Guide editor — slug hidden, icon picker added.**
    · Slug input + label removed entirely from the editor UI.
      Slug is an internal URL identifier — members never see it,
      and no `/guide/<slug>` deep links exist in the app today.
      Exposing it as a required field was leftover from copying
      the legacy CrudSection pattern. Auto-derived from title on
      save with numeric collision suffix: two "Welcome" pages
      now save cleanly as `welcome` and `welcome-2` instead of
      failing the unique check. Existing rows keep their slug
      on edit (URL stability for any future deep-linking).
    · Icon field gains an emoji **palette picker** (18 club-
      relevant icons: 👋⛳🏌️🏆🌳🍽️🍷☕📅📜🚗🅿️🏊🎾ℹ️📍☎️⚠️).
      Tap to select (selected emoji highlighted in green); tap
      again to clear. Free-text input remains underneath as the
      fallback for anything outside the palette.

  **2. Dessert (and any null-priced item) Add-to-Cart crash —
  fixed.** The old `cartTotal` reducer called
  `i.price.replace('$', '')` directly, which throws TypeError
  the moment `price` is null. `menus.price` is nullable text,
  and Clinton's 7 desserts had `price = NULL`. The TypeError
  propagated up through the React tree → unmounted everything
  → black screen.
    · New `priceToNumber(p)` helper in `useNav.jsx` (exported)
      coerces anything unparseable to 0: null / undefined / '' /
      "Market" / "Half $15 / Full $25" / etc. all become 0
      instead of crashing.
    · Used in both the cart total math AND `CourseOrder`'s
      per-row total. CourseOrder also shows "Ask staff for
      price" instead of an empty space when `item.price` is
      null, so the data issue is visible to staff.
    · The underlying data should still get prices — but the
      app no longer dies when one is missing.

  **3. Admin status pills now auto-update at dawn/dusk.** The
  Home `StatusPill` correctly computed effective state from
  hours + dawn + dusk + current time and ticked every 60s. The
  admin surfaces I shipped in v0.9.2 (`DailyStatusQuickAccess`
  banner + `DailyStatusAdmin` editor) displayed `pill.st` —
  the raw DB state — and never re-rendered on time change. So
  when the course auto-closed at dusk, the admin UI stayed
  "OPEN" all night.
    · Imported `effectiveState`, `useDusk`, `useDawn` from
      useClubData.
    · New `useMinuteTick()` hook (mirrors StatusPill pattern):
      forces a re-render every 60s so time-driven transitions
      land without manual refresh.
    · `DailyStatusQuickAccess`: each pill now shows
      `effectiveState(item, now, sun, tz)` instead of `p.st`.
    · `DailyStatusAdmin`: adds a live "Live: open/limited/
      closed" chip per facility (color-coded), updated every
      minute. The manual override buttons + staff_note still
      operate on the raw `state` column — distinct from the
      computed live state so the morning opener sees both.

  **4. Audit of other time-driven surfaces.** Only the two
  admin surfaces I added in v0.9.2 had this problem. Member-
  facing StatusPill (the surface members see) already had the
  effectiveState + minute-tick pattern from earlier phases. No
  other admin surface displays time-driven state — `hours_note`
  / `opens_at` / `closes_at` summaries are static text from
  the DB so the no-update behavior is correct there.

- **v0.9.7** — Cleanup: remove duplicate queues + README refresh.

  Closes Phase 9. Now that all six Comms sub-queues are polished
  and live in the new Communications area, the legacy entries in
  Dining, Pro Shop, and Events are dead weight — they pointed at
  the same data with the same components. Removed so each queue
  has a single source of truth.

  Sections removed from AREAS:
    · Dining → "Food Orders" (id `foodord`) — canonical home is
      Comms → `inbox_food`
    · Pro Shop → "Lesson Queue" (id `lessons`) — split into
      Comms `inbox_lessons` (kind='lesson') and `inbox_proshop`
      (kind!='lesson')
    · Events → "Event RSVPs" (id `events`) — canonical home is
      Comms → `inbox_rsvps`

  Area descriptions updated accordingly:
    · Dining: "Menu, items, orders" → "Menu + items"
    · Pro Shop: "Catalog + lesson queue" → "Catalog + lesson pros"
    · Events: "Calendar + RSVPs" → "Calendar + cancellations"

  Section router branches for the removed ids cleaned up so the
  Level 3 render stays a simple ladder of live entries (no dead
  `sec === 'foodord' && ...` lines).

  Search continues to work — search results are derived from
  `ALL_SECTIONS = AREAS.flatMap(...)`, so a removed section
  simply stops appearing in search results, which is correct.

  **README.md fully refreshed for v0.9.x** per the every-minor
  cadence we set in v0.8.9. Updates:
    · Current version bumped to v0.9.7
    · Admin hub: 8 areas → **9 areas** in new Phase 9 ordering:
      Communications · Broadcasts · Events · Golf Course ·
      Pro Shop · Dining · People · Club Settings · Platform
    · New "Communications Triage" section in the feature inventory
      documenting the 6 sub-queues, badge mechanics, permission
      gating, and the "Reply via clubhouse" wiring
    · Partner Finder bullet rewritten to reflect the v0.9.3
      redesign (4-essentials card + 3-state Contact button)
    · Daily Status quick-access banner mentioned on admin home
    · Per-area section listings refreshed with current contents
      and notes on what moved where
    · Repo layout: added `src/lib/commsUnread.js` and
      `supabase/functions/send-push/` (tracked v5 source with
      `?diag=1` endpoint)

  Phase 9 ships across v0.9.0 through v0.9.7, eight commits,
  one minor version per Marc's multi-commit preference. Next
  README refresh lands at v1.0.0 or v0.10.0 (whichever phase
  comes next).

- **v0.9.6** — Communications sub-queues 2/2: Guests / Clubhouse / RSVPs.

  Polishes the remaining three Comms sub-queues. After this ship,
  every Comms sub-queue has the operational shape Marc specced;
  v0.9.7 removes the legacy duplicate entries and refreshes README.

  **Guest Registrations** (`inbox_guests`):
    · New lightweight `GuestRegistrationsFeed` component (NOT the
      full GuestManagementAdmin section). Pure read-only feed —
      no settings, no QR controls, no member-edit. Those stay
      with the full section under People → Guest Management.
    · Row: name + visit_type + registration time + referring
      member when applicable.
    · Tap row → inline expand showing email, phone, ZIP, visit
      type, visit date, access level, status, expires_at,
      referring member. Tap again to collapse.
    · Realtime subscription on `guests` table.
    · Flag-off state: same "guest registration is off" panel as
      the main admin section, with pointer to Feature Toggles.

  **Clubhouse Messages** (`inbox_clubhouse`):
    · Reuses the existing `ClubhouseInboxAdmin` component
      unchanged — already groups threads by subject (topic) and
      shows member + preview + time per row. Already matches
      Marc's spec verbatim. Routing now points here as the
      canonical home; the old Broadcasts → Clubhouse Inbox entry
      removed in v0.9.4. (Visible to anyone with
      `can_view_clubhouse_inbox`.)

  **Event RSVPs** (`inbox_rsvps`):
    · `EventRegistrationsAdmin` now accepts `mode` prop:
        - `mode='flat'`    → reverse-chronological timeline of
                              recent registrations + waitlist
                              changes (used by Comms sub-queue).
                              One row per registration with member,
                              event name, time, status, status
                              transitions inline.
        - `mode='grouped'` → back-compat default (grouped by
                              event) used by Events area.
    · Heading copy + empty-state copy switch per mode so each
      surface reads coherently.

  No schema changes. Section IDs preserved.

- **v0.9.5** — Communications sub-queues 1/2: Food / Lessons / Pro Shop.

  Polishes three of the six Comms sub-queues with the operational
  improvements Marc specced.

  **Food Orders** (`inbox_food`):
    · Default-filters to **active** statuses (pending, preparing,
      out_for_delivery). The morning kitchen lead no longer
      scrolls past yesterday's delivered orders.
    · "Show completed (N)" toggle reveals the full 100-row
      window; "Active only" toggle hides them again.
    · Empty state for "all caught up" reads "All caught up — no
      active orders." (vs. "No orders yet." for an empty history).
    · Realtime unchanged; status transitions still push to members.

  **Lesson Requests + Pro Shop Inquiries** (`inbox_lessons`,
  `inbox_proshop`) — same underlying `pro_shop_inquiries` table,
  discriminated by the `kind` column:
    · `LessonRequestsAdmin` now accepts `mode` prop:
        - `mode="lessons"`   → `kind = 'lesson'` only
        - `mode="inquiries"` → `kind != 'lesson'` (general)
        - `mode="all"`       → no filter (back-compat default
                                for the legacy Pro Shop area
                                until v0.9.7 removes it)
    · Heading copy changes per mode so the sub-queue purpose is
      unambiguous.
    · New **"Reply via clubhouse"** button per row — creates a
      clubhouse thread with subject "Lesson Request: <member>"
      or "Pro Shop Inquiry: <member>" and adds both the staff
      user and the requesting member as participants. Navigates
      straight into the thread. Replaces the "open your email
      client and copy-paste" workflow.
    · Defensive: shows an inline error if the requesting member
      has no linked Supabase user (rare; happens for very old
      member rows or CSV imports never claimed by signup).

  No schema changes. Existing `LessonRequestsAdmin` callers (the
  legacy Pro Shop → Lesson Queue entry) get back-compat default
  `mode='all'` — same behavior as before.

- **v0.9.4** — Communications area scaffold (inbound triage).

  New top-level **Communications** area in the admin hub for
  unified inbound triage. Sub-queues: Food Orders · Lesson
  Requests · Pro Shop Inquiries · Guest Registrations · Clubhouse
  Messages · Event RSVPs. Demo Requests deferred until a landing
  page contact form exists. Each sub-queue is permission-gated
  via existing keys so a bartender only sees Food Orders, the pro
  only sees Lesson Requests, etc.

  **Name collision resolution.** The existing "Communications"
  area (News, Push Broadcasts, Sponsor Banners, Hole Sponsors,
  Clubhouse Inbox) was renamed to **Broadcasts** — its remaining
  contents are all outgoing/content surfaces. Clubhouse Inbox
  moved out of Broadcasts into the new Communications area as
  the `inbox_clubhouse` sub-queue (Clubhouse Messages) — single
  source of truth for member→staff messages.

  **Unread-badge infrastructure** (`src/lib/commsUnread.js`):
    · `useCommsUnread(clubId)` — hook returning per-sub-queue
      counts of rows added since the staff member last viewed
      that sub-queue (per-device, localStorage-keyed by club).
    · `markCommsViewed(clubId, sectionId)` — call on entering a
      sub-queue to clear its badge.
    · Realtime subs on food_orders, pro_shop_inquiries, guests,
      event_registrations, threads — counts bump live as items
      land without any refresh.
    · `CardGrid` extended with optional `badgeOf={(id) => N}`
      prop. When > 0, renders a numeric red badge in the card's
      top-right. Aggregate badge on the Communications area card
      = sum of all visible sub-queue counts.

  **Sub-queue routing (scaffold only)** — for v0.9.4 each Comms
  sub-queue redirects to the existing admin component so the area
  is wired end-to-end and badges work today. v0.9.5 + v0.9.6
  polish each sub-queue with the new pattern (group-by-topic for
  Clubhouse Messages, live registration feed for Guests, etc.).

  **Cleanup deferred to v0.9.7.** Food Orders is currently
  reachable from both Dining (legacy) and Communications (new);
  Lesson Requests from both Pro Shop and Comms; etc. The
  duplicate-removal pass lands in v0.9.7 so each sub-queue gets
  validated in its new home before its legacy entry is removed.

- **v0.9.3** — Partner Board redesign + Migration 50.

  Full redesign pass — strips the card to Marc's four essentials
  (who / what / when / spots needed) with handicap as a small
  optional tag. Compose flow now matches the same minimalism.
  Contact button finally never dead-ends: DM → clubhouse fallback
  → plain-text "ask the front desk" for the edge case where
  neither method is available.

  **Migration 50** (`50_partner_posts_game_type_spots`):
    · Adds `game_type text` — replaces free-form `category`.
      Chip-style values (Foursome / Threesome / Single / Practice
      / Cart Share). Kept as text (no enum) so new types are
      UI-only — no migration churn.
    · Adds `spots_needed integer` — the "how many spots" piece
      of the 4-essentials. Nullable = "any" / unspecified.
    · Backfills `game_type` from existing `category` rows.
    · Relaxes `title` and `body` NOT NULL — the new compose
      doesn't collect a title (synthesized for back-compat) and
      body is the optional "short note".
    · `hcp` already existed (integer, nullable) — no change.

  **Card redesign** (`PartnerBoard.jsx`):
    · Row 1: Avatar + name front-and-center; HCP as a small
      brass tag in the top-right when present.
    · Row 2: chips for game type, when, spots-needed. Filled
      tag (red) when post is closed.
    · Row 3: optional italic short note (only renders when
      author wrote one).
    · Row 4: action (Message / Contact via clubhouse / plain
      text) or "Your post · posted X" for own posts.
    · Replies thread stays at the bottom for public coordination.
    · Tighter padding (10/12px instead of 14/16px) and 10px row
      gaps so 10 posts fit in well under one screen of scrolling.

  **Compose redesign** (`NewPartnerSheet`):
    · Game type chip selector (5 options, Foursome default)
    · Date picker
    · Spots needed +/- stepper (1–7, default 1)
    · Optional handicap, prepopulated from `member.hcp` so the
      common case is zero typing
    · Optional 280-char short note
    · Removed: the standalone title field — auto-synthesized on
      save for back-compat with anything that still reads `title`
      (e.g. admin moderation views).

  **Contact button — three states** (`contactMode(p)`):
    · `dm` — DMs enabled at club AND poster has user_id AND
      poster's `allow_dms !== false`. Button label "Message"
      → `get_or_create_dm` RPC.
    · `clubhouse` — otherwise. Button label "Contact via
      clubhouse" → new thread with subject
      `Golf Partner Inquiry: <synthesized title>`.
    · `none` — only reached when `canMemberWrite` is false (e.g.
      pending member with no write access). Hides button entirely
      + shows plain text "To contact, ask the front desk."

  Per-member DM opt-out (members.allow_dms) is now properly
  honored — previously the button would try a DM and the RPC
  would deny.

- **v0.9.2** — Split Club Status: daily ops vs. configuration.

  The old `StatusAdmin` conflated two very different jobs in one
  screen: flipping today's open/closed state (a morning-opener
  action) and configuring the weekly schedule (a once-per-season
  manager decision). Anyone tapping into Club Status had to wade
  past schedule-editing affordances to set a staff note. Split now
  matches Marc's clean separation: configuration → Club Settings,
  daily operation → top level + quick-access from home.

  Changes:
    · `StatusAdmin` renamed `DailyStatusAdmin` — keeps the state
      buttons (open/limited/closed) + staff_note input per pill.
      The "Edit hours" link + WeeklyHoursModal trigger are gone;
      replaced with a read-only weekly summary line + a copy
      pointer to "Club Settings → Facility Hours".
    · New `FacilityHoursAdmin` section in Club Settings — lists
      each facility with its weekly summary; click → opens the
      existing WeeklyHoursModal. Manager-only.
    · `ScheduleOverridesAdmin` (Date Overrides) moved from Golf
      Course → Club Settings. Same component, same id; only the
      parent area changed.
    · Golf Course section relabeled: "Club Status" → "Daily
      Status" + description "Today's open/limited/closed + staff
      note" so the operational intent is unmistakable.
    · New `DailyStatusQuickAccess` banner on the admin home for
      users with can_edit_course_status. Shows current state per
      facility (color-coded pills) + 1-tap into the Daily Status
      form. The morning opener now flips today's status in 2 taps
      from cold-load: home → quick-access banner → form.

  No schema work. No new permission keys (`can_edit_course_status`
  already gates the operational side; manager-only flag covers the
  config side). Section ids `status`, `overrides`, and the new
  `facilityhours` are stable so deep-links survive.

- **v0.9.1** — Member Guide CRUD in Club Settings.

  The Member Guide section existed in admin (Communications area)
  but used the generic CrudSection scaffold, which couldn't deliver
  the inline-icon list, up/down reorder arrows, or slug
  auto-derivation the spec called for. No schema work needed —
  `club_content` already has `id, club_id, slug, title, icon, body,
  sort_order, updated_at`.

  Changes:
    · Moved Member Guide section from Communications → Club
      Settings. Pages are configuration of how the club presents
      itself, not a comms surface. Section id `clubguide`
      unchanged so router keeps working; only the parent area
      changed in the AREAS array.
    · Rewrote `ClubGuideAdmin` as a custom `MemberGuideAdmin`
      component (replaces the CrudSection invocation):
        ◇ List shows emoji icon + title + slug + sort_order at a
          glance. Tap row to edit.
        ◇ Up/down arrows on each row swap sort_order with the
          neighbor — atomic two-statement update. Arrows greyed
          out at the boundaries.
        ◇ Editor: title, slug (auto-derived via slugify(title)
          until manually edited, then locked), icon (emoji free-
          text, 4-char max — `IconCharacter` UX), body (textarea),
          sort_order. Auto-suggests next sort_order on add.
        ◇ Duplicate-slug check before save so the same /key
          doesn't get reused across pages.
        ◇ Delete with name-confirm: `Delete "{title}"? This
          cannot be undone.`
    · Realtime subscription on `club_content` filtered by club_id
      — manager edits appear instantly across sessions.

  Member-facing `OnboardingGuide.jsx` reads the same table, no
  changes there; new pages appear immediately after save.

  `clubguide` permKey reuses `can_post_news` — same role that
  maintains the News surface and other documentation. No new
  permission key was needed.

- **v0.9.0** — Rename pass: Club Setup → Club Settings.

  Prerequisite for the rest of Phase 9 — gets the find-and-replace
  out of the way before downstream chunks add new sections inside
  the renamed area. Three live-code changes:
    · `AdminPanel.jsx` AREAS array: area label `'Club Setup'` →
      `'Club Settings'`. Comments updated to match.
    · `AdminPanel.jsx` AREAS array: inner section label
      `'Club Settings'` → `'Branding & Contact'`. The inner section
      had the same name as the renamed area, which would have
      created a "Club Settings → Club Settings → form" breadcrumb.
      The new label matches the section's description ("Logo,
      colors, contact, gating"). Section id `clubsettings` and
      area id `clubsetup` are unchanged — they're internal-only
      strings used by the section router; preserving them avoids
      churn risk.
    · `sections.jsx` GuestList empty-state CTA: copy updated to
      point at "Admin → Club Settings → Feature Toggles".

  README.md updated for both admin hub area listing (item 7) and
  onboarding runbook (step 5). CHANGELOG history retained verbatim
  — historical entries that mention "Club Setup" describe what
  actually shipped under that name in v0.7.13 – v0.8.11; rewriting
  them would falsify the record.

  Excluded from the rename per spec: unrelated "setup" references
  (subdomain manual setup language in the new-club provisioning
  banner, feature-flag-setup mentions, Supabase setup docs).

## v0.8.x — Phase 8: Guest Management

Fifth user role alongside super_admin, club_manager, club_admin, and
member. Real Supabase Auth accounts (passwordless magic-link signup);
time-limited access (per-club configurable duration or indefinite);
three access modes (data_only / read_only / full_temporary). Two QR
entry paths: member-linked (signed URL with referring_member_id) and
clubhouse (no referring member, for public play / tournaments). New
guests + guest_visits tables (migration 44). RLS audit across every
content table to ensure guests are denied member-only surfaces.

Shipping plan (per Marc's "multi-commit minor" preference): foundation
first, then registration form, then auth + access modes, then member
QR, then clubhouse QR + admin management, then RLS audit + final
scoping pass. Each ship reviewable before the next.

- **v0.8.11** — Push notifications: end-to-end confirmed.

  After v0.8.10 restored the database webhook, the Edge Function
  itself was still crashing on every invocation with 500 WORKER_ERROR.
  Deployed `send-push` v5 with defensive boot diagnostics — VAPID
  setup wrapped in try/catch, results returned as structured JSON
  instead of a worker crash, plus a new `GET ?diag=1` endpoint that
  introspects env state (key lengths, presence flags, subject) so
  configuration errors can be diagnosed in seconds.

  Diagnostic surfaced two configuration issues:
    · `VAPID_PUBLIC_KEY` was named `VITE_VAPID_PUBLIC_KEY` in
      Supabase (copy-pasted from Cloudflare without realizing the
      `VITE_` prefix is a Vite-only convention for exposing vars to
      the client bundle — Deno doesn't need it).
    · `VAPID_SUBJECT` was set to a bare email (`marcabla1@gmail.com`)
      without the required `mailto:` prefix; web-push validates this
      as a URL.

  Fixed both. End-to-end test fired two real pushes:
    · iPhone PWA target: `{"sent":1,"failed":0,"total":1}` ✅
    · Chrome desktop+Android (2 endpoints): `{"sent":1,"failed":1}` —
      one Chrome subscription returned HTTP 410 Gone (stale
      reinstall) and was auto-pruned by the function. Self-healing
      logic works as designed.

  Tracked the `send-push` v5 source in
  `supabase/functions/send-push/index.ts` so the diagnostic version
  isn't only-deployed-not-stored. Updated supabase/README.md to flag
  this as the one exception to the no-checked-in-functions rule.

  Admin broadcast push (`notification_messages` table) is still
  pending — needs a separate Edge Function path since send-push only
  handles the `messages` schema. Deferred to v0.9.x.

- **v0.8.10** — Push notifications: restore the Database Webhook.

  Diagnosis revealed push had been silently broken: zero `send-push`
  invocations in the Edge Function logs despite 13 messages inserted
  in the last week. Root cause: the Supabase Database Webhook that
  fans messages-INSERT into the `send-push` Edge Function did not
  exist in the project. No `supabase_functions` schema, no `pg_net`
  extension, no trigger pointing at the webhook — the wire had been
  disconnected (probably during a database reset somewhere in
  project history). Client subscription path was healthy throughout
  (3 valid rows in `push_subscriptions`: 1 iOS PWA, 2 Chrome).

  **Migration 49** restores the wire as plain SQL so it lives in
  migration history and survives any future resets — no more
  invisible Dashboard state:
    · installs `pg_net` extension
    · creates `public.fn_send_push_on_message()` — SECURITY DEFINER,
      calls `net.http_post` to the Edge Function with the anon JWT
      as Bearer (mimics the payload shape the Dashboard webhook
      would send)
    · creates `trg_send_push_on_message` AFTER INSERT trigger on
      `public.messages`

  Smoke test (`net.http_post` direct to the Edge Function) confirmed
  the wire works, but surfaced a second issue: the Edge Function
  itself returns 500 WORKER_ERROR on first invocation — almost
  certainly because the `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`
  secrets are missing from the Edge Function environment. Cannot
  fix from MCP (secrets are write-only via Dashboard / CLI for
  security). Marc to verify Supabase Dashboard → Edge Functions →
  send-push → Secrets manually.

  Admin broadcast notifications (`notification_messages` table)
  still won't push — that needs a separate Edge Function path
  since send-push currently only handles the `messages` schema.
  Deferred to v0.8.11.

- **v0.8.9** — Maintenance + docs refresh.

  **Migration 48** pins `search_path = public, pg_temp` on
  `fn_guests_set_updated_at`. This was the one trigger function in the
  schema without an explicit search_path (Supabase linter
  `0011_function_search_path_mutable`). All the other helper/trigger
  functions already had it set; this one slipped through Migration 44.
  Belt-and-suspenders against schema-poisoning attacks. No behavior
  change.

  **Stale SQL snapshots deleted.** `supabase/01_schema.sql`,
  `02_rls.sql`, `03_seed.sql` were the original single-tenant Windhaven
  bootstrap from before we had numbered migrations. They've been
  superseded 48 times. Removed. `supabase/README.md` rewritten to
  document the Edge Function inventory and required secrets — schema
  is managed via MCP-applied migrations now.

  **README.md fully refreshed for v0.8.x.** The top-level README was
  still claiming v0.4.0 with a 4-role hierarchy + 7-area admin hub +
  Phase-4-era feature inventory. Rewrote: bumped to v0.8.8, three
  clubs deployed, 5-role hierarchy (added guest), 8-area admin hub
  with current ordering (Communications / Events / Golf Course / Pro
  Shop / Dining / People / Club Setup / Platform), full Phase 5–8
  feature inventory (post_replies system, Settings screen + profile
  photos + display mode + DM opt-out, Club Features Control Panel +
  tier-based flags, full Guest Management section), updated repo
  layout with every current screen/component/hook/lib file, automated
  DNS provisioning notes, guest QR security details, fresh
  troubleshooting table.

  **New cadence rule** (added to README + `version.js`): the README is
  refreshed at every **MINOR** bump (0.X.0). PATCH bumps don't touch
  the README — CHANGELOG remains the source of truth between minor
  releases. Prevents the README from drifting four phases behind
  again.

- **v0.8.8** — Phase 8 gap closeout. The five items the v0.8.5
  spec-coverage audit flagged as partial, all shipped together.

  **Migration 47** adds two `clubs` columns:
    · `clubhouse_qr_visit_type` (enum guest_visit_type, default
      `public_play`) — what visit_type the clubhouse QR records.
      Change to `tournament_guest` for a tournament-only QR,
      `event_guest` for a specific event, etc.
    · `guests_can_order_food` (bool, default false) — per-club
      opt-in to let guests use the food ordering CTAs. Default
      off — most clubs keep food members-only.

  **1. PWA install gate on the registration form.** When
  `clubs.guest_pwa_required` is on AND the page isn't running as
  a standalone PWA, GuestRegister.jsx now renders an install panel
  above the form with a brass border + "Install the {Club} app
  first" headline. iOS Safari gets explicit Share → Add to Home
  Screen instructions; Android Chrome / Edge get the native
  install button via `usePWAInstall().install()`. The submit
  button stays disabled with the label "Install the app to
  continue" until `isStandalone` flips true (which happens after
  the guest installs and reopens at `/guest/<slug>` via the new
  home-screen icon). Browsers that support neither install path
  show a quiet "ask club staff to register you in person" fallback
  rather than a dead end.

  **2. Filter by referring member** in the admin Guest List. New
  dropdown alongside the visit-type + date filters: "All
  referrers" / "No referring member (clubhouse / public)" / one
  entry per member who's actually brought a guest. Options are
  derived from the loaded data so the dropdown stays useful
  (not a 200-item roster). Filter applies to both the visible
  list AND both CSV exports.

  **3. Export Visit History CSV.** New "Export visit history"
  button alongside the existing "Export CSV". Hits
  `guest_visits` directly via Supabase, returns one row per
  visit (joins the guest contact info onto each row), respects
  all current filters (visit_type + date range + referring
  member + name/email search). Output: `<slug>-visits-<date>.csv`
  with columns `guest_name`, `guest_email`, `guest_phone`,
  `guest_zip`, `visit_date`, `visit_type`, `access_level`,
  `check_in_method`, `referring_member`, `visit_recorded_at`.
  Useful for "how many times has guest X been here?" + "how
  many guests has member Y brought this season?" reporting.

  **4. Configurable clubhouse-QR visit_type.** Admin → People →
  Guest Management → Settings gains a "Clubhouse QR visit type"
  dropdown next to the existing settings. Saves immediately on
  change. `guest-register` Edge Function v4 honors
  `club.clubhouse_qr_visit_type` for any registration submitted
  with a valid clubhouse_token — replaces the v0.8.4 hardcoded
  `public_play`. Explicit `body.visit_type` on the request still
  wins (lets a future tournament-specific QR override per-URL).

  **5. Per-club guests-can-order-food opt-in.** Admin → People →
  Guest Management → Settings gains an "Allow guests to order
  food" toggle (defaults off). FoodMenu.jsx's `canOrder`
  computation becomes `!isGuest || club.guests_can_order_food`,
  meaning a club that flips the toggle ON gets the same cart
  pill, View Order CTA, and per-item +/- buttons surfaced to
  guests that members see. Cart state itself was already in
  scope for guests (in-memory in NavProvider) so no other
  wiring needed — just unlocking the UI.

  **What's NOT in this commit:** N/A. All five flagged gaps
  shipped. Spec coverage for Phase 8 is now complete.

- **v0.8.7** — Splash min-duration + install-prompt icons match
  what lands on the home screen.

  **Splash min-duration.** The v0.8.6 branded loading splash was
  swapped in but a hot connection resolves the club row in 100-
  300ms, so the splash flashed too fast to register. Added a
  `SPLASH_MIN_MS = 1500` floor in `App.jsx` Gate: a timer starts on
  mount and the splash stays up until BOTH `loading` is false AND
  the timer has elapsed. Slow connections still wait on the club
  fetch as before — the timer is a floor, not extra latency.

  **InstallCard + InstallEntry icons.** Both the banner variant
  (Login post-signup) and the card variant (MyClub) of `InstallCard`,
  plus the iOS-instructions branch and the Android-prompt branch of
  `InstallEntry` (Settings → App), were rendering a generic phone
  SVG inside a green tile. Swapped all four spots for
  `/grounds-icon.png` at the same dimensions so the in-app install
  prompt previews exactly what will land on the home screen.

  **One thing this doesn't fix:** already-installed PWAs continue
  showing whatever icon was current when the member installed.
  iOS, Android, and Windows all snapshot the manifest icon at
  install time and don't refresh from manifest changes. Members on
  an already-installed PWA have to uninstall + reinstall to see the
  Grounds icon on their home screen. Fresh installs land on the
  new icon directly.

- **v0.8.6** — Platform branding rollout. Replaces the generic
  `icon.svg` / `favicon.svg` placeholders with the real Grounds brand
  assets across every surface where the platform identity should
  appear. Inside club-facing screens (Home, Golf, Community, MyClub
  body, etc.) the club's own logo + colors continue to own the
  visible surface — the white-label promise is unchanged.

  **New files in `public/`** (copied from
  `Course photos and assets/`):
    · `grounds-icon.png` — Logo C, the square app icon (dark green
      tile, white G, hill, flag, sun). Used as the favicon,
      apple-touch-icon, PWA manifest icons, AND push notification
      icon. Source resolution is high enough (1024+ square) that
      one file serves every requested size.
    · `grounds-lockup.png` — Logo B, the full "THE GROUNDS · MEMBER
      EXPERIENCE PLATFORM" lockup. Not used in v0.8.6 itself (the
      splash uses Logo C instead — see below) but staged in
      `public/` for future marketing surfaces and email templates.
    · `grounds-mark.png` — Logo A, the standalone G-mark on
      transparent background. Used in the "Powered by The Grounds"
      footer attribution next to the text.

  **Wired-in surfaces:**

    1. **`index.html`** — `<link rel="icon">` and
       `<link rel="apple-touch-icon">` now point at
       `/grounds-icon.png` (PNG, not SVG). The 180x180 hint on
       apple-touch-icon improves iOS home-screen rendering.

    2. **`public/manifest.webmanifest`** — three `icons` entries
       (192x192, 512x512 any, 512x512 maskable) all sourcing from
       `/grounds-icon.png`. Android PWA install + Chrome Add-To-
       Home-Screen + Microsoft Edge app install all pick this up.

    3. **`public/sw.js`** — push notification `icon` + `badge`
       defaults swapped from `/favicon.svg` to `/grounds-icon.png`.
       Notification senders can still override per-payload via
       `payload.icon` if a club-specific icon is wanted later.

    4. **Loading splash in `App.jsx` Gate** — replaced the text-only
       treatment with the 96x96 Grounds icon (with 18px rounded
       corners + drop shadow) above the wordmark rendered as 32px
       white Playfair "The Grounds", with the brass-toned "Member
       Experience Platform" mini-tagline below in uppercase tracking
       to match the lockup. Keeps the existing `PLATFORM_TAGLINE`
       below as the colloquial pitch and "Loading your club…" as
       the wait state caption.
       Why Logo C standalone instead of the lockup PNG: the
       lockup's wordmark is dark green and would disappear against
       the dark green splash background. Standalone icon + white
       text gives the same brand presence with proper contrast.

    5. **`MyClub`, `GuestRegister`, `GuestThankYou` footers** —
       small (16x16) Grounds mark inline to the left of the
       "Powered by The Grounds" text. Same treatment across all
       three surfaces (one shared pattern, intentionally kept inline
       rather than abstracted into a component since it's three
       very small instances).

  **Where we did NOT add branding** (deliberately):
    · Member-facing screens above the footer — club's brand owns
      the visible content area, per the white-label promise.
    · Per-subdomain manifest customization — out of scope; option
      to ship custom club PWA icons as a Pro-tier add-on is on the
      roadmap for whenever a club asks.
    · Marketing apex page — not built yet.
    · Email templates — Supabase-side, outside this codebase.

  **Migration / cleanup notes:**
    · `public/favicon.svg` and `public/icon.svg` are no longer
      referenced anywhere in the build, but kept in `public/` so
      stale service workers cached on members' devices don't 404
      during the transition window. Safe to delete in a future
      cleanup pass once devices have rotated SWs (give it a month).
    · `PLATFORM_TAGLINE` in `lib/version.js` left at
      "Country-club apps, white-labeled." — this is the colloquial
      pitch line. The logo's formal "Member Experience Platform"
      positioning is rendered as its own splash subtitle.

- **v0.8.5** — RLS finalization + within-screen scoping. Closes out
  Phase 8. The spec's allow/deny matrix is now enforced at both the
  database layer (via RLS) and the UI layer (via per-screen + per-
  section visibility checks).

  **Migration 46 — guest SELECT policies.** Adds 11 new RLS policies,
  one per table on the Phase 8 allow list. Each policy uses the
  `is_active_guest(club_id)` helper introduced in migration 44.
  Permissive policies stack as OR, so this is a pure additive change
  — members + staff retain their existing SELECT via
  `is_member_or_staff_of`; active guests gain SELECT via
  `is_active_guest`. No existing policy mutated.

    Tables granted to guests (RLS-level):
    · `club_status`, `club_status_hours`, `schedule_overrides`
    · `pace_of_play`
    · `holes`, `pin_placements`
    · `menus`, `menu_categories`
    · `news`, `events`, `pro_shop_items`
    · (`lesson_pros` already had `SELECT USING (true)` — public)

    Tables intentionally NOT granted to guests (denied via absence
    of a members row in `is_member_or_staff_of`):
    · `members`, `bulletin_posts`, `partner_posts`, `post_replies`
    · `threads`, `messages`, `thread_participants`
    · `food_orders`, `event_registrations`, `pro_shop_inquiries`
    · `notification_messages`, `notification_reads`
    · admin-only tables (`user_roles`, `club_provision_log`, etc.)

    Defense-in-depth note: even with the UI gating in place, a
    determined guest hitting our REST endpoints directly with their
    JWT would still be RLS-denied on every members-only table.
    Belt-and-suspenders security is the point.

  **Within-screen UI gating** — fills the per-section gaps left
  intentionally for v0.8.5. Uses the `guestCanSee(level, key)` helper
  from `lib/guestAccess.js`:

    `Home.jsx`:
    · News section — hidden from read_only guests (full_temp + members see it).
    · Today's Events section — hidden from read_only guests (same reason).
    · Status pills + weather + pace strip — visible to all guest levels (already was).

    `GolfHub.jsx`:
    · Pin / Course Map / Pace tiles — visible to ALL guest levels (in the read_only allow list per spec).
    · Tee Time tile — hidden from ALL guests (tee booking is members-only regardless of level).
    · Partner Board tile — hidden from ALL guests (member-to-member coordination).
    Each gate AND-combines the existing v0.7.0 feature flag check with the new isGuest+access check.

    `ProShop.jsx`:
    · Screen body visible to full_temporary guests (catalog browse-only).
    · `read_only` guests get a FeatureOff with "isn't available to guests at your access level."
    · "My Inquiries" tile hidden from all guests (no member-side inquiry history to view).

    `LessonRequest.jsx`:
    · Members only — even full_temporary guests are blocked because
      booking submits to `pro_shop_inquiries` which is RLS-locked.
      Browsing the lesson pros LIST is fine (lesson_pros has public
      RLS), but the booking form itself is members-only.

  **Phase 8 is complete.** Six commits, three new Edge Functions
  (`guest-register`, `guest-link`, `guest-qr-token`), three migrations
  (44 = schema, 45 = clubhouse version, 46 = guest SELECT policies),
  five new screens / components (GuestRegister, GuestThankYou,
  MemberGuestQR, GuestManagementAdmin, FeatureOff `body` prop),
  and one helper module (lib/guestAccess.js). Feature flag is OFF
  by default so existing clubs see zero behavior change until a
  manager flips it on in Admin → Club Setup → Features.

- **v0.8.4** — Clubhouse QR + Admin Guest Management. Phase 8 is now
  fully manager-operable: every guest-related control lives in one
  admin section, the clubhouse QR can be regenerated to invalidate
  prior printed copies, and the full guest roster is searchable,
  filterable, and CSV-exportable.

  **Migration 45** — `clubs.clubhouse_qr_version int NOT NULL DEFAULT 1`.
  Single counter. Bump = invalidate. No secret material stored on the
  row; the signature is derived at request time from
  `${club_id}:clubhouse:${version}` via the same HMAC key derivation
  used for member QRs (v0.8.3).

  **`guest-qr-token` v2** — now serves both modes from a single
  endpoint based on `body.mode`:
    · `'member'` (default) — caller must have a members row, signs
      `${club_id}:${member_id}`. Same behavior as v0.8.3.
    · `'clubhouse'` — caller must be club_manager / club_admin (for
      their own club_id) or super_admin (any club_id). Signs
      `${club_id}:clubhouse:${version}`. Returns the URL with
      `token=<sig>` and `via=clubhouse_qr` query params.

  **`guest-register` v3** — adds a `clubhouse_token` body field
  alongside `ref_token`. Validates with constant-time compare against
  the current `clubs.clubhouse_qr_version` — a regenerated QR
  immediately invalidates all prior copies. visit_type defaults to
  `public_play` when only the clubhouse token is present.

  **`GuestRegister.jsx`** — reads `?token=` from the URL and forwards
  as `clubhouse_token` to the Edge Function. URL shape for clubhouse
  QRs: `https://<slug>.groundslive.com/guest/<slug>?token=<sig>&via=clubhouse_qr`.

  **New admin section: `GuestManagementAdmin`** — lives under
  Admin → People → Guest Management. Three cards stacked:
    1. **Settings** — per-club controls, each saving immediately on
       change (no Save button race window): Auto-approve toggle,
       Visit duration days (blank = indefinite), Phone field
       (off/optional/required), Default access level
       (data_only / read_only / full_temporary), Require PWA install.
    2. **Clubhouse QR Code** — 200px QRCodeCanvas (canvas-backed so
       we can export PNG via `canvas.toBlob`), URL displayed below
       for verification, version counter for clarity. Two actions:
       **Download PNG** (saves as `<slug>-clubhouse-guest-qr-vN.png`
       — ready to print on signage) and **Regenerate** (two-step
       confirm flow to prevent accidental invalidation).
    3. **Guests list** — search by name/email, filter by visit_type
       (member / public play / tournament / event) + date range
       (from + to), CSV export of the currently-filtered set with all
       captured fields plus referring member name. Tap a row to
       expand the full detail (email, phone, ZIP, visit_type,
       access_level, status, expiry, registered-at, referring
       member). Realtime subscribed on `guests` so the list stays
       live as registrations come in.

  **People admin area** — gained the "Guest Management" section
  (manager-only, requires can_manage_members). Description on the
  area card updated to "Members, post moderation, staff, guests."
  When the `guest_registration` flag is off, the section still
  renders but shows a friendly "guest registration is off" panel
  with a pointer to Club Setup → Features. Keeps the entry
  discoverable while the feature is dormant.

  **Smoke test path:**
    1. Admin → Club Setup → Feature Toggles → turn ON
       "Guest Registration" (requires standard tier or higher).
    2. Admin → People → Guest Management → scroll to the
       **Clubhouse QR Code** card.
    3. Tap **Download PNG** — file lands in your downloads.
    4. Open the printed QR's URL in an incognito browser → form
       loads → register a test guest → confirm the row appears in
       the **Guests** list within seconds (realtime).
    5. Tap **Regenerate** → confirm → the printed QR (or that
       just-saved PNG) now returns "This clubhouse QR is no longer
       valid" on submit. The new QR works.
    6. Use the search/filter bar + **Export CSV** to dump a sample.

  **Phone-required gotcha worth knowing:** the registration form
  ALWAYS shows a phone input when the club setting is `optional` or
  `required`. When the manager flips from `optional` to `required`
  mid-flight, any guest already on the form needs to refresh
  (the cached form was rendered against the old setting). Acceptable
  edge case — managers shouldn't be flipping mid-day.

- **v0.8.3** — Member-linked guest QR codes. Each member can now show
  a signed, scannable QR that pre-attributes a registering guest to
  them as the host. Two entry points, one shared screen.

  **Signing scheme.** HMAC-SHA256 over `${club_id}:${member_id}`,
  base64url-encoded with no padding. Token format on the wire is
  `<member_id>.<signature>` so the server can split + verify in
  one parse. Key source: `Deno.env.get('GUEST_QR_SIGNING_SECRET')`
  if set, falling back to `SHA-256(SUPABASE_SERVICE_ROLE_KEY +
  ':guest-qr-v1')`. The derivation keeps day-1 zero-config; if you
  ever need to rotate the key without invalidating all existing
  QRs, set `GUEST_QR_SIGNING_SECRET` explicitly and re-mint
  outstanding codes. Domain separator (`:guest-qr-v1`) ensures we
  never reuse the same effective key across different signing
  contexts.

  **`guest-qr-token` Edge Function** (new, `verify_jwt: true`).
  Takes the caller's JWT, looks up their members row, returns
  `{ ok, url, token, hostname, slug, member_id }`. URL shape:
  `https://<slug>.groundslive.com/guest/<slug>?ref=<token>&via=member_qr`
  — the subdomain establishes brand trust in the address bar,
  the path slug makes it work on the apex too. Refuses non-members
  (guests can't invite guests, staff without a member row can't
  either — the latter is a known limitation we can revisit if it
  matters).

  **`guest-register` Edge Function v2** — adds signed-token
  validation via the same key derivation. `ref_token` (signed) is
  the preferred input; `referring_member_id` (raw uuid) still
  accepted as a backward-compat fallback for any QR codes minted
  before the signed scheme rolled out, with a console warning.
  Drop the fallback after rotating every club's outstanding QRs.
  Constant-time signature compare. Verified member must belong to
  the URL's club (defense in depth — the signature already binds
  club_id, but the DB lookup confirms the member is still in the
  club + active before attribution is recorded).

  **`MemberGuestQR.jsx` screen** (new, `/myclub/guest-qr`).
  Calls `guest-qr-token` on mount, renders a 240px high-contrast
  QR (black on white, error correction M), shows "Member's guest
  invite for Club" caption, and offers a "Share link" affordance
  that uses the Web Share API where available and falls back to
  clipboard. The raw URL is visible below the share button for
  manual copy / tap-to-copy. Footer note explains attribution.
  Gated by `guest_registration` flag and rejects guest viewers
  (only members can invite guests).

  **Two entry points to the QR screen:**
    · `MyClub → Membership Card → "Guest QR"` button — sits next
      to the existing "QR Code" toggle. Only shown when the
      guest_registration flag is on.
    · `Settings → Sharing → "Your Guest Check-In QR"` row — full
      tap target with icon, label, and a one-line description.
      Hidden for guests and when the flag is off.

  **`GuestRegister.jsx` updated** — submit now sends `ref_token`
  (signed) when the URL's `?ref=` value contains a dot (the token
  separator). Legacy raw-uuid URLs still send as
  `referring_member_id` for the legacy fallback in the Edge
  Function. Transparent to the guest filling the form.

  **Smoke test path:**
    1. Sign in as a Clinton member (subscription tier must be
       standard or pro; turn on `guest_registration` in
       Admin → Club Setup → Features).
    2. MyClub → Membership Card → tap "Guest QR".
    3. Confirm the QR renders + the URL below it has both the
       slug and `?ref=<uuid>.<signature>`.
    4. Open the URL in an incognito window — the registration
       form loads with "A member of <Club> invited you" copy.
    5. Complete registration → click magic link → confirm the
       admin's `guests.referring_member_id` is set to your id.

- **v0.8.2** — Auth flow, access modes, screen-level gating. The
  magic-link click now actually does something useful — guests get
  linked to their pre-written row and the app branches per access
  level. Phase 8 is now functionally end-to-end for non-data_only
  guests.

  **`guest-link` Edge Function deployed** (`verify_jwt: true`). Takes
  the caller's auth JWT, finds all `guests` rows matching that
  email, and (via service role) sets `user_id = auth.uid()` on any
  with `user_id IS NULL`. Idempotent. Refuses to overwrite a
  user_id that's already pointing at a different auth user
  (defense against an email-rotation hijack). Cross-club aware:
  one auth user can be a guest at multiple clubs and the function
  links all their rows in a single call.

  **`useAuth.hydrateMember()` updated** — when session is live but
  neither members nor guests has a matching user_id row, it now
  calls `guest-link` once, re-queries the guests table, and
  populates the `guest` state. This makes the magic-link click
  flow self-healing: the v0.8.1 row was written with `user_id=NULL`,
  and clicking the link → fresh session → hydrateMember → invokes
  guest-link → re-query → guest is hydrated.

  **`data_only` access mode** lands `GuestThankYou.jsx` — branded
  hero + "Your visit has been recorded" + the club's contact info
  + sign-out + powered-by footer. App.jsx Gate routes here before
  the ScreenRenderer when `isGuest && guestAccessLevel === 'data_only'`.

  **`lib/guestAccess.js`** — central source of truth for the spec's
  allow/deny visibility matrix. `guestCanSee(accessLevel, key)`
  returns true when the given surface is visible to a guest at
  that level. v0.8.5 will use this for the finer-grained
  in-screen section gating (hide news for read_only, show calendar
  only for full_temporary, etc.).

  **`<FeatureOff>` gets a `body` prop** so guest-specific gating
  reads "Members only" instead of the default "your club hasn't
  enabled this." Every guest-side gate below sends a guest-
  appropriate body string.

  **Always-hidden screens now gate on `isGuest`** (placed after all
  hook calls per rules of hooks):
    · BulletinBoard — "The bulletin board is for club members only."
    · PartnerBoard — "Finding playing partners is for club members only."
    · MemberDirectory — "The member directory is only available to club members."
    · Inbox — "Messaging is for club members only."
    · Thread (DMs / clubhouse / orders) — same
    · MessageClubhouse — same + points at the contact info on the guest profile
    · MemberCard — "Membership cards are for club members."

  **BottomNav + swipe-nav filter for guests:**
    · `read_only` guests see Home, Golf, Food, MyClub (no Community —
      bulletin/directory are always-hidden and the calendar is
      full_temporary-only, so the tab has nothing to show).
    · `full_temporary` guests see all of the above + Community.
    · `data_only` guests never reach the nav.
    · Food tab stays for guests because the menu is in the
      read_only-allowed list; cart CTAs hide inside the screen.

  **BellChip hides for guests** — the inbox they don't have access
  to is not surfaced as a clickable icon.

  **MyClub renders a guest view** — replaces the action-tile grid +
  the My Account block with a single status card showing the
  guest's name + welcome + expiry date. Contact the Club + Sign
  out + footer all remain.

  **FoodMenu cart gating** — the floating "View Order" CTA, the
  header cart-count pill, and the per-item +/- buttons all hide
  when isGuest. Menu reads as a view-only catalog. canOrder
  variable in scope makes the gate a one-line check.

  **What's still polish for v0.8.5:**
    · Within-Home gating (news section only for full_temporary; status +
      weather + pace for read_only)
    · Within-GolfHub gating (hide partner_board tile for guests
      [already happens via flag + isGuest check on partner_board
      screen, but tile should also hide]; hide tee time tile too)
    · ProShop / LessonRequest screens gating for guests (full_temp
      sees them browse-only)
    · Community redesign — within-screen sub-sections for guests
    · Settings cleanup for guests (NotificationsToggle is a no-op
      for guests; can hide cleanly)
    · RLS-side enforcement audit across every public.* table

- **v0.8.1** — Public QR landing + registration form. Guests scanning
  any guest QR now land on a branded check-in page, fill in their
  contact info, and get a magic-link access email. No app download
  required to register.

  **URL shape.** Two equivalent forms (both resolve to the same
  screen):
    · `groundslive.com/guest/<club-slug>` (apex)
    · `<club-slug>.groundslive.com/guest/<club-slug>` (club subdomain)

  Query params (set automatically by the QR generator in v0.8.3/4):
    · `?ref=<member_id>` — referring member (member-scanned QR);
      surfaces as the "brought by" column in admin Guest Management.
      v0.8.1 accepts the raw uuid; v0.8.3 layers signed-URL validation.
    · `?via=member_qr` | `?via=clubhouse_qr` — explicit visit-type
      signal; defaults to member_qr when ref is present.

  **Edge Function: `guest-register`** (deployed, `verify_jwt: false`
  because guests aren't yet authenticated). Validates club slug,
  feature flag (tier + lock + override), required fields, and per-club
  phone collection setting (off / optional / required). Computes
  `expires_at` from club's `guest_visit_duration_days` in club tz
  (NULL = indefinite). Upserts the `guests` row on (club_id, email)
  and appends a `guest_visits` history row. Writes via service role
  (no client INSERT policy on either table). Returns `{ ok, guest_id,
  status, access_level, expires_at }`.

  **`GuestRegister.jsx`** — branded landing using `useBrand` for the
  club's logo + name. Form fields: name, email, ZIP, conditional
  phone (per `clubs.guest_phone_collection`), ToU checkbox. iOS-safe
  16px inputs to suppress auto-zoom on focus. Submit calls the Edge
  Function, then `supabase.auth.signInWithOtp(email)` for the magic
  link, then flips to a "Check your email" success state with the
  destination address echoed back.

  **`resolveClubSlug` in `lib/supabase.js`** — added a `/guest/<slug>`
  path check as resolution step #2 (between query-param override and
  subdomain). Lets the guest page work on apex (`groundslive.com`)
  where the subdomain regex would otherwise miss.

  **`App.jsx` Gate** — new `isOnGuestRegistrationRoute()` check that
  short-circuits the auth-gating logic for URLs matching
  `/guest/<slug>`. Evaluated at render time so a stale session on
  the device doesn't block the registration form.

  **Not yet wired** — the magic link, when clicked, lands the new
  auth user at the app root with a fresh session, but the
  "link this auth.uid to the guests row" step isn't there yet. That
  arrives in v0.8.2 along with the access-mode resolution and
  screen-level gating. So today: a guest can register and get the
  email, but clicking the link lands them in the existing Login
  splash because the guests row's `user_id` is still NULL. Not
  exposed to anyone yet (the feature flag is still OFF by default).

- **v0.8.0** — Foundation. Schema, RLS, role helper, feature flag,
  club-level guest config. No UI yet — every commit after this builds
  on this layer.

  **Migration 44** adds:
    · Four enum types: `guest_visit_type` (member_guest / public_play
      / tournament_guest / event_guest), `guest_access_level`
      (data_only / read_only / full_temporary), `guest_check_in_method`
      (member_qr / clubhouse_qr / staff_manual),
      `guest_phone_collection` (off / optional / required).
    · Five columns on `public.clubs`:
        · `guest_visit_duration_days int` (NULL = indefinite,
          default 1 day for existing clubs)
        · `guest_auto_approve bool default true` (when off, new
          registrations are pending and staff must approve)
        · `guest_phone_collection` (defaults off — no phone field
          on the form)
        · `guest_pwa_required bool default false`
        · `guest_default_access_level` (defaults read_only)
    · `public.guests` — id, club_id, user_id (FK auth.users, NULL
      until the magic link is clicked), name, email, phone, zip,
      referring_member_id (FK members ON DELETE SET NULL),
      visit_type, visit_date, access_level, status (active /
      pending / revoked), expires_at (NULL = indefinite),
      terms_accepted_at, created_at, updated_at. UNIQUE on
      (club_id, email). updated_at trigger.
    · `public.guest_visits` — append-only history. id, guest_id,
      club_id, visit_date, visit_type, access_level,
      referring_member_id, check_in_method, created_at. Lets us
      answer "how many times has guest X visited?" and "how many
      guests has member Y brought?".
    · `is_active_guest(p_club_id uuid)` SQL helper — STABLE +
      SECURITY DEFINER. Returns true when auth.uid() is an active,
      non-expired guest of the given club. RLS policies on tables
      guests can read (added in v0.8.5) use this.

  **RLS:**
    · `guests` — super_admin reads all; club staff (manager + admin)
      read + write own-club rows; a guest reads only their own row.
      INSERTs handled by the service role via Edge Function (defense
      in depth — no client INSERT policy).
    · `guest_visits` — super_admin reads all; club staff reads own-
      club; guest reads own visits. INSERTs again service-role only.

  **App-side changes:**
    · `src/lib/features.js` — new `guest_registration` flag
      (Guest System category, standard tier, default OFF).
      Catalog grows to 18 flags.
    · `src/hooks/useAuth.jsx` — `hydrateMember()` now also queries
      `guests` for the current auth user when no members row is
      found. New `guest` state + `isGuest` derived flag (true when
      a non-admin auth user has an active, non-expired guest row).
      `guestAccessLevel` exposes the access mode for consumers.
      Both expose through the AuthCtx so any screen can branch on
      `useAuth().isGuest`.

  **What this does NOT yet do:** No QR codes, no registration page,
  no admin Guest Management UI, no per-screen access scoping. Those
  land in v0.8.1 through v0.8.5. The whole system is also gated
  behind the `guest_registration` feature flag (OFF by default), so
  this commit changes zero observable behavior for any existing club.

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

- **v0.7.13** — Admin hub reorg shipped (recommendations from the
  v0.7.5-era audit, in Marc's approved order).

  **New top-level order.** Communications → Events → Golf Course →
  Pro Shop → Dining → People → Club Setup → Platform. Marketing /
  content-heavy stuff up top, ops in the middle, setup at the
  bottom, super-admin last. Matches daily-touch frequency for the
  average club manager.

  **Course area renamed to "Golf Course."** Less ambiguous when a
  manager searches for "course" (vs "discourse," "of course," etc.)
  in the admin hub search bar. Internal area id stays `course` so
  no routing breakage.

  **Section moves:**
  · **Hole Sponsors** → Course → Communications (consolidates
    sponsorship surfaces alongside Sponsor Banners).
  · **Clubhouse Inbox** → People → Communications (it's a staff↔
    member comms surface; belongs with News + Push Broadcasts).
  · **Moderate Posts** (renamed from "Member Posts") → Communications
    → People (the posts are FROM members; moderation is about
    people management, not staff-generated content).
  · **Club Settings** → People → new "Club Setup" area.

  **New Club Setup area.** Holds Club Settings (branding, contact,
  pending-member gating, tier) + Feature Toggles. Replaces the
  v0.7.0 standalone "Features" area, which had the wasted-click
  problem of being a single-section area. Two-section area now
  presents a real sub-hub. Future home for a read-only
  Subscription summary (slot reserved, commented in code).

  **Section relabels** per audit recommendations:
  · Schedule Overrides → **Date Overrides** ("schedule" was easy to
    confuse with weekly hours)
  · Pace of Play → **Pace** (always referred to as "pace" anyway)
  · Pin Positions → **Daily Pins** (matches how greenskeepers talk
    about it)
  · Holes → **Hole Details** (disambiguates from Hole Sponsors)
  · Notifications → **Push Broadcasts** ("notifications" was
    overloaded — could mean push, in-app alerts, or member prefs)
  · Club Guide → **Member Guide** (matches the member-facing nav
    label exactly)
  · Lesson Requests → **Lesson Queue** (matches how staff process
    them)
  · Member Posts → **Moderate Posts** (action-first label;
    matches the actual moderation verb)

  **Section IDs preserved across the board.** Routing in the flat
  section-content router (`{sec === 'X' && <Component />}`) is
  keyed by id, not parent area — so every existing link, search
  result, and permission check works unchanged. Only the labels
  and parent areas changed.

  **What's the same:** Pro Shop area (no changes), Dining area (no
  changes), Events area (no changes), Platform area (no changes —
  Provision Log added in v0.7.7 stays put).
- **v0.7.12** — Settings About section + ProShop dead-card removal.
  Final cleanup pass from the UI audit batch.

  **Settings → About (NEW).** Five rows at the bottom of Settings:
    · **Terms of Use** — tappable row with a chevron that rotates
      to a downward triangle on expand. Inline reveals the full
      ToU rendered via the existing `termsSections()` from
      `src/lib/terms.js` (the same body shown on first-accept by
      TermsGate). Subline notes "Includes privacy policy · last
      updated YYYY-MM-DD" so a member searching for "privacy"
      lands here without us needing a separate stub.
    · **App version** — `vX.Y.Z` in monospace. Matches the
      version on the MyClub footer; surfacing it in Settings
      means a support call doesn't require navigating to MyClub
      first.
    · **Powered by** — "The Grounds" in Playfair italic + brass,
      consistent with the MyClub footer and the Login splash.
    · **Contact support** — `mailto:` link that prefers
      `club.contact_email` (per-club office address) and falls
      back to `support@thegrounds.app`. Works on every device
      including installed PWAs via the OS mailto handler.

  No "Privacy Policy" as a separate row — privacy is a section
  inside the ToU and the row caption surfaces that so members
  searching for it find the right place. If a club ever asks for
  a separate privacy document, the ToU expander pattern is
  trivially copyable.

  **ProShop "Schedule a Fitting" card removed.** Was a decorative
  card at the bottom of the catalog with a green "Schedule a
  Fitting" button that had no onClick handler — taps did
  nothing. Dead buttons train members to distrust the UI. If a
  club wants to offer fittings they can use the Bulletin Board,
  Push Notifications, or list it as a Lesson Pro service. No
  replacement; the catalog list now ends with whatever the last
  pro shop item is.
- **v0.7.11** — Community tab redesign + Calendar to its own screen.
  Per Marc's feedback during UI-audit review: "the calendar should
  be a selection card (like bulletin board and member directory)…
  calendar dominates a community page — not good. redesign that
  page and the cards too."

  **Calendar moved to its own dedicated screen.** New
  `EventsCalendar.jsx` at `community/calendar`. Holds the calendar
  grid + the day-detail panel — same logic that was in `Events.jsx`
  before, plus the 24px breathing room between the calendar grid
  and the "Sat, May 24" / "Next Up" heading that the audit flagged
  as visually jammed together. Gated by `events_calendar` flag
  (FeatureOff backstop for direct nav when off).

  **Community tab (`Events.jsx`) rewritten as a hub.** Three rich
  selection cards now stack as the entire body:
  · **Bulletin Board** — preview: "X recent posts this week" (or
    "X posts (none this week)" when stale).
  · **Member Directory** — preview: "X active members." Live count
    via a `head: true` query on `members`, realtime subscribed so
    a join/deactivation updates the card.
  · **Events Calendar** — preview: "Today: X events" when there
    are any; else "Next: <title> · Mon DD" pulled from the
    next-future event.

  Each card filters by its own feature flag — a club with bulletin
  off + directory off + calendar on gets exactly one card. Empty
  state copy if all three are disabled, pointing the manager to
  Admin → Features.

  Cards redesigned: 44px green icon medallion, 16px title, 12px
  description, 11px brass italic preview line, right chevron.
  Substantially richer than the previous 140px chunky cards —
  these are now first-class CTAs that tell you what's inside,
  not just navigation labels.

  Header tagline changed from "Events &amp; member channels" to
  "Member channels &amp; the club calendar" — better reflects
  the post-redesign layout where channels (Bulletin / Directory)
  read first, calendar reads last.

  Wiring: new `'community/calendar'` route in App.jsx alongside
  the existing `'community/bulletin'` and `'community/event'`.
  Inbound from the Home screen's v0.7.9 "Today's Events" section
  still points at `community/event` for the individual event;
  members reach the calendar grid via the Community card now.
- **v0.7.10** — MyClub layout cleanup (4 items from the UI audit).

  **1. Duplicate Card button removed.** Identity strip used to have a
  "Card" button on the right that opened the Membership Card — the
  same destination as the "Membership Card" action tile in the grid
  below. Two paths to one screen is muddier than one path; the
  action tile is the canonical entry point. Net: identity strip is
  now name + member-number row only, no trailing CTA.

  **2. Identity strip de-emphasized.** Avatar 44 → 32, name 16 → 14
  (no italic), padding tightened (14px → 8/12), background opacity
  0.18 → 0.10, border radius 6 → 4. The strip is now a reference
  ("you're signed in as X") not a feature card. Lets the action
  tile grid below it own the visual weight as the primary CTAs.

  **3. Orphan tile fixed.** Was a strict 2-column `grid` — when the
  v0.7.0 flag gating left an odd tile count (3 or 5 with flags on),
  the last row had a lone tile floating against the left edge.
  Switched to `flex-wrap` with `flex: 1 1 calc(50% - 5px)`. Even
  counts behave identically; odd counts now stretch the orphan
  tile full-width on the last row (cleaner than a left-floated
  half-width loner).

  **4. Install surfaces coordinated.** Pre-install, both MyClub's
  InstallCard AND Settings' InstallEntry were visible — duplicate
  prompts. Settings now sets `localStorage['pwa.installCoordinated'] = '1'`
  on mount; InstallCard's `card` variant checks the flag and hides
  itself when set. Net flow: a member discovers Install on MyClub
  the first time(s); the moment they visit Settings (where the
  persistent InstallEntry lives), the MyClub card disappears
  forever — no more duplicate ask. Login post-signup banner
  variant is unchanged (it's a one-shot, not persistent).
- **v0.7.9** — Home screen polish (4 items from the UI audit).

  **1. Tagline fallback chain.** Was `{brand.tagline || 'Country Club'}`
  — a literal "Country Club" string read as placeholder for any
  club that hadn't set a tagline. New chain:
  `brand.tagline → club.name → omit the H1 entirely`. The small
  uppercase brand prefix above still renders so the header is
  never blank.

  **2. Profile avatar gets accessibility metadata.** Added
  `role="button"`, `aria-label="Open My Club"`, and a `title`
  attribute on the circular avatar icon in the header. Screen
  readers and keyboard navigation now identify it; desktop users
  get a tooltip on hover. Zero visual change.

  **3. Weather card compacted, no toggle.** Temp 44px → 32px,
  card padding tighter, "Current Conditions" italic caption
  dropped (redundant — the card is obviously weather), UV row
  omitted (it was always null on the free OpenWeather tier, so
  it read as "UV Index — · Moderate"). Forecast strip kept
  visible at slightly smaller tile size — per Marc's direction
  no toggle / no hidden state. Net result: weather block lost
  about 30px of vertical height while keeping every signal it
  ever delivered.

  **4. NEW: Today's Events section above News.** When the club
  has events with `event_date === today`, a new section appears
  between the pace strip and Club News titled "Today's Events".
  Each event renders as a single row with the category chip,
  title, time, and a "Full" indicator if spots is 0. Tap → event
  detail (same target as Community → tap event). Pulls from the
  existing `useEvents()` hook (already realtime via the
  `events:{club_id}` channel) so a same-day add by staff appears
  without a refresh. Section hides entirely when there are no
  today events — never an empty stub.
- **v0.7.8** — GolfHub mock-data cleanup. Three pieces of legacy
  fake data removed or replaced with live wiring. First batch from
  the v0.7.5-era UI audit.

  **1. "Course Conditions Today" block removed.** Was a 5-row table
  hardcoded to: `Open · 6:30am – Dusk`, `Cart path only — Holes 3,
  7 & 14`, `Greens: Firm and fast — stimp 11`, `Fairways: Excellent
  — recent mowing`, `Rough: Moderate — 2½ inches`. None of it
  reflected reality; it looked authoritative. Belongs to a future
  `course_conditions` admin surface (not on the current roadmap);
  better to show nothing than fake course intel.

  **2. "Next Available Tee Times" preview removed.** Three hardcoded
  rows (3:30pm/3:44pm/4:02pm) under the feature grid. v0.7.0 had
  gated them behind `tee_time_booking`, but any club that enabled
  the placeholder flag would see fake times. Removed unconditionally
  until a real tee-time backend lands.

  **3. "Course Open" status row now reads from `useClubStatus`.**
  Was a hardcoded `Course Open` string with a green dot regardless
  of actual course state. Now looks up the canonical Course pill
  (`statusList.find(s => s.id === 'course')`), runs the standard
  `effectiveState()` against current time + dusk + dawn + today's
  hours + any schedule override, and renders the real label (Open
  / Limited / Members / Closed) with the matching dot color. Pace
  strip suffix also live now — was `· On pace` hardcoded, now
  shows the staff-set pace message (e.g. `· Slightly slow on the
  back nine`).

  Net: GolfHub is now an honest surface. If the course is closed,
  it says closed. If pace is slow, it says slow. No more
  hand-written prose pretending to be live data.
- **v0.7.7** — Cloudflare DNS provision logging — deltas on top of
  the v0.4.4 automation. The Edge Function (`provision-club-domain`)
  and the CreateClubModal flow that calls it both already existed
  and worked; this commit adds the durable audit trail super_admin
  asked for.

  Three deltas:

  **1. `club_provision_log` table** (migration 43). Immutable audit
  log; one row per provision attempt (success or failure). Columns:
  `id`, `club_id` (nullable FK ON DELETE SET NULL — supports
  attempts that pre-date their clubs row), `slug`, `attempted_by`
  (FK to auth.users ON DELETE SET NULL), `attempted_at`, `ok`,
  `hostname`, `already_existed`, `status_code`, `error`,
  `cf_response` (jsonb — raw CF API body for debugging). Indexes on
  `attempted_at DESC` and `slug`. RLS: super_admin only SELECT; no
  INSERT/UPDATE/DELETE policy at all, so only the service role
  writes (which is exactly the Edge Function).

  **2. Edge Function v2** — adds a `logAttempt()` helper that uses
  the Supabase service role client to insert a log row on every
  exit path: bad slug, missing CF config, 409 already-existed,
  Cloudflare API error, network exception, success. Logging is
  best-effort — if `SUPABASE_SERVICE_ROLE_KEY` isn't set the
  function continues silently with a console warning rather than
  failing the provision call. The function now also accepts an
  optional `club_id` in the request body so the log row links back
  to the clubs row (CreateClubModal passes the id of the just-
  inserted club).

  **3. `ProvisionLogAdmin`** — new section under Platform area
  (super_admin only). Lists every attempt sorted newest-first,
  shows hostname + outcome badge (OK / EXISTED / FAILED) + HTTP
  status + a one-line error preview. Tap a row to expand: full
  metadata, error text in monospace, raw Cloudflare API response
  as pretty-printed JSON. Filter toggle for "failures only."
  Realtime subscription so a provision happening in another
  super_admin's session appears live.

  Why the Edge Function logs server-side rather than the modal
  logging client-side: the server has the full picture (CF API
  raw response, HTTP status, error reason) and writes via the
  service role so logging always succeeds even when the user's
  JWT has issues. Client-side logs would miss attempts where the
  Edge Function itself throws before responding, and would have
  to duplicate parsing logic.

  Background: v0.4.4 originally shipped this feature end-to-end
  (Edge Function + CreateClubModal UI with stage-based status,
  success/failure messages, manual fallback instructions). What
  was missing was the audit trail — a super_admin had to dig
  through Supabase logs or the Cloudflare dashboard to see what
  the function had attempted. v0.7.7 closes that gap without
  touching the working onboarding flow.
- **v0.7.6** — Pro Shop → My Inquiries. New member-facing read-only
  screen at `/myclub/proshop/inquiries`. Lists every lesson request
  + pro shop inquiry the current member has submitted (queries
  `pro_shop_inquiries` filtered by `member_id` + `club_id`), sorted
  most-recent-first, each row expandable in place to show the full
  detail (pro, preferred date/time, focus areas, notes, submitted
  timestamp, plus a one-line status caption explaining what the
  badge means).

  Entry point: a prominent green tile at the top of the Pro Shop
  screen — first thing you see when you tap into Pro Shop from
  MyClub — labeled "My Inquiries" with the subtitle "Lesson
  requests + pro shop inquiries you've submitted." Tiles sits
  above the catalog because checking on a pending inquiry is a
  more common visit reason than browsing items.

  Status badges and the color palette mirror the admin Lesson
  Queue exactly (pending/brass · contacted/lime · scheduled/open
  green · done/muted · cancelled/red) so a member and a staffer
  looking at the same row see the same colors and read the same
  urgency.

  Realtime: migration 42 adds `pro_shop_inquiries` to the
  `supabase_realtime` publication. The new screen subscribes
  filtered on `member_id=eq.{me}` so when admin staff change
  status (pending → contacted → scheduled → done) the member's
  view updates without a refresh — same UX every other
  member-facing screen has had since v0.5.7. RLS already
  restricts members to their own rows, so the realtime stream
  only delivers each member their own updates.

  Gating: visible when EITHER `pro_shop` OR `lesson_booking`
  flag is on. A member with legacy lesson requests should still
  be able to see them even if a club later turns off
  `lesson_booking`, so we don't AND-gate. Only renders
  FeatureOff when both flags are off.

  No schema beyond the publication add. No new tables. Staff
  continue to manage status from Admin → Pro Shop → Lesson
  Requests exactly as they did before.

  Closes a v0.5.1 pending item — the v0.5.1 changelog entry
  noted "Pro shop inquiry replies are pending a member-side 'My
  Inquiries' view to render against." That view is this. (Replies
  on pro_shop_inquiries — the post_replies hookup — is still
  available to wire if needed; the table CHECK constraint
  already supports `post_table='pro_shop_inquiries'`.)
- **v0.7.5** — Roadmap update: Digital Wallet Integration is
  permanently parked, off the roadmap. Was previously listed as
  "deferred to v0.8.0+ pending Apple Developer + Google Wallet
  credentials" (v0.6.2 commit message), which implied an active
  intent to build. New stance: we won't spend engineering or
  credential-acquisition time on it until an actual country club
  asks for it as a customer-requested feature. When (and if) a
  club asks, it goes on the roadmap with their name attached.
  Changes in this commit are all comments / docs:
    · `MemberCard.jsx` — the existing comment explaining why the
      Add-to-Wallet button isn't there now says PERMANENTLY parked,
      and explicitly forbids re-adding a "Coming soon" stub. Same
      stance as v0.6.2 (no broken-looking placeholder), just
      stronger language because the deferral is no longer a
      timeline; it's a customer-pull decision.
    · `CHANGELOG.md` — v0.7.0 "Not in this commit" section was
      pointing at "Wallet stays parked at v0.8.0+ pending
      Apple/Google credentials." Updated to point here so anyone
      asking "what about Apple Wallet?" lands on the right answer.
  No code behavior change. No new flag in the catalog (the
  feature has no surface; nothing to gate).
- **v0.7.4** — Bulletin / Partner author attribution edge cases —
  audited, documented, one display-string tweak. The behavior the
  spec asked for already held in production; this commit makes the
  contract explicit so future refactors don't accidentally regress
  it.

  DB audit (verified via `information_schema`):
    · `bulletin_posts.member_id` — NULLABLE, FK ON DELETE SET NULL
    · `partner_posts.member_id`  — NULLABLE, FK ON DELETE SET NULL

  Net effect: deleting a member detaches their posts (member_id
  becomes NULL) but the posts themselves survive. Combined with
  PostgREST's embedded-resource LEFT JOIN default (`members(...)`,
  no `!inner`), a post with NULL or stale member_id still comes
  back from the query with `members: null` — it does NOT vanish
  from the feed.

  JS audit (`src/hooks/useClubData.jsx`):
    · `useBulletinPosts` + `usePartnerPosts` already had a
      `r.members?.name || 'Anonymous'` fallback. Bumped the label
      to "Anonymous Member" (spec wording, clearer than the bare
      "Anonymous"). Added a block comment in both hooks
      documenting the orphan contract — FK rules, LEFT JOIN
      assumption, fallback string, the renderer's DM-button
      gating — so the next person to touch the SELECT doesn't
      switch to `members!inner` and lose orphan posts.

  Renderer audit (`BulletinBoard.jsx`, `PartnerBoard.jsx`):
    · Both pass `post.author` into `<Avatar name={...} />` — for
      orphans this becomes "Anonymous Member" and the avatar
      shows an "A" initial circle, same shape as every other
      member. No special-case styling needed.
    · DM affordances gate on `post.authorUserId` (BulletinBoard
      line 176, PartnerBoard line 63 + 183) — when null,
      Bulletin hides the Message button entirely and Partner
      falls back to "Contact via clubhouse." Already correct,
      no change.

  Cases the contract covers, explicitly:
    1. Member deleted via Admin → Members → Remove → posts stay,
       attribution becomes "Anonymous Member"
    2. Member deactivated (status = 'inactive') → still has a
       valid row, name still resolves; no change in display
    3. CSV bulk import where the member row was created without a
       linked auth user → member_id is valid and `members.name`
       resolves normally; just no DM affordance because
       authorUserId is null
    4. SQL/admin-tool insert with null member_id → "Anonymous
       Member"
    5. SQL/admin-tool insert with mismatched member_id (points to
       a row in a different club, or an id that never existed) →
       PostgREST LEFT JOIN returns null, falls to "Anonymous
       Member"

  No data migration needed; no UI redesign needed; just a string
  bump + a comment block to lock the contract in.
- **v0.7.3** — Android (and desktop Chrome / Edge) PWA app-icon badge
  wired to the existing unread count. When an installed PWA member
  has unread thread messages or unread notification broadcasts, the
  launcher icon now shows the same number the in-app bell chip
  shows. Mark a thread or notification read, the badge ticks down.
  Hit zero, badge clears.

  Implementation: a single `useEffect` inside `useInboxUnread` —
  the source of truth for the bell — fires `navigator.setAppBadge(n)`
  on every count change, or `navigator.clearAppBadge()` when count
  hits zero. Feature-detected (`'setAppBadge' in navigator`) so iOS
  Safari, older browsers, and non-PWA contexts no-op silently. The
  `.catch(() => {})` swallows the rejection that fires on installed
  iOS PWAs that have the API but no granted notification permission
  (badge requires a granted push permission on iOS 16.4+).

  Why inline in `useInboxUnread` rather than a separate hook: there
  is exactly one source of truth for the unread count; piggybacking
  the badge sync there means any future change to the count
  automatically updates the badge with zero extra plumbing. No call
  sites change; `BellChip` continues to read the count exactly as
  before.

  Foreground behavior is correct: `setAppBadge` while the app is in
  the foreground still updates the OS-level value, so the badge is
  ready and visible the moment the user backgrounds the app. No
  cleanup needed on unmount — the user navigating between tabs
  should keep the badge; only an unread count of 0 clears it.
- **v0.7.2** — "Opens at dawn" — perfect mirror of "Closes at dusk."
  Some clubs (especially in the Midwest where Clinton lives) genuinely
  open at first light rather than a fixed clock time, and members
  already understood the dusk pattern so dawn is the obvious other
  bookend.

  Schema (migration 41): two new columns, mirroring exactly where
  closes_at_dusk already lives —
    · `club_status_hours.opens_at_dawn boolean not null default false`
    · `schedule_overrides.opens_at_dawn boolean not null default false`
  Defaults preserve current behavior — every existing row stays at
  its saved opens_at clock time until a manager opts in to dawn.

  Hooks (`useClubData.jsx`):
    · Refactored `useDusk` internals into a shared `useSunTimes()`
      with a `_sunCache` keyed by `lat:lng:date` storing
      `{ dawn, dusk }`. Both `useDusk()` (back-compat) and the new
      `useDawn()` read from the same fetch — calling both on one
      screen is a single network hit. `_sunPending` dedupes
      concurrent first-paint fetches across mounting components.
    · `civil_twilight_begin` is preferred for dawn with `sunrise` as
      a fallback — mirrors the dusk pattern of
      `civil_twilight_end` → `sunset`.
    · `withinDailyHours` and `effectiveState` now accept either a
      Date (back-compat, dusk only) OR a `{ dusk, dawn }` object as
      their third arg. When `opens_at_dawn` is true and dawn hasn't
      loaded yet, returns `null` (caller treats as "not enough
      info") — opposite of the dusk fallback because being
      conservative on the open boundary is safer.
    · `pickToday` legacy single-row fallback returns
      `opens_at_dawn: false` for shape consistency.
    · `useClubStatus`'s SELECTs now pull `opens_at_dawn` from both
      `club_status_hours` and `schedule_overrides`, and the per-day
      map (`byDay`) includes it so consumers see it on the pill row.

  Member surface (`StatusPill.jsx`): `formatTodayHours` now renders
  both bookends symmetrically — "Dawn (5:42am) – 9pm",
  "Dawn (5:42am) – Dusk (8:42pm)", "7am – Dusk (8:42pm)", etc.
  Dawn time is formatted in the CLUB's local timezone (not the
  browsing member's) so the displayed minute is meaningful.

  Admin surfaces (`AdminPanel.jsx` + `admin/sections.jsx`):
    · `WeeklyHoursModal` (Status → Edit hours): new "Opens at dawn"
      checkbox alongside "Closes at dusk." When checked, the Opens
      time-input swaps to a styled "Dawn" label (matches the dusk
      treatment), and save() nulls out `opens_at` so we don't
      persist a stale clock-time hidden behind the dawn flag.
    · `summarizeWeek` (the one-line summary shown on the Status
      card) recognizes dawn and includes it in the day signature so
      a dawn-day isn't grouped with a fixed-time day that happens
      to share its close time.
    · `ScheduleOverridesAdmin` (Course → Schedule Overrides): new
      `opens_at_dawn` field appears in the form alongside
      `closes_at_dusk`, in the columns list, and in the row
      summary ("All Facilities · Dawn–Dusk · Frost delay").

  No flag for dawn itself — it's part of the existing schedule
  system, not a per-feature toggle. Pace of Play / Course Map /
  etc. stay independently flag-controlled (v0.7.0).
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
  /partner author attribution edge cases (v0.7.4). Wallet is
  permanently parked as of v0.7.5 — see that entry for the new
  stance (off the roadmap until a real club asks).

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
