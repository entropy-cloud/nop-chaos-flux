import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { Gantt } from './gantt.js';

vi.mock('@nop-chaos/flux-react', () => ({
  useRenderScope: () => ({
    id: 'mock-scope',
    path: '/mock',
    readVisible: () => ({}),
    readOwn: () => ({}),
    update: vi.fn(),
    merge: vi.fn(),
    replace: vi.fn(),
    dispose: vi.fn(),
  }),
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

const baseProps = {
  id: 'gantt-mount-timing-test',
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

// NOTE: use-gantt-keyboard.ts / use-gantt-scroll.ts are intentionally NOT
// mocked here — the proof must exercise the real hooks against the real
// loading → data mount transition.

describe('Gantt listener mount timing (1-7): loading/empty first mount must not lose keyboard/scroll listeners', () => {
  it('keydown listener attaches after data arrives post-loading mount and navigation works', async () => {
    const { container, rerender } = render(
      React.createElement(Gantt, {
        ...baseProps,
        props: { loading: true, tasks: [], links: [] } as any,
      }),
    );
    const ganttEl = () => container.querySelector('[data-slot="gantt"]') as HTMLElement | null;
    expect(ganttEl()?.getAttribute('tabindex')).toBeNull();

    rerender(
      React.createElement(Gantt, {
        ...baseProps,
        props: {
          tasks: [
            { id: 't1', text: 'T1', start: '2026-01-01', end: '2026-01-10' },
            { id: 't2', text: 'T2', start: '2026-01-02', end: '2026-01-11' },
          ],
          links: [],
        } as any,
      }),
    );

    await waitFor(() => expect(ganttEl()?.getAttribute('tabindex')).toBe('0'));
    expect(ganttEl()?.getAttribute('role')).toBe('grid');

    act(() => {
      ganttEl()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });
    const row = container.querySelector('[data-task-id="t1"]');
    expect(row?.getAttribute('aria-selected')).toBe('true');
    expect(row?.getAttribute('tabindex')).toBe('0');
  });

  it('keydown listener attaches after an empty first mount when tasks arrive (empty region path)', async () => {
    const { container, rerender } = render(
      React.createElement(Gantt, {
        ...baseProps,
        props: { tasks: [], links: [] } as any,
      }),
    );
    const ganttEl = () => container.querySelector('[data-slot="gantt"]') as HTMLElement | null;
    expect(ganttEl()?.getAttribute('tabindex')).toBeNull();

    rerender(
      React.createElement(Gantt, {
        ...baseProps,
        props: { tasks: [{ id: 't1', text: 'T1', start: '2026-01-01', end: '2026-01-10' }], links: [] } as any,
      }),
    );
    await waitFor(() => expect(ganttEl()?.getAttribute('tabindex')).toBe('0'));
    expect(ganttEl()?.getAttribute('role')).toBe('grid');
  });

  it('grid↔timeline scroll sync attaches after data arrives post-loading mount', async () => {
    const { container, rerender } = render(
      React.createElement(Gantt, {
        ...baseProps,
        props: { loading: true, tasks: [], links: [] } as any,
      }),
    );
    rerender(
      React.createElement(Gantt, {
        ...baseProps,
        props: {
          tasks: [{ id: 't1', text: 'T1', start: '2026-01-01', end: '2026-01-10' }],
          links: [],
        } as any,
      }),
    );

    await waitFor(() => {
      expect(container.querySelector('[data-slot="gantt-grid"]')).toBeTruthy();
      expect(container.querySelector('[data-slot="gantt-scale"]')).toBeTruthy();
    });
    const gridEl = container.querySelector('[data-slot="gantt-grid"]') as HTMLElement;
    const timelineEl = container.querySelector('[data-slot="gantt-scale"]') as HTMLElement;
    const gridScrollContainer = gridEl.parentElement as HTMLElement;
    const timelineScrollContainer = timelineEl.parentElement as HTMLElement;
    gridScrollContainer.scrollTop = 100;
    gridScrollContainer.dispatchEvent(new Event('scroll', { bubbles: true }));
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });
    expect(timelineScrollContainer.scrollTop).toBe(100);

    timelineScrollContainer.scrollTop = 50;
    timelineScrollContainer.dispatchEvent(new Event('scroll', { bubbles: true }));
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });
    expect(gridScrollContainer.scrollTop).toBe(50);
  });
});
