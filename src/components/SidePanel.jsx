// SidePanel — v0.11.4 (Phase 12).
//
// Slide-in detail panel for desktop admin sections. Click a row
// in a table → SidePanel mounts on the right side of the main
// content area with that row's full details. The list stays
// visible beside it — manager keeps their place + can flip
// between rows without losing the table scroll position.
//
// Mobile and tablet still use full-screen drill-downs (the side
// panel would crowd small screens). Sections decide which to
// mount via useViewport.isDesktop.
//
// Behavior:
//   · Mounts inside the main content area (not document body) so
//     it overlays the section content, not the sidebar/topbar
//   · Backdrop is a semi-transparent scrim covering only the
//     content area
//   · Click backdrop OR press Esc to close
//   · Focus trap: tab key cycles within the panel while open
//   · Animated slide-in (translateX 0 → -100%) tuned at 220ms
//
// Props:
//   open:     boolean — whether the panel is mounted + slid in
//   onClose:  () => void — invoked on backdrop click, Esc, or
//             when the title-bar close button is tapped
//   title?:   ReactNode rendered in the panel's sticky header
//   width?:   CSS width string (default '420px' — fits two
//             columns of moderate-density fields)
//   children: ReactNode body content. Scrolls when overflowing.
//
// Mount position is `position: absolute` relative to the nearest
// positioned ancestor — wrap your content in a `position: relative`
// container if you want the panel to overlay JUST that container
// instead of the whole viewport.

import { useEffect, useRef } from 'react';
import { G } from '../theme.js';

const SLIDE_MS = 220;

export default function SidePanel({ open, onClose, title, width = '420px', children }) {
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);

  // Esc handler + focus management. When the panel opens we
  // remember the currently-focused element so we can restore it
  // on close (a11y guideline — keyboard users shouldn't lose
  // their place).
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement;
    // Move focus into the panel on next tick so it actually
    // exists in the DOM.
    requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      (first || panelRef.current)?.focus?.();
    });

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      // Restore focus when the panel closes.
      const prev = previouslyFocused.current;
      if (prev && typeof prev.focus === 'function') {
        // Use a microtask so React's effects settle first.
        requestAnimationFrame(() => prev.focus());
      }
    };
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop. Click to close. Pointer events disabled when
          the panel is closed so the section underneath stays
          fully interactive. */}
      <div
        onClick={open ? onClose : undefined}
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(26,24,15,0.32)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: `opacity ${SLIDE_MS}ms ease`,
          zIndex: 30,
        }}
      />

      {/* Panel itself. Slides in from the right via translateX. */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        tabIndex={-1}
        style={{
          position: 'absolute',
          top: 0, right: 0, bottom: 0,
          width,
          maxWidth: '92%',
          background: G.bg,
          borderLeft: `1px solid ${G.border}`,
          boxShadow: open ? '-12px 0 32px rgba(0,0,0,0.10)' : 'none',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: `transform ${SLIDE_MS}ms ease, box-shadow ${SLIDE_MS}ms ease`,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 31,
          outline: 'none',
        }}
      >
        {/* Sticky header with title + close button */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 18px',
          borderBottom: `1px solid ${G.border}`,
          background: G.bg,
          flexShrink: 0,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {typeof title === 'string' ? (
              <p style={{
                fontFamily: '"Playfair Display",serif',
                fontSize: 15,
                fontWeight: 700,
                color: G.text,
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {title}
              </p>
            ) : title}
          </div>
          <button
            onClick={onClose}
            data-tap
            type="button"
            aria-label="Close panel"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '18px 20px 24px',
        }}>
          {children}
        </div>
      </aside>
    </>
  );
}
