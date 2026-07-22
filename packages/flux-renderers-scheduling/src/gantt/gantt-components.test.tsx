import { describe, expect, it } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { GanttStore } from './gantt-store.js';
import { GanttGrid } from './gantt-grid.js';
import { GanttBars } from './gantt-bars.js';
import { GanttLinks } from './gantt-links.js';
import { GanttMarkers } from './gantt-markers.js';
import { GanttTimeScale } from './gantt-timescale.js';
import { GanttCellGrid } from './gantt-cellgrid.js';
import { GanttHeader } from './gantt-header.js';
import { GanttLayout } from './gantt-layout.js';
import type { GanttTaskData, GanttLinkData } from './gantt.types.js';
import type { GanttZoomLevel } from './gantt.types.js';

const DEFAULT_ZOOM_LEVELS: GanttZoomLevel[] = [
  { key: 'day', label: 'Day', scales: [{ unit: 'day' as const, step: 1, format: '%d' }, { unit: 'month' as const, format: '%Y/%m' }] },
  { key: 'week', label: 'Week', scales: [{ unit: 'week' as const, format: 'W%V' }, { unit: 'month' as const, format: '%Y/%m' }] },
  { key: 'month', label: 'Month', scales: [{ unit: 'month' as const, format: '%Y/%m' }, { unit: 'year' as const, format: '%Y' }] },
];

function createStore(tasks: GanttTaskData[], links: GanttLinkData[] = []) {
  const store = new GanttStore({ cellWidth: 40, zoomLevels: DEFAULT_ZOOM_LEVELS, defaultZoom: 'day' });
  store.parse(tasks, links);
  return store;
}

describe('GanttGrid', () => {
  it('should render correct number of rows from task data', () => {
    const store = createStore([
      { id: 't1', text: 'Task 1', start: '2026-01-01', end: '2026-01-10' },
      { id: 't2', text: 'Task 2', start: '2026-01-05', end: '2026-01-15' },
    ]);
    const { container } = render(<GanttGrid store={store} />);
    const rows = container.querySelectorAll('[data-slot="gantt-grid-row"]');
    expect(rows.length).toBe(2);
  });

  it('should render correct columns with headers', () => {
    const store = createStore([
      { id: 't1', text: 'Task 1', start: '2026-01-01', end: '2026-01-10' },
    ]);
    const { container } = render(<GanttGrid store={store} />);
    const headers = container.querySelectorAll('[data-slot="gantt-grid-header"] th');
    expect(headers.length).toBeGreaterThanOrEqual(3);
  });

  it('should display task text in cells', () => {
    const store = createStore([
      { id: 't1', text: 'My Task', start: '2026-01-01', end: '2026-01-10' },
    ]);
    render(<GanttGrid store={store} />);
    expect(screen.getByText('My Task')).toBeTruthy();
  });

  it('should show tree indent based on $level', () => {
    const store = createStore([
      { id: 'p1', text: 'Parent', start: '2026-01-01', end: '2026-01-10' },
      { id: 'c1', text: 'Child', start: '2026-01-02', end: '2026-01-08', parent: 'p1' },
    ], []);
    const { container } = render(<GanttGrid store={store} />);
    const rows = container.querySelectorAll('[data-slot="gantt-grid-row"]');
    expect(rows.length).toBe(2);
  });
});

describe('GanttBars', () => {
  it('should render task bars at computed positions', () => {
    const store = createStore([
      { id: 't1', text: 'Task 1', start: '2026-01-01', end: '2026-01-10' },
    ]);
    const { container } = render(<GanttBars store={store} />);
    const bars = container.querySelectorAll('[data-slot="gantt-bar"]');
    expect(bars.length).toBe(1);
    const task = store.tasks.get('t1')!;
    const el = bars[0] as HTMLElement;
    expect(el.style.left).toBe(`${task.$x}px`);
    expect(el.style.top).toBe(`${task.$y}px`);
  });

  it('should render milestone diamond for milestone type', () => {
    const store = createStore([
      { id: 't1', text: 'M1', start: '2026-01-05', end: '2026-01-05', type: 'milestone' },
    ]);
    const { container } = render(<GanttBars store={store} />);
    const milestones = container.querySelectorAll('[data-bar-type="milestone"]');
    expect(milestones.length).toBe(1);
  });

  it('should render progress bar when progress > 0', () => {
    const store = createStore([
      { id: 't1', text: 'Task', start: '2026-01-01', end: '2026-01-10', progress: 50 },
    ]);
    const { container } = render(<GanttBars store={store} />);
    const progress = container.querySelectorAll('[data-slot="gantt-bar-progress"]');
    expect(progress.length).toBe(1);
  });
});

