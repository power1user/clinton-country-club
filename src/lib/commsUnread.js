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
//     · inbox_clubhouse — threads where the last non-system message
//                          is from a non-staff sender (member wrote,
//                          staff hasn't replied yet — v0.19.4)
//
//   ACTIVITY FEED (badge = items added since last viewed)
//     · inbox_guests     — new guest registrations
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

    // v0.19.4 — Clubhouse threads moved from ACTIVITY-FEED ("new threads
    // since last viewed") to OPEN-WORK ("threads where the last
    // non-system message is from a non-staff sender"). Implemented
    // client-side because MCP scope on the country club project was
    // unavailable when this hotfix landed; if perf becomes a concern
    // at scale, lift to a SECURITY DEFINER RPC.
    const cOpenClubhouse = async () => {
      const [staffRes, threadRes] = await Promise.all([
        supabase
          .from('user_roles')
          .select('user_id, role, club_id'),
        supabase
          .from('threads')
          .select('id')
          .eq('club_id', clubId)
          .eq('kind', 'clubhouse')
          .limit(500),
      ]);
      const staffIds = new Set(
        (staffRes.data || [])
          .filter(r => r.role === 'super_admin' || r.club_id === clubId)
          .map(r => r.user_id)
      );
      const threads = threadRes.data || [];
      if (threads.length === 0) return 0;
      const threadIds = threads.map(t => t.id);

      // One round-trip for every non-system message across all threads,
      // ordered newest-first. We walk the result and keep only the FIRST
      // (= most recent) sender per thread.
      const { data: messages } = await supabase
        .from('messages')
        .select('thread_id, sender_user_id, created_at')
        .in('thread_id', threadIds)
        .eq('is_system', false)
        .order('created_at', { ascending: false });

      const lastSender = new Map();
      for (const m of (messages || [])) {
        if (!lastSender.has(m.thread_id)) lastSender.set(m.thread_id, m.sender_user_id);
      }

      let open = 0;
      for (const id of threadIds) {
        // A thread is OPEN when:
        //   · It has no non-system messages yet (brand-new system marker
        //     only) — staff should look.
        //   · OR its last non-system sender is not a staff member.
        if (!lastSender.has(id)) { open++; continue; }
        const sender = lastSender.get(id);
        if (!sender || !staffIds.has(sender)) open++;
      }
      return open;
    };

    const [food, lessons, proshop, guests, rsvps, clubhouse] = await Promise.all([
      // OPEN-WORK queues — server-truth count of actionable items.
      cOpen('food_orders',         FOOD_OPEN),
      cOpen('pro_shop_inquiries',  INQUIRY_OPEN, q => q.eq('kind', 'lesson')),
      cOpen('pro_shop_inquiries',  INQUIRY_OPEN, q => q.neq('kind', 'lesson')),
      // ACTIVITY-FEED queues — items added since lastViewed (per-device).
      cSince('guests',              since('inbox_guests'),    'created_at'),
      cSince('event_registrations', since('inbox_rsvps'),     'registered_at'),
      // v0.19.4 — Clubhouse is OPEN-WORK now.
      cOpenClubhouse(),
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
      // Clubhouse: open-work now. Both thread INSERTs (new member start)
      // and message INSERTs (staff reply OR member follow-up) flip the
      // open-count, so subscribe to both. v0.19.4.
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'threads',             filter: `club_id=eq.${clubId}` }, bump)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, bump)
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
