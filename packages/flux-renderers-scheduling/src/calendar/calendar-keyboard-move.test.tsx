import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { Calendar } from './calendar.js';
import type { CalendarEvent, CalendarResource } from '../schemas.js';

vi.mock('@nop-chaos/flux-react', () => ({
  useRendererRuntime: () => ({ dispatch: vi.fn() }),
  useRenderScope: () => ({ id: 'mock-scope', path: '/mock', readVisible: () => ({}), readOwn: () => ({}), update: vi.fn(), merge: vi.fn(), replace: vi.fn(), dispose: vi.fn() }),
  useScopeSelector: () => undefined,
  useCurrentComponentRegistry: () => undefined,
}));

// The REAL useCalendarDrag drives the keyboard move (this is the unit under
// test); the surrounding view/state hooks are pinned to a fixed July window.
vi.mock('./hooks/use-calendar-state.js', () => ({
  useCalendarState: () => ({
    currentDate: new Date('2026-07-21'),
    activeView: 'month' as const,
    dateRange: { start: new Date('2026-07-01'), end: new Date('2026-07-31') },
    setCurrentDate: vi.fn(),
    setActiveView: vi.fn(),
  }),
}));

vi.mock('./hooks/use-calendar-navigation.js', () => ({
  useCalendarNavigation: () => ({
    goNext: vi.fn(),
    goPrev: vi.fn(),
    goToday: vi.fn(),
    goToDate: vi.fn(),
  }),
}));

vi.mock('./hooks/use-calendar-virtualizer.js', () => ({
  useCalendarVirtualizer: () => ({
    scrollRef: { current: null },
    virtualItems: [
      { index: 0, start: 0, size: 48 },
      { index: 1, start: 48, size: 48 },
      { index: 2, start: 96, size: 48 },
    ],
    totalSize: 144,
  }),
}));

vi.mock('./hooks/use-calendar-export.js', () => ({
  useCalendarExport: () => ({
    exportToPrint: vi.fn(),
    exportToPNG: vi.fn(),
  }),
}));

vi.mock('./hooks/use-calendar-drag-create.js', () => ({
  useCalendarDragCreate: () => ({
    dragCreateState: { active: false, startDate: null, startResource: null, currentDate: null, currentResource: null, currentX: 0, currentY: 0 },
    startCellDrag: vi.fn(),
    cancelCreate: vi.fn(),
    confirmCreate: vi.fn(),
    showTypeSelector: false,
    selectType: vi.fn(),
    dismissTypeSelector: vi.fn(),
  }),
}));

vi.mock('../shared/hooks/use-focus-trap.js', () => ({
  useFocusTrap: vi.fn(),
}));

// 2-15 root cause: `handleKeyboardMoveEvent` searches the RAW resourcesData
// (nested groups) while events live on FLATTENED child resources — a child id
// like 'a' is NOT found (findIndex → -1) even though its row renders.
const nestedResources: CalendarResource[] = [
  {
    id: 'team',
    title: 'Team',
    resources: [
      { id: 'a', title: 'A' },
      { id: 'b', title: 'B' },
    ],
  },
];

const flatResources: CalendarResource[] = [
  { id: 'r1', title: 'Team A' },
  { id: 'r2', title: 'Team B' },
];

function makeEvent(resourceId: string): CalendarEvent {
  return {
    id: 'e1',
    title: 'Shift',
    start: '2026-07-21T08:00:00',
    end: '2026-07-21T16:00:00',
    type: 'shift',
    resourceId,
  };
}

function renderCalendar(event: CalendarEvent, resources: CalendarResource[], onEventChange: ReturnType<typeof vi.fn>) {
  return render(
    React.createElement(Calendar, {
      id: 'cal-keyboard-move',
      path: 'test',
      schema: { type: 'calendar' as const },
      templateNode: {} as any,
      node: {} as any,
      props: { events: [event], resources } as any,
      meta: { visible: true, disabled: false } as any,
      regions: {} as any,
      events: { onEventChange } as any,
      reactions: {} as any,
      helpers: {} as any,
    }),
  );
}

function startKeyboardDragAndMove(container: HTMLElement, key: 'ArrowDown' | 'ArrowUp') {
  const eventEl = container.querySelector('[data-slot="calendar-event"]') as HTMLElement;
  expect(eventEl).toBeTruthy();
  fireEvent.keyDown(eventEl, { key: ' ' });
  fireEvent.keyDown(eventEl, { key });
}

describe('Calendar keyboard move — 2-15 unknown resourceId fail-closed guard', () => {
  it('moves a known-resource event down to the next resource', () => {
    const onEventChange = vi.fn();
    const { container } = renderCalendar(makeEvent('r1'), flatResources, onEventChange);

    startKeyboardDragAndMove(container, 'ArrowDown');

    expect(onEventChange).toHaveBeenCalledTimes(1);
    expect(onEventChange).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: 'e1', fromResource: 'r1', toResource: 'r2' }),
      expect.objectContaining({ evaluationBindings: expect.objectContaining({ eventId: 'e1' }) }),
    );
  });

  it('moves a known-resource event up to the previous resource', () => {
    const onEventChange = vi.fn();
    const { container } = renderCalendar(makeEvent('r2'), flatResources, onEventChange);

    startKeyboardDragAndMove(container, 'ArrowUp');

    expect(onEventChange).toHaveBeenCalledTimes(1);
    expect(onEventChange).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: 'e1', fromResource: 'r2', toResource: 'r1' }),
      expect.anything(),
    );
  });

  it('does NOT move when the resourceId is unknown in raw resourcesData (nested group child — fail closed, no silent landing on resources[0])', () => {
    const onEventChange = vi.fn();
    // The event's resourceId 'a' renders on the flattened child row, but
    // findIndex over the RAW nested resourcesData is -1. The old code computed
    // targetIdx = -1 + 1 = 0 and silently moved the event onto the 'team'
    // group resource.
    const { container } = renderCalendar(makeEvent('a'), nestedResources, onEventChange);

    startKeyboardDragAndMove(container, 'ArrowDown');

    expect(onEventChange).not.toHaveBeenCalled();
  });
});
