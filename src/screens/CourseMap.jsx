import { useState } from 'react';
import { G } from '../theme.js';
import { BackHeader, SectionHead } from '../components/Headers.jsx';
import { usePinPlacements } from '../hooks/useClubData.jsx';
import { useBrand } from '../hooks/useBrand.jsx';
import { useFlag } from '../hooks/useFlag.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { useNav } from '../hooks/useNav.jsx';
import FeatureOff from '../components/FeatureOff.jsx';

// Course overview — stylized illustration of Clinton CC's layout plus a real
// scorecard with all three tee yardages. GPS/satellite returns in v2.
export default function CourseMap() {
  const on = useFlag('course_map');
  const { data: holes, loading } = usePinPlacements();
  const brand = useBrand();
  const { isAdmin, isManager } = useAuth();
  const { push } = useNav();
  const [tee, setTee] = useState('white');
  // Phase 7 gating — default ON.
  if (!on) return <FeatureOff label="Course Map" />;

  // v0.10.11 — empty state for clubs that haven't populated the
  // holes table yet (Oakgrove + Windhaven at launch had zero rows;
  // members saw a scorecard full of "—" and an SVG illustration
  // that only matches Clinton). Friendlier to surface "no data
  // yet" plus a one-tap path into the admin section for staff.
  if (!loading && (!holes || holes.length === 0)) {
    return <CourseEmpty isStaff={isAdmin || isManager} push={push} brand={brand} />;
  }

  // Sum yardages for the chosen tee — fall back to any available row if a
  // specific tee yardage is missing on a hole.
  const yardageFor = (h) =>
    tee === 'blue'  ? h.yds_blue  ?? h.yds_white ?? h.yds ?? 0 :
    tee === 'red'   ? h.yds_red   ?? h.yds_white ?? h.yds ?? 0 :
                      h.yds_white ?? h.yds       ?? 0;

  const totalYards = holes.reduce((s, h) => s + yardageFor(h), 0);
  const totalPar   = holes.reduce((s, h) => s + (h.par || 0), 0);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader title="Course Overview" />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Hero: stylized course layout illustration */}
        <div style={{ background: 'linear-gradient(180deg, #2A4020 0%, #1B3A2D 100%)', padding: '16px 12px 18px' }}>
          <img
            src="/greens/course-overview.svg"
            alt={`${brand.full} course layout`}
            style={{ display: 'block', width: '100%', height: 'auto', maxHeight: 320, objectFit: 'contain' }}
          />
          <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 12, color: '#A8D8B8', margin: '10px 0 0', letterSpacing: '0.05em', textAlign: 'center' }}>
            {brand.full} · Est. {brand.founded} · Par {totalPar}
          </p>
        </div>

        {/* Tee selector */}
        <div style={{ padding: '14px 16px 8px' }}>
          <SectionHead label="Scorecard" />
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {[
              { id: 'blue',  l: 'Blue',  color: '#2E6BB0' },
              { id: 'white', l: 'White', color: '#666' },
              { id: 'red',   l: 'Red',   color: '#B83A3A' },
            ].map(t => (
              <div
                key={t.id}
                onClick={() => setTee(t.id)}
                data-tap
                style={{
                  flex: 1, padding: '8px 0', textAlign: 'center', borderRadius: 3,
                  background: tee === t.id ? G.green : G.card,
                  border: `1px solid ${tee === t.id ? G.green : G.border}`,
                  cursor: 'pointer',
                }}
              >
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: t.color, marginRight: 6, verticalAlign: 'middle' }} />
                <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: tee === t.id ? '#F2EDE0' : G.text, fontWeight: tee === t.id ? 600 : 400, verticalAlign: 'middle' }}>{t.l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scorecard table */}
        <div style={{ padding: '0 16px 28px' }}>
          <div style={{ background: G.card, borderRadius: 4, border: `1px solid ${G.border}`, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '40px 50px 1fr 70px', padding: '10px 14px', background: G.green, alignItems: 'center', gap: 8 }}>
              <span style={hdrCellStyle}>Hole</span>
              <span style={{ ...hdrCellStyle, textAlign: 'center' }}>Par</span>
              <span style={hdrCellStyle}>{tee === 'blue' ? 'Blue' : tee === 'red' ? 'Red' : 'White'} Yardage</span>
              <span style={{ ...hdrCellStyle, textAlign: 'right' }}>Yds</span>
            </div>
            {holes.map((h, i) => {
              const y = yardageFor(h);
              return (
                <div key={h.n} style={{
                  display: 'grid', gridTemplateColumns: '40px 50px 1fr 70px',
                  padding: '10px 14px', alignItems: 'center', gap: 8,
                  background: i % 2 === 0 ? G.card : G.bg,
                  borderTop: i === 0 ? 'none' : `1px solid ${G.border}`,
                }}>
                  <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 18, fontWeight: 700, color: G.text }}>{h.n}</span>
                  <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 16, fontWeight: 700, color: G.brass, textAlign: 'center' }}>{h.par || '—'}</span>
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted }}>
                    {h.yds_blue ?? '—'} / {h.yds_white ?? '—'} / {h.yds_red ?? '—'}
                  </span>
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, textAlign: 'right' }}>{y || '—'}</span>
                </div>
              );
            })}
            <div style={{ display: 'grid', gridTemplateColumns: '40px 50px 1fr 70px', padding: '10px 14px', background: G.green, alignItems: 'center', gap: 8 }}>
              <span style={hdrCellStyle}>OUT</span>
              <span style={{ ...hdrCellStyle, textAlign: 'center' }}>{totalPar || '—'}</span>
              <span />
              <span style={{ ...hdrCellStyle, textAlign: 'right' }}>{totalYards ? totalYards.toLocaleString() : '—'}</span>
            </div>
          </div>

          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.muted, margin: '14px 4px 0', lineHeight: 1.6 }}>
            Yardages shown are Blue / White / Red. GPS-enabled satellite imagery returns in v2.
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

// v0.10.11 — empty state when the club has no holes data populated.
// Members get a polite "coming soon" message; staff get a one-tap
// jump into the Hole Details admin section so they can fix it.
function CourseEmpty({ isStaff, push, brand }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader title="Course Overview" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 28px', textAlign: 'center' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="1.4" style={{ marginBottom: 16 }}>
          {/* Course-flag glyph for the empty state */}
          <path d="M4 22V3" />
          <path d="M4 3l12 3-3 4 3 4-12 3" />
        </svg>
        <h2 style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 20, color: G.muted, margin: '0 0 8px' }}>
          Course details haven't been added yet
        </h2>
        <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.muted, lineHeight: 1.6, margin: '0 0 18px', maxWidth: 320 }}>
          {brand?.full || 'Your club'} hasn't published hole layouts, yardages, or scorecard data yet. Check back soon.
        </p>
        {isStaff && (
          <button
            onClick={() => push('myclub/admin')}
            data-tap
            type="button"
            style={{
              background: G.green, color: '#F2EDE0',
              border: 'none', borderRadius: 4,
              padding: '10px 18px', cursor: 'pointer',
              fontFamily: '"Playfair Display",serif', fontSize: 13, fontWeight: 600,
            }}
          >
            Open Admin → Golf Course → Hole Details
          </button>
        )}
      </div>
    </div>
  );
}
