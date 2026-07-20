import type { CalendarEvent, CalendarResource, CalendarView } from '../schemas.js';

export type { CalendarView };

export interface CalendarDateRange {
  start: Date;
  end: Date;
}

export interface PositionedEvent {
  event: CalendarEvent;
  left: number;
  width: number;
  top?: number;
  height?: number;
  isSplit?: boolean;
  eventId: string;
  concurrentIndex: number;
  maxConcurrent: number;
  overlap?: boolean;
}

export interface CalendarResourceRow {
  resource: CalendarResource;
  positionedEvents: Map<string, PositionedEvent[]>;
}

export interface ConflictInfo {
  resourceId: string;
  date: string;
  overlappingEvents: CalendarEvent[];
}

export interface CalendarViewState {
  currentDate: Date;
  activeView: CalendarView;
  dateRange: CalendarDateRange;
}

export interface CalendarCellData {
  date: string;
  dateObj: Date;
  isCurrentMonth: boolean;
  isWeekend: boolean;
  isToday: boolean;
  events: PositionedEvent[];
  conflict?: ConflictInfo;
}

export interface CalendarDayCell {
  day: number;
  date: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

export interface DragOverCell {
  date: string;
  resourceId: string;
  x: number;
  y: number;
}

export interface ResourceGroupState {
  id: string;
  open: boolean;
  children: string[];
}
