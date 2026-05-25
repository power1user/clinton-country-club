// Calendar — month grid for events. Standard 7-col layout, 5–6 rows.
//
// Props:
//   events       — array of objects with at least { id, eventDate }
//                  (eventDate is an ISO yyyy-mm-dd string from useEvents)
//   selectedDate — ISO yyyy-mm-dd, optional. The cell highlighted as
//                  "selected" + the bucket the parent uses to show
//                  detail underneath the grid.
//   onSelectDate — (iso) => void. Called when a member taps a day.
//                  Pass null to clear selection.
//
// Visuals:
//   · Days from prev/next month are dimmed so the grid stays a clean
//     7×5/6 rectangle.
//   · Today gets a brass ring.
//   · Days with events get a small dot under the number (max 3 dots
//     shown; "+N more" implied since the parent shows the list).
//   · Selected cell gets a filled green background.
//   · Month header with ‹ Mon YYYY › navigation + a Today shortcut
//     that snaps back to the current month and selects today.
import { useMemo, useState } from 'react';
import { G } from '../theme.js';

// Format ISO YYYY-MM-DD without timezone shifts (avoids the classic
// "midnight UTC subtracts an hour and shows yesterday" trap).
function isoDay(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAY_NAMES = ['S','M','T','W','T','F','S'];

export default function Calendar({ events = [], selectedDate, onSelectDate }) {
  // viewMonth is just a Date inside the displayed month — never use
  // its day-of-month for anything but display. Independent of selectedDate
  // so navigating past today doesn't clear the selection.
  const [viewMonth, setViewMonth] = useState(() => {
    if (selectedDate) {
      const [y, m] = selectedDate.split('-').map(Number);
      return new Date(y, m - 1, 1);
    }
    return new Date();
  });

  const todayIso = isoDay(new Date());

  // Bucket events by ISO date for O(1) lookup in the cell loop.
  const eventsByDay = useMemo(() => {
    const map = {};
    for (const ev of events) {
      if (!ev.eventDate) continue;
      const key = String(ev.eventDate).slice(0, 10);   // 'YYYY-MM-DD'
      (map[key] = map[key] || []).push(ev);
    }
    return map;
  }, [events]);

  // Build the 6-row grid: start on the Sunday before the 1st of the
  // displayed month, walk 42 days forward.
  const cells = useMemo(() => {
    const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const startOfGrid = new Date(first);
    startOfGrid.setDate(first.getDate() - first.getDay());  // back to Sunday
    const out = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(startOfGrid);
      d.setDate(startOfGrid.getDate() + i);
      out.push({
        date: d,
        iso: isoDay(d),
        inMonth: d.getMonth() === viewMonth.getMonth(),
      });
    }
    return out;
  }, [viewMonth]);

  const monthLabel = `${MONTH_NAMES[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`;

  const stepMonth = (delta) => {
    setViewMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const jumpToday = () => {
    const now = new Date();
    setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    onSelectDate?.(isoDay(now));
  };

  return (
    <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: '10px 10px 8px' }}>
      {/* Header — month name + nav arrows + Today shortcut */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div onClick={() => stepMonth(-1)} data-tap style={{ padding: '4px 8px', cursor: 'pointer', borderRadius: 3 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.text} strokeWidth="2.2"><path d="M15 18l-6-6 6-6" /></svg>
        </div>
        <p style={{ flex: 1, textAlign: 'center', fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: 0 }}>
          {monthLabel}
        </p>
        <div onClick={jumpToday} data-tap style={{ padding: '4px 8px', cursor: 'pointer' }}>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.brass, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>Today</span>
        </div>
        <div onClick={() => stepMonth(1)} data-tap style={{ padding: '4px 8px', cursor: 'pointer', borderRadius: 3 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.text} strokeWidth="2.2"><path d="M9 18l6-6-6-6" /></svg>
        </div>
      </div>

      {/* Weekday header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {WEEKDAY_NAMES.map((w, i) => (
          <div key={i} style={{ textAlign: 'center', fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '4px 0' }}>{w}</div>
        ))}
      </div>

      {/* The 42-cell grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map(c => {
          const isToday = c.iso === todayIso;
          const isSelected = c.iso === selectedDate;
          const cellEvents = eventsByDay[c.iso] || [];
          const dot = cellEvents.length > 0;
          return (
            <div
              key={c.iso}
              onClick={() => onSelectDate?.(c.iso)}
              data-tap
              style={{
                position: 'relative',
                aspectRatio: '1 / 1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                borderRadius: 4,
                background: isSelected ? G.green : 'transparent',
                outline: isToday && !isSelected ? `1.5px solid ${G.brass}` : 'none',
                outlineOffset: -2,
                opacity: c.inMonth ? 1 : 0.35,
              }}
            >
              <span style={{
                fontFamily: '"Lora",serif',
                fontSize: 12,
                color: isSelected ? '#F2EDE0' : G.text,
                fontWeight: isToday || isSelected ? 700 : 400,
                lineHeight: 1,
              }}>
                {c.date.getDate()}
              </span>
              {dot && (
                <span style={{
                  position: 'absolute',
                  bottom: 3,
                  width: 4, height: 4, borderRadius: '50%',
                  background: isSelected ? G.brassLt : G.brass,
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
