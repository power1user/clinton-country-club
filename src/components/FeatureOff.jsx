// FeatureOff — friendly "this feature isn't available at your club"
// screen, rendered when a member somehow lands on a route whose flag
// is off (direct URL, browser history, deep link from old build, etc.).
//
// Tiles + nav entries are filtered at their source so members don't
// normally hit this. It's a backstop — the BackHeader gives them an
// obvious way out.
//
// Used by Phase 7 (v0.7.0) — every gated member-facing screen renders
// this when its `useFlag(...)` returns false. Keeps the gating one-
// liner short:
//
//   const on = useFlag('pro_shop');
//   if (!on) return <FeatureOff label="Pro Shop" />;
//
import { G } from '../theme.js';
import { BackHeader } from './Headers.jsx';

export default function FeatureOff({ label = 'This feature' }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader title={label} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="1.4" style={{ marginBottom: 16 }}>
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 018 0v4" />
        </svg>
        <h2 style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 20, color: G.muted, margin: '0 0 6px' }}>
          {label} isn't available
        </h2>
        <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.muted, lineHeight: 1.6, margin: 0, maxWidth: 300 }}>
          Your club hasn't enabled this feature. If you think it should be on, reach out to your manager.
        </p>
      </div>
    </div>
  );
}
