import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { CalendarDayView } from './calendar-day-view.js';

vi.mock('./calendar-event-block.js', () => ({
  CalendarEventBlock: () => React.createElement('div', { 'data-testid': 'calendar-event-block' }),
}));

describe('CalendarDayView', () => {
  const baseProps = {
    events: [],
    resources: [{ id: 'r1', title: 'Resource 1', text: '' }],
    currentDate: new Date('2026-07-21'),
    maxConcurrent: 4,
    dayStartHour: 8,
    dayEndHour: 20,
    onEventClick: vi.fn(),
    onDragStart: vi.fn(),
    onEventKeyDown: vi.fn(),
  };

  it('should render day view matrix', () => {
    const { container } = render(React.createElement(CalendarDayView, baseProps));
    expect(container.querySelector('[data-slot="calendar-matrix"]')).toBeTruthy();
  });

  it('should render date header', () => {
    const { container } = render(React.createElement(CalendarDayView, baseProps));
    const dateHeader = container.querySelector('[data-slot="calendar-cell"]');
    expect(dateHeader).toBeTruthy();
  });

  it('should render resource rows', () => {
    const { container } = render(React.createElement(CalendarDayView, baseProps));
    const rows = container.querySelectorAll('[data-slot="calendar-resource-row"]');
    expect(rows.length).toBe(1);
  });

  it('should render hour time slots', () => {
    const { container } = render(React.createElement(CalendarDayView, baseProps));
    const cells = container.querySelectorAll('[role="gridcell"]');
    expect(cells.length).toBeGreaterThan(0);
  });

  it('should render no-schedule message when no resources', () => {
    const { container } = render(
      React.createElement(CalendarDayView, { ...baseProps, resources: [] }),
    );
    expect(container.textContent).toContain('暂无排班数据');
  });

  it('should render hour labels', () => {
    const { container } = render(React.createElement(CalendarDayView, baseProps));
    const hourLabels = container.querySelectorAll('[role="rowheader"]');
    expect(hourLabels.length).toBeGreaterThan(0);
  });
});
