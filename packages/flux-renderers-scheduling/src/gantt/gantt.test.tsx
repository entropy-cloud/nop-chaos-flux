import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { Gantt } from './gantt.js';

vi.mock('@nop-chaos/flux-react', () => ({
  useRendererRuntime: () => ({ dispatch: vi.fn() }),
  useRenderScope: () => ({ id: 'mock-scope', path: '/mock', readVisible: () => ({}), readOwn: () => ({}), update: vi.fn(), merge: vi.fn(), replace: vi.fn(), dispose: vi.fn() }),
  useScopeSelector: () => undefined,
}));

vi.mock('./hooks/use-gantt-drag.js', () => ({
  useGanttDrag: () => ({
    dragRef: { current: null },
    onPointerDown: vi.fn(),
  }),
}));

vi.mock('./hooks/use-gantt-link-draw.js', () => ({
  useGanttLinkDraw: () => ({
    onLinkHandlePointerDown: vi.fn(),
    startKeyboardLink: vi.fn(),
    completeKeyboardLink: vi.fn(),
    cancelLink: vi.fn(),
    isLinking: false,
  }),
}));

vi.mock('./hooks/use-gantt-scroll.js', () => ({
  useGanttScroll: vi.fn(),
}));

vi.mock('./hooks/use-gantt-keyboard.js', () => ({
  useGanttKeyboard: vi.fn(),
}));

