// Persistent notifications opt-in row for MyClub.
//   - If push isn't possible (no PushManager, no VAPID key, iOS-not-installed):
//     the toggle is greyed out and explains why.
//   - If permission='default': tapping the toggle triggers subscribeToPush
//     which surfaces the native browser permission prompt.
//   - If permission='granted' and we have a subscription: toggle is ON;
//     tapping unsubscribes.
//   - If permission='denied': toggle stays OFF with a "you blocked
//     notifications — unblock in your browser settings" hint.
import { useEffect, useState } from 'react';
import { G } from '../theme.js';
import Toggle from './Toggle.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { supabase } from '../lib/supabase.js';
import {
  pushDiagnostics, pushReasonText,
  subscribeToPush, unsubscribeFromPush, registerServiceWorker,
} from '../lib/push.js';

export default function NotificationsToggle() {
  const { session } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [diag, setDiag] = useState(() => pushDiagnostics());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  // Check whether THIS browser already has an active push subscription
  // tied to the current user (so the toggle reflects reality).
  useEffect(() => {
    if (!session?.user?.id || !diag.ok) return;
    let cancelled = false;
    (async () => {
      try {
        const reg = await registerServiceWorker();
        const sub = await reg?.pushManager.getSubscription();
        if (!sub) { if (!cancelled) setSubscribed(false); return; }
        // Confirm this endpoint is in push_subscriptions for the user
        const { data } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('endpoint', sub.endpoint)
          .maybeSingle();
        if (!cancelled) setSubscribed(!!data);
      } catch (_) {
        if (!cancelled) setSubscribed(false);
      }
    })();
    return () => { cancelled = true; };
  }, [session?.user?.id, diag.ok]);

  const onToggle = async (next) => {
    if (busy) return;
    setErr(null);
    setBusy(true);
    try {
      if (next) {
        await subscribeToPush(session.user.id);
        setSubscribed(true);
        setDiag(pushDiagnostics()); // permission may have flipped
      } else {
        await unsubscribeFromPush(session.user.id);
        setSubscribed(false);
      }
    } catch (e) {
      setErr(e.message || 'Could not change notifications.');
      // Re-read permission in case the user denied the native prompt
      setDiag(pushDiagnostics());
    } finally {
      setBusy(false);
    }
  };

  // Friendly hint when push isn't available or has been denied
  const hint = !diag.ok ? pushReasonText(diag)
    : diag.permission === 'denied' ? "You previously blocked notifications. Re-enable them in your browser or device settings, then come back and toggle this on."
    : null;

  // Toggle is interactive only when push is possible AND permission
  // isn't already denied. (If denied, browser ignores requestPermission.)
  const interactive = diag.ok && diag.permission !== 'denied';

  return (
    <div style={{ padding: '12px 16px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 6, background: G.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={G.brassLt} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: '0 0 2px' }}>Push notifications</p>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0, lineHeight: 1.45 }}>
            {subscribed ? "On — you'll get pinged when your order is ready, the clubhouse messages you, or a member sends a DM."
              : interactive ? "Get pinged when your order is ready, the clubhouse messages you, or a member sends a DM."
              : "Currently unavailable on this device."}
          </p>
        </div>
        <Toggle
          checked={subscribed}
          onChange={onToggle}
          disabled={!interactive || busy}
          ariaLabel="Toggle push notifications"
        />
      </div>
      {(hint || err) && (
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: err ? G.clsDot : G.brass, margin: '8px 0 0', lineHeight: 1.45 }}>
          {err || hint}
        </p>
      )}
    </div>
  );
}
