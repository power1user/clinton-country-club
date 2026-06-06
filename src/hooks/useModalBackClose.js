// useModalBackClose — v0.15.15
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

import { useEffect, useRef } from 'react';

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
        window.history.back();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
}
