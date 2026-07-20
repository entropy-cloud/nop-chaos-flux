import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCalendarDrag } from './use-calendar-drag.js';
import type { CalendarEvent } from '../../schemas.js';

function makeEvent(overrides: Partial<CalendarEvent> & { id: string; title: string }): CalendarEvent {
  return { start: '2026-07-20', end: '2026-07-20', type: 'shift', status: 'scheduled', ...overrides };
}

function createPointerEvent(clientX: number, clientY: number, pointerId = 1): React.PointerEvent {
  return {
    clientX,
    clientY,
    pointerId,
    button: 0,
    currentTarget: document.createElement('div'),
    target: document.createElement('div'),
    preventDefault: vi.fn(),
  } as unknown as React.PointerEvent;
}

describe('useCalendarDrag', () => {
  it('should start drag on pointer down', () => {
    const onEventChange = vi.fn();
    const { result } = renderHook(() =>
      useCalendarDrag({
        events: [],
        resources: [],
        onEventChange,
        getCellFromPoint: () => null,
      }),
    );

    const event = makeEvent({ id: 'e1', title: '早班', resourceId: 'r1' });
    const pe = createPointerEvent(100, 200);

    act(() => {
      result.current.startDrag(event, pe);
    });

    expect(result.current.dragState.active).toBe(true);
    expect(result.current.dragState.sourceEvent?.id).toBe('e1');
  });

  it('should detect target cell on move and fire onEventChange on drop', () => {
    const onEventChange = vi.fn();
    const getCellFromPoint = vi.fn().mockReturnValue({ date: '2026-07-21', resourceId: 'r2' });

    const { result } = renderHook(() =>
      useCalendarDrag({
        events: [],
        resources: [],
        onEventChange,
        getCellFromPoint,
      }),
    );

    const event = makeEvent({ id: 'e1', title: '早班', resourceId: 'r1', start: '2026-07-20', end: '2026-07-20' });
    const pe = createPointerEvent(100, 200);

    act(() => {
      result.current.startDrag(event, pe);
    });

    expect(result.current.dragState.active).toBe(true);

    act(() => {
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: 300, clientY: 400 }));
    });

    expect(getCellFromPoint).toHaveBeenCalledWith(300, 400);
    expect(result.current.dragState.targetDate).toBe('2026-07-21');
    expect(result.current.dragState.targetResource).toBe('r2');

    act(() => {
      window.dispatchEvent(new PointerEvent('pointerup', { clientX: 300, clientY: 400 }));
    });

    expect(onEventChange).toHaveBeenCalledWith({
      eventId: 'e1',
      fromResource: 'r1',
      toResource: 'r2',
      fromDate: '2026-07-20',
      toDate: '2026-07-21',
      event: expect.objectContaining({ id: 'e1' }),
    });

    expect(result.current.dragState.active).toBe(false);
  });

  it('should cancel drag on cancelDrag call', () => {
    const { result } = renderHook(() =>
      useCalendarDrag({ events: [], resources: [], getCellFromPoint: () => null }),
    );

    const event = makeEvent({ id: 'e1', title: '早班' });
    const pe = createPointerEvent(100, 200);

    act(() => {
      result.current.startDrag(event, pe);
    });

    expect(result.current.dragState.active).toBe(true);

    act(() => {
      result.current.cancelDrag();
    });

    expect(result.current.dragState.active).toBe(false);
  });
});
