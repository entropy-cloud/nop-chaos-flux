import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCalendarDragCreate } from './use-calendar-drag-create.js';

/**
 * V12f Phase 1 — [G4-R3-视角10-02] calendar 月视图 Enter/Space 键盘拖拽创建
 * 不得路由进 500ms 长按定时器：键盘路径没有 pointerup 来「释放」，长按会话
 * 只会被武装（armed）而永远无法到达类型选择器。契约：键盘创建入口立即
 * （同帧、无定时器）进入 active + 类型选择器态，confirmCreate 直接落成事件。
 */
describe('useCalendarDragCreate — keyboard create (G4-R3-视角10-02)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('startKeyboardCreate completes drag-create entry directly without the long-press timer', () => {
    const onEventCreate = vi.fn();
    const { result } = renderHook(() =>
      useCalendarDragCreate({ onEventCreate, longPressMs: 500 }),
    );

    act(() => {
      result.current.startKeyboardCreate('2026-07-20', 'r1');
    });

    expect(result.current.dragCreateState.active).toBe(true);
    expect(result.current.dragCreateState.startDate).toBe('2026-07-20');
    expect(result.current.dragCreateState.startResource).toBe('r1');
    expect(result.current.showTypeSelector).toBe(true);

    // No long-press timer: advancing the clock must not change the session.
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.dragCreateState.active).toBe(true);
    expect(result.current.showTypeSelector).toBe(true);
  });

  it('selectType after keyboard create dispatches onEventCreate for the pressed cell', () => {
    const onEventCreate = vi.fn();
    const { result } = renderHook(() =>
      useCalendarDragCreate({ onEventCreate, longPressMs: 500 }),
    );

    act(() => {
      result.current.startKeyboardCreate('2026-07-20', 'r1');
    });
    act(() => {
      result.current.selectType('leave');
    });

    expect(onEventCreate).toHaveBeenCalledWith({
      title: 'leave',
      type: 'leave',
      start: '2026-07-20',
      end: '2026-07-20',
      resourceId: 'r1',
    });
    expect(result.current.showTypeSelector).toBe(false);
    expect(result.current.dragCreateState.active).toBe(false);
  });
});
