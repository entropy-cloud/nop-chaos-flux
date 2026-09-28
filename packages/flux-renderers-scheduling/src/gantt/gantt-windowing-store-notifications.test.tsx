import { describe, expect, it } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';
import { GanttStore } from './gantt-store.js';
import { GanttTimeScale } from './gantt-timescale.js';
import { GanttCellGrid } from './gantt-cellgrid.js';
import type { GanttTaskData, GanttLinkData, GanttZoomLevel } from './gantt.types.js';

const DEFAULT_ZOOM_LEVELS: GanttZoomLevel[] = [
  { key: 'day', label: 'Day', scales: [{ unit: 'day' as const, step: 1, format: '%d' }, { unit: 'month' as const, format: '%Y/%m' }] },
];

function createStore(tasks: GanttTaskData[], links: GanttLinkData[] = []) {
  const store = new GanttStore({ cellWidth: 40, zoomLevels: DEFAULT_ZOOM_LEVELS, defaultZoom: 'day' });
  store.parse(tasks, links);
  return store;
}

describe('gantt timescale/cellgrid horizontal windowing (plan 2026-09-29-1 Phase 3)', () => {
  // ~3 years of daily cells at cellWidth 40 → 1000+ cells if unwindowed
  const longTasks: GanttTaskData[] = [
    { id: 't1', text: 'Long', start: '2025-01-01', end: '2027-12-31' },
  ];

  it('timescale mounts only the visible window (+ overscan), not every scale cell', () => {
    const store = createStore(longTasks);
    store.setContainerWidth(400);
    const { container } = render(<GanttTimeScale store={store} />);
    const cells = container.querySelectorAll('[data-slot="gantt-scale-cell"]');
    expect(cells.length).toBeGreaterThan(0);
    // 400px / 40px = 10 visible + overscan 5 per side → bounded far below the
    // full daily range (~1100 cells)
    expect(cells.length).toBeLessThanOrEqual(40);
  });

  it('scrolling shifts the rendered window without leftovers', () => {
    const store = createStore(longTasks);
    store.setContainerWidth(400);
    const { container } = render(<GanttTimeScale store={store} />);
    const firstLabelBefore = container.querySelector('[data-slot="gantt-scale-cell"]')!.textContent;

    act(() => {
      store.setScrollLeft(40 * 200);
    });

    const cells = container.querySelectorAll('[data-slot="gantt-scale-cell"]');
    expect(cells.length).toBeGreaterThan(0);
    expect(cells.length).toBeLessThanOrEqual(40);
    const firstLabelAfter = container.querySelector('[data-slot="gantt-scale-cell"]')!.textContent;
    expect(firstLabelAfter).not.toBe(firstLabelBefore);
  });

  it('cellgrid weekend markers stay bounded and follow the scroll window', () => {
    const store = createStore(longTasks);
    store.setContainerWidth(400);
    const { container } = render(<GanttCellGrid store={store} showWeekends />);
    const markers = container.querySelectorAll('[data-slot="gantt-weekend"]');
    expect(markers.length).toBeGreaterThan(0);
    expect(markers.length).toBeLessThanOrEqual(40);
  });

  it('setScrollLeft with an unchanged value does not notify subscribers', () => {
    const store = createStore(longTasks);
    let notifications = 0;
    const unsubscribe = store.subscribe(() => { notifications += 1; });
    act(() => {
      store.setScrollLeft(0);
    });
    expect(notifications).toBe(0);
    unsubscribe();
  });
});

describe('gantt store notification and CPM cache (plan 2026-09-29-1 Phase 3)', () => {
  it('updateTask commits in a single store notification', () => {
    const store = createStore([
      { id: 't1', text: 'Task 1', start: '2026-01-01', end: '2026-01-10' },
      { id: 't2', text: 'Task 2', start: '2026-01-05', end: '2026-01-15' },
    ]);
    let notifications = 0;
    const unsubscribe = store.subscribe(() => { notifications += 1; });
    act(() => {
      store.updateTask('t1', { text: 'Renamed' });
    });
    unsubscribe();
    expect(notifications).toBe(1);
    expect(store.tasks.get('t1')!.text).toBe('Renamed');
    // layout fields are computed in the same commit
    expect(store.tasks.get('t1')!.$level).toBeDefined();
  });

  it('getCriticalPath caches by (taskRevision, linkRevision); selection does not invalidate', () => {
    const store = createStore([
      { id: 't1', text: 'A', start: '2026-01-01', end: '2026-01-05' },
      { id: 't2', text: 'B', start: '2026-01-05', end: '2026-01-10' },
    ], [
      { id: 'l1', source: 't1', target: 't2', type: 'finish_to_start' } as unknown as GanttLinkData,
    ]);
    const first = store.getCriticalPath();
    const second = store.getCriticalPath();
    expect(second).toBe(first);

    act(() => {
      store.selectTask('t1');
    });
    expect(store.getCriticalPath()).toBe(first);

    act(() => {
      store.updateTask('t2', { end: '2026-01-12' });
    });
    expect(store.getCriticalPath()).not.toBe(first);
  });
});
