import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGanttScroll } from './use-gantt-scroll.js';

describe('useGanttScroll', () => {
  it('should set up scroll listeners', () => {
    const gridEl = document.createElement('div');
    const timelineEl = document.createElement('div');
    const addEventListenerSpy = vi.spyOn(gridEl, 'addEventListener');
    const addEventListenerSpy2 = vi.spyOn(timelineEl, 'addEventListener');

    const gridRef = { current: gridEl };
    const timelineRef = { current: timelineEl };

    const { unmount } = renderHook(() => useGanttScroll(gridRef, timelineRef));

    expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });
    expect(addEventListenerSpy2).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });

    unmount();
  });

  it('should clean up scroll listeners on unmount', () => {
    const gridEl = document.createElement('div');
    const timelineEl = document.createElement('div');
    const removeEventListenerSpy = vi.spyOn(gridEl, 'removeEventListener');
    const removeEventListenerSpy2 = vi.spyOn(timelineEl, 'removeEventListener');

    const gridRef = { current: gridEl };
    const timelineRef = { current: timelineEl };

    const { unmount } = renderHook(() => useGanttScroll(gridRef, timelineRef));
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    expect(removeEventListenerSpy2).toHaveBeenCalledWith('scroll', expect.any(Function));
  });

  it('should do nothing when refs are null', () => {
    const gridRef = { current: null };
    const timelineRef = { current: null };
    expect(() => {
      renderHook(() => useGanttScroll(gridRef, timelineRef));
    }).not.toThrow();
  });
});
