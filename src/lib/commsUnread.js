// Communications-area unread tracking (v0.9.4, redesigned v0.11.20).
//
// Each sub-queue shows a numeric badge. Two different semantics
// depending on whether the queue represents OPEN WORK or an
// ACTIVITY FEED:
//
//   OPEN WORK (badge = items needing action)
//     · inbox_food     — food_orders in active statuses
//     · inbox_lessons  — pro_shop_inquiries (kind=lesson) not closed
//     · inbox_proshop  — pro_shop_inquiries (other) not closed
//
//   ACTIVITY FEED (badge = items added since last viewed)
//     · inbox_guests     — new guest registrations
//     · inbox_clubhouse  — new clubhouse threads
//     · inbox_rsvps      — new event registrations
//
// Original v0.9.4 used "since last viewed" for every queue. That
// matched the activity-feed queues but produced wrong counts for
// open-work queues: a food order from yesterday already picked up
// still counted as "unread" because it was created after the last
// viewed timestamp. Marc reported 4 / 2 (badge said 4 active food
// orders, only 2 were open) — that's what this redesign fixes.
//
// localStorage still tracks lastViewed timestamps. It's a no-op for
// open-work queues (their count doesn't depend on lastViewed) but
// activity-feed queues use it the same way as before. `markViewed`
// is safe to call on either kind.
//
// Tradeoffs:
//   · localStorage means each device tracks activity feeds
//     independently. Open-work counts are server-truth — same on
//     every device.
//   · No backfill on activity feeds: brand-new visit shows lifetime
//     backlog as unread. Acceptable; clears once they view.
import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase.js';

const STORAGE_KEY = (clubId) => `commsViewedAt:${clubId}`;
const EPOCH = '1970-01-01T00:00:00Z';

function readViewed(clubId) {
  if (!clubId || typeof localStorage === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY(clubId)) || '{}');
  } catch {
    return {};
  }
}

function writeViewed(clubId, sectionId, when) {
  if (!clubId || !sectionId || typeof localStorage === 'undefined') return;
  try {
    const v = readViewed(clubId);
    v[sectionId] = when;
    localStorage.setItem(STORAGE_KEY(clubId), JSON.stringify(v));
  } catch (_) {
    // Quota / disabled storage — silent. Counts will read as full backlog.
  }
}

export function markCommsViewed(clubId, sectionId) {
  writeViewed(clubId, sectionId, new Date().toISOString());
}