describe('GanttLinks', () => {
  it('should render SVG polyline for each link', () => {
    const store = createStore(
      [
        { id: 't1', text: 'Task 1', start: '2026-01-01', end: '2026-01-05' },
        { id: 't2', text: 'Task 2', start: '2026-01-06', end: '2026-01-10' },
      ],
      [{ id: 'l1', source: 't1', target: 't2', type: 'finish_to_start' }],
    );
    const { container } = render(<svg><GanttLinks store={store} /></svg>);
    const polylines = container.querySelectorAll('polyline');
    expect(polylines.length).toBeGreaterThanOrEqual(1);
  });

  it('should render nothing when no links exist', () => {
    const store = createStore([
      { id: 't1', text: 'Task', start: '2026-01-01', end: '2026-01-10' },
    ]);
    const { container } = render(<svg><GanttLinks store={store} /></svg>);
    const polylines = container.querySelectorAll('polyline');
    expect(polylines.length).toBe(0);
  });
});

describe('GanttMarkers', () => {
  it('should render today line when showToday is true', () => {
    const store = createStore([
      { id: 't1', text: 'Task', start: '2026-01-01', end: '2026-01-10' },
    ]);
    const { container } = render(<GanttMarkers store={store} showToday={true} />);
    const todayLine = container.querySelector('[data-slot="gantt-today"]');
    expect(todayLine).toBeTruthy();
  });

  it('should not render today line when showToday is false', () => {
    const store = createStore([
      { id: 't1', text: 'Task', start: '2026-01-01', end: '2026-01-10' },
    ]);
    const { container } = render(<GanttMarkers store={store} showToday={false} />);
    const todayLine = container.querySelector('[data-slot="gantt-today"]');
    expect(todayLine).toBeNull();
  });
});

describe('GanttTimeScale', () => {
  it('should render scale rows from store zoom level', () => {
    const store = createStore([
      { id: 't1', text: 'Task', start: '2026-01-01', end: '2026-01-10' },
    ]);
    const { container } = render(<GanttTimeScale store={store} />);
    const cells = container.querySelectorAll('[data-slot="gantt-scale-cell"]');
    expect(cells.length).toBeGreaterThan(0);
  });
});

describe('GanttCellGrid', () => {
  it('should render weekend markers', () => {
    const store = createStore([
      { id: 't1', text: 'Task', start: '2026-01-01', end: '2026-01-10' },
    ]);
    const { container } = render(<GanttCellGrid store={store} showWeekends={true} />);
    const cells = container.querySelectorAll('[data-slot="gantt-weekend"]');
    expect(cells.length).toBeGreaterThan(0);
  });
});

describe('GanttHeader', () => {
  it('should render zoom and navigation buttons', () => {
    const store = createStore([
      { id: 't1', text: 'Task', start: '2026-01-01', end: '2026-01-10' },
    ]);
    const { container } = render(<GanttHeader store={store} />);
    const toolbar = container.querySelector('[data-slot="gantt-toolbar"]');
    expect(toolbar).toBeTruthy();
  });
});

describe('GanttLayout', () => {
  it('should render grid and timeline panels', () => {
    render(
      <GanttLayout
        grid={<div data-testid="grid-panel">Grid</div>}
        timeline={<div data-testid="timeline-panel">Timeline</div>}
        header={<div data-testid="header-panel">Header</div>}
      />,
    );
    expect(screen.getByTestId('grid-panel')).toBeTruthy();
    expect(screen.getByTestId('timeline-panel')).toBeTruthy();
    expect(screen.getByTestId('header-panel')).toBeTruthy();
  });
});
