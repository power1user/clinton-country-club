import { G } from '../theme.js';
import { useNav } from '../hooks/useNav.jsx';
import { useFlag } from '../hooks/useFlag.js';
import { SectionHead } from '../components/Headers.jsx';
import BellChip from '../components/BellChip.jsx';
import { usePaceOfPlay, useNow, formatClockTime, formatLongDate } from '../hooks/useClubData.jsx';
import { useBrand } from '../hooks/useBrand.jsx';

export default function GolfHub() {
  const { push } = useNav();
  const { data: paceRow } = usePaceOfPlay();
  const brand = useBrand();
  const now = useNow();
  const pace = paceRow?.time_label || '—';
  // Phase 7 flags — each tile + the live-pace strip filter independently.
  const pinOn      = useFlag('pin_placements');
  const mapOn      = useFlag('course_map');
  const teeOn      = useFlag('tee_time_booking');
  const partnersOn = useFlag('partner_board');
  const paceOn     = useFlag('pace_of_play');

  const features = [
    pinOn      && { id: 'pin',      title: 'Pin Placement', sub: `Daily maps · ${brand.holes} holes`, icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A8D8B8" strokeWidth="1.4"><circle cx="12" cy="10" r="3"/><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg> },
    mapOn      && { id: 'map',      title: 'Course Map',    sub: `Satellite · ${brand.holes} holes`,   icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A8D8B8" strokeWidth="1.4"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg> },
    teeOn      && { id: 'tee',      title: 'Book Tee Time', sub: 'Up to 7 days ahead',     icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A8D8B8" strokeWidth="1.4"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
    partnersOn && { id: 'partners', title: 'Golf Partners', sub: 'Find foursomes',         icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A8D8B8" strokeWidth="1.4"><circle cx="9" cy="7" r="4"/><circle cx="17" cy="7" r="4"/><path d="M1 20c0-3 3.6-5.5 8-5.5s8 2.5 8 5.5"/></svg> },
  ].filter(Boolean);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0, display: 'flex', alignItems: 'flex-end', padding: '0 20px 9px' }}>
        <span style={{ color: '#A8D8B8', fontSize: 11, fontFamily: '"Lora",serif' }}>{formatClockTime(now)}</span>
      </div>
      <div style={{ background: G.green, padding: '4px 20px 14px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 9, color: '#A8D8B8', letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 1px' }}>{brand.prefix}</p>
            <h1 style={{ fontFamily: '"Playfair Display",serif', fontSize: 24, fontWeight: 700, color: '#F2EDE0', margin: 0, lineHeight: 1.1 }}>Golf</h1>
          </div>
          <BellChip />
        </div>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: '#A8D8B8', margin: '6px 0 0' }}>{formatLongDate(now)}</p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '12px 20px', background: G.greenMid, display: 'flex', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: G.openDot, flexShrink: 0 }} />
            <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: '#D0E8D8', fontWeight: 500 }}>Course Open</span>
          </div>
          {/* Pace strip — Phase 7 flag, default ON */}
          {paceOn && (
            <>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.12)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: G.openDot, flexShrink: 0 }} />
                <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: '#D0E8D8' }}>Pace {pace} · On pace</span>
              </div>
            </>
          )}
        </div>

        <div style={{ padding: '16px 16px 8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {features.map(f => (
              <div key={f.id} onClick={() => push(`golf/${f.id}`)} data-tap style={{ background: G.green, borderRadius: 6, padding: '18px 16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', border: '1.5px solid rgba(122,172,136,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{f.icon}</div>
                <div>
                  <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 15, fontWeight: 700, color: '#F2EDE0', margin: '0 0 2px' }}>{f.title}</p>
                  <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: '#A8D8B8', margin: 0 }}>{f.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '14px 20px' }}>
          <SectionHead label="Course Conditions Today" />
          {[
            ['Course Status', 'Open · 6:30am – Dusk'],
            ['Cart Restrictions', 'Cart path only — Holes 3, 7 & 14'],
            ['Greens', 'Firm and fast — stimp 11'],
            ['Fairways', 'Excellent — recent mowing'],
            ['Rough', 'Moderate — 2½ inches'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${G.border}` }}>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted }}>{k}</span>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, textAlign: 'right', maxWidth: '55%' }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Tee-time preview list — Phase 7 flag (placeholder feature),
            hidden when tee_time_booking is off (the default). */}
        {teeOn && (
          <div style={{ padding: '0 20px 24px' }}>
            <SectionHead label="Next Available Tee Times" />
            {[
              { time: '3:30pm', spots: 2, holes: '18' },
              { time: '3:44pm', spots: 4, holes: '18' },
              { time: '4:02pm', spots: 1, holes: '9' },
            ].map(t => (
              <div key={t.time} onClick={() => push('golf/tee')} data-tap style={{ display: 'flex', alignItems: 'center', padding: '11px 14px', background: G.card, borderRadius: 4, marginBottom: 8, cursor: 'pointer', border: `1px solid ${G.border}` }}>
                <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 16, fontWeight: 700, color: G.text, flex: 1 }}>{t.time}</span>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, marginRight: 12 }}>{t.spots} spot{t.spots > 1 ? 's' : ''} · {t.holes} holes</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.brass} strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
