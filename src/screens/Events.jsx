import { useState } from 'react';
import { G } from '../theme.js';
import { useNav } from '../hooks/useNav.jsx';
import { useEvents, useNow, formatClockTime } from '../hooks/useClubData.jsx';
import { useBrand } from '../hooks/useBrand.jsx';

export default function Events() {
  const { push } = useNav();
  const { data: events } = useEvents();
  const brand = useBrand();
  const now = useNow();
  const [filter, setFilter] = useState('all');
  const filters = [{ id: 'all', l: 'All' }, { id: 'Golf', l: 'Golf' }, { id: 'Social', l: 'Social' }, { id: 'Dining', l: 'Dining' }];
  const shown = filter === 'all' ? events : events.filter(e => e.cat === filter);
  const catColors = { Golf: G.openBg, Social: G.brass, Dining: '#4A5A7A' };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0, display: 'flex', alignItems: 'flex-end', padding: '0 20px 9px' }}>
        <span style={{ color: '#7AAC88', fontSize: 11, fontFamily: '"Lora",serif' }}>{formatClockTime(now)}</span>
        <span style={{ marginLeft: 'auto', color: '#7AAC88', fontSize: 10, letterSpacing: 2 }}>●●●</span>
      </div>
      <div style={{ background: G.green, padding: '4px 20px 14px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 9, color: '#7AAC88', letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 1px' }}>{brand.prefix}</p>
            <h1 style={{ fontFamily: '"Playfair Display",serif', fontSize: 24, fontWeight: 700, color: '#F2EDE0', margin: 0, lineHeight: 1.1 }}>Community</h1>
          </div>
          <div onClick={() => push('community/bulletin')} data-tap style={{ padding: '7px 14px', border: '1px solid rgba(122,172,136,0.4)', borderRadius: 3, cursor: 'pointer' }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: '#A8D8B8' }}>Bulletin Board</span>
          </div>
        </div>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: '#7AAC88', margin: '6px 0 0' }}>Events &amp; Calendar</p>
      </div>
      <div style={{ display: 'flex', background: G.greenMid, flexShrink: 0, padding: '0 16px' }}>
        {filters.map(f => (
          <div key={f.id} onClick={() => setFilter(f.id)} data-tap style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: filter === f.id ? `2px solid ${G.brass}` : '2px solid transparent', marginBottom: -1 }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: filter === f.id ? '#F2EDE0' : '#7AAC88', fontWeight: filter === f.id ? 600 : 400 }}>{f.l}</span>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 24px' }}>
        {shown.map(ev => (
          <div key={ev.id} onClick={() => push('community/event', { event: ev })} data-tap style={{ display: 'flex', gap: 12, padding: '14px 14px', background: G.card, borderRadius: 4, marginBottom: 10, border: `1px solid ${G.border}`, cursor: 'pointer' }}>
            <div style={{ width: 48, height: 52, background: G.green, borderRadius: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 8, color: '#7AAC88', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{ev.dow}</span>
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
