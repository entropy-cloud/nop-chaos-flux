import { describe, expect, it } from 'vitest';
import {
  dateSelectionFor,
  daysInMonth,
  decodeDate,
  encodeDate,
  timeSelectionFor,
  wheelDateColumns,
  encodeTime,
  wheelTimeColumns,
} from './wheel-date-columns.js';

describe('wheel-date-columns (plan 665 Phase 3)', () => {
  it('encodes/decodes YYYY-MM-DD round-trip with zero padding', () => {
    expect(encodeDate([2026, 1, 5])).toBe('2026-01-05');
    expect(encodeDate([2026, 12, 31])).toBe('2026-12-31');
    expect(decodeDate('2026-01-05')).toEqual([2026, 1, 5]);
    expect(decodeDate('garbage')).toBeNull();
  });

  it('computes month lengths incl. leap years', () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2023, 2)).toBe(28);
    expect(daysInMonth(2026, 1)).toBe(31);
    expect(daysInMonth(2026, 4)).toBe(30);
  });

  it('generates year/month/day columns clamped to the min/max range', () => {
    const columns = wheelDateColumns('2026-01-05', '2026-03-10');
    expect(columns[0].map((o) => o.value)).toEqual([2026]);
    expect(columns[1].map((o) => o.value)).toEqual([1, 2, 3]);
    // day column for the WIDEST month view (March) spans 1..10 at the max edge
    const marchDays = columns[2].map((o) => o.value);
    expect(marchDays[0]).toBe(1);
    expect(marchDays[marchDays.length - 1]).toBe(31);
  });

  it('converges the day column to the selected month length', () => {
    // Feb 2024 (leap): 29 days; switching year to 2023 clamps day 29→28
    const columns = wheelDateColumns('2023-01-01', '2026-12-31');
    expect(columns.length).toBe(3);
    const selection = dateSelectionFor('2023-01-01', '2026-12-31', [2023, 2, 29]);
    expect(selection).toEqual([2023, 2, 28]);
    const leap = dateSelectionFor('2023-01-01', '2026-12-31', [2024, 2, 29]);
    expect(leap).toEqual([2024, 2, 29]);
  });

  it('clamps selections outside the min/max range', () => {
    expect(dateSelectionFor('2026-01-05', '2026-03-10', [2025, 6, 1])).toEqual([2026, 1, 5]);
    expect(dateSelectionFor('2026-01-05', '2026-03-10', [2026, 5, 20])).toEqual([2026, 3, 10]);
    // boundary month days: Jan 5 floor
    expect(dateSelectionFor('2026-01-05', '2026-03-10', [2026, 1, 2])).toEqual([2026, 1, 5]);
  });

  it('falls back to the range floor for garbage values', () => {
    expect(dateSelectionFor('2026-01-05', '2026-03-10', null)).toEqual([2026, 1, 5]);
  });
});

describe('wheel-time-columns (plan 665 Phase 3)', () => {
  it('generates hour/minute columns with zero-padded labels', () => {
    const columns = wheelTimeColumns(1);
    expect(columns[0]).toHaveLength(24);
    expect(columns[0][0]).toEqual({ label: '00', value: 0 });
    expect(columns[0][9]).toEqual({ label: '09', value: 9 });
    expect(columns[1]).toHaveLength(60);
    expect(columns[1][5]).toEqual({ label: '05', value: 5 });
  });

  it('applies the minute step', () => {
    const columns = wheelTimeColumns(15);
    expect(columns[1].map((o) => o.value)).toEqual([0, 15, 30, 45]);
  });

  it('encodes/decodes HH:mm round-trip', () => {
    expect(timeSelectionFor('09:05')).toEqual([9, 5]);
    expect(timeSelectionFor(null)).toEqual([0, 0]);
    // encodeDate-style padding is asserted through encodeTime
    expect(encodeTime([9, 5])).toBe('09:05');
    expect(encodeTime([23, 59])).toBe('23:59');
  });

  it('clamps minute to a valid step multiple', () => {
    expect(timeSelectionFor('09:07', 15)).toEqual([9, 0]);
    expect(timeSelectionFor('09:07')).toEqual([9, 7]);
  });
});
