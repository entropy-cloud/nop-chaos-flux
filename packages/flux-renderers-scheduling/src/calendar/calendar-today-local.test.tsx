import { afterAll, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { Calendar } from './calendar.js';

declare const process: {
  env: Record<string, string | undefined>;
};

// plan 836 E1: the calendar date model is UTC-midnight dates, but "today" was
// constructed from the raw local instant — in UTC+ timezones (local midnight
// → offset hours) that instant resolves to the previous UTC day, so the month
// grid / data-today / scope writeback showed yesterday. The fix normalizes
// "today" to UTC-midnight of the LOCAL calendar day. This test pins the worker
// to Asia/Shanghai and freezes the clock at CST 2026-11-01 02:00 (= UTC
// 10-31 18:00): the old construction renders an October grid with data-today
// on "31"; the fixed one renders November with data-today on "1".

process.env.TZ = 'Asia/Shanghai';

vi.mock('@nop-chaos/flux-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useRendererRuntime: () => ({ dispatch: vi.fn() }),
  useRenderScope: () => ({ id: 'mock-scope', path: '/mock', readVisible: () => ({}), readOwn: () => ({}), update: vi.fn(), merge: vi.fn(), replace: vi.fn(), dispose: vi.fn() }),
  useScopeSelector: () => undefined,
  useOwnershipScopeValue: () => undefined,
  useCurrentComponentRegistry: () => undefined,
}));

vi.mock('./hooks/use-calendar-virtualizer.js', () => ({
  useCalendarVirtualizer: () => ({
    scrollRef: { current: null },
    virtualItems: [0, 1, 2, 3, 4, 5].map((index) => ({ index, start: index * 48, size: 48 })),
    totalSize: 288,
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

const origTz = process.env.TZ;
afterAll(() => {
  process.env.TZ = origTz;
});

describe('calendar "today" resolves to the local calendar day (plan 836 E1)', () => {
  it('renders November with data-today on the 1st at CST 2026-11-01 02:00', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-01T02:00:00+08:00'));
    // Worker-TZ precondition: the pinned zone must be in effect for Date
    // formatting inside the component tree.
    expect(new Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('Asia/Shanghai');

    try {
      render(
        React.createElement(Calendar, {
          id: 'cal-today-local',
          path: 'test',
          schema: { type: 'calendar' as const },
          templateNode: {} as never,
          node: {} as never,
          props: { events: [], resources: [{ id: 'r1', title: 'Team A' }] } as never,
          meta: { visible: true, disabled: false } as never,
          regions: {} as never,
          events: {} as never,
          reactions: {} as never,
          helpers: {} as never,
        }),
      );

      const todayCell = document.querySelector('[data-today="true"]');
      expect(todayCell).toBeTruthy();
      // The old construction resolved CST 2026-11-01 02:00 to UTC 10-31, so
      // this assertion is the discriminator: fixed impl lands on Nov 1.
      expect(todayCell?.getAttribute('data-date')).toBe('2026-11-01');
      expect(todayCell?.getAttribute('aria-current')).toBe('date');
    } finally {
      vi.useRealTimers();
    }
  });
});
