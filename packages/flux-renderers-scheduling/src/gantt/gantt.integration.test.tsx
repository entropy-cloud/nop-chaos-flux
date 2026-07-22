import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { Gantt } from './gantt.js';

vi.mock('@nop-chaos/flux-react', () => ({
  useRendererRuntime: () => ({ dispatch: vi.fn() }),
  useRenderScope: () => ({ id: 'mock-scope', path: '/mock', readVisible: () => ({}), readOwn: () => ({}), update: vi.fn(), merge: vi.fn(), replace: vi.fn(), dispose: vi.fn() }),
  useScopeSelector: () => undefined,
}));

vi.mock('./hooks/use-gantt-scroll.js', () => ({
  useGanttScroll: () => ({
    scrollRef: { current: null },
    gridRef: { current: null },
    timelineRef: { current: null },
    svgRef: { current: null },
    scrollLeft: 0,
    handleWheel: vi.fn(),
    scrollTo: vi.fn(),
  }),
}));

const baseProps = {
  id: 'gantt-integration',
  path: 'test',
  schema: { type: 'gantt' as const },
  templateNode: {} as any,
  node: {} as any,
  props: {
    tasks: [
      { id: 't1', text: 'Design API', start: '2026-01-01', end: '2026-01-10' },
      { id: 't2', text: 'Implement API', start: '2026-01-11', end: '2026-01-20' },
      { id: 't3', text: 'Write Tests', start: '2026-01-15', end: '2026-01-25' },
    ],
    links: [
      { id: 'l1', source: 't1', target: 't2', type: 'finish_to_start' },
      { id: 'l2', source: 't2', target: 't3', type: 'start_to_start' },
    ],
  } as any,
  meta: { visible: true, disabled: false } as any,
  regions: {} as any,
  events: {} as any,
  reactions: {} as any,
  helpers: {} as any,
};

describe('Gantt Integration', () => {
  it('renders gantt container with tasks', () => {
    const { container } = render(React.createElement(Gantt, baseProps));
    expect(container.querySelector('.nop-gantt')).toBeTruthy();
  });

  it('renders task bars', () => {
    const { container } = render(React.createElement(Gantt, baseProps));
    const taskBars = container.querySelectorAll('[data-slot="gantt-bar"]');
    expect(taskBars.length).toBeGreaterThanOrEqual(1);
  });

  it('renders with testid when provided', () => {
    const { container } = render(
      React.createElement(Gantt, {
        ...baseProps,
        meta: { visible: true, disabled: false, testid: 'my-gantt' } as any,
      }),
    );
    expect(container.querySelector('[data-testid="my-gantt"]')).toBeTruthy();
  });

  it('renders toolbar component', () => {
    const { container } = render(React.createElement(Gantt, baseProps));
    expect(container.querySelector('[data-slot="gantt-toolbar"]')).toBeTruthy();
  });

  it('renders loading skeleton when loading is set', () => {
    const { container } = render(
      React.createElement(Gantt, {
        ...baseProps,
        props: { ...baseProps.props, loading: true } as any,
      }),
    );
    expect(container.querySelector('.nop-gantt')).toBeTruthy();
  });

  it('renders empty region when no tasks provided', () => {
    const emptyRegion = {
      type: 'region',
      render: () => React.createElement('div', { 'data-testid': 'empty-region' }, 'No data'),
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

  it('renders null when meta.visible is false', () => {
    const { container } = render(
      React.createElement(Gantt, {
        ...baseProps,
        meta: { visible: false, disabled: false } as any,
      }),
    );
    expect(container.innerHTML).toBe('');
  });
});
