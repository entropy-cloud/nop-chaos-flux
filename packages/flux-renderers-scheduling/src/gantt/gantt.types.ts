import type { SchemaObject } from '@nop-chaos/flux-core';

export type GanttId = string | number;

export interface GanttSegment extends SchemaObject {
  start: string;
  end: string;
  progress?: number;
}

export interface GanttBaseline extends SchemaObject {
  id: GanttId;
  taskId: GanttId;
  baseStart: string;
  baseEnd: string;
  baseDuration: number;
  baseProgress?: number;
}

export interface GanttTaskData extends SchemaObject {
  id: GanttId;
  text: string;
  type?: 'task' | 'project' | 'milestone';
  start: string;
  end: string;
  duration?: number;
  progress?: number;
  parent?: GanttId | null;
  open?: boolean;
  children?: GanttTaskData[];
  calendar?: string;
  segments?: GanttSegment[];
  baselines?: GanttBaseline[];
}

export interface GanttTask extends GanttTaskData {
  $x: number;
  $y: number;
  $w: number;
  $h: number;
  $level: number;
  $source: GanttId[];
  $target: GanttId[];
}

export type GanttLinkType = 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';

export interface GanttLinkData extends SchemaObject {
  id: GanttId;
  source: GanttId;
  target: GanttId;
  type: GanttLinkType;
  lag?: number;
}

export interface GanttLink extends GanttLinkData {
  $p: string;
}

export interface GanttResource extends SchemaObject {
  id: GanttId;
  text: string;
  calendar?: string;
}

export interface GanttAssignment extends SchemaObject {
  id: GanttId;
  taskId: GanttId;
  resourceId: GanttId;
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

export interface CalendarEntry { id: string; calendar: import('./utils/worktime.js').WorkCalendar; }

export interface GanttStoreApi {
  subscribe: (l: () => void) => () => void;
  getSnapshot: () => import('./gantt-store.js').GanttStoreState;
  tasks: Map<GanttId, GanttTask>;
  links: Map<GanttId, GanttLink>;
  resources: Map<GanttId, GanttResource>;
  assignments: Map<GanttId, GanttAssignment>;
  scaleRange: { start: Date; end: Date };
  cellWidth: number;
  currentZoom: string;
  zoomLevels: Map<string, GanttZoomLevel>;
  taskBarHeight: number;
  rowHeight: number;
  containerWidth: number;
  revision: number;
  taskRevision: number;
  linkRevision: number;
  treeRevision: number;
  layoutRevision: number;
  scrollLeft: number;
  selectedTaskId: GanttId | null;
  selectTask: (v: GanttId | null) => void;
  editingTaskId: GanttId | null;
  editTask: (v: GanttId | null) => void;
  calendarManager: import('./utils/worktime.js').CalendarManager;
  revertTask: (id: GanttId, previousData: Partial<GanttTaskData>) => void;
  parse: (tasks: GanttTaskData[], links: GanttLinkData[], resources?: GanttResource[], assignments?: GanttAssignment[], calendars?: CalendarEntry[]) => void;
  recalcLayout: () => void;
  updateTask: (id: GanttId, partial: Partial<GanttTaskData>) => void;
  updateLink: (id: GanttId, partial: Partial<GanttLink>) => void;
  getVisibleTasks: () => GanttTask[];
  getVisibleTaskWindow: (scrollTop: number, viewportHeight: number, overscan?: number) => { tasks: GanttTask[]; totalHeight: number };
  isOpen: (taskId: GanttId) => boolean;
  toggleOpen: (taskId: GanttId) => void;
  expandAll: () => void;
  collapseAll: () => void;
  getVisibleDescendantCount: (taskId: GanttId) => number;
  deleteTask: (id: GanttId) => void;
  addLink: (source: GanttId, target: GanttId, type: GanttLinkType) => GanttLink;
  removeLink: (id: GanttId) => void;
  setZoom: (zoomKey: string, anchorScrollLeft?: number, anchorContainerWidth?: number) => void;
  getAvailableZooms: () => GanttZoomLevel[];
  destroy: () => void;
}
