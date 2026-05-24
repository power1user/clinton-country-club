import { useState } from 'react';
import { G } from '../theme.js';
import { useNav } from '../hooks/useNav.jsx';
import { useScrollRestore } from '../hooks/useScrollRestore.js';
import { useFlag } from '../hooks/useFlag.js';
import BellChip from '../components/BellChip.jsx';
import { useEvents, useNow, formatClockTime } from '../hooks/useClubData.jsx';
import { useBrand } from '../hooks/useBrand.jsx';

export default function Events() {
  const { push } = useNav();
  const [scrollRef, onScroll] = useScrollRestore();
  const { data: events } = useEvents();
  const brand = useBrand();
  const now = useNow();
  const directoryOn = useFlag('member_directory');
  const [filter, setFilter] = useState('all');
  const filters = [{ id: 'all', l: 'All' }, { id: 'Golf', l: 'Golf' }, { id: 'Social', l: 'Social' }, { id: 'Dining', l: 'Dining' }];
  const shown = filter === 'all' ? events : events.filter(e => e.cat === filter);
  const catColors = { Golf: G.openBg, Social: G.brass, Dining: '#4A5A7A' };

  // Section nav cards — always show Bulletin + Partner; show Member
  // Directory only when the feature flag is on for this club. Each
  // card is a deep link into its own screen so members can browse
  // the relevant community surface without poking around for it.
  const sections = [
    { id: 'community/bulletin', label: 'Bulletin Board',   sub: 'Classifieds, wanted, general',  icon: <><path d="M3 6h18M3 12h18M3 18h18" strokeWidth="1.4" /></> },
    { id: 'golf/partners',      label: 'Golf Partners',    sub: 'Find foursomes, singles, cart shares', icon: <><circle cx="9" cy="7" r="3.5" strokeWidth="1.4" fill="none" /><circle cx="17" cy="7" r="3" strokeWidth="1.4" fill="none" /><path d="M2 20c0-3 3.4-5 7-5s7 2 7 5" strokeWidth="1.4" fill="none" /></> },
    ...(directoryOn ? [
      { id: 'member-directory', label: 'Member Directory', sub: 'Browse the roster · message members', icon: <><rect x="3" y="4" width="11" height="8" rx="1.5" strokeWidth="1.4" fill="none" /><path d="M6 8h5M6 6h5" strokeWidth="1.4" fill="none" /></> },
    ] : []),
  ];

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
          {/* Bulletin Board button removed from header — now a proper
              section card below alongside Partner Board and Directory.
              Just the Inbox bell remains. */}
          <BellChip />
        </div>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: '#A8D8B8', margin: '6px 0 0' }}>Events &amp; member channels</p>
      </div>
      <div style={{ display: 'flex', background: G.greenMid, flexShrink: 0, padding: '0 16px' }}>
        {filters.map(f => (
          <div key={f.id} onClick={() => setFilter(f.id)} data-tap style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: filter === f.id ? `2px solid ${G.brass}` : '2px solid transparent', marginBottom: -1 }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: filter === f.id ? '#F2EDE0' : '#A8D8B8', fontWeight: filter === f.id ? 600 : 400 }}>{f.l}</span>
          </div>
        ))}
      </div>
      <div ref={scrollRef} onScroll={onScroll} style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 24px' }}>
        {/* Section nav — opens whichever community surface the member
            wants. Renders dynamically: directory card only shows when
            the feature_flags.member_directory flag is on. */}
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

        {/* Events section heading + list */}
        <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '4px 0 8px', fontWeight: 700 }}>Upcoming Events</p>

        {shown.map(ev => (
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
