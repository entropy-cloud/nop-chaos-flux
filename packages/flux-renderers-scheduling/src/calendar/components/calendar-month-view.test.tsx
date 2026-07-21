import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { CalendarMonthView } from './calendar-month-view.js';

vi.mock('./calendar-event-block.js', () => ({
  CalendarEventBlock: ({ positionedEvent }: any) =>
    React.createElement('div', { 'data-testid': 'calendar-event-block' }, positionedEvent.event.title),
}));

describe('CalendarMonthView', () => {
  const baseProps = {
    events: [
      { id: 'e1', title: 'Event 1', start: '2026-07-21', end: '2026-07-21', type: 'shift', resourceId: 'r1' },
    ],
    resources: [{ id: 'r1', title: 'Resource 1', text: '' }],
    dateRange: { start: new Date('2026-07-01'), end: new Date('2026-07-31') },
    currentDate: new Date('2026-07-21'),
    firstDayOfWeek: 0 as const,
    showWeekends: true,
    maxConcurrent: 4,
    onEventClick: vi.fn(),
    onDragStart: vi.fn(),
    onCellDragStart: vi.fn(),
    showCrossDayLines: true,
    onEventKeyDown: vi.fn(),
  };

  it('should render calendar matrix', () => {
    const { container } = render(React.createElement(CalendarMonthView, baseProps));
    expect(container.querySelector('[data-slot="calendar-matrix"]')).toBeTruthy();
  });

  it('should render weekday headers', () => {
    const { container } = render(React.createElement(CalendarMonthView, baseProps));
    const cells = container.querySelectorAll('[data-slot="calendar-cell"]');
    expect(cells.length).toBeGreaterThan(0);
  });

  it('should render resource rows', () => {
    const { container } = render(React.createElement(CalendarMonthView, baseProps));
    const rows = container.querySelectorAll('[data-slot="calendar-resource-row"]');
    expect(rows.length).toBeGreaterThan(0);
  });

  it('should render no-schedule message when no resources', () => {
    const { container } = render(
      React.createElement(CalendarMonthView, { ...baseProps, resources: [] }),
    );
    expect(container.textContent).toContain('暂无排班数据');
  });

  it('should hide weekends when showWeekends is false', () => {
    const { container } = render(
      React.createElement(CalendarMonthView, { ...baseProps, showWeekends: false }),
    );
    const weekendCells = container.querySelectorAll('[data-weekend="weekend"]');
    expect(weekendCells.length).toBe(0);
  });
});
