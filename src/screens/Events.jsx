// Community tab (member-facing). v0.6.0 reorg:
//   · Calendar is now the primary events surface (was a flat list)
//   · Below the calendar: events for the selected day, with "today's
//     events" as the default selection
//   · Section nav (Bulletin Board + Member Directory if flag) stays
//     at the top — those aren't event-related
//
// Naming is a bit unfortunate — this file is still called Events.jsx
// because it's the tab root the SCREENS map points at as
// `community: Events`. Renaming would touch routing in App.jsx and
// scroll-restore keys for marginal benefit, so leaving for now.
import { useState, useMemo } from 'react';
import { G } from '../theme.js';
import { useNav } from '../hooks/useNav.jsx';
import { useScrollRestore } from '../hooks/useScrollRestore.js';
import { useFlag } from '../hooks/useFlag.js';
import BellChip from '../components/BellChip.jsx';
import Calendar from '../components/Calendar.jsx';
import { useEvents, useNow, formatClockTime } from '../hooks/useClubData.jsx';
import { useBrand } from '../hooks/useBrand.jsx';

function isoToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function Events() {
  const { push } = useNav();
  const [scrollRef, onScroll] = useScrollRestore();
  const { data: events } = useEvents();
  const brand = useBrand();
  const now = useNow();
  const directoryOn = useFlag('member_directory');
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

  const sections = [
    { id: 'community/bulletin', label: 'Bulletin Board',   sub: 'Classifieds, wanted, general',  icon: <><path d="M3 6h18M3 12h18M3 18h18" strokeWidth="1.4" /></> },
    ...(directoryOn ? [
      { id: 'member-directory', label: 'Member Directory', sub: 'Browse the roster · message members', icon: <><rect x="3" y="4" width="11" height="8" rx="1.5" strokeWidth="1.4" fill="none" /><path d="M6 8h5M6 6h5" strokeWidth="1.4" fill="none" /></> },
    ] : []),
  ];

  // "Sat, May 24" — for the section header above the day's events
  const selectedLabel = (() => {
    if (!selectedDate) return '';
    const [y, m, d] = selectedDate.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  })();

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0, display: 'flex', alignItems: 'flex-end', padding: '0 20px 9px' }}>
        <span style={{ color: '#A8D8B8', fontSize: 11, fontFamily: '"Lora",serif' }}>{formatClockTime(now)}</span>
      </div>
      <div style={{ background: G.green, padding: '4px 20px 14px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 9, color: '#A8D8B8', letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 1px' }}>{brand.prefix}</p>
            <h1 style={{ fontFamily: '"Playfair Display",serif', fontSize: 24, fontWeight: 700, color: '#F2EDE0', margin: 0, lineHeight: 1.1 }}>Community</h1>
          </div>
          <BellChip />
        </div>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: '#A8D8B8', margin: '6px 0 0' }}>Events &amp; member channels</p>
      </div>

      <div ref={scrollRef} onScroll={onScroll} style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 24px' }}>
        {/* Section nav — Bulletin / Directory (when flag on) */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, overflowX: 'auto', paddingBottom: 2 }}>
          {sections.map(s => (
            <div
              key={s.id}
              onClick={() => push(s.id)}
              data-tap
              style={{
                flex: '0 0 auto',
                minWidth: 140,
                padding: '12px 14px',
                background: G.card,
                borderRadius: 4,
                border: `1px solid ${G.border}`,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 4, background: G.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A8D8B8" strokeLinecap="round" strokeLinejoin="round">{s.icon}</svg>
              </div>
              <div>
                <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 13, fontWeight: 700, color: G.text, margin: 0, lineHeight: 1.2 }}>{s.label}</p>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, margin: '2px 0 0', lineHeight: 1.3 }}>{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Calendar — month grid. Dots on days with events; tap a day
            to filter the list below. */}
        <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '4px 0 8px', fontWeight: 700 }}>Events Calendar</p>
        <Calendar
          events={events}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />

        {/* Day detail — events on the tapped date. Falls back to
            "next up" when the selected day is empty, so the panel
            never looks broken on a sparse month. */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '18px 0 8px' }}>
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
          <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: 18, textAlign: 'center' }}>
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
