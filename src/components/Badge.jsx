// Reusable shield-shaped badge — single source of truth for every
// badge surface in the app (membership card, member directory, profile,
// Trophy Case, admin previews). Visual consistency is guaranteed
// because there's only one renderer.
//
// Heraldic pointed-bottom shield with a rounded-top rectangle that
// curves to a centered point. Filled with the club-manager-chosen
// color; white Lucide icon centered inside the upper mass (not at
// the geometric center — would land too close to the point).
//
// Three size variants matched to the spec:
//   · mini  (28px)  — membership card row, message bubbles. No labels.
//   · small (64px)  — member directory rows, Trophy Case grid. Name +
//                     year shown beneath.
//   · large (96px)  — member profile, badge detail. Name + year, larger
//                     typography.
//
// iconKey is a Lucide icon name (string). Unknown keys fall back to
// 'Award' so a stale badge never blanks out the surface.
import * as LucideIcons from 'lucide-react';
import { G } from '../theme.js';

const SIZE_SPEC = {
  mini:  { shield: 28, iconPx: 14, nameFs: 0,  yearFs: 0,  showLabels: false },
  small: { shield: 64, iconPx: 30, nameFs: 11, yearFs: 9.5, showLabels: true },
  large: { shield: 96, iconPx: 46, nameFs: 13.5, yearFs: 11, showLabels: true },
};

// 100×117 viewBox shield path. Width 100, height 117 keeps the
// aspect ratio in line with traditional heraldic shields (slightly
// taller than wide).
const SHIELD_PATH =
  'M 8 4 L 92 4 A 6 6 0 0 1 96 10 L 96 60 Q 96 96 50 116 Q 4 96 4 60 L 4 10 A 6 6 0 0 1 8 4 Z';
const SHIELD_RATIO = 117 / 100;

export default function Badge({ iconKey, color = G.brass, name, year, size = 'small' }) {
  const spec = SIZE_SPEC[size] || SIZE_SPEC.small;
  const Icon = LucideIcons[iconKey] || LucideIcons.Award;
  const height = Math.round(spec.shield * SHIELD_RATIO);

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: spec.shield >= 64 ? 5 : 0 }}>
      <div style={{ position: 'relative', width: spec.shield, height, flexShrink: 0 }}>
        <svg viewBox="0 0 100 117" width="100%" height="100%" style={{ display: 'block' }}>
          <defs>
            {/* Subtle vertical gradient gives the shield a touch of
                depth without competing with the icon. Top is the
                badge color; bottom is a darkened mix toward black. */}
            <linearGradient id={`badge-grad-${color.replace(/[^a-z0-9]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="1" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.18" />
            </linearGradient>
          </defs>
          <path d={SHIELD_PATH} fill={color} />
          <path d={SHIELD_PATH} fill={`url(#badge-grad-${color.replace(/[^a-z0-9]/gi, '')})`} />
          <path d={SHIELD_PATH} fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="1.2" />
        </svg>
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          paddingBottom: '14%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <Icon size={spec.iconPx} color="#fff" strokeWidth={2.2} />
        </div>
      </div>
      {spec.showLabels && name && (
        <p style={{
          fontFamily: '"Playfair Display",serif',
          fontSize: spec.nameFs,
          fontWeight: 700,
          color: G.text,
          margin: 0,
          textAlign: 'center',
          maxWidth: spec.shield * 1.6,
          lineHeight: 1.2,
        }}>{name}</p>
      )}
      {spec.showLabels && year && (
        <p style={{
          fontFamily: '"Lora",serif',
          fontStyle: 'italic',
          fontSize: spec.yearFs,
          color: G.brass,
          margin: 0,
          lineHeight: 1.1,
          letterSpacing: '0.04em',
        }}>{year}</p>
      )}
    </div>
  );
}
