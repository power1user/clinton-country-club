// manual.ts — v0.16.19 GroundsLive Admin AI manual content.
//
// Last refresh covers everything through v0.16.19. Phase 18
// (Security & Hardening Pass) closed 21 audit findings across
// 3 review rounds. Task #52 finished the people-table
// consolidation — duplicate name/email/phone/zip/photo_url
// columns DROPPED from members + guests; canonical identity
// lives ONLY on the `people` table; every member/guest links
// via person_id NOT NULL FK. The bidirectional sync triggers
// are retired. Confirm-modal pattern retired all native
// confirm()/alert() calls. Rate limiting on guest-register
// (IP + email buckets). Mobile back-button cascade fixed
// across useNav + AdminPanel + useModalBackClose + ConfirmModal.
//
// Earlier coverage carried forward: Phase 17 (Departments +
// topic routing), v0.15.16 PersonEditModal redesign, server-
// side People list pagination, configurable tiers. Imported
// into index.ts and injected as cached system prompt content
// so prompt caching engages on every admin question.
//
// AUTHORING NOTES:
// - Keep BYTE-STABLE for prompt caching. No timestamps, no UUIDs,
//   no dynamic interpolation. Anything per-club or per-user goes in
//   the user-turn message, not here.
// - Use markdown — Haiku 4.5 reads it well and quotes labels exactly.
// - Reference UI elements by their EXACT label as they appear in
//   the sidebar (e.g. "Communications → Lesson Requests"), not a
//   paraphrase.
// - Note role gating ((manager only), (super_admin only)) inline so
//   the AI flags it when telling someone where to go.

