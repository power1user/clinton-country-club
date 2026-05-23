// Per-screen scroll position persistence. Drop into any screen with a
// scrollable container — the user's scroll position is preserved
// across drill-downs + browser-back without React re-renders.
//
//   const [scrollRef, onScroll] = useScrollRestore();
//   ...
//   <div ref={scrollRef} onScroll={onScroll} style={{ overflowY: 'auto' }}>
//     ... scrolling content ...
//   </div>
//
// Position is stamped on the current nav-stack entry (or the tab root)
// inside useNav's _saveScroll/_restoreScroll helpers, so going back to
// a screen lands the user exactly where they left off.
import { useEffect, useRef } from 'react';
import { useNav } from './useNav.jsx';

export function useScrollRestore() {
  const { _saveScroll, _restoreScroll, current } = useNav();
  const ref = useRef(null);

  // Restore on mount (or when the active screen entry changes).
  // current.key changes per pushed entry, current.id changes when the
  // nav root switches — depending on either covers both tab-root
  // re-mounts and drill-down re-mounts.
  useEffect(() => {
    if (!ref.current) return;
    const y = _restoreScroll();
    // Schedule on next frame so the browser has laid out children first
    requestAnimationFrame(() => {
      if (ref.current) ref.current.scrollTop = y;
    });
  }, [current?.key, current?.id]);

  const onScroll = (e) => {
    _saveScroll(e.target.scrollTop);
  };

  return [ref, onScroll];
}
