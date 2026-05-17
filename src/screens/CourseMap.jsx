import { useState } from 'react';
import { G } from '../theme.js';
import { BackHeader, SectionHead } from '../components/Headers.jsx';
import { usePinPlacements } from '../hooks/useClubData.jsx';
import { useBrand } from '../hooks/useBrand.jsx';

// Placeholder course overview. The intent is to swap this for a custom
// illustrated/aerial layout of Clinton CC once we have the source artwork.
// For now: a stylized 9-hole overview that lists hole numbers + pars + yards
// so members can scan the course at a glance. GPS overlay returns in v2.
export default function CourseMap() {
  const { data: holes } = usePinPlacements();
  const brand = useBrand();

  const totalYards = holes.reduce((s, h) => s + (h.yds || 0), 0);
  const totalPar   = holes.reduce((s, h) => s + (h.par || 0), 0);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader title="Course Overview" />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Hero placeholder — replace with custom illustration once provided */}
        <div style={{ background: 'linear-gradient(180deg, #2A4020 0%, #1B3A2D 100%)', padding: '40px 24px 28px', textAlign: 'center', position: 'relative' }}>
          <CourseSketch holeCount={holes.length || 9} />
          <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 12, color: '#7AAC88', margin: '14px 0 0', letterSpacing: '0.05em' }}>
            {brand.full} · Est. {brand.founded}
          </p>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: 'rgba(168,216,184,0.55)', margin: '4px 0 0' }}>
            {totalYards ? `${totalYards.toLocaleString()} yards · Par ${totalPar}` : ''}
          </p>
        </div>

        {/* Scorecard-style hole list */}
        <div style={{ padding: '18px 16px 28px' }}>
          <SectionHead label="9-Hole Scorecard" />
          <div style={{ background: G.card, borderRadius: 4, border: `1px solid ${G.border}`, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 50px 60px', padding: '10px 14px', background: G.green, alignItems: 'center', gap: 8 }}>
              <span style={hdrCellStyle}>Hole</span>
              <span style={hdrCellStyle}>Name</span>
              <span style={{ ...hdrCellStyle, textAlign: 'center' }}>Par</span>
              <span style={{ ...hdrCellStyle, textAlign: 'right' }}>Yards</span>
            </div>
            {holes.map((h, i) => (
              <div key={h.n} style={{
                display: 'grid', gridTemplateColumns: '40px 1fr 50px 60px',
                padding: '10px 14px', alignItems: 'center', gap: 8,
                background: i % 2 === 0 ? G.card : G.bg,
                borderTop: i === 0 ? 'none' : `1px solid ${G.border}`,
              }}>
                <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 18, fontWeight: 700, color: G.text }}>{h.n}</span>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 12, fontStyle: h.name ? 'normal' : 'italic', color: h.name ? G.text : G.muted }}>
                  {h.name || '— add hole name —'}
                </span>
                <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 16, fontWeight: 700, color: G.brass, textAlign: 'center' }}>{h.par || '—'}</span>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, textAlign: 'right' }}>{h.yds || '—'}</span>
              </div>
            ))}
            {/* Footer totals */}
            <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 50px 60px', padding: '10px 14px', background: G.green, alignItems: 'center', gap: 8, borderTop: `1px solid ${G.green}` }}>
              <span style={hdrCellStyle}>OUT</span>
              <span />
              <span style={{ ...hdrCellStyle, textAlign: 'center' }}>{totalPar || '—'}</span>
              <span style={{ ...hdrCellStyle, textAlign: 'right' }}>{totalYards ? totalYards.toLocaleString() : '—'}</span>
            </div>
          </div>

          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.muted, margin: '14px 4px 0', lineHeight: 1.6 }}>
            A custom illustrated course map is coming. For now, this scorecard view gives you the basics.
            GPS-enabled satellite imagery returns in v2.
          </p>
        </div>
      </div>
    </div>
  );
}

const hdrCellStyle = {
  fontFamily: '"Lora",serif',
  fontSize: 9,
  color: '#A8D8B8',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
};

// Simple stylized course sketch — 9 small green dots in a loose layout
// with the clubhouse in the middle. Decorative only.
function CourseSketch({ holeCount }) {
  // Spread holes around a clubhouse in a loose, organic-looking pattern.
  const positions = [
    { x: 70,  y: 130 }, { x: 130, y: 90 },  { x: 200, y: 70 },
    { x: 270, y: 90 }, { x: 320, y: 130 }, { x: 320, y: 200 },
    { x: 260, y: 240 }, { x: 180, y: 250 }, { x: 100, y: 220 },
  ];
  return (
    <svg viewBox="0 0 390 310" width="100%" style={{ maxWidth: 320, display: 'block', margin: '0 auto' }}>
      {/* loose fairway shape */}
      <path d="M 60 140 Q 90 60 200 50 Q 320 65 340 150 Q 330 250 200 260 Q 70 250 60 180 Z"
        fill="none" stroke="rgba(122,172,136,0.18)" strokeWidth="1.2" strokeDasharray="4 4" />
      {/* holes */}
      {positions.slice(0, holeCount).map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="12" fill="#1A5C34" stroke="#7AAC88" strokeWidth="1" opacity="0.9" />
          <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#F2EDE0" fontFamily="Playfair Display, serif">{i + 1}</text>
        </g>
      ))}
      {/* clubhouse */}
      <rect x="178" y="158" width="44" height="32" rx="3" fill="#9B7A1E" opacity="0.9" />
      <text x="200" y="178" textAnchor="middle" fontSize="8" fill="#1A180F" fontWeight="700" fontFamily="Playfair Display, serif">CLUB</text>
    </svg>
  );
}
