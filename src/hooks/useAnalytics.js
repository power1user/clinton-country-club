// useAnalytics — auth-aware GA4 wrapper (v0.10.16).
//
// The canonical entry point for firing events from React components.
// Layers:
//   · Guest + unauthenticated gating — events only fire for real
//     authenticated members
//   · club_id auto-injection — every event gets the current club's
//     id attached so reports can segment by club without per-
//     callsite effort
//   · `isEligible` boolean so callers can skip any pre-event work
//     (e.g. measuring item count) when nothing will fire anyway
//
// Usage:
//
//   const { trackEvent, trackPageView, isEligible } = useAnalytics();
//
//   trackEvent('food_order_placed', { item_count: 4, order_type: 'delivery' });
//   trackPageView('home');
//
// PII policy: never include names, emails, membership numbers, or
// any identifier that maps to a single person. `club_id` is the
// only non-anonymous parameter — it's a club-scoping value, not
// a person-scoping value.

import { useCallback } from 'react';
import { useAuth } from './useAuth.jsx';
import { sendEvent, sendPageView } from '../lib/analytics.js';

export function useAnalytics() {
  const { club, member, isGuest } = useAuth();

  // Eligibility: real member + non-guest + a resolved club. Stay
  // out of GA4 for guests by Marc's spec — guests have a separate
  // analytics story (or none at all) for privacy reasons.
  const isEligible = !!(member && !isGuest && club?.id);

  const trackEvent = useCallback((name, params) => {
    if (!isEligible || !name) return;
    sendEvent(name, { ...(params || {}), club_id: club.id });
  }, [isEligible, club?.id]);

  const trackPageView = useCallback((screen) => {
    if (!isEligible || !screen) return;
    sendPageView({ screen, club_id: club.id });
  }, [isEligible, club?.id]);

  return { trackEvent, trackPageView, isEligible };
}
