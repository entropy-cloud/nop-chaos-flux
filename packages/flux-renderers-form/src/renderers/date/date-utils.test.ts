import { describe, expect, it } from 'vitest';
import {
  compareDates,
  convertValueFormat,
  DEFAULT_DATE_FORMAT,
  DEFAULT_DATETIME_FORMAT,
  DEFAULT_MONTH_FORMAT,
  DEFAULT_QUARTER_FORMAT,
  DEFAULT_TIME_FORMAT,
  DEFAULT_YEAR_FORMAT,
  formatDate,
  formatPeriod,
  fromUtc,
  isWithinRange,
  joinDateRange,
  monthToQuarter,
  normalizePeriodRange,
  normalizeRange,
  parseDate,
  parseDateRange,
  parsePeriod,
  parsePeriodRange,
  toCalendarDate,
  toStorageDate,
  toUtc,
} from './date-utils.js';

describe('date-utils — formatDate / parseDate round-trip', () => {
  it('formats a date with the default date format', () => {
    const date = new Date(2024, 2, 5);
    expect(formatDate(date, DEFAULT_DATE_FORMAT)).toBe('2024-03-05');
  });

  it('round-trips through YYYY-MM-DD', () => {
    const date = parseDate('2024-12-31', DEFAULT_DATE_FORMAT);
    expect(formatDate(date, DEFAULT_DATE_FORMAT)).toBe('2024-12-31');
  });

  it('round-trips through a custom displayFormat (DD/MM/YYYY)', () => {
    const stored = '2024-06-09';
    const display = convertValueFormat(stored, 'YYYY-MM-DD', 'DD/MM/YYYY');
    expect(display).toBe('09/06/2024');
    expect(convertValueFormat(display, 'DD/MM/YYYY', 'YYYY-MM-DD')).toBe(stored);
  });

  it('round-trips datetime format with time component', () => {
    const stored = '2024-06-09 14:30';
    expect(parseDate(stored, DEFAULT_DATETIME_FORMAT)).toBeTruthy();
    expect(convertValueFormat(stored, DEFAULT_DATETIME_FORMAT, 'HH:mm DD/MM/YYYY')).toBe(
      '14:30 09/06/2024',
    );
  });

  it('round-trips a time-only format', () => {
    const stored = '08:05';
    const date = parseDate(stored, DEFAULT_TIME_FORMAT);
    expect(formatDate(date, DEFAULT_TIME_FORMAT)).toBe('08:05');
  });

  it('handles two-digit year token (YY)', () => {
    expect(parseDate('99', 'YY')).toBeTruthy();
    const parsed = parseDate('20', 'YY');
    expect(parsed?.getFullYear()).toBe(2020);
  });
});

describe('date-utils — parse failure degradation (never throws)', () => {
  it('returns undefined for mismatched format', () => {
    expect(parseDate('not-a-date', DEFAULT_DATE_FORMAT)).toBeUndefined();
  });

  it('returns undefined for out-of-range month/day', () => {
    expect(parseDate('2024-13-01', DEFAULT_DATE_FORMAT)).toBeUndefined();
    expect(parseDate('2024-02-31', DEFAULT_DATE_FORMAT)).toBeUndefined();
  });

  it('returns undefined for empty / null input', () => {
    expect(parseDate('', DEFAULT_DATE_FORMAT)).toBeUndefined();
    expect(parseDate(undefined, DEFAULT_DATE_FORMAT)).toBeUndefined();
  });

  it('convertValueFormat returns undefined when source unparseable', () => {
    expect(convertValueFormat('garbage', DEFAULT_DATE_FORMAT, 'DD/MM/YYYY')).toBeUndefined();
  });
});

describe('date-utils — min/max constraint', () => {
  const min = new Date(2024, 0, 10);
  const max = new Date(2024, 0, 20);

  it('accepts a date inside the range', () => {
    expect(isWithinRange(new Date(2024, 0, 15), min, max)).toBe(true);
  });

  it('rejects a date before min', () => {
    expect(isWithinRange(new Date(2024, 0, 5), min, max)).toBe(false);
  });

  it('rejects a date after max', () => {
    expect(isWithinRange(new Date(2024, 0, 25), min, max)).toBe(false);
  });

  it('treats bounds as inclusive', () => {
    expect(isWithinRange(min, min, max)).toBe(true);
    expect(isWithinRange(max, min, max)).toBe(true);
  });

  it('supports open-ended bounds (undefined min/max)', () => {
    expect(isWithinRange(new Date(2024, 5, 1), undefined, max)).toBe(false);
    expect(isWithinRange(new Date(2024, 5, 1), min, undefined)).toBe(true);
  });

  it('ignores invalid bound dates', () => {
    expect(isWithinRange(new Date(2024, 0, 15), new Date(NaN), max)).toBe(true);
  });
});