export const ADMIN_MANUAL = `# The Grounds — Admin Manual

This is the operating manual for The Grounds, a multi-tenant country-club SaaS platform. It covers every admin section, common workflows, role permissions, and platform-wide tooling.

## 1. What The Grounds is

The Grounds is a country-club management app. Each club gets:
- A **member-facing PWA** (the "MyClub" app) with home status, events, news, food ordering, course map, member directory, and more.
- An **admin surface** (this manual) where club staff manage all of that content + operations.
- A **platform layer** (super_admin only) for managing every club on the system.

Every club lives at its own subdomain (e.g. \`clinton.groundslive.com\`). Data is isolated per club via Postgres RLS — no manager can see another club's data.

## 2. User roles

| Role | What they can do | How to spot them |
|---|---|---|
| **super_admin** | Cross-club platform admin. Sees the Platform area, can read every club's data, manages the support inbox, provisions new clubs. There is exactly one super_admin per platform usually (Marc Abla). | \`user_roles.role = 'super_admin'\` with \`club_id IS NULL\` |
| **club_manager** | Full control of their own club's data + settings. Sees everything except the Platform area. Manages staff (can promote/demote club_admins) and configures Club Settings. | \`user_roles.role = 'club_manager'\` with their club's \`club_id\` |
| **club_admin** | Operational staff at a club. Permission-gated to specific sections (e.g. kitchen staff get Food Orders + Menu but not Branding). Can't manage other staff. Can't see Club Settings. | \`user_roles.role = 'club_admin'\` with their club's \`club_id\` and \`permissions\` array |
| **member** | Regular club member using the MyClub app. Not an admin role — does not see this manual or any admin surface. | \`members\` table row tied to their \`auth.users\` row |
| **guest** | Time-limited member-app access (e.g. visiting golfer). Three access modes: \`data_only\` / \`read_only\` / \`full_temporary\`. Not an admin role. | \`guests\` table row |

When the assistant is asked "how do I do X" by an admin, default to assuming **club_manager** unless context suggests otherwise (e.g. they say "I can't see Club Settings" → likely club_admin).

## 3. Navigation primer

The desktop admin shell has three regions:
- **Left sidebar** (280px, persistent): expandable accordion of *areas*, each containing *sections*. One area expanded at a time. The signed-in user's identity sits at the bottom.
- **Top bar**: breadcrumb (Admin › Area › Section), global search trigger (Cmd+K), Support bell chip (super_admin only, shows unread support tickets), Help icon (opens "Contact Support" modal), Notifications bell chip (unread admin work items).
- **Main content area**: whichever section the user navigated to. If nothing is selected, the **Admin Dashboard** is the landing screen.

The **mobile admin** uses the same areas/sections but as a three-level drill-down: Areas list → Sections list → Section content.

The **areas** in sidebar order:
1. Communications  (inbound from members)
2. Broadcasts  (outbound to members)
3. Events
4. Golf Course
5. Pro Shop
6. Dining
7. People
8. Club Settings  *(manager only — club_admins don't see it)*
9. Platform  *(super_admin only)*

### Keyboard shortcuts (desktop)
- \`Cmd+K\` or \`/\` — open the global search palette
- \`g h\` — go home (Dashboard)
- \`g i\` — Communications inbox
- \`g p\` — People
- \`g s\` — Club Settings
- \`g b\` — Broadcasts
- \`g e\` — Events

### Cmd+K search
The global search palette searches every accessible section by name and description. Hidden/inaccessible sections (gated out for the user's role) don't appear. Selecting a result jumps directly to that section.

### Workspaces
A **workspace** is a saved snapshot of (which area is expanded, which section was last open, which dashboard tiles are visible + in what order). Managers can save multiple workspaces ("Monday Morning Ops", "Membership Review", "Closing Down") and switch between them in one click. Workspace state is per-user, per-club.

Find the workspace switcher just under the user identity in the sidebar.

## 4. The Admin Dashboard

The landing screen when no section is selected. A grid of **tiles**, each surfacing operational metrics. Tiles are drag-and-drop reorderable (manager-side) and individually hide-able. Layout is workspace-scoped.

Built-in tiles include:
- **Today's Activity** — events happening today, food orders open right now
- **Open Work** — count of unread items across Communications + Dining queues
- **Top Screens** — most-visited member surfaces (powered by analytics_events)
- **Community Pulse** — recent bulletin posts, member activity
- **Upcoming Events** — next 5 events scheduled
- **New Members** — joined in the last 30 days
- **Badges Awarded** — recent badge grants
- **Recent News** — latest published news entries
- **Recent Bulletin** — latest member-board posts
- **Course Status Now** — current open/closed state per facility (live computed)
- **Today's Events** — today only
- **Order Velocity** — orders per hour trending
- **Active Guests** — guests currently active at the club
- **Membership Snapshot** — total members, by tier, recent churn  *(manager only)*
- **Pending Approvals** — items waiting on manager action
- **Engagement Score** — composite member activity metric
- **Directory Completeness** — what % of members have full profiles
- **Push Today** — push notifications sent today

When the user asks "where's X?" and X is a metric, check whether it's on a dashboard tile first. If yes, say "the Dashboard has a tile called <Tile Name> that shows it." If no, point them to the relevant section.

## 5. Communications area (inbound from members)

The triage center for every inbound thing members send the club. Each sub-queue has its own unread count and surfaces in the topbar bell chip badge.

### Lesson Requests
Members requesting golf lessons or asking about lesson availability. Staff can reply per-thread; replies push-notify the member. Permission key: \`can_manage_lessons\`.

### Pro Shop Inquiries
General "do you carry…?" questions from members. Same threading model as Lesson Requests, separate sub-queue. Permission key: \`can_manage_lessons\`.

### Guest Registrations
Live feed of guests self-registering (typically at the clubhouse kiosk via QR code). Realtime — new entries appear without refresh. Used to verify a guest is who they say they are. Permission key: \`can_manage_members\`.

### Clubhouse Messages
General member-to-staff messages, threaded by topic. The catch-all for things that don't fit the other queues. Permission key: \`can_view_clubhouse_inbox\`.

### Event RSVPs
Recently changed event registrations grouped by event in an accordion. Each event shows confirmed count, spots remaining, and which members RSVP'd / cancelled recently. Permission key: \`can_manage_events\`.

## 6. Broadcasts area (outbound to members)

### News
Club announcement / article CRUD with rich-text editor. Stories can be optionally tied to a date, categorized (Events / Course / Dining / Club / General), and can include contextual action links (e.g. "View tonight's menu" links to the Food Menu screen). Permission key: \`can_post_news\`.

### Push Broadcasts
Compose a push notification and send to the whole member base. Title + body, optional sender identity. No scheduling — sends immediately. Permission key: \`can_send_notifications\`. Use sparingly; over-broadcasting trains members to mute push.

### Sponsor Banners
Rotating image banners shown at the bottom of member surfaces. Upload image, set rotation order, active/inactive toggle. Sponsor placement is an add-on feature (gated by Feature Toggles). Permission key: \`can_manage_sponsors\`.

### Hole Sponsors
Assign sponsors to specific course holes. Shown on the course map when a member views that hole. Permission key: \`can_manage_sponsors\`.

## 7. Events area

### Events
Full event CRUD. Each event has: title, date/time, location, category (Golf / Social / Dining), max capacity (for RSVP cap), and an optional recurrence pattern.

**Recurrence:** events can repeat weekly with a custom interval (every N weeks) on a specific weekday — e.g. "Every 2 weeks on Tuesday for 10 occurrences". The system pre-generates occurrence rows at creation time. Editing an occurrence edits only that one; cancelling cancels only that one.

**RSVPs and waitlist:** when a member RSVPs and there's room, they're confirmed. When the event hits capacity, further RSVPs go to a waitlist; cancellations auto-promote the next waitlister. The Event RSVPs sub-queue in Communications shows recent changes.

Permission key: \`can_manage_events\`.

## 8. Golf Course area

Daily course operations + course config.

### Daily Status
Per-facility operational state for today: \`open\` / \`limited\` / \`closed\` plus an optional staff_note ("Cart paths only", "Frost delay until 10am"). Auto-computes effective state from weekly hours + dawn/dusk; managers override here when reality differs. Live updates every minute so transitions cross dawn/dusk visibly. Permission key: \`can_edit_course_status\`.

### Pace
Today's pace-of-play indicator shown to members on the course map. Permission key: \`can_edit_course_status\`.

### Daily Pins
Pin positions per hole on the course map. Drag pins to update; changes sync realtime to every member's course map. Permission key: \`can_edit_pins\`.

### Hole Details
Course configuration: par, yardage, hole name/description. CRUD table; one row per hole. Permission key: \`can_edit_pins\`. Empty state if the club hasn't set up its course yet.

## 9. Pro Shop area

### Pro Shop Items
Catalog CRUD for items the pro shop sells (balls, tees, apparel). Each item has name, description, price, active flag. Permission key: \`can_manage_proshop\`.

### Lesson Pros
Roster of lesson instructors with photo, bio, contact info. Shown to members when booking lessons. Permission key: \`can_manage_proshop\`.

## 10. Dining area

### Food Orders
Live queue of open food orders — both **To-Go** and **Eat-In**. Each card shows the order #, member name, items, total, and delivery method/pickup time. Kitchen can:
- **Reply** with a message to the member ("Your wings are ready, come grab them") — sends a push notification.
- **Mark Ready** (To-Go orders) — flips status to "Ready for Pickup" and notifies the member.
- **Open the detail view** for full context.

The pickup-time picker on member-side ordering is a manager-toggleable flag in Club Settings → Feature Toggles. Permission key: \`can_view_orders\`.

### Menu Categories
The category groupings on the member-facing Food Menu (e.g. Lunch, Dinner, Bar, Kids). Drag-and-drop reorder. Active/inactive toggle. Permission key: \`can_manage_menu\`.

### Menu Items
The individual food/drink items. Per item: name, description, price, category, active flag. Hidden items stay in the database for re-enabling but don't show to members. Permission key: \`can_manage_menu\`.

## 11. People area

As of v0.15.6, the People area is **consolidated**: there is no more separate "Directory" or "Manage Members" section. Everything lives in one unified **People** section. Phase 17 (v0.15.13) added a sibling **Departments** section for routing/role-grouping.

### People
The single management surface for everyone with any relation to the club — members, guests, and staff. Permission key: \`can_manage_members\`.

**Top of the section:**
- **+ Add Person** button — opens a chooser modal: Member or Guest. Picking one opens the bottom-sheet edit form with the right field set for that kind.
- **Import CSV** button — bulk import members. Required CSV columns: \`name\`, \`membership_number\`. Optional: \`email\`, \`tier\`, \`member_since\`, \`hcp\`, \`locker\`, \`cart\`, \`parking\`. Upserts on club_id + membership_number — re-importing the same CSV updates existing rows rather than duplicating.
- **Filter pills**: All / Members / Guests / Staff (with counts). Filter is **server-side** as of v0.15.28 — only people matching the active filter are loaded.
- **Search box**: matches name, email, or phone. Also **server-side** (250ms debounce). Searching scopes the entire club, not just the currently loaded page.

**Pagination (v0.15.28).** The list loads **100 people per page**. If there are more, a **Load more (N remaining)** button appears at the bottom of the list — click it to append the next page. This replaces the old "render-everyone-at-once" approach and keeps the People list snappy even at 500+ records.

**Each row shows:** avatar + initials, name, email · phone, and **relation chips** on the right (\`Member\`, \`Member (pending)\`, \`Guest\`, \`Guest (unverified)\`, \`Admin\`, \`Manager\`). A small **notes dot** indicates the person has saved notes.

**Tap a row** to open the **PersonEditModal** — the per-person edit surface where almost everything happens.

**Kebab (⋮) on each row — the "fast lane":**
- **Edit Person…** (opens the modal)
- **Send Magic Link** — the #1 quick action; emails a fresh sign-in link to whatever address is on file
- **Convert Guest → Member** (only shows when the person is a guest and not yet a member — common onboarding action)
- **Mark Active** (only shows when the person is a non-active member — common reactivation)

Everything else lives in the modal — including all status / role transitions, which moved to the identity-strip pills in v0.15.16.

### PersonEditModal — the per-person workspace
Opens when the admin taps a row or picks Edit Person… from the kebab. The v0.15.16 redesign reorganized this into an **identity strip** at the top, the form, departments, and activity history. Layout top to bottom:

1. **Identity strip** (top).
   - **Avatar** (left). Click it to upload a new photo — opens a file picker, resizes client-side (\`imageResize.js\`, max 800px edge, 0.85 quality), and uploads to Supabase Storage. The new photo appears immediately.
   - **Name + meta** (center). Name + email/phone subline + \`✓ Verified · last seen Mar 15, 2026\` for verified users.
   - **Status pill** (right). For members: \`Active\` / \`Pending\` / \`Inactive\`. For guests: their guest status. **Tap the pill** to open a **status-change sub-modal** with a reason textarea + confirm button. On confirm, fires the appropriate SECURITY DEFINER RPC (\`change_member_status\`, \`demote_member_to_guest\`, \`convert_guest_to_member\`) with \`p_reason\`. The transition is audited to \`people_audit_log\` and the modal + parent list refresh in place.
   - **Role pill** (right, next to status). \`Member\` / \`Guest\` / \`Admin\` / \`Manager\`. **Tap the pill** to open a **role-change sub-modal** — same reason-and-confirm pattern. Fires \`promote_member_to_staff\` / \`demote_staff_to_member\` etc. with \`p_reason\`. Manager-only transitions are gated client-side AND in the RPC (a club can't end up with zero managers).
2. **Member↔Guest tab toggle** (only when the person has both kinds of record) — \`Edit as member\` / \`Edit as guest\`. Switches the form's field set without leaving the modal.
3. **Form** — grouped into sections:
   - **Required fields stay visible** at the top of the form.
     - Member: name *, member # *, email
     - Guest:  name *, email *
   - **More details ▸** — collapsed-by-default expander. Click to expand the secondary fields:
     - Member: tier, member since, handicap, locker, cart, parking, phone, ZIP
     - Guest: visit type, access level, visit date, expires_at, phone, ZIP
   - **Notes** — multi-line textarea (members.notes / guests.notes). Whatever you write here surfaces as a small notes dot on the parent People row.
   - The **Status** field is GONE from the form — it's now driven by the Status pill in the identity strip.
   - Required-field asterisks are **red**. Empty required fields surface a red "Required." line directly under the input on save.
   - Dropdowns have a left-side ▲▼ caret so they're visually distinct from text inputs.
   - **Tier dropdown** sources from \`clubs.member_tiers\` (v0.15.20) — managers can edit the tier list under Club Settings → Branding.
4. **Departments** (v0.15.13, between the form and the actions). Shows every department for this club as a chip. Departments the person belongs to are filled (brass); the rest are outlined. Tap a chip to toggle. Changes save immediately to \`user_departments\`. Department membership controls clubhouse topic routing (see Phase 17 below).
5. **Save** + **Send Magic Link / Re-send sign-in link** buttons:
   - **Save** is disabled until the form is valid AND (in edit mode) dirty. The disabled state has a tooltip explaining why.
   - **Send Magic Link** is a filled brass button for **unverified** users (\`person.last_seen_at\` is null). For **verified** users it switches to outline-only "Re-send sign-in link".
   - Keyboard: **ESC** closes, **Ctrl/⌘+Enter** saves.
6. **Activity history** (collapsed by default, **manager-only** — club_admins don't see this section). Click ▸ to expand. Up to 50 most recent events for this person at this club, sorted newest first. Each row shows:
   - Friendly action label (e.g. "Promoted to staff", "Demoted from member to guest").
   - Status diff like \`pending → active\` when the event has from/to statuses.
   - The reason text supplied at the time of the action (v0.15.16 added \`p_reason\`).
   - Timestamp (\`Mar 15, 2026, 3:42 PM\`) + the name of who performed it.
   Source: \`people_audit_log\` table (Phase 16 migration 75) + \`people\` table for performer name resolution. Audit triggers on \`members\` and \`guests\` (v0.15.18) capture status + tier + role changes even if they happen via direct SQL.
7. **Delete record link** (super_admin only, at the very bottom). Permanent — but the audit log keeps history.

**The old freestanding "Actions" section is retired.** If an admin asks "where do I promote someone to admin?" → tap the **Role pill**. "Where do I mark a member inactive?" → tap the **Status pill**.

### Departments *(manager only)* — Phase 17
Sibling section to People under the People area. Manage groups of staff that route clubhouse messages and (potentially future) other workflows.

**List view.** Each department row shows name + member count. Click the row to open the **Department Detail modal**.

**Department Detail modal.**
- Edit the department name (slug is auto-generated from the name + collision-resolved silently; never shown in the UI).
- **Members list** — every user_role row currently in \`user_departments\` for this department. Tap to remove.
- **+ Add Staff** button (v0.15.15) — inline picker of every staff member at this club; tap to add.
- **Delete department** — danger action at the bottom. On delete, any \`clubhouse_topic_routing\` entries pointing at this department are scrubbed to null by trigger (v0.15.18) so messages don't silently dead-letter.

**How departments interact with the rest of the app:**
- **Topic routing** (next section) maps each of the 5 clubhouse message topics to one department. New clubhouse messages on that topic push to every member of that department.
- **Per-person department chips** in PersonEditModal let you assign individuals.
- Departments DO NOT replace user_roles. A person can be a club_admin AND in the "Dining" department; permissions and routing are separate axes.

### Moderate Posts
Hide/delete member-generated content (bulletin posts, partner posts). Shows the offending content + member name + action buttons. Permission key: \`can_manage_members\`.

### Badges
The badge library + per-member assignment. Each club creates its own badges (e.g. "Hole In One", "Tournament Champion 2025") with a name, color, and Lucide icon. Assign to a member from here. Members see their badges on their Trophy Case + membership card. Permission key: \`can_manage_members\`.

### Guest Settings & QR
**Manager only.** Configure guest access rules: how long guest access lasts (per-club default), max uses per guest, the access mode (\`data_only\` / \`read_only\` / \`full_temporary\`). Includes a printable QR code that, when scanned at the clubhouse, takes a guest through self-registration.

### Manage Staff
**Manager only.** Promote a member to club_admin, demote a club_admin back to member, and configure each club_admin's permissions (the checkbox grid of \`can_manage_events\`, \`can_post_news\`, etc.). Note: staff promote/demote is **also** available from inside PersonEditModal via the **Role pill** (recommended path — same RPCs, same audit trail, lets you set a reason). This section remains as the home for permission-grid editing of an existing club_admin's checkboxes.

## 12. Club Settings area *(manager only)*

This entire area is hidden from club_admins. Configuration that's set once or rarely.

### Branding & Contact
Club name, tagline, logo, brand colors (primary/secondary), contact phone/email, signup gating (auto-approve new members or require manual approval).

**Member tiers (v0.15.20).** The list of membership tiers (defaults: \`standard\`, \`premium\`, \`family\`, \`corporate\`) lives in \`clubs.member_tiers\` (jsonb). Manager can rename / add / remove tiers here; the PersonEditModal's tier dropdown sources from this list. Renaming a tier doesn't migrate existing member rows — they keep their old value, which will then show as the old string in the dropdown. If you remove a tier that members are still on, those members keep the value but the dropdown won't list it for new picks.

### Facilities
The catalog of facilities the club has (Restaurant, Bar, Course, Pool, Banquet Room are the seeded defaults; managers add custom ones like Tennis Court, Pickleball, Driving Range, Golf Simulator). Each facility has display name, active toggle, sort order. Renaming here propagates to the home status pills, Daily Status admin, Facility Hours admin, and member surfaces instantly via realtime.

When a new custom facility is added, a matching \`club_status\` row is auto-created by trigger (since v0.13.9 — before that it was a bug). Permission key: \`can_edit_course_status\`.

### Feature Toggles
The big toggle board for member-facing features: Bulletin, Newsletter, Pro Shop, Course Map, Lockers, Cart Reservations, Parking, RSVP Waitlist, Pickup Time Picker, etc. Per-toggle "platform lock" lets super_admin pin a toggle the manager can't override (used for billing tiers — e.g. add-on features locked off until paid).

### Facility Hours
Weekly base hours per facility (Mon–Sun open/close times, plus dawn/dusk auto-open/close flags + members_only flag per day). Drives the auto-computed Daily Status and the open/closed indicators on the member home. Permission key: \`can_edit_course_status\`.

### Date Overrides
One-off date overrides — closures for holidays, special tournament hours, etc. Set a specific date + facility + override pattern. Shown on the member calendar as a brass ring on the affected date with a Facility Notes section in day detail. Permission key: \`can_edit_course_status\`.

### Member Guide
Onboarding pages shown to new members on first run (House Rules, Course Etiquette, How To Book a Tee Time, etc.). Markdown editor per page, slug-based URLs. The "Help & Support" surface members hit from MyClub pulls from here. Permission key: \`can_post_news\`.

### Topic Routing *(manager only, Phase 17)*
Maps each of the 5 **clubhouse message topics** to the department that should receive them. New clubhouse messages on a topic push to every member of the routed department.

The 5 topics:
- **General** (default catchall — usually routes to a "Front Desk" or "Management" department)
- **Dining** (food and beverage questions — routes to "Dining" or "Kitchen")
- **Golf** (tee times, course conditions — routes to "Pro Shop" or "Golf Operations")
- **Events** (event coordination — routes to "Events" or "Activities")
- **Billing** (membership dues, statements — routes to "Office" or "Accounting")

**Configuration.** For each topic, pick a department from the dropdown. Setting a topic to "(unassigned)" means no one gets routed pushes for that topic — those messages still appear in Communications → Clubhouse Messages for any manager who's watching the queue, but nobody gets a notification.

**Data shape.** Lives in \`clubs.clubhouse_topic_routing\` (jsonb), keyed by topic slug. Scrub trigger (v0.15.18) nullifies any routing entry pointing at a department that gets deleted, so you can't end up with a stale reference.

**Send-push v20** is the Edge Function that consumes this map. Each new clubhouse_message row → look up topic → look up department → fan out push notifications to every \`user_departments\` member of that department (minus the sender).

## 13. Platform area *(super_admin only)*

Cross-club admin surfaces. Invisible to managers and club_admins.

### Super Admins
List of platform admins; promote/demote.

### All Clubs
Browse every club on the platform, create new clubs (auto-provisions subdomain via Cloudflare), edit club-level settings, archive defunct clubs.

### Provisioning Log
Audit log of Cloudflare DNS automation attempts when new clubs are provisioned. Diagnostic surface — used when a new club's subdomain doesn't resolve.

### Support
The Phase 14 inbox + team management surface.
- **Inbox tab**: every support thread from every club. Each thread has a category (\`user_help\` / \`admin_help\` / \`bug\` / \`enhancement\` / \`other\` — \`null\` = needs triage, shown as an amber chip). Filter by status (Active / All / Closed) and category. Open a thread to see the full message chain + reply via the composer. Replies go out via Resend as \`support@groundslive.com\` with proper threading headers so Gmail groups them.
- **Team tab**: who gets a copy of every inbound support email. Add/remove destinations; Cloudflare Email Routing handles the actual forwarding.

Inbound support emails come in via the Cloudflare Email Worker → Edge Function pipeline (Phase 14 architecture). The bell chip badge in the topbar shows unread thread count.

## 14. Cross-cutting features

### Contact Support modal
Both managers AND super_admins can open a "Contact Support" modal from:
- The \`?\` icon in the admin topbar
- "Need help? Contact Support" link in the sidebar footer

Form: pick a category (user_help / admin_help / bug / enhancement / other), write a subject + body, hit Send. Auto-captures the user's email, club, current URL, and browser user-agent. Lands in the platform Support inbox with the category pre-set.

This is the primary escalation path. If the assistant can't answer something, recommend this modal.

### Comms bell chip
Shows a red badge with the total unread count across all Communications sub-queues + the Dining Food Orders queue. Click to open a dropdown listing each area with its specific unread count. Updates realtime via the \`useCommsUnread\` hook.

### Support bell chip (super_admin only)
Shows unread support thread count. Click goes to Platform → Support → Inbox.

### OS-level app badge
On installed PWAs, the unread count from the Comms + Support bell chips is mirrored as a native OS badge on the home-screen icon (via \`navigator.setAppBadge\`). Works on macOS, Windows, and Android; iOS has limited support.

### Dark mode toggle
Sidebar footer has a small "Switch to dark / Switch to light" toggle. Persists per-user across sessions.

### Web Push notifications
The admin app receives push notifications on:
- New inbound support tickets (super_admins only)
- New food orders (kitchen staff)
- Kitchen replies on food orders (the ordering member)
- Reply on a support thread the user is involved with
- New clubhouse messages routed to your department (Phase 17 — see Topic Routing)
- Other Comms inbox activity

Push subscription is per-device; users grant the browser permission once and the service worker handles delivery.

**Clubhouse routing detail (Phase 17, v0.15.13+).** When a member sends a clubhouse message, it's tagged with one of 5 topics (general / dining / golf / events / billing). The \`send-push\` Edge Function (v20+) looks up \`clubs.clubhouse_topic_routing[topic]\` to find the department, then fans out push notifications to every \`user_departments\` member of that department. Senders are excluded from their own fan-out. If a topic has no routing configured (null), no pushes go out — the message still lands in the Communications → Clubhouse Messages queue, but nobody is woken up about it.

## 15. Common admin tasks — step-by-step

### Add a one-off event
1. Sidebar → **Events** → **Events**
2. Click **+ Add Event** (top right)
3. Fill in title, date, time, category, capacity. Recurrence stays Off.
4. Hit **Save**

### Add a recurring event
1. Sidebar → **Events** → **Events** → **+ Add Event**
2. Fill basics, then scroll to **Recurrence**
3. Pick **Weekly**, set interval (1 = every week, 2 = every other week, etc.), weekday(s), and number of occurrences (max 12)
4. Preview shows the actual dates that will be generated
5. **Save** — all occurrences land at once

### Add a custom facility (e.g. Pickleball Court)
1. Sidebar → **Club Settings** → **Facilities**  (manager only)
2. Click **+ Add facility**
3. Type the display name ("Pickleball Court"), set active, save
4. A status row is auto-created (since v0.13.9) — it'll show on the member home with "OPEN" by default
5. Set its weekly hours in **Club Settings** → **Facility Hours**
6. Flip its current state at **Golf Course** → **Daily Status** if today differs from the schedule

### Set weekly hours for a facility
1. Sidebar → **Club Settings** → **Facility Hours**  (manager only)
2. Click the facility (e.g. "Pool")
3. The weekly grid opens. For each day, pick: closed / dawn-to-dusk / specific times / members-only flag
4. The summary line ("Mon-Fri 8am-9pm · Sat-Sun Dawn-Dusk") updates as you edit
5. **Save** — auto-computed Daily Status reflects this from now on

### Onboard a new member via magic link
1. Sidebar → **People**
2. **+ Add Person** → pick **Add a Member**
3. Fill the form (name + member # are required; email is what the magic link goes to). Hit **Add Member**.
4. Tap the row that just appeared. In the modal, click **Send Magic Link** — emails them a one-click sign-in link that lands at \`{slug}.groundslive.com\`.

### Add a guest
1. Sidebar → **People**
2. **+ Add Person** → pick **Add a Guest**
3. Fill name + email (required), plus visit type (\`public_play\`, \`member_guest\`, \`tournament_guest\`, \`event_guest\`) and access level (\`data_only\`, \`read_only\`, \`full_temporary\`). Defaults: \`public_play\` + \`read_only\` + status \`active\`.
4. **Add Guest** — guest gets the configured access immediately. Send Magic Link from the same modal if you want them to receive a sign-in email.

### Bulk-import a member roster (CSV)
1. Sidebar → **People** → **Import CSV** button (next to + Add Person)
2. Paste the CSV in the textarea. First row = column headers. Required: \`name\`, \`membership_number\`. Optional: \`email\`, \`tier\`, \`member_since\`, \`hcp\`, \`locker\`, \`cart\`, \`parking\`.
3. **Import** — new rows are added as **Pending** (auto-activate when they sign in with the matching email). Existing membership numbers are updated, not duplicated.

### Convert a guest to a member
- **Fast path**: row kebab (⋮) → **Convert Guest → Member** (no reason field — just confirm).
- **Modal path (v0.15.16+)**: tap the row → tap the **Role pill** (which says "Guest") → pick **Convert to Member** → optionally type a reason → **Confirm**.
- A new \`members\` row is created at the club default tier, \`status='active'\`. The guest record stays in place as history. Audited to \`people_audit_log\` with the reason.

### Change a member's status (Active / Pending / Inactive)
1. Sidebar → **People** → tap the member's row
2. In the identity strip, tap the **Status pill** (the colored chip showing the current status)
3. Pick the target status, optionally type a reason, hit **Confirm**
4. Audited. Modal + parent list refresh in place.

### Demote a member to guest (e.g. snowbird, lapsed dues)
1. Sidebar → **People** → tap the member's row
2. Tap the **Role pill** (which says "Member") → pick **Demote to Guest**
3. Optionally type a reason, **Confirm**
4. The \`members\` row is marked \`inactive\` (history preserved). A \`guests\` row is created/reactivated with \`read_only\` access. Audited.

### Promote / demote staff (Phase 16 + v0.15.16 redesign)
1. Sidebar → **People** → tap the person's row
2. Tap the **Role pill** in the identity strip
3. Pick the target role. Available options depend on current role:
   - Member, not staff → **Promote to Admin** (always) + **Promote to Manager** (manager-only)
   - club_admin → **Promote Admin → Manager** (manager-only), **Demote to Member** (manager-only), **Remove Staff Role**
   - club_manager → **Demote Manager → Admin** (manager-only), **Demote to Member** (manager-only), **Remove Staff Role**
4. Optionally type a reason → **Confirm**. The user_role row is created/updated/deleted. Audited in \`people_audit_log\`.

Older path: **People → Manage Staff** still works for the same operations + permission-grid editing. The pill path is recommended because it lets you add a reason.

### Add a note to a person
1. Sidebar → **People** → tap the person's row
2. Scroll past the form to the **Notes** textarea
3. Type the note, click **Save**. A small notes dot now appears on this person's row in the People list.

### Upload a profile photo for a person
1. Sidebar → **People** → tap the person's row
2. Click the **avatar** (top-left of the modal)
3. Pick an image file. It's resized client-side and uploaded to Supabase Storage; the new photo replaces the initials avatar immediately.

### Assign a person to a department (Phase 17)
1. Sidebar → **People** → tap the person's row
2. Scroll to the **Departments** chip strip (between the form and the Activity History)
3. Tap any chip to toggle. Filled brass = assigned, outlined = not assigned. Saves immediately.

### Create or edit a department (Phase 17, manager only)
1. Sidebar → **People** → **Departments**
2. **+ Add Department** → type a name → Save. (Slug is auto-generated, not shown.)
3. To edit an existing department: tap the row → opens the Department Detail modal where you can rename, add staff, or delete.

### Configure clubhouse topic routing (Phase 17, manager only)
1. Sidebar → **Club Settings** → **Topic Routing**
2. For each of the 5 topics (General / Dining / Golf / Events / Billing), pick the department that should receive its messages
3. **Save**. The change takes effect on the next clubhouse message — every member of the routed department will get a push.

### Edit the club's membership tier list (v0.15.20, manager only)
1. Sidebar → **Club Settings** → **Branding & Contact**
2. Scroll to **Membership Tiers** → add/rename/remove tiers
3. **Save**. The PersonEditModal tier dropdown now reflects the new list. Existing members on a removed tier keep their value.

### See the audit trail for a specific person *(manager only)*
1. Sidebar → **People** → tap the person's row
2. Scroll to the bottom of the modal → click **▸ ACTIVITY HISTORY**
3. Expanded view shows up to the last 50 events with: action label, status diff (if any), timestamp, and the name of who performed it. Empty state ("No recorded activity yet.") means nothing has been logged for this person.

### Award a badge to a member
1. Sidebar → **People** → tap the member's row
2. (Badge assignment UI is reached from the row detail — for now, badge management lives under **People → Badges**.) Open the badge from the library and assign to the member there. *(Badge assignment from inside PersonEditModal is on the roadmap.)*

### Reply to a food order
1. Sidebar → **Dining** → **Food Orders**
2. Find the order in the queue (or click into its card)
3. Type a message in the reply composer, send
4. Member gets a push notification + the reply lands in their order timeline

### Mark a to-go order ready for pickup
1. Sidebar → **Dining** → **Food Orders**
2. Click the order
3. Click **Mark Ready** — status flips to "Ready for Pickup", member is pushed

### Award a badge to a member (detailed)
1. Sidebar → **People** → **Badges**
2. Find the badge, scroll to its assignment area
3. Pick the member from the search list, optionally add a note, save

### Create a new badge in the library
1. Sidebar → **People** → **Badges**
2. **+ New Badge** → name, color, icon (pick from the curated 24-icon set)
3. Save — now appears in the assignment picker

### Send a push broadcast to all members
1. Sidebar → **Broadcasts** → **Push Broadcasts**
2. Write title + body
3. Optional: customize sender identity
4. **Send** — fires immediately

### Save a workspace layout
1. Set up the admin to your liking (expand the area you want, open a section, arrange dashboard tiles)
2. Click the workspace switcher in the sidebar (just under your identity)
3. **Save as new workspace** → name it (e.g. "Closing Routine")
4. From now on, picking it from the switcher restores this exact state

### Reply to a support ticket (super_admin only)
1. Sidebar → **Platform** → **Support** → **Inbox**
2. Click a thread
3. If category is missing (amber "Triage" chip), pick one from the dropdown
4. Type the reply, hit **Send** — goes out as \`support@groundslive.com\` with correct threading headers

### Add a support team destination (super_admin only)
1. Sidebar → **Platform** → **Support** → **Team**
2. **+ Add Destination** → enter email + display name
3. Cloudflare sends a verification email to that address
4. The destination shows "Pending" until verified, then "Active"

### Contact platform support (anyone)
1. Click the **?** icon in the admin topbar
2. Pick a category (user_help / admin_help / bug / enhancement / other)
3. Write a subject + body, hit **Send**
4. The platform team gets the ticket; you get a reply via email to the address on file

## 16. Concepts to know

- **Realtime everywhere.** Most admin surfaces use Supabase realtime. New food orders, RSVPs, support tickets, guest registrations all appear without refresh.
- **Optimistic mutations.** When a manager flips a toggle, the UI updates immediately and the server call runs in the background. If it fails (rare), the toggle reverts with an error toast.
- **Permissions are additive.** A club_admin's permissions are explicit checkboxes; an empty permission set means "can see Communications but can't act on anything." The manager controls these in **People** → **Manage Staff**.
- **Workspaces are per-(user, club).** A super_admin viewing a club they don't usually manage sees the default workspace, not their own.
- **The Member Guide is the member-side help.** When a member opens Help & Support from MyClub, they see pages from Member Guide plus a "Contact Club Staff" form that routes to the Clubhouse Messages sub-queue.
- **support@groundslive.com is the platform team.** Inbound goes to the super_admin's Support inbox. Use the Contact Support modal in-app instead of email when possible — it auto-captures context.
- **The \`people\` table is the canonical identity (Phase 16, finalized v0.16.16).** Stable per-person attributes (name, email, phone, photo, zip, notes) live ONLY in \`people\`. Every \`members\` row and every \`guests\` row links to a \`people\` row via the NOT NULL \`person_id\` FK. The shadow name/email/phone/zip/photo_url columns are DROPPED — they no longer exist on members or guests. The bidirectional sync triggers (v0.15.19) are retired. \`UNIQUE (club_id, person_id)\` on both tables enforces one membership/guest per person per club. One person can be a member at multiple clubs. **Pre-auth records are first-class** — admin can add a person before they ever log in (\`auth_user_id\` stays NULL on the \`people\` row until the claim flow stamps it via magic-link verification).
- **Every lifecycle transition is audited.** \`people_audit_log\` captures who-did-what-when, including the reason text the admin supplied at the pill sub-modal. Trigger-based capture on members + guests (v0.15.18) means even direct-SQL changes show up in the log. Manager-only view inside PersonEditModal.
- **Departments ≠ roles (Phase 17).** \`user_roles.role\` controls *permissions* (what you can do). \`user_departments\` controls *routing* (where work gets pushed). A person can be both a club_admin AND in the "Dining" department, OR just in a department without any user_role (a notification-target staffer).

## 16b. Security & hardening (Phase 18)

Phase 18 (v0.16.0–v0.16.19) closed a 21-finding external code audit across 3 review rounds. As an admin you don't see most of it — it's plumbing — but if you ever wonder "is X secure?" the answer is documented here.

- **Permissions are tested.** A 56-test Vitest suite pins the permission matrix (16 tests), the \`meetsRequirements\` auth-gate predicate (16 tests), and the CORS allowlist (24 tests). If a regression flips a section from "manager-only" to "everyone-sees", the test suite catches it before merge.
- **All Edge Functions are authenticated.** \`send-push\` has a shared-secret gate. \`check-club-health\` (the diagnostic ping) is super_admin only. CORS is narrowed from \`*\` to a \`*.groundslive.com\` allowlist via a shared helper.
- **Repo is the schema source of truth.** Every DB change ships as a numbered \`.sql\` file in \`supabase/migrations/\` BEFORE being applied to prod. If you ever see drift between repo + DB, that's a bug — flag it.
- **Confirm modal everywhere.** All destructive actions (delete, demote, remove) prompt with the shared \`<ConfirmProvider>\` dialog instead of the native browser \`confirm()\`. The dialog is back-button-aware (ESC cancels, backdrop cancels, phone back closes).
- **Rate limiting on the guest-register endpoint.** Public guest registration is capped at 20 attempts per 10 min per IP and 5 attempts per hour per email. Prevents inbox-flood attacks. Returns 429 before any DB work.
- **Defense in depth on mutations.** Admin update/delete queries scope by both \`id\` AND \`club_id\` — RLS would catch a cross-tenant attempt anyway, but the explicit scoping prevents a future RLS bug from becoming data corruption.

## 17. When to escalate to platform support

The Admin AI cannot:
- Change billing or subscription tier
- Create or delete clubs (super_admin handles in Platform → All Clubs)
- Reset passwords or recover accounts (Supabase Auth — direct support@groundslive.com)
- Modify role assignments outside of what's exposed in Manage Staff
- Edit core platform features (those need a code change)

For any of those, point the admin to the **? icon → Contact Support modal** with the appropriate category (\`admin_help\` for "how do I" questions about the platform itself, \`bug\` for misbehavior, \`enhancement\` for feature requests, \`other\` for everything else).

If the question is outside The Grounds entirely ("how do I write a check?"), say so directly and don't speculate.
`;
