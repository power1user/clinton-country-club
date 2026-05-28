// EventsCalendar — dedicated screen for the calendar grid + day-detail
// panel. v0.7.11 (Phase 7).
//
// Was previously the dominant content of the Community tab root
// (Events.jsx). Marc's UI feedback: "calendar dominates a community
// page — not good." Solution: pull it onto its own screen, make
// Community a clean hub of three selection cards (Bulletin / Directory
// / Calendar), each tapping into its own surface. This screen is what
// the Calendar card opens.
//
// Gated by events_calendar (Phase 7 feature flag, default ON). Hidden
// from the Community hub when off; direct nav lands on FeatureOff.
import { useState, useMemo, useEffect } from 'react';
import { G } from '../theme.js';
import { useNav } from '../hooks/useNav.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useScrollRestore } from '../hooks/useScrollRestore.js';
import { useFlag } from '../hooks/useFlag.js';
import { BackHeader } from '../components/Headers.jsx';
import Calendar from '../components/Calendar.jsx';
import { useEvents } from '../hooks/useClubData.jsx';
import { useUserPreference } from '../hooks/useUserPreference.js';
import { supabase, isConfigured } from '../lib/supabase.js';
import EventFilterPills from '../components/EventFilterPills.jsx';
import FeatureOff from '../components/FeatureOff.jsx';

// Format an override row into a human-readable hours line.
//   · is_closed → "Closed"
//   · members_only + hours → "Members only · 7am – Dusk"
//   · dawn/dusk in either bound → keyword instead of clock time
//   · otherwise → "7am – 5pm" via the existing fmt12 helpers
function fmt12HM(h, min) {
  const period = h >= 12 ? 'pm' : 'am';
  const h12 = ((h + 11) % 12) + 1;
  return min === 0 ? `${h12}${period}` : `${h12}:${String(min).padStart(2, '0')}${period}`;
}
function fmt12(t) {
  if (!t) return '';
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return t;
  return fmt12HM(parseInt(m[1], 10), parseInt(m[2], 10));
}
function formatOverrideHours(o) {
  if (o.is_closed) return 'Closed';
  const open = o.opens_at_dawn ? 'Dawn' : (o.opens_at ? fmt12(o.opens_at) : null);
  const close = o.closes_at_dusk ? 'Dusk' : (o.closes_at ? fmt12(o.closes_at) : null);
  const range = open && close ? `${open} – ${close}` : (open || close || null);
  const prefix = o.members_only ? 'Members only' : null;
  return [prefix, range].filter(Boolean).join(' · ') || 'Special hours';
}

function isoToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function EventsCalendar() {
  const { push } = useNav();
  const { club } = useAuth();
  const [scrollRef, onScroll] = useScrollRestore();
  const { data: events } = useEvents();
  const calendarOn = useFlag('events_calendar');
  const [selectedDate, setSelectedDate] = useState(isoToday);
  const catColors = { Golf: G.openBg, Social: G.brass, Dining: '#4A5A7A' };

  // v0.10.5 — Pull schedule_overrides so the grid can show "facility
  // note" rings on affected dates + the day-detail can surface what
  // the override actually says. Single query, no date filter — clubs
  // have a handful of overrides per year and the embedded facility
  // join is cheap. Realtime so a manager adding a holiday closure
  // shows up on members' calendars within seconds.
  const [overrides, setOverrides] = useState([]);
  useEffect(() => {
    if (!isConfigured || !club?.id) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from('schedule_overrides')
        .select('id, override_date, is_closed, opens_at, closes_at, closes_at_dusk, opens_at_dawn, members_only, reason, status_id, club_status ( id, label, club_facilities ( id, display_name ) )')
        .eq('club_id', club.id)
        .order('override_date', { ascending: true });
      if (!cancelled) setOverrides(data || []);
    };
    load();
    const channel = supabase
      .channel(`calendar_overrides:${club.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedule_overrides', filter: `club_id=eq.${club.id}` }, () => load())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [club?.id]);

  // Bucket overrides by ISO date for O(1) cell lookup + day-detail
  // resolution.
  const overridesByDay = useMemo(() => {
    const map = {};
    for (const o of overrides) {
      if (!o.override_date) continue;
      const key = String(o.override_date).slice(0, 10);
      (map[key] = map[key] || []).push(o);
    }
    return map;
  }, [overrides]);

  const dayOverrides = overridesByDay[selectedDate] || [];

  // v0.10.7 — Category filter pill state persisted per-member via
  // user_preferences. Pills sit above the Upcoming section and
  // filter the next-5 list; the calendar grid + day-detail still
  // show every event regardless (filtering the grid would hide
  // events from members who'd otherwise see them, which is
  // confusing). Default = empty array = no filter (the "All" pill).
  const [selectedCats, setSelectedCats] = useUserPreference('events_filter_categories', []);

  // v0.9.11: TWO sections now (vs. one fallback-style section before).
  //   · dayEvents — what's on the user-selected date. Empty when the
  //     user hasn't tapped a date with anything on it. Past dates are
  //     fine here — tapping May 25 shows what happened that day, even
  //     though it's behind us.
  //   · upcomingEvents — always the next 5 future events (event_date
  //     >= today), excluding anything we're already showing in the
  //     dayEvents section above so we don't double-render today's
  //     events when "today" is the selected date. v0.10.7: filtered
  //     by selectedCats when any pills are active.
  const { dayEvents, upcomingEvents } = useMemo(() => {
    const today = isoToday();
    const day = events.filter(e => String(e.eventDate || '').slice(0, 10) === selectedDate);
    const dayIds = new Set(day.map(e => e.id));
    const catSet = (selectedCats || []).length > 0 ? new Set(selectedCats) : null;
    const upcoming = events
      .filter(e => e.eventDate && String(e.eventDate).slice(0, 10) >= today)
      .filter(e => !dayIds.has(e.id))
      .filter(e => !catSet || catSet.has(e.cat || e.category))
      .slice(0, 5);
    return { dayEvents: day, upcomingEvents: upcoming };
  }, [events, selectedDate, selectedCats]);

  // "Sat, May 24" — for the section header above the day's events
  const selectedLabel = (() => {
    if (!selectedDate) return '';
    const [y, m, d] = selectedDate.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  })();

  if (!calendarOn) return <FeatureOff label="Events Calendar" />;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader title="Events Calendar" />

      <div ref={scrollRef} onScroll={onScroll} style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 28px' }}>
        <Calendar
          events={events}
          overridesByDay={overridesByDay}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />

        {/* Day-detail section — renders when the user-selected date
            has events OR overrides. Past dates render here too
            (tapping May 25 to see what happened is supported). When
            the selected date is empty, this section disappears and
            the Upcoming section below carries the page. */}
        {(dayEvents.length > 0 || dayOverrides.length > 0) && (
          <>
            <div style={{ margin: '24px 0 10px' }}>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.14em', textTransform: 'uppercase', margin: 0, fontWeight: 700 }}>
                {selectedLabel}
              </p>
            </div>
            {dayEvents.map(ev => (
              <div key={ev.id} onClick={() => push('community/event', { event: ev })} data-tap style={{ display: 'flex', gap: 12, padding: '14px 14px', background: G.card, borderRadius: 4, marginBottom: 10, border: `1px solid ${G.border}`, cursor: 'pointer' }}>
                <div style={{ width: 48, height: 52, background: G.green, borderRadius: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 8, color: '#A8D8B8', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{ev.dow}</span>
                  <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 22, fontWeight: 700, color: '#F2EDE0', lineHeight: 1 }}>{ev.day}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontFamily: '"Lora",serif', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'white', background: catColors[ev.cat] || G.muted, padding: '2px 7px', borderRadius: 2 }}>{ev.cat}</span>
                    {ev.spots === 0 && <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.clsDot }}>Full</span>}
                  </div>
                  <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 15, fontWeight: 700, color: G.text, margin: '0 0 3px', lineHeight: 1.2 }}>{ev.title}</h3>
                  <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0 }}>{ev.time} · {ev.price}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                </div>
              </div>
            ))}

            {/* v0.10.5 — Facility Notes section. Renders below the
                day's events when the selected date has schedule
                overrides. If the date has overrides but NO events,
                this section carries the day-detail by itself. */}
            {dayOverrides.length > 0 && (
              <>
                <div style={{ margin: dayEvents.length > 0 ? '18px 0 8px' : '4px 0 8px' }}>
                  <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.14em', textTransform: 'uppercase', margin: 0, fontWeight: 700 }}>
                    Facility Notes
                  </p>
                </div>
                {dayOverrides.map(o => {
                  const facilityName = o.club_status?.club_facilities?.display_name
                    || o.club_status?.label
                    || 'All facilities';
                  const stateLabel = o.is_closed ? 'Closed' : (o.members_only ? 'Members only' : 'Special hours');
                  const stateColor = o.is_closed ? G.clsBg : (o.members_only ? G.brass : G.openBg);
                  const hours = formatOverrideHours(o);
                  return (
                    <div key={o.id} style={{ display: 'flex', gap: 12, padding: '14px 14px', background: G.card, borderRadius: 4, marginBottom: 10, border: `1px solid ${G.border}` }}>
                      <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: stateColor, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: '"Lora",serif', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'white', background: stateColor, padding: '2px 7px', borderRadius: 2 }}>
                            {stateLabel}
                          </span>
                          <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 13, fontWeight: 700, color: G.text }}>
                            {facilityName}
                          </span>
                        </div>
                        {!o.is_closed && (
                          <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, margin: '0 0 3px' }}>{hours}</p>
                        )}
                        {o.reason && (
                          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.muted, margin: 0, lineHeight: 1.5 }}>{o.reason}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}

        {/* Always-on Upcoming section — next 5 future events with a
            "See all upcoming" link to the paginated/searchable list.
            v0.9.11. Past events never leak here. Excludes anything
            already shown in the day-detail section above.
            v0.10.7: Category filter pills above the section. */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: dayEvents.length > 0 ? '20px 0 10px' : '24px 0 10px' }}>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.14em', textTransform: 'uppercase', margin: 0, fontWeight: 700 }}>
            Upcoming
          </p>
          {dayEvents.length === 0 && selectedDate && (
            <span style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 10, color: G.muted }}>
              Nothing on {selectedLabel}
            </span>
          )}
        </div>

        <EventFilterPills
          events={events}
          selectedCategories={selectedCats}
          onChange={setSelectedCats}
        />

        {upcomingEvents.length === 0 && (
          <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: 20, textAlign: 'center' }}>
            <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>
              {dayEvents.length > 0
                ? 'Nothing else coming up after this — check back soon.'
                : 'No upcoming events scheduled. Check back soon.'}
            </p>
          </div>
        )}

        {upcomingEvents.map(ev => (
          <div key={ev.id} onClick={() => push('community/event', { event: ev })} data-tap style={{ display: 'flex', gap: 12, padding: '14px 14px', background: G.card, borderRadius: 4, marginBottom: 10, border: `1px solid ${G.border}`, cursor: 'pointer' }}>
            <div style={{ width: 48, height: 52, background: G.green, borderRadius: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 8, color: '#A8D8B8', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{ev.dow}</span>
              <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 22, fontWeight: 700, color: '#F2EDE0', lineHeight: 1 }}>{ev.day}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'white', background: catColors[ev.cat] || G.muted, padding: '2px 7px', borderRadius: 2 }}>{ev.cat}</span>
                {ev.spots === 0 && <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.clsDot }}>Full</span>}
              </div>
              <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 15, fontWeight: 700, color: G.text, margin: '0 0 3px', lineHeight: 1.2 }}>{ev.title}</h3>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0 }}>{ev.time} · {ev.price}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
            </div>
          </div>
        ))}

        {/* "See all upcoming →" — drill into paginated, searchable
            full future-events list. */}
        <div onClick={() => push('community/upcoming')} data-tap style={{ marginTop: 8, padding: '12px 14px', background: G.bg, border: `1px solid ${G.border}`, borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G.brass} strokeWidth="1.8"><rect x="3" y="5" width="18" height="16" rx="1.5" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, flex: 1 }}>See all upcoming events</span>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.brass }}>Search →</span>
        </div>
      </div>
    </div>
  );
}
