// Web Push subscription helpers.
// Uses VITE_VAPID_PUBLIC_KEY (set in .env / Cloudflare Pages env).
// Subscriptions are stored in the push_subscriptions table (RLS:
// each user manages their own rows).
import { supabase } from './supabase.js';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export function isPushSupported() {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

export function pushPermission() {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

// Register the service worker once at app boot. Safe to call repeatedly.
let _swRegistration = null;
export async function registerServiceWorker() {
  if (!isPushSupported()) return null;
  if (_swRegistration) return _swRegistration;
  try {
    _swRegistration = await navigator.serviceWorker.register('/sw.js');
    return _swRegistration;
  } catch (e) {
    console.warn('[push] service worker registration failed:', e);
    return null;
  }
}

// Subscribe the current device + persist to push_subscriptions.
// Returns true on success, throws on hard failure.
export async function subscribeToPush(userId) {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) {
    throw new Error('Push notifications are not supported on this device.');
  }
  const reg = await registerServiceWorker();
  if (!reg) throw new Error('Service worker unavailable.');

  // Ask for permission if we haven't already
  if (Notification.permission === 'default') {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new Error('Notification permission denied.');
  }
  if (Notification.permission !== 'granted') {
    throw new Error('Notifications are blocked. Enable them in browser settings.');
  }

  // Reuse existing subscription if present
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const json = sub.toJSON();
  const row = {
    user_id: userId,
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : null,
    last_used_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(row, { onConflict: 'user_id,endpoint' });
  if (error) throw error;
  return true;
}

export async function unsubscribeFromPush(userId) {
  if (!isPushSupported()) return;
  const reg = await registerServiceWorker();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await sub.unsubscribe();
    await supabase.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', sub.endpoint);
  }
}

// VAPID public keys are base64url-encoded; PushManager needs a Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
