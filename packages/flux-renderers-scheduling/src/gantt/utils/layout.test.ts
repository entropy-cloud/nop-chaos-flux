import { describe, expect, it } from 'vitest';
import type { GanttTask, GanttLink } from '../gantt.types.js';
import {
  dateToPixel,
  pixelToDate,
  taskToPixels,
  linkToPolyline,
  computeTaskLayout,
  computeLinkPolylines,
} from './layout.js';

const scaleRange = { start: new Date('2026-01-01'), end: new Date('2026-02-01') };

describe('layout utils', () => {
  describe('dateToPixel', () => {
    it('should convert date to pixel offset', () => {
      const x = dateToPixel(new Date('2026-01-05'), scaleRange, 40);
      expect(x).toBe(160);
    });

    it('should return 0 for date before range start', () => {
      const x = dateToPixel(new Date('2025-12-25'), scaleRange, 40);
      expect(x).toBe(0);
    });
  });

  describe('pixelToDate', () => {
    it('should convert pixel to date', () => {
      const date = pixelToDate(160, scaleRange, 40);
      expect(date.toISOString().slice(0, 10)).toBe('2026-01-05');
    });

    it('should round-trip accurately', () => {
      const original = new Date('2026-01-15');
      const x = dateToPixel(original, scaleRange, 40);
      const result = pixelToDate(x, scaleRange, 40);
      expect(result.toISOString().slice(0, 10)).toBe(original.toISOString().slice(0, 10));
    });
  });

  describe('taskToPixels', () => {
    it('should compute task pixel dimensions', () => {
      const result = taskToPixels(
        { start: '2026-01-05', end: '2026-01-15' },
        scaleRange,
        40,
        28,
        12,
      );
      expect(result.$x).toBe(160);
      expect(result.$w).toBeGreaterThan(0);
      expect(result.$h).toBe(28);
    });

    it('should have minimum width of 4px', () => {
      const result = taskToPixels(
        { start: '2026-01-05', end: '2026-01-05' },
        scaleRange,
        40,
        28,
        12,
      );
      expect(result.$w).toBe(4);
    });
  });

  describe('linkToPolyline', () => {
    it('should generate polyline points', () => {
      const source = { $x: 0, $y: 0, $w: 200, $h: 24 };
      const target = { $x: 400, $y: 40, $w: 200, $h: 24 };
      const polyline = linkToPolyline(source, target);
      expect(polyline).toBe('200,12 300,12 300,52 400,52');
    });
  });

  describe('computeTaskLayout', () => {
    it('should compute $x/$y/$w/$h for visible tasks', () => {
      const tasks = [
        {
          id: 't1', text: 'Task 1', start: '2026-01-05', end: '2026-01-15',
          type: 'task' as const, open: true, $x: 0, $y: 0, $w: 0, $h: 0,
          $level: 0, $source: [], $target: [],
        },
      ];
      computeTaskLayout(tasks, ['t1'], scaleRange, 40, 28, 40);
      expect(tasks[0].$x).toBeGreaterThan(0);
      expect(tasks[0].$y).toBe(6);
      expect(tasks[0].$w).toBeGreaterThan(0);
      expect(tasks[0].$h).toBe(28);
    });
  });

  describe('computeLinkPolylines', () => {
    it('should compute $p for all links', () => {
      const tasks = new Map<string, GanttTask>([
        ['t1', {
          id: 't1', text: 'A', start: '2026-01-01', end: '2026-01-10',
          type: 'task', open: true, $x: 0, $y: 0, $w: 360, $h: 28,
          $level: 0, $source: [], $target: [],
        }],
        ['t2', {
          id: 't2', text: 'B', start: '2026-01-11', end: '2026-01-20',
          type: 'task', open: true, $x: 400, $y: 40, $w: 360, $h: 28,
          $level: 0, $source: [], $target: [],
        }],
      ]);
      const links = new Map<string, GanttLink>([
        ['l1', { id: 'l1', source: 't1', target: 't2', type: 'finish_to_start', $p: '' }],
      ]);
      computeLinkPolylines(tasks, links);
      expect(links.get('l1')!.$p).toBeTruthy();
      expect(links.get('l1')!.$p).toContain(',');
    });
  });

  describe('date↔pixel round-trip', () => {
    it('should be idempotent within pixel precision', () => {
      const dates = ['2026-01-01', '2026-01-15', '2026-01-31', '2026-02-01'];
      for (const d of dates) {
        const date = new Date(d);
        const x = dateToPixel(date, scaleRange, 40);
        const result = pixelToDate(x, scaleRange, 40);
        expect(result.toISOString().slice(0, 10)).toBe(d);
      }
    });
  });
});
