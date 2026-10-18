import React, { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { GanttLinks } from './gantt-links.js';
import type { GanttStoreApi } from './gantt.types.js';

function makeStore(linkPoints: string[]): { store: GanttStoreApi; removeLink: ReturnType<typeof vi.fn> } {
  const removeLink = vi.fn();
  const links = new Map(
    linkPoints.map((p, i) => [String(i + 1), { id: String(i + 1), source: '1', target: '2', type: 'finish_to_start' as const, $p: p }]),
  );
  const tasks = new Map([
    ['1', { id: '1', text: 'A', start: '2026-10-18', end: '2026-10-27', $x: 320, $y: 46, $w: 400, $h: 28, $level: 0, $source: [], $target: [] }],
    ['2', { id: '2', text: 'B', start: '2026-10-28', end: '2026-11-11', $x: 720, $y: 86, $w: 600, $h: 28, $level: 0, $source: [], $target: [] }],
  ]);
  const store = {
    subscribe: () => () => {},
    get linkRevision() { return 0; },
    get layoutRevision() { return 0; },
    get links() { return links; },
    get scaleRange() { return { start: new Date('2026-10-18'), end: new Date('2026-12-17') }; },
    get cellWidth() { return 40; },
    getVisibleTasks: () => Array.from(tasks.values()),
    removeLink,
  } as unknown as GanttStoreApi;
  return { store, removeLink };
}

const L1_P = '720,60 710,60 710,60 700,60 700,100 710,100 720,100';

// FM-1b: the link hover X must stay mounted at the link midpoint and keep its
// delete wiring — the bar-overlap press misfire is fixed at the event layer
// (see GanttLinks useEffect), so plain clicks must keep deleting.
describe('GanttLinks delete button (FM-1b regression)', () => {
  it('hover renders the delete button at the link midpoint and clicking removes the link', () => {
    const { store, removeLink } = makeStore([L1_P]);
    const { container } = render(React.createElement(GanttLinks, { store }));
    const g = container.querySelector('g')!;
    expect(g).toBeTruthy();

    act(() => {
      fireEvent.mouseEnter(g);
    });
    const btn = container.querySelector('.nop-gantt-link-delete-btn') as HTMLElement | null;
    expect(btn).toBeTruthy();
    const fo = btn!.closest('foreignObject') as SVGGraphicsElement | null;
    expect(fo).toBeTruthy();
    expect(Number(fo!.getAttribute('x'))).toBe(700);
    expect(Number(fo!.getAttribute('y'))).toBe(48);

    act(() => {
      fireEvent.click(btn!);
    });
    expect(removeLink).toHaveBeenCalledWith('1');
  });
});
