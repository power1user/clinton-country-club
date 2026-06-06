// formStyles — v0.15.18
//
// Shared admin form primitives. Before this module, the same label /
// input / select styles were redefined in:
//   · src/screens/admin/AllPeopleAdmin.jsx
//   · src/screens/admin/DepartmentsAdmin.jsx
//   · src/screens/AdminPanel.jsx        (also had a latent
//     `background:` shorthand bug — that was the chevron-hiding
//     bug from v0.15.8)
//   · src/screens/admin/sections.jsx    (three separate inner scopes)
//
// Six copies of the same definition. Any design tweak meant updating
// every file. This module is the single source of truth — design
// changes happen here, fixed everywhere.
//
// IMPORTANT — use `backgroundColor` (not the `background` shorthand)
// on inputs and selects. The shorthand expands to
// `background-image: none` which silently overrides the global
// chevron icon we paint on every `<select>` (see src/index.css and
// the v0.15.7 → v0.15.8 saga).

import { G } from '../theme.js';

export const labelStyle = {
  fontFamily: '"Lora",serif',
  fontSize: 9,
  color: G.muted,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  display: 'block',
  marginBottom: 5,
};

export const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: `1px solid ${G.border}`,
  borderRadius: 3,
  fontFamily: '"Lora",serif',
  fontSize: 13,
  color: G.text,
  backgroundColor: G.card,
  outline: 'none',
  boxSizing: 'border-box',
};

// Selects inherit inputStyle's metrics + colors. The chevron is
// painted by index.css via background-image, so we don't override
// the `background` shorthand here.
export const selectStyle = { ...inputStyle };

// ── Form composition primitives (mirror what was inlined in
// AllPeopleAdmin.jsx and AdminPanel.jsx). Kept as named exports so
// callers can import only what they need. ──

export function FormRow({ children }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>{children}</div>
  );
}

// `required` adds a red asterisk; `error` renders a one-line message
// directly below the input. Both optional.
export function Field({ label, required, error, children }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <label style={labelStyle}>
        {label}
        {required && (
          <span style={{ color: G.clsDot, marginLeft: 3, fontWeight: 700 }}>*</span>
        )}
      </label>
      {children}
      {error && (
        <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.clsDot, margin: '4px 0 0' }}>
          {error}
        </p>
      )}
    </div>
  );
}

// Section header with a hairline divider. Used to group related
// fields inside a long form ("Identity" / "Membership details" /
// "Visit details" / etc.).
export function SectionLabel({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 8px' }}>
      <span style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: G.border }} />
    </div>
  );
}
