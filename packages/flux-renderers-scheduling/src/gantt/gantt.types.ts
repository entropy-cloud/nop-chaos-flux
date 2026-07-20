export type GanttId = string | number;

export interface GanttSegment {
  start: string;
  end: string;
  progress?: number;
}

export interface GanttTaskData {
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

export interface GanttLinkData {
  id: GanttId;
  source: GanttId;
  target: GanttId;
  type: GanttLinkType;
  lag?: number;
}

export interface GanttLink extends GanttLinkData {
  $p: string;
}

export interface GanttResource {
  id: GanttId;
  text: string;
  calendar?: string;
}

export interface GanttAssignment {
  id: GanttId;
  taskId: GanttId;
  resourceId: GanttId;
  units?: number;
}

export interface GanttColumn {
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

export interface GanttScale {
  unit: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  step?: number;
  format?: string;
}

export interface GanttZoomLevel {
  key: string;
  label: string;
  minCellWidth?: number;
  maxCellWidth?: number;
  scales: GanttScale[];
}
