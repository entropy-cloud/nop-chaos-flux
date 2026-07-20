import { describe, expect, it } from 'vitest';
import { GanttStore } from './gantt-store.js';
import { DefaultWorkCalendar } from './utils/worktime.js';
import type { GanttTaskData, GanttLinkData } from './gantt.types.js';

function makeTask(overrides: Partial<GanttTaskData> & { id: GanttTaskData['id']; start?: string; end?: string }): GanttTaskData {
  return {
    text: 'Task',
    start: '2026-01-01',
    end: '2026-01-10',
    ...overrides,
  };
}

function makeLink(overrides: Partial<GanttLinkData> & { id: GanttLinkData['id']; source: GanttLinkData['source']; target: GanttLinkData['target'] }): GanttLinkData {
  return {
    type: 'finish_to_start',
    ...overrides,
  };
}

describe('GanttStore', () => {
  describe('parse', () => {
    it('should populate tasks map from flat input', () => {
      const store = new GanttStore();
      store.parse([makeTask({ id: 't1' }), makeTask({ id: 't2' })], []);
      expect(store.tasks.size).toBe(2);
      expect(store.tasks.get('t1')).toBeDefined();
      expect(store.tasks.get('t2')).toBeDefined();
    });

    it('should flatten nested children into flat map with correct parent reference', () => {
      const store = new GanttStore();
      store.parse([
        makeTask({
          id: 'p1',
          children: [
            makeTask({ id: 'c1', parent: 'p1' }),
            makeTask({ id: 'c2', parent: 'p1' }),
          ],
        }),
      ], []);
      expect(store.tasks.size).toBe(3);
      expect(store.tasks.get('p1')?.parent).toBeNull();
      expect(store.tasks.get('c1')?.parent).toBe('p1');
      expect(store.tasks.get('c2')?.parent).toBe('p1');
    });

    it('should populate computed properties after parse', () => {
      const store = new GanttStore();
      store.parse([makeTask({ id: 't1' })], []);
      const task = store.tasks.get('t1')!;
      expect(task).toHaveProperty('$x');
      expect(task).toHaveProperty('$y');
      expect(task).toHaveProperty('$w');
      expect(task).toHaveProperty('$h');
      expect(task).toHaveProperty('$level');
      expect(task).toHaveProperty('$source');
      expect(task).toHaveProperty('$target');
    });

    it('should populate links map', () => {
      const store = new GanttStore();
      store.parse(
        [makeTask({ id: 't1' }), makeTask({ id: 't2' })],
        [makeLink({ id: 'l1', source: 't1', target: 't2' })],
      );
      expect(store.links.size).toBe(1);
      expect(store.links.get('l1')).toBeDefined();
    });

    it('should populate resources and assignments when provided', () => {
      const store = new GanttStore();
      store.parse(
        [makeTask({ id: 't1' })],
        [],
        [{ id: 'r1', text: 'Worker A' }],
        [{ id: 'a1', taskId: 't1', resourceId: 'r1' }],
      );
      expect(store.resources.size).toBe(1);
      expect(store.assignments.size).toBe(1);
    });

    it('should compute $level based on parent nesting', () => {
      const store = new GanttStore();
      store.parse([
        makeTask({ id: 'p1', children: [
          makeTask({ id: 'c1', children: [
            makeTask({ id: 'gc1' }),
          ]}),
          makeTask({ id: 'c2' }),
        ]}),
      ], []);
      expect(store.tasks.get('p1')!.$level).toBe(0);
      expect(store.tasks.get('c1')!.$level).toBe(1);
      expect(store.tasks.get('gc1')!.$level).toBe(2);
      expect(store.tasks.get('c2')!.$level).toBe(1);
    });

    it('should compute $source and $target from links', () => {
      const store = new GanttStore();
      store.parse(
        [makeTask({ id: 't1' }), makeTask({ id: 't2' }), makeTask({ id: 't3' })],
        [
          makeLink({ id: 'l1', source: 't1', target: 't2' }),
          makeLink({ id: 'l2', source: 't1', target: 't3' }),
        ],
      );
      const t1 = store.tasks.get('t1')!;
      const t2 = store.tasks.get('t2')!;
      expect(t1.$source).toEqual(['t2', 't3']);
      expect(t2.$target).toEqual(['t1']);
    });

    it('should emit change event after parse', () => {
      const store = new GanttStore();
      let emitted = false;
      store.on('change', () => { emitted = true; });
      store.parse([makeTask({ id: 't1' })], []);
      expect(emitted).toBe(true);
    });
  });

  describe('updateTask', () => {
    it('should update task fields', () => {
      const store = new GanttStore();
      store.parse([makeTask({ id: 't1', text: 'Old' })], []);
      store.updateTask('t1', { text: 'New' });
      expect(store.tasks.get('t1')!.text).toBe('New');
    });

    it('should recompute coordinates after date change', () => {
      const store = new GanttStore({ cellWidth: 40 });
      store.parse([makeTask({ id: 't1', start: '2026-01-01', end: '2026-01-10' })], []);
      const before = store.tasks.get('t1')!.$w;
      store.updateTask('t1', { end: '2026-02-01' });
      const after = store.tasks.get('t1')!.$w;
      expect(after).toBeGreaterThan(before);
    });

    it('should emit taskChange and change events', () => {
      const store = new GanttStore();
      store.parse([makeTask({ id: 't1' })], []);
      let taskChanged = false;
      let changed = false;
      store.on('taskChange', () => { taskChanged = true; });
      store.on('change', () => { changed = true; });
      store.updateTask('t1', { text: 'New' });
      expect(taskChanged).toBe(true);
      expect(changed).toBe(true);
    });

    it('should do nothing for non-existent task', () => {
      const store = new GanttStore();
      store.parse([makeTask({ id: 't1' })], []);
      expect(() => store.updateTask('nonexistent', { text: 'X' })).not.toThrow();
    });
  });

  describe('link lifecycle', () => {
    it('should add a link and compute $source/$target', () => {
      const store = new GanttStore();
      store.parse([makeTask({ id: 't1' }), makeTask({ id: 't2' })], []);
      const link = store.addLink('t1', 't2', 'finish_to_start');
      expect(store.links.has(link.id)).toBe(true);
      expect(store.tasks.get('t1')!.$source).toContain('t2');
      expect(store.tasks.get('t2')!.$target).toContain('t1');
    });

    it('should remove a link and update $source/$target', () => {
      const store = new GanttStore();
      store.parse(
        [makeTask({ id: 't1' }), makeTask({ id: 't2' })],
        [makeLink({ id: 'l1', source: 't1', target: 't2' })],
      );
      store.removeLink('l1');
      expect(store.links.has('l1')).toBe(false);
      expect(store.tasks.get('t1')!.$source).toEqual([]);
      expect(store.tasks.get('t2')!.$target).toEqual([]);
    });

    it('should emit change on add/remove', () => {
      const store = new GanttStore();
      store.parse([makeTask({ id: 't1' }), makeTask({ id: 't2' })], []);
      let addCount = 0;
      store.on('change', () => { addCount++; });
      store.addLink('t1', 't2', 'finish_to_start');
      store.removeLink('t1');
      expect(addCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('event subscription', () => {
    it('should allow on/off subscription', () => {
      const store = new GanttStore();
      let count = 0;
      const handler = () => { count++; };
      store.on('change', handler);
      store.parse([makeTask({ id: 't1' })], []);
      expect(count).toBe(1);
      store.off('change', handler);
      store.parse([makeTask({ id: 't2' })], []);
      expect(count).toBe(1);
    });

    it('should support multiple handlers on same event', () => {
      const store = new GanttStore();
      let a = 0;
      let b = 0;
      store.on('change', () => { a++; });
      store.on('change', () => { b++; });
      store.parse([makeTask({ id: 't1' })], []);
      expect(a).toBe(1);
      expect(b).toBe(1);
    });
  });

  describe('getVisibleTasks', () => {
    it('should return all tasks when all expanded', () => {
      const store = new GanttStore();
      store.parse([
        makeTask({ id: 'p1', children: [
          makeTask({ id: 'c1' }),
          makeTask({ id: 'c2' }),
        ]}),
      ], []);
      expect(store.getVisibleTasks()).toHaveLength(3);
    });

    it('should hide collapsed children', () => {
      const store = new GanttStore();
      store.parse([
        makeTask({ id: 'p1', open: false, children: [
          makeTask({ id: 'c1' }),
        ]}),
      ], []);
      expect(store.getVisibleTasks()).toHaveLength(1);
    });

    it('should update visibility on toggleOpen', () => {
      const store = new GanttStore();
      store.parse([
        makeTask({ id: 'p1', children: [
          makeTask({ id: 'c1' }),
        ]}),
      ], []);
      expect(store.getVisibleTasks()).toHaveLength(2);
      store.toggleOpen('p1');
      expect(store.getVisibleTasks()).toHaveLength(1);
      store.toggleOpen('p1');
      expect(store.getVisibleTasks()).toHaveLength(2);
    });
  });

  describe('recalcLayout', () => {
    it('should compute pixel coordinates for tasks', () => {
      const store = new GanttStore({ cellWidth: 40 });
      store.parse([makeTask({ id: 't1', start: '2026-01-01', end: '2026-01-10' })], []);
      const task = store.tasks.get('t1')!;
      expect(task.$x).toBeGreaterThanOrEqual(0);
      expect(task.$y).toBeGreaterThanOrEqual(0);
      expect(task.$w).toBeGreaterThan(0);
      expect(task.$h).toBeGreaterThan(0);
    });

    it('should compute link polyline points', () => {
      const store = new GanttStore({ cellWidth: 40 });
      store.parse(
        [makeTask({ id: 't1', start: '2026-01-01', end: '2026-01-05' }), makeTask({ id: 't2', start: '2026-01-06', end: '2026-01-10' })],
        [makeLink({ id: 'l1', source: 't1', target: 't2' })],
      );
      const link = store.links.get('l1')!;
      expect(link.$p).toBeTruthy();
      expect(link.$p).toContain(',');
    });
  });

  describe('WorkCalendar integration', () => {
    it('should accept calendars in parse', () => {
      const store = new GanttStore({ globalCalendarId: 'default' });
      const calendar = new DefaultWorkCalendar();
      store.parse(
        [makeTask({ id: 't1', start: '2026-01-05', end: '2026-01-10' })],
        [],
        undefined,
        undefined,
        [{ id: 'default', calendar }],
      );
      expect(store.calendarManager.getCalendar('default')).toBe(calendar);
    });

    it('should align task end date through WorkCalendar on update with duration', () => {
      const store = new GanttStore({ globalCalendarId: 'default' });
      const calendar = new DefaultWorkCalendar();
      store.parse(
        [makeTask({ id: 't1', start: '2026-01-02', end: '2026-01-10' })],
        [],
        undefined,
        undefined,
        [{ id: 'default', calendar }],
      );
      store.updateTask('t1', { duration: 3 });
      const task = store.tasks.get('t1')!;
      expect(task.end).toBe('2026-01-07');
    });
  });

  describe('zoom', () => {
    it('should switch zoom level and recalculate coordinates', () => {
      const store = new GanttStore({
        cellWidth: 40,
        zoomLevels: [
          { key: 'day', label: 'Day', minCellWidth: 40, scales: [{ unit: 'day' as const }] },
          { key: 'week', label: 'Week', minCellWidth: 20, scales: [{ unit: 'week' as const }] },
        ],
        defaultZoom: 'day',
      });
      store.parse([makeTask({ id: 't1', start: '2026-01-01', end: '2026-01-10' })], []);
      const before = store.tasks.get('t1')!.$w;
      store.setZoom('week');
      const after = store.tasks.get('t1')!.$w;
      expect(after).not.toBe(before);
    });

    it('should return configured zoom levels', () => {
      const zoomLevels = [
        { key: 'day', label: 'Day', scales: [{ unit: 'day' as const }] },
        { key: 'month', label: 'Month', scales: [{ unit: 'month' as const }] },
      ];
      const store = new GanttStore({ zoomLevels });
      const available = store.getAvailableZooms();
      expect(available).toHaveLength(2);
    });

    it('should anchor scroll center through zoom change', () => {
      const store = new GanttStore({
        cellWidth: 40,
        zoomLevels: [
          { key: 'day', label: 'Day', minCellWidth: 40, scales: [{ unit: 'day' as const }] },
          { key: 'week', label: 'Week', minCellWidth: 20, scales: [{ unit: 'week' as const }] },
        ],
        defaultZoom: 'day',
        containerWidth: 800,
      });
      store.parse([makeTask({ id: 't1', start: '2026-01-01', end: '2026-01-10' })], []);
      store.setZoom('week', 400, 800);
      expect(store.scrollLeft).toBeGreaterThanOrEqual(0);
    });
  });
});
