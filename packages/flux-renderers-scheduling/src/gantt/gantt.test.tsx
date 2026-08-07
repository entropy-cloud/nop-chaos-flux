import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, waitFor, act, fireEvent } from '@testing-library/react';
import { Gantt } from './gantt.js';

vi.mock('@nop-chaos/flux-react', () => ({
  useRendererRuntime: () => ({ dispatch: vi.fn() }),
  useRenderScope: () => ({ id: 'mock-scope', path: '/mock', readVisible: () => ({}), readOwn: () => ({}), update: vi.fn(), merge: vi.fn(), replace: vi.fn(), dispose: vi.fn() }),
  useScopeSelector: () => undefined,
  useCurrentComponentRegistry: () => undefined,
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

const keyboardOptionsCapture = vi.hoisted(() => ({ options: null as null | Record<string, unknown> }));

vi.mock('./hooks/use-gantt-keyboard.js', () => ({
  useGanttKeyboard: (options: Record<string, unknown>) => {
    keyboardOptionsCapture.options = options;
  },
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
    expect(onMount).toHaveBeenCalledWith({}, expect.anything());
    unmount();
    expect(onUnmount).toHaveBeenCalledWith({}, expect.anything());
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
    // Column labels come from i18n keys (scheduling.gantt.*), resolved in the
    // default zh-CN locale (CR Phase 4 hardcoded-string cleanup).
    expect(container.textContent).toContain('任务');
    expect(container.textContent).toContain('开始');
    expect(container.textContent).toContain('结束');
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

describe('Gantt regression — C9 scheduling audit (event ctx / reactions / prop re-parse)', () => {
  const regressionBaseProps = {
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

  it('should dispatch onTaskClick with evaluationBindings ctx (CX-10 convention)', () => {
    const onTaskClick = vi.fn();
    const { container } = render(
      React.createElement(Gantt, {
        ...regressionBaseProps,
        props: { tasks: [{ id: 't1', text: 'T1', start: '2026-01-01', end: '2026-01-10' }], links: [] } as any,
        events: { onTaskClick } as any,
      }),
    );
    const bar = container.querySelector('[data-slot="gantt-bar"]') as HTMLElement;
    expect(bar).toBeTruthy();
    bar.click();
    expect(onTaskClick).toHaveBeenCalledWith(
      { _taskId: 't1' },
      expect.objectContaining({
        event: expect.objectContaining({ _taskId: 't1' }),
        evaluationBindings: { _taskId: 't1' },
        scope: expect.anything(),
      }),
    );
  });

  it('should ready() declared reactions on mount and dispatch zoomIn from the header + button', () => {
    const zoomIn = { ready: vi.fn(), dispatch: vi.fn() };
    const zoomOut = { ready: vi.fn(), dispatch: vi.fn() };
    const scrollToToday = { ready: vi.fn(), dispatch: vi.fn() };
    const scrollToTask = { ready: vi.fn(), dispatch: vi.fn() };
    const { container } = render(
      React.createElement(Gantt, {
        ...regressionBaseProps,
        props: {
          tasks: [{ id: 't1', text: 'T1', start: '2026-01-01', end: '2026-01-10' }],
          links: [],
        } as any,
        reactions: { zoomIn, zoomOut, scrollToToday, scrollToTask } as any,
      }),
    );
    expect(zoomIn.ready).toHaveBeenCalledTimes(1);
    expect(zoomOut.ready).toHaveBeenCalledTimes(1);
    expect(scrollToToday.ready).toHaveBeenCalledTimes(1);
    expect(scrollToTask.ready).toHaveBeenCalledTimes(1);

    const toolbarButtons = container.querySelectorAll('[data-slot="gantt-toolbar"] button');
    expect(toolbarButtons.length).toBeGreaterThanOrEqual(2);
    (toolbarButtons[1] as HTMLElement).click();
    expect(zoomIn.dispatch).toHaveBeenCalledTimes(1);
    expect(zoomOut.dispatch).not.toHaveBeenCalled();
  });

  it('should re-parse the store when the tasks prop changes at runtime', async () => {
    const { container, rerender } = render(
      React.createElement(Gantt, {
        ...regressionBaseProps,
        props: { tasks: [{ id: 't1', text: 'T1', start: '2026-01-01', end: '2026-01-10' }], links: [] } as any,
      }),
    );
    expect(container.querySelector('[data-task-id="t1"]')).toBeTruthy();

    rerender(
      React.createElement(Gantt, {
        ...regressionBaseProps,
        props: {
          tasks: [
            { id: 't2', text: 'T2', start: '2026-02-01', end: '2026-02-10' },
            { id: 't3', text: 'T3', start: '2026-03-01', end: '2026-03-10' },
          ],
          links: [] } as any,
      }),
    );
    await waitFor(() => {
      expect(container.querySelector('[data-task-id="t2"]')).toBeTruthy();
      expect(container.querySelector('[data-task-id="t3"]')).toBeTruthy();
      expect(container.querySelector('[data-task-id="t1"]')).toBeNull();
    });
  });
});

describe('Gantt regression — 22-01 zoom single-step per click (0711 audit P1)', () => {
  const zoomBaseProps = {
    id: 'gantt-test',
    path: 'test',
    schema: { type: 'gantt' as const },
    templateNode: {} as any,
    node: {} as any,
    props: {} as any,
    meta: { visible: true, disabled: false } as any,
    regions: {} as any,
    events: {} as any,
    reactions: {} as any,
    helpers: {} as any,
  };

  const zoomProps = {
    defaultZoom: 'day',
    zoomLevels: [
      { key: 'day', label: 'Day', minCellWidth: 40, scales: [{ unit: 'day', step: 1, format: 'MM/DD' }] },
      { key: 'week', label: 'Week', minCellWidth: 80, scales: [{ unit: 'week', step: 1, format: 'YYYY' }, { unit: 'day', step: 1, format: 'DD' }] },
      { key: 'month', label: 'Month', minCellWidth: 60, scales: [{ unit: 'month', step: 1, format: 'YYYY' }, { unit: 'day', step: 1, format: 'DD' }] },
    ],
    tasks: [{ id: 't1', text: 'T1', start: '2026-01-01', end: '2026-01-10' }],
    links: [],
  };

  const renderZoomGantt = (events: any, reactions: any) =>
    render(
      React.createElement(Gantt, {
        ...zoomBaseProps,
        props: zoomProps as any,
        events,
        reactions,
      }),
    );

  const makeReactions = () => ({
    zoomIn: { ready: vi.fn(), dispatch: vi.fn() },
    zoomOut: { ready: vi.fn(), dispatch: vi.fn() },
    scrollToToday: { ready: vi.fn(), dispatch: vi.fn() },
    scrollToTask: { ready: vi.fn(), dispatch: vi.fn() },
  });

  it('single + click from day advances exactly one level (day→week) with single onZoomChange dispatch', async () => {
    const onZoomChange = vi.fn();
    const reactions = makeReactions();
    const { container } = renderZoomGantt({ onZoomChange }, reactions);

    // Day zoom renders a single scale row (day unit only).
    const scaleRowCount = () => container.querySelectorAll('[data-slot="gantt-scale"] > div').length;
    expect(scaleRowCount()).toBe(1);

    const toolbarButtons = container.querySelectorAll('[data-slot="gantt-toolbar"] button');
    (toolbarButtons[1] as HTMLElement).click();

    expect(onZoomChange).toHaveBeenCalledTimes(1);
    expect(onZoomChange).toHaveBeenCalledWith({ zoom: 'week' }, expect.anything());
    expect(reactions.zoomIn.dispatch).toHaveBeenCalledTimes(1);
    expect(reactions.zoomOut.dispatch).not.toHaveBeenCalled();

    // Week zoom renders two scale rows (week + day units) — store.currentZoom is week.
    await waitFor(() => {
      expect(scaleRowCount()).toBe(2);
    });
  });

  it('two + clicks from day advance day→week→month step by step, one dispatch each', () => {
    const onZoomChange = vi.fn();
    const reactions = makeReactions();
    const { container } = renderZoomGantt({ onZoomChange }, reactions);

    const toolbarButtons = container.querySelectorAll('[data-slot="gantt-toolbar"] button');
    (toolbarButtons[1] as HTMLElement).click();
    (toolbarButtons[1] as HTMLElement).click();

    expect(onZoomChange).toHaveBeenCalledTimes(2);
    expect(onZoomChange.mock.calls[0][0]).toEqual({ zoom: 'week' });
    expect(onZoomChange.mock.calls[1][0]).toEqual({ zoom: 'month' });
    expect(reactions.zoomIn.dispatch).toHaveBeenCalledTimes(2);

    // Third click at the top level does nothing — no over-stepping.
    (toolbarButtons[1] as HTMLElement).click();
    expect(onZoomChange).toHaveBeenCalledTimes(2);
    expect(reactions.zoomIn.dispatch).toHaveBeenCalledTimes(2);
  });
});

describe('Gantt regression — 22-07 onTaskEdit (编辑型变更事件外抛)', () => {
  const editBaseProps = {
    id: 'gantt-test',
    path: 'test',
    schema: { type: 'gantt' as const },
    templateNode: {} as any,
    node: {} as any,
    props: {
      tasks: [{ id: 't1', text: 'T1', start: '2026-01-01', end: '2026-01-10' }],
      links: [],
    } as any,
    meta: { visible: true, disabled: false } as any,
    regions: {} as any,
    events: {} as any,
    reactions: {} as any,
    helpers: {} as any,
  };

  it('keyboard Delete dispatches onTaskEdit with {_taskId, deleted:true} + full ctx (22-07)', () => {
    const onTaskEdit = vi.fn();
    render(
      React.createElement(Gantt, {
        ...editBaseProps,
        events: { onTaskEdit } as any,
      }),
    );
    expect(keyboardOptionsCapture.options).toBeTruthy();
    act(() => {
      (keyboardOptionsCapture.options!.onDeleteTask as (id: string) => void)('t1');
    });
    expect(onTaskEdit).toHaveBeenCalledTimes(1);
    expect(onTaskEdit).toHaveBeenCalledWith(
      { _taskId: 't1', deleted: true },
      expect.objectContaining({
        event: expect.objectContaining({ _taskId: 't1', deleted: true }),
        evaluationBindings: expect.objectContaining({ _taskId: 't1', deleted: true }),
        scope: expect.anything(),
      }),
    );
  });

  it('inline cell commit dispatches onTaskEdit with {_taskId, changes} + full ctx through the REAL grid path (23-2)', async () => {
    const onTaskEdit = vi.fn();
    const { container } = render(
      React.createElement(Gantt, {
        ...editBaseProps,
        events: { onTaskEdit } as any,
      }),
    );

    // Real UI path: double-click the text cell → inline Input → Enter.
    const textCell = container.querySelector('[data-slot="gantt-grid-row"] [data-slot="gantt-grid-cell"]') as HTMLElement;
    expect(textCell).toBeTruthy();
    fireEvent.doubleClick(textCell);

    const input = container.querySelector('[data-slot="gantt-grid"] input') as HTMLInputElement;
    expect(input).toBeTruthy();
    fireEvent.change(input, { target: { value: 'Renamed' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onTaskEdit).toHaveBeenCalledTimes(1);
    expect(onTaskEdit).toHaveBeenCalledWith(
      { _taskId: 't1', changes: { text: 'Renamed' } },
      expect.objectContaining({
        event: expect.objectContaining({ _taskId: 't1', changes: { text: 'Renamed' } }),
        evaluationBindings: expect.objectContaining({ _taskId: 't1', changes: { text: 'Renamed' } }),
        scope: expect.anything(),
      }),
    );
  });

  it('editor save dispatches onTaskEdit with {_taskId, changes} + full ctx through the REAL editor path (23-2)', async () => {
    const onTaskEdit = vi.fn();
    const { container } = render(
      React.createElement(Gantt, {
        ...editBaseProps,
        events: { onTaskEdit } as any,
      }),
    );

    // Real UI path: double-click the task bar → editor dialog opens.
    const bar = container.querySelector('[data-slot="gantt-bar"][data-task-id="t1"]') as HTMLElement;
    expect(bar).toBeTruthy();
    fireEvent.doubleClick(bar);

    await waitFor(() => {
      const textInput = document.querySelector<HTMLInputElement>('input[id$="-edit-text"]');
      expect(textInput).toBeTruthy();
    });
    const textInput = document.querySelector<HTMLInputElement>('input[id$="-edit-text"]')!;
    fireEvent.change(textInput, { target: { value: 'Editor Renamed' } });

    const saveButton = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('保存') || b.textContent?.includes('Save'),
    );
    expect(saveButton).toBeTruthy();
    fireEvent.click(saveButton!);

    expect(onTaskEdit).toHaveBeenCalledTimes(1);
    expect(onTaskEdit).toHaveBeenCalledWith(
      {
        _taskId: 't1',
        changes: expect.objectContaining({ text: 'Editor Renamed', start: '2026-01-01', end: '2026-01-10' }),
      },
      expect.objectContaining({
        event: expect.objectContaining({ _taskId: 't1' }),
        evaluationBindings: expect.objectContaining({ _taskId: 't1', changes: expect.objectContaining({ text: 'Editor Renamed' }) }),
        scope: expect.anything(),
      }),
    );
  });
});

describe('Gantt regression — 22-10 配置 prop 运行时同步', () => {
  const configBaseProps = {
    id: 'gantt-test',
    path: 'test',
    schema: { type: 'gantt' as const },
    templateNode: {} as any,
    node: {} as any,
    props: {} as any,
    meta: { visible: true, disabled: false } as any,
    regions: {} as any,
    events: {} as any,
    reactions: {} as any,
    helpers: {} as any,
  };

  const tasks = [{ id: 't1', text: 'T1', start: '2026-01-01', end: '2026-01-10' }];
  const dayOnly = [
    { key: 'day', label: 'Day', minCellWidth: 40, scales: [{ unit: 'day', step: 1, format: 'MM/DD' }] },
  ];
  const dayWeek = [
    { key: 'day', label: 'Day', minCellWidth: 40, scales: [{ unit: 'day', step: 1, format: 'MM/DD' }] },
    { key: 'week', label: 'Week', minCellWidth: 80, scales: [{ unit: 'week', step: 1, format: 'YYYY' }, { unit: 'day', step: 1, format: 'DD' }] },
  ];

  it('syncs cellWidth prop changes into the store at runtime (scale cell width follows)', async () => {
    const { container, rerender } = render(
      React.createElement(Gantt, {
        ...configBaseProps,
        props: { defaultZoom: 'day', zoomLevels: dayOnly, tasks, links: [] } as any,
      }),
    );
    const dayCellWidth = () => {
      const cell = container.querySelector('[data-slot="gantt-scale-cell"]') as HTMLElement | null;
      return cell ? parseInt(cell.style.width, 10) : null;
    };
    expect(dayCellWidth()).toBe(40);

    rerender(
      React.createElement(Gantt, {
        ...configBaseProps,
        props: { defaultZoom: 'day', zoomLevels: dayOnly, cellWidth: 90, tasks, links: [] } as any,
      }),
    );
    await waitFor(() => {
      expect(dayCellWidth()).toBe(90);
    });
  });

  it('syncs taskBarHeight prop changes into the store at runtime (bar height follows)', async () => {
    const { container, rerender } = render(
      React.createElement(Gantt, {
        ...configBaseProps,
        props: { defaultZoom: 'day', zoomLevels: dayOnly, taskBarHeight: 28, tasks, links: [] } as any,
      }),
    );
    const barHeight = () => {
      const bar = container.querySelector('[data-slot="gantt-bar"]') as HTMLElement | null;
      return bar ? parseInt(bar.style.height, 10) : null;
    };
    expect(barHeight()).toBe(28);

    rerender(
      React.createElement(Gantt, {
        ...configBaseProps,
        props: { defaultZoom: 'day', zoomLevels: dayOnly, taskBarHeight: 44, tasks, links: [] } as any,
      }),
    );
    await waitFor(() => {
      expect(barHeight()).toBe(44);
    });
  });

  it('syncs zoomLevels prop changes into the store at runtime (new levels become zoomable)', async () => {
    const onZoomChange = vi.fn();
    const { container, rerender } = render(
      React.createElement(Gantt, {
        ...configBaseProps,
        props: { defaultZoom: 'day', zoomLevels: dayOnly, tasks, links: [] } as any,
        events: { onZoomChange } as any,
      }),
    );
    const zoomInButton = () => container.querySelectorAll('[data-slot="gantt-toolbar"] button')[1] as HTMLElement;
    zoomInButton().click();
    expect(onZoomChange).not.toHaveBeenCalled();

    rerender(
      React.createElement(Gantt, {
        ...configBaseProps,
        props: { defaultZoom: 'day', zoomLevels: dayWeek, tasks, links: [] } as any,
        events: { onZoomChange } as any,
      }),
    );
    await waitFor(() => {
      zoomInButton().click();
      expect(onZoomChange).toHaveBeenCalledWith({ zoom: 'week' }, expect.anything());
    });
  });
});
