import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { render } from '@testing-library/react';
import { GanttStore } from './gantt-store.js';
import { GanttGrid } from './gantt-grid.js';
import { GanttBars } from './gantt-bars.js';
import type { GanttTaskData, GanttLinkData } from './gantt.types.js';
import type { GanttZoomLevel } from './gantt.types.js';

// plan 481 Phase 1：gantt 选中视觉 + CPM 关键路径渲染组件锁定。
// happy-dom 不做外链 CSS 级联，computed color-mix 断言由 Phase 4 e2e
// （Chromium getComputedStyle）承担；此处锁定 DOM 契约（data-selected /
// data-critical）与 gantt.css 规则文本级存在性（477 守卫先例）。

const DEFAULT_ZOOM_LEVELS: GanttZoomLevel[] = [
  { key: 'day', label: 'Day', scales: [{ unit: 'day' as const, step: 1, format: '%d' }] },
];

function createStore(tasks: GanttTaskData[], links: GanttLinkData[] = []) {
  const store = new GanttStore({ cellWidth: 40, zoomLevels: DEFAULT_ZOOM_LEVELS, defaultZoom: 'day' });
  store.parse(tasks, links);
  return store;
}

const cssSource = readFileSync(join(import.meta.dirname, 'gantt.css'), 'utf8');
const gridSource = readFileSync(join(import.meta.dirname, 'gantt-grid.tsx'), 'utf8');

describe('gantt selection visual (plan 481 A2)', () => {
  it('selected grid row carries data-selected and no literal bg-blue-50 remains', () => {
    const store = createStore([
      { id: 't1', text: 'Task 1', start: '2026-01-01', end: '2026-01-04' },
      { id: 't2', text: 'Task 2', start: '2026-01-02', end: '2026-01-05' },
    ]);
    const { container } = render(<GanttGrid store={store} selectedTaskId="t2" />);
    const selectedRow = container.querySelector('[data-slot="gantt-grid-row"][data-selected="true"]');
    expect(selectedRow).toBeTruthy();
    expect(selectedRow!.getAttribute('data-task-id')).toBe('t2');
    expect(container.querySelector('[data-selected="false"]')).toBeNull();
    expect(gridSource).not.toMatch(/\bbg-blue-50\b/);
    expect(gridSource).not.toMatch(/\bhover:bg-blue-50\/50\b/);
  });

  it('unselected rows do not carry data-selected', () => {
    const store = createStore([
      { id: 't1', text: 'Task 1', start: '2026-01-01', end: '2026-01-04' },
      { id: 't2', text: 'Task 2', start: '2026-01-02', end: '2026-01-05' },
    ]);
    const { container } = render(<GanttGrid store={store} selectedTaskId={null} />);
    expect(container.querySelector('[data-slot="gantt-grid-row"][data-selected]')).toBeNull();
  });

  it('gantt.css selection rule is token-driven color-mix (not #eff6ff)', () => {
    expect(cssSource).toContain("[data-slot='gantt-grid-row'][data-selected='true']");
    expect(cssSource).toMatch(/color-mix\(in srgb, var\(--color-primary\) 10%, transparent\)/);
    expect(cssSource).not.toContain('#eff6ff');
  });

  it('bar side: data-selected + minimal outline rule in gantt.css', () => {
    const store = createStore([
      { id: 't1', text: 'Task 1', start: '2026-01-01', end: '2026-01-04' },
    ]);
    const { container } = render(<GanttBars store={store} selectedTaskId="t1" />);
    const bar = container.querySelector('[data-slot="gantt-bar"][data-selected="true"]');
    expect(bar).toBeTruthy();
    expect(cssSource).toMatch(/\.nop-gantt \[data-slot='gantt-bar'\]\[data-selected='true'\]/);
  });
});

describe('gantt critical path rendering (plan 481 A1)', () => {
  const tasks: GanttTaskData[] = [
    { id: 'T1', text: 'T1', start: '2026-01-01', end: '2026-01-02', duration: 1 },
    { id: 'T2', text: 'T2', start: '2026-01-02', end: '2026-01-07', duration: 5 },
    { id: 'T3', text: 'T3', start: '2026-01-02', end: '2026-01-03', duration: 1 },
    { id: 'T4', text: 'T4', start: '2026-01-07', end: '2026-01-09', duration: 2 },
  ];
  const links: GanttLinkData[] = [
    { id: 'l1', source: 'T1', target: 'T2', type: 'finish_to_start' },
    { id: 'l2', source: 'T1', target: 'T3', type: 'finish_to_start' },
    { id: 'l3', source: 'T2', target: 'T4', type: 'finish_to_start' },
    { id: 'l4', source: 'T3', target: 'T4', type: 'finish_to_start' },
  ];

  it('store.getCriticalPath() returns the hand-computed zero-float set {T1,T2,T4}', () => {
    const store = createStore(tasks, links);
    expect(store.getCriticalPath().sort()).toEqual(['T1', 'T2', 'T4']);
  });

  it('GanttBars stamps data-critical only on derived critical bars', () => {
    const store = createStore(tasks, links);
    const critical = new Set(store.getCriticalPath());
    const { container } = render(<GanttBars store={store} criticalTaskIds={critical} />);
    const criticalBars = Array.from(container.querySelectorAll('[data-slot="gantt-bar"][data-critical="true"]'))
      .map((el) => el.getAttribute('data-task-id'))
      .sort();
    expect(criticalBars).toEqual(['T1', 'T2', 'T4']);
    const nonCritical = container.querySelector('[data-task-id="T3"][data-slot="gantt-bar"]');
    expect(nonCritical?.getAttribute('data-critical')).toBeNull();
  });

  it('gantt.css critical top-marker rule is destructive-token driven', () => {
    expect(cssSource).toMatch(/\.nop-gantt \[data-critical='true'\]::before/);
    const rule = cssSource.slice(cssSource.indexOf(".nop-gantt [data-critical='true']::before"));
    expect(rule.slice(0, 400)).toContain('var(--color-destructive)');
  });

  it('legend renders only when the critical set is non-empty is a gantt.tsx-level contract', () => {
    const ganttSource = readFileSync(join(import.meta.dirname, 'gantt.tsx'), 'utf8');
    expect(ganttSource).toContain("data-slot=\"gantt-legend\"");
    expect(ganttSource).toContain('criticalTaskIds.size > 0');
  });
});
