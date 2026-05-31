// Feature flag catalog. The platform owns this — adding a new feature
// means adding it here and bumping its min_tier when appropriate. No
// DB migration needed for new flags: per-club override state lives in
// clubs.feature_flags (jsonb), and the catalog below is the source of
// truth for what flags exist and which tier unlocks each.
//
// Resolution rules (see isFeatureOn / featureState below), in order:
//   1. Club tier below the flag's min_tier → flag is locked OFF
//   2. Platform lock present (clubs.feature_flags_locked) → use that
//      value, regardless of what the club manager has set (Phase 7)
//   3. Club has an explicit override in feature_flags → use that
//   4. Otherwise → use the flag's default_enabled
//
// Why a code catalog instead of a DB table:
//   · Adding a flag means writing UI that respects it → that's a code
//     change anyway, no value in a separate DB row.
//   · The set of flags is small enough (~tens, not thousands) that a
//     code object is the right shape.
//   · Lets us ship a flag in the same commit as the code that gates on it.
//
// Phase 7 (v0.7.0) note: the Club Features Control Panel exposes
// EVERY flag in this catalog as a manager-facing toggle. Anything we
// add here ships with an automatic admin UI toggle the next time
// FeaturesAdmin renders — no extra wiring per flag.

export const TIERS = ['basic', 'standard', 'pro'];

// Rank used for "tier >= min_tier" comparisons. Higher = more features.
export const TIER_RANK = { basic: 0, standard: 1, pro: 2 };

export const TIER_LABEL = {
  basic:    'Basic',
  standard: 'Standard',
  pro:      'Pro',
};

// One-line description of what each tier includes — shown in admin UI.
export const TIER_DESCRIPTION = {
  basic:    'Core member experience — status pills, menus, events, news, course map.',
  standard: 'Basic + member-to-member messaging and richer interactivity.',
  pro:      'Standard + every advanced feature we ship.',
};

