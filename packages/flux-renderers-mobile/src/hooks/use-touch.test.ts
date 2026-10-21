import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTouch } from './use-touch.js';

function touch(x: number, y: number, time = 0) {
  return {
    touches: [{ clientX: x, clientY: y } as Touch],
    timeStamp: time,
  } as unknown as React.TouchEvent;
}

function touchEmpty() {
  return { touches: [] } as unknown as React.TouchEvent;
}

afterEach(() => {
  vi.resetModules();
});

describe('useTouch', () => {
  it('exposes the initial state snapshot (10 fields incl. velocity)', () => {
    const { result } = renderHook(() => useTouch());
    expect(result.current.state).toEqual({
      startX: 0,
      startY: 0,
      deltaX: 0,
      deltaY: 0,
      offsetX: 0,
      offsetY: 0,
      direction: '',
      isTouching: false,
      velocityX: 0,
      velocityY: 0,
    });
  });

  it('records start position and flips isTouching on touchstart', () => {
    const { result } = renderHook(() => useTouch());
    act(() => {
      result.current.touchHandlers.onTouchStart(touch(120, 80));
    });
    expect(result.current.state.startX).toBe(120);
    expect(result.current.state.startY).toBe(80);
    expect(result.current.state.isTouching).toBe(true);
    expect(result.current.state.deltaX).toBe(0);
    expect(result.current.state.deltaY).toBe(0);
  });

  it('ignores touchstart with no touches', () => {
    const { result } = renderHook(() => useTouch());
    act(() => {
      result.current.touchHandlers.onTouchStart(touchEmpty());
    });
    expect(result.current.state.isTouching).toBe(false);
  });

  it('computes deltaX/deltaY/offset and resolves horizontal direction on touchmove', () => {
    const { result } = renderHook(() => useTouch({ threshold: 10 }));
    act(() => {
      result.current.touchHandlers.onTouchStart(touch(100, 100));
    });
    act(() => {
      result.current.touchHandlers.onTouchMove(touch(160, 105));
    });
    expect(result.current.state.deltaX).toBe(60);
    expect(result.current.state.deltaY).toBe(5);
    expect(result.current.state.offsetX).toBe(60);
    expect(result.current.state.offsetY).toBe(5);
    expect(result.current.state.direction).toBe('horizontal');
    expect(result.current.state.isTouching).toBe(true);
  });

  it('resolves vertical direction when |deltaY| dominates', () => {
    const { result } = renderHook(() => useTouch({ threshold: 10 }));
    act(() => {
      result.current.touchHandlers.onTouchStart(touch(100, 100));
    });
    act(() => {
      result.current.touchHandlers.onTouchMove(touch(105, 200));
    });
    expect(result.current.state.deltaY).toBe(100);
    expect(result.current.state.direction).toBe('vertical');
  });

  it('returns empty direction when both deltas stay within threshold', () => {
    const { result } = renderHook(() => useTouch({ threshold: 10 }));
    act(() => {
      result.current.touchHandlers.onTouchStart(touch(100, 100));
    });
    act(() => {
      result.current.touchHandlers.onTouchMove(touch(105, 108));
    });
    expect(result.current.state.direction).toBe('');
  });

  it('respects custom threshold at the exact boundary (equal => empty)', () => {
    const { result } = renderHook(() => useTouch({ threshold: 20 }));
    act(() => {
      result.current.touchHandlers.onTouchStart(touch(0, 0));
    });
    act(() => {
      result.current.touchHandlers.onTouchMove(touch(20, 0));
    });
    expect(result.current.state.direction).toBe('');
  });

  it('returns horizontal just above threshold while vertical stays within threshold', () => {
    const { result } = renderHook(() => useTouch({ threshold: 20 }));
    act(() => {
      result.current.touchHandlers.onTouchStart(touch(0, 0));
    });
    act(() => {
      result.current.touchHandlers.onTouchMove(touch(21, 0));
    });
    expect(result.current.state.direction).toBe('horizontal');
  });

  it('returns horizontal when absX > absY even if absY > threshold', () => {
    const { result } = renderHook(() => useTouch({ threshold: 10 }));
    act(() => {
      result.current.touchHandlers.onTouchStart(touch(0, 0));
    });
    act(() => {
      result.current.touchHandlers.onTouchMove(touch(100, 50));
    });
    expect(result.current.state.direction).toBe('horizontal');
  });

  it('returns vertical when absY > absX even if absX > threshold', () => {
    const { result } = renderHook(() => useTouch({ threshold: 10 }));
    act(() => {
      result.current.touchHandlers.onTouchStart(touch(0, 0));
    });
    act(() => {
      result.current.touchHandlers.onTouchMove(touch(50, 100));
    });
    expect(result.current.state.direction).toBe('vertical');
  });

  it('uses default threshold of 10 when no option provided', () => {
    const { result } = renderHook(() => useTouch());
    act(() => {
      result.current.touchHandlers.onTouchStart(touch(0, 0));
    });
    act(() => {
      result.current.touchHandlers.onTouchMove(touch(11, 0));
    });
    expect(result.current.state.direction).toBe('horizontal');
  });

  it('preserves startX/startY across moves and flips isTouching=false on touchend', () => {
    const { result } = renderHook(() => useTouch({ threshold: 10 }));
    act(() => {
      result.current.touchHandlers.onTouchStart(touch(50, 60));
    });
    act(() => {
      result.current.touchHandlers.onTouchMove(touch(80, 90));
    });
    expect(result.current.state.startX).toBe(50);
    expect(result.current.state.startY).toBe(60);
    expect(result.current.state.isTouching).toBe(true);
    act(() => {
      result.current.touchHandlers.onTouchEnd();
    });
    expect(result.current.state.isTouching).toBe(false);
    expect(result.current.state.deltaX).toBe(30);
    expect(result.current.state.deltaY).toBe(30);
  });

  it('reset() zeroes every field including velocity and isTouching', () => {
    const { result } = renderHook(() => useTouch({ threshold: 10 }));
    act(() => {
      result.current.touchHandlers.onTouchStart(touch(10, 20, 1000));
    });
    act(() => {
      result.current.touchHandlers.onTouchMove(touch(80, 90, 1050));
    });
    expect(result.current.state.deltaX).not.toBe(0);
    expect(result.current.state.velocityX).not.toBe(0);
    act(() => {
      result.current.reset();
    });
    expect(result.current.state).toEqual({
      startX: 0,
      startY: 0,
      deltaX: 0,
      deltaY: 0,
      offsetX: 0,
      offsetY: 0,
      direction: '',
      isTouching: false,
      velocityX: 0,
      velocityY: 0,
    });
  });

  it('samples signed velocity in px/ms from the event timeStamp', () => {
    const { result } = renderHook(() => useTouch({ threshold: 10 }));
    act(() => {
      result.current.touchHandlers.onTouchStart(touch(0, 0, 1000));
    });
    act(() => {
      result.current.touchHandlers.onTouchMove(touch(30, -10, 1050));
    });
    // (30-0)/(1050-1000) = 0.6 px/ms, (-10)/50 = -0.2 px/ms
    expect(result.current.state.velocityX).toBeCloseTo(0.6, 6);
    expect(result.current.state.velocityY).toBeCloseTo(-0.2, 6);
  });

  it('keeps velocity readable after touchend for release decisions', () => {
    const { result } = renderHook(() => useTouch({ threshold: 10 }));
    act(() => {
      result.current.touchHandlers.onTouchStart(touch(0, 0, 1000));
    });
    act(() => {
      result.current.touchHandlers.onTouchMove(touch(40, 0, 1050));
    });
    act(() => {
      result.current.touchHandlers.onTouchEnd();
    });
    expect(result.current.state.isTouching).toBe(false);
    expect(result.current.state.velocityX).toBeCloseTo(0.8, 6);
  });

  it('resets velocity on the next touchstart (stale flick cannot leak)', () => {
    const { result } = renderHook(() => useTouch({ threshold: 10 }));
    act(() => {
      result.current.touchHandlers.onTouchStart(touch(0, 0, 1000));
    });
    act(() => {
      result.current.touchHandlers.onTouchMove(touch(40, 0, 1050));
    });
    act(() => {
      result.current.touchHandlers.onTouchEnd();
    });
    expect(result.current.state.velocityX).toBeCloseTo(0.8, 6);
    act(() => {
      result.current.touchHandlers.onTouchStart(touch(0, 0, 5000));
    });
    expect(result.current.state.velocityX).toBe(0);
    expect(result.current.state.velocityY).toBe(0);
  });

  it('decays velocity to zero when movement stalls beyond the 170ms window', () => {
    const { result } = renderHook(() => useTouch({ threshold: 10 }));
    act(() => {
      result.current.touchHandlers.onTouchStart(touch(0, 0, 1000));
    });
    act(() => {
      result.current.touchHandlers.onTouchMove(touch(40, 0, 1050));
    });
    expect(result.current.state.velocityX).toBeCloseTo(0.8, 6);
    act(() => {
      result.current.touchHandlers.onTouchMove(touch(40.5, 0, 1300));
    });
    expect(result.current.state.velocityX).toBe(0);
  });
});
