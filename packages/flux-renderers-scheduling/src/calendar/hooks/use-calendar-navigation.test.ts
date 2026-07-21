import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCalendarNavigation } from './use-calendar-navigation.js';

describe('useCalendarNavigation', () => {
  const baseDate = new Date('2026-07-21');

  it('should go to next month', () => {
    const onDateChange = vi.fn();
    const { result } = renderHook(() =>
      useCalendarNavigation({ currentDate: baseDate, activeView: 'month', onDateChange }),
    );
    act(() => result.current.goNext());
    expect(onDateChange).toHaveBeenCalled();
    const newDate = onDateChange.mock.calls[0][0] as Date;
    expect(newDate.getMonth()).toBe(7);
  });

  it('should go to previous month', () => {
    const onDateChange = vi.fn();
    const { result } = renderHook(() =>
      useCalendarNavigation({ currentDate: baseDate, activeView: 'month', onDateChange }),
    );
    act(() => result.current.goPrev());
    expect(onDateChange).toHaveBeenCalled();
    const newDate = onDateChange.mock.calls[0][0] as Date;
    expect(newDate.getMonth()).toBe(5);
  });

  it('should go to next week', () => {
    const onDateChange = vi.fn();
    const { result } = renderHook(() =>
      useCalendarNavigation({ currentDate: baseDate, activeView: 'week', onDateChange }),
    );
    act(() => result.current.goNext());
    expect(onDateChange).toHaveBeenCalled();
  });

  it('should go to previous week', () => {
    const onDateChange = vi.fn();
    const { result } = renderHook(() =>
      useCalendarNavigation({ currentDate: baseDate, activeView: 'week', onDateChange }),
    );
    act(() => result.current.goPrev());
    expect(onDateChange).toHaveBeenCalled();
  });

  it('should go to next day', () => {
    const onDateChange = vi.fn();
    const { result } = renderHook(() =>
      useCalendarNavigation({ currentDate: baseDate, activeView: 'day', onDateChange }),
    );
    act(() => result.current.goNext());
    expect(onDateChange).toHaveBeenCalled();
  });

  it('should go to previous day', () => {
    const onDateChange = vi.fn();
    const { result } = renderHook(() =>
      useCalendarNavigation({ currentDate: baseDate, activeView: 'day', onDateChange }),
    );
    act(() => result.current.goPrev());
    expect(onDateChange).toHaveBeenCalled();
  });

  it('should go to today', () => {
    const onDateChange = vi.fn();
    const { result } = renderHook(() =>
      useCalendarNavigation({ currentDate: baseDate, activeView: 'month', onDateChange }),
    );
    act(() => result.current.goToday());
    expect(onDateChange).toHaveBeenCalled();
  });

  it('should go to specific date', () => {
    const onDateChange = vi.fn();
    const targetDate = new Date('2026-12-25');
    const { result } = renderHook(() =>
      useCalendarNavigation({ currentDate: baseDate, activeView: 'month', onDateChange }),
    );
    act(() => result.current.goToDate(targetDate));
    expect(onDateChange).toHaveBeenCalledWith(targetDate);
  });
});
