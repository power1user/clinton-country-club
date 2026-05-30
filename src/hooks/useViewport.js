// useViewport — viewport breakpoint observer (v0.11.0, Phase 12).
//
// Foundation for the responsive admin Phase 12 rollout. The MEMBER
// app stays mobile-PWA-first forever; useViewport exists so the
// ADMIN side can render different layouts at different widths
// without forking the codebase.
//
// Three named viewports:
//   · 'mobile'  — < 768 px  (phones, small tablets in portrait)
//   · 'tablet'  — 768–1023 (iPads, small laptops, split-screen)
//   · 'desktop' — ≥ 1024   (laptops, monitors)
//
// Breakpoint values are CSS pixels (NOT device pixels). Matches the
// Tailwind / Material default ladder so any future CSS framework
// migration doesn't change semantics.
//
// SSR safety: on the server `window` is undefined, so the initial
// render falls back to 'mobile'. The first useEffect tick on the
// client re-resolves once `window.innerWidth` is real. For our PWA
// shipping setup there's no SSR but the guard keeps the hook usable
// in any future static-render context (e.g. a marketing page that
// shares this codebase).
//
// Usage:
//   const { viewport, isDesktop } = useViewport();
//   return isDesktop ? <AdminLayoutDesktop/> : <AdminLayoutMobile/>;
//
// Convenience flags (isMobile/isTablet/isDesktop + the "up" pair)
// exist so callers don't litter strict-equality checks throughout
// the codebase. Pick whichever reads best at the call site.

import { useEffect, useState } from 'react';

// CSS-pixel widths at which we switch ladder rungs. Constants are
// exported so other modules (CSS-in-JS media queries, container
// queries, integration tests) can reuse the same numbers without
// drifting.
export const BREAKPOINT_TABLET  = 768;
export const BREAKPOINT_DESKTOP = 1024;

// Resolve a numeric width to a viewport name. Pure function — easy
// to unit-test if we ever add a test suite to this codebase.
export function viewportForWidth(width) {
  if (width >= BREAKPOINT_DESKTOP) return 'desktop';
  if (width >= BREAKPOINT_TABLET)  return 'tablet';
  return 'mobile';
}

export function useViewport() {
  const [viewport, setViewport] = useState(() => {
    if (typeof window === 'undefined') return 'mobile';
    return viewportForWidth(window.innerWidth);
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Debounce-via-rAF: resize fires dozens of times per second
    // during a window drag; we don't need that resolution and
    // re-rendering AdminPanel on every event would be wasteful.
    // requestAnimationFrame coalesces to one update per frame.
    let frame = null;
    const onResize = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = null;
        const next = viewportForWidth(window.innerWidth);
        setViewport(prev => prev === next ? prev : next);
      });
    };
    window.addEventListener('resize', onResize);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return {
    viewport,
    isMobile:    viewport === 'mobile',
    isTablet:    viewport === 'tablet',
    isDesktop:   viewport === 'desktop',
    // "tablet or larger" — useful for showing the sidebar at all
    isTabletUp:  viewport === 'tablet' || viewport === 'desktop',
    // "desktop or larger" — useful for the fixed 260px sidebar
    isDesktopUp: viewport === 'desktop',
  };
}
