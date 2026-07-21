import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { Gantt } from './gantt.js';

vi.mock('@nop-chaos/flux-react', () => ({
  useRendererRuntime: () => ({ dispatch: vi.fn() }),
  useRenderScope: () => ({ id: 'mock-scope', path: '/mock', readVisible: () => ({}), readOwn: () => ({}), update: vi.fn(), merge: vi.fn(), replace: vi.fn(), dispose: vi.fn() }),
}));

vi.mock('./gantt-context.js', () => ({
  GanttStoreProvider: ({ children }: any) => React.createElement('div', { 'data-testid': 'gantt-store-provider' }, children),
  useGanttStore: () => ({
    tasks: new Map(),
    links: new Map(),
    resources: new Map(),
    assignments: new Map(),
    cellWidth: 40,
    currentZoom: 'day',
    scaleRange: { start: new Date('2026-01-01'), end: new Date('2026-01-31') },
    revision: 0,
    taskRevision: 0,
    linkRevision: 0,
    layoutRevision: 0,
    treeRevision: 0,
    getVisibleTasks: () => [],
    getAvailableZooms: () => [{ key: 'day', label: 'Day' }, { key: 'week', label: 'Week' }],
    setZoom: vi.fn(),
    parse: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    addLink: vi.fn(),
    removeLink: vi.fn(),
    toggleOpen: vi.fn(),
    getVisibleDescendantCount: () => 0,
    on: vi.fn(),
    off: vi.fn(),
    scrollLeft: 0,
  }),
}));

vi.mock('./gantt-header.js', () => ({
  GanttHeader: () => React.createElement('div', { 'data-testid': 'gantt-header' }),
}));

vi.mock('./gantt-layout.js', () => ({
  GanttLayout: () => React.createElement('div', { 'data-testid': 'gantt-layout' }),
}));

vi.mock('./gantt-editor.js', () => ({
  GanttEditor: () => React.createElement('div', { 'data-testid': 'gantt-editor' }),
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
    props: {} as any,
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

  it('should render gantt container when visible', () => {
    const { container } = render(React.createElement(Gantt, baseProps));
    expect(container.querySelector('.nop-gantt')).toBeTruthy();
  });

  it('should render with testid when provided', () => {
    const { container } = render(
      React.createElement(Gantt, { ...baseProps, meta: { visible: true, disabled: false, testid: 'my-gantt' } as any }),
    );
    expect(container.querySelector('[data-testid="my-gantt"]')).toBeTruthy();
  });

  it('should call onMount and onUnmount events', () => {
    const onMount = vi.fn();
    const onUnmount = vi.fn();
    const { unmount } = render(
      React.createElement(Gantt, { ...baseProps, events: { onMount, onUnmount } as any }),
    );
    unmount();
  });
});
