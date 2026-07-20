import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCalendarDragCreate } from './use-calendar-drag-create.js';

function createPointerEvent(clientX: number, clientY: number): React.PointerEvent {
  return {
    clientX,
    clientY,
    button: 0,
    currentTarget: document.createElement('div'),
    target: document.createElement('div'),
    preventDefault: vi.fn(),
  } as unknown as React.PointerEvent;
}

describe('useCalendarDragCreate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start long-press after 500ms and show type selector on release', () => {
    const onEventCreate = vi.fn();
    const { result } = renderHook(() =>
      useCalendarDragCreate({
        onEventCreate,
        getCellFromPoint: () => ({ date: '2026-07-20', resourceId: 'r1' }),
        longPressMs: 500,
      }),
    );

    const pe = createPointerEvent(100, 200);

    act(() => {
      result.current.startCellDrag('2026-07-20', 'r1', pe);
    });

    expect(result.current.dragCreateState.active).toBe(false);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.dragCreateState.active).toBe(true);
    expect(result.current.dragCreateState.startDate).toBe('2026-07-20');

    act(() => {
      window.dispatchEvent(new PointerEvent('pointerup', { clientX: 100, clientY: 200 }));
    });

    expect(result.current.showTypeSelector).toBe(true);
  });

  it('should create event on selectType', () => {
    const onEventCreate = vi.fn();
    const { result } = renderHook(() =>
      useCalendarDragCreate({
        onEventCreate,
        getCellFromPoint: () => ({ date: '2026-07-20', resourceId: 'r1' }),
        longPressMs: 500,
      }),
    );

    const pe = createPointerEvent(100, 200);

    act(() => {
      result.current.startCellDrag('2026-07-20', 'r1', pe);
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    act(() => {
      window.dispatchEvent(new PointerEvent('pointerup', { clientX: 100, clientY: 200 }));
    });

    expect(result.current.showTypeSelector).toBe(true);

    act(() => {
      result.current.selectType('shift');
    });

    expect(onEventCreate).toHaveBeenCalledWith({
      title: 'shift',
      type: 'shift',
      start: '2026-07-20',
      end: '2026-07-20',
      resourceId: 'r1',
    });

    expect(result.current.showTypeSelector).toBe(false);
  });

  it('should cancel on cancelCreate', () => {
    const { result } = renderHook(() =>
      useCalendarDragCreate({ getCellFromPoint: () => null, longPressMs: 500 }),
    );

    const pe = createPointerEvent(100, 200);

    act(() => {
      result.current.startCellDrag('2026-07-20', 'r1', pe);
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.dragCreateState.active).toBe(true);

    act(() => {
      result.current.cancelCreate();
    });

    expect(result.current.dragCreateState.active).toBe(false);
    expect(result.current.showTypeSelector).toBe(false);
  });
});
