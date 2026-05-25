// Feature flag catalog. The platform owns this — adding a new feature
// means adding it here and bumping its min_tier when appropriate. No
// DB migration needed for new flags: per-club override state lives in
// clubs.feature_flags (jsonb), and the catalog below is the source of
// truth for what flags exist and which tier unlocks each.
//
// Resolution rules (see isFeatureOn / featureState below):
//   1. Club tier below the flag's min_tier → flag is locked OFF
//   2. Club has an explicit override in feature_flags → use that
//   3. Otherwise → use the flag's default_enabled
//
// Why a code catalog instead of a DB table:
//   · Adding a flag means writing UI that respects it → that's a code
//     change anyway, no value in a separate DB row.
//   · The set of flags is small enough (~tens, not thousands) that a
//     code object is the right shape.
//   · Lets us ship a flag in the same commit as the code that gates on it.

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
//   min_tier         — lowest tier where this flag is available to toggle
//   default_enabled  — value when no override and tier allows it
//   label            — short title for admin UI
//   description      — one-line explanation for admin UI
//   category         — used to group flags in admin UI (optional)
export const FEATURES = {
  dms: {
    key:             'dms',
    label:           'Member-to-member DMs',
    description:     'Members can start direct-message conversations with each other from the Member Directory or post Contact buttons.',
    min_tier:        'standard',
    default_enabled: false,
    category:        'Messaging',
  },
  member_directory: {
    key:             'member_directory',
    label:           'Member Directory',
    description:     'Members can see a roster of every active member at the club. Required to find someone to DM; can also be on standalone for browsing-only when DMs are off.',
    min_tier:        'basic',
    default_enabled: false,
    category:        'Messaging',
  },
  display_mode: {
    key:             'display_mode',
    label:           'Display mode personalization',
    description:     'Members can pick a light, medium, or dark variant of the club palette in their personal Settings. Modes shift background brightness without changing your brand colors.',
    min_tier:        'basic',
    default_enabled: false,
    category:        'Appearance',
  },
  profile_photos: {
    key:             'profile_photos',
    label:           'Member profile photos',
    description:     'Members can upload a photo to show on their membership card, in the directory, on bulletin / partner posts, and in chat bubbles. When off, the default initials avatar shows regardless of whether members have uploaded photos.',
    min_tier:        'basic',
    default_enabled: false,
    category:        'Profile',
  },
};

// All flags as an ordered array — used by admin UI to render toggles.
// Sorted by tier rank (lowest first) then alphabetical for stability.
export function listFeatures() {
  return Object.values(FEATURES).sort((a, b) => {
    const t = (TIER_RANK[a.min_tier] || 0) - (TIER_RANK[b.min_tier] || 0);
    return t !== 0 ? t : a.label.localeCompare(b.label);
  });
}

// Boolean: is this feature on for this club right now?
// Use this anywhere in the app that needs to branch on a flag.
//
//   import { isFeatureOn } from '../lib/features.js';
//   if (isFeatureOn(club, 'dms')) { ... }
export function isFeatureOn(club, flagKey) {
  const flag = FEATURES[flagKey];
  if (!flag || !club) return false;
  if ((TIER_RANK[club.subscription_tier] ?? 0) < TIER_RANK[flag.min_tier]) return false;
  const overrides = club.feature_flags || {};
  if (Object.prototype.hasOwnProperty.call(overrides, flagKey)) {
    return !!overrides[flagKey];
  }
  return !!flag.default_enabled;
}

// Detailed state for admin UI — distinguishes "off because tier-locked"
// from "off because manager turned it off." Lets us render different
// affordances in the Club Settings panel.
//
//   { value, locked, reason: 'tier-locked' | 'override' | 'default' | 'unknown' }
export function featureState(club, flagKey) {
  const flag = FEATURES[flagKey];
  if (!flag || !club) return { value: false, locked: true, reason: 'unknown' };
  if ((TIER_RANK[club.subscription_tier] ?? 0) < TIER_RANK[flag.min_tier]) {
    return { value: false, locked: true, reason: 'tier-locked' };
  }
  const overrides = club.feature_flags || {};
  if (Object.prototype.hasOwnProperty.call(overrides, flagKey)) {
    return { value: !!overrides[flagKey], locked: false, reason: 'override' };
  }
  return { value: !!flag.default_enabled, locked: false, reason: 'default' };
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
