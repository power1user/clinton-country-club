import { G } from '../theme.js';
import { useNav } from '../hooks/useNav.jsx';
import StatusPill from '../components/StatusPill.jsx';
import { useClubStatus, useNews, usePaceOfPlay, useWeather } from '../hooks/useClubData.jsx';
import { useBrand } from '../hooks/useBrand.jsx';

export default function Home() {
  const { push } = useNav();
  const brand = useBrand();
  const { data: statusList } = useClubStatus();
  const { data: newsList }   = useNews();
  const { data: pace }       = usePaceOfPlay();
  const { data: w }          = useWeather();
  const locationLabel = `${brand.prefix} CC, ${brand.state}`;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* iOS-style status bar */}
      <div style={{ height: 44, background: G.green, display: 'flex', alignItems: 'flex-end', padding: '0 20px 9px', flexShrink: 0 }}>
        <span style={{ color: '#7AAC88', fontSize: 11, fontWeight: 500, fontFamily: '"Lora",serif' }}>9:41 AM</span>
        <span style={{ marginLeft: 'auto', color: '#7AAC88', fontSize: 10, letterSpacing: 2 }}>●●●</span>
      </div>

      {/* Header */}
      <div style={{ background: G.green, padding: '4px 20px 14px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 9, color: '#7AAC88', letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 2px' }}>{brand.prefix}</p>
            <h1 style={{ fontFamily: '"Playfair Display",serif', fontSize: 24, fontWeight: 700, color: '#F2EDE0', margin: 0, lineHeight: 1.1 }}>{brand.tagline || 'Country Club'}</h1>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
            <div onClick={() => push('home/notifications')} data-tap style={{ position: 'relative', cursor: 'pointer', width: 36, height: 36, borderRadius: '50%', border: '1.5px solid rgba(122,172,136,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7AAC88" strokeWidth="1.5">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              <span style={{ position: 'absolute', top: 2, right: 2, width: 8, height: 8, borderRadius: '50%', background: G.brass, border: '1.5px solid #1B3A2D' }} />
            </div>
            <div style={{ width: 36, height: 36, borderRadius: '50%', border: '1.5px solid rgba(122,172,136,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#7AAC88" strokeWidth="1.5">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </div>
          </div>
        </div>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: '#7AAC88', margin: '6px 0 0' }}>Thursday, May 15, 2026</p>
      </div>

      {/* Status pills */}
      <div style={{ background: G.greenMid, padding: '12px 16px 14px', flexShrink: 0 }}>
        <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: '#5C9A70', letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 9px' }}>Today's Status</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', gap: 5 }}>{statusList.slice(0, 3).map(s => <StatusPill key={s.id} item={s} />)}</div>
          <div style={{ display: 'flex', gap: 5 }}>{statusList.slice(3, 6).map(s => <StatusPill key={s.id} item={s} />)}</div>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
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

        {/* Pace of play */}
        <div style={{ padding: '10px 20px', background: G.card, borderBottom: `1px solid ${G.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: pace?.state === 'closed' ? G.clsDot : pace?.state === 'limited' ? G.limDot : G.openDot, flexShrink: 0 }} />
          <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, flex: 1 }}>Pace of Play: <strong>{pace?.time_label || '—'}</strong>{pace?.message ? ` — ${pace.message}` : ''}</span>
          <span style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.muted }}>{pace?.updated_at ? `Updated ${new Date(pace.updated_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}</span>
        </div>

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
