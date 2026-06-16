// Tests for recurrence engine. Covers common club calendar patterns:
//   · Weekly board meeting (single weekday)
//   · Multi-weekday weekly (Tue + Thu)
//   · Every 2 weeks (biweekly league)
//   · Monthly by-date (15th of every month)
//   · Monthly by-weekday — first Tuesday, last Friday
//   · Yearly (annual gala)
//   · Daily (rare but valid)
//   · End-by-date + End-by-count
//   · Hard caps
//   · Leap-day yearly skip
//   · Feb 30 monthly skip

import { describe, it, expect } from 'vitest';
import {
  generateOccurrences,
  describeRecurrence,
  presetToCustom,
  EMPTY_RECURRENCE,
  MAX_OCCURRENCES,
} from './recurrence.js';

const r = (overrides) => ({ ...EMPTY_RECURRENCE, preset: 'custom', ...overrides });

describe('generateOccurrences — none', () => {
  it('returns just the start when preset=none', () => {
    expect(generateOccurrences(r({ preset: 'none' }), '2026-06-15')).toEqual(['2026-06-15']);
  });
  it('returns empty when start is missing', () => {
    expect(generateOccurrences(r({ frequency: 'daily' }), '')).toEqual([]);
  });
});

describe('generateOccurrences — daily', () => {
  it('daily for 5 days', () => {
    const out = generateOccurrences(
      r({ frequency: 'daily', interval: 1, end: { kind: 'count', count: 5 } }),
      '2026-06-15'
    );
    expect(out).toEqual(['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19']);
  });
  it('every 3 days for 4 occurrences', () => {
    const out = generateOccurrences(
      r({ frequency: 'daily', interval: 3, end: { kind: 'count', count: 4 } }),
      '2026-06-15'
    );
    expect(out).toEqual(['2026-06-15', '2026-06-18', '2026-06-21', '2026-06-24']);
  });
});

describe('generateOccurrences — weekly', () => {
  it('every Tuesday for 4 weeks (count)', () => {
    const out = generateOccurrences(
      r({ frequency: 'weekly', interval: 1, weekdays: [2], end: { kind: 'count', count: 4 } }),
      '2026-06-16' // Tuesday
    );
    expect(out).toEqual(['2026-06-16', '2026-06-23', '2026-06-30', '2026-07-07']);
  });
  it('Tue + Thu twice each (multi-weekday)', () => {
    const out = generateOccurrences(
      r({ frequency: 'weekly', interval: 1, weekdays: [2, 4], end: { kind: 'count', count: 4 } }),
      '2026-06-16' // Tuesday
    );
    expect(out).toEqual(['2026-06-16', '2026-06-18', '2026-06-23', '2026-06-25']);
  });
  it('biweekly Wednesday until a date', () => {
    const out = generateOccurrences(
      r({ frequency: 'weekly', interval: 2, weekdays: [3], end: { kind: 'date', date: '2026-08-01' } }),
      '2026-06-17' // Wednesday
    );
    expect(out).toEqual(['2026-06-17', '2026-07-01', '2026-07-15', '2026-07-29']);
  });
  it('first weekday in week 1 starts on/after the start date', () => {
    // Start Thursday, repeats on Tue + Thu. The Tuesday in week 1 is BEFORE
    // start, so it should be skipped.
    const out = generateOccurrences(
      r({ frequency: 'weekly', interval: 1, weekdays: [2, 4], end: { kind: 'count', count: 3 } }),
      '2026-06-18' // Thursday
    );
    expect(out).toEqual(['2026-06-18', '2026-06-23', '2026-06-25']);
  });
});

describe('generateOccurrences — monthly by-date', () => {
  it('15th of every month for 4 months', () => {
    const out = generateOccurrences(
      r({ frequency: 'monthly', monthlyKind: 'by_date', interval: 1, end: { kind: 'count', count: 4 } }),
      '2026-06-15'
    );
    expect(out).toEqual(['2026-06-15', '2026-07-15', '2026-08-15', '2026-09-15']);
  });
  it('skips months that lack the target day (31st)', () => {
    const out = generateOccurrences(
      r({ frequency: 'monthly', monthlyKind: 'by_date', interval: 1, end: { kind: 'count', count: 3 } }),
      '2026-01-31'
    );
    // Feb 31 doesn't exist, so we skip Feb and Mar 31 is the next.
    // (Apr has no 31 either — skipped.)
    expect(out).toEqual(['2026-01-31', '2026-03-31', '2026-05-31']);
  });
});

describe('generateOccurrences — monthly by-weekday', () => {
  it('first Tuesday of every month for 3 months', () => {
    const out = generateOccurrences(
      r({
        frequency: 'monthly', monthlyKind: 'by_weekday',
        monthlyOrdinal: 1, monthlyWeekday: 2, interval: 1,
        end: { kind: 'count', count: 3 },
      }),
      '2026-06-02' // first Tuesday of June 2026
    );
    expect(out).toEqual(['2026-06-02', '2026-07-07', '2026-08-04']);
  });
  it('last Friday of every month for 3 months', () => {
    const out = generateOccurrences(
      r({
        frequency: 'monthly', monthlyKind: 'by_weekday',
        monthlyOrdinal: -1, monthlyWeekday: 5, interval: 1,
        end: { kind: 'count', count: 3 },
      }),
      '2026-06-26' // last Friday of June 2026
    );
    expect(out).toEqual(['2026-06-26', '2026-07-31', '2026-08-28']);
  });
});

