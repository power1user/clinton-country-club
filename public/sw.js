// Service worker — handles Web Push notifications.
// Registered from src/lib/push.js on app boot when push is supported.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (_) {}

  const title = payload.title || 'New message';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/favicon.svg',
    badge: payload.badge || '/favicon.svg',
    data: payload.data || {},
    tag: payload.data?.threadId || undefined,   // dedupe pushes for the same thread
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
