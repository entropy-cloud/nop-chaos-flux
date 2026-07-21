import { useState, useCallback, useMemo } from 'react';
import type { CalendarView } from '../../schemas.js';
import type { CalendarDateRange } from '../calendar.types.js';
import { getMonthStartEnd, getWeekStartEnd, getDayStartEnd } from '../utils/calendar-date-utils.js';

export interface CalendarStateOptions {
  initialDate?: Date;
  initialView?: CalendarView;
  firstDayOfWeek?: 0 | 1;
  onDateChange?: (date: Date) => void;
  onViewChange?: (view: CalendarView) => void;
}

export interface CalendarStateResult {
  currentDate: Date;
  activeView: CalendarView;
  dateRange: CalendarDateRange;
  setCurrentDate: (date: Date) => void;
  setActiveView: (view: CalendarView) => void;
}

export function useCalendarState(options: CalendarStateOptions = {}): CalendarStateResult {
  const {
    initialDate = new Date(),
    initialView = 'month',
    firstDayOfWeek = 0,
    onDateChange,
    onViewChange,
  } = options;

  const [currentDate, setInternalDate] = useState<Date>(initialDate);
  const [activeView, setInternalView] = useState<CalendarView>(initialView);

  const dateRange = useMemo<CalendarDateRange>(() => {
    switch (activeView) {
      case 'week':
        return getWeekStartEnd(currentDate, firstDayOfWeek);
      case 'day':
        return getDayStartEnd(currentDate);
      case 'month':
      default:
        return getMonthStartEnd(currentDate);
    }
  }, [currentDate, activeView, firstDayOfWeek]);

  const setCurrentDate = useCallback(
    (date: Date) => {
      setInternalDate(date);
      onDateChange?.(date);
    },
    [onDateChange],
  );

  const setActiveView = useCallback(
    (view: CalendarView) => {
      setInternalView(view);
      onViewChange?.(view);
    },
    [onViewChange],
  );

  return {
    currentDate,
    activeView,
    dateRange,
    setCurrentDate,
    setActiveView,
  };
}
