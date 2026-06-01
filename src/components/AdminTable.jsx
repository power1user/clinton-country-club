// AdminTable — v0.11.3 (Phase 12).
//
// Reusable table primitive for the desktop admin. Sections that
// were dense card lists on mobile (Members, Food Orders, Event
// RSVPs, Badges) get a real table when rendered at ≥ 1024 px so
// managers can scan dozens of rows at a glance without endless
// scrolling.
//
// Mobile + tablet keep the card pattern — this component is
// deliberately desktop-shaped (header row, fixed cell heights,
// hover states tuned for mouse). Sections decide whether to mount
// it via useViewport.isDesktop.
//
// Props:
//   columns: [{
//     key:       stable column id (used for sort state + react key)
//     label:     header text
//     sortable?: boolean (default false)
//     align?:    'left' | 'right' | 'center' (default 'left')
//     width?:    CSS width string (e.g. '140px' or '20%')
//     render?:   (row) => ReactNode (defaults to row[key])
//     sortVal?:  (row) => primitive (defaults to row[key])
//   }, ...]
//   rows:      array of records
//   onRowClick?: (row) => void — full-row tap target
//   rowKey?:   (row) => string | number (defaults to row.id)
//   empty?:    string | ReactNode rendered when rows.length === 0
//   loading?:  boolean — renders a small inline spinner
//   selectable?: boolean — adds a checkbox column + bulk-select state
//                (selection is local; consumers wire bulk actions
//                via the onSelectionChange callback)
//   onSelectionChange?: (Set<rowKey>) => void
//
// Sort is single-column (click header twice to descend, third
// click to clear). Multi-column sort is a v0.11.x follow-up
// if managers ask for it.

import { useState, useMemo } from 'react';
import { G } from '../theme.js';

export default function AdminTable({
  columns,
  rows,
  onRowClick,
  rowKey = (r) => r.id,
  empty = 'No rows to show.',
  loading = false,
  selectable = false,
  onSelectionChange,
}) {
  // sort: { key, dir } | null. Clicking a sortable column header
  // cycles asc → desc → null.
  const [sort, setSort] = useState(null);
  const [selected, setSelected] = useState(() => new Set());

  // Apply the current sort to a copy of rows. When sort is null
  // the rows pass through in their incoming order so consumers
  // retain control of the default ordering.
  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find(c => c.key === sort.key);
    if (!col) return rows;
    const valOf = col.sortVal || ((r) => r[col.key]);
    const dir = sort.dir === 'desc' ? -1 : 1;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = valOf(a);
      const bv = valOf(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1 * dir;
      if (bv == null) return -1 * dir;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    return copy;
  }, [rows, sort, columns]);

  const cycleSort = (key) => {
    setSort(prev => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null; // clear sort
    });
  };

  const toggleOne = (k) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      onSelectionChange?.(next);
      return next;
    });
  };
  const toggleAll = () => {
    setSelected(prev => {
      const allKeys = sortedRows.map(rowKey);
      const allSelected = allKeys.every(k => prev.has(k));
      const next = new Set();
      if (!allSelected) allKeys.forEach(k => next.add(k));
      onSelectionChange?.(next);
      return next;
    });
  };

  const allSelected = selectable && sortedRows.length > 0
    && sortedRows.every(r => selected.has(rowKey(r)));
  const someSelected = selectable
    && sortedRows.some(r => selected.has(rowKey(r)))
    && !allSelected;

  return (
    <div style={{
      background: G.card,
      border: `1px solid ${G.border}`,
      borderRadius: 6,
      overflow: 'hidden',
    }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: '"Lora",serif',
        fontSize: 13,
        color: G.text,
      }}>
        <thead>
          <tr style={{ background: G.bg, borderBottom: `1px solid ${G.border}` }}>
            {selectable && (
              <th style={{ width: 36, padding: '10px 12px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={el => { if (el) el.indeterminate = someSelected; }}
                  onChange={toggleAll}
                  aria-label="Select all"
                />
              </th>
            )}
            {columns.map(col => {
              const isActive = sort?.key === col.key;
              const arrow = !isActive ? null : sort.dir === 'asc' ? '▲' : '▼';
              return (
                <th
                  key={col.key}
                  onClick={col.sortable ? () => cycleSort(col.key) : undefined}
                  style={{
                    padding: '10px 14px',
                    textAlign: col.align || 'left',
                    width: col.width,
                    fontFamily: '"Lora",serif',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: G.muted,
                    cursor: col.sortable ? 'pointer' : 'default',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col.label}
                  {arrow && (
                    <span style={{ marginLeft: 6, color: G.brass }}>{arrow}</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)} style={{ padding: '24px', textAlign: 'center', color: G.muted, fontStyle: 'italic' }}>
                Loading…
              </td>
            </tr>
          )}
          {!loading && sortedRows.length === 0 && (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)} style={{ padding: '32px', textAlign: 'center', color: G.muted, fontStyle: 'italic' }}>
                {empty}
              </td>
            </tr>
          )}
          {!loading && sortedRows.map((row, i) => {
            const k = rowKey(row);
            const isSel = selectable && selected.has(k);
            return (
              <tr
                key={k}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={{
                  cursor: onRowClick ? 'pointer' : 'default',
                  background: isSel ? 'rgba(155,122,30,0.06)' : i % 2 === 0 ? '#FFFFFF' : G.bg,
                  borderBottom: `1px solid ${G.border}`,
                  transition: 'background 0.12s',
                }}
                onMouseEnter={onRowClick ? (e) => { e.currentTarget.style.background = isSel ? 'rgba(155,122,30,0.12)' : G.card; } : undefined}
                onMouseLeave={onRowClick ? (e) => { e.currentTarget.style.background = isSel ? 'rgba(155,122,30,0.06)' : i % 2 === 0 ? '#FFFFFF' : G.bg; } : undefined}
              >
                {selectable && (
                  <td style={{ width: 36, padding: '10px 12px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={isSel} onChange={() => toggleOne(k)} aria-label="Select row" />
                  </td>
                )}
                {columns.map(col => (
                  <td key={col.key} style={{
                    padding: '10px 14px',
                    textAlign: col.align || 'left',
                    width: col.width,
                    verticalAlign: 'middle',
                  }}>
                    {col.render ? col.render(row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
