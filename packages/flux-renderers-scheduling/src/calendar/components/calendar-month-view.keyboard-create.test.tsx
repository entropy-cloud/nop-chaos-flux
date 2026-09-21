import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { CalendarMonthView } from './calendar-month-view.js';

/**
 * V12f Phase 1 — [G4-R3-视角10-02] 月视图格子上 Enter/Space 的分流契约：
 * 键盘创建走 onCellKeyboardCreate（直接完成），不再伪装 pointer 事件走进
 * onCellDragStart 的 500ms 长按定时器路径。
 */
describe('CalendarMonthView — keyboard drag-create routing (G4-R3-视角10-02)', () => {
  const baseProps = {
    events: [],
    resources: [{ id: 'r1', title: 'Resource 1', text: '' }],
    dateRange: { start: new Date('2026-07-01'), end: new Date('2026-07-31') },
    currentDate: new Date('2026-07-21'),
    firstDayOfWeek: 0 as const,
    showWeekends: true,
    maxConcurrent: 4,
    onEventClick: vi.fn(),
    onDragStart: vi.fn(),
    onCellDragStart: vi.fn(),
    onCellKeyboardCreate: vi.fn(),
    showCrossDayLines: true,
    onEventKeyDown: vi.fn(),
  };

  it('Enter on a cell routes to the direct keyboard-create path, not the long-press path', () => {
    const { container } = render(React.createElement(CalendarMonthView, baseProps));
    const cell = container.querySelector<HTMLElement>(
      '[role="gridcell"][data-slot="calendar-cell"][data-resource="r1"]',
    )!;
    expect(cell).toBeTruthy();

    fireEvent.keyDown(cell, { key: 'Enter' });

    expect(baseProps.onCellKeyboardCreate).toHaveBeenCalledWith('2026-07-01', 'r1');
    expect(baseProps.onCellDragStart).not.toHaveBeenCalled();
  });

  it('Space on a cell routes to the direct keyboard-create path too', () => {
    const { container } = render(React.createElement(CalendarMonthView, baseProps));
    const cell = container.querySelector<HTMLElement>(
      '[role="gridcell"][data-slot="calendar-cell"][data-resource="r1"]',
    )!;

    fireEvent.keyDown(cell, { key: ' ' });

    expect(baseProps.onCellKeyboardCreate).toHaveBeenCalled();
    expect(baseProps.onCellDragStart).not.toHaveBeenCalled();
  });

  it('pointerdown keeps using the long-press onCellDragStart path', () => {
    const { container } = render(React.createElement(CalendarMonthView, baseProps));
    const cell = container.querySelector<HTMLElement>(
      '[role="gridcell"][data-slot="calendar-cell"][data-resource="r1"]',
    )!;

    fireEvent.pointerDown(cell, { button: 0, clientX: 10, clientY: 10 });

    expect(baseProps.onCellDragStart).toHaveBeenCalledTimes(1);
    expect(baseProps.onCellKeyboardCreate).not.toHaveBeenCalled();
  });
});
