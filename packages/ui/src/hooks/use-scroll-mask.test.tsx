import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useScrollMask } from './use-scroll-mask.js';

function stubLayout(values: {
  scrollLeft?: number;
  scrollTop?: number;
  scrollWidth?: number;
  scrollHeight?: number;
  clientWidth?: number;
  clientHeight?: number;
}) {
  const element = document.createElement('div');
  for (const [key, value] of Object.entries(values)) {
    vi.spyOn(element, key as 'scrollLeft', 'get').mockReturnValue(value ?? 0);
  }
  return element;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useScrollMask (plan 668 Phase 2)', () => {
  it('x-axis: at scrollLeft 0 shows only the end mask', () => {
    const element = stubLayout({ scrollLeft: 0, scrollWidth: 1000, clientWidth: 300 });
    const ref = { current: element };
    const { result } = renderHook(() => useScrollMask(ref, 'x'));
    expect(result.current).toEqual({ startMask: false, endMask: true });
  });

  it('x-axis: at scrollLeft max shows only the start mask', () => {
    const element = stubLayout({ scrollLeft: 700, scrollWidth: 1000, clientWidth: 300 });
    const ref = { current: element };
    const { result } = renderHook(() => useScrollMask(ref, 'x'));
    expect(result.current).toEqual({ startMask: true, endMask: false });
  });

  it('x-axis: mid-scroll shows both masks', () => {
    const element = stubLayout({ scrollLeft: 350, scrollWidth: 1000, clientWidth: 300 });
    const ref = { current: element };
    const { result } = renderHook(() => useScrollMask(ref, 'x'));
    expect(result.current).toEqual({ startMask: true, endMask: true });
  });

  it('content not overflowing shows no masks on either edge', () => {
    const element = stubLayout({ scrollLeft: 0, scrollWidth: 300, clientWidth: 300 });
    const ref = { current: element };
    const { result } = renderHook(() => useScrollMask(ref, 'x'));
    expect(result.current).toEqual({ startMask: false, endMask: false });
  });

  it('y-axis reads scrollTop/scrollHeight/clientHeight', () => {
    const element = stubLayout({ scrollTop: 500, scrollHeight: 2000, clientHeight: 400 });
    const ref = { current: element };
    const { result } = renderHook(() => useScrollMask(ref, 'y'));
    expect(result.current).toEqual({ startMask: true, endMask: true });
  });
});
