import type { BaseSchema, SchemaInput, SchemaObject } from '@nop-chaos/flux-core';
import type { ActionSchema } from '@nop-chaos/flux-core';
import type { GanttTaskData, GanttLinkData, GanttResource, GanttAssignment, GanttColumn, GanttScale, GanttZoomLevel } from './gantt/gantt.types.js';

/** @deprecated Use `GanttTaskData` from `./gantt/gantt.types.js` instead (runtime data type without computed layout fields). `GanttTask` extends `GanttTaskData` with computed layout fields (`$x`, `$y`, etc.) and should only be used internally by the gantt renderer. */
export interface GanttTask extends SchemaObject {
  id: string;
  text: string;
  start: string;
  end: string;
  duration?: number;
  progress?: number;
  type?: 'task' | 'project' | 'milestone';
  parent?: string;
  open?: boolean;
  children?: GanttTask[];
  calendar?: string;
}

/** @deprecated Use `GanttLinkData` from `./gantt/gantt.types.js` instead (runtime data type without computed polyline field). `GanttLink` extends `GanttLinkData` with computed layout fields (`$p`) and should only be used internally by the gantt renderer. */
export interface GanttLink extends SchemaObject {
  id: string;
  source: string;
  target: string;
  type: 'FS' | 'SS' | 'FF' | 'SF';
  lag?: number;
}

export type { GanttResource, GanttAssignment, GanttColumn, GanttScale, GanttZoomLevel };

export interface GanttSchema extends BaseSchema {
  type: 'gantt';
  tasks?: GanttTaskData[];
  links?: GanttLinkData[];
  resources?: GanttResource[];
  assignments?: GanttAssignment[];
  columns?: GanttColumn[];
  scales?: GanttScale[];
  zoomLevels?: GanttZoomLevel[];
  defaultZoom?: string;
  cellWidth?: number;
  startDate?: string;
  endDate?: string;
  childrenField?: string;
  initiallyExpanded?: boolean;
  draggable?: boolean;
  editable?: boolean;
  linkable?: boolean;
  taskBarHeight?: number;
  progressBarHeight?: number;
  calendar?: string;
  showWeekends?: boolean;
  showToday?: boolean;
  onTaskClick?: ActionSchema;
  onTaskDoubleClick?: ActionSchema;
  onTaskDragEnd?: ActionSchema;
  onLinkClick?: ActionSchema;
  onLinkDragEnd?: ActionSchema;
  onEmptyCellClick?: ActionSchema;
  onZoomChange?: ActionSchema;
  /** Fires on scroll — fire-and-forget semantic. The action is dispatched on every scroll event; consumers should debounce or throttle in the action handler if needed. */
  onScroll?: ActionSchema;
  zoomIn?: ActionSchema;
  zoomOut?: ActionSchema;
  scrollToToday?: ActionSchema;
  scrollToTask?: ActionSchema;
  taskBar?: SchemaInput;
  toolbar?: SchemaInput;
  editor?: SchemaInput;
  toolbarClassName?: string;
  taskBarClassName?: string;
  editorClassName?: string;
  emptyClassName?: string;
  onMount?: ActionSchema;
  onUnmount?: ActionSchema;
  empty?: SchemaInput;
  loading?: SchemaInput;
  body?: SchemaInput;
}

export type { KanbanSchema, KanbanColumnConfig, KanbanCardConfig, KanbanEvents, BoardData, BoardItem } from './kanban/kanban.types.js';
export type { BarcodeInputSchema } from './barcode-input/barcode-input.types.js';

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
  text: string;
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
  headerClassName?: string;
  eventClassName?: string;
  emptyClassName?: string;
}