// The catalog. Keys are flag identifiers used by useFlag('key').
//
//   key              — stable identifier; never rename without a migration
//   label            — short title for admin UI
//   description      — one-line explanation for admin UI
//   min_tier         — lowest tier where this flag is available to toggle
//   default_enabled  — value when no override and tier allows it
//   category         — used to group flags in admin UI
//   placeholder      — (optional) true when the feature is a stub for
//                      future work (e.g. Tee Time Booking pre-backend).
//                      Toggle stays available so we can plan/preview,
//                      but the UI shows a "coming soon" hint.
//
// IMPORTANT: default_enabled for previously-hardcoded-visible features
// is `true` so existing clubs don't lose functionality on upgrade. Net
// behavior is identical pre-/post-Phase-7 for any club that doesn't
// touch their Features panel.
export const FEATURES = {
  // ─── Golf ──────────────────────────────────────────────────────────
  pin_placements: {
    key:             'pin_placements',
    label:           'Pin Placements',
    description:     "Daily pin position per green, with greenskeeper notes. Member surface is Golf → Pin Placement.",
    min_tier:        'basic',
    default_enabled: true,
    category:        'Golf',
  },
  course_map: {
    key:             'course_map',
    label:           'Course Map',
    description:     'Satellite map of the course with per-hole detail. Member surface is Golf → Course Map.',
    min_tier:        'basic',
    default_enabled: true,
    category:        'Golf',
  },
  pace_of_play: {
    key:             'pace_of_play',
    label:           'Pace of Play',
    description:     "Today's pace indicator (on pace / slightly slow / significantly slow) shown on Golf and Home.",
    min_tier:        'basic',
    default_enabled: true,
    category:        'Golf',
  },
  partner_board: {
    key:             'partner_board',
    label:           'Golf Partner Board',
    description:     "Members post 'looking for a foursome' and others reply or DM. Surface is Golf → Golf Partners.",
    min_tier:        'basic',
    default_enabled: true,
    category:        'Golf',
  },
  tee_time_booking: {
    key:             'tee_time_booking',
    label:           'Tee Time Booking',
    description:     'Member tee-time reservations. Coming soon — UI scaffold exists but no live backend yet.',
    min_tier:        'basic',
    default_enabled: false,
    category:        'Golf',
    placeholder:     true,
  },
  lesson_booking: {
    key:             'lesson_booking',
    label:           'Lesson Booking',
    description:     'Members can request lessons from the pro shop roster. Surface is My Club → Book a Lesson.',
    min_tier:        'basic',
    default_enabled: true,
    category:        'Golf',
  },

  // ─── Pro Shop ──────────────────────────────────────────────────────
  pro_shop: {
    key:             'pro_shop',
    label:           'Pro Shop',
    description:     'Browseable catalog of pro shop items. Surface is My Club → Pro Shop.',
    min_tier:        'basic',
    default_enabled: true,
    category:        'Pro Shop',
  },

  // ─── Dining ────────────────────────────────────────────────────────
  food_ordering: {
    key:             'food_ordering',
    label:           'Food Ordering',
    description:     'Members order food/drinks from the menu and place orders to a hole or location. Surface is the Food & Drink tab.',
    min_tier:        'basic',
    default_enabled: true,
    category:        'Dining',
  },
  // v0.12.5 — opt-in pickup-time picker at checkout. Default OFF —
  // most clubs prefer "kitchen fires it whenever it bubbles up the
  // queue" and the picker just adds a clarification step. Clubs
  // running a tighter pickup operation (call-ahead window, beverage-
  // cart sequencing, member-club-grill busy times) can flip this
  // on from Features and the picker re-appears on the order screen.
  food_pickup_time: {
    key:             'food_pickup_time',
    label:           'Food Order Pickup Time',
    description:     "Show the \"When would you like to pick up?\" / \"When would you like to be seated?\" time picker at checkout. Off = orders are ASAP only (kitchen fires whenever the ticket bubbles up).",
    min_tier:        'basic',
    default_enabled: false,
    category:        'Dining',
  },

  // ─── Community ─────────────────────────────────────────────────────
  bulletin_board: {
    key:             'bulletin_board',
    label:           'Bulletin Board',
    description:     'Members post general announcements (lost-and-found, for-sale, ride shares, etc.). Surface is Community → Bulletin Board.',
    min_tier:        'basic',
    default_enabled: true,
    category:        'Community',
  },
  events_calendar: {
    key:             'events_calendar',
    label:           'Calendar & Events',
    description:     'Member-facing calendar of club events, with RSVP. Surface is the Community tab.',
    min_tier:        'basic',
    default_enabled: true,
    category:        'Community',
  },
  member_directory: {
    key:             'member_directory',
    label:           'Member Directory',
    description:     'Members can see a roster of every active member at the club. Required to find someone to DM; can also be on standalone for browsing-only when DMs are off.',
    min_tier:        'basic',
    default_enabled: false,
    category:        'Community',
  },
  trophy_case: {
    key:             'trophy_case',
    label:           'Trophy Case',
    description:     'Dedicated screen on the Community tab showing all club badges by category + the current member\'s own awards. Section name is configurable per club from Club Settings.',
    min_tier:        'basic',
    default_enabled: true,
    category:        'Community',
  },

  // ─── Add-Ons ───────────────────────────────────────────────────────
  // Paid extras gated by clubs.addons (migration 57). Manager only
  // sees a working toggle when super_admin has enabled the addon for
  // this club. Otherwise the row renders as "Contact The Grounds to
  // enable" with the toggle disabled. The flag.addon property is the
  // marker — see featureState resolution below.
  sponsor_banners: {
    key:             'sponsor_banners',
    label:           'Sponsor Banners',
    description:     'Inject paid sponsor banners into the Home news feed and the bottom of the Golf tab. Requires banner records configured in Broadcasts → Sponsor Banners.',
    min_tier:        'basic',
    default_enabled: false,
    category:        'Add-Ons',
    addon:           true,
    addon_blurb:     'Adds advertising banner placements on members\' Home + Golf screens. Drives sponsor revenue. Contact The Grounds to enable for your club.',
  },

  // ─── Messaging ─────────────────────────────────────────────────────
  dms: {
    key:             'dms',
    label:           'Member-to-member DMs',
    description:     'Members can start direct-message conversations with each other from the Member Directory or post Contact buttons.',
    min_tier:        'standard',
    default_enabled: false,
    category:        'Messaging',
  },

  // ─── Member Info ───────────────────────────────────────────────────
  profile_photos: {
    key:             'profile_photos',
    label:           'Member profile photos',
    description:     'Members can upload a photo to show on their membership card, in the directory, on bulletin / partner posts, and in chat bubbles. When off, the default initials avatar shows regardless of whether members have uploaded photos.',
    min_tier:        'basic',
    default_enabled: false,
    category:        'Member Info',
  },
  lockers: {
    key:             'lockers',
    label:           'Locker Numbers',
    description:     'Show the member\'s locker number on My Club → My Account. Turn off if your club doesn\'t assign lockers.',
    min_tier:        'basic',
    default_enabled: true,
    category:        'Member Info',
  },
  cart_assignments: {
    key:             'cart_assignments',
    label:           'Cart Assignments',
    description:     'Show the member\'s cart assignment on My Club → My Account. Turn off if your club doesn\'t assign carts.',
    min_tier:        'basic',
    default_enabled: true,
    category:        'Member Info',
  },
  parking_assignments: {
    key:             'parking_assignments',
    label:           'Parking Spot Assignments',
    description:     'Show the member\'s parking spot on My Club → My Account. Turn off if your club doesn\'t assign parking.',
    min_tier:        'basic',
    default_enabled: true,
    category:        'Member Info',
  },

  // ─── Appearance ────────────────────────────────────────────────────
  display_mode: {
    key:             'display_mode',
    label:           'Display mode personalization',
    description:     'Members can pick a light, medium, or dark variant of the club palette in their personal Settings. Modes shift background brightness without changing your brand colors.',
    min_tier:        'basic',
    default_enabled: false,
    category:        'Appearance',
  },

  // ─── Guest System ──────────────────────────────────────────────────
  // Phase 8 (v0.8.0): master switch for the entire guest registration
  // system. When OFF, all guest entry points disappear, the public
  // /guest/<slug> registration page returns 404, and no guest QR codes
  // surface anywhere. When ON, the system is active and the manager's
  // other guest settings (auto-approve, visit duration, phone field,
  // PWA required) on the clubs row take effect.
  guest_registration: {
    key:             'guest_registration',
    label:           'Guest Registration',
    description:     "Members and clubhouse staff can invite non-members to register as guests via QR code. Captures contact info + grants time-limited app access per the access level you configure. When off, the whole guest system is dormant.",
    min_tier:        'standard',
    default_enabled: false,
    category:        'Guest System',
  },
};

