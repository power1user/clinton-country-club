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
import { useState, useMemo } from 'react';
import { G } from '../theme.js';
import { useNav } from '../hooks/useNav.jsx';
import { useScrollRestore } from '../hooks/useScrollRestore.js';
import { useFlag } from '../hooks/useFlag.js';
import { BackHeader } from '../components/Headers.jsx';
import Calendar from '../components/Calendar.jsx';
import { useEvents } from '../hooks/useClubData.jsx';
import FeatureOff from '../components/FeatureOff.jsx';

function isoToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function EventsCalendar() {
  const { push } = useNav();
  const [scrollRef, onScroll] = useScrollRestore();
  const { data: events } = useEvents();
  const calendarOn = useFlag('events_calendar');
  const [selectedDate, setSelectedDate] = useState(isoToday);
  const catColors = { Golf: G.openBg, Social: G.brass, Dining: '#4A5A7A' };

  // Events on the selected day, in time order. If selectedDate has
  // no events, fall back to "upcoming" — next 30 days, chronological.
  const { dayEvents, fallback } = useMemo(() => {
    const same = events.filter(e => String(e.eventDate || '').slice(0, 10) === selectedDate);
    if (same.length) return { dayEvents: same, fallback: false };
    const today = isoToday();
    const upcoming = events
      .filter(e => e.eventDate && String(e.eventDate).slice(0, 10) >= today)
      .slice(0, 5);
    return { dayEvents: upcoming, fallback: true };
  }, [events, selectedDate]);

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
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />

        {/* Day detail — 24px breathing room between calendar + this
            section per v0.7.11 audit feedback. Falls back to "next
            up" when the selected day is empty so the panel never
            looks broken on a sparse month. */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '24px 0 10px' }}>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.14em', textTransform: 'uppercase', margin: 0, fontWeight: 700 }}>
            {fallback ? 'Next Up' : selectedLabel}
          </p>
          {fallback && selectedDate && (
            <span style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 10, color: G.muted }}>
              Nothing on {selectedLabel}
            </span>
          )}
        </div>

        {dayEvents.length === 0 && (
          <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: 20, textAlign: 'center' }}>
            <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>
              No upcoming events scheduled. Check back soon.
            </p>
          </div>
        )}

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
      </div>
    </div>
  );
}
