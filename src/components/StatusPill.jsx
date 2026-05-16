import { useState } from 'react';
import { G, gCfg } from '../theme.js';

export default function StatusPill({ item }) {
  const [exp, setExp] = useState(false);
  const c = gCfg(item.st);
  return (
    <div
      onClick={() => setExp(!exp)}
      data-tap
      style={{ background: c.bg, borderRadius: 3, padding: exp ? '10px 10px 12px' : '10px', cursor: 'pointer', flex: 1 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
        <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: '#E8E2D6', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
        <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: c.txt, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>{c.lbl}</span>
      </div>
      {exp && (
        <div style={{ marginTop: 9, paddingTop: 9, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: '#D8D0BE', lineHeight: 1.5, margin: '0 0 4px' }}>{item.hrs}</p>
          {item.note && <p style={{ fontFamily: '"Lora",serif', fontSize: 10.5, color: '#B0A898', fontStyle: 'italic', lineHeight: 1.5, margin: 0 }}>{item.note}</p>}
        </div>
      )}
    </div>
  );
}
