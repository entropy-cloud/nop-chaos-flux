import { describe, expect, it } from 'vitest';
import type { GanttTask } from '../gantt.types.js';
import {
  computeScaleRange,
  computeScaleIntervals,
  smartScaling,
} from './scale.js';

function makeTask(overrides: Partial<GanttTask> & { id: string }): GanttTask {
  return {
    text: 'Task',
    start: '2026-01-01',
    end: '2026-01-10',
    type: 'task',
    open: true,
    $x: 0,
    $y: 0,
    $w: 0,
    $h: 0,
    $level: 0,
    $source: [],
    $target: [],
    ...overrides,
  };
}

describe('scale utils', () => {
  describe('computeScaleRange', () => {
    it('should compute range from task dates', () => {
      const tasks = [makeTask({ id: 't1', start: '2026-01-05', end: '2026-01-15' })];
      const range = computeScaleRange(tasks);
      expect(range.start.getTime()).toBeLessThan(new Date('2026-01-05').getTime());
      expect(range.end.getTime()).toBeGreaterThan(new Date('2026-01-15').getTime());
    });

    it('should use explicit startDate/endDate when provided', () => {
      const tasks = [makeTask({ id: 't1' })];
      const range = computeScaleRange(tasks, '2026-02-01', '2026-02-28');
      expect(range.start.toISOString().slice(0, 10)).toBe('2026-02-01');
      // end is snapped to unitEnd (exclusive boundary) — March 1 for inclusive Feb 28
      expect(range.end.toISOString().slice(0, 10)).toBe('2026-03-01');
    });

    it('should return default range for empty tasks', () => {
      const range = computeScaleRange([]);
      expect(range.start).toBeInstanceOf(Date);
      expect(range.end).toBeInstanceOf(Date);
      expect(range.end.getTime()).toBeGreaterThan(range.start.getTime());
    });

    it('should handle single task', () => {
      const tasks = [makeTask({ id: 't1' })];
      const range = computeScaleRange(tasks);
      expect(range.end.getTime()).toBeGreaterThan(range.start.getTime());
    });

    it('should handle cross-year ranges', () => {
      const tasks = [
        makeTask({ id: 't1', start: '2025-12-01', end: '2027-01-31' }),
      ];
      const range = computeScaleRange(tasks);
      expect(range.start.getTime()).toBeLessThan(new Date('2025-12-01').getTime());
      expect(range.end.getTime()).toBeGreaterThan(new Date('2027-01-31').getTime());
    });
  });

  describe('computeScaleIntervals', () => {
    it('should generate day-scale intervals', () => {
      const range = { start: new Date('2026-01-01'), end: new Date('2026-01-10') };
      const rows = computeScaleIntervals(range, [{ unit: 'day', step: 1, format: '%d' }], 40);
      expect(rows).toHaveLength(1);
      expect(rows[0].cells.length).toBeGreaterThanOrEqual(9);
      expect(rows[0].cells[0].label).toBe('01');
      expect(rows[0].cells[0].width).toBeGreaterThan(0);
    });

    it('should generate month-scale intervals', () => {
      const range = { start: new Date('2026-01-01'), end: new Date('2026-06-01') };
      const rows = computeScaleIntervals(range, [{ unit: 'month', step: 1, format: '%Y/%m' }], 40);
      expect(rows[0].cells.length).toBeGreaterThanOrEqual(5);
      expect(rows[0].cells[0].label).toContain('01');
    });

    it('should generate two-row scales (day + month)', () => {
      const range = { start: new Date('2026-01-01'), end: new Date('2026-02-01') };
      const rows = computeScaleIntervals(range, [
        { unit: 'day', step: 1, format: '%d' },
        { unit: 'month', format: '%Y/%m' },
      ], 40);
      expect(rows).toHaveLength(2);
      expect(rows[0].unit).toBe('day');
      expect(rows[1].unit).toBe('month');
    });

    it('should handle hour unit', () => {
      const range = { start: new Date('2026-01-01T00:00:00'), end: new Date('2026-01-01T06:00:00') };
      const rows = computeScaleIntervals(range, [{ unit: 'hour', step: 1, format: '%H:00' }], 40);
      expect(rows[0].cells.length).toBeGreaterThanOrEqual(6);
    });

    it('should handle week unit', () => {
      const range = { start: new Date('2026-01-01'), end: new Date('2026-02-01') };
      const rows = computeScaleIntervals(range, [{ unit: 'week', step: 1, format: 'W%V' }], 40);
      expect(rows[0].cells.length).toBeGreaterThan(0);
    });

    it('should handle quarter unit', () => {
      const range = { start: new Date('2026-01-01'), end: new Date('2027-01-01') };
      const rows = computeScaleIntervals(range, [{ unit: 'quarter', step: 1 }], 40);
      expect(rows[0].cells.length).toBe(4);
    });

    it('should handle year unit', () => {
      const range = { start: new Date('2025-01-01'), end: new Date('2028-01-01') };
      const rows = computeScaleIntervals(range, [{ unit: 'year', step: 1 }], 40);
      expect(rows[0].cells.length).toBe(3);
    });
  });

  describe('smartScaling', () => {
    it('should return visible window for given scroll position', () => {
      const cells = [
        { start: new Date(), end: new Date(), label: '1', x: 0, width: 100 },
        { start: new Date(), end: new Date(), label: '2', x: 100, width: 100 },
        { start: new Date(), end: new Date(), label: '3', x: 200, width: 100 },
        { start: new Date(), end: new Date(), label: '4', x: 300, width: 100 },
      ];
      const window = smartScaling(50, 200, cells);
      expect(window.startCellIndex).toBe(0);
      expect(window.endCellIndex).toBe(2);
    });

    it('should handle scroll past beginning', () => {
      const cells = [
        { start: new Date(), end: new Date(), label: '1', x: 0, width: 100 },
        { start: new Date(), end: new Date(), label: '2', x: 100, width: 100 },
      ];
      const window = smartScaling(0, 50, cells);
      expect(window.startCellIndex).toBe(0);
    });

    it('should handle empty cells', () => {
      const window = smartScaling(0, 100, []);
      expect(window.startCellIndex).toBe(0);
      expect(window.endCellIndex).toBe(-1);
    });
  });
});
