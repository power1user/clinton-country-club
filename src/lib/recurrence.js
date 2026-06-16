// recurrence.js — event recurrence engine + UI helpers. v0.19.0.
//
// Replaces the per-rule mini-functions that lived inline in
// admin/sections.jsx through v0.18.x. New capabilities:
//
//   · Daily and Yearly frequencies
//   · Weekly with multi-day selector (e.g. "every Tuesday + Thursday")
//   · Monthly by-date (15th of every month) in addition to by-weekday
//     (1st Sunday, last Friday)
//   · End condition: until a date OR after N occurrences
//   · Quick presets (Every Day / Every Week / Every 2 Weeks /
//     Every Month / Every Year) that flatten into the canonical
//     Custom shape so there's exactly one storage model
//
// We materialize occurrences at create time (each becomes a real
// `events` row, all sharing one recurrence_group_id) — the existing
// pattern from v0.12.3. Exceptions ("skip Christmas Eve Tuesday") are
// handled by the admin deleting that one materialized row.

// ─── Constants ──────────────────────────────────────────────────────

export const FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'];

export const WEEKDAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAY_NAMES_LONG  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const ORDINALS = [
  { value: 1,  label: 'first'  },
  { value: 2,  label: 'second' },
  { value: 3,  label: 'third'  },
  { value: 4,  label: 'fourth' },
  { value: -1, label: 'last'   },
];

// Hard caps. 100 occurrences covers a weekly meeting for ~2 years; the
// horizon is just a runtime sanity ceiling — the real bound is the
// end condition (always required) + MAX_OCCURRENCES. 50 years out
// gives a yearly gala "until 2076" without artificial clipping.
export const MAX_OCCURRENCES = 100;
export const MAX_HORIZON_DAYS = 365 * 50;
// Loop-iteration safety net for sparse patterns (5th Tuesday months,
// Feb 29, etc.) so a misconfigured rule can't spin forever even if
// it hasn't accumulated maxCount entries.
const MAX_LOOP_ITER = 10_000;

// ─── Presets ────────────────────────────────────────────────────────
// Quick picks in the editor. 'none' is the absence of recurrence;
// 'custom' lets the admin tune everything by hand. Everything else
// is a one-tap shortcut that flattens into the canonical custom shape
// (see `presetToCustom`).

export const PRESETS = [
  { value: 'none',     label: 'Does not repeat' },
  { value: 'daily',    label: 'Every day'       },
  { value: 'weekly',   label: 'Every week'      },
  { value: 'biweekly', label: 'Every 2 weeks'   },
  { value: 'monthly',  label: 'Every month'     },
  { value: 'yearly',   label: 'Every year'      },
  { value: 'custom',   label: 'Custom…'         },
];

// ─── Empty / default state ──────────────────────────────────────────

export const EMPTY_RECURRENCE = Object.freeze({
  preset: 'none',
  frequency: 'weekly',
  interval: 1,
  weekdays: [],       // weekly only — sorted array of 0-6 (0 = Sunday)
  monthlyKind: 'by_date', // 'by_date' | 'by_weekday'
  monthlyOrdinal: 1,  // 1, 2, 3, 4, or -1 (last)
  monthlyWeekday: 0,  // 0-6
  end: { kind: 'count', count: 10, date: '' },
});

// Materialize a preset choice into the canonical Custom shape so
// generateOccurrences only has to understand one model.
//
// startDate is an ISO yyyy-mm-dd string; weekday is inferred from it
// so e.g. "Every Week" naturally falls on whatever day the first
// occurrence is.
export function presetToCustom(preset, startDate) {
  const dow = startDate ? dowOfIso(startDate) : 0;
  switch (preset) {
    case 'none':
      return { ...EMPTY_RECURRENCE, preset: 'none' };
    case 'daily':
      return { ...EMPTY_RECURRENCE, preset: 'daily',
        frequency: 'daily', interval: 1 };
    case 'weekly':
      return { ...EMPTY_RECURRENCE, preset: 'weekly',
        frequency: 'weekly', interval: 1, weekdays: [dow] };
    case 'biweekly':
      return { ...EMPTY_RECURRENCE, preset: 'biweekly',
        frequency: 'weekly', interval: 2, weekdays: [dow] };
    case 'monthly':
      return { ...EMPTY_RECURRENCE, preset: 'monthly',
        frequency: 'monthly', interval: 1, monthlyKind: 'by_date' };
    case 'yearly':
      return { ...EMPTY_RECURRENCE, preset: 'yearly',
        frequency: 'yearly', interval: 1 };
    case 'custom':
      return { ...EMPTY_RECURRENCE, preset: 'custom',
        frequency: 'weekly', interval: 1, weekdays: [dow] };
    default:
      return { ...EMPTY_RECURRENCE };
  }
}

// ─── Date helpers ───────────────────────────────────────────────────

