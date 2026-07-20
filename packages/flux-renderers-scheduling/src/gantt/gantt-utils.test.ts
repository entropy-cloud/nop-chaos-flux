import { describe, expect, it } from 'vitest';
import type { GanttTask, GanttId } from './gantt.types.js';
import {
  buildParentIndex,
  flattenTree,
  toggleOpen,
  expandAll,
  collapseAll,
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

  describe('flattenTree', () => {
    it('should flatten expanded tree in order', () => {
      const tasks = [
        makeTask({ id: 'p1' }),
        makeTask({ id: 'c1', parent: 'p1' }),
        makeTask({ id: 'c2', parent: 'p1' }),
        makeTask({ id: 't1' }),
      ];
      const parentIndex = buildParentIndex(tasks);
      const expanded = new Set<GanttId>(['p1']);
      const flat = flattenTree(tasks, parentIndex, expanded);
      expect(flat.map((t) => t.id)).toEqual(['p1', 'c1', 'c2', 't1']);
    });

    it('should filter collapsed children', () => {
      const tasks = [
        makeTask({ id: 'p1' }),
        makeTask({ id: 'c1', parent: 'p1' }),
      ];
      const parentIndex = buildParentIndex(tasks);
      const expanded = new Set<GanttId>();
      const flat = flattenTree(tasks, parentIndex, expanded);
      expect(flat.map((t) => t.id)).toEqual(['p1']);
    });

    it('should handle rootTaskIds filter', () => {
      const tasks = [
        makeTask({ id: 'p1' }),
        makeTask({ id: 'c1', parent: 'p1' }),
        makeTask({ id: 'p2' }),
      ];
      const parentIndex = buildParentIndex(tasks);
      const expanded = new Set<GanttId>(['p1']);
      const flat = flattenTree(tasks, parentIndex, expanded, ['p2']);
      expect(flat.map((t) => t.id)).toEqual(['p2']);
    });

    it('should handle empty tasks', () => {
      const result = flattenTree([], new Map(), new Set());
      expect(result).toEqual([]);
    });
  });

  describe('toggleOpen', () => {
    it('should add task to expanded set when not present', () => {
      const expanded = new Set<GanttId>();
      toggleOpen('p1', expanded);
      expect(expanded.has('p1')).toBe(true);
    });

    it('should remove task from expanded set when present', () => {
      const expanded = new Set<GanttId>(['p1']);
      toggleOpen('p1', expanded);
      expect(expanded.has('p1')).toBe(false);
    });
  });

  describe('expandAll / collapseAll', () => {
    it('should expand all tasks with children', () => {
      const parentIndex = new Map<GanttId | null, GanttId[]>();
      parentIndex.set('p1', ['c1']);
      parentIndex.set('p2', []);
      const expanded = new Set<GanttId>();
      expandAll(parentIndex, expanded);
      expect(expanded.has('p1')).toBe(true);
      expect(expanded.has('p2')).toBe(false);
    });

    it('should collapse all tasks', () => {
      const expanded = new Set<GanttId>(['p1', 'p2']);
      collapseAll(expanded);
      expect(expanded.size).toBe(0);
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
