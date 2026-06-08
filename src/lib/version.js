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
//   v0.16.x — Phase 18: Security & Hardening Pass. External code audit
//             surfaced 8 findings spanning 3 verified bugs, 2 hardening
//             gaps, and 3 structural refactors. v0.16.x sequences the
//             work across multiple patches under one minor so it stays
//             auditable.
//             v0.16.0 — Phase 18 opens. Foundation patch addressing
//             the small-surface items in one shipping unit:
//             (#1) send-push support-ticket branch was filtering
//             user_roles by `tenant_id` (a column that doesn't exist
//             on this schema). The codebase already had a v0.13.7
//             hotfix comment in submit-support-ticket warning "use
//             club_id, not tenant_id." send-push was missed. Result:
//             support pushes to super_admins NEVER fired since the
//             feature shipped — the function silently returned
//             {sent:0, reason:"no super_admins"} on every ticket.
//             Fixed the column AND added error surfacing so a future
//             column drift can't regress the same way silently.
//             (#2) check-club-health used the service-role key with
//             NO auth check. Anyone with the URL could enumerate
//             every club + force fan-out HEAD requests across every
//             subdomain. Added a super_admin gate lifted from the
//             submit-support-ticket pattern.
//             (#3) MemberAIBubble destructured `user` from useAuth(),
//             but useAuth never exposed user — the dismissal-key
//             interpolation fell to 'nx' and dismissals bled across
//             users on the same browser. Switched to
//             session?.user?.id like the rest of the codebase.
//             (#4) Diagnostic endpoints exposing secret-presence
//             flags to anyone with the URL: admin-ai-chat ?diag=1
//             now requires super_admin; member-ai-chat anon GET
//             returns 405; receive-support-email ?diag=1 requires
//             the INGEST_SECRET (same as the POST path) and returns
//             404 for anons so the endpoint's existence isn't
//             confirmed to randos.
//             (#5) Baseline security headers added to public/_headers:
//             CSP (default-src self, script-src self, style-src self
//             + unsafe-inline for React inline styles, connect-src
//             to our Supabase project, frame-ancestors self),
//             HSTS (1-year, not preloaded yet), X-Content-Type-
//             Options nosniff, Referrer-Policy
//             strict-origin-when-cross-origin, Permissions-Policy
//             dialing camera/microphone/interest-cohort to ().
//             v0.16.1 — Admin auth centralization (audit finding #6).
//             Today's pattern: visibility filter in AdminPanel:525,
//             actual rendering in a 1,500-line if/else at
//             AdminPanel:302, with each section enforcing its own
//             guard inconsistently. Plan: attach role/permission
//             metadata to each section renderer; one reusable
//             guard component reads it.
//             v0.16.2 — sections.jsx split (audit finding #7).
//             5,327-line file by admin domain. Pull each large area
//             (Communications, Events, Dining, etc.) into its own
//             file under src/screens/admin/sections/.
//             v0.16.3 — Test scaffold (audit finding #8). Vitest +
//             focused tests on the high-risk paths: permission
//             helpers (hasPerm, isAdmin matrix), Edge Function auth
//             gates, push-recipient selection, route/section
//             visibility.
//             v0.16.4 — Admin auth centralization (audit round 1 #6).
//             ONE meetsRequirements() predicate gates both menu
//             visibility and SectionContent render — extracted to
//             src/lib/adminAuth.js in v0.16.6 so it's unit-testable
//             without loading the whole admin UI tree.
//             v0.16.5 — sections.jsx split slice 1: Platform domain
//             extracted to src/screens/admin/sections/platform.jsx
//             (sections.jsx 5,639 → 4,845 lines). Dead-code removed
//             during extraction: PlatformSettingsAdmin /
//             PlatformMetricsAdmin / ComingSoonSection stubs.
//             v0.16.6 — Vitest scaffold + 56 focused tests across
//             permissions matrix (16), meetsRequirements predicate
//             (16), CORS allowlist (24). The permission tests pin
//             the client↔DB has_permission() invariant; the CORS
//             tests catch regression to wildcard Allow-Origin.
//             v0.16.7 — react-hooks/exhaustive-deps audit. Walked
//             25 disable sites across 13 files; 23 justified, 0
//             actually buggy, 2 subtle cases documented in
//             src/REACT_HOOKS_DEPS_NOTES.md. Re-audit cadence:
//             every minor or when count exceeds 30.
//             v0.16.8 — ConfirmModal + ConfirmProvider foundation.
//             Native confirm()/alert() retired from CrudSection
//             + NewsAdmin as proof-of-pattern; 21-site sweep queued.
//             v0.16.9 — Defensive client-side mutation scoping
//             (audit round 3 #2). Every admin UPDATE/DELETE on a
//             club-scoped table now filters by both id AND club_id.
//             RLS would catch a cross-tenant attempt anyway, but
//             belt-and-suspenders prevents a class of "RLS bug =
//             data corruption" scenarios.
//             v0.16.10 — Guest flow security audit at
//             supabase/audits/guest-flow.md. Walked
//             /guest/<slug> → guest-register Edge Function → RLS
//             policies → guest session. Verdict: writes correctly
//             locked down by RLS (every sensitive policy requires
//             a members row, which guests don't have). Two real
//             gaps: no rate limit on guest-register POST, no
//             CAPTCHA. Both DoS-class, not auth holes; queued.
//             v0.16.11 — Phase 18 closeout. README refreshed with
//             Phase 18 patch index. This entry marks Phase 18 as
//             complete: 11 patches, 21 audit findings closed, 4
//             follow-up items queued (admin-ai-chat redeploy from
//             v0.15.31, rate-limit guest-register, confirm-modal
//             21-site sweep, select('*') tightening).
//             v0.16.12 — Phase 18 follow-up #1: confirm-modal sweep
//             complete. The remaining 21 native window.confirm() /
//             window.alert() sites (queued in v0.16.8) now route
//             through the shared <ConfirmProvider> / useConfirm()
//             hook. Components touched: ProfilePhotoCard, Replies,
//             TermsGate, AllPeopleAdmin (+PersonEditModal),
//             DepartmentsAdmin, MemberTiersAdmin, AdminPanel
//             (MemberBadgesRow + BadgesAdmin + StaffAdmin),
//             platform.jsx (SuperAdminsAdmin), and sections.jsx
//             (SortableSimpleAdmin, FacilitiesAdmin, EventEditor,
//             MemberGuideEditor, MemberPostsAdmin, GuestList,
//             SupportTeamTab). Native browser confirm()/alert() is
//             now fully retired from app code; the only remaining
//             reference is ConfirmModal's own fallback warning when
//             useConfirm() is called outside a provider.
//             v0.16.13 — Phase 18 follow-ups #2 + #4. Two parallel
//             wraps on the same patch:
//
//             #2 Rate-limit guest-register POST. Migration 0002
//             adds rate_limit_events + check_and_record_rate_limit().
//             guest-register Edge Function v12 calls it twice per
//             attempt — IP bucket (20/10m) and email bucket (5/1h) —
//             and 429s before doing any DB work. Closes the DoS gap
//             documented in supabase/audits/guest-flow.md. Verified:
//             a 6-attempt smoke test returns true×5 then false.
//
//             #4 `select('*')` tightening. Of 10 client-side
//             `select('*')` calls, 4 in sections.jsx (support_threads
//             list + detail, support_messages, support_destinations)
//             swapped to explicit column lists so future column
//             additions can't accidentally leak. The remaining 6
//             (useAuth's self-hydration of clubs/members/guests +
//             platform.jsx's super_admin club editor) are kept as
//             `*` with security-justification comments: each reads
//             the user's own RLS-gated row into app-wide state, no
//             tables have secret-class columns, and tightening
//             would mean updating every consumer on every new
//             column. Documented exception.
//
//             Closes Phase 18 follow-ups 2 + 4 of 4. Remaining: #3
//             (5-topic clubhouse smoke test, Task #30) needs real
//             devices and is on Marc.
//             v0.16.14 — Task #52 stage 1: route every client read of
//             the stable per-person fields (name/email/phone/zip/
//             photo_url) through the canonical `people` table.
//
//             Background: Phase 16 (v0.15.0) created `people` as the
//             source of truth. v0.15.19 added bidirectional sync
//             triggers (members↔people, guests↔people) so the
//             duplicate columns stayed in sync. v0.16.14 starts the
//             expand-and-contract migration to eliminate the
//             duplication entirely — at 50-club scale the dual-
//             source architecture becomes a debugging trap.
//
//             What landed:
//             · Migration 0003 — adds FKs members.user_id +
//               guests.user_id → people.auth_user_id, so PostgREST
//               exposes `.people(name, email, …)` embeds. Both cols
//               already have FKs to auth.users; this adds a SECOND
//               FK so the relation is named `people`.
//             · src/lib/peopleLift.js — lift helpers
//               (liftMember/liftGuest/liftMembers/liftGuests/
//               liftMembersRelation/liftGuestsRelation) that
//               promote the embedded people fields onto the parent
//               row, so legacy consumers (m.name, row.members.name)
//               keep working unchanged.
//             · ~20 read sites refactored across useAuth (4 self
//               reads), AllPeopleAdmin (2), AdminPanel (3),
//               AdminDashboard (4), useInbox, ClubhouseRoutingAdmin,
//               DepartmentsAdmin (2), MemberDirectory, Thread (3),
//               TrophyCase, useClubData (2 relation),
//               Replies (1 relation), platform.jsx, and sections.jsx
//               (food orders, event registrations, bulletin/partner
//               moderation, clubhouse threads, two guests views,
//               visit-history CSV, lesson requests).
//
//             Safety net: duplicate columns + the 3 sync triggers
//             (fn_mirror_member_to_people / fn_mirror_guest_to_people
//             / fn_mirror_people_to_member_guest) STAY RUNNING for
//             this stage. If a read site was missed, it still pulls
//             the synced duplicate column — no breakage. Stage 2
//             (v0.16.15) drops the columns + triggers after this
//             bakes.
//             v0.16.15 — Task #52 stage 2a + 2b (DB-only checkpoint).
//             Path A: make `people` the source of truth for
//             EVERYONE, including pre-auth admin-added members and
//             guests.
//
//             What landed (3 migrations):
//             · 0004 — Add members.person_id + guests.person_id
//               (NOT NULL FK to people.id). Backfilled: auth-linked
//               rows via existing user_id ↔ auth_user_id link;
//               pre-auth rows via fresh people row creation from
//               the duplicate columns. people.auth_user_id relaxed
//               from NOT NULL → nullable (pre-auth people are now
//               first-class). Indexes added.
//             · 0005 — Sync triggers now key off person_id, not
//               user_id ↔ auth_user_id. BEFORE INSERT auto-creates
//               a people row + sets NEW.person_id when missing,
//               so legacy `members.insert({name, email, ...})`
//               code keeps working through the bake. UPDATE
//               mirrors changes through person_id link. Pre-auth
//               members no longer get skipped.
//             · 0006 — Drop the redundant members.user_id ↔
//               people.auth_user_id FKs (added in v0.16.14, before
//               person_id existed). person_id is now the only
//               PostgREST embed path — no disambiguation needed.
//
//             Effect: every member + guest row now has a single
//             canonical link to a people row. The v0.16.14 reads
//             via `people(name, email, ...)` embed now resolve
//             unambiguously, AND pre-auth members (which couldn't
//             embed via the old user_id FK because user_id was
//             NULL) now correctly return their name/email/phone.
//
//             Remaining for stage 2c (v0.16.16): refactor the app
//             write sites (PersonEditModal, ProfilePhotoCard, CSV
//             import, guest-register Edge Function) to write
//             name/email/phone/photo_url to people DIRECTLY
//             instead of via members.name/etc. Then drop the
//             duplicate columns + retire the bidirectional sync
//             triggers.
//             Phase 18 architecture as built:
//
//             ┌─────────────────────────────────────────────────┐
//             │  ONE SOURCE OF TRUTH FOR PERMISSIONS            │
//             │  has_permission() RPC (DB)                      │
//             │    ↕  must agree with                            │
//             │  userHasPerm() (src/lib/permissions.js)         │
//             │    ↕  tested by                                  │
//             │  permissions.test.js (16 tests)                 │
//             │  meetsRequirements gates both menu + render     │
//             └─────────────────────────────────────────────────┘
//             ┌─────────────────────────────────────────────────┐
//             │  REPO IS NOW THE SCHEMA SOURCE OF TRUTH         │
//             │  supabase/migrations/*.sql — every change       │
//             │  ships as a numbered SQL file BEFORE apply      │
//             │  supabase/functions/* — every Edge Function     │
//             │  in the repo (was: 6 missing pre-v0.16.3)       │
//             └─────────────────────────────────────────────────┘
//             ┌─────────────────────────────────────────────────┐
//             │  ALL EDGE FUNCTIONS NOW AUTHENTICATED           │
//             │  send-push: shared-secret gate (safe-rollout)   │
//             │  check-club-health: super_admin gate            │
//             │  All diagnostic endpoints behind auth           │
//             │  CORS narrowed from `*` to groundslive allowlist│
//             └─────────────────────────────────────────────────┘
//
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
//             v0.15.3 — Phase 16 closeout (initial scope).
//             v0.15.6 — PersonEditModal v1 lands: full per-person
//             workspace replaces the kebab-only flow. + Add Person
//             chooser (Member/Guest), Import CSV (upserts on
//             club_id + membership_number), click-row-to-edit.
//             Old Manage Members + Directory routes deleted.
//             v0.15.7-v0.15.10 — UX polish: left-side ▲▼ caret on
//             every select, demote-only magic-link button on
//             verified users, lifecycle actions lifted into the
//             modal (kebab trimmed to the fast lane: Send Magic
//             Link, Convert Guest→Member, Mark Active), per-person
//             audit history pane (manager-only).
//             v0.15.11 — Admin AI manual refresh to match the
//             consolidated People surface; admin-ai-chat Edge
//             Function redeployed so the new manual is live.
//             v0.15.12 — Message Clubhouse fix (member-side
//             dispatch + admin-side inbound).
//             v0.15.13–15 — Phase 17: Departments + topic
//             routing. New club_departments + user_departments
//             tables; clubs.clubhouse_topic_routing jsonb maps
//             each of the 5 clubhouse topics
//             (general/dining/golf/events/billing) to a
//             department. New People → Departments section
//             (manager-only) with CRUD + clickable rows → member
//             list view + Add Staff inline. Per-person department
//             assignment chips inside PersonEditModal. send-push
//             v20 routes clubhouse fan-out via
//             topic → department → users.
//             v0.15.16 — PersonEditModal v2: identity strip
//             redesign. Avatar (click to upload — Supabase
//             Storage, image resize util), name, meta, **status
//             pill** + **role pill** at the top. Tapping a pill
//             opens a sub-modal (reason field + confirm) and
//             fires a SECURITY DEFINER RPC with p_reason. Form
//             restructured: required fields stay visible, the
//             rest grouped into a "More details" expander. New
//             Notes textarea (members.notes + guests.notes
//             columns). Photo upload from avatar click. Old
//             freestanding Actions section retired — its rows
//             are now reached via the pills.
//             v0.15.17 — Phone back-button unwinds admin nav
//             levels (popstate listener on AdminPanel pushes a
//             history marker on each drill-down, pops it on back).
//             v0.15.18 — DB hardening migration: audit triggers
//             on members + guests for status + tier + role
//             changes, routing-scrub triggers on
//             clubhouse_topic_routing (nullify references to
//             deleted departments), clubs.deleted_at soft-delete
//             column with a BEFORE DELETE block on the table,
//             has_permission COALESCE fix, duplicate
//             admin_preferences index dropped, all_people_at_club
//             returns has_notes flag.
//             v0.15.19 — Bidirectional sync triggers:
//             people ↔ members + people ↔ guests stay in sync on
//             name/email/phone (was: shadowed columns drifted).
//             v0.15.20 — Club-configurable membership tiers
//             (clubs.member_tiers jsonb; default ['standard',
//             'premium', 'family', 'corporate']; PersonEditModal
//             tier dropdown now sources from here).
//             v0.15.21 — Code-split admin from member bundle
//             (React.lazy + Suspense). Member-side: 1.37MB /
//             350KB gzipped; admin chunk: 508KB separate. Member
//             load doesn't pay for admin code anymore.
//             v0.15.23 — Regression fixes for three bugs from
//             the v0.15.16 redesign: (1) notes not saving when
//             modal closed via back-button (modal state was lost),
//             (2) Save kicked the user out of admin on mobile,
//             (3) phone back-button regression in admin.
//             Coordinator: MODAL_CLEANUP_IN_FLIGHT module-level
//             sentinel tells AdminPanel's popstate handler to
//             ignore programmatic back() calls from
//             useModalBackClose.
//             v0.15.24 — guests.zip NOT NULL dropped (member →
//             guest demote crashed on missing zip; zip is
//             genuinely optional).
//             v0.15.25 — Added 7 missing foreign-key indexes
//             flagged in the audit (months earlier, never
//             applied).
//             v0.15.26 — Dedup: BottomSheetModal shell extracted,
//             ToggleChip component with onTextColor prop,
//             imageResize.js util pulled from ProfilePhotoCard +
//             AllPeopleAdmin.
//             v0.15.27 — Rewrite all_people_at_club to use
//             CTE-based aggregates instead of per-row subqueries
//             (N+1 → 1 query).
//             v0.15.28 — Paginate the People list (p_limit /
//             p_offset / p_filter / p_search params on the RPC,
//             returns total_count; client uses 100-row pages
//             with "Load more"). Filter + search now run
//             server-side via the RPC.
//             v0.15.29-31 — Hotfix chain for the v0.15.28
//             rewrite: "column reference auth_user_id is
//             ambiguous" caught + fixed (CTE column renamed to
//             \`uid\` internally to dodge the RETURNS TABLE
//             OUT-param collision; #variable_conflict use_column
//             belt-and-suspenders). Mobile back-button finally
//             fixed completely — modalOpenCount module-level
//             counter for user-gesture pops, navCleanupRef for
//             in-UI back-arrow synthetic pops. Three guards in
//             AdminPanel.onPop (count, cleanup flag, modalOpen
//             sentinel); both scenarios (real user back + Save
//             button) tested.
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
export const VERSION = '0.16.15';

// Parent platform brand. Shown as 'Powered by The Grounds' in the
// sign-in footer, the loading splash, and the About row in MyClub.
export const PLATFORM_NAME = 'The Grounds';
export const PLATFORM_TAGLINE = 'Your club. Your community. Always on.';
