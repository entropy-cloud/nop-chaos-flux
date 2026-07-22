
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

  const goNext = () => {
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
  };

  const goPrev = () => {
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
  };

  const goToday = () => {
    onDateChange(new Date());
  };

  const goToDate = (date: Date) => {
    onDateChange(date);
  };

  return { goNext, goPrev, goToday, goToDate };
}
