// useAnalytics — auth-aware hybrid GA4 + Supabase wrapper (v0.11.21).
//
// The canonical entry point for firing events from React components.
// Every event fires to BOTH layers in parallel:
//
//   · GA4 (member-app property) — exploration, ML, BigQuery export,
//     future marketing attribution. The strategic layer.
//   · Supabase `analytics_events` table — fast per-club SQL queries
//     for the admin dashboard. The operational layer.
//
// Both calls are fire-and-forget. The Supabase write uses RLS scoped
// by club_id; the table only accepts inserts from authenticated users
// who belong to the club (members, staff, or guests).
//
// Auth gating:
//   · Real authenticated members + a resolved club → both layers fire
//   · Guests → currently DON'T fire (per v0.10.16 spec, separate
//     analytics story). The Supabase RLS policy allows guest inserts
//     for forward compat, but the hook still gates them out for now.
//   · Unauthenticated / no club → nothing fires
//
// Usage:
//   const { trackEvent, trackPageView, isEligible } = useAnalytics();
//   trackEvent('food_order_placed', { item_count: 4, order_type: 'to_go' });
//   trackPageView('home');
//
// PII policy: never include names, emails, membership numbers, or
// any identifier that maps to a single person in `params`. The
// `club_id`, `member_id`, and `user_id` foreign keys ARE stored on
// the Supabase side — those are RLS-scoping values, not free-text
// identifiers, and they let the dashboard answer "how many members
// active today" without leaking who.

import { useCallback } from 'react';
import { useAuth } from './useAuth.jsx';
import { sendEvent, sendPageView, sendSupabaseEvent } from '../lib/analytics.js';
import { supabase } from '../lib/supabase.js';

export function useAnalytics() {
  const { club, member, session, isGuest } = useAuth();

  // Eligibility: real member + non-guest + a resolved club.
  const isEligible = !!(member && !isGuest && club?.id);

  const trackEvent = useCallback((name, params) => {
    if (!isEligible || !name) return;
    // GA4 (strategic layer)
    sendEvent(name, { ...(params || {}), club_id: club.id });
    // Supabase (operational layer for the admin dashboard)
    sendSupabaseEvent(supabase, {
      clubId: club.id,
      memberId: member?.id,
      userId: session?.user?.id,
      eventName: name,
      properties: params || {},
      urlPath: typeof window !== 'undefined' ? window.location.pathname : null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    });
  }, [isEligible, club?.id, member?.id, session?.user?.id]);

  const trackPageView = useCallback((screen) => {
    if (!isEligible || !screen) return;
    // GA4 (page_view semantics — page_title / page_path)
    sendPageView({ screen, club_id: club.id });
    // Supabase (canonical event_name='page_view' with screen in properties.screen)
    sendSupabaseEvent(supabase, {
      clubId: club.id,
      memberId: member?.id,
      userId: session?.user?.id,
      eventName: 'page_view',
      properties: { screen },
      urlPath: typeof window !== 'undefined' ? window.location.pathname : null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    });
  }, [isEligible, club?.id, member?.id, session?.user?.id]);

  return { trackEvent, trackPageView, isEligible };
}
