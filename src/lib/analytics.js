// Analytics — Google Analytics 4 bootstrap + low-level helpers (v0.10.16).
//
// The member-app GA4 property is shared across every club subdomain
// (same React build, same property) — per-club segmentation happens
// via the `club_id` custom dimension we attach to every event. A
// SEPARATE GA4 property covers the marketing landing page (separate
// repo, separate property — see the v0.10.16 CHANGELOG entry).
//
// Bootstrap pattern: `init()` is called once from main.jsx with the
// VITE_GA4_MEMBER_ID env var. If the env var is unset (e.g. local
// dev, or production before the property is created), `init()`
// silently no-ops — every later `trackEvent` / `trackPageView` call
// is a cheap no-op too. No data leaks, no console noise.
//
// Auth gate: GA4 is disabled for guests and for unauthenticated
// sessions. The auth-aware wrapper (useAnalytics hook) is the
// canonical entry point — direct calls to this module are reserved
// for the bootstrap path in main.jsx.
//
// PII policy: NEVER include member names, emails, membership
// numbers, or any other personally-identifying field in event
// params. `club_id` is the only non-anonymous identifier we send
// — and that's a club-scoping value, not a person-scoping value.

const ENABLED_KEY = '__grounds_ga4_enabled';
let measurementId = null;
let initialized = false;

// `init` loads gtag.js once. Safe to call multiple times — second
// and subsequent calls are no-ops. Returns true if the property
// is wired (measurement id set + script injected), false otherwise
// so callers can branch on the eligibility.
export function init(id) {
  if (initialized || !id || typeof document === 'undefined') {
    return initialized;
  }
  measurementId = id;
  // Inject the gtag library asynchronously so it doesn't block
  // app render.
  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  script.async = true;
  document.head.appendChild(script);
  // Bootstrap the dataLayer + gtag stub before the script loads
  // so events queued during init still flush once gtag is ready.
  window.dataLayer = window.dataLayer || [];
  // eslint-disable-next-line no-inner-declarations
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  // send_page_view: false — we fire page_view manually on every
  // useNav transition (App.jsx) so SPAs report views accurately.
  gtag('config', id, { send_page_view: false });
  window[ENABLED_KEY] = true;
  initialized = true;
  return true;
}

// Internal helper — returns true when the property + gtag are
// loaded and ready to accept events. All higher-level helpers
// gate on this.
function isReady() {
  return initialized && typeof window !== 'undefined' && typeof window.gtag === 'function';
}

// `sendEvent` is the low-level dispatcher. The auth-aware hook
// (useAnalytics) layers club_id + member/guest gating on top.
//
// PII policy enforcement is the CALLER's responsibility — this
// function passes `params` through unchanged. Keep the call sites
// honest.
export function sendEvent(name, params) {
  if (!isReady() || !name) return;
  window.gtag('event', name, params || {});
}

// Page-view variant. Manual call here (not gtag's auto-tracking)
// because the app routes via useNav internally — gtag's URL-watch
// would only catch real navigation events, missing every SPA
// transition between screens.
export function sendPageView({ screen, club_id }) {
  if (!isReady() || !screen) return;
  window.gtag('event', 'page_view', {
    page_title: screen,
    page_path: `/${screen}`,
    page_location: typeof window !== 'undefined' ? window.location.href : undefined,
    club_id: club_id || undefined,
  });
}

// Reset hook for tests. NOT exported in the index — accessible
// only by importing the file directly.
export function _resetForTests() {
  measurementId = null;
  initialized = false;
  if (typeof window !== 'undefined') {
    delete window[ENABLED_KEY];
    delete window.dataLayer;
    delete window.gtag;
  }
}
