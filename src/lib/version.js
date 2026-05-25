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
//             picker (replaces the required text label).
//
// Bump rule: every commit, period. See CHANGELOG.md for what's in each
// patch. Shown to members in the MyClub footer; shown to staff during
// support calls so we know which exact build is in the wild.
export const VERSION = '0.6.13';

// Parent platform brand. Shown as 'Powered by The Grounds' in the
// sign-in footer, the loading splash, and the About row in MyClub.
export const PLATFORM_NAME = 'The Grounds';
export const PLATFORM_TAGLINE = 'Country-club apps, white-labeled.';
