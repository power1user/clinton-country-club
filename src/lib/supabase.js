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

export const CLUB_SLUG = import.meta.env.VITE_DEFAULT_CLUB_SLUG || 'windhaven';