describe('date-utils — UTC round-trip (utc:true)', () => {
  it('parses UTC components and formats them back consistently (no timezone drift)', () => {
    const stored = '2024-06-09 14:30';
    const date = parseDate(stored, DEFAULT_DATETIME_FORMAT, { utc: true });
    expect(date?.getUTCHours()).toBe(14);
    expect(date?.getUTCMinutes()).toBe(30);
    expect(formatDate(date, DEFAULT_DATETIME_FORMAT, { utc: true })).toBe(stored);
  });

  it('toUtc/fromUtc round-trip an ISO string', () => {
    const original = new Date(Date.UTC(2024, 5, 9, 14, 30, 0));
    const iso = toUtc(original);
    expect(iso).toBe('2024-06-09T14:30:00.000Z');
    const back = fromUtc(iso);
    expect(back?.getTime()).toBe(original.getTime());
  });

  it('fromUtc returns undefined for garbage', () => {
    expect(fromUtc('nope')).toBeUndefined();
  });

  it('utc round-trip stays stable across repeated conversions', () => {
    let current = '2024-01-15';
    for (let i = 0; i < 5; i++) {
      const d = parseDate(current, DEFAULT_DATE_FORMAT, { utc: true });
      current = formatDate(d, DEFAULT_DATE_FORMAT, { utc: true })!;
    }
    expect(current).toBe('2024-01-15');
  });
});

describe('date-utils — range normalization', () => {
  it('swaps ends when start > end', () => {
    const result = normalizeRange('2024-06-20', '2024-06-01', DEFAULT_DATE_FORMAT);
    expect(result.start).toBe('2024-06-01');
    expect(result.end).toBe('2024-06-20');
    expect(result.swapped).toBe(true);
  });

  it('leaves a well-ordered range untouched', () => {
    const result = normalizeRange('2024-06-01', '2024-06-20', DEFAULT_DATE_FORMAT);
    expect(result.start).toBe('2024-06-01');
    expect(result.end).toBe('2024-06-20');
    expect(result.swapped).toBe(false);
  });

  it('returns ends unchanged when only one parses', () => {
    const result = normalizeRange('2024-06-01', '', DEFAULT_DATE_FORMAT);
    expect(result.start).toBe('2024-06-01');
    expect(result.end).toBe('');
    expect(result.swapped).toBe(false);
  });

  it('parseDateRange splits and joins via delimiter', () => {
    const value = joinDateRange('2024-06-01', '2024-06-20', ',');
    expect(value).toBe('2024-06-01,2024-06-20');
    const parsed = parseDateRange(value, ',', DEFAULT_DATE_FORMAT);
    expect(parsed.start?.getFullYear()).toBe(2024);
    expect(parsed.start?.getMonth()).toBe(5);
    expect(parsed.end?.getDate()).toBe(20);
    expect(parsed.end?.getFullYear()).toBe(2024);
  });

  it('compareDates orders correctly', () => {
    const a = new Date(2024, 0, 1);
    const b = new Date(2024, 0, 2);
    expect(compareDates(a, b)).toBe(-1);
    expect(compareDates(b, a)).toBe(1);
    expect(compareDates(a, a)).toBe(0);
  });
});

describe('date-utils — calendar↔storage timezone bridge', () => {
  it('toStorageDate preserves the calendar day when utc is true (no day drift)', () => {
    // A local wall-clock date (as react-day-picker emits) for June 12.
    const calendarDay = new Date(2024, 5, 12, 14, 30);
    const storage = toStorageDate(calendarDay, true)!;
    // UTC components of the storage date must equal the picked calendar day/time,
    // so formatting with utc keeps June 12 in any host timezone.
    expect(formatDate(storage, DEFAULT_DATETIME_FORMAT, { utc: true })).toBe(
      '2024-06-12 14:30',
    );
  });

  it('toStorageDate leaves the date untouched when utc is false', () => {
    const calendarDay = new Date(2024, 5, 12);
    const storage = toStorageDate(calendarDay, false)!;
    expect(storage.getTime()).toBe(calendarDay.getTime());
  });

  it('toCalendarDate is the inverse of toStorageDate for utc storage', () => {
    const calendarDay = new Date(2024, 5, 12, 9, 0);
    const storage = toStorageDate(calendarDay, true)!;
    const back = toCalendarDate(storage, true)!;
    // Local wall-clock components round-trip unchanged.
    expect(back.getFullYear()).toBe(2024);
    expect(back.getMonth()).toBe(5);
    expect(back.getDate()).toBe(12);
    expect(back.getHours()).toBe(9);
  });

  it('round-trip: stored utc value → calendar → stored utc value stays stable', () => {
    let stored: string | undefined = '2024-06-12';
    const calendar = toCalendarDate(parseDate(stored, DEFAULT_DATE_FORMAT, { utc: true }), true)!;
    stored = formatDate(toStorageDate(calendar, true)!, DEFAULT_DATE_FORMAT, { utc: true });
    expect(stored).toBe('2024-06-12');
  });

  it('toStorageDate/toCalendarDate pass undefined through safely', () => {
    expect(toStorageDate(undefined, true)).toBeUndefined();
    expect(toCalendarDate(undefined, true)).toBeUndefined();
  });
});

