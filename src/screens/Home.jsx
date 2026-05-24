import { G } from '../theme.js';
import { useNav } from '../hooks/useNav.jsx';
import { useScrollRestore } from '../hooks/useScrollRestore.js';
import StatusPill from '../components/StatusPill.jsx';
import BellChip from '../components/BellChip.jsx';
import { useClubStatus, useNews, usePaceOfPlay, useWeather, useNow, formatClockTime, formatLongDate } from '../hooks/useClubData.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useBrand } from '../hooks/useBrand.jsx';

export default function Home() {
  const { push, goTab } = useNav();
  const [scrollRef, onScroll] = useScrollRestore();
  const { isPending, pendingAccess, club } = useAuth();
  const brand = useBrand();
  const now = useNow();
  const { data: statusList } = useClubStatus();
  const { data: newsList }   = useNews();
  const { data: pace }       = usePaceOfPlay();
  const { data: w }          = useWeather();
  const locationLabel = `${brand.prefix} CC, ${brand.state}`;
  const showPendingBanner = isPending && pendingAccess === 'read_only';

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
            <h1 style={{ fontFamily: '"Playfair Display",serif', fontSize: 24, fontWeight: 700, color: '#F2EDE0', margin: 0, lineHeight: 1.1 }}>{brand.tagline || 'Country Club'}</h1>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
            <BellChip />
            <div onClick={() => goTab('myclub')} data-tap style={{ width: 36, height: 36, borderRadius: '50%', border: '1.5px solid rgba(122,172,136,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
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
            const row1 = statusList.slice(0, 3);
            const row2 = statusList.slice(3);
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
        {/* Weather */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${G.border}` }}>
          <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 11, color: G.brass, margin: '0 0 6px' }}>Current Conditions</p>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 44, fontWeight: 700, color: G.text, lineHeight: 1 }}>{w.temp}°</span>
              <div>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, margin: '0 0 2px' }}>{w.condition}</p>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0 }}>{locationLabel}</p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '0 0 2px' }}>H {w.high}° / L {w.low}°</p>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '0 0 2px' }}>Wind {w.wind}</p>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0 }}>UV Index {w.uv} · Moderate</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            {(w.forecast || []).map((day, i) => (
              <div key={i} style={{ flex: 1, background: G.card, borderRadius: 4, padding: '7px 4px', textAlign: 'center' }}>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, margin: '0 0 3px' }}>{day.d}</p>
                <p style={{ fontSize: 14, margin: '0 0 3px', lineHeight: 1 }}>{day.c}</p>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.text, margin: 0, fontWeight: 500 }}>{day.t != null ? `${day.t}°` : '—'}</p>
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

        {/* News */}
        <div style={{ padding: '14px 20px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${G.border}` }}>
            <h2 style={{ fontFamily: '"Playfair Display",serif', fontSize: 18, fontWeight: 700, color: G.text, margin: 0 }}>Club News</h2>
            <span style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted }}>&amp; Announcements</span>
          </div>
          {newsList.map((item, i) => (
            <div
              key={item.id}
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