describe('Gantt', () => {
  const baseProps = {
    id: 'gantt-test',
    path: 'test',
    schema: { type: 'gantt' as const },
    templateNode: {} as any,
    node: {} as any,
    props: { tasks: [], links: [] } as any,
    meta: { visible: true, disabled: false } as any,
    regions: {} as any,
    events: {} as any,
    reactions: {} as any,
    helpers: {} as any,
  };

  it('should render null when meta.visible is false', () => {
    const { container } = render(
      React.createElement(Gantt, { ...baseProps, meta: { visible: false, disabled: false } as any }),
    );
    expect(container.innerHTML).toBe('');
  });

  it('should render gantt container with real GanttHeader and GanttLayout', () => {
    const { container } = render(React.createElement(Gantt, baseProps));
    expect(container.querySelector('.nop-gantt')).toBeTruthy();
  });

  it('should render with testid when provided', () => {
    const { container } = render(
      React.createElement(Gantt, { ...baseProps, meta: { visible: true, disabled: false, testid: 'my-gantt' } as any }),
    );
    expect(container.querySelector('[data-testid="my-gantt"]')).toBeTruthy();
  });

  it('should render loading state with skeleton when loading prop is set', () => {
    const { container } = render(
      React.createElement(Gantt, { ...baseProps, props: { loading: true, tasks: [], links: [] } as any }),
    );
    expect(container.querySelector('.nop-gantt')).toBeTruthy();
  });

  it('should render empty region when provided with no tasks', () => {
    const emptyRegion = {
      type: 'region',
      render: () => React.createElement('div', { 'data-testid': 'empty-region' }, 'Custom empty'),
    };
    const { container } = render(
      React.createElement(Gantt, {
        ...baseProps,
        props: { tasks: [], links: [] } as any,
        regions: { empty: emptyRegion } as any,
      }),
    );
    expect(container.querySelector('[data-testid="empty-region"]')).toBeTruthy();
  });

  it('should call onMount and onUnmount events', () => {
    const onMount = vi.fn();
    const onUnmount = vi.fn();
    const { unmount } = render(
      React.createElement(Gantt, { ...baseProps, events: { onMount, onUnmount } as any }),
    );
    expect(onMount).toHaveBeenCalledWith({});
    unmount();
    expect(onUnmount).toHaveBeenCalledWith({});
  });

  it('should render with tasks and show real components', () => {
    const { container } = render(
      React.createElement(Gantt, {
        ...baseProps,
        props: {
          tasks: [{ id: 't1', text: 'Task 1', start: '2026-01-01', end: '2026-01-10' }],
          links: [],
        } as any,
      }),
    );
    expect(container.querySelector('.nop-gantt')).toBeTruthy();
  });

  it('should render task text in grid rows', () => {
    const { container } = render(
      React.createElement(Gantt, {
        ...baseProps,
        props: {
          tasks: [{ id: 't1', text: 'My Custom Task', start: '2026-01-01', end: '2026-01-10' }],
          links: [],
        } as any,
      }),
    );
    expect(container.querySelector('[data-task-id="t1"]')).toBeTruthy();
    expect(container.textContent).toContain('My Custom Task');
  });

  it('should render grid header cells', () => {
    const { container } = render(
      React.createElement(Gantt, {
        ...baseProps,
        props: {
          tasks: [{ id: 't1', text: 'Task 1', start: '2026-01-01', end: '2026-01-10' }],
          links: [],
        } as any,
      }),
    );
    const gridHeaderCells = container.querySelectorAll('[data-slot="gantt-grid-header-cell"]');
    expect(gridHeaderCells.length).toBeGreaterThanOrEqual(4);
    expect(container.textContent).toContain('Task');
    expect(container.textContent).toContain('Start');
    expect(container.textContent).toContain('End');
  });

  it('should render scale cells from time axis', () => {
    const { container } = render(
      React.createElement(Gantt, {
        ...baseProps,
        props: {
          tasks: [{ id: 't1', text: 'Task 1', start: '2026-01-01', end: '2026-01-10' }],
          links: [],
        } as any,
      }),
    );
    const scaleCells = container.querySelectorAll('[data-slot="gantt-scale-cell"]');
    expect(scaleCells.length).toBeGreaterThan(0);
  });

  it('should have treegrid role and tree ARIA attributes on rows', () => {
    const tasks = [
      {
        id: 't1', text: 'Root 1', start: '2026-01-01', end: '2026-01-10',
        children: [
          { id: 't1a', text: 'Child 1', start: '2026-01-02', end: '2026-01-05' },
          { id: 't1b', text: 'Child 2', start: '2026-01-03', end: '2026-01-08' },
        ],
      },
      {
        id: 't2', text: 'Root 2', start: '2026-01-05', end: '2026-01-15',
        children: [
          {
            id: 't2a', text: 'Child 2a', start: '2026-01-06', end: '2026-01-10',
            children: [
              { id: 't2a1', text: 'Grandchild', start: '2026-01-07', end: '2026-01-09' },
            ],
          },
        ],
      },
    ];
    const { container } = render(
      React.createElement(Gantt, { ...baseProps, props: { tasks, links: [] } as any }),
    );

    const grid = container.querySelector('[data-slot="gantt-grid"]');
    expect(grid).toBeTruthy();
    expect(grid!.getAttribute('role')).toBe('treegrid');

    const rows = container.querySelectorAll('[data-slot="gantt-grid-row"]');
    expect(rows.length).toBeGreaterThanOrEqual(5);

    const t1Row = container.querySelector('[data-task-id="t1"]');
    expect(t1Row?.getAttribute('aria-level')).toBe('1');
    expect(t1Row?.getAttribute('aria-setsize')).toBe('2');
    expect(t1Row?.getAttribute('aria-posinset')).toBe('1');

    const t2Row = container.querySelector('[data-task-id="t2"]');
    expect(t2Row?.getAttribute('aria-level')).toBe('1');
    expect(t2Row?.getAttribute('aria-setsize')).toBe('2');
    expect(t2Row?.getAttribute('aria-posinset')).toBe('2');

    const t1aRow = container.querySelector('[data-task-id="t1a"]');
    expect(t1aRow?.getAttribute('aria-level')).toBe('2');
    expect(t1aRow?.getAttribute('aria-setsize')).toBe('2');
    expect(t1aRow?.getAttribute('aria-posinset')).toBe('1');

    const t1bRow = container.querySelector('[data-task-id="t1b"]');
    expect(t1bRow?.getAttribute('aria-level')).toBe('2');
    expect(t1bRow?.getAttribute('aria-setsize')).toBe('2');
    expect(t1bRow?.getAttribute('aria-posinset')).toBe('2');

    const t2a1Row = container.querySelector('[data-task-id="t2a1"]');
    expect(t2a1Row?.getAttribute('aria-level')).toBe('3');
    expect(t2a1Row?.getAttribute('aria-setsize')).toBe('1');
    expect(t2a1Row?.getAttribute('aria-posinset')).toBe('1');
  });

  it('should have aria-expanded on toggle buttons matching collapse state', () => {
    const tasks = [
      {
        id: 't1', text: 'Root 1', start: '2026-01-01', end: '2026-01-10', open: true,
        children: [
          { id: 't1a', text: 'Child 1', start: '2026-01-02', end: '2026-01-05' },
        ],
      },
      {
        id: 't2', text: 'Root 2', start: '2026-01-05', end: '2026-01-15', open: false,
        children: [
          { id: 't2a', text: 'Child 2a', start: '2026-01-06', end: '2026-01-10' },
        ],
      },
    ];
    const { container } = render(
      React.createElement(Gantt, { ...baseProps, props: { tasks, links: [] } as any }),
    );

    const toggleButtons = container.querySelectorAll('button[aria-expanded]');
    const t1Toggle = Array.from(toggleButtons).find(
      (btn) => btn.getAttribute('aria-label')?.includes('Root 1'),
    );
    expect(t1Toggle).toBeTruthy();
    expect(t1Toggle!.getAttribute('aria-expanded')).toBe('true');

    const t2Toggle = Array.from(toggleButtons).find(
      (btn) => btn.getAttribute('aria-label')?.includes('Root 2'),
    );
    expect(t2Toggle).toBeTruthy();
    expect(t2Toggle!.getAttribute('aria-expanded')).toBe('false');
  });
});
