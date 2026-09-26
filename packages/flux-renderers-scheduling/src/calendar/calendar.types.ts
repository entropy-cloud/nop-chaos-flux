import type { BaseSchema, SchemaInput, SchemaObject, ActionSchema } from '@nop-chaos/flux-core';

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
  overflowCount?: number;
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

export type CalendarView = 'month' | 'week' | 'day';

export interface CalendarEvent extends SchemaObject {
  id: string;
  title: string;
  start: string;
  end: string;
  type?: string;
  resourceId?: string;
  color?: string;
  status?: 'scheduled' | 'confirmed' | 'cancelled';
}

export interface CalendarResource extends SchemaObject {
  id: string;
  title?: string;
  /** @deprecated Use `title` instead. Will be removed in a future version. */
  text?: string;
  type?: string;
  parent?: string;
  color?: string;
  avatar?: string;
  resources?: CalendarResource[];
  open?: boolean;
}

export interface CalendarSchema extends BaseSchema {
  type: 'calendar';
  view?: CalendarView;
  /**
   * Month-view shape (L4.2). 'resource' (default) = the resource-row ×
   * date-column scheduling matrix. 'grid' = Booker-style six-week vertical
   * date-selection grid (pure date-select surface — no events/resources
   * rendered; bypasses the empty-state gate). Ignored outside view=month.
   */
  monthShape?: 'resource' | 'grid';
  date?: string;
  events?: CalendarEvent[];
  resources?: CalendarResource[];
  firstDayOfWeek?: 0 | 1;
  showWeekends?: boolean;
  maxConcurrent?: number;
  showCrossDayLines?: boolean;
  timezoneSelector?: boolean;
  batchScheduling?: boolean;
  eventTemplate?: SchemaInput;
  loading?: SchemaInput;
  empty?: SchemaInput;
  body?: SchemaInput;
  loadAction?: ActionSchema;
  viewOwnership?: 'local' | 'controlled' | 'scope';
  viewStatePath?: string;
  dateOwnership?: 'local' | 'controlled' | 'scope';
  dateStatePath?: string;
  statusPath?: string;
  onEventClick?: ActionSchema;
  onDateChange?: ActionSchema;
  /** Grid-shape date-cell selection (monthShape:'grid'). Payload { date, inMonth }.
   * Selection ≠ navigation: currentDate/dateOwnership are untouched. */
  onDateSelect?: ActionSchema;
  onViewChange?: ActionSchema;
  onEventChange?: ActionSchema;
  onEventCreate?: ActionSchema;
  onBatchSchedule?: ActionSchema;
  onImport?: ActionSchema;
  onImportError?: ActionSchema;
  onTimezoneChange?: ActionSchema;
  onGroupToggle?: ActionSchema;
  onMount?: ActionSchema;
  onUnmount?: ActionSchema;
  print?: ActionSchema;
  exportPNG?: ActionSchema;
  importICal?: ActionSchema;
  exportToICal?: ActionSchema;
  headerClassName?: string;
  eventClassName?: string;
  emptyClassName?: string;
}
