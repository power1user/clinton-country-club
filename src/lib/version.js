// App version — bumped on EVERY commit that ships a fix or feature.
//
// Convention (confirmed by user; two-digit segments OK — 0.11.14 is fine):
//   · MAJOR (X.0.0) — sweeping rewrites / breaking model changes. Stays
//     at 0 until we cut a true 1.0 release.
//   · MINOR (0.X.0) — "big lifts" and new architectural builds (a new
//     screen, a new content type, a new schema-ish system). Bump
//     deliberately, with a "Phase N" name and a CHANGELOG header.
//   · PATCH (0.0.X) — everything else: bug fixes, UI polish, copy
//     tweaks, content changes. One CHANGELOG entry per bump so support
//     conversations can pinpoint exactly which build a club is running.
//
// Phase history:
//   v0.1.x — Phase 1: DB-driven content, admin hub, RLS
//   v0.2.x — Phase 2: 4-role hierarchy + permissions + Platform card
//   v0.3.x — Phase 3: white-label branding + subdomain routing
//   v0.4.x — Phase 4: messaging (orders + clubhouse + DMs + Web Push)
//             plus operational/quality work: Phase A polish, Phase B
//             (feature flags, lesson pros, ToU, swipe nav), Cloudflare
//             Pages migration, CRUD bug fixes, and patch-tracking.
//   v0.5.x — Phase 5: member-to-member communication everywhere.
//             Reusable post_replies system + DM affordances on
//             member-generated content (bulletin posts first, then
//             partner posts / events / pro shop).
//   v0.6.x — Phase 6: News/Events split. Events get a calendar view
//             as their primary surface; News gets an optional date
//             picker (replaces the required text label). v0.6.1–v0.6.15
//             also shipped a personalization side-quest (Settings
//             screen, QR, profile photo, display mode, DM opt-out,
//             PWA install entry, message deletion).
//   v0.7.x — Phase 7: Operational control plane. Club Features
//             Control Panel — every member-facing surface (Pro Shop,
//             Bulletin, Calendar, Lockers, Cart, Parking, etc.)
//             becomes a named, manager-toggleable flag with per-flag
//             platform lock (super_admin can pin a value the manager
//             can't undo). New top-level Features admin area + schema
//             migration 39 adds clubs.feature_flags_locked.
//   v0.8.x — Phase 8: Guest Management. Fifth user role alongside
//             super_admin / club_manager / club_admin / member.
//             Real Supabase Auth accounts via magic-link signup,
//             time-limited access (per-club configurable duration
//             or indefinite), three access modes (data_only /
//             read_only / full_temporary). Member-linked QR codes
//             (signed URLs, referring_member_id auto-populated) +
//             clubhouse QR (no referring member, for public play).
//             New guests + guest_visits tables (migration 44).
//   v0.9.x — Phase 9: Communications triage center + admin reorg.
//             New top-level Communications area unifies inbound
//             activity (food orders, lesson requests, pro shop
//             inquiries, guest registrations, clubhouse messages,
//             event RSVPs) into role-scoped sub-queues with unread
//             badges and realtime. Club Setup renamed to Club
//             Settings; club status config moved there. Member
//             Guide CRUD lands under Club Settings. Partner Board
//             redesigned with handicap field + wired Contact
//             button (DM → clubhouse fallback).
//   v0.10.x — Phase 10: Club Champion Recognition badges. New
//             shield-shaped badge system (reusable Badge component,
//             three sizes — mini 28 / small 64 / large 96, Lucide
//             icon library, manager-chosen colors). Migration 55
//             adds badges + member_badges tables. Admin → People →
//             Badges has the full CRUD library (Quick add row of
//             six pre-defined templates, curated 24-icon picker,
//             8 club-themed color swatches + native picker, live
//             large-shield preview). Per-member assignment from
//             the Directory's expanded detail panel. Member-facing
//             surfaces: mini row on the membership card (max 5 +
//             overflow chip), mini strip on each member directory
//             row. v0.10.1 brings the Trophy Case (Community tab),
//             v0.10.2 sponsor placement + add-on gating, v0.10.3
//             member RSVP history (My Events).
//   v0.15.x — Phase 16: People Lifecycle Management. Stable
//             per-person attributes (name, email, phone, address,
//             photo) now live in a single `people` table keyed by
//             auth.user_id — Marc's "if you want a different
//             identity at a different club, use a different email"
//             rule. Per-club relations (members, guests,
//             user_roles) stay where they were and own their
//             per-club fields (handicap, locker, access_level,
//             role, etc.). Every lifecycle transition (guest →
//             member, status changes, staff promote/demote) is
//             append-only logged to `people_audit_log` for
//             compliance + "who promoted this person to admin"
//             accountability.
//
//             v0.15.0 — Foundation. Migration 75 (people table +
//             people_audit_log + RLS + backfill of 8 rows from
//             existing members/guests). Migration 76 (log_people_event
//             SECURITY DEFINER helper).
//             v0.15.1 — Unified People admin view (read-only).
//             Migration 77 (all_people_at_club RPC). New People
//             → All People section showing every person with any
//             relation, with relation chips (member/guest/staff).
//             v0.15.2 — Lifecycle actions (combined v0.15.2-4).
//             Migration 78 (convert_guest_to_member,
//             change_member_status, promote_member_to_staff,
//             demote_staff_to_member RPCs, all audit-logged).
//             Kebab menu per row in AllPeopleAdmin with
//             state-dependent action items. Manager-promotion +
//             manager-demotion gated to managers + super_admin so
//             a club can't end up with zero managers.
//             v0.15.3 — Phase 16 closeout (this entry).
//   v0.14.x — Phase 15: GroundsLive AI. Two-agent, prompt-cached
//             AI assistant embedded throughout The Grounds. The
//             Admin AI ships first (manager onboarding payoff is
//             biggest) — accessed from the admin topbar, knows the
//             admin manual + live club data, bills to The Grounds
//             via mode='admin' rows in ai_usage_log. The Member AI
//             ships as a floating bubble on member surfaces, gated
//             per-club by feature_flags.member_ai (default OFF),
//             bills to the club via mode='member' rows. One log
//             table, one billing axis (the `mode` column),
//             separate Edge Functions per agent so system prompts,
//             tool registries, and auth rules diverge cleanly.
//             Uses Claude Haiku 4.5 with Anthropic prompt caching
//             for cost discipline (~10x cost reduction on follow-up
//             messages within 5-min cache TTL).
//             v0.14.0 — Foundation: Migration 73 (ai_usage_log
//             with sub-cent-precision cost columns + RLS for
//             super_admin platform-wide and managers per-club).
//             admin-ai-chat Edge Function (v1): admin-role auth,
//             Anthropic SDK with prompt caching wired, per-call
//             cost computed + logged, ?diag=1 endpoint.
//             v0.14.1 — Admin manual content (~25KB markdown
//             covering every admin area + 15 common tasks),
//             injected into the cached system prompt block.
//             Prompt caching engages from this patch.
//             v0.14.2 — Admin AI chat UI: brass chat-bubble icon
//             in topbar opens AdminAIChatModal. Multi-turn with
//             client UUID conversation_id, inline markdown
//             renderer (~60 lines, no npm dep), starter prompt
//             chips, super_admin-only cost line, Esc-to-close.
//             v0.14.3 — Super_admin AI Usage dashboard.
//             Migration 74 adds three SECURITY DEFINER rollup
//             RPCs (ai_usage_summary, ai_usage_by_club,
//             ai_usage_by_user). New Platform → AI Usage section
//             with window picker, cost tiles, per-club + top-users
//             tables. Cost formatter adapts cent→dollar.
//             v0.14.4 — Member AI toggle in Club Features.
//             Added member_ai entry to features.js catalog
//             (default OFF, new "AI" category). Phase 7 Features
//             panel auto-renders the toggle — no per-flag UI.
//             v0.14.5 — Member AI: member-ai-chat Edge Function
//             (member/guest auth, gates on feature flag, logs
//             mode='member'). MemberAIBubble component: floating
//             bottom-right with dismissible/recallable states,
//             dismissal persisted in localStorage per (user,
//             club). Mounted in App.jsx ScreenRenderer after
//             BottomNav, hidden on admin surface.
//             v0.14.6 — Member manual content (~15KB) covering
//             every tab + 16 common tasks + guest mode + concepts
//             + escalation. member-ai-chat redeployed at v2.
//             v0.14.7 — Member AI live-data tools. 5 Anthropic
//             tools (get_today_status, get_menu,
//             get_upcoming_events, get_recent_news,
//             get_lesson_pros). Service-role executors scoped to
//             the user's club_id. Tool-use loop capped at 5
//             iterations. Lets the AI answer "is the pool open?"
//             with current data instead of "check the home
//             screen." Cumulative usage rolls into one log row
//             per question.
//             v0.14.8 — Phase 15 closeout (this entry + README
//             refresh). Phase 15 architecture as built:
//
//             ┌─────────────────────────────────────────────────┐
//             │  TWO EDGE FUNCTIONS (separate per-agent)        │
//             │  admin-ai-chat  →  mode='admin' rows            │
//             │  member-ai-chat →  mode='member' rows           │
//             └─────────────────────────────────────────────────┘
//             ┌─────────────────────────────────────────────────┐
//             │  ONE LOG TABLE                                  │
//             │  ai_usage_log  (mode is the billing axis)       │
//             │  → super_admin reads all (Platform → AI Usage)  │
//             │  → managers read their club's rows              │
//             └─────────────────────────────────────────────────┘
//             ┌─────────────────────────────────────────────────┐
//             │  TWO ROLLUP SURFACES                            │
//             │  Admin AI    → AdminAIChatModal (topbar)        │
//             │  Member AI   → MemberAIBubble (floating)        │
//             └─────────────────────────────────────────────────┘
//
//             To add a new tool to either agent: declare in TOOLS
//             array + add an executeTool case + redeploy. The
//             system prompt's "TOOL USE" section needs a one-line
//             description added so the model knows when to call.
//   v0.13.x — Phase 14: Platform Support Inbox. A super_admin-only
//             ticketing surface for club managers / staff to email
//             support@groundslive.com from anywhere and have it
//             land in BOTH the platform team's personal inboxes
//             (forwarded by Cloudflare Email Routing) AND a
//             persistent in-app inbox under Platform → Support
//             (audit trail, threading, status). Replies sent from
//             the admin go out via Resend appearing as
//             support@groundslive.com with correct In-Reply-To /
//             References headers so Gmail threads them properly
//             on the recipient side. Web Push fires to every
//             super_admin's PWA on new inbound; OS app-badge
//             count syncs via navigator.setAppBadge so installed
//             PWAs surface the unread number on the launcher
//             icon the way native email apps do.
//             v0.13.0 — inbound pipeline: migration 66
//             (support_threads + support_messages + support_reads
//             tables, RLS super_admin only, last-message-touch
//             trigger, support_unread_count() helper),
//             receive-support-email Edge Function (postal-mime
//             parsing, Message-ID dedup, In-Reply-To threading,
//             best-effort members.email match). Cloudflare Email
//             Worker + Custom Address rule on `support@` round
//             out the inbound layer. Nothing visible in the admin
//             UI yet — that lands in v0.13.3.
//             v0.13.1 — destination management: migration 67
//             (support_destinations table, RLS super_admin only,
//             seeded with the two initial team emails pre-verified).
//             Two new Edge Functions: get-support-destinations
//             (Worker fetch) and manage-support-destinations
//             (super_admin CRUD wrapping Cloudflare's Email
//             Routing destinations API). Worker code swapped from
//             hardcoded list to dynamic fetch. New Platform →
//             Support admin section with Team sub-tab — Inbox
//             tab placeholder until v0.13.4.
//             v0.13.2 — push fan-out: fn_send_push_on_support_message
//             trigger + send-push v9 handleSupportTicket branch
//             pushes every new inbound message to every super_admin's
//             registered push subscriptions.
//             v0.13.3 — outbound: send-support-reply Edge Function
//             (super_admin auth, Resend with In-Reply-To +
//             References), appends 'out' direction message rows.
//             v0.13.4 — admin UI: Platform → Support → Inbox
//             tab activated. Thread list + unread badges,
//             expanded thread view with reply composer,
//             mark-as-resolved status.
//             v0.13.5 — bell + OS app-badge integration via
//             support_unread_count() rolled into useInboxUnread,
//             realtime subscription for live UI updates without
//             refresh.
//             v0.13.6 — attachments via Supabase Storage
//             support-attachments bucket + README refresh +
//             Phase 14 closeout.
//   v0.12.x — Phase 13: Operational polish across the admin
//             surfaces members & staff actually live in.
//             v0.12.0 opened with two restructures: (1) Food
//             Orders moved out of Communications into a new
//             Dining area (next to the menu CRUDs the kitchen
//             owns — cuts a tab switch out of every shift), and
//             (2) the Event RSVPs Comms sub-queue restructured
//             from a flat reverse-chrono timeline into a
//             collapsed-by-default inline accordion grouped by
//             event with live registered count + spots remaining
//             badge (Full / N left). Sidebar badge logic
//             generalized so any area's sections can carry unread
//             counts, not just Comms. Daily Ops default workspace
//             lands on Dining → Food Orders. Section ID
//             `inbox_food` preserved across the move so
//             workspaces, dashboard tiles, useCommsUnread, and
//             saved layouts continue to resolve.
//             v0.12.1 — Kitchen reply on Food Orders queue:
//             inline composer per order card; member gets push +
//             inbox via the existing send-push pipeline; no
//             schema change (posts into the per-order auto-
//             thread).
//             v0.12.2 — Notification dismissal: swipe-to-dismiss
//             (8px direction lock, 90px commit threshold, click
//             suppression on swipe) + bulk-select mode with
//             sticky bottom action bar; Undo snackbar on every
//             dismiss path (5s). Per "from view only" rule —
//             never hard-deletes; just toggles hidden_at on
//             notification_reads / thread_participants. New
//             unhide* + bulk hide* helpers. No migration —
//             hidden_at columns existed from v0.6.x.
//             v0.12.3 — Event recurrence: weekly interval. New
//             "Every [N] week(s) on [weekday]" picker; N=1
//             (back-compat) through N=12 (capped). Pattern
//             description line above the occurrence-count
//             preview. No schema change — N is a
//             generateOccurrences() parameter at create time.
//             v0.12.4 — Phase 13 closeout: README refresh
//             (Phase 13 section, intro/version line updated,
//             Area ordering reflects the Food Orders move) +
//             this phase index entry.
//   v0.11.x — Phase 12: Responsive Admin (v0.11.0–12) + Phase 12 v2:
//             Hybrid analytics + Admin Dashboard (v0.11.13–31).
//             The member app stays mobile-PWA-first forever; the
//             ADMIN side gets a desktop + tablet shell so managers
//             doing CRUD work in the office aren't typing into
//             320px inputs. Same components, two layouts:
//             AdminLayoutMobile (current 3-level drill-down) and
//             AdminLayoutDesktop (persistent left sidebar + top
//             bar + main content area + side-panel detail pattern +
//             tables for data-heavy sections). v0.11.0 lands the
//             useViewport hook scaffold; v0.11.1 the desktop layout
//             shell; tables, global search, side panels,
//             multi-column forms, admin_preferences-backed saved
//             layouts + workspaces, keyboard shortcuts, and dark
//             mode land across the intervening patches; v0.11.12
//             refreshes the README.
//
//             Phase 12 v2 (v0.11.13–31) layers on: phone-frame
//             escape on desktop, /admin deep-link, accordion
//             sidebar, comms-badge accuracy split, typography
//             pass, default workspaces, then the BIG lift —
//             hybrid GA4 + Supabase analytics (analytics_events
//             table via migration 62, dashboard aggregation RPCs
//             via migration 63, useAnalytics.js dual-write) +
//             the flexible AdminDashboard. Dashboard ships with
//             8 tiles, role-gated catalog, drag-and-drop reorder
//             via @dnd-kit, show/hide toggle, per-(user, club)
//             persistence in admin_preferences, and per-workspace
//             dashboardLayout snapshots so applying a workspace
//             flips the dashboard arrangement to match the role
//             the manager is currently wearing. v0.11.25 server-
//             fix added the missing UNIQUE NULLS NOT DISTINCT
//             constraint to admin_preferences (silent-upsert
//             failure on every Phase 12 preference until then).
//   v0.10.x patch tail (Phase 11): Calendar, News, Menu, Push polish — an
//             operational-quality pass across the surfaces members
//             touch daily. Calendar gets schedule-override
//             indicators (hollow brass ring on affected dates, day-
//             detail Facility Notes section) plus more entry
//             points (Home Next Event "View all" link, Calendar
//             icon in every event-detail header) and category
//             filter pills (persisted per-member via the new
//             user_preferences table, migration 58). News gets a
//             generic newsActionLinks mapping replacing the v0.10-
//             era broken hardcoded "Related" card. Menu Categories
//             get drag-and-drop sort via @dnd-kit. Push
//             notifications identify the sender on the lock screen
//             (send-push v6 — fetches members.name by
//             sender_user_id + thread.club_id, falls back
//             gracefully for staff-side accounts).
//
// Bump rule: every commit, period. See CHANGELOG.md for what's in each
// patch. Shown to members in the MyClub footer; shown to staff during
// support calls so we know which exact build is in the wild.
//
// README cadence: README.md is refreshed at every MINOR bump (0.X.0).
// PATCH bumps don't touch the README — CHANGELOG.md is the source of
// truth between minor releases.
export const VERSION = '0.15.24';

// Parent platform brand. Shown as 'Powered by The Grounds' in the
// sign-in footer, the loading splash, and the About row in MyClub.
export const PLATFORM_NAME = 'The Grounds';
export const PLATFORM_TAGLINE = 'Your club. Your community. Always on.';
