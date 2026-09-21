import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { CalendarMonthView } from './calendar-month-view.js';
import type { CalendarEvent } from '../../schemas.js';

/**
 * V12f Phase 3 — [G4-视角11-01] 月视图溢出指示「+N 更多」契约：呈可点击样式
 * 就必须有点击行为——点击展开该格子的隐藏事件（可达），再次点击收起。
 * 修复前是带 cursor-pointer 的 div，被隐藏的事件永远不可达。
 */
describe('CalendarMonthView — +N more expands hidden events (G4-视角11-01)', () => {
  function makeEvent(id: string, title: string): CalendarEvent {
    return {
      id,
      title,
      start: '2026-07-15T08:00:00',
      end: '2026-07-15T16:00:00',
      type: 'shift',
      resourceId: 'r1',
    };
  }

  const baseProps = {
    events: [makeEvent('e1', 'Alpha'), makeEvent('e2', 'Beta')],
    resources: [{ id: 'r1', title: 'Resource 1', text: '' }],
    dateRange: { start: new Date('2026-07-01'), end: new Date('2026-07-31') },
    currentDate: new Date('2026-07-21'),
    firstDayOfWeek: 0 as const,
    showWeekends: true,
    maxConcurrent: 1,
    onEventClick: vi.fn(),
    onDragStart: vi.fn(),
    onCellDragStart: vi.fn(),
    onCellKeyboardCreate: vi.fn(),
    showCrossDayLines: true,
    onEventKeyDown: vi.fn(),
  };

  it('renders the overflow indicator as a real button (red: styled div before fix)', () => {
    const { container } = render(React.createElement(CalendarMonthView, baseProps));
    const overflow = container.querySelector('[data-slot="calendar-event-overflow"]') as HTMLElement;
    expect(overflow).toBeTruthy();
    expect(overflow.tagName).toBe('BUTTON');
    expect(overflow.getAttribute('aria-expanded')).toBe('false');
  });

  it('clicking +N more reveals the hidden event inside the cell', () => {
    const { container } = render(React.createElement(CalendarMonthView, baseProps));
    expect(container.textContent).not.toContain('Beta');

    fireEvent.click(container.querySelector('[data-slot="calendar-event-overflow"]')!);

    const expanded = container.querySelector('[data-slot="calendar-cell-expanded"]')!;
    expect(expanded).toBeTruthy();
    expect(expanded.textContent).toContain('Alpha');
    expect(expanded.textContent).toContain('Beta');
    expect(container.querySelector('[data-slot="calendar-event-overflow"]')!.getAttribute('aria-expanded')).toBe('true');
  });

  it('clicking the expanded cell indicator collapses back to the capped view', () => {
    const { container } = render(React.createElement(CalendarMonthView, baseProps));
    fireEvent.click(container.querySelector('[data-slot="calendar-event-overflow"]')!);
    expect(container.querySelector('[data-slot="calendar-cell-expanded"]')).toBeTruthy();

    fireEvent.click(container.querySelector('[data-slot="calendar-event-overflow"]')!);

    expect(container.querySelector('[data-slot="calendar-cell-expanded"]')).toBeNull();
    expect(container.textContent).not.toContain('Beta');
  });

  it('clicking a hidden event in the expanded cell dispatches onEventClick', () => {
    const { container } = render(React.createElement(CalendarMonthView, baseProps));
    fireEvent.click(container.querySelector('[data-slot="calendar-event-overflow"]')!);

    const hidden = Array.from(
      container.querySelectorAll('[data-slot="calendar-cell-expanded-event"]'),
    ).find((el) => el.textContent === 'Beta') as HTMLElement;
    expect(hidden).toBeTruthy();
    fireEvent.click(hidden);

    expect(baseProps.onEventClick).toHaveBeenCalledWith(
      expect.objectContaining({ event: expect.objectContaining({ id: 'e2' }), date: '2026-07-15' }),
    );
  });
});
