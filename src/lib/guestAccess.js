// Centralized guest visibility matrix. Single source of truth for "can
// a guest at access level X see surface Y?" — keeps screen-level
// `isGuest` checks consistent across the codebase and makes the spec's
// allow/deny table directly inspectable.
//
// From the Phase 8 spec:
//
//   ALWAYS HIDDEN (any access level):
//     Member Directory, Member DMs, Bulletin Board, Partner Board,
//     Trophy Case, member profile pages of other members, membership
//     card screens of other members, food ordering CTAs, admin area.
//
//   LIMITED READ-ONLY mode:
//     daily club status dashboard, course map, pin placements,
//     pace of play, weather widget, menu (display only — no order).
//
//   FULL TEMPORARY mode:
//     above + events calendar, news feed, pro shop catalog (browse),
//     lesson pros listing (no booking).
//
//   data_only mode: zero app access — render the thank-you screen
//     and stop.
//
// Usage:
//   import { guestCanSee } from '../lib/guestAccess.js';
//   if (isGuest && !guestCanSee(guestAccessLevel, 'bulletin_board')) {
//     return <FeatureOff label="Bulletin Board" body="Members only." />;
//   }

// Visible to ANY guest (read_only and full_temporary).
const READ_ONLY_ALLOWED = new Set([
  'home',            // status pills, pace strip, weather
  'golf',            // hub itself; per-tile gating below
  'food',            // FoodMenu screen (no cart/ordering)
  'myclub',          // guest profile view
  'settings',        // sign out, about
  // Sub-features (referenced by their flag/screen keys)
  'status_pills',
  'pin_placements',
  'course_map',
  'pace_of_play',
  'weather',
  'menu',
]);

// Visible to full_temporary guests in addition to the above.
const FULL_TEMP_ALLOWED = new Set([
  'community',       // Community hub
  'events_calendar', // tap-through from Community hub
  'news',            // news feed on Home
  'today_events',    // Today's Events strip on Home
  'pro_shop',        // pro shop catalog (browse-only)
  'lesson_pros',     // pro list shown when viewing pros (no booking)
]);

// Always hidden, regardless of guest access level. Listed for
// completeness — the function returns false for anything not in the
// allowed sets above, so this set is informational. Adding a key
// here without removing it from the allow lists is the safe pattern
// for future audits.
// eslint-disable-next-line no-unused-vars
const ALWAYS_HIDDEN = new Set([
  'bulletin_board',
  'partner_board',
  'member_directory',
  'dms',
  'inbox',
  'thread',
  'message_clubhouse',
  'member_card',
  'admin',
  'food_ordering',     // the cart + add-to-cart + place-order CTAs
  'lesson_booking',    // full_temp can SEE pros, can't BOOK
  'tee_time_booking',
  'profile_photos',    // can't upload
  'display_mode',      // not personalizable for guests
]);

// Returns true when the given key is visible to a guest at the
// provided access level. Members + staff always see everything (their
// visibility is governed elsewhere — feature flags, role perms).
//
// `accessLevel` is null when not a guest; this function returns false
// in that case to be safe — callers should gate on isGuest first.
export function guestCanSee(accessLevel, key) {
  if (!accessLevel) return false;
  if (accessLevel === 'data_only') return false;
  if (READ_ONLY_ALLOWED.has(key)) return true;
  if (accessLevel === 'full_temporary' && FULL_TEMP_ALLOWED.has(key)) return true;
  return false;
}
