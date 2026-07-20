import { describe, it, expect } from 'vitest';
import { splitMultiDayEvents, positionEventsInMonth, detectConflicts } from './calendar-layout-utils.js';
import type { CalendarEvent } from '../../schemas.js';
import { getMonthStartEnd } from './calendar-date-utils.js';

function date(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d));
}

function makeEvent(overrides: Partial<CalendarEvent> & { id: string; title: string; start: string; end: string }): CalendarEvent {
  return {
    type: 'shift',
    status: 'scheduled',
    ...overrides,
  };
}

describe('calendar-layout-utils', () => {
  describe('splitMultiDayEvents', () => {
    it('should not split single-day event', () => {
      const event = makeEvent({ id: '1', title: '早班', start: '2026-07-20', end: '2026-07-20' });
      const blocks = splitMultiDayEvents([event]);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].isSplit).toBe(false);
      expect(blocks[0].eventId).toBe('1');
      expect(blocks[0].date).toBe('2026-07-20');
    });

    it('should split 2-day event into 2 blocks', () => {
      const event = makeEvent({ id: '1', title: '跨日', start: '2026-07-20', end: '2026-07-21' });
      const blocks = splitMultiDayEvents([event]);
      expect(blocks).toHaveLength(2);
      expect(blocks[0].date).toBe('2026-07-20');
      expect(blocks[1].date).toBe('2026-07-21');
      expect(blocks[0].isSplit).toBe(true);
      expect(blocks[1].isSplit).toBe(true);
    });

    it('should split 3-day event into 3 blocks', () => {
      const event = makeEvent({ id: '1', title: '3天', start: '2026-07-20', end: '2026-07-22' });
      const blocks = splitMultiDayEvents([event]);
      expect(blocks).toHaveLength(3);
    });

    it('should split cross-week event', () => {
      const event = makeEvent({ id: '1', title: '跨周', start: '2026-07-25', end: '2026-07-27' });
      const blocks = splitMultiDayEvents([event]);
      expect(blocks).toHaveLength(3);
    });

    it('should split cross-month event', () => {
      const event = makeEvent({ id: '1', title: '跨月', start: '2026-07-30', end: '2026-08-01' });
      const blocks = splitMultiDayEvents([event]);
      expect(blocks).toHaveLength(3);
      expect(blocks[0].date).toBe('2026-07-30');
      expect(blocks[2].date).toBe('2026-08-01');
    });

    it('should handle multiple events', () => {
      const e1 = makeEvent({ id: '1', title: 'A', start: '2026-07-20', end: '2026-07-20' });
      const e2 = makeEvent({ id: '2', title: 'B', start: '2026-07-21', end: '2026-07-22' });
      const blocks = splitMultiDayEvents([e1, e2]);
      expect(blocks).toHaveLength(3);
    });

    it('should skip events with unparseable dates', () => {
      const event = makeEvent({ id: '1', title: 'Bad', start: 'invalid', end: 'invalid' });
      const blocks = splitMultiDayEvents([event]);
      expect(blocks).toHaveLength(0);
    });
  });

  describe('positionEventsInMonth', () => {
    it('should place single event at full width', () => {
      const events = [
        makeEvent({ id: '1', title: '早班', start: '2026-07-20', end: '2026-07-20', resourceId: 'r1' }),
      ];
      const resources = [{ id: 'r1', text: '张三' }];
      const dateRange = getMonthStartEnd(date(2026, 7, 15));
      const result = positionEventsInMonth({ events, resources, dateRange, maxConcurrent: 4 });

      const row = result.get('r1');
      expect(row).toBeDefined();
      const dayEvents = row!.get('2026-07-20');
      expect(dayEvents).toBeDefined();
      expect(dayEvents!).toHaveLength(1);
      expect(dayEvents![0].width).toBe(25);
      expect(dayEvents![0].left).toBe(0);
    });

    it('should position concurrent events with shared width', () => {
      const events = [
        makeEvent({ id: '1', title: '早班', start: '2026-07-20', end: '2026-07-20', resourceId: 'r1' }),
        makeEvent({ id: '2', title: '年假', start: '2026-07-20', end: '2026-07-20', resourceId: 'r1' }),
      ];
      const resources = [{ id: 'r1', text: '张三' }];
      const dateRange = getMonthStartEnd(date(2026, 7, 15));
      const result = positionEventsInMonth({ events, resources, dateRange, maxConcurrent: 4 });

      const row = result.get('r1');
      const dayEvents = row!.get('2026-07-20');
      expect(dayEvents).toHaveLength(2);
      expect(dayEvents![0].width).toBe(25);
      expect(dayEvents![0].left).toBe(0);
      expect(dayEvents![1].width).toBe(25);
      expect(dayEvents![1].left).toBe(25);
    });

    it('should cap events at maxConcurrent', () => {
      const events = Array.from({ length: 6 }, (_, i) =>
        makeEvent({ id: `${i}`, title: `E${i}`, start: '2026-07-20', end: '2026-07-20', resourceId: 'r1' }),
      );
      const resources = [{ id: 'r1', text: '张三' }];
      const dateRange = getMonthStartEnd(date(2026, 7, 15));
      const result = positionEventsInMonth({ events, resources, dateRange, maxConcurrent: 3 });

      const row = result.get('r1');
      const dayEvents = row!.get('2026-07-20');
      expect(dayEvents).toHaveLength(3);
    });

    it('should distribute events across resources independently', () => {
      const events = [
        makeEvent({ id: '1', title: '早班', start: '2026-07-20', end: '2026-07-20', resourceId: 'r1' }),
        makeEvent({ id: '2', title: '晚班', start: '2026-07-20', end: '2026-07-20', resourceId: 'r2' }),
      ];
      const resources = [{ id: 'r1', text: '张三' }, { id: 'r2', text: '李四' }];
      const dateRange = getMonthStartEnd(date(2026, 7, 15));
      const result = positionEventsInMonth({ events, resources, dateRange, maxConcurrent: 4 });

      expect(result.get('r1')!.get('2026-07-20')).toHaveLength(1);
      expect(result.get('r2')!.get('2026-07-20')).toHaveLength(1);
    });

    it('should handle multi-day events in month view', () => {
      const events = [
        makeEvent({ id: '1', title: '跨日', start: '2026-07-20', end: '2026-07-22', resourceId: 'r1' }),
      ];
      const resources = [{ id: 'r1', text: '张三' }];
      const dateRange = getMonthStartEnd(date(2026, 7, 15));
      const result = positionEventsInMonth({ events, resources, dateRange, maxConcurrent: 4 });

      const row = result.get('r1');
      expect(row!.get('2026-07-20')).toHaveLength(1);
      expect(row!.get('2026-07-21')).toHaveLength(1);
      expect(row!.get('2026-07-22')).toHaveLength(1);
      expect(row!.get('2026-07-20')![0].isSplit).toBe(true);
    });
  });

  describe('detectConflicts', () => {
    it('should detect overlapping events for same resource and date', () => {
      const events = [
        makeEvent({ id: '1', title: '早班', start: '2026-07-20T09:00:00', end: '2026-07-20T17:00:00', resourceId: 'r1' }),
        makeEvent({ id: '2', title: '加班', start: '2026-07-20T14:00:00', end: '2026-07-20T18:00:00', resourceId: 'r1' }),
      ];
      const conflict = detectConflicts({ events, resourceId: 'r1', date: '2026-07-20' });
      expect(conflict).toBeDefined();
      expect(conflict!.overlappingEvents).toHaveLength(2);
    });

    it('should not detect conflict for non-overlapping events', () => {
      const events = [
        makeEvent({ id: '1', title: '早班', start: '2026-07-20T09:00:00', end: '2026-07-20T12:00:00', resourceId: 'r1' }),
        makeEvent({ id: '2', title: '晚班', start: '2026-07-20T14:00:00', end: '2026-07-20T18:00:00', resourceId: 'r1' }),
      ];
      const conflict = detectConflicts({ events, resourceId: 'r1', date: '2026-07-20' });
      expect(conflict).toBeUndefined();
    });

    it('should not detect conflict for different resources', () => {
      const events = [
        makeEvent({ id: '1', title: '早班', start: '2026-07-20T09:00:00', end: '2026-07-20T17:00:00', resourceId: 'r1' }),
        makeEvent({ id: '2', title: '早班', start: '2026-07-20T09:00:00', end: '2026-07-20T17:00:00', resourceId: 'r2' }),
      ];
      const conflict = detectConflicts({ events, resourceId: 'r1', date: '2026-07-20' });
      expect(conflict).toBeUndefined();
    });

    it('should return undefined for single event (no conflict possible)', () => {
      const events = [
        makeEvent({ id: '1', title: '早班', start: '2026-07-20T09:00:00', end: '2026-07-20T17:00:00', resourceId: 'r1' }),
      ];
      const conflict = detectConflicts({ events, resourceId: 'r1', date: '2026-07-20' });
      expect(conflict).toBeUndefined();
    });
  });
});
