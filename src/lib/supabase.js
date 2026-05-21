import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Don't throw — let the app boot with mock data when env isn't configured yet.
  // Screens that need Supabase should check `isConfigured` before querying.
  console.warn('[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set. Running in mock-data mode.');
}

export const isConfigured = Boolean(url && anonKey);

export const supabase = isConfigured
  ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

// Club slug resolution order:
//   1. ?club=slug query param        (dev / preview overrides)
//   2. <subdomain>.groundslive.com   (production)
//   3. VITE_DEFAULT_CLUB_SLUG env    (dev local builds)
//   4. 'clintoncc' hardcoded fallback (so the app never boots blank)
function resolveClubSlug() {
  if (typeof window === 'undefined') {
    return import.meta.env.VITE_DEFAULT_CLUB_SLUG || 'clintoncc';
  }
  // 1. query param override
  const qp = new URLSearchParams(window.location.search).get('club');
  if (qp) return qp;
  // 2. subdomain on groundslive.com (skip 'www' — that's the marketing host)
  const m = window.location.hostname.match(/^([a-z0-9-]+)\.groundslive\.com$/i);
  if (m && m[1] !== 'www') return m[1].toLowerCase();
  // 3. env var fallback
  if (import.meta.env.VITE_DEFAULT_CLUB_SLUG) return import.meta.env.VITE_DEFAULT_CLUB_SLUG;
  // 4. last resort — avoid blank-club boot
  return 'clintoncc';
}

export const CLUB_SLUG = resolveClubSlug();