export function toIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseIsoLocal(iso) {
  // Local noon to dodge tz edge cases on date-only comparisons.
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function dowOfIso(iso) {
  return parseIsoLocal(iso).getDay();
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function addMonths(d, n) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

function addYears(d, n) {
  const x = new Date(d);
  x.setFullYear(x.getFullYear() + n);
  return x;
}

// Return the date in `year`/`month` that is the `ordinal`-th `weekday`.
// ordinal: 1-4 for first/second/third/fourth, -1 for last. Returns null
// if the ordinal overflows (e.g. asking for "5th Wednesday" in February).
function nthWeekdayOf(year, month, weekday, ordinal) {
  if (ordinal === -1) {
    const d = new Date(year, month + 1, 0, 12, 0, 0); // last day of month
    while (d.getDay() !== weekday) d.setDate(d.getDate() - 1);
    return d;
  }
  const d = new Date(year, month, 1, 12, 0, 0);
  while (d.getDay() !== weekday) d.setDate(d.getDate() + 1);
  d.setDate(d.getDate() + 7 * (ordinal - 1));
  if (d.getMonth() !== month) return null;
  return d;
}

// ─── Occurrence materializer ────────────────────────────────────────

// Given a canonical recurrence shape + a start date, return ISO date
// strings for every occurrence to materialize. Bounded by:
//   · `end.kind === 'date'` → stop on/before end.date
//   · `end.kind === 'count'` → stop after end.count occurrences
//   · MAX_OCCURRENCES hard ceiling
//   · MAX_HORIZON_DAYS hard ceiling on the date horizon
//
// Returns an array of `'YYYY-MM-DD'` strings sorted ascending. The
// first occurrence is always startIso (rule: the date the admin
// picks IS the first occurrence, regardless of frequency).
export function generateOccurrences(recur, startIso) {
  if (!startIso) return [];
  if (recur.preset === 'none') return [startIso];

  const start = parseIsoLocal(startIso);
  const horizon = addDays(new Date(), MAX_HORIZON_DAYS);
  const endDate = recur.end.kind === 'date' && recur.end.date
    ? parseIsoLocal(recur.end.date)
    : null;
  const maxCount = recur.end.kind === 'count'
    ? Math.max(1, Math.min(MAX_OCCURRENCES, Number(recur.end.count) || 1))
    : MAX_OCCURRENCES;
  const interval = Math.max(1, Number(recur.interval) || 1);

  const out = [];

  const push = (d) => {
    if (out.length >= maxCount) return false;
    if (endDate && d > endDate) return false;
    if (d > horizon) return false;
    out.push(toIso(d));
    return true;
  };

  if (recur.frequency === 'daily') {
    let cursor = new Date(start);
    for (let iter = 0; out.length < maxCount && iter < MAX_LOOP_ITER; iter++) {
      if (!push(cursor)) break;
      cursor = addDays(cursor, interval);
    }
    return out;
  }

  if (recur.frequency === 'weekly') {
    const weekdays = (recur.weekdays && recur.weekdays.length > 0)
      ? [...recur.weekdays].sort()
      : [start.getDay()];

    // Walk weeks in `interval`-week increments starting at the Sunday
    // of `start`'s week. Within each week, emit selected weekdays on/
    // after `start`.
    const weekStart = (() => {
      const d = new Date(start);
      d.setDate(d.getDate() - d.getDay());
      return d;
    })();

    let cursorWeek = new Date(weekStart);
    for (let iter = 0; out.length < maxCount && iter < MAX_LOOP_ITER; iter++) {
      for (const wd of weekdays) {
        const day = addDays(cursorWeek, wd);
        if (day < start) continue;
        if (!push(day)) return out;
      }
      cursorWeek = addDays(cursorWeek, 7 * interval);
      if (endDate && cursorWeek > endDate) break;
      if (cursorWeek > horizon) break;
    }
    return out;
  }

  if (recur.frequency === 'monthly') {
    let cursor = new Date(start);
    for (let iter = 0; out.length < maxCount && iter < MAX_LOOP_ITER; iter++) {
      let candidate;
      if (recur.monthlyKind === 'by_date') {
        candidate = new Date(cursor.getFullYear(), cursor.getMonth(), start.getDate(), 12, 0, 0);
        if (candidate.getMonth() !== cursor.getMonth()) {
          cursor = addMonths(cursor, interval);
          if (endDate && cursor > endDate) break;
          if (cursor > horizon) break;
          continue;
        }
      } else {
        candidate = nthWeekdayOf(cursor.getFullYear(), cursor.getMonth(), recur.monthlyWeekday, recur.monthlyOrdinal);
        if (!candidate) {
          cursor = addMonths(cursor, interval);
          if (endDate && cursor > endDate) break;
          if (cursor > horizon) break;
          continue;
        }
      }
      if (candidate >= start) {
        if (!push(candidate)) return out;
      }
      cursor = addMonths(cursor, interval);
      if (endDate && cursor > endDate) break;
      if (cursor > horizon) break;
    }
    return out;
  }

  if (recur.frequency === 'yearly') {
    // Track the INTENDED month + date from start, not from a mutating
    // cursor — otherwise Feb 29 + addYears(1) rolls to Mar 1 silently,
    // and Mar 1 then passes the "matches cursor" check.
    const targetMonth = start.getMonth();
    const targetDate  = start.getDate();
    const horizonYear = horizon.getFullYear();
    let year = start.getFullYear();
    for (let iter = 0; out.length < maxCount && iter < MAX_LOOP_ITER; iter++) {
      const candidate = new Date(year, targetMonth, targetDate, 12, 0, 0);
      if (candidate.getMonth() !== targetMonth || candidate.getDate() !== targetDate) {
        year += interval;
        if (year > horizonYear) break;
        continue;
      }
      if (!push(candidate)) return out;
      year += interval;
      if (year > horizonYear) break;
    }
    return out;
  }

  return [startIso];
}

// ─── Plain-English description ──────────────────────────────────────

// Returns a one-sentence description of the recurrence. Used in the
// editor's live preview, on event detail pages, and in admin series
// headers.
//
// Examples:
//   "Does not repeat."
//   "Repeats every day until June 1, 2026."
//   "Repeats every Tuesday and Thursday, 12 times."
//   "Repeats every 2 weeks on Wednesday until December 31, 2026."
//   "Repeats on the first Sunday of every month, 6 times."
//   "Repeats on the last Friday of every month until June 1, 2026."
//   "Repeats every year until 2030."
export function describeRecurrence(recur, startIso) {
  if (!recur || recur.preset === 'none') return 'Does not repeat.';

  const interval = Math.max(1, Number(recur.interval) || 1);
  let phrase;

  if (recur.frequency === 'daily') {
    phrase = interval === 1 ? 'Repeats every day' : `Repeats every ${interval} days`;
  } else if (recur.frequency === 'weekly') {
    const weekdays = (recur.weekdays && recur.weekdays.length > 0)
      ? recur.weekdays
      : (startIso ? [dowOfIso(startIso)] : []);
    const dayList = formatWeekdayList(weekdays);
    if (interval === 1) {
      phrase = `Repeats every ${dayList}`;
    } else {
      phrase = `Repeats every ${interval} weeks on ${dayList}`;
    }
  } else if (recur.frequency === 'monthly') {
    if (recur.monthlyKind === 'by_date' && startIso) {
      const dayOfMonth = parseIsoLocal(startIso).getDate();
      phrase = interval === 1
        ? `Repeats on the ${ordinalString(dayOfMonth)} of every month`
        : `Repeats on the ${ordinalString(dayOfMonth)} every ${interval} months`;
    } else if (recur.monthlyKind === 'by_weekday') {
      const ord = ORDINALS.find(o => o.value === recur.monthlyOrdinal)?.label || 'first';
      const wd = WEEKDAY_NAMES_LONG[recur.monthlyWeekday] || 'Sunday';
      phrase = interval === 1
        ? `Repeats on the ${ord} ${wd} of every month`
        : `Repeats on the ${ord} ${wd} every ${interval} months`;
    } else {
      phrase = 'Repeats monthly';
    }
  } else if (recur.frequency === 'yearly') {
    phrase = interval === 1 ? 'Repeats every year' : `Repeats every ${interval} years`;
  } else {
    phrase = 'Repeats';
  }

  if (recur.end.kind === 'date' && recur.end.date) {
    phrase += ` until ${formatHumanDate(recur.end.date)}`;
  } else if (recur.end.kind === 'count' && recur.end.count > 0) {
    phrase += `, ${recur.end.count} time${recur.end.count === 1 ? '' : 's'}`;
  }

  return phrase + '.';
}

function formatWeekdayList(weekdays) {
  if (!weekdays || weekdays.length === 0) return 'day';
  const sorted = [...weekdays].sort();
  const names = sorted.map(d => WEEKDAY_NAMES_LONG[d]);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1];
}

function ordinalString(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatHumanDate(iso) {
  try {
    return parseIsoLocal(iso).toLocaleDateString(undefined, {
      month: 'long', day: 'numeric', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ─── Admin-list series summary ──────────────────────────────────────
// Used by EventsAdmin to render the group header line.
export function recurrenceSummaryFromRows(rows) {
  if (!rows || rows.length === 0) return '';
  const first = rows[0]?.event_date;
  const last  = rows[rows.length - 1]?.event_date;
  if (!first || !last) return `${rows.length} occurrences`;
  const f = parseIsoLocal(first).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const l = parseIsoLocal(last).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  return `${rows.length} occurrences · ${f} → ${l}`;
}
