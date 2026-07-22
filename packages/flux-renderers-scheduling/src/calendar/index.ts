export type { CalendarView, CalendarDateRange, PositionedEvent, CalendarResourceRow, ConflictInfo, CalendarViewState, CalendarCellData, CalendarDayCell, DragOverCell, ResourceGroupState } from './calendar.types.js';
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

export { useCalendarDrag } from './hooks/use-calendar-drag.js';
export type { DragSwapPayload, UseCalendarDragOptions, UseCalendarDragResult } from './hooks/use-calendar-drag.js';

export { useCalendarDragCreate } from './hooks/use-calendar-drag-create.js';
export type { DragCreatePayload, UseCalendarDragCreateOptions, UseCalendarDragCreateResult } from './hooks/use-calendar-drag-create.js';

/** @deprecated Unwired — retained for future wiring per design §12.6. Not used by the main Calendar renderer. */
export { useCalendarICal } from './hooks/use-calendar-ical.js';
export type { UseCalendarICalOptions, UseCalendarICalResult } from './hooks/use-calendar-ical.js';

export { useCalendarExport } from './hooks/use-calendar-export.js';
export type { UseCalendarExportResult } from './hooks/use-calendar-export.js';

/** @deprecated Unwired — retained for future wiring per design §12.5. Not used by the main Calendar renderer. */
export { CalendarBatchScheduler } from './components/calendar-batch-scheduler.js';
export type { BatchSchedulePayload, CalendarBatchSchedulerProps } from './components/calendar-batch-scheduler.js';

/** @deprecated Unwired — retained for future wiring per design §12.3. Not used by the main Calendar renderer. */
export { CalendarResourceGroup } from './components/calendar-resource-group.js';
export type { CalendarResourceGroupProps } from './components/calendar-resource-group.js';

/** @deprecated Unwired — retained for future wiring per design §12.7. Not used by the main Calendar renderer. */
export { CalendarTimezoneSelector } from './components/calendar-timezone-selector.js';
export type { CalendarTimezoneSelectorProps } from './components/calendar-timezone-selector.js';

export { Calendar } from './calendar.js';
export type { CalendarHandle } from './calendar.js';
