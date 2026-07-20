export type { CalendarView, CalendarDateRange, PositionedEvent, CalendarResourceRow, ConflictInfo, CalendarViewState, CalendarCellData, CalendarDayCell } from './calendar.types.js';
export type { SplitEventBlock, MonthPositionInput, ConflictInput } from './utils/calendar-layout-utils.js';
export type { TimePointInput, VerticalRange, ConcurrentWidthAllocation } from './utils/calendar-time-utils.js';

export {
  getMonthStartEnd,
  getWeekStartEnd,
  getDayStartEnd,
  getDateRange,
  isSameDay,
  isWeekend,
  isToday,
  formatDate,
  addDays,
  addMonths,
  addWeeks,
  diffInDays,
  toISODateString,
  parseISODate,
  getDaysInMonth,
  getMonthDays,
} from './utils/calendar-date-utils.js';

export {
  splitMultiDayEvents,
  positionEventsInMonth,
  detectConflicts,
} from './utils/calendar-layout-utils.js';

export {
  timePointToPercentage,
  eventToVerticalRange,
  allocateConcurrentWidths,
} from './utils/calendar-time-utils.js';

export { useCalendarState } from './hooks/use-calendar-state.js';
export type { CalendarStateOptions, CalendarStateResult } from './hooks/use-calendar-state.js';

export { useCalendarNavigation } from './hooks/use-calendar-navigation.js';
export type { CalendarNavigationOptions, CalendarNavigationResult } from './hooks/use-calendar-navigation.js';

export { useCalendarVirtualizer } from './hooks/use-calendar-virtualizer.js';
export type { UseCalendarVirtualizerOptions, UseCalendarVirtualizerResult } from './hooks/use-calendar-virtualizer.js';

export { Calendar } from './calendar.js';
export type { CalendarHandle } from './calendar.js';
