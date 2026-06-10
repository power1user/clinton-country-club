# Grounds Live — Feature Catalog

Comprehensive inventory of every fully-live, tested feature shipped on
Grounds Live platform. Organized first by audience (Front-Facing for
members + guests, Admin for club staff + platform), then by category.

Excludes: placeholder features (e.g. Tee Time Booking — UI only, no
backend) and any feature shipped within the last 7 days that hasn't
been battle-tested yet. See `CHANGELOG.md` for the full history including
in-flight work.

Role legend used throughout:
- **Member** — full club member with an active account
- **Guest** — non-member with time-limited access (3 modes: data-only,
  read-only, full-temporary)
- **club_admin** — staff role with checkbox-granted permissions
- **club_manager** — full club control + can manage staff
- **super_admin** — platform-wide cross-club access (typically the
  platform operator)

---

# FRONT-FACING (Members + Guests)

The MyClub app — one subdomain per club, mobile-first PWA installable
to the home screen on iOS, Android, and desktop. Members sign in once
via magic-link email; the app remembers them across sessions.

## 1. Today's Club Status

### Live facility status pills
Color-coded indicator pills (green / yellow / red / blue) for every
facility the club runs — typically Course, Restaurant, Bar, Pool,
Banquet Room, plus custom additions (Tennis, Pickleball, Driving Range,
etc.). Tap any pill to see hours detail + any staff note ("Cart paths
only", "Frost delay until 10am"). Auto-toggles open/closed based on
weekly hours + dawn/dusk; managers override when reality differs.
*Available to: all members + guests.*

### Weather widget
Current temp, conditions, hi/lo, wind speed + direction, plus a 7-day
forecast strip. Pulls from a free public weather API geo-located to
the club's coordinates. Updates on every Home view.
*Available to: all members + guests.*

### Pace of Play indicator
Today's pace status (on pace / slightly slow / significantly slow)
with a colored dot. Shown on Home and at the top of the Golf tab. Only
visible after the manager has updated it for the day.
*Available to: all members + guests (where the club has enabled it).*

### Sponsor banners (add-on)
Rotating sponsor placement at the top of Home and bottom of Golf. The
club uploads sponsor images + rotation order; banners tap through to
sponsor URLs. Gated as a paid platform add-on per club.
*Available to: all members + guests when the add-on is enabled.*

### News feed
Latest club announcements + articles inline on Home. Each post has a
title, body, optional date label, and category (Events / Course /
Dining / Club / General). Contextual action links route relevant posts
to the right surface (e.g. a dining news item links to the Food Menu).
*Available to: members and full-temporary guests; hidden for read-only
guests.*

### Next Event card + Also This Week
Prominent card on Home showing the next upcoming event with date,
time, category, and spots remaining. A second event landing within 7
days appears as a smaller chip below.
*Available to: members and full-temporary guests.*

## 2. Golf

### Daily Pin Placements
Per-hole pin position on a satellite overhead view of each green.
Day-of-week selector at the top jumps between days. Tap any hole
number to see pin location, par, handicap yardage, and any greenskeeper
notes. Pin edits propagate realtime — members see updates without
refreshing.
*Available to: members and guests (read-only mode includes this).*

### Course Map
Full satellite map of all course holes with pin overlays. Tap a hole
number to zoom into the per-hole detail. Empty state if the club
hasn't configured holes yet.
*Available to: members and guests (read-only mode includes this).*

### Golf Partners Board
Bulletin-board surface for "looking for a foursome" posts. Members
post a request with game type (Foursome / Threesome / Single / Practice
/ Cart Share), date, spots needed, optional handicap, and a short
note. Other members browse, filter by game type, and contact the
poster via DM (when enabled) or through the clubhouse.
*Available to: members only.*

## 3. Food & Drink

### Menu browsing
Category-grouped menu (Lunch, Dinner, Bar, Kids, etc.) with anchor-jump
chips at the top. Items show name, description, and price. The active
section highlights as the member scrolls.
*Available to: members + guests (read-only mode can view but not
order).*

### Cart + checkout
Tap **+** to add items; **−** to remove. The Food tab shows a cart
count badge. Floating **View Order** button opens the checkout screen.
*Available to: members. Guest checkout gated per-club via a setting.*

### To-Go orders
Members specify a hole or location, optionally pick a pickup time
(15-min increments — only when the club enables the picker), add
special instructions, and place the order. Kitchen sees the order in
the admin Food Orders queue.
*Available to: members.*

### Eat-In orders
Same flow as To-Go but kitchen schedules around member's expected
arrival in the dining room.
*Available to: members.*

### Kitchen replies + Ready-for-Pickup status
Kitchen staff can message the member directly on their order ("Your
wings are ready, come grab them") — pushes a notification. To-Go orders
get a **Mark Ready** button that flips status to "Ready for Pickup"
and notifies the member.
*Visible to members on their order; staff side covered in Admin.*

## 4. Events & Calendar

### Events Calendar
Two view modes: **Calendar** (month grid with brass-ring indicators
on event days + facility override days) and **Upcoming**
(chronological list). Tap a date → events that day; tap an event →
full detail.
*Available to: members and full-temporary guests.*

### RSVP + Waitlist
Members RSVP from event detail. When the event hits its capacity,
further RSVPs go to a waitlist; cancellations auto-promote the next
waitlister. The member's RSVP shows in their My Events.
*Available to: members.*

### Event categories + filtering
Events tagged Golf / Social / Dining with a colored badge. Members can
filter the events listing by category, with preference persisted per
member.
*Available to: members.*

### Recurring events
Events can repeat weekly with custom intervals (every N weeks) on a
specific weekday. Members see each occurrence individually in the
calendar.
*Visible to all who can see events. Created admin-side.*

### My Events (RSVP history)
**Upcoming** tab shows future RSVPs; **Past** tab shows historical
ones. Tap any to open the original event detail. Cancel-RSVP control
on upcoming events.
*Available to: members.*

## 5. Community

### Bulletin Board
Text posts members write to the whole club. Categories: Classifieds,
Wanted, General. Filterable by category. Each post supports threaded
replies. Members can edit/delete their own posts.
*Available to: members only.*

### Member Directory
Searchable roster of every active member. Each row shows avatar,
name, membership tier, and earned badges (up to 4 + an overflow chip).
**Message** button starts a DM (when DMs are enabled and the recipient
hasn't opted out); fallback to "Contact via Clubhouse" otherwise.
*Available to: members only.*

### Trophy Case
Two sections: **Club Honors** (all badges this club awards, grouped
by category — Championship, Recognition, Membership) and **My Badges**
(member's own awards with date earned). Tap any badge to see all
current holders. Section name is customizable per club.
*Available to: members. Visibility of the whole surface gated by
feature flag.*

### Member-generated post replies
Reply threads on bulletin posts, partner-board posts, news items, and
events. Reusable threading system — any post-style surface can have
member-to-member replies.
*Available to: members.*

## 6. My Club (Personal)

### Profile card
Name, membership number, tier, member-since date, optional handicap.
Avatar uses initials by default; uploaded photo if Profile Photos is
enabled. Read-only — managers control the data.
*Available to: members.*

### Digital Membership Card
Tappable card with member info + an integrated QR code for clubhouse
scanning. Shows badges earned (up to 5 with overflow). Tap to flip
between card view and QR view.
*Available to: members.*

### Message Clubhouse
Threaded support channel to club staff — separate from member-to-member
DMs. Subject + body + reply chain. Always available (not gated by DM
flag). Staff replies push-notify the member.
*Available to: members.*

### Pro Shop catalog
Browse pro-shop items (golf balls, tees, apparel, etc.) with name,
description, price, stock status. Members file inquiries rather than
checking out — the pro contacts to coordinate sale, fitting, or
special order. Inquiries land in admin Communications.
*Available to: members. Full-temporary guests can browse but not
inquire.*

### Book a Lesson
Members request a lesson with one of the club's lesson pros. Pick the
pro from the dropdown, select date, add notes. Request lands in admin
Communications and notifies the pro.
*Available to: members.*

### My Inquiries
Historical view of submitted lesson requests + pro shop inquiries.
Members mark inquiries as "Contacted by club" or delete them.
*Available to: members.*

### Member Guide
Onboarding content — house rules, course etiquette, how-to-book guides,
FAQs. Markdown-rendered, slug-routed pages managed by the manager. The
in-app Help surface for members.
*Available to: members + guests.*

### Help & Support
FAQ accordion + contact options. **Contact Platform Support** emails
support@groundslive.com; **Contact Your Club** uses the club's
configured phone/email.
*Available to: all signed-in users.*

## 7. Messaging

### Member-to-member DMs
Private threads between members initiated from the Member Directory,
event detail, bulletin post, or partner post. Real-time delivery with
push notifications. Members can opt out of receiving DMs (button
disappears for opted-out members).
*Available to: members only, when the club has enabled DMs as a
feature flag.*

### Reply threads on member-generated content
Bulletin posts, partner posts, and event detail pages all support
member reply threads (the same threading system as DMs). Replies are
inline + push-notify the post author.
*Available to: members.*

### Push notifications
Web Push delivered via the browser/PWA. Members opt in once; future
events that target them (DM, reply on their post, RSVP confirmation,
order status changes) trigger a push. OS-level app badge mirrors the
unread count on the home-screen icon for installed PWAs.
*Available to: members; requires browser permission grant.*

### Inbox (in-app activity feed)
Unified inbox showing recent DMs, reply threads, kitchen messages on
your orders, and platform-side announcements. Swipe-to-dismiss with
undo + bulk-select mode for cleanup.
*Available to: members.*

## 8. Guest System

### Self-service guest registration via QR
Member-linked QR codes (the inviting member auto-populates as
referring_member_id) and a clubhouse QR (no referring member; for
public play). Guests scan the code at the clubhouse kiosk, fill out a
short form, and get app access for a configurable duration.
*Visible to: anyone with the QR. Members get their own QR in
membership card.*

### Three access modes
- **Data only** — registers the guest but grants no app access ("Visit
  recorded" screen only).
- **Read only** — Home (status + weather + pace), Golf (pin
  placements + course map), Food (menu browse), slim My Club.
  Community hidden.
- **Full temporary** — read-only + news + today's events + the
  Community tab's Events Calendar.
Configurable per-club as the default for new guests.

### Time-limited access
Per-club configured visit duration OR indefinite. Guest access auto-
expires; can be extended by club staff. Each guest's visit count is
tracked.

### Guest order toggle
Per-club setting whether guests can place food orders during their
visit window.

## 9. Personalization & Settings

### Notifications
Toggle to enable/disable Web Push subscription. Per-device — members
can have push on their phone but off on their desktop.
*Available to: members.*

### DM privacy
**Allow members to message me** toggle. When off, the Message button
disappears from the member's directory row + reply paths route to
clubhouse.
*Available to: members.*

### Display Mode (light / medium / dark)
Three brightness-shifted variants of the club's brand palette. Persists
per member across sessions.
*Available to: members, when the club has enabled the Display Mode
feature flag.*

### Profile photo
Members can upload a photo that appears on their membership card, in
the directory, on bulletin posts, and in chat bubbles. Fallback to
initials avatar.
*Available to: members, when the club has enabled the Profile Photos
feature flag.*

### Install as App (PWA)
In-app prompt that guides members through adding the app to their home
screen on iOS, Android, or desktop. Once installed, the app launches
without browser chrome and supports OS-level push + badging.
*Available to: all members (browser permitting).*

## 10. Account & Auth

### Magic-link sign-in
Members enter their email, receive a one-tap login link. No password
to manage. Existing session persists across reloads. Same flow works
for fresh signup at clubs that auto-approve members.
*Available to: members + staff + guests.*

### Membership-pending mode
Members signed up but not yet approved by the club see Home (limited)
+ a clear "Pending Approval" banner. Ordering, RSVPs, posting, and
messaging unlock once a manager approves them. Optional contact info
shown so they can call the club office to nudge.
*Visible to: pending members.*

### Terms of Use gating
Members must accept the current ToU version before reaching any app
screen. Versioned — when ToU is updated, returning members re-accept.
*Required for: all members + staff.*

---

# ADMIN (Club Staff + Platform)

A separate shell from the member app. Desktop admin uses a persistent
left sidebar + top bar + main content layout; mobile admin uses a
3-level drill-down (Areas → Sections → Section content). Same data,
same components, two layouts.

## 11. Admin Dashboard

### Customizable tile grid
Landing screen for the admin. Drag-and-drop tile reorder + per-tile
show/hide, all persisted per (user, club). Tiles include: Today's
Activity, Open Work, Top Screens, Community Pulse, Upcoming Events,
New Members, Badges Awarded, Recent News, Recent Bulletin, Course
Status Now, Today's Events, Order Velocity, Active Guests,
Membership Snapshot, Pending Approvals, Engagement Score, Directory
Completeness, Push Today.
*Available to: any admin role. Some tiles (Membership Snapshot) are
manager-only.*

### Workspaces
Named snapshots of (sidebar open area + last open section + dashboard
tile layout). Managers create multiple workspaces — "Monday Morning
Ops", "Membership Review", "Closing Routine" — and switch between
them in one click. Per-(user, club).
*Available to: any admin role.*

## 12. Communications (Inbound from Members)

### Lesson Requests inbox
Queue of lesson booking requests + inquiries from members. Threaded
per-member; staff replies push-notify the member.
*Permission: can_manage_lessons.*

### Pro Shop Inquiries inbox
Queue of general pro-shop questions from members ("Do you carry…?").
Separate sub-queue from Lesson Requests with the same threading model.
*Permission: can_manage_lessons.*

### Guest Registrations feed
Realtime feed of guests self-registering at the clubhouse kiosk. New
entries appear without refresh. Includes member-linked guests (referring
member shown) and clubhouse QR guests (no referring member).
*Permission: can_manage_members.*

### Clubhouse Messages
Threaded staff-facing inbox for general member-to-staff messages.
Catch-all for things that don't fit the other queues. Sortable by
recent activity.
*Permission: can_view_clubhouse_inbox.*

### Event RSVPs inbox
Recently-changed event registrations grouped by event in an accordion.
Each event shows confirmed count, spots remaining, and which members
RSVP'd or cancelled recently.
*Permission: can_manage_events.*

### Aggregate unread badge
Bell chip in the topbar shows total unread across all sub-queues +
the Food Orders queue. Dropdown breaks down per area. Realtime updates.
*Visible to: any admin who can see at least one Communications
sub-queue.*

## 13. Broadcasts (Outbound to Members)

### News CRUD
Rich-text editor for club announcements / articles. Categorize (Events
/ Course / Dining / Club / General), optional date label, optional
contextual action link mapping (e.g. dining post links to the Food
Menu). Publish / unpublish / delete.
*Permission: can_post_news.*

### Push Broadcasts
Compose a push notification to the whole member base. Title + body +
optional sender identity. No scheduling — fires immediately.
*Permission: can_send_notifications.*

### Sponsor Banners management
Catalog of rotating sponsor banner records: upload image, set rotation
order, active/inactive toggle, optional link URL. Active banners appear
on member Home and Golf surfaces. Gated as a platform add-on.
*Permission: can_manage_sponsors. Add-on must be enabled by
super_admin.*

### Hole Sponsors
Per-hole sponsor assignment. When a member views a hole on the course
map, the assigned sponsor renders alongside the hole detail.
*Permission: can_manage_sponsors.*

## 14. Events Management

### Events CRUD
Create, edit, cancel events. Fields: title, date, time (start/end),
location, category (Golf / Social / Dining), max capacity, optional
recurrence pattern, description. Recurrence supports weekly intervals
with a specific weekday (1–12 occurrences).
*Permission: can_manage_events.*

### RSVP + waitlist management
RSVPs auto-confirm when there's room; auto-waitlist when full;
waitlist auto-promotes on cancellations. Admin can see full RSVP list
per event, with the option to remove members or mark attendance.
*Permission: can_manage_events.*

## 15. Golf Course Operations

### Daily Status (per-facility)
Set today's operational state per facility — open / limited / closed
— plus an optional staff_note ("Cart paths only", "Frost delay until
10am"). Auto-computes effective state from weekly hours + dawn/dusk;
admin overrides here when reality differs. Live every-minute updates so
dawn/dusk transitions appear visibly.
*Permission: can_edit_course_status.*

### Pace of Play
Today's pace-of-play indicator (on pace / slightly slow / significantly
slow). Surfaces to members on Home + Golf in real time.
*Permission: can_edit_course_status.*

### Daily Pin Placements
Drag-and-drop pin position per hole on the satellite course map.
Realtime sync — every member's course map updates without refresh.
*Permission: can_edit_pins.*

### Hole Details
CRUD table for course holes: par, yardage, hole name, designer notes.
One row per hole. Empty state if the club hasn't initialized the
course.
*Permission: can_edit_pins.*

## 16. Pro Shop Management

### Pro Shop Items CRUD
Catalog of items the pro shop sells. Per item: name, description,
price, stock status, active flag. Members browse this on the Pro
Shop tile + file inquiries.
*Permission: can_manage_proshop.*

### Lesson Pros Roster
Roster of lesson instructors with photo, bio, contact info. Shown to
members when booking a lesson. Sort order configurable.
*Permission: can_manage_proshop.*

## 17. Dining Management

### Food Orders queue (realtime)
Live queue of open food orders — To-Go and Eat-In. Each card shows
order number, member name, items, total, delivery method, pickup time.
Realtime — new orders appear without refresh.
*Permission: can_view_orders.*

### Kitchen reply on orders
Inline composer per order card. Staff messages push-notify the member +
land in the member's order timeline.
*Permission: can_view_orders.*

### Mark Ready-for-Pickup
One-click status flip on To-Go orders. Member gets push notification
+ the order status indicator changes.
*Permission: can_view_orders.*

### Menu Categories (drag-and-drop sort)
The categories the member-facing Food Menu groups items into (Lunch,
Dinner, Bar, Kids, etc.). Drag handles reorder; active/inactive toggle
hides without deleting.
*Permission: can_manage_menu.*

### Menu Items CRUD
Per item: name, description, price, category assignment, active flag,
"is_special" flag, "available_today" flag. Hidden items stay in the
database for re-enabling later.
*Permission: can_manage_menu.*

## 18. People Management

### Member Directory (unified search)
Read-only overview searching across members, guests, and staff. Each
detail panel shows contact info, badges, RSVP history, and quick
actions (message, assign badge, edit).
*Permission: can_manage_members.*

### Manage Members
Full CRUD. Add individually, edit existing, send magic-link invites.
**Bulk-import via CSV** — picker accepts a CSV with name/email/phone
columns, previews mapping, runs the import, and queues bulk invites.
*Permission: can_manage_members.*

### Moderate Posts
Hide or delete member-generated content (bulletin posts, partner
posts). Shows the offending content + member name + action buttons.
*Permission: can_manage_members.*

### Badges library + assignment
Per-club badge library — create badges with name, color, and one of
24 curated Lucide icons. Three sizes (mini 28 / small 64 / large 96).
Assign badges to individual members from the Directory detail panel or
the Badges screen. Quick-add row with six pre-defined templates speeds
up library bootstrap.
*Permission: can_manage_members.*

### Guest Settings & QR
Per-club guest access configuration — default access mode, default
visit duration, max uses per guest, whether to require phone number,
whether guests can order food. Includes a printable QR code for the
clubhouse self-registration kiosk.
*Permission: can_manage_members. Manager-only.*

### Manage Staff
Promote a member to club_admin role, demote back to member, configure
each club_admin's permissions via a checkbox grid (can_manage_events,
can_post_news, can_view_orders, etc.). Only managers control staff —
admins can't elevate themselves or peers.
*Permission: Manager-only.*

## 19. Club Settings (Manager-Only)

### Branding & Contact
Club name, tagline, logo upload, brand colors (primary / secondary /
accent), contact phone + email, signup gating (auto-approve new
members OR require manual approval).
*Permission: Manager-only.*

### Facilities catalog
The list of facilities this club has. Default seeds: Restaurant, Bar,
Course, Pool, Banquet Room. Managers add custom facilities (Tennis
Court, Pickleball Court, Driving Range, Golf Simulator, Lounge, etc.),
rename, reorder, or toggle off. Renaming propagates to status pills,
Daily Status admin, Facility Hours admin, and the member home
instantly via realtime.
*Permission: can_edit_course_status. Manager-only.*

### Feature Toggles
Master toggle panel for every member-facing feature: Bulletin Board,
News, Course Map, Pin Placements, Pace of Play, Tee Times, Lockers,
Cart Assignments, Parking, RSVP Waitlist, Pickup Time Picker, Profile
Photos, Display Mode, Guest Registration, etc. Per-toggle "platform
lock" allows super_admin to pin a setting the manager can't undo
(used for billing tiers — add-ons stay off until paid).
*Permission: Manager-only.*

### Facility Hours
Weekly base hours per facility (Mon–Sun open/close times, plus
dawn/dusk flags + members-only flag per day). Drives the auto-computed
Daily Status and the open/closed pills on member Home. Summary line
("Mon–Fri 8am–9pm · Sat–Sun Dawn–Dusk") updates as you edit.
*Permission: can_edit_course_status. Manager-only.*

### Date Overrides (calendar)
One-off date overrides — closures for holidays, special tournament
hours, modified hours for an event. Set a specific date + facility +
override pattern. Shown on the member calendar as a brass ring on the
affected date with a Facility Notes section in day detail.
*Permission: can_edit_course_status. Manager-only.*

### Member Guide CRUD
Markdown editor for the onboarding pages members see in the My Club
Help & Support surface. House rules, course etiquette, how-to-book,
FAQs. Slug-based URLs, ordering controls.
*Permission: can_post_news. Manager-only.*

## 20. Platform (Super-Admin Only)

### Super Admins management
List of platform admins; promote a member to super_admin, demote
back. Cross-club role with no club_id.
*super_admin only.*

### All Clubs management
Browse every club on the platform, create new clubs (auto-provisions
the subdomain via Cloudflare DNS API), edit any club's settings,
archive defunct clubs.
*super_admin only.*

### Provisioning Log
Audit log of every Cloudflare DNS automation attempt when new clubs
are provisioned. Diagnostic surface — used when a new club's subdomain
doesn't resolve.
*super_admin only.*

### Platform Support Inbox
Inbox of support tickets from across all clubs. Inbound from
support@groundslive.com (via Cloudflare Email Routing → Worker → Edge
Function). Each thread has a category (user_help / admin_help / bug /
enhancement / other — `null` = needs triage, shown as an amber chip).
Filter by status (Active / All / Closed) and category. Reply composer
sends via Resend with proper RFC-822 threading headers so Gmail
threads them correctly on the recipient side.
*super_admin only.*

### Support Team destinations
Manage who gets a copy of every inbound support email. Add / verify /
remove email destinations; Cloudflare Email Routing handles the actual
forwarding. Verification flow shown inline.
*super_admin only.*

### Contact Support modal (in-app)
Both managers and super_admins can open a "Contact Support" modal
from the admin topbar or sidebar footer. Form: category picker + subject
+ body. Auto-captures user identity, club context, current URL, and
browser user-agent. Lands in the Platform Support inbox with category
pre-set.
*Available to: any admin role.*

## 21. Admin UX & Productivity

### Global Search Palette (Cmd+K)
Full-text search across every accessible admin section. Cmd+K or `/`
opens the palette. Selecting a result jumps directly to that section.
Hidden / role-gated sections don't appear.
*Available to: any admin role.*

### Keyboard shortcuts
- `g h` — Home (Dashboard)
- `g i` — Communications inbox
- `g p` — People
- `g s` — Club Settings
- `g b` — Broadcasts
- `g e` — Events
- `Cmd+K` or `/` — Global search

*Available to: desktop admin.*

### Dark mode toggle
Sidebar footer toggle between light and dark admin theming. Persists
per admin across sessions; per-club irrelevant (admins working across
multiple clubs share the choice).
*Available to: any admin role.*

### Web Push notifications (admin-side)
Admins get push notifications for: new inbound support tickets
(super_admins only), new food orders (kitchen staff), kitchen replies
on food orders (the ordering member), replies on support threads the
admin is involved with, other Communications inbox activity.
*Available to: any admin role with the relevant permission.*

### OS-level app badge
On installed PWAs, the unread count from the Communications bell chip
+ Support bell chip is mirrored as a native OS badge on the home-
screen icon. Works on macOS, Windows, Android; limited support on iOS.
*Available to: PWA-installed admins.*

## 22. Analytics

### Hybrid GA4 + first-party analytics
Two-track pipeline: every member action fires a GA4 event AND writes
to a first-party `analytics_events` table in the club's database. GA4
gives Anthropic-side dashboards (audience demographics, acquisition,
device); the first-party table powers in-app dashboards with sub-second
access to per-club data.
*Always on. Members opt-out paths follow standard browser controls.*

### Admin Analytics Dashboard
In-admin dashboard surfacing per-club metrics: DAU/WAU, top-visited
screens, member engagement score, event RSVP volume, food order
volume, push delivery + open rates. Time-window selectable.
*Permission: any admin role (manager + super_admin see broader scope).*

## 23. Cross-Cutting Platform Capabilities

### Multi-tenant isolation
Every data table scoped by `club_id`. Postgres Row-Level Security
policies enforce that no member or manager at one club can read
another club's data. Single Supabase database, complete logical
isolation.
*Invisible. Always on.*

### Custom subdomain per club
Each club gets `<slug>.groundslive.com`. Auto-provisioned via the
Cloudflare DNS API when super_admin creates a new club. SSL handled
by Cloudflare automatically.
*Invisible. Configured by super_admin.*

### Realtime everywhere
Supabase realtime subscriptions on most data tables. Food orders,
RSVPs, support tickets, guest registrations, status updates, pin
positions, course map — all push to connected clients without refresh.
*Always on.*

### Transactional email via Resend
RSVP confirmations, support replies, magic-link sign-ins. Sender
identity `support@groundslive.com` for platform-level mail; clubs can
optionally use their own from address.
*Always on.*

### Inbound email routing via Cloudflare
`support@groundslive.com` mail forwards to a managed list (managed in
Platform → Support → Team) AND lands in the in-app Support Inbox via
an Edge Function pipeline.
*Always on for platform support.*

### Image storage via Supabase Storage
Profile photos, badge icons, sponsor banners, club logos, news article
images, support ticket attachments — all stored in a Supabase Storage
bucket with RLS-scoped access.
*Always on.*

### PWA + Web Push pipeline
Service worker handles offline shell + push delivery. VAPID-signed
push subscriptions per device. DB trigger → Edge Function →
push.googleapis.com / web.push.apple.com → service worker handler.
*Always on; member must grant browser permission.*

### Audit trail on key actions
ai_usage_log (every AI call), provision_log (every Cloudflare DNS
operation), support_messages (every inbound + outbound support
thread), badges + member_badges (every award). Append-only tables;
super_admin can query.
*Visible to: super_admin via Platform dashboards.*

---

## How features compose into roles

| Audience | Sees | Notes |
|---|---|---|
| **Guest (data only)** | "Visit recorded" screen | No app access; registration only |
| **Guest (read only)** | Home, Golf, Food browse, slim My Club | No posting, ordering, RSVPing, DMing |
| **Guest (full temp)** | Read-only + News + Today's Events + Events Calendar | Can browse community |
| **Member** | All Front-Facing sections 1-10 | Full member experience |
| **club_admin** | Admin sections matching their granted permission checkboxes | Operational staff |
| **club_manager** | Everything club_admin sees + Club Settings + Manage Staff | Full club control |
| **super_admin** | Everything any role sees + Platform area | Cross-club platform admin |

---

*Feature count by audience (approximate):*
- **Front-facing:** ~50 distinct features across 10 categories
- **Admin:** ~45 distinct features across 13 categories
- **Cross-cutting platform:** ~10 features

For implementation details + history, see:
- `CHANGELOG.md` — every patch in chronological order
- `src/lib/version.js` — Phase-by-phase architectural notes
- `src/lib/features.js` — feature flag catalog (the master toggle list)
- `src/lib/permissions.js` — permission key catalog (staff role checkboxes)
