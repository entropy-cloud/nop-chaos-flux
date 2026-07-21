import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCalendarVirtualizer } from './use-calendar-virtualizer.js';

describe('useCalendarVirtualizer', () => {
  it('should return scrollRef and virtualItems', () => {
    const { result } = renderHook(() => useCalendarVirtualizer({ count: 10 }));
    expect(result.current.scrollRef).toBeDefined();
    expect(result.current.scrollRef.current).toBeNull();
    expect(Array.isArray(result.current.virtualItems)).toBe(true);
    expect(result.current.totalSize).toBeGreaterThanOrEqual(0);
  });

  it('should return virtualItems for given count', () => {
    const { result } = renderHook(() => useCalendarVirtualizer({ count: 5 }));
    expect(result.current.virtualItems.length).toBeGreaterThanOrEqual(0);
    expect(result.current.totalSize).toBe(5 * 48);
  });

  it('should return empty virtualItems for zero count', () => {
    const { result } = renderHook(() => useCalendarVirtualizer({ count: 0 }));
    expect(result.current.virtualItems.length).toBe(0);
    expect(result.current.totalSize).toBe(0);
  });

  it('should accept custom estimateSize', () => {
    const { result } = renderHook(() =>
      useCalendarVirtualizer({ count: 3, estimateSize: () => 64 }),
    );
    expect(result.current.totalSize).toBe(3 * 64);
  });

  it('should accept custom overscan', () => {
    const { result } = renderHook(() =>
      useCalendarVirtualizer({ count: 100, overscan: 5 }),
    );
    expect(result.current.virtualItems).toBeDefined();
  });
});
