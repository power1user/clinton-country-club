// App version — bumped on EVERY commit that ships a fix or feature.
//
// Convention:
//   · MAJOR (X.0.0) — sweeping rewrites / breaking model changes (rare)
//   · MINOR (0.X.0) — phase rollouts, one per phase ship
//   · PATCH (0.0.X) — every shipping commit. One CHANGELOG entry per
//     bump so support conversations can pinpoint exactly which build
//     a club is running.
//
// Phase history:
//   v0.1.x — Phase 1: DB-driven content, admin hub, RLS
//   v0.2.x — Phase 2: 4-role hierarchy + permissions + Platform card
//   v0.3.x — Phase 3: white-label branding + subdomain routing
//   v0.4.x — Phase 4: messaging (orders + clubhouse + DMs + Web Push)
//             plus operational/quality work: Phase A polish, Phase B
//             (feature flags, lesson pros, ToU, swipe nav), Cloudflare
//             Pages migration, CRUD bug fixes, and patch-tracking.
//
// Bump rule: every commit, period. See CHANGELOG.md for what's in each
// patch. Shown to members in the MyClub footer; shown to staff during
// support calls so we know which exact build is in the wild.
export const VERSION = '0.4.2';

// Parent platform brand. Shown as 'Powered by The Grounds' in the
// sign-in footer, the loading splash, and the About row in MyClub.
export const PLATFORM_NAME = 'The Grounds';
export const PLATFORM_TAGLINE = 'Country-club apps, white-labeled.';
