// useModalBackClose — v0.15.30 (was v0.15.23)
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
// v0.15.30 fix — the v0.15.23 cleanup-flag approach only protected
// the PROGRAMMATIC-close path (scenario B). The REAL-user-back-gesture
// path (scenario A) was still broken: AdminPanel's popstate listener
// registers on mount (early); this hook's listener registers when the
// modal opens (later). DOM listeners fire in registration order, so
// AdminPanel ran first, saw no flags, and unwound `sec` BEFORE this
// hook got its chance — exactly the "mobile back exits admin" bug.
//
// The fix is a module-level `modalOpenCount` (incremented on mount,
// decremented in cleanup) that AdminPanel checks. Cleanup orders the
// decrement AFTER history.back() so the synthetic popstate also sees
// count > 0. Result: while ANY modal is mounted, AdminPanel skips its
// unwind logic — regardless of who fires popstate first.

import { useEffect, useRef } from 'react';

// Module-level state read by AdminPanel.jsx. ES module `let` exports
// stay live on the import side, so updates here are visible there.
//
// MODAL_CLEANUP_IN_FLIGHT — kept for paranoid belt-and-suspenders;
// modalOpenCount alone would actually suffice, but a stale flag is
// cheap insurance against future refactors that touch the lifecycle.
export let MODAL_CLEANUP_IN_FLIGHT = false;

// Number of modals currently open (incremented on mount, decremented
// in cleanup). AdminPanel's popstate handler bails when this is > 0.
let modalOpenCount = 0;
export function getModalOpenCount() { return modalOpenCount; }

export function useModalBackClose(isOpen, onClose) {
  const closedByPopstateRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    closedByPopstateRef.current = false;

    // Modal is mounted — claim our slot. Decremented in cleanup below.
    modalOpenCount += 1;

    // Mark our history entry so we can tell on cleanup whether we
    // still own it (i.e. popstate hasn't already popped us).
    window.history.pushState({ modalOpen: true }, '');

    const onPop = () => {
      closedByPopstateRef.current = true;
      onClose?.();
    };
    window.addEventListener('popstate', onPop);

    return () => {
      window.removeEventListener('popstate', onPop);

      const needsBackPop =
        !closedByPopstateRef.current && window.history.state?.modalOpen;

      if (needsBackPop) {
        // Programmatic close: we need to pop our marker entry so the
        // back-stack stays sane. Order matters: history.back() queues
        // a popstate task; we want AdminPanel.onPop to see count > 0
        // when that task runs, so DON'T decrement yet — decrement on
        // a setTimeout that runs AFTER the popstate task.
        MODAL_CLEANUP_IN_FLIGHT = true;
        window.history.back();
        setTimeout(() => {
          MODAL_CLEANUP_IN_FLIGHT = false;
          modalOpenCount = Math.max(0, modalOpenCount - 1);
        }, 0);
      } else {
        // popstate already popped our entry (real user back gesture):
        // count is still incremented from mount, decrement now.
        modalOpenCount = Math.max(0, modalOpenCount - 1);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
}
