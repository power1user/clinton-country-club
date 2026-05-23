// PWA install affordance. Captures the browser's beforeinstallprompt
// event (fired when the app is installable but not yet installed),
// exposes an install() trigger, and tracks whether the app is already
// running as an installed PWA (display-mode: standalone) — in which
// case we hide the prompt.
//
//   const { canInstall, install, isStandalone } = usePWAInstall()
//
// Browser support:
//   ✓ Chrome / Edge / Brave / Samsung Internet — fires beforeinstallprompt
//   ✗ Safari (desktop + iOS) — no beforeinstallprompt; user installs via
//     Share → Add to Home Screen. canInstall stays false; we surface a
//     hint with the manual instructions on iOS in the InstallCard.
import { useEffect, useState } from 'react';

export function usePWAInstall() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(false);

  // Detect whether the app is already running as an installed PWA
  const isStandalone =
    typeof window !== 'undefined' && (
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator.standalone === true   // iOS Safari
    );

  // Detect iOS Safari — no beforeinstallprompt there; user must use
  // Share → Add to Home Screen. We can still show a hint card.
  const isIOSSafari =
    typeof navigator !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !window.MSStream;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => {
      setDeferred(null);
      setInstalled(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return { outcome: 'unavailable' };
    deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    return choice;       // { outcome: 'accepted' | 'dismissed', platform: ... }
  };

  return {
    canInstall: !!deferred,
    install,
    isStandalone,
    isIOSSafari,
    installed,
  };
}
