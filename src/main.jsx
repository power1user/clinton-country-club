import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { init as initAnalytics } from './lib/analytics.js';

// ════════════════════════════════════════════════════════════════════
// v0.14.14 — Host-rescue redirect.
//
// Rescues stale magic-link emails sent before today's Supabase Auth
// URL config got fixed. Some users have emails in their inbox with
// `clinton-country-club.marcabla1.workers.dev/#access_token=…` that
// served "nothing here yet" until we put this in place. Now those
// links land here, get bounced to the canonical groundslive.com
// subdomain WITH the auth hash preserved, and the user signs in
// normally.
//
// Also catches future stale Cloudflare preview URLs (pages.dev,
// workers.dev) without us having to think about it.
//
// Runs synchronously BEFORE React mounts so there's no flash of
// content on the wrong host.
// ════════════════════════════════════════════════════════════════════
(function hostRescue() {
  if (typeof window === 'undefined') return;
  const host = window.location.hostname;
  // Whitelist of acceptable hosts. Everything else gets redirected.
  const ok =
    host.endsWith('.groundslive.com') ||
    host === 'groundslive.com' ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.startsWith('localhost:');
  if (ok) return;

  // Try to extract the club slug from the URL path (e.g. /guest/clintoncc).
  // If present, send the user to that club's subdomain. Otherwise default
  // to clintoncc (the first production club) — pragmatic for now; a future
  // smarter version could decode the auth-hash JWT to find the user's club.
  const pathMatch = window.location.pathname.match(/^\/guest\/([a-z0-9-]+)/i);
  const slug = pathMatch ? pathMatch[1].toLowerCase() : 'clintoncc';

  const canonical =
    `https://${slug}.groundslive.com` +
    window.location.pathname +
    window.location.search +
    window.location.hash;

  // Preserve current document state — `replace()` avoids leaving the
  // bad URL in browser history. The auth hash (#access_token=…) is
  // carried into the new URL by string concat above.
  window.location.replace(canonical);
})();

// v0.10.16 — bootstrap GA4 once at app start. If the env var isn't
// set (local dev, or production before the property is created),
// init() silently no-ops and every later trackEvent is a cheap
// no-op too. Safe to ship without an ID; nothing leaks until Marc
// fills in VITE_GA4_MEMBER_ID.
initAnalytics(import.meta.env.VITE_GA4_MEMBER_ID);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
