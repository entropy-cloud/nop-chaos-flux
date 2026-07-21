import { describe, expect, it } from 'vitest';
import { GanttStore } from './gantt-store.js';
import type { GanttTaskData, GanttLinkData } from './gantt.types.js';

function makeTask(overrides: Partial<GanttTaskData> & { id: string | number }): GanttTaskData {
  return {
    text: 'Task',
    start: '2026-01-01',
    end: '2026-01-10',
    ...overrides,
  };
}

function makeLink(overrides: Partial<GanttLinkData> & { id: string | number; source: string | number; target: string | number }): GanttLinkData {
  return {
    type: 'finish_to_start',
    ...overrides,
  };
}

describe('Zustand GanttStore proof', () => {
  it('getVisibleTasks returns identical output after parse', () => {
    const store = new GanttStore({ cellWidth: 40 });
    store.parse([
      makeTask({ id: 'p1', children: [
        makeTask({ id: 'c1' }),
        makeTask({ id: 'c2', children: [
          makeTask({ id: 'gc1' }),
        ]}),
      ]}),
    ], []);
    const visible = store.getVisibleTasks();
    expect(visible).toHaveLength(4);
    expect(visible.map((t) => t.id)).toEqual(['p1', 'c1', 'c2', 'gc1']);
  });

  it('getVisibleTasks after toggleOpen matches expected output', () => {
    const store = new GanttStore({ cellWidth: 40 });
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

  it('recalcLayout produces consistent coordinates', () => {
    const store = new GanttStore({ cellWidth: 40 });
    store.parse([makeTask({ id: 't1', start: '2026-01-01', end: '2026-01-10' })], []);
    const before = store.tasks.get('t1')!;
    expect(before.$x).toBeGreaterThanOrEqual(0);
    expect(before.$w).toBeGreaterThan(0);

    store.updateTask('t1', { end: '2026-02-01' });
    const after = store.tasks.get('t1')!;
    expect(after.$w).toBeGreaterThan(before.$w);
  });

  it('revision counters increment correctly after mutations', () => {
    const store = new GanttStore({ cellWidth: 40 });
    store.parse([makeTask({ id: 't1' }), makeTask({ id: 't2' })], []);
    const r0 = store.revision;
    const tr0 = store.taskRevision;

    store.updateTask('t1', { text: 'Updated' });
    expect(store.revision).toBe(r0 + 1);
    expect(store.taskRevision).toBe(tr0 + 1);

    store.updateTask('t2', { text: 'Also updated' });
    expect(store.revision).toBe(r0 + 2);
    expect(store.taskRevision).toBe(tr0 + 2);
  });

  it('addLink and removeLink update linkRevision', () => {
    const store = new GanttStore({ cellWidth: 40 });
    store.parse([makeTask({ id: 't1' }), makeTask({ id: 't2' })], []);
    const lr0 = store.linkRevision;

    store.addLink('t1', 't2', 'finish_to_start');
    expect(store.linkRevision).toBe(lr0 + 1);

    store.removeLink('t1');
    expect(store.linkRevision).toBe(lr0 + 2);
  });

  it('toggleOpen updates treeRevision', () => {
    const store = new GanttStore({ cellWidth: 40 });
    store.parse([
      makeTask({ id: 'p1', children: [makeTask({ id: 'c1' })] }),
    ], []);
    const tr0 = store.treeRevision;

    store.toggleOpen('p1');
    expect(store.treeRevision).toBe(tr0 + 1);
  });

  it('setZoom changes cellWidth and revision', () => {
    const store = new GanttStore({
      cellWidth: 40,
      zoomLevels: [
        { key: 'day', label: 'Day', minCellWidth: 40, scales: [{ unit: 'day' as const }] },
        { key: 'week', label: 'Week', minCellWidth: 20, scales: [{ unit: 'week' as const }] },
      ],
      defaultZoom: 'day',
    });
    store.parse([makeTask({ id: 't1', start: '2026-01-01', end: '2026-01-10' })], []);

    const beforeW = store.tasks.get('t1')!.$w;
    store.setZoom('week');
    const afterW = store.tasks.get('t1')!.$w;
    expect(afterW).not.toBe(beforeW);
    expect(store.cellWidth).toBe(20);
  });

  it('zustand subscribe fires on state changes', () => {
    const store = new GanttStore({ cellWidth: 40 });
    store.parse([makeTask({ id: 't1' })], []);

    let callCount = 0;
    const unsub = store.subscribe(() => { callCount++; });

    store.updateTask('t1', { text: 'V2' });
    expect(callCount).toBeGreaterThanOrEqual(1);

    unsub();
    store.updateTask('t1', { text: 'V3' });
    const afterUnsub = callCount;
    store.updateTask('t1', { text: 'V4' });
    expect(callCount).toBe(afterUnsub);
  });

  it('deleteTask removes task and linked links', () => {
    const store = new GanttStore({ cellWidth: 40 });
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

  it('expandAll and collapseAll modify tree state', () => {
    const store = new GanttStore({ cellWidth: 40 });
    store.parse([
      makeTask({ id: 'p1', children: [
        makeTask({ id: 'c1', children: [makeTask({ id: 'gc1' })] }),
      ]}),
    ], []);
    store.collapseAll();
    expect(store.getVisibleTasks()).toHaveLength(1);
    store.expandAll();
    expect(store.getVisibleTasks()).toHaveLength(3);
  });

  it('getAvailableZooms returns configured zoom levels', () => {
    const zoomLevels = [
        { key: 'day', label: 'Day', scales: [{ unit: 'day' as const }] },
        { key: 'month', label: 'Month', scales: [{ unit: 'month' as const }] },
    ];
    const store = new GanttStore({ zoomLevels });
    expect(store.getAvailableZooms()).toHaveLength(2);
  });

  it('updateLink updates link fields', () => {
    const store = new GanttStore({ cellWidth: 40 });
    store.parse(
      [makeTask({ id: 't1' }), makeTask({ id: 't2' })],
      [makeLink({ id: 'l1', source: 't1', target: 't2' })],
    );
    store.updateLink('l1', { type: 'start_to_start' });
    expect(store.links.get('l1')!.type).toBe('start_to_start');
  });

  it('multiple subscribe listeners all fire and unsubscribe works', () => {
    const store = new GanttStore({ cellWidth: 40 });
    store.parse([makeTask({ id: 't1' })], []);
    let a = 0;
    let b = 0;
    const unsub1 = store.subscribe(() => { a++; });
    const unsub2 = store.subscribe(() => { b++; });
    store.updateTask('t1', { text: 'X' });
    expect(a).toBeGreaterThanOrEqual(1);
    expect(b).toBeGreaterThanOrEqual(1);
    unsub1();
    unsub2();
  });

  it('parse increments revision', () => {
    const store = new GanttStore({ cellWidth: 40 });
    const r0 = store.revision;
    const tr0 = store.taskRevision;
    store.parse([makeTask({ id: 't1' })], []);
    expect(store.revision).toBe(r0 + 1);
    expect(store.taskRevision).toBe(tr0 + 1);
  });

  it('recalcLayout increments layoutRevision', () => {
    const store = new GanttStore({ cellWidth: 40 });
    store.parse([makeTask({ id: 't1', start: '2026-01-01', end: '2026-01-10' })], []);
    const lr0 = store.layoutRevision;
    store.recalcLayout();
    expect(store.layoutRevision).toBe(lr0 + 1);
  });

  it('setZoom increments revision and layoutRevision', () => {
    const store = new GanttStore({
      cellWidth: 40,
      zoomLevels: [
        { key: 'day', label: 'Day', minCellWidth: 40, scales: [{ unit: 'day' as const }] },
        { key: 'week', label: 'Week', minCellWidth: 20, scales: [{ unit: 'week' as const }] },
      ],
      defaultZoom: 'day',
    });
    store.parse([makeTask({ id: 't1', start: '2026-01-01', end: '2026-01-10' })], []);
    const r0 = store.revision;
    const lr0 = store.layoutRevision;
    store.setZoom('week');
    expect(store.revision).toBeGreaterThan(r0);
    expect(store.layoutRevision).toBeGreaterThan(lr0);
  });
});