describe('date-utils — period family (month/quarter/year)', () => {
  it('month round-trips through YYYY-MM via the token system', () => {
    const date = parsePeriod('2024-06', 'month', DEFAULT_MONTH_FORMAT);
    expect(date?.getFullYear()).toBe(2024);
    expect(date?.getMonth()).toBe(5);
    expect(formatPeriod(date, 'month', DEFAULT_MONTH_FORMAT)).toBe('2024-06');
  });

  it('year round-trips through YYYY via the token system', () => {
    const date = parsePeriod('2024', 'year', DEFAULT_YEAR_FORMAT);
    expect(date?.getFullYear()).toBe(2024);
    expect(formatPeriod(date, 'year', DEFAULT_YEAR_FORMAT)).toBe('2024');
  });

  it('quarter round-trips through the dedicated YYYY-Qq parser/formatter', () => {
    const date = parsePeriod('2024-Q3', 'quarter', DEFAULT_QUARTER_FORMAT);
    expect(date?.getFullYear()).toBe(2024);
    // Q3 starts in July (month index 6).
    expect(date?.getMonth()).toBe(6);
    expect(formatPeriod(date, 'quarter', DEFAULT_QUARTER_FORMAT)).toBe('2024-Q3');
  });

  it('monthToQuarter maps calendar months to quarters 1-4', () => {
    expect(monthToQuarter(1)).toBe(1);
    expect(monthToQuarter(4)).toBe(2);
    expect(monthToQuarter(6)).toBe(2);
    expect(monthToQuarter(7)).toBe(3);
    expect(monthToQuarter(12)).toBe(4);
  });

  it('parsePeriod returns undefined for empty/malformed values (never throws)', () => {
    expect(parsePeriod(undefined, 'month', DEFAULT_MONTH_FORMAT)).toBeUndefined();
    expect(parsePeriod('', 'quarter', DEFAULT_QUARTER_FORMAT)).toBeUndefined();
    expect(parsePeriod('not-a-period', 'month', DEFAULT_MONTH_FORMAT)).toBeUndefined();
    expect(parsePeriod('2024-Q5', 'quarter', DEFAULT_QUARTER_FORMAT)).toBeUndefined();
    expect(parsePeriod('2024-Q0', 'quarter', DEFAULT_QUARTER_FORMAT)).toBeUndefined();
  });

  it('normalizePeriodRange swaps reversed ends and leaves ordered ends intact', () => {
    const swapped = normalizePeriodRange('2024-Q4', '2024-Q1', 'quarter', DEFAULT_QUARTER_FORMAT);
    expect(swapped.swapped).toBe(true);
    expect(swapped.start).toBe('2024-Q1');
    expect(swapped.end).toBe('2024-Q4');

    const ordered = normalizePeriodRange('2024-Q1', '2024-Q4', 'quarter', DEFAULT_QUARTER_FORMAT);
    expect(ordered.swapped).toBe(false);
    expect(ordered.start).toBe('2024-Q1');
    expect(ordered.end).toBe('2024-Q4');
  });

  it('parsePeriodRange splits a delimited period range into comparable dates', () => {
    const range = parsePeriodRange('2024-01,2024-12', ',', 'month', DEFAULT_MONTH_FORMAT);
    expect(compareDates(range.start, range.end)).toBeLessThan(0);
    expect(formatPeriod(range.start, 'month', DEFAULT_MONTH_FORMAT)).toBe('2024-01');
    expect(formatPeriod(range.end, 'month', DEFAULT_MONTH_FORMAT)).toBe('2024-12');
  });

  it('quarter comparisons order correctly via start-of-quarter dates', () => {
    const q1 = parsePeriod('2024-Q1', 'quarter', DEFAULT_QUARTER_FORMAT)!;
    const q4 = parsePeriod('2024-Q4', 'quarter', DEFAULT_QUARTER_FORMAT)!;
    expect(compareDates(q1, q4)).toBeLessThan(0);
    expect(compareDates(q4, q1)).toBeGreaterThan(0);
  });
});