describe('generateOccurrences — yearly', () => {
  it('annual gala for 3 years', () => {
    const out = generateOccurrences(
      r({ frequency: 'yearly', interval: 1, end: { kind: 'count', count: 3 } }),
      '2026-09-12'
    );
    expect(out).toEqual(['2026-09-12', '2027-09-12', '2028-09-12']);
  });
  it('Feb 29 yearly — only lands on leap years', () => {
    const out = generateOccurrences(
      r({ frequency: 'yearly', interval: 1, end: { kind: 'count', count: 3 } }),
      '2028-02-29'
    );
    // 2028 leap. 2029, 2030, 2031 not. 2032 leap.
    expect(out).toEqual(['2028-02-29', '2032-02-29', '2036-02-29']);
  });
});

describe('generateOccurrences — caps', () => {
  it('respects MAX_OCCURRENCES even with no end set', () => {
    const out = generateOccurrences(
      r({ frequency: 'daily', interval: 1, end: { kind: 'count', count: 9999 } }),
      '2026-06-15'
    );
    expect(out.length).toBe(MAX_OCCURRENCES);
  });
});

describe('describeRecurrence', () => {
  it('non-recurring', () => {
    expect(describeRecurrence({ preset: 'none' }, '2026-06-15')).toBe('Does not repeat.');
  });
  it('every day until date', () => {
    expect(describeRecurrence(
      r({ frequency: 'daily', interval: 1, end: { kind: 'date', date: '2026-12-31' } }),
      '2026-06-15'
    )).toMatch(/Repeats every day until December 31, 2026\./);
  });
  it('multi-weekday', () => {
    expect(describeRecurrence(
      r({ frequency: 'weekly', interval: 1, weekdays: [2, 4], end: { kind: 'count', count: 12 } }),
      '2026-06-16'
    )).toBe('Repeats every Tuesday and Thursday, 12 times.');
  });
  it('biweekly Wednesday', () => {
    expect(describeRecurrence(
      r({ frequency: 'weekly', interval: 2, weekdays: [3], end: { kind: 'date', date: '2026-08-01' } }),
      '2026-06-17'
    )).toBe('Repeats every 2 weeks on Wednesday until August 1, 2026.');
  });
  it('monthly first Sunday', () => {
    expect(describeRecurrence(
      r({
        frequency: 'monthly', monthlyKind: 'by_weekday',
        monthlyOrdinal: 1, monthlyWeekday: 0, interval: 1,
        end: { kind: 'count', count: 6 },
      }),
      '2026-06-07'
    )).toBe('Repeats on the first Sunday of every month, 6 times.');
  });
  it('monthly last Friday', () => {
    expect(describeRecurrence(
      r({
        frequency: 'monthly', monthlyKind: 'by_weekday',
        monthlyOrdinal: -1, monthlyWeekday: 5, interval: 1,
        end: { kind: 'date', date: '2026-12-31' },
      }),
      '2026-06-26'
    )).toBe('Repeats on the last Friday of every month until December 31, 2026.');
  });
  it('monthly by date', () => {
    expect(describeRecurrence(
      r({ frequency: 'monthly', monthlyKind: 'by_date', interval: 1, end: { kind: 'count', count: 4 } }),
      '2026-06-15'
    )).toBe('Repeats on the 15th of every month, 4 times.');
  });
  it('annual', () => {
    expect(describeRecurrence(
      r({ frequency: 'yearly', interval: 1, end: { kind: 'date', date: '2030-09-12' } }),
      '2026-09-12'
    )).toBe('Repeats every year until September 12, 2030.');
  });
  it('singular "1 time"', () => {
    expect(describeRecurrence(
      r({ frequency: 'daily', interval: 1, end: { kind: 'count', count: 1 } }),
      '2026-06-15'
    )).toBe('Repeats every day, 1 time.');
  });
});

describe('presetToCustom', () => {
  it('Every Week anchors weekday to the start date', () => {
    const rec = presetToCustom('weekly', '2026-06-17'); // Wednesday
    expect(rec.frequency).toBe('weekly');
    expect(rec.interval).toBe(1);
    expect(rec.weekdays).toEqual([3]);
  });
  it('Every 2 Weeks', () => {
    const rec = presetToCustom('biweekly', '2026-06-17');
    expect(rec.frequency).toBe('weekly');
    expect(rec.interval).toBe(2);
  });
  it('Every Month defaults to by-date', () => {
    const rec = presetToCustom('monthly', '2026-06-15');
    expect(rec.frequency).toBe('monthly');
    expect(rec.monthlyKind).toBe('by_date');
  });
  it('Every Day', () => {
    const rec = presetToCustom('daily', '2026-06-15');
    expect(rec.frequency).toBe('daily');
    expect(rec.interval).toBe(1);
  });
  it('Every Year', () => {
    const rec = presetToCustom('yearly', '2026-09-12');
    expect(rec.frequency).toBe('yearly');
  });
  it('none returns empty', () => {
    const rec = presetToCustom('none', '2026-06-15');
    expect(rec.preset).toBe('none');
  });
});
