// ConfirmModal — shared confirm-dialog component (v0.16.8, audit #g).
//
// Replaces native browser `confirm()` / `alert()` calls across the app.
// Previously every destructive action used the OS dialog, which:
//   - is inconsistent with the rest of the app's design language
//   - can't show rich UI (the warning red, danger styling, etc.)
//   - on some PWAs / mobile contexts is suppressed or styled weirdly
//   - can't be audited (no logs of what was confirmed)
//
// Usage:
//   import { useConfirm } from '../components/ConfirmModal.jsx';
//
//   function MyComponent() {
//     const confirmAsync = useConfirm();
//     const onDelete = async () => {
//       if (!(await confirmAsync({
//         title: 'Delete this item?',
//         body: 'This cannot be undone.',
//         confirmLabel: 'Delete',
//         danger: true,
//       }))) return;
//       // ...proceed with delete
//     };
//   }
//
// Mount <ConfirmProvider> ONCE near the app root (in App.jsx). It
// wraps children and exposes the dialog via React context.

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { G } from '../theme.js';

const ConfirmCtx = createContext(null);

/**
 * Hook returning a `confirmAsync(opts)` function. The returned promise
 * resolves to `true` if the user clicked the confirm button, `false`
 * if they cancelled (cancel button, ESC, backdrop click).
 *
 * opts:
 *   - title         (string, required) — dialog headline
 *   - body          (string) — supporting paragraph; optional
 *   - confirmLabel  (string) — defaults to "Confirm"
 *   - cancelLabel   (string) — defaults to "Cancel"
 *   - danger        (boolean) — red Confirm button instead of green
 *   - kind          ('confirm' | 'alert') — 'alert' hides the cancel
 *                   button and resolves to true on either close path
 */
export function useConfirm() {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) {
    // Defensive: if a component calls useConfirm outside ConfirmProvider,
    // fall back to native confirm so we never silently fail. Logged so
    // someone notices.
    console.warn('[ConfirmModal] useConfirm called outside ConfirmProvider — falling back to native confirm()');
    return (opts) => Promise.resolve(window.confirm(opts?.title || 'Confirm?'));
  }
  return ctx;
}

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);

  const confirmAsync = useCallback((opts) => {
    return new Promise((resolve) => {
      setState({ ...opts, resolve });
    });
  }, []);

  const close = useCallback((result) => {
    if (state) {
      state.resolve(result);
      setState(null);
    }
  }, [state]);

  // ESC closes (returns false for confirm; true for alert since it's
  // informational and the user has acknowledged it).
  useEffect(() => {
    if (!state) return;
    const onKey = (e) => {
      if (e.key === 'Escape') close(state.kind === 'alert');
      // Enter confirms (when there's something to confirm; for alerts
      // Enter also closes since it's "OK, I see").
      if (e.key === 'Enter') close(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, close]);

  return (
    <ConfirmCtx.Provider value={confirmAsync}>
      {children}
      {state && <ConfirmDialog state={state} onClose={close} />}
    </ConfirmCtx.Provider>
  );
}

function ConfirmDialog({ state, onClose }) {
  const {
    title,
    body,
    confirmLabel = 'Confirm',
    cancelLabel  = 'Cancel',
    danger       = false,
    kind         = 'confirm',
  } = state;

  const isAlert = kind === 'alert';
  const confirmBg = danger ? G.clsBg : G.green;
  const confirmFg = '#F2EDE0';

  return (
    <div
      onClick={() => onClose(isAlert)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(26,24,15,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: G.bg,
          borderRadius: 8,
          maxWidth: 420,
          width: '100%',
          padding: '20px 22px 18px',
          boxShadow: '0 20px 48px rgba(0,0,0,0.4)',
          border: `1px solid ${G.border}`,
        }}
      >
        <p
          id="confirm-modal-title"
          style={{
            fontFamily: '"Playfair Display",serif',
            fontSize: 17, fontWeight: 700,
            color: G.text, margin: '0 0 8px',
          }}
        >
          {title}
        </p>
        {body && (
          <p style={{
            fontFamily: '"Lora",serif',
            fontSize: 13,
            color: G.muted,
            margin: '0 0 18px',
            lineHeight: 1.5,
          }}>
            {body}
          </p>
        )}

        <div style={{
          display: 'flex',
          gap: 8,
          justifyContent: 'flex-end',
          marginTop: body ? 0 : 14,
        }}>
          {!isAlert && (
            <div
              onClick={() => onClose(false)}
              data-tap
              style={{
                padding: '10px 18px',
                background: 'transparent',
                border: `1px solid ${G.border}`,
                borderRadius: 4,
                cursor: 'pointer',
                fontFamily: '"Lora",serif',
                fontSize: 13,
                color: G.text,
              }}
            >
              {cancelLabel}
            </div>
          )}
          <div
            onClick={() => onClose(true)}
            data-tap
            style={{
              padding: '10px 20px',
              background: confirmBg,
              border: `1px solid ${confirmBg}`,
              borderRadius: 4,
              cursor: 'pointer',
              fontFamily: '"Lora",serif',
              fontSize: 13,
              fontWeight: 600,
              color: confirmFg,
            }}
          >
            {isAlert ? 'OK' : confirmLabel}
          </div>
        </div>
      </div>
    </div>
  );
}
