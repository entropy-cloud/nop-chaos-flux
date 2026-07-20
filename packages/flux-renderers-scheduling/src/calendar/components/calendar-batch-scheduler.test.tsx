import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { CalendarBatchScheduler } from './calendar-batch-scheduler.js';

describe('CalendarBatchScheduler', () => {
  const resources = [
    { id: 'r1', text: '张三' },
    { id: 'r2', text: '李四' },
  ];

  const shiftTypes = [
    { type: 'shift', label: '早班', color: '#4ade80' },
    { type: 'leave', label: '休假', color: '#f87171' },
  ];

  it('should render when open', () => {
    const onBatchSchedule = vi.fn();
    const onClose = vi.fn();

    const { getByText } = render(
      <CalendarBatchScheduler
        resources={resources}
        events={[]}
        shiftTypes={shiftTypes}
        open={true}
        onClose={onClose}
        onBatchSchedule={onBatchSchedule}
      />,
    );

    expect(getByText('批量排班')).toBeTruthy();
  });

  it('should not render when closed', () => {
    const onBatchSchedule = vi.fn();
    const onClose = vi.fn();

    const { container } = render(
      <CalendarBatchScheduler
        resources={resources}
        events={[]}
        shiftTypes={shiftTypes}
        open={false}
        onClose={onClose}
        onBatchSchedule={onBatchSchedule}
      />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('should show resource list with checkboxes', () => {
    const onBatchSchedule = vi.fn();
    const onClose = vi.fn();

    const { getAllByText } = render(
      <CalendarBatchScheduler
        resources={resources}
        events={[]}
        shiftTypes={shiftTypes}
        open={true}
        onClose={onClose}
        onBatchSchedule={onBatchSchedule}
      />,
    );

    const zhangSanList = getAllByText('张三');
    expect(zhangSanList.length).toBeGreaterThanOrEqual(1);
    const liSiList = getAllByText('李四');
    expect(liSiList.length).toBeGreaterThanOrEqual(1);
  });

  it('should call onBatchSchedule with correct payload on confirm', () => {
    const onBatchSchedule = vi.fn();
    const onClose = vi.fn();

    const { container } = render(
      <CalendarBatchScheduler
        resources={resources}
        events={[]}
        shiftTypes={shiftTypes}
        open={true}
        onClose={onClose}
        onBatchSchedule={onBatchSchedule}
      />,
    );

    const dateInputs = container.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: '2026-07-20' } });
    fireEvent.change(dateInputs[1], { target: { value: '2026-07-21' } });

    const r1Checkbox = container.querySelectorAll('input[type="checkbox"]');
    fireEvent.click(r1Checkbox[1]);

    const shiftRadio = container.querySelectorAll('input[type="radio"]');
    fireEvent.click(shiftRadio[0]);

    const confirmBtn = container.querySelector('button:last-child');
    expect(confirmBtn).toBeTruthy();
    if (confirmBtn) fireEvent.click(confirmBtn);

    expect(onBatchSchedule).toHaveBeenCalledWith({
      resources: ['r1'],
      dateRange: { start: '2026-07-20', end: '2026-07-21' },
      shiftType: 'shift',
    });

    expect(onClose).toHaveBeenCalled();
  });
});
