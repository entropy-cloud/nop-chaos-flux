import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCalendarDrag } from './use-calendar-drag.js';
import type { CalendarEvent } from '../../schemas.js';

/**
 * V12f Phase 3 — [G4-R2-视角10-01] calendar 键盘拖拽会话契约：
 * 1. 幽灵卡锚定在源事件位置（origin），不再固定渲染在视口左上角 (0,0)。
 * 2. 方向键移动已实时派发（live-dispatch，moveKeyboardDrag → onKeyboardMoveEvent），
 *    Enter 只终结会话——不得把已移动的事件按会话起点数据再次派发回原日期/原资源。
 */
describe('useCalendarDrag — keyboard session origin + finalize (G4-R2-视角10-01)', () => {
  function makeEvent(): CalendarEvent {
    return {
      id: 'e1',
      title: '早班',
      start: '2026-07-20T08:00:00',
      end: '2026-07-20T16:00:00',
      type: 'shift',
      resourceId: 'r1',
    };
  }

  it('startKeyboardDrag anchors the ghost at the given origin, not (0,0)', () => {
    const { result } = renderHook(() =>
      useCalendarDrag({ events: [], resources: [] }),
    );

    act(() => {
      result.current.startKeyboardDrag(makeEvent(), { x: 120, y: 80 });
    });

    expect(result.current.dragState.active).toBe(true);
    expect(result.current.dragState.currentX).toBe(120);
    expect(result.current.dragState.currentY).toBe(80);
    expect(result.current.dragState.startX).toBe(120);
    expect(result.current.dragState.startY).toBe(80);
  });

  it('confirmKeyboardDrop finalizes the session WITHOUT re-dispatching the move back to the origin cell', () => {
    const onEventChange = vi.fn();
    const { result } = renderHook(() =>
      useCalendarDrag({ events: [], resources: [], onEventChange }),
    );

    act(() => {
      result.current.startKeyboardDrag(makeEvent(), { x: 10, y: 10 });
    });
    act(() => {
      result.current.confirmKeyboardDrop();
    });

    // The stale re-dispatch would claim "move e1 back to 2026-07-20/r1"
    // even though keyboard moves were already dispatched live.
    expect(onEventChange).not.toHaveBeenCalled();
    expect(result.current.dragState.active).toBe(false);
  });

  it('cancelKeyboardDrag keeps terminating without dispatch', () => {
    const onEventChange = vi.fn();
    const { result } = renderHook(() =>
      useCalendarDrag({ events: [], resources: [], onEventChange }),
    );

    act(() => {
      result.current.startKeyboardDrag(makeEvent(), { x: 10, y: 10 });
    });
    act(() => {
      result.current.cancelKeyboardDrag();
    });

    expect(onEventChange).not.toHaveBeenCalled();
    expect(result.current.dragState.active).toBe(false);
  });
});
