import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, act, cleanup } from '@testing-library/react';
import React from 'react';
import { detectConflicts, detectMonthConflicts } from './utils/calendar-layout-utils.js';
import { Calendar } from './calendar.js';
import type { CalendarEvent } from '../schemas.js';

afterEach(cleanup);

describe('detectMonthConflicts equivalence with per-cell detectConflicts (plan 2026-09-29-1 Phase 2)', () => {
  const events: CalendarEvent[] = [
    // same-day overlap pair on r1
    { id: 'a', title: 'A', start: '2026-07-20T08:00:00', end: '2026-07-20T10:00:00', type: 'shift', resourceId: 'r1' },
    { id: 'b', title: 'B', start: '2026-07-20T09:00:00', end: '2026-07-20T11:00:00', type: 'shift', resourceId: 'r1' },
    // non-overlap pair on r2
    { id: 'c', title: 'C', start: '2026-07-20T08:00:00', end: '2026-07-20T09:00:00', type: 'shift', resourceId: 'r2' },
    { id: 'd', title: 'D', start: '2026-07-20T10:00:00', end: '2026-07-20T11:00:00', type: 'shift', resourceId: 'r2' },
    // multi-day event overlapping 07-20..07-21 on r3, conflicting on 07-21
    { id: 'e', title: 'E', start: '2026-07-20T08:00:00', end: '2026-07-21T12:00:00', type: 'shift', resourceId: 'r3' },
    { id: 'f', title: 'F', start: '2026-07-21T11:00:00', end: '2026-07-21T13:00:00', type: 'shift', resourceId: 'r3' },
    // different resource, overlapping times — must not leak into r1 bucket
    { id: 'g', title: 'G', start: '2026-07-20T08:30:00', end: '2026-07-20T09:30:00', type: 'shift', resourceId: 'r9' },
    // default-resource event (no resourceId) overlapping 'a' window in _default space only
    { id: 'h', title: 'H', start: '2026-07-20T08:30:00', end: '2026-07-20T09:30:00', type: 'shift' },
  ];

  const days = Array.from({ length: 3 }, (_, i) => new Date(Date.UTC(2026, 6, 20 + i)));
  const resources = [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }, { id: '_default' }, { id: 'r9' }];

  it('batch result equals per-cell detectConflicts for every (resource, day)', () => {
    const batch = detectMonthConflicts({ events, days });
    for (const resource of resources) {
      for (const day of days) {
        const dateStr = day.toISOString().slice(0, 10);
        const perCell = detectConflicts({ events, resourceId: resource.id, date: dateStr });
        const batchIds = batch.get(`${resource.id}:${dateStr}`);
        if (!perCell) {
          expect(batchIds).toBeUndefined();
        } else {
          expect([...(batchIds ?? [])].sort()).toEqual([...perCell.overlappingEvents.map((e) => e.id)].sort());
        }
      }
    }
  });

  it('flags the known overlapping pairs and nothing else', () => {
    const batch = detectMonthConflicts({ events, days });
    expect([...batch.get('r1:2026-07-20') ?? []].sort()).toEqual(['a', 'b']);
    expect([...batch.get('r3:2026-07-21') ?? []].sort()).toEqual(['e', 'f']);
    expect(batch.has('r2:2026-07-20')).toBe(false);
    expect(batch.has('_default:2026-07-20')).toBe(false);
  });
});

const monthViewState = vi.hoisted(() => ({ renders: 0 }));
const layoutProbe = vi.hoisted(() => ({ positionCalls: 0 }));

vi.mock('./components/calendar-month-view.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./components/calendar-month-view.js')>();
  const Counting = (props: any) => {
    monthViewState.renders += 1;
    return actual.CalendarMonthView(props);
  };
  return { ...actual, CalendarMonthView: Counting };
});

vi.mock('./hooks/use-calendar-virtualizer.js', () => ({
  useCalendarVirtualizer: () => ({
    scrollRef: { current: null },
    virtualItems: [
      { index: 0, start: 0, size: 48, key: 0 },
      { index: 1, start: 48, size: 48, key: 1 },
    ],
    totalSize: 96,
  }),
}));

vi.mock('./utils/calendar-layout-utils.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./utils/calendar-layout-utils.js')>();
  return {
    ...actual,
    positionEventsInMonth: (...args: Parameters<typeof actual.positionEventsInMonth>) => {
      layoutProbe.positionCalls += 1;
      return actual.positionEventsInMonth(...args);
    },
  };
});

vi.mock('@nop-chaos/flux-react', () => ({
  useRendererRuntime: () => ({ dispatch: vi.fn() }),
  useRenderScope: () => ({ id: 'mock-scope', path: '/mock', readVisible: () => ({}), readOwn: () => ({}), update: vi.fn(), merge: vi.fn(), replace: vi.fn(), dispose: vi.fn() }),
  useScopeSelector: () => undefined,
  useCurrentComponentRegistry: () => undefined,
}));

describe('calendar drag pointermove frame cost (plan 2026-09-29-1 Phase 2)', () => {
  function renderCalendar() {
    return render(React.createElement(Calendar, {
      id: 'cal-drag-frames',
      path: 'test',
      schema: { type: 'calendar' as const },
      templateNode: {} as any,
      node: {} as any,
      props: {
        events: [
          { id: 'e1', title: 'Shift', start: '2026-07-21T08:00:00', end: '2026-07-21T16:00:00', type: 'shift', resourceId: 'r1' },
        ],
        resources: [{ id: 'r1', title: 'Team A' }, { id: 'r2', title: 'Team B' }],
        date: '2026-07-20',
      } as any,
      meta: { visible: true, disabled: false } as any,
      regions: {} as any,
      events: {} as any,
      reactions: {} as any,
      helpers: {} as any,
    }));
  }

  function dispatchPointer(type: string, x = 0, y = 0) {
    act(() => {
      window.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1 }));
    });
  }

  it('same-cell pointermove does not re-render the month grid nor recompute layouts', async () => {
    const { container } = renderCalendar();
    const sourceEvent = container.querySelector('[data-slot="calendar-event"][data-event-id="e1"]') as HTMLElement;
    const sourceCell = container.querySelector('[data-slot="calendar-cell"][data-date="2026-07-21"][data-resource="r1"]') as HTMLElement;
    expect(sourceEvent).toBeTruthy();
    expect(sourceCell).toBeTruthy();

    const elementFromPoint = vi.spyOn(document, 'elementFromPoint').mockReturnValue(sourceCell);

    fireEvent.pointerDown(sourceEvent, { button: 0, pointerId: 1 });
    const ghost = container.querySelector('.nop-calendar-drag-ghost') as HTMLElement | null;
    expect(ghost).toBeTruthy();

    // baseline taken after drag start + first target acquisition (both are
    // legitimate single state transitions, not per-frame updates)
    dispatchPointer('pointermove', 10, 10);
    const rendersBefore = monthViewState.renders;
    const layoutCallsBefore = layoutProbe.positionCalls;

    for (let i = 0; i < 5; i++) {
      dispatchPointer('pointermove', 11 + i, 11 + i);
    }

    expect(monthViewState.renders).toBe(rendersBefore);
    expect(layoutProbe.positionCalls).toBe(layoutCallsBefore);

    // ghost positioned imperatively per frame (last move: 11 + 4)
    expect(ghost!.style.left).toBe('15px');
    expect(ghost!.style.top).toBe('15px');

    dispatchPointer('pointerup');
    elementFromPoint.mockRestore();
  });
});
