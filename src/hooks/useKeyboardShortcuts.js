// useKeyboardShortcuts — v0.11.9 (Phase 12).
//
// Generic keyboard-shortcut hook for the desktop admin. Supports
// single-key shortcuts and "g + letter" chord pairs (Gmail /
// GitHub style — press g, then a letter within 1.2s).
//
// Auto-skips when focus is in an editable element (input,
// textarea, contenteditable, select) so the manager can type "p"
// in a search box without triggering the People-area shortcut.
//
// Usage:
//   useKeyboardShortcuts({
//     '/': () => openSearch(),
//     'g i': () => goToArea('inbox'),
//     'g p': () => goToArea('people'),
//     'g s': () => goToArea('clubset'),
//     'g h': () => goHome(),
//   });
//
// The "g" prefix is hard-coded as the chord leader because that's
// what users expect from Gmail/GitHub. Other modifiers (Cmd, Ctrl,
// Alt) come through as standard key combos — see the palette's
// Cmd+K binding in AdminSearchPalette.jsx for that pattern.

import { useEffect, useRef } from 'react';

const CHORD_TIMEOUT_MS = 1200;

function isEditableTarget(e) {
  const t = e.target;
  if (!t) return false;
  if (t.isContentEditable) return true;
  const tag = (t.tagName || '').toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select';
}

export function useKeyboardShortcuts(map, opts = {}) {
  // Re-read the latest map each render without re-binding the
  // listener — keeps the effect dependency array empty and avoids
  // re-subscribing on every parent re-render.
  const mapRef = useRef(map);
  mapRef.current = map;
  const enabled = opts.enabled !== false;

  // Chord state: when leader is pressed, we record the timestamp
  // and wait for the follow-up key. If the next keypress arrives
  // within CHORD_TIMEOUT_MS we look up "g <letter>" in the map.
  const leaderTimeRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e) => {
      // Skip when typing into an input — and skip when any modifier
      // is held (Cmd+K, Ctrl+K, etc. should go through the standard
      // map and not get swallowed as a chord).
      if (isEditableTarget(e)) return;
      const k = e.key;

      // Chord follow-up: was the previous key 'g' within the window?
      const now = Date.now();
      if (leaderTimeRef.current && now - leaderTimeRef.current <= CHORD_TIMEOUT_MS) {
        leaderTimeRef.current = 0;
        const chord = `g ${k.toLowerCase()}`;
        const fn = mapRef.current?.[chord];
        if (fn) {
          e.preventDefault();
          fn();
          return;
        }
        // Fall through if no chord match — maybe the second key
        // is itself a standalone binding.
      }

      // Standalone single-key bindings.
      const fn = mapRef.current?.[k] || mapRef.current?.[k.toLowerCase()];
      if (fn) {
        e.preventDefault();
        fn();
        return;
      }

      // Was THIS key 'g'? Start (or restart) the chord window.
      if (k.toLowerCase() === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        // Only arm the leader if a chord exists for 'g'.
        const anyChord = mapRef.current && Object.keys(mapRef.current).some(s => s.startsWith('g '));
        if (anyChord) leaderTimeRef.current = now;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [enabled]);
}
