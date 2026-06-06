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

---

## v0.10.4–10 — Phase 11: Calendar, News, Menu, Push polish

(Reorganized: Phase 11 stays inside the v0.10.x patch line because
the staged work was all operational-quality polish on top of the
v0.10.0 base — no single shipping commit was big enough on its own
to deserve a MINOR bump. README cadence still says "refresh at
MINOR," but the README also picks up a one-line Phase 11 entry
here so anyone reading the repo isn't lost between releases.)

An operational-quality pass across the surfaces members touch
daily. Better discoverability for the calendar (visible date
overrides, more entry points, category filters), real action
links on news articles (replacing the v0.10.x bug where the
"Related" card looked tappable but did nothing), drag-and-drop
menu reordering, push notifications that actually identify the
sender, and a new `user_preferences` table as a generic
key-value store for member settings.

Shipping plan: v0.10.4 news action links → v0.10.5 calendar
overrides → v0.10.6 calendar entry points → v0.10.7 filter
pills + user_preferences → v0.10.8 menu drag-and-drop →
v0.10.9 push sender identity → **v0.10.10** docs wrap (README
refresh + version.js phase entry) → v0.10.11 course-map empty
state bug fix.

---

## v0.11.x — Phase 12: Responsive Admin

Member app stays mobile-first PWA forever. The ADMIN side gets a
desktop + tablet shell so managers doing real CRUD work in the
office aren't typing into 320px inputs. Same component tree, two
layouts:

· **AdminLayoutMobile** — current 3-level drill-down (area cards
  → section cards → section content). What every admin sees today.
· **AdminLayoutDesktop** — persistent left sidebar + top bar +
  main content area. Tables instead of cards for data-heavy
  sections, side-panel detail pattern, multi-column forms,
  global search across sections.

Shipping plan (12 patches under one minor bump):

  v0.11.0 — useViewport scaffold + minor bump (this commit)
  v0.11.1 — AdminLayoutDesktop shell (sidebar + top bar + content)
  v0.11.2 — Sidebar tree wired (breadcrumbs, active highlighting)
  v0.11.3 — Tables for Members / Orders / RSVPs / Badges
  v0.11.4 — Side-panel detail pattern
  v0.11.5 — Global admin search (Cmd+K)
  v0.11.6 — Multi-column forms + inline table editing
  v0.11.7 — Migration 61: admin_preferences + saved layouts
  v0.11.8 — Workspaces / personas
  v0.11.9 — Keyboard shortcuts
  v0.11.10 — Dark mode toggle (admin-only)
  v0.11.11 — Tablet polish (collapsible sidebar, density)
  v0.11.12 — Phase 12 wrap (README inventory + phase closeout)

---

## v0.12.x — Phase 13: Operational polish across admin surfaces

Phase 13 is the next-wave operational pass once the desktop admin
shell is solid (Phase 12 v2) and the urgent push pipeline is
finally healed (the v0.11.34–37 saga). It tightens five things
managers + members actually touch every day: (1) Food Orders
re-homes from Communications to a new Dining area next to the
menu CRUDs; (2) the Kitchen can reply to the order placer
inline; (3) Event RSVPs get triage-friendly with a collapsed-
by-default accordion grouped by event; (4) notifications can be
dismissed in bulk + via swipe (per-member dismissed state — we
never hard-delete from the DB so audit history stays intact);
(5) event recurrence gains "every N weeks on weekday Y" support
so weekly leagues and biweekly board meetings stop needing
manual per-instance entry.

Shipping plan:
v0.12.0 — Food Orders → Dining + Event RSVPs accordion + generic
         sidebar badge logic (this commit)
v0.12.1 — Kitchen reply on food orders queue
v0.12.2 — Bulk + swipe notification dismissal (per-member state)
v0.12.3 — Event recurrence: interval + weekday support
v0.12.4 — Phase 13 closeout (README refresh + phase index entry)

---

## v0.13.x — Phase 14: Platform Support Inbox

A super_admin-only ticketing surface for club managers and staff
across every club to email `support@groundslive.com` from anywhere
and have it land in three places at once:

  1. The platform team's existing personal inboxes (forwarded by
     Cloudflare Email Routing — keeps on-the-go reply via mobile
     Gmail/AOL working exactly like today)
  2. A persistent in-app inbox under Platform → Support (audit
     trail, threading by Message-ID, status flags, member
     attribution)
  3. Web Push to every super_admin's installed PWA with OS-level
     app-badge sync so the unread count surfaces on the launcher
     icon the way native email apps do

Outbound replies sent from the admin UI go via Resend appearing as
`support@groundslive.com` with correct In-Reply-To / References
headers, so Gmail threads them properly on the recipient's side.

Shipping plan (seven patches under one minor bump):

  v0.13.0 — Inbound pipeline (migration 66 + receive Edge Function +
             Cloudflare Email Worker). Nothing visible in admin yet.
  v0.13.1 — Destination management (migration 67 + 2 Edge Functions
             + admin UI under Platform → Support → Team).
  v0.13.2 — Push fan-out (send-push v9 + DB trigger).
  v0.13.3 — Outbound reply pipeline (send-support-reply + Resend).
  v0.13.4 — Admin UI: Platform → Support → Inbox thread list +
             reply composer.
  v0.13.5 — Bell + OS app-badge + realtime live updates.
  v0.13.6 — Attachments via Supabase Storage + Phase 14 closeout.

- **v0.15.16** — PersonEditModal redesign: identity strip + clickable status/role pills + Notes + photo upload + audit reasons.

  This is the big "re-imagine the edit card" patch Marc asked for. Direction
  C (status + role as clickable pills at top, each opening a sub-modal with
  confirm + reason) plus all four extras (identity strip, photo upload,
  notes field, group-by-frequency).

  **Schema** (migration `v0_15_16_notes_columns_and_reason_param`):
  - `members.notes` + `guests.notes` text columns — staff-only working
    pad for "snowbird, away Dec–Mar" / "wedding guest, Saturday only"
    style notes. RLS unchanged (staff read+write).
  - All five lifecycle RPCs grew an optional `p_reason text DEFAULT NULL`
    parameter: `change_member_status`, `promote_member_to_staff`,
    `demote_staff_to_member`, `demote_member_to_guest`,
    `convert_guest_to_member`. The reason gets folded into the
    `people_audit_log.metadata` jsonb via `jsonb_strip_nulls` so empty
    reasons don't pollute the log. Surfaces in the Activity History
    section already-built in v0.15.9 — the audit trail now captures
    the *why*.

  **PersonEditModal identity strip (top of the card):**
  - 72px avatar — initials fallback + brass camera badge when uploadable.
    Clicking the avatar opens a file picker, resizes/compresses
    client-side (~800px max edge, JPEG q=0.85), uploads to
    `club-assets/{club_id}/members/{user_id}/avatar-{ts}.jpg`, writes
    `photo_url` to members. Manager + member-mode only.
  - Bold name (Playfair, 19px).
  - Sub-line: `#{member_number} · joined {year} · last seen {when}`
    — pulled from the data we already had, just surfaced.
  - **Status pill** (Active green / Pending amber / Inactive grey,
    color-coded). Clickable for managers → opens the status-change
    sub-modal.
  - **Role pill** (Member / Guest / Admin / Manager / Super Admin).
    Clickable for managers → opens the role-change sub-modal.
  - The phone X button moved up next to the name to balance the
    visual weight of the avatar.

  **Status-change sub-modal (`PersonPillModals.StatusChangeModal`):**
  - Lists Active / Pending / Inactive with a one-line consequence each.
  - Radio-style selection, current status disabled and marked.
  - Optional "Reason (audited)" textarea.
  - Explicit "Apply: {status}" Confirm button — the v0.15.10 one-tap
    misfire hazard is gone.

  **Role-change sub-modal (`PersonPillModals.RoleChangeModal`):**
  - Builds the list of legal transitions based on current role × the
    acting user's manager scope:
    - Guest only → Convert to Member
    - Member, non-staff → Promote to Admin / Promote to Manager
      (manager-only) / Demote to Guest
    - Admin → Promote → Manager (mgr-only) / Remove staff role
    - Manager → Demote → Admin (mgr-only) / Remove staff role
  - Each option color-coded by tone (safe/caution/danger) and labeled
    with the consequence in plain English.
  - Same audit-reason field + explicit Confirm.
  - Calls the existing RPCs with the new `p_reason` parameter.
  - "No transitions available" empty state for non-manager viewers.

  **Form restructure** (Direction C's grouping):
  - Identity section: name *, member # *, **tier** (moved up — frequently
    edited), email, phone (new field surfaced).
  - Membership section: member_since.
  - Status dropdown REMOVED — lives in the pill at top.
  - "▸ More details" expander, collapsed by default: handicap, locker,
    cart, parking (rarely edited day-to-day).
  - **Notes (staff-only)**: textarea writing to `members.notes` /
    `guests.notes`.

  **Old Actions section retired** — all those flat tap rows
  (Promote / Demote / Mark Status / Remove Staff) are now reached
  through the identity-strip pills with proper confirms. The
  `actChangeStatus` / `actPromote` / etc. handlers are deliberately
  kept in place for now (dead code, no runtime impact) so a future
  patch can clean them up alongside any remaining references.

  **Mobile + desktop responsive:**
  - All sub-modals use the same bottom-sheet pattern (max-height 92%,
    overflow-y auto) as the parent.
  - Identity strip uses flex-wrap on the pills so they stack neatly
    on narrow phone widths and sit inline on wider.
  - Avatar size + spacing scale via existing CSS rather than
    media-queries — works at both 390px phone-frame and the full
    desktop admin width.

