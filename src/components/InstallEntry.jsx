// InstallEntry — persistent "Install App" widget for Settings.
//
// Different from InstallCard (which is session-dismissible and lives
// on MyClub / Login post-signup). This one always shows unless the
// app is already running standalone — so members who dismissed
// earlier prompts can come back here when they're ready.
//
// Behavior by platform:
//   · Already standalone        → returns null (nothing to install)
//   · Android Chrome / Edge etc → tappable "Install" button that
//     fires the deferred beforeinstallprompt event
//   · iOS Safari                → step-by-step instruction card
//     (Share → Add to Home Screen) since iOS has no prompt API
//   · Anything else             → small "not supported on this
//     browser" hint so the entry doesn't render as a dead button
import { useState } from 'react';
import { G } from '../theme.js';
import { usePWAInstall } from '../hooks/usePWAInstall.js';
import { PLATFORM_NAME } from '../lib/version.js';

export default function InstallEntry() {
  const { canInstall, install, isStandalone, isIOSSafari } = usePWAInstall();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (isStandalone || done) return null;

  const handleInstall = async () => {
    setBusy(true);
    try {
      const r = await install();
      if (r?.outcome === 'accepted') setDone(true);
    } finally {
      setBusy(false);
    }
  };

  // iOS Safari — no install API; render explicit instructions.
  if (isIOSSafari) {
    return (
      <div style={{ padding: '14px 16px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          {/* v0.8.7: real Grounds app icon so the install prompt
              previews exactly what lands on the home screen. */}
          <img src="/grounds-icon.png" alt={`${PLATFORM_NAME} app icon`} style={{ width: 40, height: 40, borderRadius: 6, flexShrink: 0, objectFit: 'cover' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: '0 0 2px' }}>Add to Home Screen</p>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0, lineHeight: 1.45 }}>
              Three taps. Opens full-screen, no Safari address bar.
            </p>
          </div>
        </div>
        <ol style={{ margin: 0, padding: '0 0 0 0', listStyle: 'none' }}>
          <Step n="1" label={<>Tap the <strong>Share</strong> button at the bottom of Safari.</>} icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G.brass} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v13" />
              <path d="M7 8l5-5 5 5" />
              <rect x="4" y="14" width="16" height="7" rx="2" />
            </svg>
          } />
          <Step n="2" label={<>Scroll down and tap <strong>Add to Home Screen</strong>.</>} icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G.brass} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          } />
          <Step n="3" label={<>Tap <strong>Add</strong> in the top corner.</>} icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G.brass} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          } last />
        </ol>
      </div>
    );
  }

  // Android / desktop with beforeinstallprompt
  if (canInstall) {
    return (
      <div style={{ padding: '14px 16px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 6, background: G.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A8D8B8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2" />
            <line x1="12" y1="18" x2="12" y2="18" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: '0 0 2px' }}>Install {PLATFORM_NAME}</p>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0, lineHeight: 1.45 }}>
            One tap, full-screen, no browser bar.
          </p>
        </div>
        <div onClick={busy ? undefined : handleInstall} data-tap style={{ padding: '8px 14px', background: busy ? G.muted : G.green, borderRadius: 3, cursor: busy ? 'wait' : 'pointer', flexShrink: 0 }}>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: '#F2EDE0', fontWeight: 500 }}>{busy ? 'Installing…' : 'Install'}</span>
        </div>
      </div>
    );
  }

  // Unsupported browser — render a faint note so the entry isn't a
  // dead button, but doesn't dominate the screen.
  return (
    <div style={{ padding: '12px 14px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 6 }}>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0, lineHeight: 1.5 }}>
        This browser doesn't support installing as an app. Try Chrome, Edge, or Safari (on iOS) to add the app to your home screen.
      </p>
    </div>
  );
}

function Step({ n, label, icon, last }) {
  return (
    <li style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: last ? 'none' : `1px solid ${G.border}` }}>
      <div style={{ width: 22, height: 22, borderRadius: '50%', background: G.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontFamily: '"Lora",serif', fontSize: 10, color: '#A8D8B8', fontWeight: 700 }}>{n}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, margin: 0, lineHeight: 1.45 }}>{label}</p>
      </div>
      <div style={{ flexShrink: 0 }}>{icon}</div>
    </li>
  );
}