// useCommsUnread — returns the live counts dict + a markViewed
// function that updates localStorage and triggers a recount.
//
// Counts shape:
//   {
//     inbox_food: 3,
//     inbox_lessons: 1,
//     inbox_proshop: 0,
//     inbox_guests: 2,
//     inbox_clubhouse: 5,
//     inbox_rsvps: 0,
//   }
//
// total = sum of all section counts (used for the area-card badge).
export function useCommsUnread(clubId) {
  const [counts, setCounts] = useState({});
  const [tick, setTick] = useState(0);

  const recompute = useCallback(async () => {
    if (!clubId) { setCounts({}); return; }
    const viewed = readViewed(clubId);
    const since = (id) => viewed[id] || EPOCH;

    // Open-work statuses — kept in sync with FoodOrdersAdmin's
    // ACTIVE_STATUSES and LessonRequestsAdmin's status enum.
    //   · food_orders: legacy 'out_for_delivery' still counted so
    //     pre-v0.10.18 rows on slow-to-migrate clubs render correctly.
    //   · pro_shop_inquiries: 'done' and 'cancelled' are the closed
    //     terminal states; pending / contacted / scheduled all need
    //     follow-up so they count.
    const FOOD_OPEN    = ['pending', 'preparing', 'out_for_delivery', 'ready_for_pickup'];
    const INQUIRY_OPEN = ['pending', 'contacted', 'scheduled'];

    // Helper: parallel HEAD count, status-in filter (open-work).
    const cOpen = async (table, openStatuses, applyExtra) => {
      let q = supabase
        .from(table)
        .select('id', { count: 'exact', head: true })
        .eq('club_id', clubId)
        .in('status', openStatuses);
      if (applyExtra) q = applyExtra(q);
      const { count } = await q;
      return count || 0;
    };

    // Helper: parallel HEAD count, "added since" filter (activity-feed).
    // v0.11.24 — `tsColumn` parameter because not every table uses
    // `created_at` as its insertion timestamp. event_registrations
    // uses `registered_at` (predates the unified-naming convention).
    // Calling .gt('created_at', ...) on event_registrations returned
    // a 400 from PostgREST every page load — silent fail at the JS
    // layer, noisy in the network panel.
    const cSince = async (table, sinceTs, tsColumn, applyExtra) => {
      let q = supabase
        .from(table)
        .select('id', { count: 'exact', head: true })
        .eq('club_id', clubId)
        .gt(tsColumn || 'created_at', sinceTs);
      if (applyExtra) q = applyExtra(q);
      const { count } = await q;
      return count || 0;
    };

    const [food, lessons, proshop, guests, rsvps, clubhouse] = await Promise.all([
      // OPEN-WORK queues — server-truth count of actionable items.
      cOpen('food_orders',         FOOD_OPEN),
      cOpen('pro_shop_inquiries',  INQUIRY_OPEN, q => q.eq('kind', 'lesson')),
      cOpen('pro_shop_inquiries',  INQUIRY_OPEN, q => q.neq('kind', 'lesson')),
      // ACTIVITY-FEED queues — items added since lastViewed (per-device).
      cSince('guests',              since('inbox_guests'),    'created_at'),
      cSince('event_registrations', since('inbox_rsvps'),     'registered_at'),
      // Clubhouse messages: threads-since-last-viewed for now. A
      // future patch can refine to messages.created_at for true
      // new-message-since-last-view tracking.
      cSince('threads',             since('inbox_clubhouse'), 'created_at', q => q.eq('kind', 'clubhouse')),
    ]);

    setCounts({
      inbox_food: food,
      inbox_lessons: lessons,
      inbox_proshop: proshop,
      inbox_guests: guests,
      inbox_clubhouse: clubhouse,
      inbox_rsvps: rsvps,
    });
  }, [clubId, tick]);

  useEffect(() => { recompute(); }, [recompute]);

  // Realtime — any insert OR update on a relevant table triggers a
  // bump. UPDATE coverage matters for the open-work queues: a manager
  // flipping a food order's status to 'delivered' should drop the
  // count by 1 without waiting for a page reload. Cheap because the
  // recount is 6 HEAD queries that return only counts.
  useEffect(() => {
    if (!clubId) return;
    const bump = () => setTick(t => t + 1);
    const channel = supabase
      .channel(`comms-unread:${clubId}`)
      // food_orders + pro_shop_inquiries: INSERT (new arrival → bump)
      // and UPDATE (status flip → drop) both matter.
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'food_orders',         filter: `club_id=eq.${clubId}` }, bump)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'food_orders',         filter: `club_id=eq.${clubId}` }, bump)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pro_shop_inquiries',  filter: `club_id=eq.${clubId}` }, bump)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pro_shop_inquiries',  filter: `club_id=eq.${clubId}` }, bump)
      // Activity feeds: INSERT only (status doesn't affect count).
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'guests',              filter: `club_id=eq.${clubId}` }, bump)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_registrations', filter: `club_id=eq.${clubId}` }, bump)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'threads',             filter: `club_id=eq.${clubId}` }, bump)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clubId]);

  const markViewed = useCallback((sectionId) => {
    markCommsViewed(clubId, sectionId);
    setTick(t => t + 1);
  }, [clubId]);

  const total = Object.values(counts).reduce((sum, n) => sum + (n || 0), 0);

  return { counts, total, markViewed };
}
