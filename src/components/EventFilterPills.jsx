// EventFilterPills — horizontally scrollable category filter strip
// for upcoming event lists (v0.10.7).
//
// Props:
//   events           — array of event objects (uses .cat per the
//                      useEvents() shape; falls back to .category)
//   selectedCategories — array of currently-selected category
//                      strings. Empty array = "All" (no filter)
//   onChange         — (nextArray) => void. Receives the new
//                      selected array; persistence is the caller's
//                      job (useUserPreference handles it cleanly).
//
// Behavior:
//   · Derives distinct categories from events where event_date is
//     today or future. Past events don't influence the pill set.
//   · An "All" pill always appears first. Active when no specific
//     categories are selected. Tapping it clears any selection.
//   · Category pills are multi-select. Tapping a pill toggles its
//     membership in the selection. Multiple can be active at once.
//   · If only one category exists across all upcoming events, the
//     whole strip hides — filtering would be meaningless.
//   · Tapping all category pills off returns to "All" automatically
//     (caller receives an empty array).

import { useMemo } from 'react';
import { G } from '../theme.js';

function isoToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function EventFilterPills({ events = [], selectedCategories = [], onChange }) {
  const categories = useMemo(() => {
    const today = isoToday();
    const set = new Set();
    for (const e of events) {
      if (!e.eventDate) continue;
      if (String(e.eventDate).slice(0, 10) < today) continue;
      const cat = e.cat || e.category;
      if (cat) set.add(cat);
    }
    return [...set].sort();
  }, [events]);

  // Single-category clubs get no filter strip — filtering by the
  // only category equals "All", so showing the row is just noise.
  if (categories.length <= 1) return null;

  const isAllActive = !selectedCategories || selectedCategories.length === 0;

  const togglePill = (cat) => {
    const next = new Set(selectedCategories || []);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    onChange?.([...next]);
  };

  const tapAll = () => {
    if (!isAllActive) onChange?.([]);
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        paddingBottom: 4,
        marginBottom: 10,
      }}
    >
      <Pill label="All" active={isAllActive} onClick={tapAll} />
      {categories.map(cat => (
        <Pill
          key={cat}
          label={cat}
          active={(selectedCategories || []).includes(cat)}
          onClick={() => togglePill(cat)}
        />
      ))}
    </div>
  );
}

function Pill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      data-tap
      type="button"
      style={{
        flexShrink: 0,
        padding: '6px 14px',
        borderRadius: 16,
        cursor: 'pointer',
        background: active ? G.green : G.card,
        color: active ? '#F2EDE0' : G.text,
        border: `1px solid ${active ? G.green : G.border}`,
        fontFamily: '"Lora",serif',
        fontSize: 12,
        fontWeight: active ? 600 : 500,
        letterSpacing: '0.02em',
        transition: 'background 0.12s, color 0.12s',
      }}
    >
      {label}
    </button>
  );
}