- **v0.15.15** — Two concrete fixes from Marc's first-pass departments feedback.

  **1. Add Staff button inside the Department Detail modal.** Before
  this patch, the only way to assign someone to a department was to
  open *that person's* edit modal and toggle the department chip. From
  the department's perspective, you could only *remove* people who were
  already in. Now there's a **+ Add Staff** button at the top of the
  Assigned list. Clicking opens a picker showing every staff person at
  the club (club_manager + club_admin + super_admins) who isn't already
  in this department, with their role chip. One tap to add. Picker
  dedupes across club-staff and super-admin (super_admins who also
  hold a club role only appear once).

  **2. Phone back-button closes the open modal instead of exiting admin.**
  This was a real bug across the whole admin app. Modals are React
  state, not history-routed, so pressing Back on mobile popped the
  surrounding URL — usually launching the user out of the entire admin
  section. New shared hook \`useModalBackClose(isOpen, onClose)\` in
  \`src/hooks/useModalBackClose.js\`:

  - On open: pushes a marker history entry.
  - On popstate (user pressed back): fires \`onClose\`.
  - On programmatic close (X / save / cancel): pops the marker entry
    so the back stack stays clean.
  - A ref tracks which path triggered the close so we don't over-pop
    on the popstate path.

  Applied to: PersonEditModal, AddPersonPicker, PeopleCsvImportModal,
  AddDepartmentModal, DepartmentDetailModal, the new
  AddStaffToDepartmentModal, and the Preview-routing modal in
  ClubhouseRoutingAdmin. All consistent behavior on mobile now.

- **v0.15.14** — Departments UX polish (per Marc's first-touch feedback on v0.15.13).

  Three usability gaps that surfaced the moment Marc opened v0.15.13:

  **1. Chevron on each department row was a lie.** It looked clickable
  but the row's onClick only opened a rename-only modal — and the
  chevron was outside that click target anyway, so it literally did
  nothing. Marc expected drilling in to see WHO was assigned.

  Fix: rebuilt the click target. Tapping anywhere on the row now opens
  a **Department Detail** bottom-sheet showing:
  - Name with an inline rename pencil
  - Live list of assigned staff (with role chip — Manager / Admin / Super Admin)
  - Per-row "Remove" to detach someone from this department
  - "Delete department" at the bottom (preserves the old delete affordance)

  **2. Slug exposed to users.** v0.15.13 surfaced the slug as a code
  chip on each row and as an editable field on the form. Slugs are
  internal plumbing (the topic-routing map references them), users
  don't need to see them, and the term "slug" itself is confusing.

  Fix: slug field gone from the UI entirely. Auto-generated from name
  on add. On rename, the existing slug stays stable so the topic-routing
  map keeps pointing at the right place — only the display name changes.
  Names must be unique per club (case-insensitive); a duplicate name
  surfaces an inline "There's already a department named X" error. If a
  generated slug ever collides (rare — only when two names slugify the
  same way), the system silently appends \`-2\`, \`-3\`, etc. The DB still
  has the slug column; users never see it.

  **3. Department section sat BELOW destructive Actions.** In v0.15.13's
  PersonEditModal the order was Form → Save → Actions (Promote / Demote /
  Remove Staff Role) → Departments → Delete → Audit. Marc's instinct:
  department assignments happen daily; promote/demote/remove are rare;
  forcing managers to scroll past dangerous controls to reach the common
  case is bad UX, especially early on while staff are still settling in.

  Fix: swapped the render order. New order is Form → Save → **Departments
  → Actions** → Delete → Audit. Pure JSX shuffle. No data or schema
  changes.

  Backend / send-push: untouched. Same v20 routing logic. Pure
  client-side polish.

- **v0.15.13** — Phase 17: department-based clubhouse notification routing.

  Marc's call after the v0.15.12 fix verified push fan-out worked: instead
  of "all staff get every clubhouse ping", let the manager define
  **departments** at the club (Dining, Pro Shop, Course, Front Desk by
  default), assign staff to one or more, and route each clubhouse topic
  to the relevant department(s). Set it up right at the start of the
  multi-tenant scale-out rather than bolting it on later.

  **Schema (migration \`phase17_departments_and_clubhouse_routing\`):**
  - \`club_departments(id, club_id, name, slug, sort_order, ...)\` — per-club
    catalog of named departments.
  - \`user_departments(user_id, club_id, department_id)\` junction —
    many-to-many between staff and departments.
  - \`clubs.clubhouse_topic_routing\` jsonb — \`{ "Topic Name": ["dept-slug", ...] }\`.
  - RLS: staff can read their club's departments + assignments; manager
    can write.
  - **Backfill:** every existing club gets the 4 default departments;
    every existing \`club_manager\` / \`club_admin\` is auto-assigned to all
    of them so day-one routing doesn't drop messages.
  - **Default routing:** Pro Shop → Pro Shop, Restaurant → Dining,
    Tee Times → Pro Shop, Course → Course, General → Front Desk.

  **Admin UI (3 new surfaces):**
  - **People → Departments** (manager-only) — list, add, rename, delete,
    reorder. Each row shows assigned-member count.
  - **PersonEditModal → Departments section** — multi-select chip row,
    visible only for staff. Optimistic toggle, rolls back on error. Empty
    state links to People → Departments if no catalog exists yet.
  - **Club Settings → Clubhouse Topic Routing** — per-topic chip
    multi-select against the department catalog. Includes a "Preview
    routing" button that runs the same recipient resolution send-push
    will do, without sending — shows the would-be push list. (Marc's
    smoke-test affordance.)

  **send-push v20:**
  - Clubhouse branch in \`handleThreadMessage\` rewritten: resolves
    \`routing[subject]\` → dept slugs → \`user_departments\` → user_ids.
    Always unions with thread participants + super_admins. Falls back
    to "all staff at the club" if routing is unset OR resolves to zero
    new users (better noisy than silent).
  - Response JSON now includes \`routing_mode\`:
    - \`"departments"\` — routed via configured dept mapping
    - \`"fallback_all_staff_no_routing"\` — topic not in routing map
    - \`"fallback_all_staff_empty_dept"\` — mapping exists but no staff
      assigned, fell back
  - Title format unchanged from v19: \`{club} · {sender} · {topic}\`.
  - \`?diag=1\` reports \`version: 20\`.

  **Deploy:**
  - Migration applied to project \`exddcpqfdkyxommkslag\` via Supabase MCP.
  - send-push v20 deployed via MCP. Verified live (\`{"version": 20, "vapidOk": true}\`).
  - App ships via the normal git push → Cloudflare Workers auto-deploy.

  **Test plan after deploy** (per Marc's explicit ask — smoke-test every
  topic before declaring this done):
  - Open **Club Settings → Clubhouse Topic Routing** and use "Preview
    routing" on each of the 5 topics. Confirm the recipient list looks
    right for the configured mapping.
  - From a member account, message the clubhouse on each topic. Confirm
    a push arrives on the right person's device — and NOT on people in
    other departments (excluding super_admins, who always get everything).

- **v0.15.12** — Fix Message Clubhouse: silent-send hang + no-push-to-admin.

  Two bugs Marc reported on the member-side **Message Clubhouse** flow.
  Both reproduced in the live DB (test threads from 03:22 UTC showed
  threads + participants created correctly, but only 1 of 4 had any
  follow-up messages — and even the successful one never pushed an
  admin notification).

  **Bug 1: "Tap Send — nothing happens, no error" (Thread.jsx)**

  `send()` had a stuck-state hazard. The guard
  `if (!body || !threadId || !session?.user?.id || sending) return;`
  early-returned silently when `sending` was `true`. There was no
  try/finally around the message insert, so any transient network
  blip on a prior send would leave `sending=true` forever — every
  subsequent tap fired the click handler but bailed at the guard, with
  zero visible feedback. The Send button is a `<div>` (not a
  `<button disabled>`), so it kept accepting taps the whole time.

  Fix:
  - Wrap the insert in `try/finally` so `setSending(false)` is guaranteed
    to run, even if the promise throws or stalls.
  - Surface explicit feedback when the guard blocks: `"Still sending the
    previous message…"` or `"Couldn't send — please reopen the
    conversation."` instead of silent no-op.

  **Bug 2: No push notification to admin when a member messages the clubhouse (send-push v19)**

  This is the canonical **"missing trigger when adding a new push
  surface"** failure from the \`web-push\` skill — clubhouse threads
  had been falling through to the default recipient-resolution branch.

  In v18, \`handleThreadMessage\` for clubhouse threads did:
  1. Load \`thread_participants\` for the thread.
  2. Filter out the sender.
  3. Fan out to whoever's left.

  A new clubhouse thread has exactly ONE participant — the member
  who just created it. The sender-exclusion filter then removes that
  one entry, leaving zero recipients. Edge Function returned
  \`{sent: 0, reason: "no recipients"}\` and no admin ever heard about
  it.

  Fix in send-push v19: clubhouse recipients =
  \`thread_participants ∪ all staff at thread.club_id (club_manager +
  club_admin) ∪ every super_admin (club_id IS NULL)\`, then
  sender-exclude.
  - Staff get pushed on a brand-new clubhouse thread, even though
    they're not yet in \`thread_participants\`.
  - Reverse direction (staff replies → member gets push) still works
    via the participants leg of the union.
  - Sender exclusion still applies as the final filter, so admins
    who are also members of the club don't push themselves.
  - Title format adds the topic for clubhouse pushes:
    \`{club} · {sender} · {topic}\` — so the lock screen distinguishes
    Pro Shop vs Restaurant at a glance.
  - \`?diag=1\` now reports \`version: 19\`.

  **Deploy:** send-push Edge Function redeployed via Supabase MCP
  (project ref \`exddcpqfdkyxommkslag\`). Verified live: \`vapidOk: true\`,
  \`version: 19\`. App changes ride the normal git push → Cloudflare
  Workers auto-deploy.

- **v0.15.11** — Refresh GroundsLive Admin AI manual for the v0.15.6–10 People work.

  The admin AI chat (Claude Haiku 4.5, prompt-cached manual) was still
  routing admins to "Manage Members" — a section that no longer exists.
  Updated \`supabase/functions/admin-ai-chat/manual.ts\` to match reality:

  - **Section 11 (People area)** fully rewritten. The People section is
    now described as the single management surface (no more Directory or
    Manage Members). New deep-dive on the PersonEditModal layout:
    Identity / Membership details sections, dropdown chevron, magic-link
    button states (filled brass for unverified vs outline for verified),
    keyboard shortcuts, the Actions section (with every conditional
    transition listed), and the manager-only Activity history pane.
  - **Section 15 (Common admin tasks)** task recipes updated:
    - "Onboard a new member via magic link" — now uses + Add Person flow
    - "Bulk-import a member roster" — Import CSV button in People
    - "Award a badge" — paths updated (no more Directory/Manage Members)
  - **New task recipes**: Add a guest · Convert a guest to a member ·
    Demote a member to guest · Promote / demote staff · See the audit
    trail for a specific person.

  **Deploy note:** Edge Function changes don't ship with \`git push\`.
  Run \`npx supabase functions deploy admin-ai-chat\` (or use the
  Supabase Dashboard → Functions → admin-ai-chat → Deploy) to push the
  new manual content. Until then, admins asking the AI for help will
  still get the v0.14.x answers about Manage Members. Member AI manual
  needed no changes (it doesn't reference admin surfaces).

- **v0.15.10** — Lifecycle actions moved into the modal; kebab trimmed to the fast lane.

  Marc: *"wouldn't it make more sense to move those actions into the same
  ui as everything else? ... make sure it has everything and the kebab
  for a few of the major things"*. The row kebab was inheriting a list of
  9+ conditional items that really belonged on the person's record, where
  the audit history and form context already live.

  **PersonEditModal — new Actions section** (between the form and the
  audit history). Every applicable transition renders as an iOS-style
  tap row with a chevron:
  - Convert Guest → Member  (when person is a guest and not a member)
  - Demote Member → Guest   (when active/pending member)
  - Mark Member Active / Pending / Inactive  (one-tap status RPC, audited)
  - Promote to Admin / to Manager  (Manager promotion gated to managers)
  - Promote Admin → Manager / Demote Manager → Admin  (manager-only)
  - Remove Staff Role  (danger styling, removes user_role)

  Every button calls the corresponding SECURITY DEFINER RPC, then
  refreshes both the modal's own data (member + guest + audit) and the
  parent list — no unmount/remount, so unsaved form edits stay put.
  After Convert / Demote-to-Guest the modal also auto-switches the
  member↔guest kind toggle so you land on the new primary record.

  **Kebab — trimmed to the fast lane:**
  - Edit Person…
  - Send Magic Link  (the #1 reason an admin opens the kebab)
  - Convert Guest → Member  (when applicable — common during onboarding)
  - Mark Active  (when applicable — common snowbird reactivation)

  Everything else lives in the modal. If you find yourself wanting an
  action that's not in the kebab, you're one tap further away (Edit
  Person → Actions section).

- **v0.15.9** — Per-person audit history inside the People editor (manager-only).

  A new **Activity history** section at the bottom of the PersonEditModal,
  collapsed by default. Click ▸ to expand and see up to the last 50 events
  for this person at this club:

  - Friendly action label (e.g. "Promoted to staff", "Demoted from member
    to guest"), with the raw enum as a fallback so a future action added
    in a migration still renders.
  - Status diff (e.g. \`pending → active\`) when the event has from/to
    statuses.
  - Timestamp (\`Mar 15, 2026, 3:42 PM\`) + the name of who performed it,
    resolved from the unified \`people\` table.
  - "No recorded activity yet." empty state for people created before
    the audit log existed (or who haven't had any lifecycle event).

  **Permission gating:** UI gated on \`isManager\` (which includes
  super_admin and club_manager, **excludes** club_admin per Marc's
  explicit ask). RLS on \`people_audit_log\` may still allow club_admin
  to read — UI-level gate matches the requested visibility scope, not
  a hard security boundary. If you need DB-level enforcement later, we
  tighten the RLS policy.

  Two queries, not an embedded relation: we don't assume PostgREST
  has the FK declared between \`people_audit_log.performed_by_user_id\`
  and \`people.auth_user_id\`. First query fetches the rows, second
  resolves names by \`auth_user_id IN (...)\`.

- **v0.15.8** — Fix mobile dropdown chevron + drop auto-focus.

  Two regressions Marc hit immediately after v0.15.7:

  **1. Mobile dropdowns still looked like text fields.** Root cause was
  an inline-style bug, not a CSS bug. The People editor's \`selectStyle\`
  used \`background: G.card\` (CSS shorthand), which expands to
  \`background-image: none\` and silently wiped the ▲▼ chevron SVG that
  \`index.css\` paints into every \`<select>\`. iOS Safari's empty native
  rendering then made the field indistinguishable from a text input.
  - Fix: switched the inline style to \`backgroundColor: G.card\`.
  - Defense in depth: added \`!important\` to all background-* declarations
    in \`index.css\` so any future inline \`background:\` shorthand can't
    nuke the icon again.

  **2. Auto-focus pulled up the mobile keyboard before the admin
  could read the record.** Removed the v0.15.7 \`firstInputRef.focus()\`
  useEffect. Now you tap into a field deliberately to start typing —
  the expected behavior when you're opening a record to read it first.

- **v0.15.7** — People editor UX polish.

  A grab-bag patch built on Marc's feedback after first contact with the
  v0.15.6 People editor: dropdown affordance wasn't obvious on mobile,
  verified users still got a loud "Send Magic Link" CTA they didn't need,
  and the form lacked the small things that make a long edit form feel
  fast (auto-focus, keyboard shortcuts, dirty-state save gating).

  **Dropdown affordance (global, all screens):**
  - Replaced the right-side chevron-down with a **left-side ▲▼ stacked
    double-caret**. Reason: the right chevron was barely visible on the
    phone-frame width — iOS Safari trimmed it. A stacked up+down caret
    reads as "this is a picker" instantly, and left-side placement also
    sits adjacent to the dropdown's value text for a cleaner read.
  - Affects every \`<select>\` in the app via \`src/index.css\`, so the
    visual signal is consistent across admin and member surfaces.

  **Magic-link button — verified vs unverified:**
  - When \`person.last_seen_at\` is set (= they've signed in at least
    once), the magic-link button switches to **outline style** with the
    label **"Re-send sign-in link"**, plus a subline below:
    \`✓ Verified · last seen Mar 15, 2026\`.
  - Unverified users keep the prominent filled brass CTA — that link is
    their only path into the app, so it should still shout.

  **PersonEditModal UX:**
  - **Auto-focus** the Full name input ~120ms after the bottom-sheet
    slides up. You can start typing without tapping.
  - **Keyboard shortcuts**: ESC closes, Ctrl/⌘+Enter saves. Hint line
    at the bottom of the modal so the shortcuts are discoverable.
  - **Save button is now properly disabled** when the form isn't dirty
    (edit mode) or required fields are empty. Title attribute spells out
    *why* it's disabled when you hover.
  - **Inline per-field validation**: required-but-empty fields now show
    a red "Required." line directly under the offending input, instead
    of a single generic bottom-of-modal error. Errors clear the moment
    you start typing in that field.
  - **Red asterisk** on required-field labels (replaces the inline " *"
    in the label text).
  - **Section grouping** for the member form: "Identity" (name / member #
    / email) and "Membership details" (tier, status, since, hcp, locker,
    cart, parking). Guest form gets "Identity" + "Visit details". Subtle
    horizontal dividers with small caps headers — no extra clicks.

  No schema changes, no Edge Function changes — purely client-side UX.

- **v0.15.6** — Real People consolidation: edit/add/import lives inside the People view.

  v0.15.5 hid the Manage Members sidebar entry and added a button that
  *navigated* you back to it — same UI, just behind one extra click.
  Marc called this out: "you just got rid of all of my edit capabilities
  that were in the member section. you were supposed to cover all of that
  in the people section." Fair. This patch actually consolidates.

  **What's new inside People:**
  - **+ Add Person** button → chooser modal (Member or Guest) → bottom-sheet
    edit form with full field parity. Members get the original 10 fields
    (name, member #, tier, email, member_since, hcp, locker, cart, parking,
    status). Guests get name, email, phone, ZIP, visit_type, access_level,
    status, visit_date, and optional expires_at.
  - **Click any row** → opens the same edit modal pre-loaded with that
    person's record. When someone is both a member AND a guest, a tab
    toggle lets you flip between editing either record without leaving
    the modal.
  - **Import CSV** button → same bulk-import modal (name + membership_number
    required; tier, email, etc. optional). Upserts on club_id +
    membership_number so re-imports update instead of duplicating.
  - **Send Magic Link** button inside the edit modal (in addition to the
    kebab action) — uses canonical \`{slug}.groundslive.com\` redirect.
  - **Delete record** link at the bottom of the edit modal (super_admin
    only — matches the prior gate).
  - Kebab menu gains an explicit **"Edit Person…"** entry so the action is
    discoverable without already knowing the row is clickable.

  **What's gone:**
  - The \`'members'\` admin section (\`Manage Members\` route) is fully
    removed: route entry, sidebar entry (commented out in v0.15.5, deleted
    now), and the routing line in \`SectionContent\`.
  - The retired components in \`AdminPanel.jsx\` — \`MembersAdmin\`,
    \`MemberEditModal\`, \`CsvImportModal\`, \`StatusChip\`, \`parseCsvLine\` —
    are deleted (~325 lines). All capabilities now live inside
    \`screens/admin/AllPeopleAdmin.jsx\`.

  **Path A intact:** No schema changes. Modal writes go to \`members\` /
  \`guests\` tables directly — same RLS, same auto-link-on-sign-in
  behavior. \`people\` table stays managed by triggers; the client never
  writes to it from this flow.

- **v0.15.5** — Member↔Guest symmetry + sidebar consolidation + dropdown styling.

  Three of Marc's complaints from one feedback pass:

  **1. Member → Guest demotion (the symmetry gap):**
  - Migration 79 adds \`demote_member_to_guest(auth_user_id,
    club_id, access_level)\` RPC.
  - Preserves history: marks the existing \`members\` row
    \`status='inactive'\` (never deletes).
  - Creates or reactivates a \`guests\` row at the configured
    access level (default \`read_only\`).
  - Audit log entry: \`member_demoted_to_guest\` (new action added
    to the CHECK constraint).
  - New kebab item: **"Demote Member → Guest"** appears for any
    active/pending member.
  - Existing **"Convert Guest → Member"** label clarified to read
    in the same direction.

  **2. Sidebar consolidation (was 2 People entries):**
  - **Manage Members hidden** from the sidebar. People is now the
    only entry.
  - Existing Manage Members route stays alive; reached via a new
    \`+ Add member / Import CSV\` button at the top of the People
    view.
  - Navigation handled by a new \`admin-nav\` custom event
    listened by both \`AdminLayoutDesktop\` and the mobile
    \`AdminPanel\`. Decoupled from prop drilling — any section
    body can fire \`window.dispatchEvent(new
    CustomEvent('admin-nav', { detail: { area, section } }))\`
    to jump anywhere.

  **3. Dropdown visual distinction:**
  - All \`<select>\` elements globally now have an inline-SVG
    chevron-down icon + 32px right padding so they're visually
    distinct from text inputs.
  - Two color variants: muted brown for member modes
    (light/medium/dark cream), lighter brown for admin
    true-dark mode.

- **v0.15.4** — People consolidation + Send Magic Link action.

  Marc flagged that the People area had THREE overlapping screens
  (Directory, All People, Manage Members) and no obvious place to
  fire a magic-link invite. Consolidated:

  **From 3 surfaces down to 2 with clearer purpose:**
  - **People** (renamed from "All People") — the everyday browse
    + take-action surface for any person at the club. Search,
    filter, kebab menu.
  - **Manage Members** — kept for the heavier CRUD: add a new
    member from scratch, bulk-import a CSV roster, edit individual
    member fields (tier, locker, cart, handicap).
  - **~~Directory~~** — hidden from the sidebar. People (unified)
    is its full replacement. PeopleAdmin component stays linked
    so the route still works if someone has a bookmark; just no
    longer surfaced.

  **"Send Magic Link" action** added as the always-available top
  item in the People kebab menu — separated from the lifecycle
  actions by a divider. Works for any user with an email on file
  (member, guest, staff). Calls \`supabase.auth.signInWithOtp\`
  with \`emailRedirectTo\` set to the canonical
  \`{club.slug}.groundslive.com/\` URL (NOT \`window.location.origin\`
  — fixes a vestigial flaw in the old Manage Members invite
  button that could send people to workers.dev).

  **Better intro copy** on the People screen so admins know
  exactly when to switch to Manage Members ("To add a new member
  from scratch or bulk-import a CSV roster, use Manage Members").

- **v0.15.3** — Phase 16 closeout.

  Phase 16 is complete. 4 patches landed in this session:
  v0.15.0 (foundation) → v0.15.1 (unified view) → v0.15.2
  (lifecycle actions) → v0.15.3 (this closeout). version.js
  phase index updated with the full Phase 16 architectural notes.

  **Phase 16 architecture as built:**

      auth.users (Supabase)        ← universal identity, keyed by email
            │
            ├── people             ← INVARIANT person attributes
            │                        (name, email, phone, address,
            │                         photo, notes). ONE row per
            │                        human. Marc's rule: "different
            │                        identity = different email = a
            │                        different people row"
            │
            ├── members            ← per-club relation w/ per-club
            │                        fields (tier, handicap, locker,
            │                        cart, parking, badges, status)
            │
            ├── guests             ← per-club relation w/ per-club
            │                        fields (access_level, expires_at,
            │                        referring_member_id, status)
            │
            ├── user_roles         ← staff role (club_admin /
            │                        club_manager / super_admin)
            │
            └── people_audit_log   ← append-only lifecycle log
                                     (who promoted X to admin, when
                                     did guest Y become member, etc.)

  **4 SECURITY DEFINER lifecycle RPCs** (all audit-logged):
  - convert_guest_to_member
  - change_member_status (active / pending / inactive)
  - promote_member_to_staff (club_admin / club_manager)
  - demote_staff_to_member

  **Critical safety rules baked in:**
  - Manager-promotion gated to existing managers + super_admin
    (so a club_admin can't promote themselves to manager)
  - Manager-demotion gated to other managers + super_admin (so
    a club can't accidentally end up with zero managers)
  - Guest conversion preserves the guest row (status='graduated')
    for history; never deletes data

  **What's still missing (deferred to Phase 17 or beyond):**
  - Triggers writing initial \`guest_registered\` /
    \`member_added\` audit events at insert time (currently the
    audit log only captures transitions, not creation events —
    add as needed)
  - UI for editing people identity fields directly (currently
    inherited from members/guests CRUD — when a new \`people\`
    row diverges from members.name, we have an inconsistency)
  - Background job to expire guests automatically and log
    \`guest_expired\` events when their expires_at passes
  - Member status badge on existing Manage Members surface
    (currently shown only in AllPeopleAdmin)

- **v0.15.2** — People lifecycle actions: convert, status, promote, demote.

  Combines what was originally planned as three patches (v0.15.2
  guest→member, v0.15.3 member status, v0.15.4 staff promote/demote)
  into one because they all converge on a single migration + a
  single UI surface — splitting was artificial.

  **Migration 78 — Lifecycle RPCs:**
  - \`is_club_admin_at(club_id)\` helper — checks super_admin OR
    manager/admin role at the club. Reused by every action below.
  - \`convert_guest_to_member(auth_user_id, club_id, tier, status)\`
    — creates a \`members\` row carrying identity from \`people\`,
    marks the \`guests\` row \`status='graduated'\` (preserves
    history; no DELETE), writes \`guest_converted_to_member\` to
    audit log.
  - \`change_member_status(auth_user_id, club_id, to_status)\` —
    flips between active / pending / inactive with audit log.
  - \`promote_member_to_staff(auth_user_id, club_id, role)\` —
    inserts or updates the \`user_roles\` row. **club_manager
    promotion is gated**: only existing managers (or super_admin)
    can promote someone to club_manager; club_admins can only
    grant club_admin.
  - \`demote_staff_to_member(auth_user_id, club_id)\` — removes
    the \`user_roles\` row. **Manager demotion is gated**: only
    another manager (or super_admin) can demote a club_manager.
    Self-demotion of a manager requires super_admin (so we don't
    end up with zero managers at a club).

  All four RPCs SECURITY DEFINER. All four write to
  \`people_audit_log\` via \`log_people_event()\`. Errors raise
  exceptions with clear messages the client can surface.

  **\`AllPeopleAdmin\` actions UI:**
  - Per-row kebab menu (three vertical dots) replaces the
    read-only display with an action list. Items shown depend on
    current state:
    - Guest (no member row) → "Convert to Member"
    - Member → "Mark Active / Pending / Inactive" (omitting the
      current status)
    - Member (not staff) → "Promote to Admin" (always),
      "Promote to Manager" (manager-gated)
    - Staff (club_admin) → "Promote Admin → Manager" (manager-gated)
    - Staff (club_manager) → "Demote Manager → Admin"
      (manager-gated)
    - Staff (any role) → "Remove Staff Role" (red, danger color)
  - Confirmation prompts on destructive / role-changing actions.
  - Errors render below the list in a red bar.
  - Auto-refresh on success.

  **What you can now do from one screen:**
  - See every person at your club regardless of role
  - Convert a registered guest into a full member with one click
  - Mark members active/pending/inactive without touching SQL
  - Promote members to admin or manager
  - Demote staff back to members
  - Every action audited in \`people_audit_log\` with who, what,
    when, from-status, to-status, metadata jsonb

- **v0.15.1** — Unified People admin view (read-only).

  New admin section: **People → All People**. Shows every person
  with ANY relation to the current club (member, guest, OR staff)
  merged into one row with relation chips. Different from the
  existing Directory which is members-focused.

  **Migration 77 — \`all_people_at_club(p_club_id)\` RPC:**
  SECURITY DEFINER, gated to super_admin OR club_manager/admin at
  the requested club. Returns auth_user_id + identity fields from
  \`people\` joined to \`members\`/\`guests\`/\`user_roles\` for
  per-club state. Includes a \`relations\` jsonb array — one entry
  per role the person holds at the club (member, guest, AND/OR
  staff if they have multiple).

  **\`AllPeopleAdmin.jsx\`** renders:
  - Filter pills: All / Members / Guests / Staff with counts
  - Search box across name, email, phone
  - Per-row: avatar, name, email + phone subline, and a vertical
    stack of relation chips (Member / Guest / Staff badges with
    status nuance — "Member (pending)", "Guest (unverified)",
    "Manager" vs "Admin")
  - Avatar uses \`people.photo_url\` if present; otherwise initials
    on the club's primary color

  **Wired into AdminPanel** as the new section
  \`people_unified\` under the People area, between Directory and
  Manage Members. Gated by \`can_manage_members\` permission.

  Read-only this patch. v0.15.2 lands the per-row actions (Convert
  Guest, Promote to Staff, etc.).

- **v0.15.0** — Phase 16 opens: People lifecycle management.

  Marc's call: stable per-person attributes (name, email, phone,
  photo, address) should live in ONE place, not duplicated across
  \`members\` + \`guests\`. Per-club relation fields (handicap,
  locker, access level, role) stay where they are — that's correct
  multi-tenant normalization.

  **Migration 75 — \`people\` table:**
  - Keyed by \`auth_user_id\` (one row per real human, FK to
    \`auth.users\`)
  - Invariant fields: \`name\`, \`email\`, \`phone\`, \`street\`,
    \`city\`, \`state\`, \`zip\`, \`photo_url\`, \`notes\`
  - GIN index on \`name\` for full-text search; lower(\`email\`)
    index for case-insensitive lookups
  - RLS: self-read + self-update for the person themselves;
    super_admin all access; club_manager + club_admin read/write
    for anyone with a relation at their club (member, guest, or
    staff)
  - **Backfilled** from existing \`members\` + \`guests\` rows for
    every auth user that already has a relation. Members data
    preferred; COALESCE picks up guest data (phone, zip) members
    didn't have.

  **Migration 75 — \`people_audit_log\` table:**
  - Append-only immutable log of every lifecycle event
  - Actions: \`guest_registered\`, \`guest_status_changed\`,
    \`guest_converted_to_member\`, \`guest_expired\`,
    \`member_added\`, \`member_status_changed\`,
    \`member_promoted_to_staff\`, \`staff_role_changed\`,
    \`staff_demoted_to_member\`, \`member_removed\`,
    \`person_data_updated\`
  - Records: who, what, when, from-state, to-state, metadata jsonb
  - RLS: super_admin reads all; club_admin reads their club;
    user reads their own
  - No INSERT/UPDATE/DELETE policies — writes via SECURITY DEFINER
    function only. Audit means immutable.

  **Migration 76 — \`log_people_event(...)\` RPC:**
  - SECURITY DEFINER helper any caller (Edge Function, RPC) can
    use to record lifecycle events without direct table access.
  - Validates action name via CHECK constraint on the table.

  No client UI changes this patch — foundation only. v0.15.1 lands
  the unified People admin view; v0.15.2-3 land the conversion +
  lifecycle flows that actually USE this foundation.

  **Phase 16 patch shape:**
  - v0.15.0 — Foundation (this patch)
  - v0.15.1 — Unified "People" admin view (read-only)
  - v0.15.2 — Guest → Member conversion flow
  - v0.15.3 — Member status lifecycle (active / pending / inactive)
  - v0.15.4 — Staff promote/demote with audit + Phase 16 closeout

- **v0.14.14** — Client-side host-rescue redirect.

  Last layer of defense against guests landing on stale workers.dev
  URLs from emails issued before today's Supabase Auth fix.

  Synchronous redirect in \`main.jsx\` BEFORE React mounts. If the
  host is anything other than \`*.groundslive.com\`, \`localhost\`,
  or \`127.0.0.1\`, the SPA replaces the URL with the canonical
  groundslive.com equivalent, **preserving \`pathname + search +
  hash\`** so the magic-link auth token survives the bounce.

  Slug extraction logic: if the URL path is \`/guest/<slug>\`, use
  that slug's subdomain. Otherwise default to \`clintoncc\`. The
  default is pragmatic for the current production scale (1-2 active
  clubs); a future smarter version could decode the JWT in the
  auth hash to find the user's actual club.

  Combined with today's Supabase Auth URL config update (Site URL +
  Additional Redirect URLs allowlist via wildcards) and v0.14.13's
  Edge Function canonical-redirect fix, **all three paths into auth
  now flow through canonical URLs** — fresh magic links go straight
  there, stale ones bounce there.

- **v0.14.13** — Fix: guest registration redirect + button lag.

  Real guest signup attempt surfaced two bugs:

  **The redirect bug (critical):** A guest filled out the
  registration form at \`clinton-country-club.marcabla1.workers.dev\`
  (the OLD default workers.dev URL from when the Cloudflare Worker
  was named \`clinton-country-club\` before being renamed to
  \`the-grounds\`). Form sent \`redirect_to: window.location.origin\`
  to the \`guest-register\` Edge Function. Edge Function used that
  as \`emailRedirectTo\` for the magic link. Guest got their magic
  link, clicked it, landed back at workers.dev which serves
  "nothing here yet."

  Fix: **\`guest-register\` Edge Function v17 ignores the client's
  \`redirect_to\`** and always uses the canonical
  \`https://{club.slug}.{ROOT_DOMAIN}/\` URL it looks up
  server-side. Defense in depth — regardless of what host the form
  was filled on, the magic link goes to the right place.

  Manual followup required: disable the workers.dev URL on the
  \`the-grounds\` Cloudflare Worker (dashboard → Settings →
  Triggers → uncheck the workers.dev route), so old QRs and
  bookmarks pointing at workers.dev stop serving the app
  entirely.

  **The form button lag:** Form used \`<div onClick={formValid ?
  submit : undefined}>\` with a \`data-tap\` CSS animation. Tapping
  the gray (disabled) state still fired the visual flash (scale +
  opacity dip) but did nothing — felt like "lag" to guests
  filling the form.

  Fix: converted to real \`<button type="button" disabled={!formValid
  || busy}>\` with \`touchAction: 'manipulation'\` and
  \`WebkitTapHighlightColor: 'transparent'\`. Native disabled
  affordance, no fake tap feedback when disabled, no iOS click
  delay.

- **v0.14.12** — Audit + fix dark-mode contrast everywhere.

  v0.14.10 fixed the AI textarea white-on-white but Marc reported
  more spots breaking in dark mode. Full sweep — found 63
  hardcoded light backgrounds across 22 files. **60 fixed, 3
  intentionally kept.**

  **Bulk fix:** \`#F8F4EC\` → \`G.card\` across all .jsx files
  via a Node walker (54 replacements, 17 files). This was the
  dominant input/textarea background pattern. \`G.card\` routes
  through CSS vars and adapts:
  - Light/medium/dark member modes: variants of cream
  - Admin true-dark override: dark gray (\`#1E2125\`)
  - Contrast against \`G.text\` works in every mode

  **Manual fixes** (6 specific instances):
  - \`AdminTable.jsx\` — table container \`#FFFFFF\` → \`G.card\`
  - \`AdminSearchPalette.jsx\` — Cmd+K palette \`#FFFFFF\` → \`G.bg\`
  - \`AdminLayoutDesktop.jsx\` — topbar \`#FFFFFF\` → \`G.bg\`
  - \`SidePanel.jsx\` — drawer \`#FFFFFF\` → \`G.bg\`
  - \`AdminPanel.jsx\` — input \`#fff\` → \`G.card\`
  - \`sections.jsx\` — CRUD input \`#fff\` → \`G.card\`

  **Intentionally kept:**
  - \`MemberCard.jsx\` QR container — must stay white;
    QR scanners require light background
  - \`Toggle.jsx\` knob (\`#F2EDE0\`) — small UI element on
    the colored switch track; works visually in all modes
  - \`AdminAIBubble.jsx\` "Ask AI" text (\`#1A180F\`) — dark
    on gold brass, constant readable
  - All \`color: '#F2EDE0'\` instances — light text on green
    buttons, intentional constants
  - Translucent \`rgba(255,255,255,...)\` dividers on green
    header — green is constant so these work

  **Result:** every input, textarea, modal, side panel, table
  background, and topbar now adapts cleanly across all 3 member
  display modes (light/medium/dark) AND the admin true-dark
  override toggle.

- **v0.14.11** — Remove "Clinton Country Club · Member App" desktop label.

  Leftover from very early prototyping — a hardcoded caption with a
  little phone icon sat below the phone-frame chrome on desktop
  views, saying "Clinton Country Club · Member App". Two problems:
  it hardcoded "Clinton" (would have looked wrong on any other
  club's domain) and Marc didn't want it. Deleted the markup from
  \`index.html\` and the orphaned \`.desktop-label\` CSS rule from
  \`src/index.css\`. No replacement.

- **v0.14.10** — Fix: AI textarea white-on-white in dark mode.

  Marc reported the member AI textarea was unreadable in dark mode.
  Root cause: both MemberAIBubble and AdminAIChatModal hardcoded
  `background: '#F8F4EC'` (light cream) on their textareas. When
  the admin sidebar's true-dark theme override is on, the global
  CSS vars flip — `G.text` becomes light (`#E8E4D8`) — but the
  hardcoded `#F8F4EC` background stays light cream. Result:
  light-on-light text, unreadable.

  **Fix:** swapped both hardcoded `#F8F4EC` values for `G.card`,
  which routes through CSS vars and adapts:
  - light mode: `#F2EDE0` (cream)
  - medium mode: `#EAE4D0` (slightly darker cream)
  - member dark mode: `#D2C8B0` (darker beige)
  - admin true-dark mode: `#1E2125` (dark gray-blue)

  In every mode the textarea now has visible contrast against
  both the panel background (`G.bg`) and the text color (`G.text`),
  with the `G.border` outline distinguishing the input field.

  **Other Phase 15 colors verified across all 4 modes:**
  - User message bubble (green bg + light cream text) — constant
    colors, always readable
  - Admin bubble (brass bg + dark text) — constant colors, always
    readable
  - Assistant bubble (G.card bg + G.text) — adapts correctly
  - Starter chips, headers, footers — all use G.* tokens, adapt
    correctly
  - The fix is the only one needed

