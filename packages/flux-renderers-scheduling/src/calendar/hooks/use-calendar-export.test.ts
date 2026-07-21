import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCalendarExport } from './use-calendar-export.js';

describe('useCalendarExport', () => {
  beforeAll(() => {
    window.print = vi.fn();
  });

  afterAll(() => {
    delete (window as any).print;
  });

  it('should provide exportToPrint and exportToPNG functions', () => {
    const { result } = renderHook(() => useCalendarExport());
    expect(typeof result.current.exportToPrint).toBe('function');
    expect(typeof result.current.exportToPNG).toBe('function');
  });

  it('exportToPrint should call window.print', () => {
    const printSpy = vi.spyOn(window, 'print');
    const { result } = renderHook(() => useCalendarExport());
    act(() => result.current.exportToPrint());
    expect(printSpy).toHaveBeenCalled();
  });

  it('exportToPNG should do nothing when target is null', async () => {
    const { result } = renderHook(() => useCalendarExport());
    await expect(result.current.exportToPNG(null)).resolves.toBeUndefined();
  });

  it('exportToPNG should do nothing when calendarRef.current is null', async () => {
    const ref = { current: null };
    const { result } = renderHook(() => useCalendarExport(ref));
    await expect(result.current.exportToPNG()).resolves.toBeUndefined();
  });

  it('exportToPNG should reject with AbortError when signal is aborted', async () => {
    const { result } = renderHook(() => useCalendarExport());
    const controller = new AbortController();
    controller.abort();
    await expect(result.current.exportToPNG(document.createElement('div'), 'test.png', controller.signal)).resolves.toBeUndefined();
  });

  it('exportToPNG should do nothing when already exporting (concurrency guard)', async () => {
    const { result } = renderHook(() => useCalendarExport());
    const el = document.createElement('div');
    result.current.exportToPNG(el, 'test1.png');
    const p2 = result.current.exportToPNG(el, 'test2.png');
    await expect(p2).resolves.toBeUndefined();
  });
});
