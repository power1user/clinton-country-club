import { useState } from 'react';
import { G } from '../theme.js';
import { BackHeader, SectionHead } from '../components/Headers.jsx';
import { Brass } from '../components/Buttons.jsx';

const TEE_SLOTS = {
  'Thu May 15': [{ t: '3:30pm', s: 2 }, { t: '3:44pm', s: 4 }, { t: '4:02pm', s: 1 }, { t: '4:16pm', s: 3 }],
  'Fri May 16': [{ t: '7:00am', s: 4 }, { t: '7:14am', s: 2 }, { t: '7:28am', s: 3 }, { t: '8:00am', s: 4 }, { t: '1:30pm', s: 2 }],
  'Sat May 17': [{ t: '7:30am', s: 0 }, { t: '7:44am', s: 0 }, { t: '10:00am', s: 2 }, { t: '10:14am', s: 4 }],
  'Sun May 18': [{ t: '8:00am', s: 3 }, { t: '8:14am', s: 4 }, { t: '9:00am', s: 0 }, { t: '2:00pm', s: 4 }],
};

export default function TeeTime() {
  const [day, setDay] = useState('Thu May 15');
  const [players, setPlayers] = useState(2);
  const [selected, setSelected] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const days = Object.keys(TEE_SLOTS);
  const slots = TEE_SLOTS[day] || [];

  if (confirmed) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
        <BackHeader title="Book a Tee Time" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: G.openBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={G.openDot} strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
          </div>
          <h2 style={{ fontFamily: '"Playfair Display",serif', fontSize: 22, fontWeight: 700, color: G.text, margin: '0 0 8px' }}>Tee Time Confirmed</h2>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 15, color: G.muted, margin: '0 0 4px' }}>{day} at {selected?.t}</p>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.muted, margin: '0 0 28px' }}>{players} player{players > 1 ? 's' : ''} · 18 holes</p>
          <Brass onPress={() => setConfirmed(false)}>Book Another</Brass>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader title="Book a Tee Time" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 24px' }}>
        <div style={{ marginBottom: 16 }}>
          <SectionHead label="Select a Date" />
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {days.map(d => (
              <div key={d} onClick={() => { setDay(d); setSelected(null); }} data-tap style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 3, background: day === d ? G.green : G.card, border: `1px solid ${day === d ? G.green : G.border}`, cursor: 'pointer' }}>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: day === d ? '#F2EDE0' : G.text, fontWeight: day === d ? 600 : 400 }}>{d}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <SectionHead label="Number of Players" />
          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 2, 3, 4].map(n => (
              <div key={n} onClick={() => setPlayers(n)} data-tap style={{ flex: 1, padding: '10px 0', textAlign: 'center', borderRadius: 3, background: players === n ? G.green : G.card, border: `1px solid ${players === n ? G.green : G.border}`, cursor: 'pointer' }}>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 14, color: players === n ? '#F2EDE0' : G.text, fontWeight: players === n ? 600 : 400 }}>{n}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <SectionHead label="Available Times" />
          {slots.map(slot => (
            <div key={slot.t} onClick={() => slot.s > 0 && setSelected(slot)} data-tap style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', background: selected?.t === slot.t ? G.green : G.card, borderRadius: 4, marginBottom: 8, border: `1px solid ${selected?.t === slot.t ? G.green : G.border}`, cursor: slot.s > 0 ? 'pointer' : 'default', opacity: slot.s === 0 ? 0.45 : 1 }}>
              <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 17, fontWeight: 700, color: selected?.t === slot.t ? '#F2EDE0' : G.text, flex: 1 }}>{slot.t}</span>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: selected?.t === slot.t ? '#A8D8B8' : G.muted, marginRight: 8 }}>{slot.s === 0 ? 'Full' : `${slot.s} spot${slot.s > 1 ? 's' : ''} open`}</span>
              {selected?.t === slot.t && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.openDot} strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>}
            </div>
          ))}
        </div>
        {selected && (
          <div style={{ marginTop: 16 }}>
            <Brass onPress={() => setConfirmed(true)} style={{ width: '100%', padding: '13px' }}>Confirm — {day} at {selected.t}</Brass>
          </div>
        )}
      </div>
    </div>
  );
}