- **v0.14.9** — Admin AI floating bubble (discoverability).

  Marc reported the topbar chat-bubble icon was too subtle —
  hard to notice unless you knew where to look. Added a much
  more prominent floating pill bottom-right:

  - **Brass-accented "Ask AI" pill** with a chat icon + bold
    label. Distinct from the member bubble's green so super_admins
    flipping between contexts stay oriented.
  - **Mounted on both desktop AND mobile admin shells**
    (`AdminLayoutDesktop` for tablet+desktop, `AdminPanel.jsx` for
    pure mobile drill-down). I missed mobile in the original v0.14.2.
  - **Dismissible** per-user via localStorage
    (`admin-ai-dismissed:<user_id>`). A tiny brass tab on the
    right edge recalls it.
  - **Hides while the chat modal is open** (no overlap with the
    modal's z-index).

  **Topbar icon stays** as a secondary entry point for users who
  already learned where it is. Two entry points → unmistakable.

  Wiring required wrapping the 3 mobile-shell return statements
  in fragments to mount the bubble + modal alongside each level
  of the drill-down (Level 1 hub, Level 2 area sub-hub, Level 3
  section content). State for `aiOpen` lives at the AdminPanel
  level so it persists across drill transitions.

- **v0.14.8** — Phase 15 closeout.

  README + version.js phase index updated to reflect the full
  v0.14.x build. Architecture diagram added so future patches
  don't have to rediscover the pattern:

      TWO EDGE FUNCTIONS (separate per-agent)
        admin-ai-chat   →  mode='admin' rows
        member-ai-chat  →  mode='member' rows
      ONE LOG TABLE
        ai_usage_log  (mode is the billing axis)
          → super_admin reads all (Platform → AI Usage)
          → managers read their club's rows
      TWO ROLLUP SURFACES
        Admin AI    → AdminAIChatModal (topbar)
        Member AI   → MemberAIBubble (floating)

  **To add a new tool** to either agent: declare in the TOOLS
  array + add an executeTool() case + redeploy. The system
  prompt's "TOOL USE" section needs a one-line description so the
  model knows when to call it.

  **To add a new agent** (e.g. a kitchen-side AI for staff who
  aren't full club_admins): copy admin-ai-chat as a template,
  swap the auth check + system prompt + manual, add a new value
  to ai_usage_log.mode CHECK constraint, surface in the same
  ai_usage_log dashboard.

  **Phase 15 totals**: 2 Edge Functions, 2 client components,
  ~40KB of manual content (15KB member + 25KB admin), 2 migrations
  (ai_usage_log + 3 rollup RPCs), 8 patches over the v0.14.x
  series, ~1100 LOC client code.

  Phase 15 is closed. Next phase TBD.

- **v0.14.7** — Member AI live-data tools.

  Added Anthropic tool use to the member-ai-chat Edge Function
  (deployed at v3). Five tool definitions registered:

  - **`get_today_status`** — facility status + staff notes for today
  - **`get_menu`** — current food & drink menu organized by category
  - **`get_upcoming_events`** — events in the next N days
    (default 14, max 60)
  - **`get_recent_news`** — last N published news posts
    (default 5, max 10)
  - **`get_lesson_pros`** — club's lesson pros roster

  Each tool's executor runs server-side with the service-role
  Supabase client, **scoped to the authenticated user's
  `club_id`** (set at request time from the auth check, not by
  the model — defense against a misbehaving model trying to leak
  cross-club data).

  Schema verification done before deploy — fixed several
  column-name assumptions:
  - \`events\` uses \`event_time_start\`/\`event_time_end\` (not
    \`start_time\`/\`end_time\`) and \`spots\` (not
    \`max_capacity\`)
  - \`news\` uses \`headline\` (not \`title\`) and
    \`published_at IS NOT NULL\` (not a \`published\` boolean)
  - Table is \`menus\` (not \`menu_items\`); items use
    \`item_name\` and \`available_today\`
  - \`menu_categories\` uses \`is_active\` (not \`active\`)
  - \`lesson_pros\` has no phone/email — uses \`title\` instead

  Tool-execution loop: capped at **5 iterations** to prevent
  runaway tool calls. Each iteration sends tool_results back to
  the model; loops until \`stop_reason !== "tool_use"\`. All
  iterations' token usage accumulates into one ai_usage_log row
  so per-message cost stays a single number.

  Now the AI can answer "is the pool open right now?" with
  current data, not just "check the home screen." It can also
  recommend lesson pros by name, summarize recent news, and tell
  someone what's on the menu before they tap to the Food tab.

  System prompt updated with tool-use guidance: USE tools for
  current state, DON'T use them for "how does the app work"
  questions (those come from the manual).

  **What's next:**
  - v0.14.8 — Phase 15 closeout: README refresh, version.js phase
    index update, polish pass, document the foundation→manual→
    chat-UI→tools pattern for future use.

- **v0.14.6** — Member manual content + member-ai-chat v2.

  Replaced the v0.14.5 stub with the full ~15KB member-facing
  manual. Covers:
  - What MyClub is + the bottom tab bar
  - Per-tab inventory (Home, Golf, Food & Drink, Community, My Club)
  - 16 step-by-step common tasks (order food to-go / eat-in, RSVP,
    cancel RSVP, see pin position, DM another member, post on
    bulletin, post on partner board, browse pro shop, book a
    lesson, update profile photo, change to dark mode, see Trophy
    Case, view RSVP history, open membership card / QR, message
    clubhouse, get app help)
  - Pending membership banner explanation
  - Guest mode (all three access levels — data_only, read_only,
    full_temporary)
  - Cross-cutting concepts (real-time, push, PWA install, status
    pill colors, brass-ring calendar overrides, cart badge,
    magic-link sign-in)
  - What the AI can't help with (account changes, personal
    records, tee times, disputes, other clubs)
  - Escalation paths (Message Clubhouse for club stuff, Help &
    Support for app stuff)

  Member-ai-chat deployed at v2. Diag endpoint reports
  manual_chars so we can verify it loaded. Prompt cache now
  engages on the member side too (manual is well above Haiku's
  1024-token cache minimum).

- **v0.14.5** — Member AI: Edge Function + floating bubble.

  **`member-ai-chat` Edge Function (v1)** — mirror of admin-ai-chat
  with three deltas:
  - Auth = any signed-in user (member or admin) at the posted
    `club_id`. Verifies via `members` lookup OR `user_roles` row at
    that club.
  - Gates on `clubs.feature_flags.member_ai === true` — returns 403
    if the manager hasn't opted in. Defense-in-depth (the bubble
    self-hides client-side too).
  - Logs every call with `mode='member'` + `club_id` so cost rolls
    up per-club in the Platform → AI Usage dashboard.

  Uses the same Claude Haiku 4.5 + prompt-caching pattern; manual
  content is a small stub for v0.14.5 (full member manual lands in
  v0.14.6).

  **`MemberAIBubble` component**:
  - Floating bottom-right on every member screen. Self-gated by
    `isFeatureOn(club, 'member_ai')` — renders null when the club
    hasn't opted in.
  - Three states: **bubble** (idle, with a tiny "Hide" tab above),
    **expanded chat panel** (360px × 560px), **dismissed** (tiny
    brass tab on the right edge to recall).
  - Dismissal persisted in localStorage keyed by `(user_id,
    club_id)` so each member's choice survives reloads + applies
    only to their account.
  - Chat panel includes 3 starter prompt chips for empty state,
    "Thinking…" indicator, error rendering, Esc-to-close,
    Enter-to-send (Shift+Enter for newline).
  - Inline markdown renderer (smaller than admin's — member
    replies are shorter).

  **Mount point**: in `App.jsx` ScreenRenderer, after the
  `<BottomNav />`. Hidden on the admin surface
  (`!current.id.startsWith('myclub/admin')`) since admin has its
  own AI in the topbar.

  **What's next**: v0.14.6 lands the full member manual content
  (~25KB drafted from the member-side codebase). v0.14.7 adds
  live-data tools (`get_today_status`, `get_menu`, etc.) so the
  AI can answer "is the pool open right now?" with current data
  instead of "check the home screen."

- **v0.14.4** — Member AI per-club toggle (in Club Features).

  Added `member_ai` to the feature flags catalog (`src/lib/features.js`).
  FeaturesAdmin auto-renders the toggle — no per-flag UI code, the
  Phase 7 Club Features Control Panel pattern just picks it up.

  - **Default OFF** — managers explicitly opt in once they
    understand member AI bills per-club.
  - New **"AI" category** in the features grouping (positioned
    between Appearance and Guest System).
  - **`min_tier: 'basic'`** — available on every paid tier; no
    add-on gate.
  - The unused `clubs.member_ai_enabled` column from migration 73
    becomes vestigial — v0.14.5+ checks `isFeatureOn(club,
    'member_ai')` instead. A future cleanup migration can drop the
    column.

  Managers can now flip the toggle today; the actual member bubble
  + Edge Function land in v0.14.5.

- **v0.14.3** — Super_admin AI usage dashboard.

  New **Platform → AI Usage** section (super_admin only). Shows
  GroundsLive AI spend, call volume, and cache-hit rate per mode
  (admin vs member), per club, and per top user.

  **Migration 74** adds three SECURITY DEFINER rollup RPCs that
  check `is_super_admin()` at the top:
  - `ai_usage_summary(p_since)` — single row per mode with token
    counts, total cost, cache hit rate.
  - `ai_usage_by_club(p_since)` — per-club totals (clubs with no
    `club_id` roll up as "(platform)" — that's super_admin asking
    the admin AI without club context).
  - `ai_usage_by_user(p_since, p_limit)` — top spenders by user;
    catches power users + runaway loops.

  **`AIUsageAdmin.jsx`** (split into its own file — the
  `sections.jsx` 6KLOC bloat is a real problem so new Phase 15
  additions live separately) renders:
  - **Window picker** (7 / 30 / 90 days)
  - **Four cost tiles**: Platform total · Admin AI · Member AI ·
    Admin cache-hit rate
  - **Per-club table** with mode badge + cost
  - **Top users table** (20 max) with email + mode + cost

  Cost formatter adapts to scale: ¢0.060 for sub-cent, ¢0.05 for
  cents, $14.32 for dollars. Makes per-call AND monthly totals
  both readable in the same column.

  **Use case for Marc:** open this monthly to see what each club
  is costing (member AI rolls up per club; you can pass those
  costs through to clubs later as a billing tier). Admin AI total
  is your operating expense for supporting managers. Cache-hit
  rate confirms v0.14.1's prompt caching is actually engaging —
  anything above 60% means the manual content is doing its job.

- **v0.14.2** — Admin AI chat UI in the admin topbar.

  Marc finally gets to actually talk to GroundsLive Admin AI. New
  brass-accented chat-bubble icon in the admin topbar (between the
  Support bell and the existing `?` icon) opens
  **`AdminAIChatModal`** — a multi-turn chat surface against the
  `admin-ai-chat` Edge Function deployed in v0.14.1.

  **`AdminAIChatModal` features:**
  - **720px wide, 85vh tall** modal with a "GroundsLive Admin AI"
    header and subtitle ("Ask anything about managing The Grounds").
  - **Multi-turn conversation** with client-side `conversation_id`
    (UUID generated once per modal mount) sent on every request so
    `ai_usage_log` rows group cleanly. Closing + reopening starts a
    fresh conversation.
  - **Inline markdown renderer** (~60 lines, no npm dep) handles
    headings, bold, italic, inline code, fenced code blocks,
    ordered/unordered lists, blockquotes, and HTTP links. HTML
    escaping first — links open in a new tab with
    \`rel="noreferrer noopener"\`.
  - **Empty state** shows 4 starter chip suggestions ("How do I add
    a recurring event?", "Where do I set facility hours?", "How do I
    reply to a food order?", "How do I add a custom facility like
    Pickleball?") — clicking one fires it as the first message.
  - **User messages** right-aligned in green bubbles; **AI replies**
    left-aligned in card bubbles with markdown rendering.
  - **Cost shown to super_admin only** as a tiny italic line under
    each AI reply ("¢0.07 · haiku-4.5"). Managers + club_admins
    don't see it — admin AI is platform-billed and not their
    concern.
  - **"Thinking…" state** in a left-aligned bubble while the
    request is in flight.
  - **Error handling** renders errors in a red-tinted bar (covers
    503 no-key, 502 Anthropic error, 401 auth, network).
  - **Composer** at the bottom: textarea + send button. Enter to
    send, Shift+Enter for newline. Auto-grows up to 4 rows. Send
    button disabled when empty or busy.
  - **Esc to close** the modal. Auto-focus the textarea on open.
  - **Disclaimer** strip at the bottom of the composer:
    "AI may be wrong about details. For account-level changes use
    the **?** icon to contact a human."

  **Topbar integration** (\`AdminLayoutDesktop.jsx\`):
  - New chat-bubble icon (brass-tinted) inserted between the
    Support bell chip and the existing \`?\` icon.
  - Both surfaces preserved: \`?\` continues to open
    \`ContactSupportModal\` (the human escape hatch), the new icon
    opens \`AdminAIChatModal\`. Marc can route a confusing
    question to a human at any point.

  **What it costs in practice:**
  At Haiku 4.5 pricing with the v0.14.1 prompt cache engaged, a
  typical 3–5 turn conversation runs ~¢1–2 per session. Marc's
  expected platform volume (~50 admin questions/day) puts admin AI
  in the \$9/month range — well inside what The Grounds absorbs as
  part of supporting managers.

  **What's next:**
  - v0.14.3 — Super_admin usage dashboard (per-club spend, top
    question categories, cache-hit rate, total platform cost).
  - v0.14.4 — Admin enable/disable toggle in Club Settings (in
    case a manager wants to hide the AI for their staff during a
    learning curve).
  - v0.14.5+ — Member AI: floating bubble on member surfaces,
    gated by \`clubs.member_ai_enabled\`.

- **v0.14.1** — Admin manual content + cached system prompt.

  Drafted a comprehensive admin manual from the codebase
  (\`supabase/functions/admin-ai-chat/manual.ts\`, ~25KB markdown,
  ~6K tokens). Covers every admin area + section + cross-cutting
  feature + a "Common admin tasks" section with step-by-step
  walkthroughs for the 15 most common workflows (add an event,
  set facility hours, reply to a food order, award a badge,
  send a push, save a workspace, reply to a support ticket, etc.).

  Wired into the Edge Function via \`import { ADMIN_MANUAL }
  from "./manual.ts"\` + injected into the cached system prompt
  block. The system prompt is now ~30KB / ~7K tokens — well
  above Haiku 4.5's 1024-token cache minimum, so **prompt caching
  now engages on every admin question within the 5-minute TTL**.

  **Cost impact (per typical admin question):**
  - First call after 5-min idle: full system prompt write
    (~$0.009) — pays the cache premium once
  - Every subsequent call in the same 5-min window: cache read
    (~$0.0007) — basically free
  - Output cost dominates after that (~$0.001 per response)

  So a typical session of 5 questions over 2 minutes runs about
  $0.01 — down from ~$0.05 without caching. At 50 admin
  questions/day across the platform, that's $0.30/day = $9/month
  for unlimited admin AI. Well inside Marc's plan to absorb as
  part of "supporting your managers."

  **Manual content highlights:**
  - Phase-aware (mentions v0.13.9 facility trigger, v0.13.2 push
    fan-out, v0.10.14 member-side Help & Support, etc.)
  - Role gating noted inline ((manager only), (super_admin only))
    so the AI flags it when telling someone where to go
  - References UI labels EXACTLY as they appear in the sidebar
    ("Communications → Lesson Requests", not "the lesson queue")
  - Escalation path documented: AI cannot do account-level
    changes, password resets, or platform features — those go to
    the Contact Support modal with the right category

  **What's next:**
  - v0.14.2 — Admin chat UI in the topbar (modal with multi-turn
    conversation, disclaimer rendering, cost display for
    super_admin). Marc finally gets to actually talk to it.

  No client-side changes this patch — function-only deploy.
  Bumping the version anyway so anyone reading the inline phase
  index in version.js sees the manual landed.

- **v0.14.0** — Phase 15 opens: GroundsLive AI foundation.

  After the strategy session (member-side AI to differentiate the
  product + admin-side AI to slash manager-onboarding support load),
  this patch lands the plumbing for both. **Admin AI ships first**
  per Marc's call — the manager onboarding payoff is biggest.
  Member AI lands later in v0.14.5+. Both will share one
  `ai_usage_log` table; the `mode` column is the billing axis
  (`mode='member'` rolls up per-club for clubs that opt in;
  `mode='admin'` rolls up to The Grounds regardless of which club's
  manager was asking).

  **Migration 73:**
  - **`ai_usage_log`** — append-only audit log of every Anthropic
    API call. Columns for token counts (input / cached / output),
    computed cost in cents at `numeric(14,6)` precision (sub-cent
    matters when a Haiku message costs ~0.05¢), Anthropic request
    ID for support tickets, a client-supplied `conversation_id` to
    group multi-turn calls, latency, and an optional `error` column
    for failed calls. RLS: super_admin reads everything; managers
    read their club's rows; service-role inserts only — no user
    writes, no updates, no deletes.
  - **`clubs.member_ai_enabled`** boolean, default `false`. Gates
    the future member-side AI per-club so managers explicitly opt
    in once they understand the cost model. Admin AI is
    platform-controlled and does NOT use this flag.

  **`admin-ai-chat` Edge Function (v1):**
  - Admin-role auth (super_admin / club_manager / club_admin)
    matching the v0.13.7 `user_roles.club_id` schema fix.
  - **Anthropic Claude Haiku 4.5** via official SDK
    (`@anthropic-ai/sdk@0.39.0`).
  - **Prompt caching wired** on the system prompt
    (`cache_control: { type: "ephemeral" }`). With just the
    foundation system prompt (~250 tokens) it's below Haiku's
    1024-token cache minimum and won't actually engage yet — but
    when v0.14.1 lands the admin manual content (probably 5-15K
    tokens), the wiring is already correct and savings turn on
    automatically.
  - **Per-call cost calculation** from `response.usage`
    (input + cache_creation × 1.25 + cache_read × 0.10 + output)
    converted to cents and written to `ai_usage_log` with
    `mode='admin'`. Failed calls write a row too with the error
    message in the `error` column and cost columns at 0 — the log
    is the truth.
  - **`?diag=1` endpoint** (GET, no auth) checks
    `ANTHROPIC_API_KEY` presence and format, then pings Anthropic
    with a 4-token `max_tokens` call to verify the key is
    reachable. Used to confirm Marc's secret is wired correctly
    before opening the chat UI in v0.14.2.
  - **No chat UI yet.** The function is callable via curl this
    patch; the admin topbar integration lands in v0.14.2 after the
    manual content (v0.14.1) gives it something useful to say.

  **Phase 15 patch shape going forward:**
  - v0.14.0 — Foundation (this patch)
  - v0.14.1 — Admin manual content drafted from the codebase,
    wired as cached system content
  - v0.14.2 — Admin chat UI in the topbar (modal with multi-turn
    conversation)
  - v0.14.3 — Super admin usage dashboard (per-club spend, top
    question categories, cache-hit rate)
  - v0.14.4 — Admin enable/disable toggle in Club Settings
  - v0.14.5 — Member AI: floating bubble + minimal tools (gated by
    `clubs.member_ai_enabled`)
  - v0.14.6 — Member manual content
  - v0.14.7 — Member tools (live data queries: menu, hours, events)
  - v0.14.8 — Phase 15 closeout (guest mode + README + polish)

  **Marc needs to add `ANTHROPIC_API_KEY` to Supabase Edge Function
  secrets** before the function can actually answer. Without it,
  POST returns a 503 with an instructional error message and the
  diag endpoint returns `anthropic_key_present: false`.

- **v0.13.9** — Fix: custom facilities never got a `club_status` row.

  Marc added Tennis Court (custom) at Clinton CC, marked it active
  in Facilities Admin, and noticed it never appeared on the member
  home screen as a status pill.

  **Root cause.** Since v0.9.15, member-facing surfaces read from
  `club_status` and join to `club_facilities` via `facility_id`.
  The original 5 default facilities came pre-paired with
  `club_status` rows by migration 53. But **`FacilitiesAdmin`'s
  "+ Add facility" flow only inserts into `club_facilities`** — it
  never creates the matching `club_status` row. Result: a custom
  facility exists in the catalog but is invisible to
  `useClubStatus()`, `DailyStatusAdmin`, `FacilityHoursAdmin`, and
  the home screen pills. The toggles in Facilities Admin appeared
  functional (the catalog row's `active` flag flipped fine) but
  triggered no observable change anywhere else.

  **Migration 72** lands a two-part fix:

  1. **`fn_create_status_for_facility()` trigger** on
     `club_facilities AFTER INSERT` auto-creates a matching
     `club_status` row with `state='open'` defaults, mirroring the
     `facility_key`, `display_name`, and `sort_order` from the
     catalog entry. `ON CONFLICT (club_id, category) DO UPDATE`
     so existing rows get their `facility_id` backfilled if it was
     missing — handles edge cases without crashing.
  2. **Backfill** for every orphaned facility already in the wild
     (Tennis Court at Clinton CC, plus the inactive customs
     Driving Range / Golf Simulator / Pickleball Court — gives
     them status rows that'll just sit dormant until activated).

  After this migration:
  - Tennis Court appears on Clinton's home screen as a 6th pill
    immediately (realtime sub picks up the new row).
  - Future custom facilities at any club work end-to-end from the
    "+ Add" click — no manual SQL, no follow-up step.
  - The inactive customs stay hidden from members (Home filters
    by `active !== false`) but already have rows ready for the
    moment a manager flips their toggle.

  No client code change required. Pure server hotfix.

- **v0.13.8** — Categorization + in-app Contact Support modal.

  Two improvements Marc asked for after the first end-to-end test:
  ticket categorization (so enhancement requests stop disappearing
  into a pile of help tickets) and an in-app way for admins to
  reach out — vs hoping they remember the address.

  **Categorization:**

  - **Migration 71** adds `support_threads.category` text column
    with a CHECK constraint of 5 values: `user_help`, `admin_help`,
    `bug`, `enhancement`, `other`. NULL = "needs triage" (default
    for inbound emails — we can't auto-detect from a random email).
  - **Two hot-path indexes** so filtered views (`active
    enhancements`, `open bugs`) stay sub-50ms even as the backlog
    grows: `(category, last_message_at DESC)` for category views
    and a partial index `WHERE category IS NULL` for the triage
    queue.
  - **Thread list UI**: a second row of filter pills below the
    Active/All/Closed row — `All categories`, `Needs triage`, and
    one pill per category, each color-coded. Header line shows the
    untriaged count in brass when > 0 so it visually pulls the
    eye. Each thread row gets a category chip (or amber "Triage"
    chip if uncategorized) next to the status pill.
  - **Thread detail UI**: a `<select>` dropdown next to the
    Close/Reopen button lets you triage (or re-triage) a thread
    in one click. The header pill flips from amber "Needs triage"
    to the category's color.
  - **Enhancement requests are now first-class backlog** — they
    stay `status='open'` indefinitely while you knock them out,
    rather than getting closed as "answered" the way a user-help
    ticket would.

  **In-app Contact Support:**

  - **`ContactSupportModal` component** opens from two new
    entry points in the desktop admin: a "Need help? Contact
    Support" link in the sidebar footer (below the dark-mode
    toggle), and a help-circle `?` icon in the top bar between
    the search trigger and the bell chips.
  - **Form**: category picker (color-chip pills) + Subject +
    Message. Auto-captures the user's club, current URL, and
    browser user-agent as a footer on the message body — useful
    later when you're triaging "X doesn't work on my phone."
  - **`submit-support-ticket` Edge Function (v1 deployed)**:
    admin-role auth (super_admin OR club_manager / club_admin
    at the user's club, matching the v0.13.7 `club_id` fix from
    the start), resolves sender identity from the user's
    `members.email` (with `auth.users.email` fallback for
    super_admins not registered as members), creates the
    `support_threads` row WITH category set up front (no
    triage step needed) plus the initial `support_messages`
    row. The v0.13.2 push trigger fires automatically — you
    get the notification just like an emailed-in ticket.
  - **Member scope unchanged**: the existing v0.10.14 Help &
    Support member-side surface keeps working as before. The
    in-app modal is admin-only.
  - **Discoverability copy**: the modal includes "Or email
    `support@groundslive.com` directly" as a fallback for power
    users who prefer email; the sidebar footer link spells out
    the contact path in plain English.

- **v0.13.7** — Hotfix: support reply 401 "super_admin required".

  Marc's first live test of Phase 14 sent an email to
  `support@groundslive.com`, watched the row land in the admin
  thread view (the inbound pipeline works end-to-end ✅), typed a
  reply, hit Send → got `"super_admin required"`.

  **Root cause.** Both `send-support-reply` and
  `manage-support-destinations` Edge Functions baked in the
  supabase-rbac skill's *generic* column name `tenant_id` for the
  super_admin check:
  ```ts
  .select("role, tenant_id")
  ... && r.tenant_id === null
  ```
  The Grounds' actual `user_roles` schema names it **`club_id`**.
  PostgREST silently returned rows without the requested column;
  the `r.tenant_id === null` check passed trivially (undefined ===
  null is false), so no row ever matched and every super_admin was
  rejected.

  **Fix.** Both Edge Functions redeployed with `club_id` instead of
  `tenant_id`. Reply send works; destination-management admin UI
  (Platform → Support → Team) also unblocked.

  **Lesson** (captured separately in the `supabase-rbac` skill):
  when adapting the skill's templates to a real project, the
  tenant column name has to be search-and-replaced everywhere the
  template uses `tenant_id`. The skill calls this out in the
  decision section but didn't strongly enough flag it as a
  silent-failure mode.

- **v0.13.6** — Attachments + Phase 14 closeout.

  **Attachments — full inbound + admin download:**

  - **Migration 70** creates a private `support-attachments`
    Supabase Storage bucket (no public read) + a
    `support_attachments` table linking files to `support_messages`
    by `message_id`. Storage RLS allows SELECT on the bucket only
    for `is_super_admin()`; service role bypasses for ingest.
  - **`receive-support-email` v2 deployed.** Now extracts the
    `attachments[]` array from `postal-mime` output, sanitizes the
    filename, uploads the binary content to
    `support-attachments/<thread_id>/<message_id>/<uuid>-<filename>`,
    and inserts a row in `support_attachments`. 10 MB cap per file;
    larger get logged and skipped (no message-insert failure).
  - **Admin UI: attachment chips.** Each message bubble now renders
    a compact chip per attachment with paperclip icon + filename +
    size (KB/MB). Click → `supabase.storage.createSignedUrl(path, 60)`
    → opens in a new tab. Browser handles inline-view vs download by
    MIME type. Chips style themselves brass-on-cream on inbound
    bubbles, gold-on-green on outbound bubbles for visual continuity.

  **Phase 14 closeout:**

  - **README refresh** — intro line bumped to v0.13.6, intro
    paragraph describes the full Phase 14 architecture, new
    **📨 Platform Support Inbox (Phase 14)** section in the
    feature inventory above Phase 13, Platform area listing
    updated to include Support.
  - **`src/lib/version.js`** — Phase index expanded per-patch
    summary now that all 7 Phase 14 patches have shipped.

  ## What lands on Marc's side end-to-end

  An email to `support@groundslive.com` from anywhere on the
  internet → Cloudflare Email Routing → support-inbox Worker →
  forwards to `marcabla1@gmail.com` + `mjbo@aol.com` AND POSTs raw
  to `receive-support-email` Edge Function → parses + dedups +
  threads + inserts → `fn_send_push_on_support_message` trigger
  fires → `send-push` v9 fans out to every super_admin's PWA →
  brass envelope chip appears in admin top bar + red unread badge
  on the launcher icon (installed PWA). Tap notification → admin
  opens to that thread → reply composer types reply →
  `send-support-reply` sends via Resend → recipient sees reply in
  their Gmail threaded under the original. Attachments stored
  privately; admin downloads via signed URL.

- **v0.13.5** — Support unread: bell + OS app-badge + realtime everywhere.

  Four pieces of "the badge is alive" wire-up shipped together:

  · **New hook `useSupportUnread`** — calls
    `support_unread_count()` RPC (from migration 66), subscribes
    to realtime on `support_messages` + `support_reads` +
    `support_threads` so the count updates without polling.
    Gracefully returns 0 for any non-super_admin caller (RLS
    hides every relevant row anyway).

  · **New `SupportBellChip` component** — brass-tinted envelope
    icon with red unread count, sits next to the existing
    green `BellChip` in the desktop admin top bar. Only renders
    for super_admins with `count > 0` — keeps the bar clean
    when there's nothing to do. Click → navigates to
    Platform → Support (same URL the push deep-link uses).

  · **OS app-badge sync extended** — `useInboxUnread` now folds
    the support count into the `navigator.setAppBadge(total)`
    call for super_admins. There's only one badge per
    installed-PWA icon on the OS, so we combine member-side
    inbox unread + support unread into a single total. The
    member-side `BellChip` count stays unchanged (still shows
    just the inbox total) — the OS badge is the only surface
    that combines them.

  · **Realtime in the SupportInboxTab itself** — both the
    thread list and the open thread detail subscribe to
    `support_messages` / `support_threads` postgres_changes.
    When a fresh ticket comes in while the inbox is open, the
    list reflects it without a manual refresh. When the
    recipient hits Reply right after your reply lands, the
    new inbound message appears in the open thread view
    within ~1 second.

- **v0.13.4** — Admin UI: Platform → Support → Inbox thread view.

  The visible payoff for the whole inbound + outbound stack
  shipped over v0.13.0 → v0.13.3. The Inbox sub-tab now renders:

  **Thread list:**
  - Sender name + email + subject + timestamp + status badge
  - Per-(thread, super_admin) unread dot driven by
    `support_reads.read_at` < `support_threads.last_message_at`
  - Filter pills: **Active** (default — open + answered) /
    **All** / **Closed**
  - Sorted by most recent activity

  **Thread detail (selected):**
  - Header with subject, sender, status pill, Back link
  - Status controls: Close thread / Reopen thread
  - Chronological message list with chat-bubble styling — inbound
    on the left (card-color bg), outbound on the right (Grounds
    green) so the conversation reads as a real thread
  - Each bubble shows sender + timestamp + body_text with
    `white-space: pre-wrap` so plain-text formatting (line breaks)
    survives
  - Reply composer at the bottom — textarea + Send button.
    Send calls `send-support-reply` from v0.13.3, refreshes the
    message list on success.

  **Read tracking** — opening a thread auto-upserts
  `support_reads` with `read_at = now()` for the viewing
  super_admin. Switching back to the list shows the dot cleared.
  The trigger from v0.13.0 already auto-flips status to
  `answered` when a reply lands, so the visible state stays
  honest without extra logic.

  **Deep-link from push** — the v0.13.2 SW push uses
  `data.url = /admin/?area=platform&section=support&thread=<id>`.
  The Inbox tab reads `?thread=<id>` from `window.location.search`
  on mount and opens the matching detail view directly. Tap a
  push on your phone → unlock → admin opens to the right thread.

- **v0.13.3** — Outbound reply pipeline (server only).

  New Edge Function `send-support-reply` (deployed v1). Super_admin
  JWT in, reply email out via Resend appearing as
  `support@groundslive.com` (or whatever `RESEND_FROM_ADDRESS`
  is set to). Inserts a `direction='out'` row in `support_messages`
  on send; the v0.13.0 trigger auto-flips the thread to
  `status='answered'` and updates `last_message_at`. Also upserts
  `support_reads` for the sending super_admin since they obviously
  read the thread.

  **Threading correctness** — the recipient's mail client
  (Gmail/Outlook/etc.) needs three RFC-822 headers to chain
  replies properly:
  - `Message-ID` — fresh UUID-based ID on our domain
    (`<reply-<UUID>@groundslive.com>`) so the recipient's
    "Re:" comes back with this as `In-Reply-To` and we can
    thread it on our side too
  - `In-Reply-To` — set to the last inbound message's
    `message_id` (looked up from support_messages)
  - `References` — concatenation of the inbound parent's
    `references_ids` + the parent's `Message-ID`

  Resend's `headers` field carries all three to the wire. Tested
  threading: a reply to a Gmail message keeps the same thread in
  Gmail's UI; a fresh ticket starts a new Gmail thread.

  Subject auto-prefixed with `Re: ` unless the original already
  starts with it (case-insensitive).

  No client code in this patch — the reply composer UI lands in
  v0.13.4 which calls this endpoint. The function is fully
  testable now via curl with a super_admin JWT.

- **v0.13.2** — Push fan-out for support tickets.

  Every inbound support email now fires a Web Push to every
  super_admin's installed PWA. Tap the notification → opens the
  Platform → Support thread view (deep-linked URL once v0.13.4
  lands the UI; renders the v0.13.1 placeholder until then).

  **Migration 68** — `fn_send_push_on_support_message()` trigger
  on `support_messages` AFTER INSERT, gated to `direction='in'`
  only so the super_admin's own outbound replies don't push back
  at them. Same pg_net.http_post → send-push pattern as
  `fn_send_push_on_message` / `fn_send_push_on_broadcast`.

  **send-push v9 deployed** (deploy version 14):
  - New `handleSupportTicket` branch dispatched on
    `payload.table === 'support_messages'`.
  - Resolves recipients by querying `user_roles WHERE
    role='super_admin' AND tenant_id IS NULL` — every super
    admin on the platform receives the push.
  - Title: `Support · <from_name or from_addr>`.
  - Body: `<subject> — <first 120 chars of body_text>`.
  - `data.url = /admin/?area=platform&section=support&thread=<id>`
    so cold-load opens the right admin surface.
  - `data.kind = 'support'` lets the SW route correctly when a
    PWA tab is already open.
  - 12-hour TTL — support is time-sensitive but doesn't need the
    24-hour urgent-broadcast queue.

  **Service worker update** — `notificationclick` handler now
  postMessages `{kind, url}` alongside `threadId` so the React
  page can branch on `kind === 'support'` and navigate to the
  admin URL instead of trying to open a member-side inbox thread.

  ⚠ **Service worker update requires PWA reload** to take effect
  — SWs don't hot-replace. Close + reopen the PWA on iOS/Android,
  or hard-refresh on desktop.

- **v0.13.1** — Support destinations: app-managed forward list.

  Marc's instinct caught a real wart in v0.13.0: the Cloudflare
  Email Worker had `marcabla1@gmail.com` and `mjbo@aol.com`
  hardcoded in JavaScript. Changing the team meant editing
  Worker code. v0.13.1 lifts the list into Supabase and adds a
  Platform-area admin UI to manage it.

  **Migration 67 — `support_destinations` table:**
  - `email`, `name`, `active`, `verified_at`, `cf_destination_id`,
    `added_at`, `added_by`. RLS super_admin-only.
  - Seeded with `marcabla1@gmail.com` and `mjbo@aol.com` —
    pre-marked `verified_at = now()` since both were already
    verified manually in Cloudflare's dashboard during v0.13.0.

  **Two new Edge Functions:**
  - `get-support-destinations` — called by the Worker on every
    inbound email. Auth via `SUPPORT_INGEST_SECRET`. Returns
    `{destinations: [{email, name}]}` filtered to active +
    verified rows. 30-second `cache-control` header so the
    Worker can short-circuit if it ever decides to cache.
  - `manage-support-destinations` — super_admin CRUD. Wraps
    Cloudflare's Email Routing `/email/routing/addresses` API:
    `POST` registers a destination + sends the verification
    email; `DELETE` removes it from both Cloudflare and DB;
    `POST /sync` reconciles DB rows against Cloudflare's
    actual destinations list (backfills `cf_destination_id`,
    flips `verified_at` on rows that have now been verified
    by the human clicking the link in their inbox).

  **Worker code change** (handed to Marc as part of this commit):
  the hardcoded `FORWARD_TO` array is gone. The Worker now
  fetches the destinations list from `get-support-destinations`
  on every inbound message and forwards to each. ~10 lines of
  delta.

  **Admin UI — Platform → Support → Team sub-tab:**
  - Table of destinations with name + email + status badge
    (Verified / Pending / Inactive).
  - "+ Add team member" expands a form (name + email) →
    submits to `manage-support-destinations` → Cloudflare
    sends verification email → row appears with PENDING
    status until the person clicks the link.
  - Per-row Remove with confirm.
  - "Sync with Cloudflare" button — calls `/sync` to flip
    newly-verified rows from PENDING to VERIFIED without
    waiting for next-page-load.
  - Inbox sub-tab is a placeholder (lands in v0.13.4) — keeps
    the section structure consistent.

  **Two new Supabase secrets required for full admin UI
  functionality** (the table + UI work without them; the
  CRUD calls will fail with a friendly error until configured):
  - `CLOUDFLARE_EMAIL_ROUTING_TOKEN` — token with
    `Account.Email Routing.Edit` scope on the relevant account.
  - `CLOUDFLARE_ACCOUNT_ID` — already exists from the
    provision-club-domain wiring.

- **v0.13.0** — Phase 14 opens: support inbox inbound pipeline.

  Lands the foundation without surfacing anything in the admin
  UI yet. After this patch + the Cloudflare Email Worker setup,
  every email to `support@groundslive.com` populates a row in
  `support_messages` while continuing to forward to the platform
  team's personal inboxes.

  **Migration 66 — three tables:**
  - `support_threads` — one row per conversation, grouped by the
    RFC-822 Message-ID chain. Columns include `subject`,
    `from_addr`, `from_name`, `from_member_id` (nullable best-
    effort match against `members.email`), `from_club_id`,
    `status` (open / answered / closed with auto-transition), and
    `last_message_at`. Indexed on `last_message_at DESC` for the
    thread list hot path and on `(status, last_message_at DESC)`
    for filtered views.
  - `support_messages` — one row per inbound or outbound email.
    Columns capture both RFC-822 envelope (`message_id`,
    `in_reply_to`, `references_ids`, `from_addr`, `to_addrs[]`,
    `cc_addrs[]`, `subject`) and body (`body_text`, `body_html`,
    `raw_size_bytes`, `has_attachments`). `UNIQUE INDEX
    (message_id) WHERE message_id IS NOT NULL` makes ingest
    idempotent — same Message-ID can't insert twice, so Worker
    retries are safe.
  - `support_reads` — per-`(thread, super_admin)` read state.
    Mirrors the `notification_reads` pattern from v0.6.x so two
    super_admins each track their own unread count without
    stepping on each other.

  All three are RLS super_admin-only (`is_super_admin()` helper
  from the v0.10.x phase). Edge Function uses service-role to
  bypass for ingest + future push trigger.

  **`fn_touch_support_thread()` trigger** on
  `support_messages INSERT` updates `support_threads
  .last_message_at` and auto-flips `status` (inbound to a
  closed/answered thread reopens it; an outbound message to an
  open thread marks it answered). One write does both.

  **`support_unread_count()` helper** — `SECURITY INVOKER`
  function that returns the count of threads with messages newer
  than the caller's `support_reads.read_at`. The admin bell badge
  + OS app-badge will call this in v0.13.4.

  **Edge Function `receive-support-email`** (deployed v1) —
  Called by the Cloudflare Email Worker on every inbound message.
  Auth via a shared `SUPPORT_INGEST_SECRET` header (not the
  service-role key; the Worker doesn't need that much power).
  Parses RFC-822 with `postal-mime`, dedups on Message-ID,
  resolves the thread via In-Reply-To lookup or creates a new
  one, best-effort matches `from_addr` against `members.email`
  to populate `from_member_id` / `from_club_id`, then inserts
  the message row. `?diag=1` returns env state for verification.

  **Pending in this patch — manual Cloudflare side:** enable
  Email Routing on `groundslive.com`, verify
  `marcabla1@gmail.com` + `mjbo@aol.com` as destinations, deploy
  the Email Worker, and add a Custom Address rule routing
  `support@` to the Worker. Worker code + dashboard walkthrough
  handed to Marc with this commit.

  No client code change — this is server + admin scaffold only.
  The build is bumped + the CHANGELOG + version index updated.

- **v0.12.8** — Typography pass round 2 (every admin queue card).

  v0.12.6 only touched four patterns (CrudSection, FoodOrdersAdmin,
  EventRegistrationsAdmin, EventsAdmin lists). Marc surfaced a
  miss almost immediately — the Lesson Requests screen on desktop
  was still reading at the old 14/11 primary/secondary sizing.
  Round 2 bumps every remaining custom queue / list / detail
  surface in `sections.jsx`:

  · **LessonRequestsAdmin** (Comms → Lesson Requests + Pro Shop
    Inquiries) — name `14 → 16`, email/kind/pro line `11 → 13`,
    detail line `12 → 14`, notes `12 → 13`, status select +
    "Reply via clubhouse" `11/12 → 13`, card padding bumped.
  · **ClubhouseInboxAdmin** (Comms → Clubhouse Messages) — topic
    header `14 → 16`, thread count `11 → 13`, starter primary
    `13 → 15`, preview `11 → 13`, timestamp `10 → 12`.
  · **MemberPostsAdmin** (People → Moderate Posts, bulletin +
    partner tabs) — title `14 → 16`, category/author `11 → 13`,
    body `12 → 14`, action links `11 → 13`, tab labels `12 → 13`,
    date chip `10 → 12`.
  · **NotificationsAdmin** (Broadcasts → Push Broadcasts history)
    — title `14 → 16`, body `12 → 14`, "Sent" timestamp `10 → 12`,
    Compose button `12 → 13`.
  · **SuperAdminsAdmin** (Platform → Super Admins) — admin row
    primary `13 → 15`, secondary `11 → 13`, Remove link `11 → 13`,
    promote button `13 → 14`, member-pool primary `13 → 15`,
    secondary `11 → 13`, Promote link `11 → 13`.
  · **AllClubsAdmin** (Platform → All Clubs) — back link `12 → 13`,
    subtitle `11 → 13`, list count `12 → 13`, new-club button
    `12 → 13`, row primary `14 → 16`, row secondary `11 → 13`,
    color-swatch initial `13 → 15`, chevron `14 → 16`.
  · **GuestList** (People → Guest Settings) — heading `14 → 16`,
    search box `13 → 14`, filters `12 → 13`, count `11 → 13`,
    guest row primary `13 → 15`, secondary `11 → 13`, card
    padding bumped.
  · **Row primitive** (key/value used by GuestList detail) —
    key `11 → 13`, value `12 → 14`.
  · **ProvisionLogAdmin** (Platform → Provisioning Log) — intro
    `12 → 13`, Subdomain Health title `13 → 15`, secondary
    `11 → 13`, health-result name `13 → 15`, hostname/status
    `10 → 12`, "Run health check" button `12 → 13`, Re-provision
    button `11 → 12`, count `11 → 13`, filter `11 → 13`, attempt
    primary `14 → 16`, attempt secondary `11 → 13`, timestamp +
    HTTP code `10 → 12`.
  · **DetailRow primitive** (key/value used by ProvisionLogAdmin's
    expanded attempt) — label `10 → 12`, monospace value
    `11 → 13`.

  Status badges + urgency chips stay at the intentionally compact
  `9pt` — they read as colored shapes more than as text. Every
  bump is ~2pt so cards don't suddenly tower; same approach as
  v0.12.6.

  Member-facing screens untouched — this pass is admin-only.

- **v0.12.7** — Fix: kitchen reply (and "Your order is ready") didn't push.

  Marc's report: "the replies from the kitchen are not sending
  notifications. the message goes, but no notification." Diagnosis
  unwound to a layered bug across three vintages of the code:

  **What was happening.** send-push v7's thread-message flow
  loaded `thread_participants` for the message's thread, filtered
  out the sender's user_id, and pushed to whoever remained. For
  ORDER threads, the auto-create trigger `fn_order_thread_create`
  only adds the order's MEMBER as a participant — no staff side.
  That made three real cases all collapse to "0 recipients":

  · **Staff = member auth.uid (multi-hat).** Marc is super_admin
    + a member of Clinton CC at the same auth.uid. His staff
    reply: sender = his_uid, participants = [his_uid], filter
    excludes the only entry → 0 recipients → no push.

  · **Non-member staff replies in a real club.** participants =
    [member], sender = staff_uid; filter keeps the member → push
    fires. ✅ (This branch actually worked. v0.12.7 doesn't change
    it — but the v8 logic still makes it more robust.)

  · **v0.10.18 "Your order is ready" canned message.** Inserted
    with `sender_user_id = thread.created_by` (the member's
    user_id) → participants = [member], filter excludes member
    → 0 recipients → no push. **This had been silently broken
    since v0.10.18 shipped** — the message landed in the inbox
    but never fired to the lock screen.

  **Fix (two parts):**

  · **send-push v8 deployed.** For `thread.kind === 'order'`,
    derive the sole recipient as the order's MEMBER (via
    `thread.created_by` — which the create trigger sets to the
    member's user_id) and SKIP the sender filter. Other thread
    kinds (clubhouse, dm) keep the v7 participant-list +
    sender-filter logic unchanged. The order title was also
    upgraded so it can pick up the staff sender's name when
    that staff happens to be a member of this club ("<Club> ·
    Chef Sarah" instead of the generic "<Club> · Your order
    update").

  · **Canned message marked as system.** `setStatus` flipping
    an order to `ready_for_pickup` now inserts the "Your order
    is ready at the clubhouse." row with `sender_user_id: null`
    and `is_system: true` — matching the other status-flip
    system messages ("Order placed", "Order delivered", "Order
    cancelled", "The kitchen is preparing"). With v8 deployed,
    this fires a push too.

  **Why the bug never surfaced earlier.** Order-thread pushes
  are the lowest-volume push surface (most members don't sit on
  the order screen waiting for a "ready" ping — they walk to
  the clubhouse on their own timing), so the silent failure
  could persist for a year without a member writing in about a
  missing notification. The v0.12.1 kitchen reply put the
  failure on a more visible surface — Marc noticed within a
  day of shipping.

  No schema change. send-push deploy version 11 (code v8) is
  live in the Edge Function for the Country Club project.

- **v0.12.6** — Admin card typography pass (closes the long-standing Task #42).

  Marc's screenshot showed News list cards on the desktop admin
  sidebar reading at ~13/11pt primary/secondary — fine on mobile,
  too small on a 27" monitor. Pass bumps every CRUD/queue/list
  card the manager reads in the office:

  · **CrudSection rows** — primary `13 → 15`, secondary `11 → 13`,
    row padding `10/14 → 13/16`, chevron `14 → 16`. Affects News,
    Push Broadcasts, Sponsor Banners, Hole Sponsors, Menu Items,
    Pro Shop Items, Lesson Pros, Holes, Member Guide, and every
    other CrudSection-backed admin list (single source of truth
    bump covers them all in one edit).

  · **FoodOrdersAdmin queue cards** — member name `14 → 16`,
    `#` badge `12 → 13`, "Placed" timestamp `11 → 13`, item list
    `12 → 14`, Total `13 → 15`, card padding `12/14 → 14/16`.

  · **EventRegistrationsAdmin accordion (Comms inbox_rsvps)** —
    event title `14 → 16`, secondary `11 → 13`, registrant
    primary `13 → 14`, registrant secondary `11 → 12`, padding
    bumped to match. Spots Remaining badge keeps its compact
    chip size — color is the signal.

  · **EventsAdmin lists** — standalone title `13 → 15`, secondary
    `11 → 13`. Recurring-series header title `13 → 15`, summary
    `11 → 13`, expanded occurrence row `12 → 14`.

  Status chips and metadata badges keep their intentionally
  compact `9pt` sizing — those read as colored shapes more than
  as text. Bumps are measured: ~2pt across the board so cards
  don't suddenly tower over the desktop layout but every line of
  reading copy gets noticeably more legible at desktop viewing
  distance.

- **v0.12.5** — Food order pickup-time picker → manager-toggleable flag.

  Marc's feedback: most clubs treat the pickup-time picker as
  noise — orders just fire whenever the ticket bubbles up. New
  flag `food_pickup_time` in the Features catalog under Dining,
  **default off**. When off, the "When would you like to pick
  up?" / "When would you like to be seated?" picker section is
  hidden on the order screen; orders submit with
  `requested_pickup_time = null`, which the kitchen queue
  already renders as "ASAP" (the v0.10.18 to-go/eat-in pivot
  added the null fallback). Clubs running a tighter pickup
  operation (call-ahead window, beverage-cart sequencing) flip
  it on from Admin → Club Settings → Features.

  No migration needed. The flag-resolution chain
  (tier-lock → platform-lock → club override → catalog default)
  means any club without an explicit `feature_flags.food_pickup_time`
  override falls back to the catalog default of false. Every
  active club gets the picker hidden on next refresh; opt-in is
  one toggle for any club that wants it back.

- **v0.12.4** — Phase 13 closeout (README refresh + phase index update).

  README refreshed at the v0.12.x minor: intro paragraph updated to
  the v0.12.4 / Phase 13 vintage; new **🍳 Operational Polish
  (Phase 13)** feature-inventory section above Phase 12 v2 covers
  Food Orders → Dining, generic sidebar badge logic, Daily Ops
  workspace shift, the Event RSVPs accordion, the Kitchen reply
  composer, the swipe + bulk-select notification dismissal +
  Undo snackbar, and the weekly interval recurrence picker. Area
  ordering list updated so Communications no longer claims Food
  Orders and Dining lists Food Orders as its landing section.
  `src/lib/version.js` phase history block expanded to a
  per-patch summary now that all five Phase 13 patches have
  shipped.

  No member-visible code change; this commit is documentation +
  the version bump that pins the phase as closed.

- **v0.12.3** — Event recurrence: weekly interval (biweekly + every-N-weeks).

  Weekly recurring events get a new **Every [N] week(s) on
  [weekday]** picker in the EventEditor. Default is N=1 (the
  back-compat path — identical to the v0.9.12 "Weekly on the
  same day" behavior). N=2 gives biweekly board meetings,
  weekly leagues that play every other week, ladies' golf night
  on a two-week cadence; N=3 / N=4 handle "every three weeks"
  socials and 4-week recurring tournaments where the
  monthly_first/_nth rules would misalign with the actual
  series cadence.

  Capped at **MAX_WEEKLY_INTERVAL = 12 weeks** (~quarterly) so
  the picker stays scannable and a stray click can't insert a
  52-row "every 52 weeks" series. The hard MAX_OCCURRENCES = 52
  cap from v0.9.12 still applies — with N=2 + a one-year end
  date, the series materializes to ~26 rows.

  Pattern description line below the picker spells out the
  cadence ("Pattern: every 2 weeks on Tuesday.") before the
  occurrence-count preview so a manager can verify the rule
  before they commit the multi-row insert.

  No schema change — events stay materialized into one row per
  occurrence with a shared `recurrence_group_id`. The N-week
  interval is purely a parameter to `generateOccurrences()` at
  create time; the materialized rows look identical to
  hand-entered events on the calendar (dow, day_num, date_label
  all denormalized as usual).

- **v0.12.2** — Notification dismissal: swipe + bulk-select (never hard-deletes).

  Two new affordances on top of the existing per-row X + confirm
  modal:

  · **Swipe a row left to dismiss.** Translates over a red
    "Dismiss" rail; releasing past the 90px threshold commits the
    dismiss, releasing short of it springs back. Direction is
    locked after 8px of motion so a vertical scroll doesn't get
    misread as a swipe. Click is suppressed when a swipe was
    detected so a near-threshold spring-back doesn't also open
    the item.

  · **Select / bulk-dismiss mode.** A `Select` toggle in the
    inbox sub-header turns row taps into selection toggles
    (checkbox replaces the unread dot, no layout jitter). A
    sticky bottom bar shows `N selected · Cancel · Dismiss N`.
    One call dismisses everything in the set — threads and
    notifications run in parallel against their own bulk helpers
    (`hideThreads`, `hideNotifications`).

  Every dismiss path — swipe, bulk, even the existing X +
  confirm — surfaces an **Undo snackbar** for 5 seconds.
  Tapping `UNDO` restores the dismissed items via the new
  `unhideThread` / `unhideNotification` helpers (set
  `hidden_at = null`). The realtime subscription on the inbox
  feed re-renders instantly.

  Per Marc's "dismiss from view only" rule, **nothing is ever
  hard-deleted from the database.** Dismiss just toggles
  `hidden_at` on `notification_reads` (for broadcasts) or
  `thread_participants` (for threads). The admin's broadcast
  list still shows every notification ever sent, and the
  existing trigger that clears `hidden_at` when a new message
  arrives keeps working so a dismissed thread resurfaces on
  the next reply.

  No migration — `notification_reads.hidden_at` and
  `thread_participants.hidden_at` were already in the schema
  from the v0.6.x dismissal work; v0.12.2 only adds bulk +
  swipe + undo on top.

- **v0.12.1** — Kitchen reply on Food Orders queue.

  Each active order card now has a **Reply** button next to the
  status select. Open it inline → textarea + Send → the kitchen's
  message lands in the member's inbox + fires a push notification
  with the staff sender label ("Chef Sarah · …"), reusing the
  send-push pipeline from v0.10.9 and the per-order thread the
  database creates on order insert.

  Why it matters: the round-trip used to be "kitchen flips status
  to ready_for_pickup → member gets a canned 'your order is ready'
  push." Anything beyond that (out of an ingredient, swap the side,
  push back pickup 10 min) required calling the member or hoping
  they checked back. Now the kitchen replies in-place from the same
  card they're already touching for status. The composer auto-
  clears + collapses on send and shows "Message sent ✓" for 2.5s
  so the operator knows the message went out without losing their
  place in the queue.

  No schema change. The reply posts into the existing
  `threads` row (`context_table='food_orders'`, `context_id=order.id`)
  with `sender_user_id = current staff auth.uid()`, so the existing
  `fn_send_push_on_message` trigger fires the push automatically.

- **v0.12.0** — Phase 13 opens: Food Orders → Dining + Event RSVPs accordion.

  Two restructures land together because they both reshape the
  admin nav around what the day-of operator actually needs:

  · **Food Orders moves to Dining.** `inbox_food` was a
    Communications sub-queue since v0.9.4 — the right home when
    it was the only realtime order-of-business view we had. But
    once Comms grew to seven sub-queues, the day-of kitchen view
    was buried two clicks away from the menu CRUDs it actually
    lives next to. A new `dining` area now groups Food Orders +
    Menu Categories + Menu Items, with Food Orders as the
    landing section. Section ID stays `inbox_food` so
    workspaces, dashboard tiles, useCommsUnread counts, and
    saved per-(user, club) layouts continue to resolve.

  · **Event RSVPs accordion (Comms inbox_rsvps).** Was a flat
    reverse-chronological list of every registration ever made.
    Restructured into a collapsed-by-default inline accordion
    grouped by event. Each event row shows title, event date,
    registered count (counting guests against capacity), and a
    Spots Remaining badge — "Full" (red) when capacity is hit,
    "N left" (amber) when ≤3 spots open, "N left" (green)
    otherwise. Click an event to expand and see the registrant
    list with the same status pill + status dropdown as before.
    Sort is by most-recent registration descending so the events
    with new RSVPs surface first.

  Supporting changes:

  · **Generic sidebar badge logic.** `AdminLayoutDesktop` was
    Comms-special-cased: only the `inbox` area summed its
    sections' unread counts. Now every area sums whatever
    sections' counts exist in `commsUnread.counts`, so Dining's
    Food Orders count surfaces in the Dining area badge with no
    further config.

  · **Daily Ops workspace updated.** The seeded `default_daily`
    workspace now expands `dining` and lands on `inbox_food`
    instead of `inbox`. Existing per-(user, club)
    `admin_preferences` overrides are untouched — only the
    seed default is changed.

  No migration. The `event_registrations` query gains
  `events.spots` for the capacity badge.

- **v0.11.37** — Fix: service worker silently dropped broadcast pushes.

  The final piece of the v0.11.34 urgent-push saga. Even after the
  Edge Function correctly delivered broadcasts to the push services
  (`{sent: N, failed: 0}`), Marc's phone showed nothing while food
  orders pushed fine.

  Root cause in `/public/sw.js`:
  ```js
  tag: payload.data?.threadId || undefined,
  renotify: true,
  ```

  The Web Push spec says `renotify: true` REQUIRES `tag` to be set.
  Setting `renotify: true` with `tag: undefined` causes
  `showNotification()` to throw a TypeError — and the resulting
  promise rejection in `event.waitUntil(...)` silently drops the
  notification without surfacing the error.

  Thread messages (food orders, clubhouse, DMs) always have a
  `threadId` so `tag` was always defined — they worked. Broadcasts
  carry `data.broadcastId` + `data.kind` but no `threadId` — so they
  hit the undefined path and showed nothing.

  Fix: `tag` now falls back through several candidate identifiers:
  `threadId → broadcastId → kind → 'general'`. Never undefined,
  spec contract honored, push always displays.

  **Important — service worker update requires page reload.**
  Service workers don't hot-replace; the new sw.js takes effect on
  next page load + reload. On Android Chrome, close the PWA, reopen
  it, then send a test broadcast. On a stuck cache, force-update via
  Chrome's `chrome://serviceworker-internals` page or uninstall +
  reinstall the PWA.

- **v0.11.36** — Grounds platform mark + admin identity in sidebar.

  Two visual additions to the desktop admin sidebar:

  · **Grounds platform mark at the top.** Small `/grounds-icon.png`
    + "The Grounds" wordmark in a row, sitting above the
    `CLINTON · ADMIN` eyebrow. Establishes the platform identity
    before the club-specific identity. Brass-tinted typography so
    it reads as the layer above without competing visually with
    the club's primary nav. Soft divider underneath separates it
    from the "Manage your club" heading.

  · **Profile photo for the signed-in admin.** Replaces the
    text-only "SIGNED IN AS / Marc Abla" footer block from v0.11.16
    with a 36px circular Avatar next to the name + eyebrow. Uses
    the existing `Avatar` component — `members.photo_url` if on
    file, falls back to a brass initial-circle if not. Important
    when a manager and super_admin share a workstation: at a glance
    you can see whose session is active without reading the name.

  Mobile admin shell unchanged — it has its own header and wasn't
  in scope for this patch.

- **v0.11.35** — Bug pair: RSVP spots countdown + menu item price input.

  **Bug 1: Spots remaining doesn't count down after RSVP.**
  `events.spots` is a static "capacity" column that never gets
  decremented. The Event Detail screen was reading it directly,
  so the line "X spots remaining" stayed at the original capacity
  even after RSVPs landed.

  Fix: `useEvents` hook now joins to `event_registrations`,
  counts the registered rows per event in JS, and returns
  `spots = capacity - registered_count`. Original capacity moves
  to `spotsTotal`; waitlist count exposed as `waitlistCount` for
  any future tile. Realtime subscription on `event_registrations`
  added so the count updates live across other open sessions.

  Event Detail screen mirrors `ev.spots` into a local `displaySpots`
  state so this user's RSVP immediately decrements the displayed
  number (the prop snapshot from navigation is otherwise stale).

  Also fixed: the RSVP insert never set `status`, so the
  `status='registered'` column default applied even when the
  "Join Waitlist" path was taken — silently overbooking events.
  Now explicit: `spots > 0` → `registered`; `spots == 0` →
  `waitlist`. The button label already showed the right action;
  the underlying write was the bug.

  **Bug 2: Double dollar sign + bad decimals on menu item prices.**
  `menus.price` was a TEXT column with a free-form text input.
  Admins typed inconsistently: some `$10.99`, some `10.99`, some
  `2.5` (missing the trailing zero), some `Market` (legacy free-form).
  Member-facing display rendered the raw stored value, producing
  things like `$$10.99` when the displayer prepended a `$` too.

  Fix in three parts:
  · **CrudSection** `money` type now stores as a 2-decimal STRING
    (`"12.50"`) instead of a JS Number, so values round-trip
    correctly through TEXT columns. HTML `type="number"` already
    blocks `$` and letters at the browser level; `onBlur` always
    formats to `n.toFixed(2)`.
  · **MenuItemsAdmin** field switched from `type: 'text'` (free-form,
    label "Price (display string)") to `type: 'money'` (strictly
    numeric, label "Price"). The secondary line in the admin list
    formats numbers as `$X.YY` and renders legacy `Market`-style
    strings raw until the manager edits the row.
  · **Migration 66**: data normalization. Existing values cleaned
    in-place: `'$10.99' → '10.99'`, `'$12' → '12.00'`, `'2.5' →
    '2.50'`, `'2.50' → '2.50'`, `'Market' → NULL`. Clinton's 17
    distinct menu prices all normalized successfully.
  · **FoodMenu** member screen now uses a `formatPrice` helper that
    parses the stored value and renders `$X.YY`. Legacy non-numeric
    strings still render raw as a graceful fallback.

  Pro Shop items (numeric column) inherit the CrudSection fix for
  free — they now also persist trailing zeros correctly (`$5.00`
  instead of `$5`).

  **Bug 3 not shipped here**: "Not Secure" warning. Source code is
  clean — no `http://` URLs anywhere in HTML/JSX/data. The cause
  is infrastructure (Cloudflare SSL config or a stale cert), not
  application code. Diagnostic checklist in chat.

- **v0.11.34** — URGENT fix: admin broadcasts now actually push to phones.

  Marc reported "urgent notification didn't push to phone." Diagnosis:
  the entire push pipeline for admin broadcasts didn't exist. The
  Composer (`NotificationsAdmin`) inserts to `notification_messages`;
  realtime updates open browser sessions; the in-app inbox feed
  picks it up. But there was NO trigger on `notification_messages`,
  and the `send-push` Edge Function explicitly required `thread_id`
  (only knew how to handle thread messages from the messaging
  pipeline). Result: every "Push Broadcast" Marc ever sent landed
  in-app only — never pushed to a single phone.

  **`send-push` Edge Function v7** (deployed). Now branches on
  `payload.table`:
  · `messages` → existing thread-message flow (unchanged).
  · `notification_messages` → new broadcast flow:
    1. Fetch club name for the title prefix.
    2. Fetch all members of `club_id`, get their `push_subscriptions`.
    3. Build title: `<Club> · <broadcast title>`. Urgency=urgent
       gets a `🔔 URGENT ·` prefix.
    4. Body: first 140 chars of broadcast body.
    5. TTL by urgency: urgent 24h, high 12h, normal 4h (controls
       how long the push service holds the message for offline
       devices).
    6. `data.url` = `/inbox` so tap-through opens the inbox.
    7. Fan-out via `webpush.sendNotification`; prune stale endpoints
       (404 / 410) the same way the message flow does.

  **Migration 65** — two triggers + `fn_send_push_on_broadcast()`:
  · INSERT trigger: fires when `published_at IS NOT NULL` at insert
    time ("Publish now" toggle ON).
  · UPDATE trigger: fires when `published_at` transitions NULL →
    NOT NULL ("Save as draft" → later "Publish"). Editing an
    already-published row does NOT re-push.
  · `published_at IS NULL` drafts never push. Belt-and-suspenders:
    the Edge Function also checks `msg.published_at` and refuses
    if NULL.

  audience_filter (jsonb on `notification_messages`) is IGNORED in
  v7 — broadcasts go to every member of the club. Future patch can
  read the filter and narrow recipients.

  No client changes — `NotificationsAdmin`'s Composer already does
  the right thing; the gap was server-side end-to-end.

  Existing rows in `notification_messages` (Marc's earlier test
  sends) won't retroactively push. Marc should send a NEW broadcast
  to verify the pipeline.

- **v0.11.33** — Workspace tile re-assignments + role-based first-load defaults.

  Two related fixes for the "too many tiles, not curated" feeling:

  **1. Seeded workspaces now meaningfully cover the full 19-tile
  catalog.** When v0.11.30 + v0.11.32 added 15 new tiles, the
  v0.11.29 workspace `dashboardLayout` snapshots still only listed
  the original 4 — meaning a manager who applied "Daily Ops" got
  the 4 original tiles in workspace order, plus the 15 new ones
  appended at the end (per the "new tiles don't displace existing
  arrangement" rule). Net effect: applying any workspace gave you
  ALL 19 tiles, defeating the point of workspaces. Now each
  workspace lists 4-6 visible tiles + explicitly hides the rest:

  · **Daily Ops** → open_work, course_status_now, todays_events,
    order_velocity, active_guests, today_activity. Hides everything
    board/membership/comms — kitchen / pro shop morning sweep.
  · **Member Services** → pending_approvals, new_members,
    community_pulse, directory_completeness, recent_bulletin,
    today_activity. Hides ops / board / comms.
  · **Events** → upcoming_events, todays_events, community_pulse,
    top_screens, today_activity, badges_awarded. Hides ops / board.
  · **Broadcasts** → push_today, recent_news, trending_posts,
    top_screens, today_activity, community_pulse. Hides ops / board.
  · **Setup** → today_activity, engagement_score,
    directory_completeness, top_screens. Minimal — config focus.

  **2. Role-based first-load defaults.** Brand-new admin opens the
  dashboard, has never customized → no longer sees all 15-19 tiles
  dumped on the screen. New `DEFAULT_LAYOUT_BY_ROLE` map:

  · **manager / super_admin** (6 visible): today_activity, open_work,
    todays_events, pending_approvals, recent_news, community_pulse.
  · **staff** (5 visible): today_activity, open_work, todays_events,
    community_pulse, recent_news. (The 4 manager-only tiles are
    role-gated out of the catalog for staff regardless.)

  Used ONLY when both `dashboard_tile_order` AND
  `dashboard_hidden_tiles` are at their default "no preference"
  state (truly fresh visit). The moment the manager drags a tile,
  toggles "Manage tiles", or applies a workspace, their saved
  state takes over and never reverts.

  Per-(user, club) persistence remains unchanged — once a user
  customizes, they don't have to change it every login.

- **v0.11.32** — Eleven more dashboard tiles (Ops + Membership + Comms).

  Triples the dashboard's tile catalog from 8 → 19. Three new
  stakeholder groups now have dedicated tiles they can show, hide,
  and reorder per workspace.

  **Operations / GM (4):**
  · **Course Status Now** — Live open / limited / closed pills for
    every facility (course / bar / restaurant / kitchen / lounge),
    pulled from `club_status` joined to `club_facilities` for the
    display name. The "what's the club doing right now?" tile.
  · **Today's Events** — Events on the calendar with today's date,
    ordered by start time, with RSVP counts.
  · **Order Velocity** — Food orders placed today vs the club's
    30-day average orders/day. Spot when the kitchen is falling
    behind (or having a quiet shift).
  · **Active Guests** — Count of currently-valid guest passes
    (`status='active'` AND (`expires_at` IS NULL OR > now)). Sub-card
    flags how many expire in the next 3 days.

  **Membership / Board (4) — minRole: `manager`:**
  · **Membership Snapshot** — Total members, active vs pending
    breakdown, and 30-day growth count + percentage.
  · **Pending Approvals** — Member status='pending' list, ordered by
    sign-up date, with the count up top. The "who do I need to
    approve?" tile.
  · **Engagement Score** — % of active members who fired at least
    one event in `analytics_events` over the last 7 days. Color-coded
    threshold (≥60% green, 30-59% brass, <30% red). The board's
    health-of-the-app single-number tile.
  · **Directory Completeness** — Data-hygiene tile. Two bars
    showing % of active members with profile photo on file + % with
    email on file. The membership coordinator's "what's missing"
    tile.

  **Communications / Marketing (3):**
  · **Push Notifications Today** — Count from `notification_messages`
    sent today (00:00 local-to-server forward), plus the 3 most
    recent titles + times. Send-cadence visibility.
  · **Recent News** — Last 3 published news articles (`news` table,
    `published_at IS NOT NULL`) with headline, category, and date.
  · **Top Trending Posts** — Top 3 posts by reply count in the last
    7 days, across the polymorphic `post_replies` table. Joins back
    to `bulletin_posts` / `partner_posts` / `events` for titles via
    a small in-tile fan-out. The "what's the community talking
    about?" tile.

  **Role gating** — the four Membership / Board tiles declare
  `minRole: 'manager'` so they're hidden from base-tier
  `club_admin` users (whose role doesn't grant manager-level
  insights). The other seven are `staff` (anyone with admin
  access).

  Default workspaces NOT updated to seed the new tiles — they'll
  land in the "all visible at end" position per v0.11.28's "new
  tiles append" semantics, so each manager's existing arrangement
  is preserved.

  Also: fixed lingering `G.cls` → `G.clsDot` references (`G.cls`
  doesn't exist; was rendering as no-color in the negative-delta
  paths of two existing tiles, and in two of the new ones).

- **v0.11.31** — Phase 12 v2 closeout (docs).

  Closes the v0.11.13–31 sub-phase. No runtime changes — docs only:

  · **README.md** — Current version bumped to `v0.11.31 (Phase 12
    v2 complete)`. New "Hybrid Analytics + Admin Dashboard" feature
    inventory section covering the analytics_events table + dual-
    write hook, dashboard aggregation RPCs, the 8-tile catalog,
    drag-and-drop + show/hide + role-gating mechanics, per-workspace
    dashboardLayout snapshots, the seeded workspaces with role-tuned
    tile orders, and the DashboardErrorBoundary. Repo-layout tree
    updated with AdminDashboard.jsx and DashboardErrorBoundary.jsx.
  · **version.js** — phase index entry expanded to cover v0.11.13–31
    as "Phase 12 v2" (kept inside the v0.11.x line rather than
    bumping to v0.12.x because the work is layered on Phase 12's
    desktop shell, not a separate architectural lift).

  Phase 12 in one paragraph (final): managers no longer type into
  320px inputs in the office. The desktop admin landed at v0.11.0,
  got polished through v0.11.12 (sidebar, search, tables, side
  panels, workspaces, dark mode, keyboard shortcuts), then in v2
  (v0.11.13–31) picked up a phone-frame escape so the desktop
  shell actually has room to render, a /admin deep-link entry,
  the accordion sidebar UX, a typography pass tuned for reading
  distance, default seeded workspaces, hybrid GA4 + Supabase
  analytics, and a flexible per-workspace AdminDashboard as the
  desktop landing. Eight tiles ship; more can be added by extending
  TILE_CATALOG. Per-workspace layouts mean a manager who wears
  multiple hats (kitchen lead in the morning, GM in the afternoon)
  gets a different dashboard arrangement per hat.

  Phase 13 will start rolling individual admin sections (Members,
  Orders, RSVPs, Badges) onto the v0.11.3-shipped `AdminTable` +
  v0.11.4 `SidePanel` primitives so the desktop shell stops *only*
  being a navigation reskin and starts giving managers the dense,
  scannable tables that motivated the phase in the first place.

- **v0.11.30** — Four more dashboard tiles.

  Doubles the dashboard's tile catalog from 4 → 8. Each tile is
  self-contained with its own supabase query against existing
  tables — no new RPCs, no schema changes.

  · **Upcoming Events** — Next three events on the calendar
    (`event_date >= today`) with RSVP counts via PostgREST's
    nested-aggregate shorthand (`event_registrations(count)`).
    Date displayed as month + day-number for fast visual scanning.
  · **New Members This Week** — Count of members joined in the last
    7 days, plus the 5 most recent names. Big number up top, names
    below with join dates.
  · **Badges Awarded Recently** — Last 5 badge awards across the
    club, with the shield-shape clip-path mini-badge in the badge's
    color + member name + award date. Reads from `member_badges`
    joined to `members.name` + `badges.name/color/club_id`;
    filtered client-side to this club's badges.
  · **Recent Bulletin Posts** — Last 5 posts on the bulletin board,
    with title (or first 50 chars of body if untitled), author name,
    and date. Reads `bulletin_posts` joined to `members.name`.

  All four tiles use the standard staff role gate. They appear at
  the end of the manager's existing layout on first visit (per
  v0.11.28's "new tiles append" semantics) — no displacement of
  existing arrangement.

  Default workspace layouts NOT updated to include the new tiles —
  they'd land in the "all visible at the end" position when a
  workspace is applied without `dashboardLayout`. A manager can
  reorder them and "Update '<workspace>' with current view" to
  bake the new tiles into their workspace.

  Push CTR tile (originally planned) deferred — needs `push_opened`
  event instrumentation in the service worker (`/sw.js`) which is
  out of scope for this patch.

- **v0.11.29** — Per-workspace dashboard layouts.

  Workspaces now carry an optional `dashboardLayout: { order, hidden }`
  snapshot that's applied/captured alongside the existing `expanded`
  area + `lastSection` fields. Apply a workspace → the dashboard
  flips to that workspace's tile order + hidden set in one click.

  **Architecture:**
  · `dashboard_tile_order` + `dashboard_hidden_tiles` admin_preference
    state lifted from `AdminDashboard` up to `AdminLayoutDesktop`.
    The dashboard reads + writes via props now; the persistence hooks
    live in the parent so the workspace switcher can share the same
    state.
  · `AdminWorkspaceSwitcher` gains a `dashboardLayout` prop. Its
    `saveCurrentAs` / `updateActive` snapshot it into the workspace.
    Its `applyWorkspace` pushes it back via `onRestore`. Legacy
    workspaces saved before v0.11.29 don't carry the field; applying
    them leaves the user's current dashboard prefs alone (no overwrite).
  · `AdminLayoutDesktop`'s `onRestore` callback handles the
    `dashboardLayout` field by calling `setDashboardTileOrder` and
    `setDashboardHidden` — same write path as the user's manual edits.

  **Default workspaces seeded with sensible per-role layouts:**
  · **Daily Ops** — Open Work first (kitchen / pro shop scan), then
    Today's Activity, Community Pulse, Top Screens.
  · **Member Services** — Community Pulse first (member touchpoints),
    then Today's Activity, Top Screens, Open Work.
  · **Events** — Top Screens first (which event surfaces are pulling
    eyeballs), then Community Pulse, Today's Activity, Open Work.
  · **Broadcasts** — Today's Activity first (audience size before
    send), then Top Screens, Community Pulse, Open Work.
  · **Setup** — Today's Activity + Top Screens only; Open Work and
    Community Pulse hidden (this is the configuration hat, not the
    operations one).

  The order semantics give the manager a different "first scan
  field" for each hat. Custom workspaces the manager creates can
  capture any arrangement.

  Trade-off: applying a workspace overwrites the user's per-club
  dashboard prefs (same model as `sidebar_open_area`). This means
  the dashboard "follows the last workspace" — predictable
  consistency over "workspace as overlay" complexity.

- **v0.11.28** — Dashboard drag-and-drop + "Dashboard" sidebar item.

  Two features land together:

  **1. Always-visible Dashboard link in the sidebar.** Sits above
  the area accordion as the first sidebar item. One click clears
  `area` + `sec` and returns to the root state = dashboard landing.
  Selected styling (brass left bar + cream background) mirrors the
  section rows. Custom icon (4-pane grid SVG) signals "overview" vs
  the section icons. Always visible regardless of role or workspace.

  **2. Drag-and-drop tile reorder via `@dnd-kit`.** Each tile gains a
  6-dot grip handle in its top-right corner. Drag from the grip to
  reorder; the rest of the tile stays click-interactive (so future
  clickable tile contents work fine). Visual feedback during drag:
  brass border, 0.85 opacity, drop shadow, z-index 10.

  Persistence:
  · New admin_preference `dashboard_tile_order` — list of visible
    tile IDs in display order, per (user, club).
  · `useAdminPreference` default is `null`; falls back to the
    catalog's natural order when no row exists.
  · Reorder computation: take the saved order, drop hidden tiles +
    tiles the manager doesn't have role access to, then append any
    visible-not-already-listed tiles at the end (so new tiles added
    in a future patch land at the end of the manager's existing
    layout — they don't displace their current arrangement).

  `PointerSensor` activation requires 6px of pointer movement before
  the drag engages, preventing accidental drags on simple clicks.

  **Per-workspace dashboard layouts** are deferred to v0.11.29 (will
  add a `dashboardLayout` field to each workspace and surface
  "Save current layout to '<workspace>'" on the workspace switcher).
  For now, the layout is per (user, club) — your tile order follows
  you across workspaces at the same club.

- **v0.11.27** — Fix: dashboard duplicated `useCommsUnread`
  subscription (THE black-screen root cause).

  Identified by reading Marc's console at v0.11.26:
  ```
  Uncaught Error: cannot add `postgres_changes` callbacks for
  realtime:comms-unread:<club-id> after `subscribe()`.
  ```

  Two places were calling `useCommsUnread(club?.id)` with the same
  club id:
  · `AdminPanel` — for the sidebar area badges (passed down to
    `AdminLayoutDesktop` as a prop)
  · `OpenWorkTile` inside `AdminDashboard` — second instance, same
    channel name (`comms-unread:<club-id>`)

  Supabase reuses the underlying channel by name. When the second
  instance's `useEffect` tried to attach its own `postgres_changes`
  callbacks AFTER the first instance had already called
  `.subscribe()`, Supabase threw — and the throw fires from inside
  a `useEffect`, which is **the one React error category that
  ErrorBoundary cannot catch**. The unhandled exception killed the
  React tree and rendered the page background through, producing
  the v0.11.22 (and v0.11.26) black screen.

  Why v0.11.26's error boundary didn't save us: per React docs,
  error boundaries catch errors in: rendering, lifecycle methods,
  constructors. They **do not** catch errors in: event handlers,
  asynchronous code (setTimeout etc.), server-side rendering, or
  **errors thrown in the error boundary itself**. `useEffect`
  callbacks fall into the "asynchronous" bucket.

  Fix:
  · `AdminDashboard` now takes `commsUnread` as a prop instead of
    calling the hook internally.
  · `AdminLayoutDesktop` passes the existing `commsUnread` (already
    owned by `AdminPanel`) down through the error boundary.
  · `OpenWorkTile` reads `commsUnread.counts` from props directly.

  One subscription, two consumers. No more channel collision.

  The error boundary from v0.11.26 STAYS in place — still useful
  as a safety net for any future render-phase crash (e.g. a tile
  hitting an undefined theme token), even though it didn't catch
  this specific class of bug.

- **v0.11.26** — Re-wire AdminDashboard as landing, with ErrorBoundary.

  Now that v0.11.25 fixed the silent upsert failure on
  `admin_preferences` (the most likely root cause of the v0.11.22
  black-screen crash), re-mount the dashboard as the desktop landing.
  Safety net: a class-based `DashboardErrorBoundary` wraps the
  dashboard so any future render-time crash falls back to a stripped
  empty state instead of blanking the whole admin.

  **`src/components/DashboardErrorBoundary.jsx`** — React only
  supports error boundaries via class components. Catches errors via
  `getDerivedStateFromError` + `componentDidCatch`, logs the error
  + componentStack to console (so a future crash is identifiable
  immediately from DevTools), and renders the `fallback` prop until
  the consumer bumps `resetKey`.

  **`AdminLayoutDesktop`** — root state (no area, no section) now
  renders:
  ```
  <DashboardErrorBoundary fallback={<DesktopEmptyState …/>}>
    <AdminDashboard />
  </DashboardErrorBoundary>
  ```
  The area-selected-but-no-section state still renders the existing
  "Pick a section under <area>" empty state directly.

  Expected outcome: dashboard mounts cleanly because the
  `useAdminPreference('dashboard_hidden_tiles', [])` upsert that
  was looping/failing in v0.11.22 now has a constraint to resolve
  against. If a different bug surfaces, the boundary catches it +
  Marc sees a console error pinpointing the offending tile.

- **v0.11.25** — Server fix: admin_preferences silent upsert failures.

  Migration 64 — Adds the long-missing UNIQUE constraint to
  `admin_preferences`. Migration 61 (v0.11.6) only declared
  `PRIMARY KEY (id)`; every `useAdminPreference` upsert through
  PostgREST's `?on_conflict=user_id,club_id,key` returned 400
  because PostgreSQL had no matching constraint to resolve against.

  The failure was **silent at the JS layer** — the Promise rejection
  was caught and discarded — so the bug stayed invisible across
  every Phase 12 preference: `sidebar_collapsed`, `sidebar_open_area`,
  `last_section`, `theme`, `workspaces`, `active_workspace`,
  `dashboard_hidden_tiles`. Every "leftover state" issue we chased
  (sidebar staying expanded after toggle, theme not persisting
  cross-club, workspaces feeling unreliable) traces back here. Reads
  worked fine; writes silently dropped on the floor unless they were
  the very first write for that (user_id, club_id, key) tuple.

  Fix: `UNIQUE NULLS NOT DISTINCT (user_id, club_id, key)` — the
  `NULLS NOT DISTINCT` clause (PG 15+) treats NULL `club_id` rows
  (cross-club preferences like theme + workspaces) as equal for
  uniqueness purposes. A standard UNIQUE constraint would have
  allowed duplicate `(user_id, NULL, key)` rows, defeating the
  upsert for cross-club preferences specifically.

  Migration also dedupes any accidental duplicates that leaked
  through the unconstrained period — keeps the most-recently-updated
  row per (user_id, club_id, key) tuple, deletes the rest.

  **No JS changes** — the upsert code in `useAdminPreference` was
  already correct; it just had no constraint to anchor on. After
  this migration, every Phase 12 preference now persists reliably.

- **v0.11.24** — Fix: comms-unread 400 on `event_registrations`.

  The v0.11.20 `useCommsUnread` redesign hardcoded `created_at` as
  the "since lastViewed" timestamp column for every activity-feed
  table. But `event_registrations` uses `registered_at` (predates
  the unified-naming convention) — so every admin page-load fired a
  HEAD query against `event_registrations` with `?created_at=gt.…`
  and got back a 400 from PostgREST. Silent at the JS layer
  (HEAD-count failure is swallowed by the `await`-then-`count || 0`
  pattern), but noisy in the Network panel.

  Fix: `cSince` now takes a per-table `tsColumn` parameter. Callers
  pass `'registered_at'` for `event_registrations` and `'created_at'`
  for `guests` + `threads`. No schema changes.

  Unrelated to the v0.11.22→v0.11.23 black-screen hotfix — that was
  a render-time crash in the dashboard wiring. This 400 has been
  firing since v0.11.20 and just stayed unnoticed until Marc
  inspected the Network tab.

- **v0.11.23** — HOTFIX: unwire AdminDashboard from the desktop landing.

  Marc reported the admin screen going black after v0.11.22 landed
  the AdminDashboard as the default desktop landing. Symptom is the
  classic React-tree-unmount: a render-time exception in the
  dashboard component bubbles up, React unmounts the subtree, and
  the underlying `#0C100C` html/body background shows through the
  phone-frame container.

  Quick fix: revert AdminLayoutDesktop's root state back to
  `DesktopEmptyState`. The `<AdminDashboard />` component still
  ships (the TILE_CATALOG, RPCs, and useAnalytics dual-write are
  all in place from v0.11.21/v0.11.22) — only the wiring as the
  landing page is reverted.

  Root cause needs identifying via browser console; will re-wire
  with a defensive error boundary in a follow-up patch so a tile
  crash never blanks the whole admin again.

- **v0.11.22** — AdminDashboard v1: tile framework + four tiles.

  The desktop admin's **root state** (no area + no section selected)
  now lands on a live dashboard instead of the generic "Pick a
  section" empty state. Closes task #41 (default landing screen).

  **Migration 63** — four `dashboard_*` aggregation RPCs:
  · `dashboard_dau_today(uuid)` — distinct active users today
    (members or anonymous user_ids), club-local timezone.
  · `dashboard_dau_yesterday(uuid)` — same, prior day (for delta).
  · `dashboard_dau_7d(uuid)` — `(day, dau)` rows for the last 7
    days, including zero-rows so the sparkline never has gaps.
  · `dashboard_top_screens_today(uuid, int)` — top N most-viewed
    screens today, grouped on `properties->>'screen'`.

  All RPCs are SECURITY INVOKER with `search_path` pinned. They
  respect the analytics_events RLS — a club_admin can only aggregate
  THEIR club's events.

  **`src/components/AdminDashboard.jsx`** — orchestrator + four
  inline tile components:
  · **Today's Activity** — DAU today, ↑/↓ vs yesterday delta,
    7-day sparkline (today's bar in brass, prior days in muted
    green). Sparkline x-axis labels with single-letter weekday.
  · **Open Work** — total of items needing action across food
    orders, lesson requests, pro shop inquiries (same numbers as
    the v0.11.20 sidebar badges, surfaced as a big visible card).
  · **Top Screens Today** — top 5 page_view screens with bars +
    counts. Reads from the RPC.
  · **Community Pulse** — bulletin posts + partner posts + event
    RSVPs in the last 7 days. Reads existing tables directly.

  **Tile framework:**
  · Tile catalog defined in `TILE_CATALOG` array — id, name,
    description, role gate (`staff` / `manager` / `super_admin`),
    component reference, grid size.
  · Role-gating: each tile declares the minimum role. Currently
    all four are `staff` (anyone with admin access); future tiles
    can be more restricted.
  · Show/hide via "⚙ Manage tiles" button in the header.
    Persisted as `dashboard_hidden_tiles` admin_preference
    (array of tile ids the manager has hidden). Per (user, club)
    via the existing useAdminPreference hook.
  · Layout is a fixed 4-column CSS grid for now. v0.11.23 layers
    drag-and-drop reorder + per-workspace persistence via @dnd-kit.

  **Wired in `AdminLayoutDesktop`:** at the root level (no area, no
  section), render `<AdminDashboard />`. When an area is selected
  but no section, the existing `DesktopEmptyState` ("Pick a section
  under <area>") still renders.

  Members on tablet + desktop start seeing the dashboard
  immediately; mobile shell unchanged (mobile users land on the
  area grid as before).

- **v0.11.21** — Hybrid analytics foundation (Migration 62 + dual-write).

  Opens the v0.11.21–25 build sequence for the flexible per-workspace
  admin Dashboard that lands as the desktop default.

  **The architecture decision in one paragraph:** GA4 stays alive
  exactly as it is for strategic value (ML audiences, BigQuery export,
  future marketing attribution, exploration UI). A parallel first-
  party event store lands in Supabase for the operational dashboard
  (per-club SQL queries, multi-tenant via RLS, sub-50ms response).
  The two layers have non-overlapping domains; useAnalytics.js fires
  to both in parallel. After ~13 hours of GA4 setup work that
  unblocked the API binding, this hybrid keeps that investment AND
  gives Marc the fast dashboard he wants.

  **Migration 62:** `analytics_events` table.
  · Columns: `club_id` (FK, RLS scope), `member_id` (nullable),
    `user_id` (auth.uid, nullable), `event_name` text,
    `properties` jsonb, `url_path`, `user_agent`, `ts`.
  · Indexes: `(club_id, ts desc)` for time-window queries,
    `(club_id, event_name, ts desc)` for "top screens" / "push CTR",
    `(club_id, member_id, ts desc)` partial for per-member DAU.
  · RLS — INSERT: any member/staff/guest of the club can insert
    events scoped to that club (forward-compat for guest analytics);
    SELECT: only staff of the club (or super_admin); no UPDATE /
    DELETE policies — events are immutable.
  · Grants: `select, insert` to `authenticated`. anon excluded.
  · Realtime: NOT subscribed (dashboard polls; per-event broadcasts
    would 10x the cost).

  **`src/lib/analytics.js`** — new `sendSupabaseEvent(supabase, …)`
  helper. Fire-and-forget insert; failures are silently swallowed
  so analytics NEVER block the member UX.

  **`src/hooks/useAnalytics.js`** — now dual-writes. Every
  `trackEvent` / `trackPageView` call fires to GA4 AND to the
  `analytics_events` table in parallel. Auth gate is identical
  (real member + non-guest + resolved club). `page_view` events
  store the screen id under `properties.screen`.

  PII policy unchanged: no names, emails, or membership numbers in
  event properties. `member_id` / `user_id` ARE stored on the
  Supabase side but as RLS-scoping FKs, not free-text identifiers.

- **v0.11.20** — Comms badge accuracy: split open-work vs activity-feed.

  Reported: Food Orders badge showed **4** but only **2** open
  orders existed in the queue. Root cause: `useCommsUnread` counted
  *every row created since the last viewed timestamp* across all
  six sub-queues. So a food order from yesterday already picked up
  still counted as "unread" until you toggled "Show completed" and
  viewed it — a semantic mismatch for the work queues.

  Redesigned the counting logic to split the six sub-queues into
  two semantic groups:

  **Open-work queues** (badge = items needing action, server-truth
  count, identical on every device):
  · `inbox_food` — food_orders in `{ pending, preparing,
    out_for_delivery, ready_for_pickup }` — kept in sync with
    `FoodOrdersAdmin`'s `ACTIVE_STATUSES`.
  · `inbox_lessons` — pro_shop_inquiries (kind=lesson) in
    `{ pending, contacted, scheduled }`.
  · `inbox_proshop` — pro_shop_inquiries (other) in the same set.

  **Activity-feed queues** (badge = items added since last viewed,
  per-device, unchanged from v0.9.4):
  · `inbox_guests` — new guest registrations.
  · `inbox_rsvps` — new event registrations.
  · `inbox_clubhouse` — new clubhouse threads.

  The mental model for the manager now matches: a work queue's
  badge equals what's actually in the queue waiting for them; an
  activity feed's badge equals what's new since they last looked.

  Also added UPDATE realtime listeners on `food_orders` and
  `pro_shop_inquiries` so a status flip (order → delivered, lesson
  → done) drops the badge **immediately** without requiring a page
  reload. Previously only INSERT events bumped the counter.

  No schema changes. localStorage `lastViewed` timestamps are still
  read for activity-feed queues; they're a harmless no-op for
  open-work queues. `markViewed` calls from sections are safe on
  both kinds.

- **v0.11.19** — Phase 12: Accordion sidebar (one area open at a time).

  The desktop admin sidebar now follows the **accordion** pattern
  used by Linear, Notion, and GitHub Settings: **at most one area
  group is expanded at any time**. Click an area to open it; that
  click automatically collapses whatever was previously open. Click
  the open area to close it. Default state = nothing open (clean
  table-of-contents view).

  This replaces the v0.11.x model that stored an array of
  collapsed-area-ids. That model had two flavors of bug:

  · "Muddy" intermediate states persisted across reloads. A manager
    who left two or three areas open during a session would refresh
    and see the same scrambled state next time — instead of the
    clean default. The fix attempts in v0.11.15 / v0.11.18 chased
    edge cases of "null vs empty array" semantics; the accordion
    model eliminates the entire category by reducing the state
    space to one variable.
  · Stale leftover state. Marc reported "menu still expanded after
    refresh" — his admin_preferences row held a workspace-applied
    array from earlier testing that re-hydrated on every load.

  **Mechanism:**
  · New preference key `sidebar_open_area` — stores a single area
    id string, or null = nothing open. Default null.
  · Old `sidebar_collapsed` rows are harmlessly orphaned. No
    migration; the new default behavior IS the cleanup.
  · `toggleAreaOpen(areaId)`: if it's already open → close
    (null); otherwise → switch to it.

  **Workspace schema update:**
  · `DEFAULT_WORKSPACES` (seeded defaults from v0.11.17) reshaped:
    each workspace now carries a single `expanded: 'areaId'` field
    instead of an array of every-other-area-id under `collapsed`.
    Cleaner, easier to read, and naturally matches the new model.
  · Custom (user-saved) workspaces saved via `saveCurrentAs` /
    `updateActive` now write `expanded` instead of `collapsed`.
  · Legacy custom workspaces with `collapsed` arrays still apply —
    the apply path uses `ws.expanded ?? ws.lastSection.areaId` so
    they land on a sensible "open the area we're navigating into"
    state.

  Workspace switcher prop API: `collapsed` → `expanded` (single id
  vs array). `onRestore` callback receives `{ expanded, lastSection }`
  instead of `{ collapsed, lastSection }`. Only one consumer
  (`AdminLayoutDesktop`) had to update.

  Trade-off lost: a manager can no longer have two area groups open
  side-by-side. That's the explicit point of the accordion pattern
  (less visual noise, easier mental model) — for a club admin with
  nine areas, having two open at once was a recipe for the muddy
  state Marc hit.

- **v0.11.18** — Phase 12 fix trio: search-bar click, collapse default, version chip.

  Three reported bugs in one patch:

  **1. Search bar click did nothing (only Cmd+K worked).** The
  `SearchTrigger` button in the top bar wired `onClick → setPaletteOpen(true)`,
  but `AdminSearchPalette` managed its `open` state internally with
  no prop API — so the parent's state was effectively dead. The
  Cmd+K listener inside the palette was the only thing that could
  actually flip it open. Converted `AdminSearchPalette` to accept
  controlled `open` + `onOpenChange` props (falls back to
  uncontrolled if not provided, for backward compat); the desktop
  shell now passes its `paletteOpen` state through. Both surfaces
  share the same open state — the trigger button, Cmd+K, and the
  result `onPick` callback all flow through one place.

  **2. Sidebar areas were rendering all expanded despite v0.11.15's
  collapse-by-default fix.** Root cause: when a stored
  `sidebar_collapsed` row contained an empty array `[]` (which could
  happen for users who landed during Phase 12 dev before the null
  sentinel was introduced), the v0.11.15 code treated `[]` as
  "explicit nothing collapsed" and rendered everything expanded.
  Fix: BOTH `null` and `[]` now fall back to the all-collapsed
  default. `toggleCollapse` also writes `null` instead of `[]` when
  the manager fully expands every area, so we never re-create the
  ambiguous empty state going forward. Trade-off: a manager who
  explicitly expands every area can't persist that state across
  reloads — but reaching that state requires 9 deliberate clicks
  against the new default, so it's not a real-world regression.

  **3. Version number not visible anywhere on desktop/tablet admin.**
  Mobile already shows `Powered by The Grounds · v{VERSION}` in the
  MyClub footer; the desktop admin shell had no such surface.
  Added a small attribution chip at the very bottom of the sidebar
  footer reading `The Grounds · v0.11.18`. Muted styling so it
  doesn't compete with primary nav. User-selectable for copy-paste
  during support calls ("we're on 0.11.18").

- **v0.11.17** — Phase 12 polish: Default workspaces seeded for every club.

  Every club now ships with **five default workspaces** every manager
  sees the moment they open the workspace switcher — no setup, no
  "what do I put here?" friction. The presets cover the typical hats
  a club manager (or shared GM/Pro Shop manager) wears day-to-day:

  · **Daily Ops** — Communications expanded, lands on Food Orders
  · **Member Services** — People expanded, lands on Directory
  · **Events** — Events expanded, lands on Events admin
  · **Broadcasts** — Broadcasts expanded, lands on News
  · **Setup** — Club Settings expanded, lands on Branding & Contact

  Each default is marked `readonly: true`. They render in the
  switcher popover with a small italic `seeded` tag, can be applied
  like any custom workspace, but **can't be renamed, deleted, or
  updated** — the manager defines their own customs alongside if
  they want tunable presets.

  Implementation: hardcoded `DEFAULT_WORKSPACES` constant in
  `AdminWorkspaceSwitcher.jsx`, merged with the manager's custom
  list at render time. The custom list still lives in
  `admin_preferences.workspaces` (cross-club) exactly as before;
  defaults are NOT written there, so there's no migration and a
  future seed-set edit just changes the constant (no DB sync). The
  `renameWorkspace` / `deleteWorkspace` setters early-return on any
  id matching `DEFAULT_WORKSPACES`, defensive against any future
  caller. The "Update '<name>' with current view" affordance is
  hidden when the active workspace is `readonly`.

  Manage mode shows only the manager's **custom** workspaces — the
  five seeds always exist, are explicitly called out in the empty
  state, and aren't part of the personal-organization surface.

- **v0.11.16** — Phase 12 polish: Desktop admin shell typography pass.

  Bumped every font size in the desktop admin **shell** from mobile-
  tuned (9-13px body, 16-18px headings) to standard desktop SaaS
  scale (12-15px body, 19-22px headings) — matching Linear / Notion /
  modern admin tools. Manager reading distance is finally accounted
  for; nothing in the shell looks like a phone preview anymore.

  Bumps by component:

  **`AdminLayoutDesktop.jsx`** — sidebar widths 260→280 desktop /
  200→220 tablet; topbar height 56→64 to fit the larger title.
  · Sidebar eyebrow ("CLUB · ADMIN"): 9→11
  · Sidebar title ("Manage your club"): 16→19 (Playfair)
  · Area headers: 10→12 (UPPERCASE)
  · Section labels: 13→15
  · Unread badges: 9→11
  · Footer "Signed in as": 9→11
  · Footer name: 13→15
  · Back to MyClub: 11→13
  · Dark mode toggle: 10→12 (icons 12→14)
  · Breadcrumbs: 11→13
  · Top bar title: 18→22 (Playfair)
  · Empty state h2: 20→24, body 13→15, icon 56→64

  **`AdminSearchPalette.jsx`**:
  · Result label: 14→16 (Playfair)
  · Result area subtitle: 11→13
  · Result enter-key chip: 10→12
  · Empty-state hint: 13→15
  · SearchTrigger button: 12→14 (icon 14→16, kbd 11→12)
  · SearchTrigger minWidth: 200→240

  **`AdminWorkspaceSwitcher.jsx`**:
  · Trigger chip: 11→13 (icons 11→13 / 10→12)
  · Popover header label: 10→12
  · "Manage" link: 10→12
  · Empty-state hint: 11→13
  · Workspace row: 12→14
  · "Active" tag: 9→11
  · "Update with current view": 11→13
  · "Save current view as" label: 10→12
  · Save input: 12→14
  · Save button: 11→13
  · WorkspaceRow rename input: 12→14
  · WorkspaceRow delete X: 14→18

  Section content (the dozens of admin pages inside the main area —
  Members, Orders, RSVPs, Settings, etc.) is still mobile-tuned and
  not touched in this patch. That's a section-by-section follow-up
  tracked as a Phase 13 task (introduces `body.admin-fullscreen`-
  scoped CSS or section-by-section `useViewport().isTabletUp`
  branches keyed off the new scale).

- **v0.11.15** — Phase 12 polish: Sidebar areas collapsed by default.

  Fresh managers landing on the desktop admin now see the area
  headers — Communications, Broadcasts, Events, Golf Course, Pro
  Shop, Dining, People, Club Settings, Platform — as a clean table
  of contents instead of a 30-row exploded sidebar with every
  section expanded.

  Mechanism: `sidebar_collapsed` admin_preference now defaults to
  the `null` sentinel ("no preference written") instead of `[]`
  ("explicitly nothing collapsed"). When null, the sidebar collapses
  ALL area ids derived from the live areas prop. The moment the
  manager toggles any single area, the hook writes an explicit
  array and that takes over — so a manager who explicitly opens
  all areas sticks at "all open" across reloads. Per-(user, club)
  persistence still applies.

  Workspace switcher updated to pass the EFFECTIVE collapsed array
  (the resolved-from-null version) so "Save current view" captures
  what the manager actually sees, not the raw sentinel.

- **v0.11.14** — Phase 12 polish: `/admin` deep-link entry.

  Managers and the support team can now go directly to the admin
  panel by typing `clubslug.groundslive.com/admin` — no need to
  remember the internal `/myclub/admin` path. The screen ID
  internally stays canonical (`myclub/admin` — the admin panel still
  belongs to the MyClub tab's back stack), only the URL shortens.

  How:
  · `App.jsx` — new `getInitialDeepLink()` parallels the existing
    `/guest/<slug>` pathname check. Returns `'admin'` for `/admin`
    or `/admin/*`. Passed to `NavProvider` as `initialDeepLink`.
  · `useNav.jsx` — `NavProvider` accepts the prop and, on mount,
    sets `tab='myclub'`, pushes `myclub/admin` onto the MyClub
    stack, and pushes a matching browser-history entry so the back
    button behaves the same as if the manager had tapped through
    the menu.
  · `AdminLayoutDesktop.jsx` — "Back to MyClub" link switched from
    `goTab('myclub')` to `pop()` so it pops the stack uniformly
    regardless of how admin was entered.

  Bookmarkable. Refresh-safe. SPA-fallback already wired (Cloudflare
  Pages serves index.html for unknown paths — same mechanism the
  `/guest/<slug>` route uses today).

- **v0.11.13** — Phase 12 fix: Admin escapes the phone-frame on desktop.

  Phase 12 bug surfaced as soon as a manager opened the desktop
  admin: **the sidebar+topbar shell still rendered inside the 390-
  pixel iPhone-shaped `.phone-frame` preview shell**, making the
  desktop layout look identical to mobile. Root cause: `App.jsx`
  wraps every screen in `.phone-frame` (intentional — the member
  app is a mobile-PWA preview on desktop browsers), but the admin
  desktop shell needs the full viewport.

  Fix:
  · `AdminLayoutDesktop` adds `admin-fullscreen` to `document.body`
    on mount, removes it on unmount.
  · `index.css` under `body.admin-fullscreen .phone-frame` drops
    the fixed 390×844 dimensions + border-radius + box-shadow, so
    the phone shell fills the viewport while admin is active.
  · `body.admin-fullscreen #root` also drops the centering flex so
    the admin grid actually anchors top-left.

  Leaving admin (Back to MyClub) reverts the class on unmount —
  member surfaces drop back inside the phone-frame preview on
  desktop, as before. Pure-mobile users never see either path.

- **v0.11.12** — Phase 12: Closeout (README refresh).

  Final v0.11.x bump. No runtime changes — pure docs:

  · **README.md** — "Current version" line bumped to `v0.11.12 (Phase
    12 complete)`. Added a **Responsive Admin (Phase 12)** feature-
    inventory section covering layout shells, `useViewport`,
    `AdminTable`, `SidePanel`, `AdminSearchPalette`,
    `useKeyboardShortcuts`, `admin_preferences` + hook, dark mode,
    and workspaces. Repo-layout tree updated with the new hooks
    (`useViewport`, `useAdminPreference`, `useKeyboardShortcuts`)
    and components (`AdminTable`, `SidePanel`, `AdminSearchPalette`,
    `AdminWorkspaceSwitcher`).
  · **version.js** — phase index already carries the Phase 12 entry
    from v0.11.0; this bump just lands the cadence note that v0.11.x
    is the responsive-admin lift.

  Phase 12 in one paragraph: the member app stays mobile-first
  PWA forever, but managers doing real CRUD work in the office no
  longer have to type into 320-pixel inputs. From v0.11.0 forward,
  the admin section renders in two layout shells — `AdminLayoutMobile`
  (3-level drill-down, &lt;768px) and `AdminLayoutDesktop` (persistent
  sidebar + topbar + main content area, ≥768px) — sharing the same
  section components. The desktop shell ships with a global Cmd+K
  search palette, keyboard shortcuts (single keys + Gmail/GitHub
  `g + letter` chords), a slide-in `SidePanel` detail pattern, a
  reusable `AdminTable` primitive for data-heavy sections, persisted
  UI state (sidebar collapse, last section, theme), cross-club dark
  mode, and named workspaces / personas the manager can flip
  between in one click.

  Phase 13 will start rolling individual admin sections (Members,
  Orders, RSVPs, Badges) onto `AdminTable` + `SidePanel` so the
  desktop shell stops *only* being a navigation reskin and starts
  giving managers the dense, scannable tables that motivated the
  phase in the first place.

- **v0.11.11** — Phase 12: Workspaces / personas.

  Managers can save **named bundles of admin UI state** and flip
  between them in one click. Each workspace is a snapshot of:

  · `collapsed`    — which sidebar area groups are collapsed
  · `lastSection`  — the `{ areaId, sectionId }` it lands on

  Use case: a manager wears multiple hats. "Daily ops" expands
  Communications + Pro Shop and lands on the food-order queue.
  "Setup" expands Settings + Features and lands on Club Settings.
  "Member services" expands People and lands on the Directory.
  Defining each as a workspace turns a 4-click setup into one click.

  New `AdminWorkspaceSwitcher` chip in the sidebar header (right
  under the club name). Click → popover with:
  · The list of saved workspaces (active one outlined)
  · "Update '<active>' with current view" — re-snapshots
  · "Save current view as…" — name input + Save button
  · "Manage" toggle — inline rename + delete per workspace

  Storage (on the v0.11.6 `admin_preferences` foundation):
  · `workspaces` — **cross-club** array `[{ id, name, collapsed,
    lastSection }, …]`. The list itself follows the admin so
    workspaces defined for one club are available everywhere they
    administer.
  · `active_workspace` — **per-club** id. The same admin may wear
    a different hat at each club they manage — pro-shop manager
    at one, general manager at another — so the *active* workspace
    is club-scoped while the *catalog* is cross-club.

  Applying a workspace is a one-shot restore: the parent's
  `sidebar_collapsed` and `last_section` hooks then own the live
  values from then on. To re-capture changes, the user picks
  "Update '<name>'" from the menu — no implicit overwrite when
  tinkering destroys an intentional snapshot.

- **v0.11.10** — Phase 12: Tablet polish (compact sidebar).

  The desktop admin shell now mounts at the **tablet** breakpoint too,
  not just desktop. Managers reaching for an iPad in the office get the
  same sidebar + topbar + main-area layout they'd see on a 27" monitor,
  with the dimensions tuned for the smaller canvas.

  `AdminPanel.jsx` now uses `isTabletUp` (≥768 px) for the layout
  selection instead of `isDesktop` (≥1024 px), and passes a new
  `compact={isTablet}` prop into `AdminLayoutDesktop`.

  `AdminLayoutDesktop.jsx` gains a `compact` mode:
  · Sidebar width: `260px` desktop → `200px` tablet
  · Sidebar padding: `18px` desktop → `12px` tablet
  · Main-area padding: `24/32/40` desktop → `20/22/32` tablet

  Also adds `position: relative` to the grid root so `<SidePanel>`
  (v0.11.4) reliably overlays only the main area on tablet too.

  Mobile (&lt;768 px) still gets the 3-level drill-down shell —
  unchanged, mobile-first PWA experience preserved.

- **v0.11.9** — Phase 12: Keyboard shortcuts.

  Generic `useKeyboardShortcuts(map)` hook at
  `src/hooks/useKeyboardShortcuts.js`. Supports single-key
  bindings AND Gmail/GitHub-style "g + letter" chord pairs
  (press `g`, then a letter within 1.2 s).

  Auto-skips when focus is in an editable element (input,
  textarea, contenteditable, select) so typing "p" into a search
  field doesn't blast you to the People area.

  Wired into `AdminLayoutDesktop`:
  · `/` — focus the search palette
  · `g h` — go home (clear area + sec)
  · `g i` — Communications inbox
  · `g p` — People
  · `g s` — Club Settings
  · `g b` — Broadcasts
  · `g e` — Events

  Cmd+K / Ctrl+K still opens the search palette (lives in
  `AdminSearchPalette.jsx`'s own listener) so power users have
  two ways to invoke it depending on whether their hand is on
  the meta key.

- **v0.11.8** — Phase 12: Dark mode toggle (admin sidebar).

  Small affordance in the desktop sidebar footer flips the whole
  app between light + dark. Backed by `useAdminPreference('theme',
  …, { clubScoped: false })` so the choice travels with the admin
  across every club they touch and doesn't flip on club switch.

  Implementation routes through the existing CSS-variable layer in
  `theme.js`: new `applyThemeMode(mode)` helper sets `--g-bg`,
  `--g-card`, `--g-text`, `--g-muted`, `--g-border` overrides on
  `document.documentElement` when dark, removes them when light.
  Existing `G.bg`, `G.card`, etc. already resolve via `var(--g-…,
  fallback)` so the swap propagates through every component
  without per-component wiring.

  Dark palette: bg `#15171A`, card `#1E2125`, text `#E8E4D8`,
  muted `#8B8F95`, border `#2C3035`. Functional state colors (open
  green, closed red, brass accent) stay constant — they're meant
  to read regardless of theme.

  Member-facing surfaces inherit dark when the admin toggles it
  too (they share the same CSS variables); members never see the
  toggle themselves, so this is an admin-controlled cross-app
  preference rather than a per-user member feature.

- **v0.11.7** — Phase 12: Sidebar collapse + last-section persistence.

  First two wirings of the `admin_preferences` foundation from
  v0.11.6:

  · **Sidebar collapse state** persisted via
    `useAdminPreference('sidebar_collapsed', [])`. Managers
    toggling area groups in the desktop sidebar now have those
    collapses remembered per club, across reloads and devices.
    Stored as a flat array of area ids.

  · **Last section memory** persisted via
    `useAdminPreference('last_section', { areaId, sectionId })`.
    On desktop, AdminPanel restores the last-visited section on
    mount so managers land back where they left off instead of on
    the empty state. Mobile drill-down still resets per nav stack
    (that's the natural place keeper there).

  Both are saved-state-only — no UI changes. Managers just
  experience an admin tool that remembers what they were doing.

  v0.11.8 layers Workspaces / personas on top of this same hook.

- **v0.11.6** — Phase 12: `admin_preferences` table + hook.

  **Migration 61:** new `admin_preferences` table. Parallels the
  member-side `user_preferences` (v0.10.7) but keyed by auth
  `user_id` + nullable `club_id` instead of `member_id` — super_
  admins don't have a member row in every club, so admin UI state
  has to live on the auth identity to travel cross-club.

  · UNIQUE per `(user_id, club_id, key)` — NULL `club_id` = global
    (preference travels with the admin across clubs); non-NULL =
    club-scoped (preference applies only when administering that
    club).
  · RLS: users read + write their own row only.
  · `updated_at` trigger.

  **New hook `useAdminPreference(key, defaultValue, opts)`** —
  `src/hooks/useAdminPreference.js`. Mirrors `useUserPreference`'s
  API: returns `[value, setValue, ready]` with debounced writes
  and on-unmount flush. `opts.clubScoped` (default `true`) chooses
  whether the preference is per-club or cross-club.

  First-use keys (v0.11.7+):
  · `sidebar_collapsed` — array of area IDs the manager has
    collapsed (per club)
  · `last_section` — `{ areaId, sectionId }` for landing where
    the manager left off
  · `theme` — `{ mode: 'light' | 'dark' }` (global / cross-club)
  · v0.11.8: `saved_views`, `workspaces`, `active_workspace`

  No UI wiring yet — that's v0.11.7. This patch ships the
  foundation so subsequent patches can drop in saved state without
  schema changes.

- **v0.11.5** — Phase 12: Cmd+K admin search palette.

  Global command-palette overlay at
  `src/components/AdminSearchPalette.jsx`. Cmd+K (Mac) or Ctrl+K
  (Windows/Linux) opens a centered modal with a search input +
  results list. Typing fuzzy-filters across every admin section
  by label, area name, and description. Arrow keys move the
  highlight; Enter selects; Esc closes.

  Empty query shows the first 8 sections as a "browse" mode so
  the palette is useful even before typing.

  Section-only indexing in this patch. Live member / event /
  order indexing via Supabase is a follow-up — the palette UI +
  key bindings + result row shape don't change when richer
  sources land, just the index source.

  `<SearchTrigger>` exported alongside — a discoverability button
  shown in the top bar between breadcrumbs and BellChip:
  *"Search admin…  ⌘+K"*. Mounted in `AdminLayoutDesktop`.

  Mobile + tablet skip the palette — the mobile drill-down has
  its own existing search field inside the admin hub.

- **v0.11.4** — Phase 12: `SidePanel` detail pattern.

  Slide-in detail panel at `src/components/SidePanel.jsx`. When a
  manager clicks a row in an AdminTable on desktop, the SidePanel
  mounts on the right side of the main content area with the
  row's full details. The list stays visible alongside — manager
  flips between rows without losing scroll position.

  Behavior:
  · Mounts INSIDE the main content area (not document body) so
    it overlays just the section, not the sidebar/topbar
  · Backdrop scrim covers only the content area
  · Click backdrop OR Esc to close
  · Focus management: remembers the previously-focused element
    on open, restores on close (a11y guideline)
  · 220ms slide-in via translateX, with shadow fade
  · Default width 420px (tunable via `width` prop), maxWidth 92%

  Mount position: `position: absolute` relative to nearest
  positioned ancestor. Consumers wrap their content in a
  `position: relative` container so the panel only overlays that
  container.

  No section integrations yet — those land in the v0.11.6
  integration patch after global search (v0.11.5) ships.

- **v0.11.3** — Phase 12: `AdminTable` building block.

  Reusable desktop-shaped table primitive at
  `src/components/AdminTable.jsx`. Sections that render dense card
  lists on mobile (Members, Food Orders, Event RSVPs, Badges) can
  mount this on desktop for a real table — sortable columns,
  sticky header, optional bulk-select checkboxes, custom cell
  renderers, loading + empty states, row hover, row click.

  Single-column sort with three-state cycle (asc → desc → clear).
  Selection state is local to the table; consumers wire bulk
  actions via the `onSelectionChange` callback. Striped rows for
  scannability. Cell renderers default to `row[col.key] ?? '—'`
  so simple cases need just `{ key, label }`.

  No section integrations in this patch — that lands in v0.11.6
  after the side-panel detail pattern (v0.11.4) and global
  search (v0.11.5) ship. Building blocks first, integration
  patch hits them all together.

- **v0.11.2** — Phase 12: Top-bar breadcrumbs.

  Replaces the v0.11.1 two-line eyebrow + title in the desktop top
  bar with a real breadcrumb trail: **Admin › Communications ›
  Food Orders** (eyebrow row) + section title beneath. Each
  ancestor crumb walks the state back to that level — clicking
  *Admin* clears area + section (shows the home empty state),
  clicking *Communications* clears just section (shows the area's
  empty state). The current section's title stays non-interactive.

  Mobile + tablet unchanged.

  Reserved the center slot of the top bar for the v0.11.5 global
  search input so layout doesn't shift when search lands.

- **v0.11.1** — Phase 12: `AdminLayoutDesktop` shell.

  First visible Phase 12 change. At ≥ 1024 px the admin section now
  mounts the desktop layout: 260px persistent left sidebar (deep
  green, area tree with collapsible groups + active highlighting +
  Communications unread badges), 56px top bar (area eyebrow +
  section title + bell), main content area (max-width 1280, 24×32
  padding). Mobile and tablet still get the existing 3-level
  drill-down — the desktop layout mounts conditionally via
  `useViewport().isDesktop`.

  · State source-of-truth stays in `AdminPanel` (`area`, `sec`,
    `query`). The desktop shell receives both setters and calls
    them on sidebar clicks, so navigation is exactly equivalent
    to the mobile area-card → section-card drill-down.
  · Long Level-3 section if-chain extracted into a new
    `<SectionContent>` component at the top of `AdminPanel.jsx`
    so mobile + desktop render identical bodies without
    duplication.
  · `AREAS` constant exported so the sidebar can render the tree
    without reaching into AdminPanel's closure.
  · Sidebar groups expand-by-default. Collapse state is local to
    the mount for now; v0.11.7 persists it via
    `admin_preferences`.
  · Empty state ("Pick a section from the sidebar") renders when
    nothing's selected so the desktop never shows a blank
    content area.
  · "Back to MyClub" affordance at the bottom of the sidebar.

  v0.11.2 brings breadcrumbs, refined active highlighting, and
  collapsible-group polish. v0.11.5 adds the global search input
  to the top bar's center slot.

- **v0.11.0** — Phase 12 opens: `useViewport` scaffold.

  Foundation patch. No visible UI change yet; the hook gets
  wired into AdminPanel but every viewport currently renders the
  existing mobile-first shell. v0.11.1 layers in the
  AdminLayoutDesktop component and starts the visible rollout.

  New `src/hooks/useViewport.js`:
  · CSS-pixel breakpoints exported as constants:
    `BREAKPOINT_TABLET = 768`, `BREAKPOINT_DESKTOP = 1024`
  · `viewportForWidth(w)` pure resolver function (testable
    independent of React)
  · `useViewport()` hook returns `{ viewport, isMobile, isTablet,
    isDesktop, isTabletUp, isDesktopUp }`
  · `resize` listener debounced via `requestAnimationFrame` so
    window-drag doesn't trigger dozens of state updates per
    second
  · SSR safety: server-side `typeof window === 'undefined'`
    falls back to `'mobile'`; first client effect re-resolves

  Bumped minor to v0.11.0 per protocol (architectural foundation,
  Phase 12 opens). README updated with the in-progress notice;
  full Phase 12 inventory lands at the closing patch (v0.11.12)
  rather than spreading edits across every intervening commit.

---

## v0.10.x patch tail — final Phase 11 patches

- **v0.10.18** — Food orders: To-Go / Eat-In pivot (delivery gone).

  Revises the v0.10.15 taxonomy. On-course delivery is out — staff
  finding members on 18 holes was operationally messy. Both new
  types end at the clubhouse; the choice signals staff how to plate
  and serve.

  **Migration 60:** `food_orders.order_type` CHECK constraint
  becomes `('to_go', 'eat_in')`. Backfilled every pre-v0.10.18
  row with `order_type='delivery'` to `'to_go'` as the closest
  semantic match. `hole`, `location_note`, and
  `requested_pickup_time` columns unchanged.

  **Member flow** (`CourseOrder.jsx`):
  · Picker is now **To-Go** vs **Eat-In** with descriptive subtitles
    ("Grab and head out from the clubhouse window" / "Sit down at
    the clubhouse and dine").
  · **Hole picker stays for both types** — not because food is
    delivered to the hole, but because the member's current hole
    is the kitchen's best signal for when to fire the order so it's
    ready when the member walks off the course. Required for both.
  · **Pickup-time pills stay for both types** — optional, blank =
    ASAP. Label adapts ("When would you like to pick up?" vs
    "When would you like to be seated?").
  · Bottom info card unified copy:
    *"Our team will do our best to have your order ready for you
    at the clubhouse."*

  **Confirmation** (`OrderConfirm.jsx`) — type-aware uppercase
  eyebrow + subtitle ("Pickup at the clubhouse" / "Dining at the
  clubhouse"). Hole + time shown for both.

  **Kitchen queue** (`FoodOrdersAdmin`):
  · Chip per row is now **`TO-GO · Hole N · time`** (brass) or
    **`EAT-IN · Hole N · time`** (green). Both order types ride
    the same row layout.
  · Status select unified for both types:
    `pending → preparing → ready_for_pickup → delivered`
    (`cancelled` always available). Legacy `out_for_delivery`
    values still render correctly for any rows from before the
    backfill, but new orders never use it.
  · Status-flip handler now sends a push for **both** types on
    `ready_for_pickup` transitions (was to_go only). Push body
    softened to "Your order is ready at the clubhouse." which
    fits both contexts.

  No new dependencies.

- **v0.10.17** — GA4 activation in production.

  No code changes. `VITE_GA4_MEMBER_ID` was set in Cloudflare Pages
  → Project → Settings → Environment variables → Production. The
  v0.10.16 instrumentation (`src/lib/analytics.js`,
  `src/hooks/useAnalytics.js`, every wired callsite) was silently
  no-op'ing until now; this build is the first to actually ship
  the measurement ID into the JS bundle. Members signed in to a
  resolved club start firing `page_view` + the custom events
  immediately on this deployment.

  Marker patch so future support calls and reports can pinpoint
  *"events started flowing on v0.10.17"* without spelunking
  Cloudflare's env-var history.

  Verify in **GA4 → Reports → Realtime** within ~30s of this
  deploy going green: a user from your test session should show
  up with a `page_view` event and `club_id` parameter attached.

- **v0.10.16** — GA4 member app integration (scaffolded; no ID yet).

  Wired the full Google Analytics 4 instrumentation for the member
  app. Nothing tracks until `VITE_GA4_MEMBER_ID` is set in the
  build env — `init()` and every event helper silently no-op
  without it. Safe to ship; zero data leaves the device until Marc
  creates the property and adds the ID.

  **Architecture:**
  · `src/lib/analytics.js` — gtag.js bootstrap + low-level
    `sendEvent` / `sendPageView` helpers. Loaded once from
    `main.jsx`. Configures gtag with `send_page_view: false` so
    SPA transitions report accurately via the manual page-view
    helper.
  · `src/hooks/useAnalytics.js` — auth-aware wrapper. Gates
    internally on `member && !isGuest && club?.id` so events
    only fire for authenticated members of a resolved club.
    Auto-injects `club_id` on every event. Returns
    `{ trackEvent, trackPageView, isEligible }`.

  **Auto page_view** — `App.jsx` ScreenRenderer fires
  `page_view` on every `current` nav change. Every tab switch
  and screen transition reports.

  **Custom events wired:**
  · `food_order_placed` (`CourseOrder.jsx`) — `item_count` +
    `order_type` ('delivery' / 'to_go')
  · `pin_placement_viewed` (`PinMap.jsx`) — `hole_number` per
    hole change (initial + every strip tap)
  · `notification_opted_in` (`NotificationsToggle.jsx`) — fires
    on successful permission grant + endpoint registration
  · `event_rsvp_submitted` (`EventDetail.jsx`) —
    `event_category` + `rsvp_status` ('registered' / 'waitlist')
  · `message_sent` (`Thread.jsx`) — `message_type` from
    `thread.kind` ('dm' / 'clubhouse' / 'order' / fallback
    'thread_reply')
  · `guest_qr_scanned` (`MemberGuestQR.jsx`) — fires once on
    screen mount (members aren't scanning their own QR; they're
    showing it)

  `ai_query_submitted` is reserved in the spec but no AI
  assistant exists in the app yet — the event will be added
  to whichever screen ships the AI feature in a future patch.

  **PII policy** — zero personally identifying parameters. No
  names, emails, or membership numbers anywhere. `club_id` is
  the only non-anonymous parameter; it's a club-scoping value,
  not a person-scoping value. Auth gate enforces guest exclusion.

  **Marketing landing page GA4** — out of scope for this patch.
  `groundslive.com` lives in a separate repo so a separate GA4
  property + bootstrap belong there. Spec preserved in the
  v0.10.16 entry for that future repo:

  · Standard `page_view` on load (auto via gtag config).
  · `demo_request_submitted` on form success —
    `{club_name, state}` params.
  · `scroll_depth` at 25/50/75/100 % via a scroll listener.
  · `cta_clicked` —`{button_label, page_section}`.
  · `feature_section_viewed` via Intersection Observer firing
    when the features block enters the viewport.
  · GA4 → Search Console linkage once the domain is live.
  · Mark `demo_request_submitted` as a conversion goal.

  **To activate** (Marc's side):
  1. Create the GA4 property at analytics.google.com (data
     stream type: Web; URL: `groundslive.com`)
  2. Add `VITE_GA4_MEMBER_ID=G-XXXXXXXXXX` to the production
     build env (Cloudflare Pages → Project → Environment vars)
  3. Add `club_id` as a custom dimension in GA4 (Admin →
     Custom Definitions → Create custom dimension → User-scope
     or Event-scope → name `club_id`)
  4. Next deploy fires page_views + custom events automatically

- **v0.10.15** — Food orders: To-Go option + Ready-for-Pickup status.

  **Migration 59** adds two columns to `food_orders`:
  · `order_type` ∈ {`delivery`, `to_go`} (CHECK constraint, default
    `delivery` so historical rows keep their semantics)
  · `requested_pickup_time` timestamptz nullable (to_go only;
    `NULL` = ASAP)

  **Member flow** (`CourseOrder.jsx`):
  · New delivery-method picker between Your Order and the
    location/time fields. Two stacked tap targets: "Deliver to me
    on the course" + "Pick up at the clubhouse (To-Go)".
  · Delivery branch unchanged — hole picker required.
  · To-Go branch — pickup-time pill row (ASAP + the next 16
    quarter-hour slots starting from `now + 30min` rounded up).
    Pickup time is optional; blank means ASAP.
  · Submit button validation: delivery requires a hole, to_go has
    no required fields.
  · Bottom info card swaps copy: "Staff will bring it to your hole"
    vs "You'll get a push notification when your order is ready."

  **Confirmation** (`OrderConfirm.jsx`) — `order_type`-aware. Shows
  pickup time + clubhouse for to_go, delivery + hole for delivery.

  **Kitchen queue** (`FoodOrdersAdmin`):
  · New prominent chip per row — green **DELIVERY · Hole N** or
    brass **TO-GO · 1:45 PM** (or "ASAP"). Kitchen staff can stage
    orders without tapping into each one.
  · Status select now branches by order_type. To-Go orders see
    `pending → preparing → ready_for_pickup → delivered`; delivery
    orders keep `pending → preparing → out_for_delivery →
    delivered`. `cancelled` available on both. `ready_for_pickup`
    joins the ACTIVE filter so it doesn't get hidden when
    "active only" is on.

  **Push on Ready for Pickup** — when staff flip a to_go order to
  `ready_for_pickup`, the admin handler also inserts a system
  message *"Your order is ready. Please pick up at the
  clubhouse."* into the order's auto-thread (linked via
  `threads.context_table='food_orders'` + `context_id=<order.id>`).
  The existing `messages` INSERT trigger fires `send-push v6`,
  which renders the notification as **"`<Club>` · Your order
  update"** with the body preview — same path every other order
  status update uses. Missing-thread case is tolerated so the
  status flip always succeeds even if the thread lookup fails.

  No new dependencies. Backwards-compatible — existing delivery
  orders behave identically.

- **v0.10.14** — Support access for members + Club Manager Support.

  **New member-facing Support screen** at `myclub/support`,
  reached via a new "Help & Support" row in Settings (positioned
  below all preference sections, above the About metadata block).
  Three blocks stacked:

  · **Common Questions** — FAQ accordion with 6 starter entries
    (profile photo, push notifications, install to home screen,
    cancel RSVP, why no email confirmation, contact the club).
    Content lives in `src/lib/supportFaq.js` so updates are a
    one-PR change without touching the screen.
  · **Contact Support** card — mailto to
    `support@groundslive.com` with a prefilled subject
    `"Support Request from <Club Name>"` and a small diagnostic
    footer (app version + club name; **zero PII** — no name,
    email, or membership number).
  · **Contact Your Club** card — phone + email pulled from the
    `clubs` row. Renders tappable `tel:` and `mailto:` links
    when set; falls back to a friendly "not configured yet"
    state when the club hasn't published contact info.

  **Club Manager Support entry** — separate priority card at
  the top of the manager's Club Settings → Brand Identity form.
  mailto to `managers@groundslive.com` with subject
  `"Manager Support — <Club Name>"`. Visually distinct (green
  background, gold border, brass laurel icon, "PRIORITY" eyebrow
  label) so managers can spot the direct line at a glance.
  Hidden in platform mode — super_admin doesn't need it.

  **Operational pre-req** *(not a code change)*: Cloudflare Email
  Routing for `support@groundslive.com` AND
  `managers@groundslive.com` must be set up and verified before
  this ships externally, or every mailto bounces. Add the
  routing rules + a forwarding destination in the Cloudflare
  dashboard.

  No new dependencies.

- **v0.10.13** — Honesty fix: RSVP confirmation copy.

  EventDetail's "Confirmation sent to your email on file" line
  promised something the app never delivered — no email service
  has ever been wired. Replaced with honest copy:

    *"We'll send a push reminder before the event. Find this
    anytime in MyClub → My Events."*

  Members see RSVPs in My Events (v0.10.3) anyway, and push
  reminders are the real notification path until a transactional
  email service is wired.

  **Deferred for the punchlist** — transactional RSVP email via
  Brevo. Design notes preserved so the next round can pick this
  up cold:

  · **Edge Function `send-rsvp-confirmation`** triggered by a
    database webhook on `event_registrations` INSERT (same
    pattern as the existing send-push function in migration 49).
  · Function fetches: event row (title, date, time, category,
    description), member row (name, email), club row (name,
    contact_email).
  · Sends a plain-text or minimal-HTML email via the Brevo
    transactional API. Per-club Brevo API key first (future
    `clubs.brevo_api_key` column), falls back to a platform-
    level `BREVO_API_KEY` Edge Function secret.
  · Email content: event name + date + time + venue (if stored)
    + RSVP status (registered / waitlisted) + "the club will be
    in touch with further details" + club name + contact email.
    Plain-text or extremely minimal HTML — no design heavy lift.
  · UI affordance: once shipped, restore an email-confirmation
    line on the RSVP success card and consider an opt-in toggle
    in Settings (some members may want push-only).
  · Requires Brevo account setup, sender-domain verification,
    and SPF/DKIM/DMARC records on `groundslive.com`.

  No code changes related to the Edge Function in this patch —
  this is a copy fix only so the UI stops lying. The Brevo wiring
  goes on the punchlist for a later round.

- **v0.10.12** — Safety net: manual subdomain health check.

  Diagnosis from the Windhaven outage: the new-club create flow
  already calls `provision-club-domain` automatically (sections.jsx
  line 3586), but the Cloudflare API credentials were never added
  to the Supabase Edge Function secrets — so the call returns
  *"Cloudflare automation not configured"* and the new club ends
  up DB-only with no DNS. Clinton + Oakgrove were patched manually
  via the Cloudflare dashboard; Windhaven was forgotten in that
  manual process and sat broken.

  Adds a defensive layer so the next orphan club gets caught
  before a member ever hits a broken hostname:

  · **New Edge Function `check-club-health`** (v1) — pings every
    club's hostname server-side (browser CORS blocks reading the
    `cf-ray` header on cross-origin requests), returns per-club
    `{reachable, status, cloudflare, dns_error, latency_ms}`.
  · **New "Run health check" button** at the top of
    Platform → Provisioning Log. One click pings everything.
  · **Result table** with three states per club: `OK` (reachable +
    Cloudflare-proxied), `DNS ONLY` (reachable but no `cf-ray` —
    DNS-only setup loses TLS termination + DDoS protection), and
    `BROKEN` (unreachable, with DNS-not-found called out
    explicitly).
  · **"Re-provision" CTA** on broken rows — invokes
    `provision-club-domain` for that slug and re-runs the health
    check 1.5s later so the row turns green without a refresh.

  Manual rather than scheduled at this scale. When the platform
  hits ~20 clubs, easy to flip to a daily auto-trigger by adding
  a Supabase scheduled function call — no UI changes needed.

  **Still required on your side:** add `CLOUDFLARE_API_TOKEN`
  and `CLOUDFLARE_ACCOUNT_ID` to Supabase Edge Function secrets,
  otherwise the underlying auto-provisioning still fails. The
  health check + Re-provision button surface the problem; they
  can't fix the underlying credential gap.

- **v0.10.11** — Bug fix: Course Map + Pin Placement empty states.

  Audit found Oakgrove + Windhaven had **zero rows** in the
  `holes` table while Clinton has all 9 populated. Members at
  those clubs were seeing the scorecard with "—" placeholders
  in every cell and a broken-looking Stat bar — looked like
  the page had failed to load rather than "no data yet."

  Fix: both `CourseMap` and `PinMap` now render a friendly
  empty state when `holes.length === 0` instead of trying to
  render the scorecard / pin map with empty rows. The empty
  state surfaces:

  · A polite "Course details haven't been added yet" message
  · A one-tap CTA into the admin Hole Details section — but
    only for staff (`isAdmin || isManager`); members just see
    the message
  · A friendly course-flag glyph instead of a lock icon (the
    feature isn't off — it just hasn't been populated yet)

  `usePinPlacements` already mapped DB column names → React
  shape correctly (`yards_white` → `yds_white` etc.), so no
  hook change needed. This was strictly a data-not-populated
  UX problem.

  **Separate operational note** (not a code patch):
  Windhaven's subdomain `windhavencc.groundslive.com` doesn't
  resolve in DNS yet — `club_provision_log` has zero entries
  for that slug, meaning the `provision-club-domain` Edge
  Function was never run. Fix via Platform → All Clubs →
  Windhaven → Provision Domain.

- **v0.10.10** — Phase 11 docs wrap (patch, not minor).

  Closed Phase 11 with a patch-level docs commit rather than
  the v0.11.0 minor I initially used by mistake. Per protocol:
  MINOR is reserved for big-lift architectural builds; a docs
  refresh doesn't qualify. Phase 11 sits inside the v0.10.x
  patch line.

  · README "Current version" line updated to v0.10.10
  · New Phase 11 feature section added to the README inventory
    (calendar overrides, news action links, drag-and-drop menu
    sort, push sender identity, `user_preferences` store)
  · `version.js` phase history comment gets a Phase 11
    paragraph
  · CHANGELOG header reorganized as the v0.10.4–10 close-out

- **v0.10.9** — Phase 11: Push notification sender identity.

  `send-push` Edge Function bumped to **v6** (Supabase deploy
  version 9). Notification titles now identify WHO the message
  is from — the v5 behavior of every push reading "<Club> ·
  Message" was uninformative on the lock screen.

  New title mapping (driven by `thread.kind`):
  · **dm / member-to-member threads** → sender's name
    (resolved from `members.name` via `sender_user_id` +
    `thread.club_id`). Falls back to *"New message"* if the
    sender doesn't have a member row in the thread's club
    (handles staff sending from a `user_roles`-only account).
  · **clubhouse threads** → "`<Club>` · `<sender name>`" if the
    sender is a member; otherwise "`<Club>` · Clubhouse" so
    staff-side replies still tell the member who pinged them.
  · **order threads** → "`<Club>` · Your order update". System-
    driven; the body preview carries the actual status note.

  Sender-name lookup uses the service role key already in the
  function's env, so RLS doesn't block the cross-member read.
  Body preview unchanged (first 140 chars).

  No frontend changes — this is a server-side title fix only.
  Test by sending a DM from one member to another; the
  recipient's lock screen should now show the sender's name
  instead of generic "Message".

- **v0.10.8** — Phase 11: Menu Category drag-and-drop sort order.

  Replaces the number-input sort_order field in the Menu Categories
  admin with a draggable list. Each row has a `GripVertical` handle
  on the left; the manager drags rows up or down to reorder. On
  drop the new sort_order is computed for every moved row (with
  *10 spacing so future single-row inserts don't trigger a full
  renumber) and written in parallel UPDATEs.

  **New dependency:** `@dnd-kit/core` + `@dnd-kit/sortable` +
  `@dnd-kit/utilities`. Picked over react-beautiful-dnd because
  it's actively maintained, works cleanly with React 19, and has
  built-in keyboard accessibility (arrow keys after focusing the
  grip handle reorder the row).

  **New reusable helper** `SortableSimpleAdmin` lives in
  `src/screens/admin/sections.jsx`. Designed for any future
  "name + active toggle + sort_order" surface so we don't reinvent
  the wheel. Includes optimistic local reorder (row settles into
  place before the DB round-trip), realtime subscription so two
  managers reordering at once converge, and an inline add/edit
  form for the underlying CRUD.

  PointerSensor activation distance = 6px so accidental taps on
  the row don't initiate a drag.

  *Menu Items* drag-and-drop within each category is deferred —
  the per-category scoping is a bigger refactor; categories cover
  the immediate ask.

- **v0.10.7** — Phase 11: `user_preferences` table + event filter pills.

  **New architectural system: `user_preferences` table** (migration
  58). Generic per-member key-value store backed by jsonb. Drop in
  any future per-member setting that doesn't merit its own column
  on `members` (default tabs, mute lists, calendar view defaults,
  etc.) with a one-line addition — no migration per pref.

  · RLS: members read + write their own row only (no cross-member
    visibility — preferences are private).
  · Unique on `(member_id, key)` — one value per pref per member;
    re-saving UPSERTs.
  · `updated_at` trigger so every save stamps automatically.

  **New hook `useUserPreference(key, defaultValue)`** —
  `src/hooks/useUserPreference.js`. Returns `[value, setValue,
  ready]`. Reads on mount, writes with a 400ms debounce, flushes
  on unmount. Guests short-circuit cleanly (no member row to
  scope to). Use:
    `const [cats, setCats, ready] = useUserPreference('events_filter_categories', []);`

  **New component `EventFilterPills`** — horizontal scrollable
  filter strip with an "All" pill + one per distinct upcoming-
  event category. Multi-select; tapping any active pill toggles
  it; emptying the selection equals "All". Hides itself when
  only one category exists (filtering would be meaningless).

  **Wired into two surfaces:**
  · `EventsCalendar` — pills above the bottom "Upcoming" section,
    filter the next-5 list. The calendar grid + day-detail still
    show every event (filtering the grid would hide events from
    members who'd otherwise see them — confusing).
  · `EventsUpcoming` — pills above the full paginated list, filter
    the whole result set. Pagination resets to page 1 on filter
    change.

  Selection persists per-member across the two surfaces — set
  "Golf" on the calendar, see it pre-applied when you open the
  full upcoming list. Restored on mount before first render so
  members don't see a flash of unfiltered content.

- **v0.10.6** — Phase 11: Additional calendar entry points.

  Calendar reachability audit + two additions so members can get
  back to the month view from any event surface in ≤1 tap.

  · **Next Event card on Home** gets a "View all →" secondary
    tap target in the section header. Tapping the card body
    still goes to the event detail (no regression); the new
    link routes straight to `community/calendar`.

  · **Calendar icon button** added to the right of the
    `BackHeader` on every event detail screen (`community/event`)
    — a small outlined Lucide-style calendar icon that pushes
    `community/calendar`. Shows up whether you reached the
    detail from Home, the calendar, My Events, an inbox
    notification, or a deep link.

  Audit result: Inbox event notifications + RSVP confirmations
  + My Events rows + deep links all route through the same
  `community/event` screen, so the new calendar icon covers
  them automatically — no additional changes needed at those
  surfaces.

  UI-only.

- **v0.10.5** — Phase 11: Calendar date override indicators.

  Members can now see at-a-glance which dates on the events
  calendar have a schedule override attached (holiday closure,
  members-only day, reduced hours, special opening).

  · **Grid indicator** — cells with a schedule override render a
    small hollow brass ring under the date number. Cells with
    events still render the existing filled brass dot. Cells with
    both show both side-by-side (filled dot = events, hollow
    ring = facility note). The two visuals are clearly different
    so you can tell from the month view whether a date has
    events, overrides, or both.

  · **Day-detail Facility Notes section** — tapping any date with
    an override (even one without events) opens the day detail
    with a "Facility Notes" section listing each override:
    facility name (resolved through `schedule_overrides.status_id`
    → `club_status.facility_id` → `club_facilities.display_name`),
    state pill ("Closed" / "Members only" / "Special hours"),
    formatted hours line (handles dawn/dusk, members-only,
    closed-all-day), and the staff-entered reason.

  · **Realtime** — subscription on `schedule_overrides` scoped by
    club_id so a manager adding a holiday closure shows up on
    every member's calendar within seconds, no refresh.

  No schema changes — uses existing `schedule_overrides` +
  `club_status` + `club_facilities` tables.

- **v0.10.4** — Phase 11: contextual action links on news (+
  fixes the dead "View the Dining Menu" link).

  Replaces the v0.10.3-era hardcoded "Related" card in
  `NewsDetail` — three text-only divs with `cursor: pointer`
  but **no onClick handlers** (a real bug; tapping looked
  like nothing happened). Now driven by a generic mapping:

  · `src/lib/newsActionLinks.js` — case-insensitive category →
    `{label, route}` map. Initial entries: Dining → food menu,
    Events → calendar, Course → pin placements, Golf → course
    conditions, ProShop → pro shop.
  · `NewsDetail` renders a single outlined action button below
    the article body using the mapped label + actual `push()`
    navigation. Categories without a mapping (e.g. "Club"
    general announcements) render nothing — no "Related"
    header, no empty space.
  · Home news feed cards get the same action link in a smaller
    inline-link style below the body preview. `stopPropagation`
    keeps the link from triggering the card's own tap-to-detail
    behavior.

  Adding a new category mapping is a one-line edit in
  `newsActionLinks.js` — no per-category code anywhere else.

- **v0.10.3** — Phase 10: My Events RSVP history.

  Personal RSVP history surface for the signed-in member.
  Reachable from a new **My Events** action tile on MyClub
  (next to Membership Card — both are "your stuff" surfaces).

  **Screen layout** (`myclub/events`):
  · **Upcoming** — events on or after today where status is
    `registered` or `waitlist`. Sorted ascending so the nearest
    event tops the list. Each row: title + date chip + time +
    category chip + RSVP status pill (green Registered / amber
    Waitlisted) + a spots-remaining indicator pulled live from
    the event's `spots` field minus current non-cancelled
    registrations (renders as "Spots available: N" / "Filling
    up" when ≤25% remain / "Full" when exhausted).
  · **Past** — events whose date has passed plus any cancelled
    registrations. Default window: last 90 days, with a "Show
    older events" button revealing the full history. Cancelled
    rows render muted with a strike-through title and a
    "Cancelled" chip.

  Tapping any row navigates to the existing `community/event`
  detail screen — same destination calendar uses, hydrated with
  the camelCase keys EventDetail expects.

  **Empty states:**
  · Upcoming: *"You have no upcoming events. Browse the
    calendar to find something."* with an Open Calendar CTA.
  · Past: *"No past events yet."*

  **Realtime:** subscription on `event_registrations` filtered
  by `member_id` so admin-side status changes (registered ↔
  waitlist, cancellations) and re-RSVPs from another tab appear
  here within seconds — no refresh.

  UI-only. No schema changes — reads from existing
  `event_registrations` + `events` tables, both already scoped
  by `club_id` and RLS.

  This wraps Phase 10's staged shipping plan: v0.9.21–23
  preview/CRUD/assignment → v0.10.0 surfaces → v0.10.1 Trophy
  Case → v0.10.2 sponsor add-on → **v0.10.3** RSVP history.

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
