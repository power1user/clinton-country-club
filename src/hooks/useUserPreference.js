// useUserPreference — read/write a per-member preference (v0.10.7).
//
// Generic key-value store backed by the user_preferences table
// (migration 58). One row per (member_id, key). Use for any
// per-member setting that doesn't merit its own column on members
// — pill filter selections, default views, notification mute lists,
// etc.
//
// Usage:
//   const [cats, setCats, ready] = useUserPreference(
//     'events_filter_categories',
//     [],          // default until first load resolves
//   );
//
//   // `ready` flips to true once the initial read completes. Use
//   // this to delay rendering filtered content so the member sees
//   // their saved selection on first paint instead of a flash of
//   // unfiltered output.
//
//   setCats(['Golf', 'Dining']);   // upserts to DB, updates state
//
// Implementation notes:
//   · Guests don't have a member row, so this hook short-circuits
//     for them — `ready` becomes true immediately with the default
//     value and writes are no-ops.
//   · Writes are debounced 400ms so dragging a slider or toggling
//     pills rapidly doesn't pummel the DB. The last value within
//     the window wins.
//   · No realtime subscription — preferences are per-device-and-
//     account UX state; cross-device sync isn't required and would
//     bring flicker (your draft on mobile reset by your desktop).
//     Each device reads on mount, writes on change, and trusts its
//     own cache.

import { useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth.jsx';
import { supabase, isConfigured } from '../lib/supabase.js';

const WRITE_DEBOUNCE_MS = 400;

export function useUserPreference(key, defaultValue) {
  const { club, member, isGuest } = useAuth();
  const [value, setValueState] = useState(defaultValue);
  const [ready, setReady] = useState(false);
  const writeTimer = useRef(null);
  const latestRef = useRef(defaultValue);

  // Initial read — once per (member, key) change. If we're a guest
  // or unconfigured, skip the round-trip and resolve to the default
  // immediately so consumers don't wait forever.
  useEffect(() => {
    if (!isConfigured || !member?.id || !club?.id || isGuest) {
      setValueState(defaultValue);
      latestRef.current = defaultValue;
      setReady(true);
      return;
    }
    let cancelled = false;
    setReady(false);
    (async () => {
      const { data } = await supabase
        .from('user_preferences')
        .select('value')
        .eq('member_id', member.id)
        .eq('key', key)
        .maybeSingle();
      if (cancelled) return;
      const v = data ? data.value : defaultValue;
      setValueState(v);
      latestRef.current = v;
      setReady(true);
    })();
    return () => { cancelled = true; };
    // Intentionally NOT depending on defaultValue — a parent passing
    // an inline array/object literal would otherwise cause an infinite
    // re-read. The default is only used when no DB row exists.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [club?.id, member?.id, key, isGuest]);

  const setValue = (next) => {
    // Support functional updater pattern, like useState
    const resolved = typeof next === 'function' ? next(latestRef.current) : next;
    setValueState(resolved);
    latestRef.current = resolved;
    if (!isConfigured || !member?.id || !club?.id || isGuest) return;
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(async () => {
      await supabase
        .from('user_preferences')
        .upsert(
          { club_id: club.id, member_id: member.id, key, value: resolved },
          { onConflict: 'member_id,key' },
        );
    }, WRITE_DEBOUNCE_MS);
  };

  // Flush any pending write on unmount so a rapid back-nav doesn't
  // lose the last edit.
  useEffect(() => () => {
    if (writeTimer.current) {
      clearTimeout(writeTimer.current);
      if (isConfigured && member?.id && club?.id && !isGuest) {
        supabase.from('user_preferences').upsert(
          { club_id: club.id, member_id: member.id, key, value: latestRef.current },
          { onConflict: 'member_id,key' },
        );
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [value, setValue, ready];
}
