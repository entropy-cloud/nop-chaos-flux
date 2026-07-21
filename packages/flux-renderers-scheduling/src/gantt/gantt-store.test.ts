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

    it('should increment revision after parse', () => {
      const store = new GanttStore();
      const r0 = store.revision;
      const tr0 = store.taskRevision;
      store.parse([makeTask({ id: 't1' })], []);
      expect(store.revision).toBe(r0 + 1);
      expect(store.taskRevision).toBe(tr0 + 1);
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

    it('should increment revision and taskRevision on update', () => {
      const store = new GanttStore();
      store.parse([makeTask({ id: 't1' })], []);
      const r0 = store.revision;
      const tr0 = store.taskRevision;
      store.updateTask('t1', { text: 'New' });
      expect(store.revision).toBe(r0 + 1);
      expect(store.taskRevision).toBe(tr0 + 1);
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

    it('should increment linkRevision on add and remove', () => {
      const store = new GanttStore();
      store.parse([makeTask({ id: 't1' }), makeTask({ id: 't2' })], []);
      const lr0 = store.linkRevision;
      store.addLink('t1', 't2', 'finish_to_start');
      expect(store.linkRevision).toBe(lr0 + 1);
      store.removeLink('t1');
      expect(store.linkRevision).toBe(lr0 + 2);
    });
  });

  describe('zustand subscription', () => {
    it('should notify subscribers on state change', () => {
      const store = new GanttStore();
      store.parse([makeTask({ id: 't1' })], []);
      let callCount = 0;
      const unsub = store.subscribe(() => { callCount++; });
      store.updateTask('t1', { text: 'V2' });
      expect(callCount).toBeGreaterThanOrEqual(1);
      unsub();
    });

    it('should support multiple subscribers', () => {
      const store = new GanttStore();
      store.parse([makeTask({ id: 't1' })], []);
      let a = 0;
      let b = 0;
      const unsub1 = store.subscribe(() => { a++; });
      const unsub2 = store.subscribe(() => { b++; });
      store.updateTask('t1', { text: 'V2' });
      expect(a).toBeGreaterThanOrEqual(1);
      expect(b).toBeGreaterThanOrEqual(1);
      unsub1();
      unsub2();
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

  describe('deleteTask', () => {
    it('should remove the task from the store', () => {
      const store = new GanttStore();
      store.parse([makeTask({ id: 't1' }), makeTask({ id: 't2' })], []);
      store.deleteTask('t1');
      expect(store.tasks.has('t1')).toBe(false);
      expect(store.tasks.has('t2')).toBe(true);
    });

    it('should remove child tasks and associated links', () => {
      const store = new GanttStore();
      store.parse([
        makeTask({ id: 'p1', children: [makeTask({ id: 'c1' })] }),
        makeTask({ id: 't2' }),
      ], [makeLink({ id: 'l1', source: 'c1', target: 't2' })]);
      store.deleteTask('p1');
      expect(store.tasks.has('p1')).toBe(false);
      expect(store.tasks.has('c1')).toBe(false);
      expect(store.links.has('l1')).toBe(false);
      expect(store.tasks.has('t2')).toBe(true);
    });

    it('should do nothing for non-existent task', () => {
      const store = new GanttStore();
      store.parse([makeTask({ id: 't1' })], []);
      expect(() => store.deleteTask('nonexistent')).not.toThrow();
    });

    it('should increment revision and taskRevision on delete', () => {
      const store = new GanttStore();
      store.parse([makeTask({ id: 't1' })], []);
      const r0 = store.revision;
      const tr0 = store.taskRevision;
      store.deleteTask('t1');
      expect(store.revision).toBe(r0 + 1);
      expect(store.taskRevision).toBe(tr0 + 1);
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
