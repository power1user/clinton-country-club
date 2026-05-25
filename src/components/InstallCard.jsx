// Pitch the user on installing the app as a PWA. Two flavors:
//   <InstallCard variant="card" />   — full card with description + button (used on MyClub)
//   <InstallCard variant="banner" /> — compact banner with dismiss (used post-signup on Login)
//
// Hides itself entirely when:
//   - The app is already running standalone (already installed)
//   - The user has dismissed the prompt this session (banner variant)
//   - The browser is not iOS Safari AND beforeinstallprompt has not fired
//     yet (no Add-to-Home-Screen instructions to show)
import { useState } from 'react';
import { G } from '../theme.js';
import { usePWAInstall } from '../hooks/usePWAInstall.js';
import { PLATFORM_NAME } from '../lib/version.js';

const DISMISS_KEY     = 'pwa.installDismissed';
// v0.7.10: set by Settings.jsx on mount. When present, the `card`
// variant on MyClub hides itself — the member already knows the
// persistent Install entry lives in Settings, so duplicating the
// prompt on every MyClub visit is noise.
const COORDINATED_KEY = 'pwa.installCoordinated';

export default function InstallCard({ variant = 'card', onDismiss }) {
  const { canInstall, install, isStandalone, isIOSSafari } = usePWAInstall();
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(
    variant === 'banner' && typeof sessionStorage !== 'undefined' && sessionStorage.getItem(DISMISS_KEY) === '1'
  );
  // Check the coordination flag at render time (not in state) so a
  // member who opens Settings and then nav-back to MyClub sees the
  // card disappear immediately.
  const coordinated = typeof localStorage !== 'undefined' && localStorage.getItem(COORDINATED_KEY) === '1';

  // Hide entirely if installed, dismissed, or nothing to offer
  if (isStandalone || dismissed) return null;
  if (!canInstall && !isIOSSafari) return null;
  // v0.7.10: hide MyClub's card variant once the member has visited
  // Settings (where InstallEntry permanently lives). Banner variant
  // (Login post-signup) still fires regardless — it's a one-shot
  // discovery prompt, not a persistent presence.
  if (variant === 'card' && coordinated) return null;

  const dismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch (_) {}
    onDismiss?.();
  };

  const handleInstall = async () => {
    setBusy(true);
    try {
      const r = await install();
      if (r?.outcome === 'accepted') dismiss();
    } finally {
      setBusy(false);
    }
  };

  if (variant === 'banner') {
    return (
      <div style={{ padding: '12px 14px', background: G.card, border: `1px solid ${G.brass}`, borderRadius: 6, display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 32, height: 32, borderRadius: 6, background: G.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G.brassLt} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2"/>
            <line x1="12" y1="18" x2="12" y2="18"/>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 13, fontWeight: 700, color: G.text, margin: '0 0 2px' }}>Add to home screen</p>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '0 0 8px', lineHeight: 1.45 }}>
            {isIOSSafari
              ? <>Tap the Share button below, then choose <strong>Add to Home Screen</strong>. The app opens full-screen, no browser bar, no Safari address bar.</>
              : <>Install the app for quick access — one tap from your home screen, full-screen, no browser bar.</>}
          </p>
          {canInstall && (
            <div style={{ display: 'flex', gap: 8 }}>
              <div onClick={handleInstall} data-tap style={{ padding: '6px 12px', background: G.green, borderRadius: 3, cursor: busy ? 'wait' : 'pointer' }}>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: '#F2EDE0', fontWeight: 500 }}>{busy ? 'Installing…' : 'Install'}</span>
              </div>
              <div onClick={dismiss} data-tap style={{ padding: '6px 12px', cursor: 'pointer' }}>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, textDecoration: 'underline', textUnderlineOffset: 2 }}>Not now</span>
              </div>
            </div>
          )}
          {!canInstall && isIOSSafari && (
            <div onClick={dismiss} data-tap style={{ padding: '4px 0', cursor: 'pointer' }}>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, textDecoration: 'underline', textUnderlineOffset: 2 }}>Got it</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Card variant (MyClub)
  return (
    <div style={{ padding: '14px 16px', background: G.card, border: `1px solid ${G.brass}`, borderRadius: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 6, background: G.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={G.brassLt} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="2" width="14" height="20" rx="2"/>
          <line x1="12" y1="18" x2="12" y2="18"/>
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: '0 0 2px' }}>Install on your phone</p>
        <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0, lineHeight: 1.45 }}>
          {isIOSSafari
            ? 'Share → Add to Home Screen for full-screen, one-tap access.'
            : `Add ${PLATFORM_NAME} to your home screen — one tap, full screen.`}
        </p>
      </div>
      {canInstall && (
        <div onClick={handleInstall} data-tap style={{ padding: '8px 14px', background: G.green, borderRadius: 3, cursor: busy ? 'wait' : 'pointer', flexShrink: 0 }}>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: '#F2EDE0', fontWeight: 500 }}>{busy ? '…' : 'Install'}</span>
        </div>
      )}
    </div>
  );
}
