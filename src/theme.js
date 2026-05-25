// Windhaven palette — ported from the design handoff (cc-core / tg-core)
//
// Phase 3 (multi-club white-label):
//   Three values are CLUB-CONFIGURABLE via CSS custom properties — they
//   resolve to whatever the current club has set on its clubs row:
//     G.green     → var(--g-primary,   <fallback>)
//     G.greenMid  → var(--g-secondary, <fallback>)
//     G.brass     → var(--g-accent,    <fallback>)
//   These get set on document.documentElement when the club row resolves
//   (see applyClubPalette below). Everything else stays hardcoded so the
//   country-club aesthetic + functional state colors stay consistent
//   across clubs.

// Fallback hex values (Clinton's defaults — used until CSS vars resolve).
export const PALETTE_DEFAULTS = {
  primary:   '#1B3A2D',
  secondary: '#234D38',
  accent:    '#9B7A1E',
};

// `var(--g-primary, <fallback>)` is a valid value for any CSS color
// property, including inline styles like style={{ background: G.green }}.
// Components don't need to change.
//
// bg / card / border / text / muted ALSO route through CSS vars as of
// v0.6.4 so the [data-theme="light|medium|dark"] attribute on <html>
// can shift background brightness without recompiling components. The
// fallback hex matches the medium (default) value so any unmounted
// preview environment still renders sensibly.
export const G = {
  bg:       `var(--g-bg,       #F2EDE0)`,
  card:     `var(--g-card,     #EAE4D0)`,
  green:    `var(--g-primary,  ${PALETTE_DEFAULTS.primary})`,
  greenMid: `var(--g-secondary,${PALETTE_DEFAULTS.secondary})`,
  greenDk:  '#152E24',
  text:     `var(--g-text,     #1A180F)`,
  muted:    `var(--g-muted,    #786E5C)`,
  brass:    `var(--g-accent,   ${PALETTE_DEFAULTS.accent})`,
  brassLt:  '#C4A040',
  border:   `var(--g-border,   #D4CCB8)`,
  // Functional state colors — NOT club-configurable (they signal open/closed)
  openBg: '#1A5C34', openDot: '#52C178', openTxt: '#A8D8B8',
  limBg: '#6B4A10',  limDot: '#E8B840',  limTxt: '#D8C080',
  clsBg: '#6B2020',  clsDot: '#E05454',  clsTxt: '#D8A0A0',
};

export function gCfg(state) {
  return {
    open:    { bg: G.openBg, dot: G.openDot,           txt: G.openTxt,           lbl: 'Open' },
    limited: { bg: G.limBg,  dot: G.limDot,            txt: G.limTxt,            lbl: 'Limited' },
    closed:  { bg: G.clsBg,  dot: G.clsDot,            txt: G.clsTxt,            lbl: 'Closed' },
    members: { bg: G.brass,  dot: G.brassLt,           txt: '#F2E5C0',           lbl: 'Members' },
  }[state] || { bg: G.openBg, dot: G.openDot, txt: G.openTxt, lbl: state || 'Open' };
}

// Apply a club's branding colors to the document root as CSS custom
// properties. Called whenever the club row changes (initial load + if
// the manager edits branding from Club Settings).
export function applyClubPalette(club) {
  if (typeof document === 'undefined') return; // SSR safety
  const root = document.documentElement;
  root.style.setProperty('--g-primary',   club?.primary_color   || PALETTE_DEFAULTS.primary);
  root.style.setProperty('--g-secondary', club?.secondary_color || PALETTE_DEFAULTS.secondary);
  root.style.setProperty('--g-accent',    club?.accent_color    || PALETTE_DEFAULTS.accent);
}
