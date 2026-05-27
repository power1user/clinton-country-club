// Communications-area unread tracking (v0.9.4).
//
// Each sub-queue (Food Orders, Lesson Requests, Pro Shop Inquiries,
// Guest Registrations, Clubhouse Messages, Event RSVPs) shows a
// numeric badge counting items added since the staff member last
// viewed that sub-queue. "Viewed" timestamps are stored per
// (club_id, section_id) in localStorage — per-device, no server
// round-trip required.
//
// Tradeoffs:
//   · localStorage means each device tracks independently. If a
//     manager checks orders on their phone then opens the admin on
//     a tablet, the tablet's counter starts cold. That's the right
//     behavior for "I haven't seen this on THIS device yet."
//   · No backfill: brand-new visit shows lifetime backlog as
//     unread. Acceptable for the scaffold; clears once they view.
//
// v0.9.5 + v0.9.6 polish the per-queue UX; this file owns the
// shared count + viewed-state plumbing.
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

    // Helper: parallel HEAD count by table + (optional) extra filter.
    const c = async (table, sinceTs, applyExtra) => {
      let q = supabase
        .from(table)
        .select('id', { count: 'exact', head: true })
        .eq('club_id', clubId)
        .gt('created_at', sinceTs);
      if (applyExtra) q = applyExtra(q);
      const { count } = await q;
      return count || 0;
    };

    const [food, lessons, proshop, guests, rsvps, clubhouse] = await Promise.all([
      c('food_orders',         since('inbox_food')),
      // pro_shop_inquiries.kind discriminates lessons vs general
      c('pro_shop_inquiries',  since('inbox_lessons'),  q => q.eq('kind', 'lesson')),
      c('pro_shop_inquiries',  since('inbox_proshop'),  q => q.neq('kind', 'lesson')),
      c('guests',              since('inbox_guests')),
      c('event_registrations', since('inbox_rsvps')),
      // Clubhouse messages: count threads with kind='clubhouse' that
      // received activity since lastViewed. We use threads.created_at
      // here for the scaffold — v0.9.6 can refine to messages.created_at
      // for true new-message tracking.
      c('threads',             since('inbox_clubhouse'), q => q.eq('kind', 'clubhouse')),
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

  // Realtime — any insert on a relevant table triggers a bump. Cheap
  // because the recount is 6 HEAD queries that return only counts.
  useEffect(() => {
    if (!clubId) return;
    const bump = () => setTick(t => t + 1);
    const channel = supabase
      .channel(`comms-unread:${clubId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'food_orders',         filter: `club_id=eq.${clubId}` }, bump)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pro_shop_inquiries',  filter: `club_id=eq.${clubId}` }, bump)
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
