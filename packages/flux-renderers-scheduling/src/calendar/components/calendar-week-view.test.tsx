import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { CalendarWeekView } from './calendar-week-view.js';

describe('CalendarWeekView', () => {
  const baseProps = {
    events: [],
    resources: [{ id: 'r1', title: 'Resource 1', text: '' }],
    currentDate: new Date('2026-07-21'),
    firstDayOfWeek: 0 as const,
    showWeekends: true,
    maxConcurrent: 4,
    dayStartHour: 8,
    dayEndHour: 20,
    onEventClick: vi.fn(),
    onDragStart: vi.fn(),
    onEventKeyDown: vi.fn(),
  };

  it('should render week view matrix', () => {
    const { container } = render(React.createElement(CalendarWeekView, baseProps));
    expect(container.querySelector('[data-slot="calendar-matrix"]')).toBeTruthy();
  });

  it('should render events with real CalendarEventBlock when events provided', () => {
    const propsWithEvents = {
      ...baseProps,
      events: [
        { id: 'e1', title: 'Meeting', start: '2026-07-21T10:00:00', end: '2026-07-21T11:00:00', type: 'shift', resourceId: 'r1' },
      ],
    };
    const { container } = render(React.createElement(CalendarWeekView, propsWithEvents));
    expect(container.textContent).toContain('Meeting');
  });

  it('should render time slots', () => {
    const { container } = render(React.createElement(CalendarWeekView, baseProps));
    const cells = container.querySelectorAll('[data-slot="calendar-cell"]');
    expect(cells.length).toBeGreaterThan(0);
  });

  it('should render resource rows', () => {
    const { container } = render(React.createElement(CalendarWeekView, baseProps));
    const rows = container.querySelectorAll('[data-slot="calendar-resource-row"]');
    expect(rows.length).toBe(1);
  });

  it('should render no-schedule message when no resources', () => {
    const { container } = render(
      React.createElement(CalendarWeekView, { ...baseProps, resources: [] }),
    );
    expect(container.textContent).toContain('暂无排班数据');
  });

  it('should render day headers with dates', () => {
    const { container } = render(React.createElement(CalendarWeekView, baseProps));
    const dayHeaders = container.querySelectorAll('[role="columnheader"]');
    expect(dayHeaders.length).toBeGreaterThan(0);
  });
});
