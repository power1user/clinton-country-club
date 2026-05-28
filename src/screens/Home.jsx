import { Fragment } from 'react';
import { G } from '../theme.js';
import { useNav } from '../hooks/useNav.jsx';
import { useScrollRestore } from '../hooks/useScrollRestore.js';
import StatusPill from '../components/StatusPill.jsx';
import BellChip from '../components/BellChip.jsx';
import SponsorBanner from '../components/SponsorBanner.jsx';
import { useClubStatus, useEvents, useNews, usePaceOfPlay, useWeather, useNow, formatClockTime, formatLongDate } from '../hooks/useClubData.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useBrand } from '../hooks/useBrand.jsx';
import { guestCanSee } from '../lib/guestAccess.js';
import { getNewsActionLink } from '../lib/newsActionLinks.js';

// Today in YYYY-MM-DD (local). Same shape Events.jsx uses for
// matching against event.eventDate.
function isoToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function Home() {
  const { push, goTab } = useNav();
  const [scrollRef, onScroll] = useScrollRestore();
  const { isPending, pendingAccess, club, isGuest, guestAccessLevel } = useAuth();
  const brand = useBrand();
  const now = useNow();
  // v0.8.5: guest sub-section gating per the spec's allow/deny matrix.
  // News + Today's Events are full_temporary-only (not in read_only's
  // allow list). Members see everything as before.
  const newsVisible        = !isGuest || guestCanSee(guestAccessLevel, 'news');
  const todayEventsVisible = !isGuest || guestCanSee(guestAccessLevel, 'today_events');
  const { data: statusList } = useClubStatus();
  const { data: newsList }   = useNews();
  const { data: events }     = useEvents();
  const { data: pace }       = usePaceOfPlay();
  const { data: w }          = useWeather();
  const locationLabel = `${brand.prefix} CC, ${brand.state}`;
  const showPendingBanner = isPending && pendingAccess === 'read_only';
  // v0.7.9: Tagline fallback chain — brand.tagline (admin-set) →
  // club.name (always present) → empty (header still has the small
  // uppercase prefix). No more literal "Country Club" placeholder
  // text when a club hasn't set a tagline.
  const headerTitle = brand.tagline || club?.name || '';
  // v0.9.11: Home now shows the NEXT upcoming event (instead of
  // filtering to today-only). Past events never leak onto Home.
  // If a second event lands within the next 7 days, we surface it
  // as a small "Also this week" chip so same-week density isn't
  // hidden behind the more-events drill.
  const todayIso = isoToday();
  const upcomingEvents = events
    .filter(e => e.eventDate && String(e.eventDate).slice(0, 10) >= todayIso);
  const nextEvent = upcomingEvents[0];
  const sevenDaysOutIso = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const alsoThisWeek = upcomingEvents
    .slice(1, 2)
    .find(e => String(e.eventDate).slice(0, 10) <= sevenDaysOutIso);
  const catColors = { Golf: G.openBg, Social: G.brass, Dining: '#4A5A7A' };

  // Friendly "Today / Tomorrow / Sat May 30" relative label for the
  // next-event card. Avoids the cold ISO date when something's right
  // around the corner.
  const relativeEventDate = (eventDateStr) => {
    if (!eventDateStr) return '';
    const iso = String(eventDateStr).slice(0, 10);
    if (iso === todayIso) return 'Today';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowIso = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    if (iso === tomorrowIso) return 'Tomorrow';
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* iOS-style status bar */}
      <div style={{ height: 44, background: G.green, display: 'flex', alignItems: 'flex-end', padding: '0 20px 9px', flexShrink: 0 }}>
        <span style={{ color: '#A8D8B8', fontSize: 11, fontWeight: 500, fontFamily: '"Lora",serif' }}>{formatClockTime(now)}</span>
      </div>

      {/* Header */}
      <div style={{ background: G.green, padding: '4px 20px 14px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 9, color: '#A8D8B8', letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 2px' }}>{brand.prefix}</p>
            {headerTitle && (
              <h1 style={{ fontFamily: '"Playfair Display",serif', fontSize: 24, fontWeight: 700, color: '#F2EDE0', margin: 0, lineHeight: 1.1 }}>{headerTitle}</h1>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
            <BellChip />
            {/* v0.7.9: profile avatar gets aria-label + title for
                screen readers and tooltip-on-hover. Visual unchanged. */}
            <div
              onClick={() => goTab('myclub')}
              data-tap
              role="button"
              aria-label="Open My Club"
              title="Open My Club"
              style={{ width: 36, height: 36, borderRadius: '50%', border: '1.5px solid rgba(122,172,136,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#A8D8B8" strokeWidth="1.5">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </div>
          </div>
        </div>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: '#A8D8B8', margin: '6px 0 0' }}>{formatLongDate(now)}</p>
      </div>

      {showPendingBanner && (
        <div style={{ background: 'rgba(155,122,30,0.15)', borderBottom: `1px solid ${G.brass}`, padding: '10px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G.brass} strokeWidth="1.8" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4M12 16h.01"/>
          </svg>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.brass, margin: 0, lineHeight: 1.45, flex: 1 }}>
            Your membership is pending approval. You can browse, but ordering, RSVPs, posts, and messages unlock once {club?.name || 'the club'} confirms.
          </p>
        </div>
      )}

      {/* Status pills */}
      <div style={{ background: G.greenMid, padding: '12px 16px 14px', flexShrink: 0 }}>
        <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: '#5C9A70', letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 9px' }}>Today's Status</p>
        {/* Both rows use the same 6-column grid so the column boundaries line up
            and each row has identical total width. Top row: 3 pills × 2 cols.
            Bottom row: 2 pills × 3 cols. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {(() => {
            // v0.9.15: filter out facilities the manager has marked
            // inactive. Admin surfaces (Daily Status admin, Facility
            // Hours) still show all rows with an "off" indicator.
            const visiblePills = statusList.filter(p => p.active !== false);
            const row1 = visiblePills.slice(0, 3);
            const row2 = visiblePills.slice(3);
            return (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 5 }}>
                  {row1.map((s, i) => (
                    <div key={s.id} style={{ gridColumn: 'span 2', minWidth: 0 }}>
                      <StatusPill item={s} column={i} colCount={row1.length} />
                    </div>
                  ))}
                </div>
                {row2.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 5 }}>
                    {row2.map((s, i) => (
                      <div key={s.id} style={{ gridColumn: 'span 3', minWidth: 0 }}>
                        <StatusPill item={s} column={i} colCount={row2.length} large />
                      </div>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Scrollable body */}
      <div ref={scrollRef} onScroll={onScroll} style={{ flex: 1, overflowY: 'auto' }}>
        {/* Weather — v0.7.9 compacted. Temp 44→32, padding tightened,
            "Current Conditions" caption dropped (redundant), UV row
            omitted (free tier never had it). Forecast strip stays
            visible (no toggle) but the tiles got slightly tighter so
            the whole card eats less fold space. */}
        <div style={{ padding: '10px 20px 12px', borderBottom: `1px solid ${G.border}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 32, fontWeight: 700, color: G.text, lineHeight: 1 }}>{w.temp != null ? `${w.temp}°` : '—'}</span>
              <div>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, margin: 0 }}>{w.condition}</p>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, margin: '1px 0 0' }}>{locationLabel}</p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, margin: '0 0 1px' }}>H {w.high}° · L {w.low}°</p>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, margin: 0 }}>Wind {w.wind}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
            {(w.forecast || []).map((day, i) => (
              <div key={i} style={{ flex: 1, background: G.card, borderRadius: 3, padding: '5px 3px', textAlign: 'center' }}>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, margin: '0 0 2px' }}>{day.d}</p>
                <p style={{ fontSize: 12, margin: '0 0 2px', lineHeight: 1 }}>{day.c}</p>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.text, margin: 0, fontWeight: 500 }}>{day.t != null ? `${day.t}°` : '—'}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pace of play — only show if updated today (stale info is worse than no info) */}
        {(() => {
          if (!pace?.updated_at) return null;
          const updated = new Date(pace.updated_at);
          const today = new Date();
          const isToday = updated.toDateString() === today.toDateString();
          if (!isToday) return null;
          return (
            <div style={{ padding: '10px 20px', background: G.card, borderBottom: `1px solid ${G.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: pace.state === 'closed' ? G.clsDot : pace.state === 'limited' ? G.limDot : G.openDot, flexShrink: 0 }} />
              <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, flex: 1 }}>Pace of Play: <strong>{pace.time_label || '—'}</strong>{pace.message ? ` — ${pace.message}` : ''}</span>
              <span style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.muted }}>Updated {updated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
            </div>
          );
        })()}

        {/* v0.9.11: Home shows the NEXT upcoming event (large card
            with full details + RSVP CTA), with an optional "Also
            this week" chip below if a second event lands within 7
            days. Past events are filtered out entirely; the Home
            never shows yesterday's cookout.
            v0.8.5: also hidden from read_only guests (events are
            full_temporary-only). */}
        {todayEventsVisible && nextEvent && (
          <div style={{ padding: '14px 20px 6px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${G.border}` }}>
              <h2 style={{ fontFamily: '"Playfair Display",serif', fontSize: 18, fontWeight: 700, color: G.text, margin: 0 }}>Next Event</h2>
              <span style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted }}>at the club</span>
            </div>
            <div onClick={() => push('community/event', { event: nextEvent })} data-tap style={{ display: 'flex', gap: 12, padding: '14px 14px', background: G.card, borderRadius: 6, border: `1px solid ${G.border}`, cursor: 'pointer', alignItems: 'flex-start' }}>
              <div style={{ width: 56, height: 60, background: G.green, borderRadius: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 8, color: '#A8D8B8', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{nextEvent.dow}</span>
                <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 24, fontWeight: 700, color: '#F2EDE0', lineHeight: 1 }}>{nextEvent.day}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'white', background: catColors[nextEvent.cat] || G.muted, padding: '2px 7px', borderRadius: 2 }}>{nextEvent.cat}</span>
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.brass, fontWeight: 600 }}>{relativeEventDate(nextEvent.eventDate)}</span>
                  {nextEvent.spots === 0 && <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.clsDot }}>Full</span>}
                </div>
                <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 16, fontWeight: 700, color: G.text, margin: '0 0 3px', lineHeight: 1.25 }}>{nextEvent.title}</h3>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0 }}>{nextEvent.time}{nextEvent.price ? ` · ${nextEvent.price}` : ''}</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2" style={{ flexShrink: 0, marginTop: 4 }}><path d="M9 18l6-6-6-6" /></svg>
            </div>
            {alsoThisWeek && (
              <div onClick={() => push('community/event', { event: alsoThisWeek })} data-tap style={{ marginTop: 6, padding: '8px 12px', background: G.bg, border: `1px solid ${G.border}`, borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.muted }}>Also this week:</span>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.text, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alsoThisWeek.title}</span>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.brass, flexShrink: 0 }}>{relativeEventDate(alsoThisWeek.eventDate)}</span>
              </div>
            )}
          </div>
        )}

        {/* News — v0.8.5: hidden from read_only guests per the spec's
            full_temporary-only list. Members + full_temp guests see it. */}
        {newsVisible && (
        <div style={{ padding: '14px 20px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${G.border}` }}>
            <h2 style={{ fontFamily: '"Playfair Display",serif', fontSize: 18, fontWeight: 700, color: G.text, margin: 0 }}>Club News</h2>
            <span style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted }}>&amp; Announcements</span>
          </div>
          {newsList.map((item, i) => {
            // v0.10.4 — contextual action link per category. Renders
            // a subtle inline link below the body preview only when
            // the category has a mapping in newsActionLinks.js.
            // stopPropagation on the link keeps the card's own
            // onClick (navigate to detail) from firing when the
            // action is tapped.
            const action = getNewsActionLink(item.cat || item.category);
            return (
            <Fragment key={item.id}>
              <div
                onClick={() => push('home/news', { news: item })}
                data-tap
                style={{ paddingBottom: 14, marginBottom: 14, borderBottom: i < newsList.length - 1 ? `1px solid ${G.border}` : 'none', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <span style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.brass }}>{item.cat}</span>
                  <span style={{ width: 3, height: 3, borderRadius: '50%', background: G.border, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted }}>{item.date}</span>
                </div>
                <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 15, fontWeight: 700, color: G.text, margin: '0 0 5px', lineHeight: 1.3 }}>{item.head}</h3>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, lineHeight: 1.6, margin: 0 }}>{item.body.slice(0, 100)}…</p>
                {action && (
                  <span
                    onClick={(e) => { e.stopPropagation(); push(action.route); }}
                    data-tap
                    style={{
                      display: 'inline-block',
                      marginTop: 8,
                      fontFamily: '"Lora",serif',
                      fontSize: 11,
                      fontWeight: 600,
                      color: G.brass,
                      letterSpacing: '0.02em',
                      cursor: 'pointer',
                    }}
                  >
                    {action.label} →
                  </span>
                )}
              </div>
              {/* v0.10.2 — sponsor banner injection. Renders after the
                  2nd post (i === 1). If there are fewer than 2 posts,
                  injects after the last one (newsList.length - 1).
                  SponsorBanner returns null when there's no active
                  banner or the addon/flag is off, so the layout
                  collapses cleanly with no empty space. */}
              {(i === Math.min(1, newsList.length - 1)) && (
                <SponsorBanner location="home_feed" style={{ marginBottom: 14 }} />
              )}
            </Fragment>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}
