import type { BaseSchema, SchemaInput, SchemaObject } from '@nop-chaos/flux-core';
import type { ActionSchema } from '@nop-chaos/flux-core';

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

export interface GanttLink extends SchemaObject {
  id: string;
  source: string;
  target: string;
  type: 'FS' | 'SS' | 'FF' | 'SF';
  lag?: number;
}

export interface GanttResource extends SchemaObject {
  id: string;
  text: string;
}

export interface GanttAssignment extends SchemaObject {
  id: string;
  taskId: string;
  resourceId: string;
  units?: number;
}

export interface GanttColumn extends SchemaObject {
  name: string;
  label: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  fixed?: 'left' | 'right';
  sortable?: boolean;
  resizable?: boolean;
  minWidth?: number;
  maxWidth?: number;
}

export interface GanttScale extends SchemaObject {
  unit: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  step?: number;
  format?: string;
}

export interface GanttZoomLevel extends SchemaObject {
  key: string;
  label: string;
  minCellWidth?: number;
  maxCellWidth?: number;
  scales: GanttScale[];
}

export interface GanttSchema extends BaseSchema {
  type: 'gantt';
  tasks?: GanttTask[];
  links?: GanttLink[];
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

export interface KanbanSchema extends BaseSchema {
  type: 'kanban';
  body?: SchemaInput;
}

export interface CalendarEvent extends SchemaObject {
  id: string;
  title: string;
  start: string;
  end: string;
  resourceId?: string;
  color?: string;
}

export interface CalendarResource extends SchemaObject {
  id: string;
  text: string;
  color?: string;
}

export interface CalendarSchema extends BaseSchema {
  type: 'calendar';
  events?: CalendarEvent[];
  resources?: CalendarResource[];
  body?: SchemaInput;
  onEventChange?: ActionSchema;
}
