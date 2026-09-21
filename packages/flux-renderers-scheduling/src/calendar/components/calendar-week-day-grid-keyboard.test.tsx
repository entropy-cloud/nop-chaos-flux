import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { CalendarWeekView } from './calendar-week-view.js';
import { CalendarDayView } from './calendar-day-view.js';

/**
 * V12f Phase 1 — [G4-R3-视角9-01] calendar week/day 视图的 gridcell 有
 * tabIndex=0 但零 onKeyDown：键盘用户可以聚焦却无法在格子间移动。
 * 契约：方向键在格间移动焦点（week: 左右跨日、上下跨资源行；
 * day: 上下跨小时、左右跨资源行），与月视图 grid 键盘模型一致。
 */
function weekProps() {
  return {
    events: [],
    resources: [
      { id: 'r1', title: 'R1', text: '' },
      { id: 'r2', title: 'R2', text: '' },
    ],
    currentDate: new Date('2026-07-21'),
    firstDayOfWeek: 0 as const,
    showWeekends: true,
    maxConcurrent: 4,
    dayStartHour: 8,
    dayEndHour: 12,
    onEventClick: vi.fn(),
    onDragStart: vi.fn(),
    onEventKeyDown: vi.fn(),
    locale: 'en-US',
  };
}

describe('CalendarWeekView gridcell keyboard navigation (G4-R3-视角9-01)', () => {
  it('ArrowRight moves focus to the next day cell in the same resource row', () => {
    const { container } = render(React.createElement(CalendarWeekView, weekProps()));
    const cells = Array.from(
      container.querySelectorAll<HTMLElement>('[role="gridcell"][data-slot="calendar-cell"]'),
    );
    expect(cells.length).toBe(14); // 7 days x 2 resources

    const first = cells[0]!;
    first.focus();
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(cells[1]!);
  });

  it('ArrowDown moves focus to the same day in the next resource row', () => {
    const { container } = render(React.createElement(CalendarWeekView, weekProps()));
    const cells = Array.from(
      container.querySelectorAll<HTMLElement>('[role="gridcell"][data-slot="calendar-cell"]'),
    );

    const first = cells[0]!;
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(cells[7]!);
  });
});

describe('CalendarDayView gridcell keyboard navigation (G4-R3-视角9-01)', () => {
  it('ArrowDown moves focus to the next hour cell within the resource row', () => {
    const props = {
      events: [],
      resources: [
        { id: 'r1', title: 'R1', text: '' },
        { id: 'r2', title: 'R2', text: '' },
      ],
      currentDate: new Date('2026-07-21'),
      maxConcurrent: 4,
      dayStartHour: 8,
      dayEndHour: 11,
      onEventClick: vi.fn(),
      onDragStart: vi.fn(),
      onEventKeyDown: vi.fn(),
      locale: 'en-US',
    };
    const { container } = render(React.createElement(CalendarDayView, props));
    const cells = Array.from(
      container.querySelectorAll<HTMLElement>('[role="gridcell"][tabindex="0"]'),
    );
    expect(cells.length).toBe(6); // 3 hours x 2 resources

    const first = cells[0]!;
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(cells[1]!);
  });
});
