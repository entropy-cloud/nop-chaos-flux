import { useState } from 'react';
import type { CalendarView } from '../../schemas.js';
import type { CalendarDateRange } from '../calendar.types.js';
import { getMonthStartEnd, getWeekStartEnd, getDayStartEnd } from '../utils/calendar-date-utils.js';

export interface CalendarStateOptions {
  initialDate?: Date;
  initialView?: CalendarView;
  firstDayOfWeek?: 0 | 1;
  onDateChange?: (date: Date) => void;
  onViewChange?: (view: CalendarView) => void;
  controlledView?: CalendarView;
  controlledDate?: Date;
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
    controlledView,
    controlledDate,
  } = options;

  const isControlledView = controlledView !== undefined;
  const isControlledDate = controlledDate !== undefined;

  const [localDate, setLocalDate] = useState<Date>(initialDate);
  const [localView, setLocalView] = useState<CalendarView>(initialView);

  const currentDate = isControlledDate ? controlledDate : localDate;
  const activeView = isControlledView ? controlledView : localView;

  const dateRange = ((): CalendarDateRange => {
    switch (activeView) {
      case 'week':
        return getWeekStartEnd(currentDate, firstDayOfWeek);
      case 'day':
        return getDayStartEnd(currentDate);
      case 'month':
      default:
        return getMonthStartEnd(currentDate);
    }
  })();

  const setCurrentDate = (date: Date) => {
    if (!isControlledDate) {
      setLocalDate(date);
    }
    onDateChange?.(date);
  };

  const setActiveView = (view: CalendarView) => {
    if (!isControlledView) {
      setLocalView(view);
    }
    onViewChange?.(view);
  };

  return {
    currentDate,
    activeView,
    dateRange,
    setCurrentDate,
    setActiveView,
  };
}
