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
});
