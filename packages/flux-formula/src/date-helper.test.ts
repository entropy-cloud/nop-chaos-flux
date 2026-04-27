import { describe, expect, it } from 'vitest';
import { dateHelper } from './date-helper';

describe('dateHelper', () => {
  it('parses, formats, and reads date parts', () => {
    const value = dateHelper.parse('2026-04-13T12:34:56Z');

    expect(value).toBeInstanceOf(Date);
    expect(dateHelper.format('2026-04-13T12:34:56Z', 'iso-date')).toBe('2026-04-13');
    expect(dateHelper.format('2026-04-13T12:34:56Z', 'iso-datetime')).toBe('2026-04-13T12:34:56Z');
    expect(dateHelper.format('2026-04-13T12:34:56Z', 'date')).toBe('2026-04-13');
    expect(dateHelper.format('2026-04-13T12:34:56Z', 'datetime')).toBe('2026-04-13 12:34:56');
    expect(dateHelper.year('2026-04-13T12:34:56Z')).toBe(2026);
    expect(dateHelper.month('2026-04-13T12:34:56Z')).toBe(4);
    expect(dateHelper.day('2026-04-13T12:34:56Z')).toBe(13);
    expect(dateHelper.hours('2026-04-13T12:34:56Z')).toBe(12);
    expect(dateHelper.minutes('2026-04-13T12:34:56Z')).toBe(34);
    expect(dateHelper.seconds('2026-04-13T12:34:56Z')).toBe(56);
  });

  it('supports date arithmetic and invalid-input fallbacks', () => {
    expect(dateHelper.addDays('2026-04-13T00:00:00Z', 2)?.toISOString()).toBe('2026-04-15T00:00:00.000Z');
    expect(dateHelper.addMonths('2026-04-13T00:00:00Z', 2)?.toISOString()).toBe('2026-06-13T00:00:00.000Z');
    expect(dateHelper.addYears('2026-04-13T00:00:00Z', 1)?.toISOString()).toBe('2027-04-13T00:00:00.000Z');
    expect(dateHelper.diff('2026-04-13T00:00:00Z', '2026-04-10T00:00:00Z', 'day')).toBe(3);
    expect(dateHelper.diff('2026-06-13T00:00:00Z', '2026-04-13T00:00:00Z', 'month')).toBe(2);
    expect(dateHelper.diff('2028-04-13T00:00:00Z', '2026-04-13T00:00:00Z', 'year')).toBe(2);
    expect(dateHelper.parse('not-a-date')).toBeNull();
    expect(dateHelper.format('not-a-date', 'iso-date')).toBe('');
    expect(dateHelper.addDays('not-a-date', 1)).toBeNull();
    expect(dateHelper.addMonths('not-a-date', 1)).toBeNull();
    expect(dateHelper.addYears('not-a-date', 1)).toBeNull();
    expect(Number.isNaN(dateHelper.year('not-a-date'))).toBe(true);
    expect(Number.isNaN(dateHelper.diff('not-a-date', '2026-04-13T00:00:00Z', 'day'))).toBe(true);
  });

  it('covers Date inputs, nullish paths, and today normalization', () => {
    const source = new Date('2026-04-13T12:34:56Z');
    const parsed = dateHelper.parse(source);

    expect(parsed).toBeInstanceOf(Date);
    expect(parsed).not.toBe(source);
    expect(parsed?.toISOString()).toBe('2026-04-13T12:34:56.000Z');

    const invalidDate = new Date(Number.NaN);
    expect(dateHelper.parse(invalidDate)).toBeNull();
    expect(dateHelper.format(null as never, 'date')).toBe('');

    const today = dateHelper.today();
    expect(today.getUTCHours()).toBe(0);
    expect(today.getUTCMinutes()).toBe(0);
    expect(today.getUTCSeconds()).toBe(0);
  });
});
