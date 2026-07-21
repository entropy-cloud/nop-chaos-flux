import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCalendarState } from './use-calendar-state.js';

describe('useCalendarState', () => {
  it('should initialize with provided initialDate and initialView', () => {
    const date = new Date('2026-07-21');
    const { result } = renderHook(() => useCalendarState({ initialDate: date, initialView: 'week' }));
    expect(result.current.currentDate).toEqual(date);
    expect(result.current.activeView).toBe('week');
  });

  it('should default to today and month view', () => {
    const { result } = renderHook(() => useCalendarState());
    expect(result.current.activeView).toBe('month');
  });

  it('should update date via setCurrentDate', () => {
    const { result } = renderHook(() => useCalendarState());
    const newDate = new Date('2026-12-25');
    act(() => result.current.setCurrentDate(newDate));
    expect(result.current.currentDate).toEqual(newDate);
  });

  it('should update view via setActiveView', () => {
    const { result } = renderHook(() => useCalendarState());
    act(() => result.current.setActiveView('week'));
    expect(result.current.activeView).toBe('week');
  });

  it('should call onDateChange when setCurrentDate is called', () => {
    const onDateChange = vi.fn();
    const { result } = renderHook(() => useCalendarState({ onDateChange }));
    act(() => result.current.setCurrentDate(new Date('2026-07-01')));
    expect(onDateChange).toHaveBeenCalled();
  });

  it('should call onViewChange when setActiveView is called', () => {
    const onViewChange = vi.fn();
    const { result } = renderHook(() => useCalendarState({ onViewChange }));
    act(() => result.current.setActiveView('day'));
    expect(onViewChange).toHaveBeenCalledWith('day');
  });

  it('should compute dateRange for month view', () => {
    const date = new Date('2026-07-21');
    const { result } = renderHook(() => useCalendarState({ initialDate: date, initialView: 'month' }));
    expect(result.current.dateRange.start).toBeInstanceOf(Date);
    expect(result.current.dateRange.end).toBeInstanceOf(Date);
  });

  it('should compute dateRange for week view', () => {
    const date = new Date('2026-07-21');
    const { result } = renderHook(() => useCalendarState({ initialDate: date, initialView: 'week' }));
    expect(result.current.dateRange.start).toBeInstanceOf(Date);
    expect(result.current.dateRange.end).toBeInstanceOf(Date);
  });

  it('should compute dateRange for day view', () => {
    const date = new Date('2026-07-21');
    const { result } = renderHook(() => useCalendarState({ initialDate: date, initialView: 'day' }));
    expect(result.current.dateRange.start).toBeInstanceOf(Date);
    expect(result.current.dateRange.end).toBeInstanceOf(Date);
  });

  it('should use controlledDate when provided', () => {
    const controlled = new Date('2026-01-01');
    const initial = new Date('2026-07-21');
    const { result } = renderHook(() => useCalendarState({ initialDate: initial, controlledDate: controlled }));
    expect(result.current.currentDate).toEqual(controlled);
  });

  it('should use controlledView when provided', () => {
    const { result } = renderHook(() => useCalendarState({ initialView: 'month', controlledView: 'day' }));
    expect(result.current.activeView).toBe('day');
  });
});
