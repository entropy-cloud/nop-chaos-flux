import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { Calendar } from './calendar.js';
import type { CalendarEvent, CalendarResource } from '../schemas.js';

/**
 * V12f Phase 3 — [G4-R2-视角10-01] calendar 键盘拖拽全链路契约：
 * Space 武装会话 → 方向键实时派发移动 → Enter 只终结会话。修复前 Enter 会把
 * 已移动的事件按会话起点（原日期/原资源）再派发一次，宿主据此把事件弹回原位。
 */
vi.mock('@nop-chaos/flux-react', () => ({
  useRendererRuntime: () => ({ dispatch: vi.fn() }),
  useRenderScope: () => ({ id: 'mock-scope', path: '/mock', readVisible: () => ({}), readOwn: () => ({}), update: vi.fn(), merge: vi.fn(), replace: vi.fn(), dispose: vi.fn() }),
  useScopeSelector: () => undefined,
  useCurrentComponentRegistry: () => undefined,
}));

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
    virtualItems: [{ index: 0, start: 0, size: 48 }],
    totalSize: 48,
  }),
}));

vi.mock('./hooks/use-calendar-export.js', () => ({
  useCalendarExport: () => ({
    exportToPrint: vi.fn(),
    exportToPNG: vi.fn(),
  }),
}));

vi.mock('../shared/hooks/use-focus-trap.js', () => ({
  useFocusTrap: vi.fn(),
}));

const resources: CalendarResource[] = [
  { id: 'r1', title: 'Team A' },
  { id: 'r2', title: 'Team B' },
];

function makeEvent(): CalendarEvent {
  return {
    id: 'e1',
    title: 'Shift',
    start: '2026-07-21T08:00:00',
    end: '2026-07-21T16:00:00',
    type: 'shift',
    resourceId: 'r1',
  };
}

describe('Calendar keyboard drag session — Enter finalizes without stale re-dispatch (G4-R2-视角10-01)', () => {
  it('space → ArrowDown → Enter dispatches the move exactly once', () => {
    const onEventChange = vi.fn();
    const { container } = render(
      React.createElement(Calendar, {
        id: 'cal-kb-confirm',
        path: 'test',
        schema: { type: 'calendar' as const },
        templateNode: {} as any,
        node: {} as any,
        props: { events: [makeEvent()], resources } as any,
        meta: { visible: true, disabled: false } as any,
        regions: {} as any,
        events: { onEventChange } as any,
        reactions: {} as any,
        helpers: {} as any,
      }),
    );

    const eventEl = container.querySelector('[data-slot="calendar-event"]') as HTMLElement;
    expect(eventEl).toBeTruthy();
    fireEvent.keyDown(eventEl, { key: ' ' });
    fireEvent.keyDown(eventEl, { key: 'ArrowDown' });
    expect(onEventChange).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(eventEl, { key: 'Enter' });

    expect(onEventChange).toHaveBeenCalledTimes(1);
    expect(onEventChange).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: 'e1', fromResource: 'r1', toResource: 'r2' }),
      expect.anything(),
    );
  });

  it('space → Escape dispatches nothing and disarms the session', () => {
    const onEventChange = vi.fn();
    const { container } = render(
      React.createElement(Calendar, {
        id: 'cal-kb-cancel',
        path: 'test',
        schema: { type: 'calendar' as const },
        templateNode: {} as any,
        node: {} as any,
        props: { events: [makeEvent()], resources } as any,
        meta: { visible: true, disabled: false } as any,
        regions: {} as any,
        events: { onEventChange } as any,
        reactions: {} as any,
        helpers: {} as any,
      }),
    );

    const eventEl = container.querySelector('[data-slot="calendar-event"]') as HTMLElement;
    fireEvent.keyDown(eventEl, { key: ' ' });
    fireEvent.keyDown(eventEl, { key: 'Escape' });
    fireEvent.keyDown(eventEl, { key: 'ArrowDown' });

    expect(onEventChange).not.toHaveBeenCalled();
  });
});
