// RecurrencePicker — quick-preset dropdown + inline Custom expansion
// for the EventEditor (v0.19.0). Replaces the v0.12.3 weekly-only
// picker that lived inline in admin/sections.jsx.
//
// Parent owns the recurrence state object (shape: see EMPTY_RECURRENCE
// in lib/recurrence.js). This component only renders + calls onChange.
//
// Layout: a single "Repeat" dropdown with the quick presets. Picking
// "Custom…" expands an inline panel with frequency, interval, day
// selectors, monthly mode, and end condition. A live plain-English
// preview line + occurrence-count preview sits at the bottom.

import { useMemo } from 'react';
import { G } from '../theme.js';
import {
  PRESETS, ORDINALS, WEEKDAY_NAMES_SHORT, WEEKDAY_NAMES_LONG,
  EMPTY_RECURRENCE, MAX_OCCURRENCES,
  presetToCustom, generateOccurrences, describeRecurrence,
  dowOfIso,
} from '../lib/recurrence.js';

export default function RecurrencePicker({ value, onChange, startDate }) {
  const recurrence = value || EMPTY_RECURRENCE;
  const isCustom = recurrence.preset === 'custom';
  const isRecurring = recurrence.preset !== 'none';

  const setPreset = (preset) => {
    onChange(presetToCustom(preset, startDate));
  };

  const setField = (patch) => {
    onChange({ ...recurrence, preset: 'custom', ...patch });
  };

  const setEnd = (patch) => {
    onChange({ ...recurrence, end: { ...recurrence.end, ...patch } });
  };

  const toggleWeekday = (dow) => {
    const set = new Set(recurrence.weekdays || []);
    if (set.has(dow)) set.delete(dow); else set.add(dow);
    // Always keep at least one — if user clears the last, snap to the
    // start date's weekday.
    if (set.size === 0 && startDate != null) set.add(dowOfIso(startDate));
    setField({ weekdays: [...set].sort() });
  };

  // Compute preview occurrences live so the editor shows count + first/last
  // dates before the admin commits an N-row insert.
  const previewDates = useMemo(() => {
    if (!startDate || recurrence.preset === 'none') return [];
    return generateOccurrences(recurrence, startDate);
  }, [recurrence, startDate]);

  const description = useMemo(
    () => describeRecurrence(recurrence, startDate),
    [recurrence, startDate]
  );

  return (
    <div style={panelStyle}>
      <label style={labelStyle}>Repeat</label>
      <select
        value={recurrence.preset}
        onChange={(e) => setPreset(e.target.value)}
        style={inputStyle}
      >
        {PRESETS.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>

      {/* Quick presets show their plain-English summary inline; Custom
          gets the full editor. */}
      {!isCustom && isRecurring && (
        <p style={summaryStyle}>{description}</p>
      )}

      {isCustom && (
        <div style={customPanelStyle}>
          {/* Frequency + interval */}
          <div style={rowStyle}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Frequency</label>
              <select
                value={recurrence.frequency}
                onChange={(e) => setField({ frequency: e.target.value })}
                style={inputStyle}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Every</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={recurrence.interval}
                  onChange={(e) => setField({ interval: Math.max(1, Number(e.target.value) || 1) })}
                  style={{ ...inputStyle, width: 64 }}
                />
                <div style={{
                  display: 'flex', alignItems: 'center',
                  fontFamily: '"Lora",serif', fontSize: 12, color: G.text,
                }}>
                  {unitLabel(recurrence.frequency, recurrence.interval)}
                </div>
              </div>
            </div>
          </div>

          {/* Weekly weekday selector */}
          {recurrence.frequency === 'weekly' && (
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>On these days</label>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {WEEKDAY_NAMES_SHORT.map((name, i) => {
                  const active = recurrence.weekdays?.includes(i);
                  return (
                    <div
                      key={i}
                      onClick={() => toggleWeekday(i)}
                      data-tap
                      style={{
                        flex: '1 1 auto',
                        minWidth: 38,
                        padding: '8px 4px',
                        textAlign: 'center',
                        border: `1px solid ${active ? G.green : G.border}`,
                        background: active ? G.green : G.card,
                        color: active ? '#F2EDE0' : G.text,
                        fontFamily: '"Lora",serif',
                        fontSize: 12,
                        borderRadius: 3,
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                    >
                      {name}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Monthly mode selector */}
          {recurrence.frequency === 'monthly' && (
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>Each month</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <div
                  onClick={() => setField({ monthlyKind: 'by_date' })}
                  data-tap
                  style={{
                    ...modeChipStyle,
                    border: `1px solid ${recurrence.monthlyKind === 'by_date' ? G.green : G.border}`,
                    background: recurrence.monthlyKind === 'by_date' ? G.green : G.card,
                    color: recurrence.monthlyKind === 'by_date' ? '#F2EDE0' : G.text,
                  }}
                >
                  On the same date
                </div>
                <div
                  onClick={() => setField({ monthlyKind: 'by_weekday' })}
                  data-tap
                  style={{
                    ...modeChipStyle,
                    border: `1px solid ${recurrence.monthlyKind === 'by_weekday' ? G.green : G.border}`,
                    background: recurrence.monthlyKind === 'by_weekday' ? G.green : G.card,
                    color: recurrence.monthlyKind === 'by_weekday' ? '#F2EDE0' : G.text,
                  }}
                >
                  On a weekday pattern
                </div>
              </div>

              {recurrence.monthlyKind === 'by_weekday' && (
                <div style={{ ...rowStyle, marginTop: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Which</label>
                    <select
                      value={recurrence.monthlyOrdinal}
                      onChange={(e) => setField({ monthlyOrdinal: Number(e.target.value) })}
                      style={inputStyle}
                    >
                      {ORDINALS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Weekday</label>
                    <select
                      value={recurrence.monthlyWeekday}
                      onChange={(e) => setField({ monthlyWeekday: Number(e.target.value) })}
                      style={inputStyle}
                    >
                      {WEEKDAY_NAMES_LONG.map((d, i) => (
                        <option key={i} value={i}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* End condition */}
          <div style={{ marginTop: 12 }}>
            <label style={labelStyle}>Ends</label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <div
                onClick={() => setEnd({ kind: 'count' })}
                data-tap
                style={{
                  ...modeChipStyle,
                  border: `1px solid ${recurrence.end.kind === 'count' ? G.green : G.border}`,
                  background: recurrence.end.kind === 'count' ? G.green : G.card,
                  color: recurrence.end.kind === 'count' ? '#F2EDE0' : G.text,
                }}
              >
                After N times
              </div>
              <div
                onClick={() => setEnd({ kind: 'date' })}
                data-tap
                style={{
                  ...modeChipStyle,
                  border: `1px solid ${recurrence.end.kind === 'date' ? G.green : G.border}`,
                  background: recurrence.end.kind === 'date' ? G.green : G.card,
                  color: recurrence.end.kind === 'date' ? '#F2EDE0' : G.text,
                }}
              >
                On a date
              </div>
            </div>
            {recurrence.end.kind === 'count' && (
              <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="number"
                  min="1"
                  max={MAX_OCCURRENCES}
                  value={recurrence.end.count || ''}
                  onChange={(e) => setEnd({ count: Math.max(1, Math.min(MAX_OCCURRENCES, Number(e.target.value) || 1)) })}
                  style={{ ...inputStyle, width: 72 }}
                />
                <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted }}>
                  occurrences (max {MAX_OCCURRENCES})
                </span>
              </div>
            )}
            {recurrence.end.kind === 'date' && (
              <div style={{ marginTop: 8 }}>
                <input
                  type="date"
                  value={recurrence.end.date || ''}
                  min={startDate || ''}
                  onChange={(e) => setEnd({ date: e.target.value })}
                  style={inputStyle}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Live plain-English preview + occurrence count. Custom shows
          this below the editor; presets show it inline above (no need
          to repeat). */}
      {isCustom && isRecurring && (
        <p style={summaryStyle}>{description}</p>
      )}
      {isRecurring && (
        <p
          style={{
            ...countStyle,
            color: previewDates.length === 0 ? G.clsDot : G.brass,
          }}
        >
          {countText(previewDates, startDate)}
        </p>
      )}
    </div>
  );
}

function unitLabel(frequency, interval) {
  const plural = interval !== 1;
  switch (frequency) {
    case 'daily':   return plural ? 'days'   : 'day';
    case 'weekly':  return plural ? 'weeks'  : 'week';
    case 'monthly': return plural ? 'months' : 'month';
    case 'yearly':  return plural ? 'years'  : 'year';
    default:        return '';
  }
}

function countText(previewDates, startDate) {
  if (!startDate) return 'Pick a date to preview occurrences.';
  if (previewDates.length === 0) return 'No occurrences match this pattern yet.';
  const first = previewDates[0];
  const last = previewDates[previewDates.length - 1];
  const f = formatShortDate(first);
  const l = formatShortDate(last);
  const cap = previewDates.length >= MAX_OCCURRENCES ? ` (capped at ${MAX_OCCURRENCES})` : '';
  return `Will create ${previewDates.length} occurrence${previewDates.length === 1 ? '' : 's'}${cap} — first ${f}, last ${l}.`;
}

function formatShortDate(iso) {
  try {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d, 12).toLocaleDateString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ─── Styles ─────────────────────────────────────────────────────────

const panelStyle = {
  marginBottom: 14,
  padding: 12,
  background: G.card,
  border: `1px solid ${G.border}`,
  borderRadius: 4,
};

const customPanelStyle = {
  marginTop: 10,
  padding: 10,
  background: G.bg,
  border: `1px solid ${G.border}`,
  borderRadius: 4,
};

const rowStyle = {
  display: 'flex',
  gap: 8,
  alignItems: 'flex-end',
};

const inputStyle = {
  width: '100%',
  padding: '9px 10px',
  border: `1px solid ${G.border}`,
  borderRadius: 3,
  fontFamily: '"Lora",serif',
  fontSize: 13,
  color: G.text,
  background: G.card,
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle = {
  fontFamily: '"Lora",serif',
  fontSize: 9,
  color: G.muted,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  display: 'block',
  marginBottom: 5,
};

const modeChipStyle = {
  padding: '8px 12px',
  borderRadius: 3,
  fontFamily: '"Lora",serif',
  fontSize: 12,
  cursor: 'pointer',
  userSelect: 'none',
  flex: '1 1 auto',
  textAlign: 'center',
};

const summaryStyle = {
  fontFamily: '"Lora",serif',
  fontSize: 12,
  color: G.muted,
  margin: '10px 0 0',
  lineHeight: 1.45,
};

const countStyle = {
  fontFamily: '"Lora",serif',
  fontStyle: 'italic',
  fontSize: 11,
  margin: '6px 0 0',
  lineHeight: 1.45,
};
