import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { CalendarWeekView } from './calendar-week-view.js';
import { CalendarDayView } from './calendar-day-view.js';

/**
 * V12f Phase 3 — [G4-R3-视角11-02] calendar 拖拽创建能力三视图一致：周/日
 * 视图的空格子必须有创建入口（长按 pointer 路径 onCellDragStart + 键盘
 * Enter/Space 路径 onCellKeyboardCreate），不得只在月视图可用。
 * 修复前周/日视图长按/键盘空格子零反应。
 */
describe('CalendarWeekView — empty-cell create entry (G4-R3-视角11-02)', () => {
  const baseProps = {
    events: [],
    resources: [{ id: 'r1', title: 'Team A', text: '' }],
    currentDate: new Date('2026-07-21'),
    firstDayOfWeek: 0 as const,
    showWeekends: true,
    maxConcurrent: 4,
    dayStartHour: 8,
    dayEndHour: 20,
    onCellDragStart: vi.fn(),
    onCellKeyboardCreate: vi.fn(),
  };

  it('pointerdown on an empty cell routes to the long-press create path', () => {
    const { container } = render(React.createElement(CalendarWeekView, baseProps));
    const cell = container.querySelector('[role="gridcell"][data-slot="calendar-cell"][data-resource="r1"]') as HTMLElement;
    expect(cell).toBeTruthy();
    const dateStr = cell.getAttribute('data-date')!;

    fireEvent.pointerDown(cell, { button: 0, clientX: 10, clientY: 10 });

    expect(baseProps.onCellDragStart).toHaveBeenCalledWith(dateStr, 'r1', expect.anything());
  });

  it('Enter on an empty cell routes to the direct keyboard-create path', () => {
    const { container } = render(React.createElement(CalendarWeekView, baseProps));
    const cell = container.querySelector('[role="gridcell"][data-slot="calendar-cell"][data-resource="r1"]') as HTMLElement;
    const dateStr = cell.getAttribute('data-date')!;

    fireEvent.keyDown(cell, { key: 'Enter' });

    expect(baseProps.onCellKeyboardCreate).toHaveBeenCalledWith(dateStr, 'r1');
    expect(baseProps.onCellDragStart).not.toHaveBeenCalled();
  });

  it('right-button pointerdown does not start a create session', () => {
    const { container } = render(React.createElement(CalendarWeekView, baseProps));
    const cell = container.querySelector('[role="gridcell"][data-slot="calendar-cell"][data-resource="r1"]') as HTMLElement;

    fireEvent.pointerDown(cell, { button: 2, clientX: 10, clientY: 10 });

    expect(baseProps.onCellDragStart).not.toHaveBeenCalled();
  });
});

describe('CalendarDayView — empty-cell create entry (G4-R3-视角11-02)', () => {
  const baseProps = {
    events: [],
    resources: [{ id: 'r1', title: 'Team A', text: '' }],
    currentDate: new Date('2026-07-21'),
    maxConcurrent: 4,
    dayStartHour: 8,
    dayEndHour: 20,
    onCellDragStart: vi.fn(),
    onCellKeyboardCreate: vi.fn(),
  };

  it('pointerdown on an hour cell routes to the long-press create path', () => {
    const { container } = render(React.createElement(CalendarDayView, baseProps));
    const cell = container.querySelector('[role="gridcell"][data-resource="r1"]') as HTMLElement;
    expect(cell).toBeTruthy();

    fireEvent.pointerDown(cell, { button: 0, clientX: 10, clientY: 10 });

    expect(baseProps.onCellDragStart).toHaveBeenCalledWith('2026-07-21', 'r1', expect.anything());
  });

  it('Enter on an hour cell routes to the direct keyboard-create path', () => {
    const { container } = render(React.createElement(CalendarDayView, baseProps));
    const cell = container.querySelector('[role="gridcell"][data-resource="r1"]') as HTMLElement;

    fireEvent.keyDown(cell, { key: 'Enter' });

    expect(baseProps.onCellKeyboardCreate).toHaveBeenCalledWith('2026-07-21', 'r1');
    expect(baseProps.onCellDragStart).not.toHaveBeenCalled();
  });
});
