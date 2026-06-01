// AdminSearchPalette — v0.11.5 (Phase 12).
//
// Cmd+K / Ctrl+K command-palette overlay for the desktop admin.
// Opens a centered modal with a search input + results list.
// Typing filters across every admin section by label; arrow keys
// + Enter select; Esc closes.
//
// v0.11.5 ships with section-only indexing — searching "members"
// jumps you to People → Manage Members, searching "bann" jumps to
// Broadcasts → Sponsor Banners. Future patches add live member /
// event / order indexing via Supabase, but the palette UI + key
// bindings are the foundation that doesn't change.
//
// Mobile + tablet: palette doesn't mount. The mobile drill-down
// has its own search input inside the admin hub.

import { useEffect, useMemo, useRef, useState } from 'react';
import { G } from '../theme.js';

// Lower-case, accent-stripped haystack — generous fuzzy-ish match
// without pulling in a dependency. "memb" → matches "Manage
// Members", "Member-Guest". "bann" → matches "Sponsor Banners".
function normalize(s) {
  return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
}

// Flatten AREAS into a single searchable list. Each entry knows
// its parent area so the result row can show "Communications ›
// Food Orders" hierarchy.
function buildIndex(areas, sectionVisible) {
  const out = [];
  for (const a of areas) {
    for (const s of a.sections) {
      if (sectionVisible && !sectionVisible(s)) continue;
      out.push({
        type: 'section',
        areaId: a.id,
        areaLabel: a.l,
        sectionId: s.id,
        sectionLabel: s.l,
        haystack: normalize(`${a.l} ${s.l} ${s.d || ''}`),
      });
    }
  }
  return out;
}

export default function AdminSearchPalette({
  areas,
  sectionVisible,
  onPick,
  // v0.11.18 — Open state is now controlled by the parent so the
  // SearchTrigger button click can open the palette too (previously
  // the palette managed its own open state internally and the
  // button's onClick did nothing). The Cmd+K / Ctrl+K listener
  // below also routes through onOpenChange so both surfaces share
  // the same state. Optional — falls back to uncontrolled if the
  // parent doesn't wire them, which keeps backward compat for any
  // future caller.
  open: openProp,
  onOpenChange,
}) {
  const [openInternal, setOpenInternal] = useState(false);
  const isControlled = typeof openProp === 'boolean' && typeof onOpenChange === 'function';
  const open = isControlled ? openProp : openInternal;
  const setOpen = isControlled
    ? (next) => onOpenChange(typeof next === 'function' ? next(open) : next)
    : setOpenInternal;
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Build the section index once per (areas, sectionVisible)
  // change. Re-computing on every keystroke would be wasteful.
  const index = useMemo(() => buildIndex(areas, sectionVisible), [areas, sectionVisible]);

  // Filter the index by the current query. Empty query shows the
  // first 8 entries as a "browse" mode so the palette is useful
  // even before the manager types.
  const results = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return index.slice(0, 8);
    return index
      .filter(it => it.haystack.includes(q))
      .slice(0, 16);
  }, [index, query]);

  // Reset highlight on every result change so users don't end up
  // with an out-of-bounds activeIdx.
  useEffect(() => { setActiveIdx(0); }, [results]);

  // Global key listener — Cmd+K / Ctrl+K toggles the palette.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (open && e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Focus the input when the palette opens.
  useEffect(() => {
    if (open) {
      setQuery('');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Scroll the highlighted row into view when arrow-key navigation
  // moves it off-screen.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector(`[data-row-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx, open]);

  const onInputKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[activeIdx];
      if (r) {
        onPick?.(r);
        setOpen(false);
      }
    }
  };

  if (!open) {
    // Even when closed we render a hidden hint chip with the
    // shortcut so managers discover the feature. The chip lives
    // in the top bar slot consumers wire up themselves; the
    // palette only renders its overlay when open.
    return null;
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(26,24,15,0.42)',
        zIndex: 60,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
      }}
    >
      <div style={{
        width: 560,
        maxWidth: '90vw',
        background: G.bg,
        borderRadius: 10,
        boxShadow: '0 20px 60px rgba(0,0,0,0.30), 0 4px 12px rgba(0,0,0,0.12)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: `1px solid ${G.border}` }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Jump to a section… (try 'members' or 'orders')"
            style={{
              flex: 1, border: 'none', outline: 'none',
              fontFamily: '"Lora",serif', fontSize: 16,
              color: G.text, background: 'transparent',
            }}
          />
          <span style={{
            fontFamily: 'monospace', fontSize: 11,
            color: G.muted,
            background: G.bg, border: `1px solid ${G.border}`,
            padding: '2px 6px', borderRadius: 3,
          }}>esc</span>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ maxHeight: '50vh', overflowY: 'auto', padding: '6px 0' }}>
          {results.length === 0 && (
            <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 15, color: G.muted, textAlign: 'center', padding: '28px 16px', margin: 0 }}>
              No sections match "{query}".
            </p>
          )}
          {results.map((r, i) => (
            <div
              key={`${r.areaId}.${r.sectionId}`}
              data-row-idx={i}
              onMouseEnter={() => setActiveIdx(i)}
              onClick={() => { onPick?.(r); setOpen(false); }}
              data-tap
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 18px',
                background: i === activeIdx ? G.bg : 'transparent',
                cursor: 'pointer',
                borderLeft: `3px solid ${i === activeIdx ? G.brass : 'transparent'}`,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 16, fontWeight: 700, color: G.text, margin: 0, lineHeight: 1.2 }}>
                  {r.sectionLabel}
                </p>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.muted, margin: '3px 0 0' }}>
                  {r.areaLabel}
                </p>
              </div>
              {i === activeIdx && (
                <span style={{
                  fontFamily: 'monospace', fontSize: 12,
                  color: G.brass,
                  background: 'rgba(155,122,30,0.10)',
                  padding: '3px 7px', borderRadius: 3,
                }}>↵</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Small "press Cmd+K" affordance for top bars. Lives next to the
// component so consumers don't have to duplicate the styling.
export function SearchTrigger({ onClick }) {
  // Detect Mac vs Win/Linux for the right modifier label. Falls
  // back to "Ctrl" on SSR.
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '');
  const mod = isMac ? '⌘' : 'Ctrl';
  return (
    <button
      onClick={onClick}
      type="button"
      data-tap
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: G.bg,
        border: `1px solid ${G.border}`,
        borderRadius: 6,
        padding: '8px 12px',
        cursor: 'pointer',
        fontFamily: '"Lora",serif', fontSize: 14,
        color: G.muted,
        minWidth: 240,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      <span style={{ flex: 1, textAlign: 'left' }}>Search admin…</span>
      <span style={{ fontFamily: 'monospace', fontSize: 12, background: '#FFF', border: `1px solid ${G.border}`, padding: '2px 6px', borderRadius: 3 }}>
        {mod}+K
      </span>
    </button>
  );
}
