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
//   v0.12.x — Phase 13: Operational polish across the admin
//             surfaces members & staff actually live in. v0.12.0
//             opens with two restructures: (1) Food Orders moves
//             out of Communications into a new Dining area (it
//             always belonged with the menu — keeping the day-of
//             kitchen view next to the menu CRUDs cuts a tab
//             switch out of every shift), and (2) the Event RSVPs
//             Comms sub-queue gets restructured from a flat
//             reverse-chrono timeline into a collapsed-by-default
//             inline accordion grouped by event with live
//             registered count + spots remaining badge (Full /
//             N left), so the triage view answers "which events
//             need attention" at a glance. Sidebar badge logic is
//             generalized so any area's sections can carry unread
//             counts, not just Comms. Daily Ops default workspace
//             updated to land on Dining → Food Orders. Section ID
//             `inbox_food` is preserved across the move so
//             workspaces, dashboard tiles, useCommsUnread, and
//             saved layouts continue to work.
//             Pending v0.12.x patches: Kitchen reply on food
//             orders queue; bulk + swipe notification dismissal
//             (per-member dismissed state, never hard-deletes);
//             event recurrence with interval+weekday support.
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
export const VERSION = '0.12.2';

// Parent platform brand. Shown as 'Powered by The Grounds' in the
// sign-in footer, the loading splash, and the About row in MyClub.
export const PLATFORM_NAME = 'The Grounds';
export const PLATFORM_TAGLINE = 'Your club. Your community. Always on.';
