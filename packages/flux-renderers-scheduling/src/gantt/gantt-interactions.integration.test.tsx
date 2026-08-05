import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { Gantt } from './gantt.js';

vi.mock('@nop-chaos/flux-react', () => ({
  useRendererRuntime: () => ({ dispatch: vi.fn() }),
  useRenderScope: () => ({ id: 'mock-scope', path: '/mock', readVisible: () => ({}), readOwn: () => ({}), update: vi.fn(), merge: vi.fn(), replace: vi.fn(), dispose: vi.fn() }),
  useScopeSelector: () => undefined,
  useCurrentComponentRegistry: () => undefined,
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

afterEach(() => {
  cleanup();
});

const baseProps = {
  id: 'gantt-interactions',
  path: 'test',
  schema: { type: 'gantt' as const },
  templateNode: {} as any,
  node: {} as any,
  props: {
    tasks: [
      {
        id: 'p1', text: 'Parent', start: '2026-01-01', end: '2026-01-10',
        children: [
          { id: 'c1', text: 'Child 1', start: '2026-01-02', end: '2026-01-05' },
          { id: 'c2', text: 'Child 2', start: '2026-01-06', end: '2026-01-08' },
        ],
      },
      { id: 't2', text: 'Standalone', start: '2026-01-05', end: '2026-01-15' },
    ],
    links: [],
  } as any,
  meta: { visible: true, disabled: false } as any,
  regions: {} as any,
  events: {} as any,
  reactions: {} as any,
  helpers: {} as any,
};

describe('Gantt real-hook interactions', () => {
  it('renders grid rows with data-slot and aria-expanded for nested tasks', () => {
    const { container } = render(React.createElement(Gantt, baseProps));
    const rows = container.querySelectorAll('[data-slot="gantt-grid-row"]');
    expect(rows.length).toBeGreaterThanOrEqual(3);
    const expandButtons = container.querySelectorAll('button[aria-expanded]');
    expect(expandButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('keyboard ArrowRight expands a collapsed parent task', () => {
    const { container } = render(React.createElement(Gantt, baseProps));
    const ganttEl = container.querySelector('.nop-gantt') as HTMLElement;
    ganttEl.focus();

    const parentRow = container.querySelector('[data-task-id="p1"]') as HTMLElement | null;
    if (parentRow) fireEvent.click(parentRow);

    fireEvent.keyDown(ganttEl, { key: 'ArrowLeft' });
    const afterCollapse = container.querySelectorAll('[data-task-id="c1"]');
    expect(afterCollapse.length).toBe(0);

    fireEvent.keyDown(ganttEl, { key: 'ArrowRight' });
    const afterExpand = container.querySelectorAll('[data-task-id="c1"]');
    expect(afterExpand.length).toBeGreaterThanOrEqual(1);
  });

  it('keyboard Enter opens the editor for selected task', () => {
    const { container } = render(React.createElement(Gantt, baseProps));
    const ganttEl = container.querySelector('.nop-gantt') as HTMLElement;
    ganttEl.focus();

    const parentRow = container.querySelector('[data-task-id="p1"]') as HTMLElement | null;
    if (parentRow) fireEvent.click(parentRow);

    fireEvent.keyDown(ganttEl, { key: 'Enter' });

    const editorInput = document.querySelector<HTMLInputElement>('input[id$="-edit-text"]');
    expect(editorInput).not.toBeNull();
    expect(editorInput!.value).toBe('Parent');
  });
});
