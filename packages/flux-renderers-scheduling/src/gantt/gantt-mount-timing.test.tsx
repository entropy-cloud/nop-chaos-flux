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
    // The grid scroll container is the overflow-auto grid element itself
    // (scrollContainerRef lands on it for the virtualizer); the timeline
    // scroll container is the overflow-auto wrapper around the scale.
    const gridScrollContainer = gridEl;
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

  it('re-seeds the store after a StrictMode double-mount destroy cycle so bars still render (119)', () => {
    // Regression: the P3-5 unmount cleanup calls store.destroy(), which under
    // the React 18/19 StrictMode dev cycle (setup → cleanup → setup, state
    // preserved) empties the store; the re-seed effect's reference snapshot is
    // unchanged so it early-returns and the gantt stays in the empty state
    // (dblclick editor unreachable). The store-empty self-heal must re-parse
    // the schema data on the remount effect pass. Stable prop references are
    // required — fresh per-render arrays would re-trigger dataChanged and mask
    // the destroyed-store path.
    const strictTasks = [
      { id: 't1', text: 'T1', start: '2026-01-01', end: '2026-01-10' },
      { id: 't2', text: 'T2', start: '2026-01-02', end: '2026-01-11' },
    ];
    const { container } = render(
      React.createElement(React.StrictMode, null, [
        React.createElement(Gantt, {
          ...baseProps,
          props: { tasks: strictTasks, links: [] } as any,
        }),
      ]),
    );
    // destroy() does not bump layoutRevision, so stale bars survive in the DOM;
    // the broken state only surfaces on the next store-driven re-render. Drive
    // one (dblclick → editTask → editingTaskId re-render) and assert the editor
    // dialog still opens — pre-fix this re-render hits the empty-state branch.
    const bar = container.querySelector('[data-slot="gantt-bar"]') as HTMLElement;
    expect(bar).toBeTruthy();
    act(() => {
      bar.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    });
    // Radix Dialog portals to document.body — query the body, not container.
    expect(document.body.querySelector('[role="dialog"]')).toBeTruthy();
  });
});
