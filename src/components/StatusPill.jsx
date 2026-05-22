import { useState, useEffect, useRef } from 'react';
import { G, gCfg } from '../theme.js';
import { effectiveState, withinDailyHours, pickToday, useDusk } from '../hooks/useClubData.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { clubLocalParts, DEFAULT_TIMEZONE } from '../lib/timezone.js';

// Coordinated state — opening one pill closes any other that's open.
const PILL_OPEN_EVT = 'clinton:pill-open';

// "11am – 9pm" / "7am – Dusk (8:42pm)" / "Closed today" / "By appointment"
// Dusk is formatted in the club's local timezone so members in other tz
// still see "Dusk (8:42pm) at the club" rather than their own local time.
function formatTodayHours(day, dusk, timezone) {
  if (!day) return 'By appointment';
  if (day.is_closed) return 'Closed today';
  if (!day.opens_at) return 'By appointment';
  const open  = fmt12(day.opens_at);
  if (day.closes_at_dusk) {
    if (!dusk) return `${open} – Dusk`;
    const { minutesOfDay } = clubLocalParts(dusk, timezone);
    return `${open} – Dusk (${fmt12HM(Math.floor(minutesOfDay / 60), minutesOfDay % 60)})`;
  }
  if (day.closes_at) return `${open} – ${fmt12(day.closes_at)}`;
  return open;
}
function fmt12(t) {
  if (!t) return '';
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return t;
  return fmt12HM(parseInt(m[1], 10), parseInt(m[2], 10));
}
function fmt12HM(h, min) {
  const period = h >= 12 ? 'pm' : 'am';
  const h12 = ((h + 11) % 12) + 1;
  return min === 0 ? `${h12}${period}` : `${h12}:${String(min).padStart(2,'0')}${period}`;
}

export default function StatusPill({ item, column = 0, colCount = 3, large = false }) {
  const [open, setOpen] = useState(false);
  const [, setTick] = useState(0);              // re-render once a minute so auto-toggle updates live
  const wrapRef = useRef(null);
  const dusk = useDusk();
  const { club } = useAuth();
  const tz = club?.timezone || DEFAULT_TIMEZONE;
  const today = pickToday(item, new Date(), tz);
  // Effective (auto-toggled) state based on current time in the CLUB's
  // local timezone (not the browsing member's), today's hours, dusk.
  const effSt = effectiveState(item, new Date(), dusk, tz);
  const c = gCfg(effSt);

  // Tick every 60 seconds so the time-driven open/closed updates.
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Close on outside tap / Esc
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Close this pill when another opens
  useEffect(() => {
    const onOtherOpen = (e) => {
      if (e.detail !== item.id) setOpen(false);
    };
    document.addEventListener(PILL_OPEN_EVT, onOtherOpen);
    return () => document.removeEventListener(PILL_OPEN_EVT, onOtherOpen);
  }, [item.id]);

  const handleClick = (e) => {
    e.stopPropagation();
    if (open) { setOpen(false); return; }
    document.dispatchEvent(new CustomEvent(PILL_OPEN_EVT, { detail: item.id }));
    setOpen(true);
  };

  const isFirst = column === 0;
  const isLast  = column === colCount - 1;

  // Anchor side based on column so the popover stays on-screen no matter how
  // many pills are in the row (works for both 3-pill and 2-pill rows).
  const anchor =
    isFirst && !isLast ? { left: 0 } :
    isLast  && !isFirst ? { right: 0 } :
    isFirst && isLast  ? { left: 0 } :   // single-pill row
                          { left: '50%', transform: 'translateX(-50%)' };
  const arrowAnchor =
    isFirst && !isLast ? { left: 18 } :
    isLast  && !isFirst ? { right: 18 } :
    isFirst && isLast  ? { left: 18 } :
                          { left: '50%', marginLeft: -6 };

  // Hint about WHY it's closed (helps members & gives admin a clue)
  const isOutsideSchedule = today && withinDailyHours(today, new Date(), dusk, tz) === false;
  const isManualClosure   = item.st === 'closed' && (!today || withinDailyHours(today, new Date(), dusk, tz) === true);
  const hoursDisplay      = formatTodayHours(today, dusk, tz);

  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: 1 }}>
      {/* The pill itself — same height across all rows; the bottom row is wider
          via the grid span, not taller. */}
      <div
        onClick={handleClick}
        data-tap
        style={{
          background: c.bg,
          borderRadius: 3,
          padding: '10px',
          cursor: 'pointer',
          outline: open ? `1.5px solid ${c.dot}` : 'none',
          outlineOffset: open ? 1 : 0,
          transition: 'outline-color 0.15s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
          <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: '#E8E2D6', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: c.txt, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>{c.lbl}</span>
        </div>
      </div>

      {/* Popover */}
      {open && (
        <div
          role="dialog"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            width: 250,
            maxWidth: 'calc(100vw - 32px)',
            background: '#F8F4EC',
            borderRadius: 6,
            boxShadow: '0 14px 36px rgba(0,0,0,0.32), 0 3px 8px rgba(0,0,0,0.16)',
            padding: '12px 14px 13px',
            zIndex: 100,
            border: `1px solid ${G.border}`,
            ...anchor,
          }}
        >
          {/* Arrow */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: -6,
              width: 12,
              height: 12,
              background: '#F8F4EC',
              borderTop: `1px solid ${G.border}`,
              borderLeft: `1px solid ${G.border}`,
              transform: 'rotate(45deg)',
              ...arrowAnchor,
            }}
          />
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
            <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, flex: 1 }}>{item.label}</span>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 9.5, color: c.bg, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>{c.lbl}</span>
          </div>
          {hoursDisplay && (
            <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, lineHeight: 1.5, margin: '0 0 6px' }}>{hoursDisplay}</p>
          )}
          {/* Helpful context when the closure is time-based */}
          {effSt === 'closed' && isOutsideSchedule && !isManualClosure && (
            <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.muted, margin: '0 0 4px' }}>
              Outside scheduled hours.
            </p>
          )}
          {item.note && (
            <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11.5, color: G.muted, lineHeight: 1.55, margin: 0 }}>{item.note}</p>
          )}
        </div>
      )}
    </div>
  );
}
