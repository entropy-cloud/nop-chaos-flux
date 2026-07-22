import { describe, expect, it } from 'vitest';
import {
  diffInDays,
  addDays,
  getWeekStart,
  getWeekEnd,
  getMonthStart,
  getMonthEnd,
  getQuarterStart,
  getQuarterEnd,
  getYearStart,
  getYearEnd,
  formatDate,
  unitStart,
  unitEnd,
  addUnit,
} from './date.js';

describe('date utils', () => {
  describe('diffInDays', () => {
    it('should compute positive difference', () => {
      expect(diffInDays(new Date('2026-01-10'), new Date('2026-01-01'))).toBe(9);
    });

    it('should compute negative difference', () => {
      expect(diffInDays(new Date('2026-01-01'), new Date('2026-01-10'))).toBe(-9);
    });

    it('should return 0 for same day', () => {
      expect(diffInDays(new Date('2026-01-15'), new Date('2026-01-15'))).toBe(0);
    });

    it('should handle cross-year ranges', () => {
      expect(diffInDays(new Date('2027-01-01'), new Date('2026-01-01'))).toBe(365);
    });
  });

  describe('addDays', () => {
    it('should add positive days', () => {
      const result = addDays(new Date('2026-01-01'), 5);
      expect(result.toISOString().slice(0, 10)).toBe('2026-01-06');
    });

    it('should add negative days', () => {
      const result = addDays(new Date('2026-01-10'), -5);
      expect(result.toISOString().slice(0, 10)).toBe('2026-01-05');
    });
  });

  describe('week boundaries', () => {
    it('should get week start (Monday) for a Wednesday', () => {
      const result = getWeekStart(new Date('2026-01-07'));
      expect(result.getUTCDay()).toBe(1);
      expect(result.toISOString().slice(0, 10)).toBe('2026-01-05');
    });

    it('should get week start (Monday) for a Sunday', () => {
      const result = getWeekStart(new Date('2026-01-11'));
      expect(result.getUTCDay()).toBe(1);
      expect(result.toISOString().slice(0, 10)).toBe('2026-01-05');
    });

    it('should get week end (Sunday)', () => {
      const result = getWeekEnd(new Date('2026-01-07'));
      expect(result.getUTCDay()).toBe(0);
      expect(result.toISOString().slice(0, 10)).toBe('2026-01-11');
    });
  });

  describe('month boundaries', () => {
    it('should get month start', () => {
      const result = getMonthStart(new Date('2026-03-15'));
      expect(result.toISOString().slice(0, 10)).toBe('2026-03-01');
    });

    it('should get month end', () => {
      const result = getMonthEnd(new Date('2026-02-15'));
      expect(result.toISOString().slice(0, 10)).toBe('2026-02-28');
    });
  });

  describe('quarter boundaries', () => {
    it('should get Q1 start', () => {
      const result = getQuarterStart(new Date('2026-03-15'));
      expect(result.toISOString().slice(0, 10)).toBe('2026-01-01');
    });

    it('should get Q4 end', () => {
      const result = getQuarterEnd(new Date('2026-11-15'));
      expect(result.toISOString().slice(0, 10)).toBe('2026-12-31');
    });
  });

  describe('year boundaries', () => {
    it('should get year start', () => {
      expect(getYearStart(new Date('2026-07-15')).toISOString().slice(0, 10)).toBe('2026-01-01');
    });

    it('should get year end', () => {
      expect(getYearEnd(new Date('2026-07-15')).toISOString().slice(0, 10)).toBe('2026-12-31');
    });
  });

  describe('formatDate', () => {
    it('should format with %Y/%m/%d', () => {
      expect(formatDate(new Date('2026-03-05'), '%Y/%m/%d')).toBe('2026/03/05');
    });

    it('should format with %b %d, %Y', () => {
      expect(formatDate(new Date('2026-03-05'), '%b %d, %Y')).toBe('Mar 05, 2026');
    });

    it('should handle plain text without tokens', () => {
      expect(formatDate(new Date('2026-01-01'), 'Today')).toBe('Today');
    });

    it('should format %V as ISO week number', () => {
      const d = new Date('2026-01-05');
      const result = formatDate(d, '%V');
      expect(result).toBe('02');
    });

    it('should format %q as quarter number', () => {
      expect(formatDate(new Date('2026-03-15'), '%q')).toBe('1');
      expect(formatDate(new Date('2026-04-01'), '%q')).toBe('2');
      expect(formatDate(new Date('2026-07-01'), '%q')).toBe('3');
      expect(formatDate(new Date('2026-10-01'), '%q')).toBe('4');
    });

    it('should format %W as week-of-year', () => {
      const d = new Date('2026-01-05');
      const result = formatDate(d, '%W');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('unitStart / unitEnd', () => {
    it('should get day start', () => {
      const d = new Date('2026-03-05T14:30:00');
      const start = unitStart(d, 'day');
      expect(start.getUTCHours()).toBe(0);
      expect(start.getUTCMinutes()).toBe(0);
    });

    it('should get quarter start', () => {
      const d = new Date('2026-05-15');
      const start = unitStart(d, 'quarter');
      expect(start.getUTCMonth()).toBe(3);
      expect(start.getUTCDate()).toBe(1);
    });

    it('should get month end', () => {
      const d = new Date('2026-02-15');
      const end = unitEnd(d, 'month');
      expect(end.getUTCMonth()).toBe(2);
      expect(end.getUTCDate()).toBe(1);
    });
  });

  describe('addUnit', () => {
    it('should add months', () => {
      const result = addUnit(new Date('2026-01-15'), 'month', 2);
      expect(result.getUTCMonth()).toBe(2);
    });

    it('should add quarters', () => {
      const result = addUnit(new Date('2026-01-15'), 'quarter', 1);
      expect(result.getUTCMonth()).toBe(3);
    });

    it('should add years', () => {
      const result = addUnit(new Date('2026-01-15'), 'year', 2);
      expect(result.getUTCFullYear()).toBe(2028);
    });
  });
});
