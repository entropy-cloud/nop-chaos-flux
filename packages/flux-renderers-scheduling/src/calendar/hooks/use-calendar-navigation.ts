import { useCallback } from 'react';
import type { CalendarView } from '../../schemas.js';
import { addMonths, addWeeks, addDays } from '../utils/calendar-date-utils.js';

export interface CalendarNavigationOptions {
  currentDate: Date;
  activeView: CalendarView;
  onDateChange: (date: Date) => void;
}

export interface CalendarNavigationResult {
  goNext: () => void;
  goPrev: () => void;
  goToday: () => void;
  goToDate: (date: Date) => void;
}

export function useCalendarNavigation(options: CalendarNavigationOptions): CalendarNavigationResult {
  const { currentDate, activeView, onDateChange } = options;

  const goNext = useCallback(() => {
    switch (activeView) {
      case 'month':
        onDateChange(addMonths(currentDate, 1));
        break;
      case 'week':
        onDateChange(addWeeks(currentDate, 1));
        break;
      case 'day':
        onDateChange(addDays(currentDate, 1));
        break;
    }
  }, [currentDate, activeView, onDateChange]);

  const goPrev = useCallback(() => {
    switch (activeView) {
      case 'month':
        onDateChange(addMonths(currentDate, -1));
        break;
      case 'week':
        onDateChange(addWeeks(currentDate, -1));
        break;
      case 'day':
        onDateChange(addDays(currentDate, -1));
        break;
    }
  }, [currentDate, activeView, onDateChange]);

  const goToday = useCallback(() => {
    onDateChange(new Date());
  }, [onDateChange]);

  const goToDate = useCallback(
    (date: Date) => {
      onDateChange(date);
    },
    [onDateChange],
  );

  return { goNext, goPrev, goToday, goToDate };
}
