import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGanttScroll } from './use-gantt-scroll.js';

describe('useGanttScroll', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

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

  it('should sync vertical scroll from grid to timeline', async () => {
    const gridEl = document.createElement('div');
    const timelineEl = document.createElement('div');
    gridEl.scrollTop = 0;
    timelineEl.scrollTop = 0;
    document.body.appendChild(gridEl);
    document.body.appendChild(timelineEl);

    const gridRef = { current: gridEl };
    const timelineRef = { current: timelineEl };

    renderHook(() => useGanttScroll(gridRef, timelineRef));

    gridEl.scrollTop = 100;
    gridEl.dispatchEvent(new Event('scroll', { bubbles: true }));

    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    expect(timelineEl.scrollTop).toBe(100);
  });

  // plan 545 Phase 2: the writer must know which container scrolled —
  // store.scrollLeft carries the TIMELINE semantic, so the grid source has to
  // be distinguishable at the callback. The pre-fix hook passed only two args
  // (source undefined), which is what let the grid's horizontal scroll write
  // the same store value and poison the zoom anchor.
  it('reports the scroll source (grid vs timeline) to onScroll', () => {
    const gridEl = document.createElement('div');
    const timelineEl = document.createElement('div');
    document.body.appendChild(gridEl);
    document.body.appendChild(timelineEl);
    const onScroll = vi.fn();
    renderHook(() => useGanttScroll({ current: gridEl }, { current: timelineEl }, onScroll));

    gridEl.scrollLeft = 200;
    gridEl.dispatchEvent(new Event('scroll', { bubbles: true }));
    expect(onScroll).toHaveBeenCalledWith(200, gridEl.scrollTop, 'grid');

    timelineEl.scrollLeft = 300;
    timelineEl.dispatchEvent(new Event('scroll', { bubbles: true }));
    expect(onScroll).toHaveBeenCalledWith(300, timelineEl.scrollTop, 'timeline');
  });

  it('should sync vertical scroll from timeline to grid', async () => {
    const gridEl = document.createElement('div');
    const timelineEl = document.createElement('div');
    gridEl.scrollTop = 0;
    timelineEl.scrollTop = 0;
    document.body.appendChild(gridEl);
    document.body.appendChild(timelineEl);

    const gridRef = { current: gridEl };
    const timelineRef = { current: timelineEl };

    renderHook(() => useGanttScroll(gridRef, timelineRef));

    timelineEl.scrollTop = 50;
    timelineEl.dispatchEvent(new Event('scroll', { bubbles: true }));

    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    expect(gridEl.scrollTop).toBe(50);
  });

  it('should cancel previous RAF on new scroll event', async () => {
    const gridEl = document.createElement('div');
    const timelineEl = document.createElement('div');
    gridEl.scrollTop = 0;
    timelineEl.scrollTop = 0;
    document.body.appendChild(gridEl);
    document.body.appendChild(timelineEl);

    const gridRef = { current: gridEl };
    const timelineRef = { current: timelineEl };

    renderHook(() => useGanttScroll(gridRef, timelineRef));

    gridEl.scrollTop = 100;
    gridEl.dispatchEvent(new Event('scroll', { bubbles: true }));

    gridEl.scrollTop = 200;
    gridEl.dispatchEvent(new Event('scroll', { bubbles: true }));

    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    expect(timelineEl.scrollTop).toBe(200);
  });
});
