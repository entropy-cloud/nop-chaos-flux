import { describe, it, expect } from 'vitest';
import { timePointToPercentage, eventToVerticalRange, allocateConcurrentWidths } from './calendar-time-utils.js';
import type { CalendarEvent } from '../../schemas.js';

function utcDate(y: number, m: number, d: number, h: number = 0, min: number = 0): Date {
  return new Date(Date.UTC(y, m - 1, d, h, min));
}

function makeEvent(overrides: Partial<CalendarEvent> & { id: string; title: string; start: string; end: string }): CalendarEvent {
  return {
    type: 'shift',
    status: 'scheduled',
    ...overrides,
  };
}

describe('calendar-time-utils', () => {
  describe('timePointToPercentage', () => {
    it('should return 0 for start hour', () => {
      const result = timePointToPercentage({
        date: utcDate(2026, 7, 20, 8, 0),
        dayStartHour: 8,
        dayEndHour: 20,
      });
      expect(result).toBe(0);
    });

    it('should return correct percentage for noon', () => {
      const result = timePointToPercentage({
        date: utcDate(2026, 7, 20, 14, 0),
        dayStartHour: 8,
        dayEndHour: 20,
      });
      expect(result).toBe(50);
    });

    it('should return 100 for end hour', () => {
      const result = timePointToPercentage({
        date: utcDate(2026, 7, 20, 20, 0),
        dayStartHour: 8,
        dayEndHour: 20,
      });
      expect(result).toBe(100);
    });

    it('should return 0 for time before start hour', () => {
      const result = timePointToPercentage({
        date: utcDate(2026, 7, 20, 6, 0),
        dayStartHour: 8,
        dayEndHour: 20,
      });
      expect(result).toBe(0);
    });

    it('should return 100 for time after end hour', () => {
      const result = timePointToPercentage({
        date: utcDate(2026, 7, 20, 22, 0),
        dayStartHour: 8,
        dayEndHour: 20,
      });
      expect(result).toBe(100);
    });
  });

  describe('eventToVerticalRange', () => {
    it('should calculate correct top and height for 1-hour event', () => {
      const event = makeEvent({ id: '1', title: 'Meeting', start: '2026-07-20T09:00:00', end: '2026-07-20T10:00:00' });
      const result = eventToVerticalRange(event, 8, 20);
      expect(result.top).toBeCloseTo(8.33, 1);
      expect(result.height).toBeCloseTo(8.33, 1);
    });

    it('should clamp to day boundaries', () => {
      const event = makeEvent({ id: '1', title: 'Overnight', start: '2026-07-20T06:00:00', end: '2026-07-20T22:00:00' });
      const result = eventToVerticalRange(event, 8, 20);
      expect(result.top).toBe(0);
      expect(result.height).toBe(100);
    });

    it('should handle partial-hour event', () => {
      const event = makeEvent({ id: '1', title: 'Quick', start: '2026-07-20T08:30:00', end: '2026-07-20T09:15:00' });
      const result = eventToVerticalRange(event, 8, 20);
      expect(result.top).toBeCloseTo(4.17, 1);
      expect(result.height).toBeCloseTo(6.25, 1);
    });
  });

  describe('allocateConcurrentWidths', () => {
    it('should allocate full width for single event', () => {
      const events = [
        makeEvent({ id: '1', title: 'A', start: '2026-07-20T09:00:00', end: '2026-07-20T10:00:00' }),
      ];
      const result = allocateConcurrentWidths(events, 8, 20);
      expect(result).toHaveLength(1);
      expect(result[0].width).toBe(100);
      expect(result[0].left).toBe(0);
    });

    it('should allocate half width for two concurrent events', () => {
      const events = [
        makeEvent({ id: '1', title: 'A', start: '2026-07-20T09:00:00', end: '2026-07-20T10:00:00' }),
        makeEvent({ id: '2', title: 'B', start: '2026-07-20T09:00:00', end: '2026-07-20T10:00:00' }),
      ];
      const result = allocateConcurrentWidths(events, 8, 20);
      expect(result).toHaveLength(2);
      expect(result[0].width).toBe(50);
      expect(result[1].width).toBe(50);
    });

    it('should allocate widths for non-overlapping events at full width', () => {
      const events = [
        makeEvent({ id: '1', title: 'A', start: '2026-07-20T09:00:00', end: '2026-07-20T10:00:00' }),
        makeEvent({ id: '2', title: 'B', start: '2026-07-20T10:00:00', end: '2026-07-20T11:00:00' }),
      ];
      const result = allocateConcurrentWidths(events, 8, 20);
      expect(result).toHaveLength(2);
      expect(result[0].width).toBe(100);
      expect(result[1].width).toBe(100);
    });
  });
});