// Category order used by admin UI grouping. Anything not listed here
// falls to the end in catalog-declaration order.
export const CATEGORY_ORDER = [
  'Golf', 'Pro Shop', 'Dining', 'Community', 'Messaging', 'Member Info', 'Appearance', 'Guest System',
];

// All flags as an ordered array — used by admin UI to render toggles.
// Sorted by category (per CATEGORY_ORDER), then by tier rank, then by
// label so the same UI shape is stable across renders.
export function listFeatures() {
  return Object.values(FEATURES).sort((a, b) => {
    const ca = CATEGORY_ORDER.indexOf(a.category || 'Other');
    const cb = CATEGORY_ORDER.indexOf(b.category || 'Other');
    if (ca !== cb) return (ca === -1 ? 999 : ca) - (cb === -1 ? 999 : cb);
    const t = (TIER_RANK[a.min_tier] || 0) - (TIER_RANK[b.min_tier] || 0);
    return t !== 0 ? t : a.label.localeCompare(b.label);
  });
}

// Group features by category — convenience for the FeaturesAdmin UI
// that renders one section per category with a heading.
export function listFeaturesByCategory() {
  const groups = new Map();
  for (const f of listFeatures()) {
    const k = f.category || 'Other';
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(f);
  }
  return Array.from(groups.entries()).map(([category, items]) => ({ category, items }));
}

// Internal: pull the platform lock value for a flag if one is set.
// Returns { locked: true, value } or { locked: false }.
function platformLockFor(club, flagKey) {
  const locks = club?.feature_flags_locked || {};
  if (Object.prototype.hasOwnProperty.call(locks, flagKey)) {
    return { locked: true, value: !!locks[flagKey] };
  }
  return { locked: false };
}

