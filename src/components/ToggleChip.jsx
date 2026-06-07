// ToggleChip — pill-shaped on/off chip used in admin assignment lists.
//
// Extracted in v0.15.26 from two near-identical inline implementations:
//   - AllPeopleAdmin PersonEditModal Departments section (uses G.green)
//   - ClubhouseRoutingAdmin topic-to-department mapper (uses G.brass)
// Both had identical layout (rounded pill + check svg + Lora label) but
// disagreed on the "on" accent color, so the component takes an
// optional `color` override (defaulting to G.green).
//
// NOT a fit for: the filter pills in AllPeopleAdmin (different shape —
// pills with counts), or the uppercase RelationChip on People rows.

import { G } from '../theme.js';

export default function ToggleChip({ on, label, onClick, busy, title, color, onTextColor }) {
  // color: optional override for the "on" background (defaults to G.green).
  // onTextColor: optional override for the "on" text/check color. Defaults to
  //   '#F2EDE0' (the cooler cream that pairs with G.green). Pass '#F2E5C0'
  //   for brass chips (the warmer brass-cream pairing).
  const accent = color || G.green;
  const fg     = onTextColor || '#F2EDE0';
  return (
    <div
      onClick={busy ? undefined : onClick}
      data-tap={!busy || undefined}
      title={title}
      style={{
        padding: '6px 12px',
        borderRadius: 14,
        background: on ? accent : 'transparent',
        border: `1px solid ${on ? accent : G.border}`,
        cursor: busy ? 'wait' : 'pointer',
        opacity: busy ? 0.6 : 1,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {on && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
      <span style={{
        fontFamily: '"Lora",serif',
        fontSize: 12,
        color: on ? fg : G.text,
        fontWeight: on ? 600 : 400,
      }}>
        {label}
      </span>
    </div>
  );
}
