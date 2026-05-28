// My Events — v0.10.3 (Phase 10).
//
// Personal RSVP history for the signed-in member. Two stacked
// sections:
//   · Upcoming — events on or after today where the member's
//     status is 'registered' or 'waitlist'. Sorted ascending so
//     the nearest event is at the top. Spots-remaining indicator
//     pulled per-event from events.spots minus current non-
//     cancelled registrations.
//   · Past — events whose date has passed. Includes cancelled
//     registrations (rendered muted). Defaults to the last 90
//     days; a "Show more" button loads further history.
//
// UI-only. No schema changes — reads from event_registrations
// joined to events, both already scoped by club_id + RLS.
//
// Realtime: subscribes to event_registrations filtered by
// member_id so admin-side changes (registered ↔ waitlist,
// cancellations) appear within seconds.
//
// Tapping any row navigates to community/event with the event
// row attached as nav state, matching how Home + the calendar
// open the same screen.

import { useEffect, useMemo, useState } from 'react';
import { G } from '../theme.js';
import { BackHeader } from '../components/Headers.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useNav } from '../hooks/useNav.jsx';
import { useScrollRestore } from '../hooks/useScrollRestore.js';
import { supabase, isConfigured } from '../lib/supabase.js';
import FeatureOff from '../components/FeatureOff.jsx';

const PAST_WINDOW_DAYS = 90; // initial slice; "Show more" expands

function isoToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatEventDate(eventDate) {
  if (!eventDate) return '';
  const iso = String(eventDate).slice(0, 10);
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function MyEvents() {
  const { member, isGuest } = useAuth();
  const { push } = useNav();
  const [scrollRef, onScroll] = useScrollRestore();

  const [rows, setRows] = useState([]);          // event_registrations joined to events
  const [counts, setCounts] = useState({});      // event_id → live registered count
  const [loading, setLoading] = useState(true);
  const [showAllPast, setShowAllPast] = useState(false);
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion(v => v + 1);

  useEffect(() => {
    if (!isConfigured || !member?.id) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Pull every registration for this member, with the embedded
      // event row. No date filter at the query layer — the screen
      // splits past vs upcoming in JS and the totals are small
      // (per-member, not per-club) so one query is fine.
      const { data: regs } = await supabase
        .from('event_registrations')
        .select('id, event_id, status, registered_at, guests_count, events ( id, title, category, event_date, event_time, event_time_start, event_time_end, spots, club_id )')
        .eq('member_id', member.id)
        .order('registered_at', { ascending: false });
      if (cancelled) return;
      const live = (regs || []).filter(r => r.events);
      setRows(live);

      // Live capacity counts — for each event we hold a registration
      // in, count the active (non-cancelled) registrations. Lets us
      // surface "Spots available: N / Filling up / Full" on every
      // upcoming row. One bulk query keyed by the set of event ids.
      const eventIds = [...new Set(live.map(r => r.event_id))];
      if (eventIds.length > 0) {
        const { data: allRegs } = await supabase
          .from('event_registrations')
          .select('event_id, status')
          .in('event_id', eventIds);
        const c = {};
        for (const r of (allRegs || [])) {
          if (r.status === 'cancelled') continue;
          c[r.event_id] = (c[r.event_id] || 0) + 1;
        }
        if (!cancelled) setCounts(c);
      }
      setLoading(false);
    })();

    // v0.10.3 — realtime on this member's registrations. Admin moves
    // a registration to waitlist, cancels it, or the member re-RSVPs
    // from another tab — the row updates here without a refresh.
    const channel = supabase
      .channel(`my_events:${member.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_registrations', filter: `member_id=eq.${member.id}` }, () => refresh())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [member?.id, version]);

  // Guards — guests don't have a member row and don't RSVP, so
  // this screen makes no sense for them.
  if (isGuest) {
    return <FeatureOff label="My Events" body="Event RSVPs are for club members. You're signed in as a guest." />;
  }
  if (!member) {
    return <FeatureOff label="My Events" body="Sign in as a member to see your RSVPs." />;
  }

  const todayIso = isoToday();
  const pastWindowIso = (() => {
    const d = new Date();
    d.setDate(d.getDate() - PAST_WINDOW_DAYS);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const { upcoming, pastRecent, pastOlder } = useMemo(() => {
    const u = []; const pr = []; const po = [];
    for (const r of rows) {
      if (!r.events?.event_date) continue;
      const eventIso = String(r.events.event_date).slice(0, 10);
      const isUpcoming = eventIso >= todayIso;
      const isCancelled = r.status === 'cancelled';
      if (isUpcoming && !isCancelled) {
        u.push(r);
      } else {
        // Past events OR cancelled registrations all go in Past
        if (eventIso >= pastWindowIso) pr.push(r);
        else po.push(r);
      }
    }
    // Upcoming: ascending (nearest first)
    u.sort((a, b) => String(a.events.event_date).localeCompare(String(b.events.event_date)));
    // Past: descending (most recent first)
    const sortPast = (a, b) => String(b.events.event_date).localeCompare(String(a.events.event_date));
    pr.sort(sortPast); po.sort(sortPast);
    return { upcoming: u, pastRecent: pr, pastOlder: po };
  }, [rows, todayIso, pastWindowIso]);

  const visiblePast = showAllPast ? [...pastRecent, ...pastOlder] : pastRecent;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader title="My Events" />

      <div ref={scrollRef} onScroll={onScroll} style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 28px' }}>
        {loading && (
          <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, padding: '32px 0', textAlign: 'center', margin: 0 }}>Loading…</p>
        )}

        {!loading && (
          <>
            <Section title={`Upcoming${upcoming.length > 0 ? ` (${upcoming.length})` : ''}`}>
              {upcoming.length === 0 ? (
                <EmptyCard
                  primary="You have no upcoming events."
                  secondary="Browse the calendar to find something."
                  ctaLabel="Open Calendar"
                  ctaAction={() => push('community/calendar')}
                />
              ) : (
                upcoming.map(r => (
                  <EventRow
                    key={r.id}
                    reg={r}
                    activeCount={counts[r.event_id] || 0}
                    onTap={() => push('community/event', { event: hydrateEventForNav(r.events) })}
                    surface="upcoming"
                  />
                ))
              )}
            </Section>

            <Section title={`Past${pastRecent.length + (showAllPast ? pastOlder.length : 0) > 0 ? ` (${visiblePast.length})` : ''}`}>
              {visiblePast.length === 0 ? (
                <EmptyCard primary="No past events yet." />
              ) : (
                visiblePast.map(r => (
                  <EventRow
                    key={r.id}
                    reg={r}
                    activeCount={counts[r.event_id] || 0}
                    onTap={() => push('community/event', { event: hydrateEventForNav(r.events) })}
                    surface="past"
                  />
                ))
              )}
              {!showAllPast && pastOlder.length > 0 && (
                <button
                  onClick={() => setShowAllPast(true)}
                  data-tap
                  type="button"
                  style={{
                    width: '100%',
                    marginTop: 8,
                    padding: '10px',
                    background: 'transparent',
                    border: `1px solid ${G.border}`,
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontFamily: '"Lora",serif',
                    fontSize: 12,
                    color: G.brass,
                    letterSpacing: '0.04em',
                  }}
                >
                  Show {pastOlder.length} older event{pastOlder.length === 1 ? '' : 's'}
                </button>
              )}
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

// Hydrate the embedded event row into the shape EventDetail
// expects via nav state. The Events hook on the calendar passes
// camelCase keys (e.g. eventDate); embedded selects return snake_
// case from PostgREST. Match the calendar's shape so EventDetail
// works identically whether you arrived via /community/event from
// here or from the calendar.
function hydrateEventForNav(e) {
  if (!e) return null;
  return {
    ...e,
    eventDate: e.event_date,
    eventTime: e.event_time,
    eventTimeStart: e.event_time_start,
    eventTimeEnd: e.event_time_end,
  };
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 11, color: G.muted, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
        {title}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {children}
      </div>
    </div>
  );
}

function EmptyCard({ primary, secondary, ctaLabel, ctaAction }) {
  return (
    <div style={{
      background: G.card, border: `1px solid ${G.border}`, borderRadius: 6,
      padding: '20px 18px', textAlign: 'center',
    }}>
      <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 14, color: G.muted, margin: '0 0 4px' }}>
        {primary}
      </p>
      {secondary && (
        <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, margin: '0 0 12px' }}>
          {secondary}
        </p>
      )}
      {ctaLabel && ctaAction && (
        <button
          onClick={ctaAction}
          data-tap
          type="button"
          style={{
            background: G.green, color: '#F2EDE0',
            border: 'none', borderRadius: 4,
            padding: '8px 16px', cursor: 'pointer',
            fontFamily: '"Lora",serif', fontSize: 12, fontWeight: 500,
          }}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}

function EventRow({ reg, activeCount, onTap, surface }) {
  const e = reg.events;
  const isCancelled = reg.status === 'cancelled';
  const isPast = surface === 'past';
  const muted = isCancelled || isPast;

  // Spots indicator. Hidden when:
  //   · event has no capacity set (events.spots <= 0)
  //   · the row is a past or cancelled registration (no point
  //     showing capacity for an event that already happened)
  let spotsLine = null;
  if (!isPast && !isCancelled && typeof e.spots === 'number' && e.spots > 0) {
    const remaining = Math.max(0, e.spots - activeCount);
    if (remaining === 0) spotsLine = { text: 'Full', tone: 'closed' };
    else if (remaining / e.spots <= 0.25) spotsLine = { text: 'Filling up', tone: 'warn' };
    else spotsLine = { text: `Spots available: ${remaining}`, tone: 'open' };
  }

  // Status chip styling. Green = registered, amber = waitlist, muted = cancelled.
  const statusChip = (() => {
    if (isCancelled) return { label: 'Cancelled', bg: 'transparent', color: G.muted, border: `1px solid ${G.border}` };
    if (reg.status === 'waitlist') return { label: 'Waitlisted', bg: 'rgba(232,184,64,0.12)', color: G.brass, border: `1px solid ${G.brass}` };
    return { label: 'Registered', bg: 'rgba(82,193,120,0.12)', color: G.openBg, border: `1px solid ${G.openBg}` };
  })();

  const time = e.event_time_start || e.event_time || null;

  return (
    <div
      onClick={onTap}
      data-tap
      style={{
        display: 'flex', flexDirection: 'column', gap: 6,
        background: G.card, border: `1px solid ${G.border}`, borderRadius: 6,
        padding: '12px 14px', cursor: 'pointer',
        opacity: muted ? 0.7 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 15, fontWeight: 700, color: G.text, margin: 0, lineHeight: 1.25, textDecoration: isCancelled ? 'line-through' : 'none' }}>
          {e.title}
        </p>
        <span style={{
          flexShrink: 0,
          fontFamily: '"Lora",serif', fontSize: 10, fontWeight: 600,
          padding: '3px 8px', borderRadius: 10,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          background: statusChip.bg, color: statusChip.color, border: statusChip.border,
        }}>{statusChip.label}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{
          fontFamily: '"Lora",serif', fontSize: 11, color: G.text,
          background: G.bg, border: `1px solid ${G.border}`,
          padding: '2px 8px', borderRadius: 3, fontWeight: 500,
        }}>
          {formatEventDate(e.event_date)}
        </span>
        {time && (
          <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted }}>· {String(time).slice(0, 5)}</span>
        )}
        {e.category && (
          <span style={{
            fontFamily: '"Lora",serif', fontSize: 10, color: G.brass,
            background: 'rgba(155,122,30,0.12)', padding: '2px 7px', borderRadius: 10,
            textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600,
          }}>{e.category}</span>
        )}
        {spotsLine && (
          <span style={{
            fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 10,
            color: spotsLine.tone === 'closed' ? G.clsBg : spotsLine.tone === 'warn' ? G.brass : G.muted,
            marginLeft: 'auto',
          }}>{spotsLine.text}</span>
        )}
      </div>
    </div>
  );
}
