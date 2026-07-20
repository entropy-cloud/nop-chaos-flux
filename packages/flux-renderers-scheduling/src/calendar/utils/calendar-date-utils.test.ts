import { describe, it, expect } from 'vitest';
import {
  getMonthStartEnd,
  getWeekStartEnd,
  getDayStartEnd,
  getDateRange,
  isSameDay,
  isWeekend,
  addDays,
  addMonths,
  diffInDays,
  toISODateString,
  parseISODate,
  getDaysInMonth,
  getMonthDays,
} from './calendar-date-utils.js';

function date(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d));
}

describe('calendar-date-utils', () => {
  describe('getMonthStartEnd', () => {
    it('should return correct start and end for a month', () => {
      const { start, end } = getMonthStartEnd(date(2026, 7, 15));
      expect(start).toEqual(date(2026, 7, 1));
      expect(end.getUTCDate()).toBe(31);
      expect(end.getUTCHours()).toBe(23);
      expect(end.getUTCMinutes()).toBe(59);
    });

    it('should handle December (cross-year boundary)', () => {
      const { start, end } = getMonthStartEnd(date(2026, 12, 25));
      expect(start).toEqual(date(2026, 12, 1));
      expect(end.getUTCFullYear()).toBe(2026);
      expect(end.getUTCMonth()).toBe(11);
      expect(end.getUTCDate()).toBe(31);
    });

    it('should handle February in leap year', () => {
      const { start, end } = getMonthStartEnd(date(2024, 2, 15));
      expect(start).toEqual(date(2024, 2, 1));
      expect(end.getUTCDate()).toBe(29);
    });

    it('should handle February in non-leap year', () => {
      const { start, end } = getMonthStartEnd(date(2023, 2, 15));
      expect(start).toEqual(date(2023, 2, 1));
      expect(end.getUTCDate()).toBe(28);
    });
  });

  describe('getWeekStartEnd', () => {
    it('should return week starting on Sunday by default', () => {
      const wednesday = date(2026, 7, 22);
      const { start, end } = getWeekStartEnd(wednesday, 0);
      expect(start).toEqual(date(2026, 7, 19));
      expect(end.getUTCDate()).toBe(25);
    });

    it('should return week starting on Monday when firstDayOfWeek=1', () => {
      const wednesday = date(2026, 7, 22);
      const { start, end } = getWeekStartEnd(wednesday, 1);
      expect(start).toEqual(date(2026, 7, 20));
      expect(end.getUTCDate()).toBe(26);
    });

    it('should handle cross-month week boundary', () => {
      const date2 = date(2026, 8, 1);
      const { start } = getWeekStartEnd(date2, 0);
      expect(start.getUTCMonth()).toBe(6);
    });
  });

  describe('getDayStartEnd', () => {
    it('should return start and end for a given day', () => {
      const { start, end } = getDayStartEnd(date(2026, 7, 20));
      expect(start).toEqual(date(2026, 7, 20));
      expect(end.getUTCHours()).toBe(23);
      expect(end.getUTCMinutes()).toBe(59);
      expect(end.getUTCSeconds()).toBe(59);
    });
  });

  describe('getDateRange', () => {
    it('should return all dates in range inclusive', () => {
      const dates = getDateRange(date(2026, 7, 1), date(2026, 7, 5));
      expect(dates).toHaveLength(5);
      expect(dates[0]).toEqual(date(2026, 7, 1));
      expect(dates[4]).toEqual(date(2026, 7, 5));
    });

    it('should return single day when start equals end', () => {
      const dates = getDateRange(date(2026, 7, 20), date(2026, 7, 20));
      expect(dates).toHaveLength(1);
    });
  });

  describe('isSameDay', () => {
    it('should return true for same date', () => {
      expect(isSameDay(date(2026, 7, 20), date(2026, 7, 20))).toBe(true);
    });

    it('should return false for different dates', () => {
      expect(isSameDay(date(2026, 7, 20), date(2026, 7, 21))).toBe(false);
    });

    it('should return false for different months', () => {
      expect(isSameDay(date(2026, 7, 20), date(2026, 8, 20))).toBe(false);
    });
  });

  describe('isWeekend', () => {
    it('should return true for Sunday', () => {
      expect(isWeekend(date(2026, 7, 19))).toBe(true);
    });

    it('should return true for Saturday', () => {
      expect(isWeekend(date(2026, 7, 25))).toBe(true);
    });

    it('should return false for Wednesday', () => {
      expect(isWeekend(date(2026, 7, 22))).toBe(false);
    });
  });

  describe('addDays', () => {
    it('should add positive days', () => {
      const result = addDays(date(2026, 7, 20), 5);
      expect(result).toEqual(date(2026, 7, 25));
    });

    it('should subtract days', () => {
      const result = addDays(date(2026, 7, 20), -5);
      expect(result).toEqual(date(2026, 7, 15));
    });

    it('should cross month boundary', () => {
      const result = addDays(date(2026, 7, 31), 1);
      expect(result).toEqual(date(2026, 8, 1));
    });
  });

  describe('addMonths', () => {
    it('should add positive months', () => {
      const result = addMonths(date(2026, 7, 20), 2);
      expect(result).toEqual(date(2026, 9, 20));
    });

    it('should subtract months', () => {
      const result = addMonths(date(2026, 7, 20), -2);
      expect(result).toEqual(date(2026, 5, 20));
    });

    it('should handle cross-year transition', () => {
      const result = addMonths(date(2026, 11, 15), 3);
      expect(result).toEqual(date(2027, 2, 15));
    });

    it('should handle leap year date overflow', () => {
      const result = addMonths(date(2024, 1, 31), 1);
      expect(result.getUTCDate()).toBe(29);
    });
  });

  describe('diffInDays', () => {
    it('should return positive difference', () => {
      expect(diffInDays(date(2026, 7, 20), date(2026, 7, 25))).toBe(5);
    });

    it('should return negative difference', () => {
      expect(diffInDays(date(2026, 7, 25), date(2026, 7, 20))).toBe(-5);
    });

    it('should return 0 for same day', () => {
      expect(diffInDays(date(2026, 7, 20), date(2026, 7, 20))).toBe(0);
    });
  });

  describe('toISODateString', () => {
    it('should format date as YYYY-MM-DD', () => {
      expect(toISODateString(date(2026, 7, 20))).toBe('2026-07-20');
    });
  });

  describe('parseISODate', () => {
    it('should parse valid ISO date string', () => {
      const result = parseISODate('2026-07-20');
      expect(result).toEqual(date(2026, 7, 20));
    });

    it('should return undefined for invalid string', () => {
      expect(parseISODate('not-a-date')).toBeUndefined();
    });
  });

  describe('getDaysInMonth', () => {
    it('should return 31 for July', () => {
      expect(getDaysInMonth(date(2026, 7, 15))).toBe(31);
    });

    it('should return 28 for February 2023', () => {
      expect(getDaysInMonth(date(2023, 2, 15))).toBe(28);
    });

    it('should return 29 for February 2024 (leap)', () => {
      expect(getDaysInMonth(date(2024, 2, 15))).toBe(29);
    });
  });

  describe('getMonthDays', () => {
    it('should return correct number of days for month grid', () => {
      const days = getMonthDays(date(2026, 7, 15), 0);
      expect(days.length).toBeGreaterThanOrEqual(28);
      expect(days.length).toBeLessThanOrEqual(42);
    });

    it('should start on correct weekday for firstDayOfWeek=0', () => {
      const days = getMonthDays(date(2026, 7, 1), 0);
      expect(days[0].getUTCDay()).toBe(0);
    });

    it('should start on correct weekday for firstDayOfWeek=1', () => {
      const days = getMonthDays(date(2026, 7, 1), 1);
      expect(days[0].getUTCDay()).toBe(1);
    });
  });
});
