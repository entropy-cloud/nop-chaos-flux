import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { CalendarMonthView } from './calendar-month-view.js';
import { CalendarWeekView } from './calendar-week-view.js';
import { CalendarDayView } from './calendar-day-view.js';

/**
 * WA-scheduling-001 (plan 568): the three calendar views each hand-rolled a
 * roving-focus walker over their grid cells (b73f24ab7 landed month+week in
 * one commit, day evolved separately). This suite pins the per-view stride
 * semantics BEFORE the shared `moveGridFocus` extraction so the refactor is
 * provably behavior-preserving:
 *   - month: Left/Right walk days (+/-1), Up/Down walk week rows (+/-7),
 *     clamped at both ends; selector excludes [data-empty] placeholders.
 *   - week: Left/Right walk days, Up/Down walk resource rows (+/-days-in-
 *     view); selector matches role+slot.
 *   - day: Up/Down walk hours (+/-1), Left/Right walk resource rows
 *     (+/-totalHours); selector matches any gridcell (hour cells carry no
 *     data-slot).
 */
function monthProps() {
  return {
    events: [],
    resources: [
      { id: 'r1', title: 'R1', text: '' },
      { id: 'r2', title: 'R2', text: '' },
    ],
    dateRange: { start: new Date('2026-07-01'), end: new Date('2026-07-31') },
    currentDate: new Date('2026-07-21'),
    firstDayOfWeek: 0 as const,
    showWeekends: true,
    maxConcurrent: 4,
    onEventClick: vi.fn(),
    onDragStart: vi.fn(),
    onCellDragStart: vi.fn(),
    onCellKeyboardCreate: vi.fn(),
    onEventKeyDown: vi.fn(),
  };
}

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

function dayProps() {
  return {
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
}

describe('CalendarMonthView roving focus (WA-scheduling-001 pin)', () => {
  it('ArrowRight moves to the next day cell in the same resource row', () => {
    const { container } = render(React.createElement(CalendarMonthView, monthProps()));
    const cells = Array.from(
      container.querySelectorAll<HTMLElement>('[data-slot="calendar-cell"]:not([data-empty])'),
    );
    expect(cells.length).toBeGreaterThan(31); // ~31 days x 2 resources, minus empties
    cells[0]!.focus();
    fireEvent.keyDown(cells[0]!, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(cells[1]!);
  });

  it('ArrowDown moves one week row down (stride = 7)', () => {
    const { container } = render(React.createElement(CalendarMonthView, monthProps()));
    const cells = Array.from(
      container.querySelectorAll<HTMLElement>('[data-slot="calendar-cell"]:not([data-empty])'),
    );
    cells[0]!.focus();
    fireEvent.keyDown(cells[0]!, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(cells[7]!);
  });

  it('ArrowLeft clamps at the first cell', () => {
    const { container } = render(React.createElement(CalendarMonthView, monthProps()));
    const cells = Array.from(
      container.querySelectorAll<HTMLElement>('[data-slot="calendar-cell"]:not([data-empty])'),
    );
    cells[0]!.focus();
    fireEvent.keyDown(cells[0]!, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(cells[0]!);
  });

  it('ArrowUp clamps to the first cell (stride walk to index 0)', () => {
    const { container } = render(React.createElement(CalendarMonthView, monthProps()));
    const cells = Array.from(
      container.querySelectorAll<HTMLElement>('[data-slot="calendar-cell"]:not([data-empty])'),
    );
    cells[2]!.focus();
    fireEvent.keyDown(cells[2]!, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(cells[0]!);
  });
});

describe('CalendarWeekView roving focus clamps (WA-scheduling-001 pin)', () => {
  it('ArrowLeft clamps at the first cell', () => {
    const { container } = render(React.createElement(CalendarWeekView, weekProps()));
    const cells = Array.from(
      container.querySelectorAll<HTMLElement>('[role="gridcell"][data-slot="calendar-cell"]'),
    );
    cells[0]!.focus();
    fireEvent.keyDown(cells[0]!, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(cells[0]!);
  });

  it('ArrowUp clamps to the first row (stride walk to index 0)', () => {
    const { container } = render(React.createElement(CalendarWeekView, weekProps()));
    const cells = Array.from(
      container.querySelectorAll<HTMLElement>('[role="gridcell"][data-slot="calendar-cell"]'),
    );
    cells[1]!.focus();
    fireEvent.keyDown(cells[1]!, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(cells[0]!);
  });
});

describe('CalendarDayView roving focus strides (WA-scheduling-001 pin)', () => {
  it('ArrowRight moves one resource column right (stride = totalHours)', () => {
    const { container } = render(React.createElement(CalendarDayView, dayProps()));
    const cells = Array.from(container.querySelectorAll<HTMLElement>('[role="gridcell"]'));
    // 2 resources x 3 hours (08..10) = 6 cells; per-row layout stride is 3.
    expect(cells.length).toBe(6);
    cells[0]!.focus();
    fireEvent.keyDown(cells[0]!, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(cells[3]!);
  });

  it('ArrowUp clamps at the first hour', () => {
    const { container } = render(React.createElement(CalendarDayView, dayProps()));
    const cells = Array.from(container.querySelectorAll<HTMLElement>('[role="gridcell"]'));
    cells[1]!.focus();
    fireEvent.keyDown(cells[1]!, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(cells[0]!);
  });
});
