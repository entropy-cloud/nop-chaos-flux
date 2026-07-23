import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { CalendarMonthView } from './calendar-month-view.js';

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

  it('should render events with real CalendarEventBlock', () => {
    const { container } = render(React.createElement(CalendarMonthView, baseProps));
    expect(container.textContent).toContain('Event 1');
  });

  it('should render resource rows', () => {
    const { container } = render(React.createElement(CalendarMonthView, baseProps));
    const rows = container.querySelectorAll('[data-slot="calendar-resource-row"]');
    expect(rows.length).toBeGreaterThan(0);
  });

  it('should render rows with default resource when resources is empty (parent handles empty state)', () => {
    const { container } = render(
      React.createElement(CalendarMonthView, { ...baseProps, resources: [] }),
    );
    const rows = container.querySelectorAll('[data-slot="calendar-resource-row"]');
    expect(rows.length).toBe(1);
    expect(rows[0]?.getAttribute('data-resource-id')).toBe('_default');
    expect(container.textContent).not.toContain('暂无排班数据');
  });

  it('should hide weekends when showWeekends is false', () => {
    const { container } = render(
      React.createElement(CalendarMonthView, { ...baseProps, showWeekends: false }),
    );
    const weekendCells = container.querySelectorAll('[data-weekend="true"]');
    expect(weekendCells.length).toBe(0);
  });

  it('should render locale-dependent weekday labels (German)', () => {
    const { container } = render(
      React.createElement(CalendarMonthView, { ...baseProps, locale: 'de-DE' }),
    );
    const weekdayHeaders = container.querySelectorAll('.calendar-weekday-header');
    const headerText = Array.from(weekdayHeaders).map((el) => el.textContent).join('|');
    expect(headerText).toMatch(/So|Mo|Di|Mi|Do|Fr|Sa/);
  });

  it('should render locale-dependent weekday labels (Japanese)', () => {
    const { container } = render(
      React.createElement(CalendarMonthView, { ...baseProps, locale: 'ja-JP' }),
    );
    const weekdayHeaders = container.querySelectorAll('.calendar-weekday-header');
    const headerText = Array.from(weekdayHeaders).map((el) => el.textContent).join(' ');
    expect(headerText).toMatch(/日\s+月\s+火\s+水\s+木\s+金\s+土/);
  });

  it('should set data-weekend="true" for weekend days and undefined for weekdays', () => {
    const july2026 = new Date('2026-07-01');
    const props = {
      ...baseProps,
      currentDate: july2026,
      dateRange: { start: new Date('2026-07-01'), end: new Date('2026-07-31') },
    };
    const { container } = render(React.createElement(CalendarMonthView, props));
    const allCells = container.querySelectorAll<HTMLElement>('[data-slot="calendar-cell"]');
    const weekendAttrValues = new Set<string>();
    allCells.forEach((cell) => {
      const val = cell.getAttribute('data-weekend');
      if (val !== null) weekendAttrValues.add(val);
    });
    expect(weekendAttrValues.has('true')).toBe(true);
    expect(weekendAttrValues.has('weekend')).toBe(false);
  });
});
