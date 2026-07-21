import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { Calendar } from './calendar.js';

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
    virtualItems: [],
    totalSize: 0,
  }),
}));

vi.mock('./hooks/use-calendar-drag.js', () => ({
  useCalendarDrag: () => ({
    dragState: { active: false, currentX: 0, currentY: 0, sourceEvent: null },
    startDrag: vi.fn(),
    moveKeyboardDrag: vi.fn(),
    cancelKeyboardDrag: vi.fn(),
    confirmKeyboardDrop: vi.fn(),
    startKeyboardDrag: vi.fn(),
  }),
}));

vi.mock('./hooks/use-calendar-drag-create.js', () => ({
  useCalendarDragCreate: () => ({
    dragCreateState: { active: false, startDate: null, startResource: null, currentDate: null, currentResource: null, currentX: 0, currentY: 0 },
    startCellDrag: vi.fn(),
    cancelCreate: vi.fn(),
    confirmCreate: vi.fn(),
    showTypeSelector: false,
    availableTypes: [],
    selectType: vi.fn(),
    dismissTypeSelector: vi.fn(),
  }),
}));

vi.mock('./hooks/use-calendar-ical.js', () => ({
  useCalendarICal: () => ({
    importFromICal: vi.fn(),
    exportToICal: vi.fn(),
    isAvailable: false,
  }),
}));

vi.mock('./hooks/use-calendar-export.js', () => ({
  useCalendarExport: () => ({
    exportToPrint: vi.fn(),
    exportToPNG: vi.fn(),
  }),
}));

vi.mock('./hooks/use-focus-trap.js', () => ({
  useFocusTrap: vi.fn(),
}));

describe('Calendar', () => {
  const baseProps = {
    id: 'cal-test',
    path: 'test',
    schema: { type: 'calendar' as const },
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
      <Calendar {...baseProps} meta={{ visible: false, disabled: false } as any} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('should render calendar container when visible', () => {
    const { container } = render(<Calendar {...baseProps} />);
    const calendarEl = container.querySelector('[data-slot]');
    expect(calendarEl).toBeTruthy();
  });

  it('should render with data-view attribute', () => {
    const { container } = render(<Calendar {...baseProps} />);
    const root = container.querySelector('[data-view]');
    expect(root).toBeTruthy();
  });

  it('should render with testid when provided', () => {
    const { container } = render(
      <Calendar {...baseProps} meta={{ visible: true, disabled: false, testid: 'my-calendar' } as any} />,
    );
    const el = container.querySelector('[data-testid="my-calendar"]');
    expect(el).toBeTruthy();
  });

  it('should call onMount and onUnmount events', () => {
    const onMount = vi.fn();
    const onUnmount = vi.fn();
    const { unmount } = render(
      <Calendar {...baseProps} events={{ onMount, onUnmount } as any} />,
    );
    unmount();
  });
});
