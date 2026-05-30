// useAdminPreference — read/write a per-admin preference (v0.11.6).
//
// Parallel hook to useUserPreference (v0.10.7) but for the ADMIN
// surface. Where member preferences are keyed by (member_id, key),
// admin preferences are keyed by (auth user_id, club_id?, key) —
// see migration 61 for the schema rationale. The TL;DR: super_
// admins don't have member rows in every club, so admin UI state
// has to live on the auth identity to travel cross-club.
//
// Usage:
//   const [collapsed, setCollapsed, ready] = useAdminPreference(
//     'sidebar_collapsed',
//     [],
//     { clubScoped: false }, // optional — defaults to club-scoped
//   );
//
//   setCollapsed(['inbox', 'platform']);
//
// `clubScoped: true` (default) writes to (user_id, current club_id,
// key). `clubScoped: false` writes to (user_id, NULL, key) for
// preferences that should follow the admin across every club they
// touch (theme, keyboard shortcuts, etc.).
//
// Writes debounced at 400ms. Flushed on unmount. Loads once per
// (user_id, club_id?, key) change.

import { useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth.jsx';
import { supabase, isConfigured } from '../lib/supabase.js';

const WRITE_DEBOUNCE_MS = 400;

export function useAdminPreference(key, defaultValue, opts = {}) {
  const clubScoped = opts.clubScoped !== false; // default true
  const { session, club } = useAuth();
  const userId = session?.user?.id;
  const clubId = clubScoped ? club?.id || null : null;

  const [value, setValueState] = useState(defaultValue);
  const [ready, setReady] = useState(false);
  const writeTimer = useRef(null);
  const latestRef = useRef(defaultValue);

  useEffect(() => {
    if (!isConfigured || !userId) {
      setValueState(defaultValue);
      latestRef.current = defaultValue;
      setReady(true);
      return;
    }
    let cancelled = false;
    setReady(false);
    (async () => {
      let q = supabase
        .from('admin_preferences')
        .select('value')
        .eq('user_id', userId)
        .eq('key', key);
      q = clubId ? q.eq('club_id', clubId) : q.is('club_id', null);
      const { data } = await q.maybeSingle();
      if (cancelled) return;
      const v = data ? data.value : defaultValue;
      setValueState(v);
      latestRef.current = v;
      setReady(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, clubId, key]);

  const setValue = (next) => {
    const resolved = typeof next === 'function' ? next(latestRef.current) : next;
    setValueState(resolved);
    latestRef.current = resolved;
    if (!isConfigured || !userId) return;
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(async () => {
      await supabase
        .from('admin_preferences')
        .upsert(
          { user_id: userId, club_id: clubId, key, value: resolved },
          { onConflict: 'user_id,club_id,key' },
        );
    }, WRITE_DEBOUNCE_MS);
  };

  useEffect(() => () => {
    if (writeTimer.current) {
      clearTimeout(writeTimer.current);
      if (isConfigured && userId) {
        supabase.from('admin_preferences').upsert(
          { user_id: userId, club_id: clubId, key, value: latestRef.current },
          { onConflict: 'user_id,club_id,key' },
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [value, setValue, ready];
}
