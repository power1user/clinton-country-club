// useModalBackClose — v0.15.23 (was v0.15.15 base + v0.15.23 nav-conflict fix)
//
// Lets a modal close when the user taps the mobile browser's back
// button instead of navigating out of the surrounding page. Pushes
// one history entry on open; on popstate, fires onClose. On
// programmatic close (X button, save, etc.) we walk that entry
// back off the stack so we don't leave dangling history.
//
// Why we need this: modals in this app (PersonEditModal,
// DepartmentDetailModal, etc.) are React state, not history-routed.
// On a phone, pressing back while a modal is up pops the surrounding
// page (the entire admin section!) instead of just dismissing the
// modal. Native apps + most modern web apps tie a modal to a history
// entry so back-gesture closes it; this hook is that.
//
// Usage:
//   useModalBackClose(isOpen, onClose)
//
// One subtle race: if React's cleanup runs AFTER popstate already
// fired (user tapped back), we shouldn't call history.back() again
// — that would skip past the surrounding page entry. A ref tracks
// whether onClose was reached via popstate.
//
// v0.15.23 fix — coordination with AdminPanel's admin-nav popstate
// handler (v0.15.17). When a modal closes PROGRAMMATICALLY (Save,
// X, etc.) we call `window.history.back()` to pop our marker entry.
// That fires popstate, which AdminPanel was interpreting as a user
// back-gesture and using to unwind one nav level (clearing `sec`).
// Result: every modal Save was secretly booting the user up to the
// section-list — and on mobile that read as "exited admin." The
// MODAL_CLEANUP_IN_FLIGHT exported flag tells the admin handler
// "this popstate came from us cleaning up, don't react." Self-clears
// on next macrotask so it can't poison subsequent real back gestures.

import { useEffect, useRef } from 'react';

// Module-level flag. AdminPanel.jsx imports this binding and reads it
// in its popstate handler. ES module `let` exports update live on the
// import side, so flipping it here is visible to AdminPanel immediately.
export let MODAL_CLEANUP_IN_FLIGHT = false;

export function useModalBackClose(isOpen, onClose) {
  const closedByPopstateRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    closedByPopstateRef.current = false;
    // Mark our entry so we can tell on cleanup whether we still own it.
    window.history.pushState({ modalOpen: true }, '');
    const onPop = () => {
      closedByPopstateRef.current = true;
      onClose?.();
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      // Programmatic close: pop our entry so the back-stack stays sane.
      // If popstate already fired, the entry's already gone — don't
      // call history.back() again (would over-pop into the previous page).
      if (!closedByPopstateRef.current && window.history.state?.modalOpen) {
        // v0.15.23 — Flag our intent so AdminPanel's admin-nav popstate
        // handler doesn't treat this synthetic back as a user gesture.
        // Cleared on the next macrotask, by which time popstate listeners
        // for this back have already run.
        MODAL_CLEANUP_IN_FLIGHT = true;
        window.history.back();
        setTimeout(() => { MODAL_CLEANUP_IN_FLIGHT = false; }, 0);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
}
