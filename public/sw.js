// Service worker — handles Web Push notifications.
// Registered from src/lib/push.js on app boot when push is supported.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (_) {}

  const title = payload.title || 'New message';
  // v0.11.37 — Pick a tag from the most specific available identifier
  // in the payload's data bag. Pre-v0.11.37 only checked threadId,
  // which left broadcasts with `tag: undefined`. The spec says
  // `renotify: true` REQUIRES a `tag` — without one, showNotification
  // throws a TypeError and silently drops the push. That was the
  // exact reason Marc's admin broadcasts never displayed even though
  // the push pipeline returned `{sent: N, failed: 0}`.
  //
  // Order of preference:
  //   · threadId    → dedupe within a single chat thread
  //   · broadcastId → dedupe within a single admin broadcast
  //   · kind        → coarse bucket per category (broadcast / order /
  //                    clubhouse / dm) — only used if neither id is
  //                    present
  //   · 'general'   → catch-all so we never end up undefined
  const tag = payload.data?.threadId
    || payload.data?.broadcastId
    || payload.data?.kind
    || 'general';
  const options = {
    body: payload.body || '',
    // v0.8.6: use the branded Grounds icon for push notifications
    // instead of the generic favicon.svg placeholder. Per-club custom
    // icons could later override via payload.icon at send time.
    icon: payload.icon || '/grounds-icon.png',
    badge: payload.badge || '/grounds-icon.png',
    data: payload.data || {},
    tag,
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus an existing tab if one is open, otherwise open a new one
      for (const c of clients) {
        if (c.url.includes(self.location.origin) && 'focus' in c) {
          c.postMessage({ type: 'open-thread', threadId: event.notification.data?.threadId });
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
