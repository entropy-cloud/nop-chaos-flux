import { describe, expect, it } from 'vitest';
import type { GanttTask, GanttId } from './gantt.types.js';
import {
  buildParentIndex,
  getVisibleDescendantCount,
} from './gantt-utils.js';

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

describe('gantt-utils', () => {
  describe('buildParentIndex', () => {
    it('should build index from tasks', () => {
      const tasks = [
        makeTask({ id: 'p1', parent: null }),
        makeTask({ id: 'c1', parent: 'p1' }),
        makeTask({ id: 'c2', parent: 'p1' }),
      ];
      const index = buildParentIndex(tasks);
      expect(index.get(null)).toEqual(['p1']);
      expect(index.get('p1')).toEqual(['c1', 'c2']);
    });

    it('should handle tasks without parents', () => {
      const tasks = [makeTask({ id: 't1' }), makeTask({ id: 't2' })];
      const index = buildParentIndex(tasks);
      expect(index.get(null)).toHaveLength(2);
    });
  });

  describe('getVisibleDescendantCount', () => {
    it('should count all descendants', () => {
      const parentIndex = new Map<GanttId | null, GanttId[]>();
      parentIndex.set('p1', ['c1', 'c2']);
      parentIndex.set('c1', ['gc1']);
      expect(getVisibleDescendantCount('p1', parentIndex)).toBe(3);
    });

    it('should return 0 for leaf task', () => {
      const parentIndex = new Map<GanttId | null, GanttId[]>();
      expect(getVisibleDescendantCount('leaf', parentIndex)).toBe(0);
    });
  });
});
