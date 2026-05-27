// EventsUpcoming — paginated list of every future event, with live
// search. v0.9.11. Reached via "See all upcoming →" link below the
// Events Calendar; also a candidate for a direct nav from anywhere
// that lists "next 5 events" and wants a drill-deeper.
//
// Past events are NEVER shown here — this surface is explicitly
// "what's coming up." For history, members tap a past date in the
// EventsCalendar grid.
//
// Pagination: 10 per page (Marc's request). prev/next buttons; page
// number indicator. Live search filters by title + category +
// relative-date string. Search resets to page 1.
//
// Gated by events_calendar flag (same gate as the calendar screen)
// so a club that's turned off calendar doesn't have a back-door
// upcoming list still surfacing events.
import { useMemo, useState } from 'react';
import { G } from '../theme.js';
import { useNav } from '../hooks/useNav.jsx';
import { useScrollRestore } from '../hooks/useScrollRestore.js';
import { useFlag } from '../hooks/useFlag.js';
import { BackHeader } from '../components/Headers.jsx';
import { useEvents } from '../hooks/useClubData.jsx';
import FeatureOff from '../components/FeatureOff.jsx';

const PAGE_SIZE = 10;

function isoToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function EventsUpcoming() {
  const { push } = useNav();
  const [scrollRef, onScroll] = useScrollRestore();
  const calendarOn = useFlag('events_calendar');
  const { data: events, loading } = useEvents();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const catColors = { Golf: G.openBg, Social: G.brass, Dining: '#4A5A7A' };

  // Filter: upcoming (event_date >= today) + matches search query.
  // Sort chronologically. Search matches title, category, time, and
  // the date-label string so members can type "May 30" or "Cookout"
  // or "Golf" and find what they're looking for.
  const matches = useMemo(() => {
    const today = isoToday();
    const q = query.trim().toLowerCase();
    return events
      .filter(e => e.eventDate && String(e.eventDate).slice(0, 10) >= today)
      .filter(e => {
        if (!q) return true;
        const hay = [
          e.title || '',
          e.cat || '',
          e.time || '',
          e.date || '',
          String(e.eventDate || ''),
        ].join(' ').toLowerCase();
        return hay.includes(q);
      });
  }, [events, query]);

  const pageCount = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = matches.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  // Any search change resets to page 0 so users don't get stuck on
  // an empty page 7 after typing a query with 4 results.
  const onSearch = (v) => { setQuery(v); setPage(0); };

  if (!calendarOn) return <FeatureOff label="Events" />;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader title="All Upcoming Events" />

      <div ref={scrollRef} onScroll={onScroll} style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 28px' }}>
        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="1.8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            value={query}
            onChange={e => onSearch(e.target.value)}
            placeholder="Search future events — title, category, date…"
            style={{ width: '100%', padding: '10px 14px 10px 36px', border: `1px solid ${G.border}`, borderRadius: 6, fontFamily: '"Lora",serif', fontSize: 13, color: G.text, background: '#F8F4EC', outline: 'none', boxSizing: 'border-box' }}
          />
          {query && (
            <div onClick={() => onSearch('')} data-tap style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', padding: 4 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </div>
          )}
        </div>

        {/* Result count + page indicator */}
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.muted, margin: '0 0 10px', textAlign: 'center' }}>
          {loading
            ? 'Loading…'
            : matches.length === 0
              ? (query ? `No upcoming events match "${query}"` : 'No upcoming events scheduled.')
              : `${matches.length} upcoming event${matches.length === 1 ? '' : 's'}${pageCount > 1 ? ` · page ${safePage + 1} of ${pageCount}` : ''}`}
        </p>

        {/* Event list — same card shape the Calendar uses */}
        {pageRows.map(ev => (
          <div key={ev.id} onClick={() => push('community/event', { event: ev })} data-tap style={{ display: 'flex', gap: 12, padding: '14px 14px', background: G.card, borderRadius: 4, marginBottom: 10, border: `1px solid ${G.border}`, cursor: 'pointer' }}>
            <div style={{ width: 48, height: 52, background: G.green, borderRadius: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 8, color: '#A8D8B8', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{ev.dow}</span>
              <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 22, fontWeight: 700, color: '#F2EDE0', lineHeight: 1 }}>{ev.day}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'white', background: catColors[ev.cat] || G.muted, padding: '2px 7px', borderRadius: 2 }}>{ev.cat}</span>
                {ev.spots === 0 && <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.clsDot }}>Full</span>}
              </div>
              <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 15, fontWeight: 700, color: G.text, margin: '0 0 3px', lineHeight: 1.2 }}>{ev.title}</h3>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0 }}>{ev.time}{ev.price ? ` · ${ev.price}` : ''}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
            </div>
          </div>
        ))}

        {/* Pagination — only when there's more than one page */}
        {pageCount > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16 }}>
            <div
              onClick={safePage > 0 ? () => setPage(p => Math.max(0, p - 1)) : undefined}
              data-tap
              style={{
                padding: '8px 14px',
                background: safePage > 0 ? G.card : G.bg,
                border: `1px solid ${G.border}`,
                borderRadius: 3,
                cursor: safePage > 0 ? 'pointer' : 'default',
                opacity: safePage > 0 ? 1 : 0.4,
              }}
            >
              <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text }}>← Prev</span>
            </div>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, minWidth: 70, textAlign: 'center' }}>
              {safePage + 1} / {pageCount}
            </span>
            <div
              onClick={safePage < pageCount - 1 ? () => setPage(p => Math.min(pageCount - 1, p + 1)) : undefined}
              data-tap
              style={{
                padding: '8px 14px',
                background: safePage < pageCount - 1 ? G.card : G.bg,
                border: `1px solid ${G.border}`,
                borderRadius: 3,
                cursor: safePage < pageCount - 1 ? 'pointer' : 'default',
                opacity: safePage < pageCount - 1 ? 1 : 0.4,
              }}
            >
              <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text }}>Next →</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