// Boolean: is this feature on for this club right now?
// Use this anywhere in the app that needs to branch on a flag.
//
//   import { isFeatureOn } from '../lib/features.js';
//   if (isFeatureOn(club, 'dms')) { ... }
//
// Order: tier check → platform lock → club override → catalog default.
export function isFeatureOn(club, flagKey) {
  const flag = FEATURES[flagKey];
  if (!flag || !club) return false;
  if ((TIER_RANK[club.subscription_tier] ?? 0) < TIER_RANK[flag.min_tier]) return false;
  const lock = platformLockFor(club, flagKey);
  if (lock.locked) return lock.value;
  const overrides = club.feature_flags || {};
  if (Object.prototype.hasOwnProperty.call(overrides, flagKey)) {
    return !!overrides[flagKey];
  }
  return !!flag.default_enabled;
}

// Detailed state for admin UI — distinguishes "off because tier-locked"
// from "off because manager turned it off" from "off because The Grounds
// pinned it off" from "off because the add-on hasn't been purchased."
// Lets us render different affordances in the Features panel.
//
//   { value, locked, reason }
//   reason ∈ 'tier-locked' | 'addon-not-enabled' | 'platform-locked' |
//            'override' | 'default' | 'unknown'
export function featureState(club, flagKey) {
  const flag = FEATURES[flagKey];
  if (!flag || !club) return { value: false, locked: true, reason: 'unknown' };
  if ((TIER_RANK[club.subscription_tier] ?? 0) < TIER_RANK[flag.min_tier]) {
    return { value: false, locked: true, reason: 'tier-locked' };
  }
  // v0.10.2 — add-on gate. Flag.addon = true means this is a paid
  // extra; clubs.addons.<key> must be true for the manager to be able
  // to enable it. No DB entry = not purchased = forced off.
  if (flag.addon && !isAddonEnabled(club, flagKey)) {
    return { value: false, locked: true, reason: 'addon-not-enabled' };
  }
  const lock = platformLockFor(club, flagKey);
  if (lock.locked) {
    return { value: lock.value, locked: true, reason: 'platform-locked' };
  }
  const overrides = club.feature_flags || {};
  if (Object.prototype.hasOwnProperty.call(overrides, flagKey)) {
    return { value: !!overrides[flagKey], locked: false, reason: 'override' };
  }
  return { value: !!flag.default_enabled, locked: false, reason: 'default' };
}

// v0.10.2 — is a specific paid add-on enabled for this club? Reads
// clubs.addons (jsonb) per migration 57. Returns false for clubs
// without an entry — add-ons require explicit super_admin opt-in.
export function isAddonEnabled(club, addonKey) {
  if (!club || !addonKey) return false;
  return (club.addons || {})[addonKey] === true;
}

// Helper for writing addon enable/disable from the super_admin UI.
// Merges into the existing jsonb, preserves other addons. Pass
// `false` (not null) to explicitly disable; pass `true` to enable.
export function withAddonChange(currentAddons, addonKey, enabled) {
  const next = { ...(currentAddons || {}) };
  if (enabled) {
    next[addonKey] = true;
  } else {
    delete next[addonKey];
  }
  return next;
}

// Merge-helper for writing flag changes back to clubs.feature_flags.
// Keeps the jsonb compact by removing entries that match the catalog
// default (no need to store "dms: false" if false is already default).
//
//   const next = withFlagChange(club.feature_flags, 'dms', true);
//   supabase.from('clubs').update({ feature_flags: next }).eq('id', club.id);
export function withFlagChange(currentFlags, flagKey, value) {
  const flag = FEATURES[flagKey];
  const next = { ...(currentFlags || {}) };
  if (!flag) { next[flagKey] = value; return next; }
  if (!!value === !!flag.default_enabled) {
    delete next[flagKey];      // matches default — no need to store override
  } else {
    next[flagKey] = !!value;
  }
  return next;
}

// Platform-lock merge-helper. Used from Platform → All Clubs to pin
// (or unpin) a flag for a specific club. Unlike withFlagChange, we
// store both true AND false explicitly — the presence of the key in
// feature_flags_locked is what activates the lock, regardless of the
// catalog default. Pass `null` to clear the lock.
//
//   const next = withFlagLock(club.feature_flags_locked, 'dms', true);
//   const next = withFlagLock(club.feature_flags_locked, 'dms', null); // unlock
export function withFlagLock(currentLocks, flagKey, value) {
  const next = { ...(currentLocks || {}) };
  if (value === null || value === undefined) {
    delete next[flagKey];
  } else {
    next[flagKey] = !!value;
  }
  return next;
}
