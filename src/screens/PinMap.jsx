import { useState, useEffect, useRef } from 'react';
import { G } from '../theme.js';
import { BackHeader, SectionHead } from '../components/Headers.jsx';
import { usePinPlacements } from '../hooks/useClubData.jsx';
import { useFlag } from '../hooks/useFlag.js';
import FeatureOff from '../components/FeatureOff.jsx';

// Read-only member view: shows the green image for the selected hole with a
// flag marker at the coordinates the greenskeeper set today.
export default function PinMap() {
  const on = useFlag('pin_placements');
  const { data: holes, loading } = usePinPlacements();
  const [hole, setHole] = useState(1);
  const stripRef = useRef(null);
  const h = holes.find(x => x.n === hole) || holes[0];

  useEffect(() => {
    if (!stripRef.current) return;
    const el = stripRef.current.querySelector(`[data-hole="${hole}"]`);
    if (el) el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [hole]);

  // Phase 7 gating — default ON.
  if (!on) return <FeatureOff label="Pin Placement" />;

  if (loading || !h) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
        <BackHeader title="Pin Placement" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', color: G.muted }}>Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader title="Pin Placement" />

      {/* Hole picker strip */}
      <div ref={stripRef} style={{ display: 'flex', gap: 6, padding: '10px 16px', background: G.greenMid, flexShrink: 0, overflowX: 'auto' }}>
        {holes.map(hd => (
          <div
            key={hd.n}
            data-hole={hd.n}
            onClick={() => setHole(hd.n)}
            data-tap
            style={{
              width: 36, height: 36, borderRadius: 3,
              background: hole === hd.n ? G.brass : G.openBg,
              border: `1.5px solid ${hole === hd.n ? G.brass : 'rgba(122,172,136,0.3)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s',
            }}
          >
            <span style={{ fontFamily: '"Lora",serif', fontSize: 12, fontWeight: hole === hd.n ? 700 : 500, color: hole === hd.n ? '#1B3A2D' : '#A8D8B8' }}>{hd.n}</span>
          </div>
        ))}
      </div>

      {/* Hole stats bar */}
      <div style={{ padding: '10px 20px', background: G.card, borderBottom: `1px solid ${G.border}`, flexShrink: 0, display: 'flex', gap: 24 }}>
        <Stat label="Hole" value={h.n} />
        <Stat label="Par"  value={h.par || '—'} color={G.brass} />
        <Stat label="Yards" value={h.yds || '—'} />
        {h.handicap != null && <Stat label="HCP" value={h.handicap} />}
      </div>

      {/* Green image + pin marker */}
      <div style={{ background: '#2D4A24', flexShrink: 0, padding: '12px 0', position: 'relative' }}>
        <GreenWithPin src={h.greenImage} pinX={h.pinX} pinY={h.pinY} />
      </div>

      {/* Notes / hole detail */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 24px' }}>
        {h.name && (
          <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 14, color: G.muted, margin: '0 0 10px' }}>{h.name}</p>
        )}
        <SectionHead label="Today's Pin" />
        <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.muted, lineHeight: 1.55, margin: '0 0 12px' }}>
          The flag below shows where the cup is set today. Greens are oriented with the front edge toward the bottom of the diagram.
        </p>
        {h.notes && (
          <>
            <SectionHead label="Notes" />
            <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.text, lineHeight: 1.6, margin: 0 }}>{h.notes}</p>
          </>
        )}
        {h.description && (
          <>
            <div style={{ height: 12 }} />
            <SectionHead label="About the Hole" />
            <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, lineHeight: 1.65, margin: 0 }}>{h.description}</p>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div>
      <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 2px' }}>{label}</p>
      <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 26, fontWeight: 700, color: color || G.text, margin: 0, lineHeight: 1 }}>{value}</p>
    </div>
  );
}

// Renders the green SVG with an animated flag marker at the given (pinX, pinY) — both 0..1.
export function GreenWithPin({ src, pinX, pinY, onTap }) {
  const ref = useRef(null);
  const handleClick = (e) => {
    if (!onTap || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    onTap(Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y)));
  };

  return (
    <div
      ref={ref}
      onClick={handleClick}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '4 / 3',
        background: '#2D4A24',
        cursor: onTap ? 'crosshair' : 'default',
        userSelect: 'none',
      }}
    >
      <img
        src={src}
        alt="Green diagram"
        draggable={false}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
      />
      {/* Flag marker — anchored at the base of the pole */}
      <div
        style={{
          position: 'absolute',
          left: `${pinX * 100}%`,
          top:  `${pinY * 100}%`,
          transform: 'translate(-50%, -100%)',
          pointerEvents: 'none',
          filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.45))',
        }}
      >
        <svg width="22" height="34" viewBox="0 0 22 34" xmlns="http://www.w3.org/2000/svg">
          {/* base ball at the cup */}
          <circle cx="11" cy="32" r="3" fill="#1A180F" opacity="0.55" />
          <circle cx="11" cy="31" r="2" fill="#C8402A" />
          {/* pole */}
          <line x1="11" y1="31" x2="11" y2="4" stroke="#1A180F" strokeWidth="1.4" />
          {/* flag */}
          <polygon points="11,4 22,8 11,12" fill="#C8402A" />
        </svg>
      </div>
    </div>
  );
}
