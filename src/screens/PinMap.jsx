import { useState, useRef, useEffect } from 'react';
import { G } from '../theme.js';
import { BackHeader, SectionHead } from '../components/Headers.jsx';
import { usePinPlacements } from '../hooks/useClubData.jsx';

function holeDiagramPath(par, n) {
  if (par === 3) return { fairway: 'M155 290 Q145 220 160 130 Q175 60 185 45 Q195 25 205 45 Q218 60 228 130 Q240 220 230 290 Z', green: 'M 185 48 m -28 0 a 28 18 0 1 0 56 0 a 28 18 0 1 0 -56 0', teeX: 195, teeY: 278 };
  if (par === 5) {
    const doglegs = {
      0: 'M130 290 Q118 210 135 150 Q155 80 170 40 Q185 15 200 40 Q220 80 240 150 Q255 220 245 290 Z',
      1: 'M130 290 Q110 200 125 140 Q145 70 175 45 Q195 20 210 50 Q235 90 255 170 Q265 230 250 290 Z',
    };
    return { fairway: doglegs[n % 2], green: 'M 190 48 m -32 0 a 32 20 0 1 0 64 0 a 32 20 0 1 0 -64 0', teeX: 192, teeY: 278 };
  }
  const shapes = {
    0: 'M148 290 Q138 210 155 150 Q168 80 182 45 Q194 20 208 45 Q225 80 240 150 Q252 210 244 290 Z',
    1: 'M138 290 Q122 200 140 140 Q162 68 178 42 Q194 18 212 42 Q232 68 252 140 Q268 210 255 290 Z',
  };
  return { fairway: shapes[n % 2], green: 'M 193 50 m -30 0 a 30 19 0 1 0 60 0 a 30 19 0 1 0 -60 0', teeX: 193, teeY: 278 };
}

function HoleDiagram({ hole }) {
  const shape = holeDiagramPath(hole.par, hole.n);
  const pinPositions = {
    'Right-center': { x: 204, y: 52 }, 'Left-center': { x: 183, y: 52 }, 'Back-left': { x: 176, y: 38 },
    'Back-right':  { x: 207, y: 38 }, 'Front-right':{ x: 207, y: 63 }, 'Front-left':{ x: 176, y: 63 }, 'Center': { x: 192, y: 52 },
  };
  const posKey = Object.keys(pinPositions).find(k => hole.pin.startsWith(k)) || 'Center';
  const pin = pinPositions[posKey];

  return (
    <svg viewBox="0 0 390 310" width="390" height="310" style={{ display: 'block' }}>
      <rect width="390" height="310" fill="#2D4A24" />
      <path d={shape.fairway.replace(/(\d+)/g, (m) => String(Math.round(parseInt(m) * 1.12 - 12)))} fill="#3D5E32" opacity="0.7" />
      <path d={shape.fairway} fill="#5A8A4A" />
      <path d={shape.green} fill="#6FBF54" />
      <path d={shape.green} fill="none" stroke="#5A9A46" strokeWidth="6" opacity="0.5" />
      <ellipse cx="155" cy="155" rx="18" ry="11" fill="#D4C878" opacity="0.85" />
      <ellipse cx="238" cy="138" rx="14" ry="9" fill="#D4C878" opacity="0.85" />
      <rect x={shape.teeX - 16} y={shape.teeY} width="32" height="18" rx="2" fill="#EDE8D8" opacity="0.9" />
      <text x={shape.teeX} y={shape.teeY + 12} textAnchor="middle" fontSize="7" fill="#3A5A2A" fontFamily="Lora,serif" fontWeight="700">TEE</text>
      <line x1="125" y1="162" x2="270" y2="162" stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="5 4" />
      <text x="112" y="166" fontSize="8" fill="rgba(255,255,255,0.4)" fontFamily="Lora,serif">150</text>
      <circle cx={pin.x} cy={pin.y} r="5" fill="#C8402A" />
      <line x1={pin.x} y1={pin.y - 5} x2={pin.x} y2={pin.y - 22} stroke="#C8402A" strokeWidth="1.5" />
      <polygon points={`${pin.x},${pin.y - 22} ${pin.x + 11},${pin.y - 18} ${pin.x},${pin.y - 14}`} fill="#C8402A" />
      <text x="20" y="295" fontSize="11" fill="rgba(255,255,255,0.35)" fontFamily="Playfair Display,serif">{hole.n}</text>
      <text x="365" y="20" fontSize="9" fill="rgba(255,255,255,0.25)" fontFamily="Lora,serif" textAnchor="end">N ↑</text>
    </svg>
  );
}

export default function PinMap() {
  const { data: holes } = usePinPlacements();
  const [hole, setHole] = useState(1);
  const holeRef = useRef(null);
  const h = holes[hole - 1] || holes[0];

  useEffect(() => {
    if (holeRef.current) {
      const el = holeRef.current.querySelector(`[data-hole="${hole}"]`);
      if (el) el.scrollIntoView({ inline: 'center', block: 'nearest' });
    }
  }, [hole]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader title="Pin Placement" />

      <div ref={holeRef} style={{ display: 'flex', gap: 6, padding: '10px 16px', background: G.greenMid, flexShrink: 0, overflowX: 'auto' }}>
        {holes.map(hd => (
          <div
            key={hd.n}
            data-hole={hd.n}
            onClick={() => setHole(hd.n)}
            data-tap
            style={{ width: 36, height: 36, borderRadius: 3, background: hole === hd.n ? G.brass : G.openBg, border: `1.5px solid ${hole === hd.n ? G.brass : 'rgba(122,172,136,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}
          >
            <span style={{ fontFamily: '"Lora",serif', fontSize: 12, fontWeight: hole === hd.n ? 700 : 500, color: hole === hd.n ? '#1B3A2D' : '#A8D8B8' }}>{hd.n}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: '10px 20px', background: G.card, borderBottom: `1px solid ${G.border}`, flexShrink: 0, display: 'flex', gap: 24 }}>
        <div>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 2px' }}>Hole</p>
          <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 26, fontWeight: 700, color: G.text, margin: 0, lineHeight: 1 }}>{h.n}</p>
        </div>
        <div>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 2px' }}>Par</p>
          <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 26, fontWeight: 700, color: G.brass, margin: 0, lineHeight: 1 }}>{h.par}</p>
        </div>
        <div>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 2px' }}>Yards</p>
          <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 26, fontWeight: 700, color: G.text, margin: 0, lineHeight: 1 }}>{h.yds}</p>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 2px' }}>Pace</p>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.openDot, margin: 0, fontWeight: 600 }}>{h.pace}</p>
        </div>
      </div>

      <div style={{ background: '#2D4A24', flexShrink: 0 }}>
        <HoleDiagram hole={h} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 24px' }}>
        <SectionHead label="Conditions — Updated Today 6:45am" />
        {[
          ['Pin Position', h.pin, G.clsDot],
          ['Green Condition', h.grn, G.text],
          ['Hazard Notes', h.haz, G.muted],
        ].map(([k, v, clr]) => (
          <div key={k} style={{ marginBottom: 14 }}>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 3px' }}>{k}</p>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: clr, margin: 0, lineHeight: 1.55, fontWeight: clr === G.clsDot ? 600 : 400 }}>{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
