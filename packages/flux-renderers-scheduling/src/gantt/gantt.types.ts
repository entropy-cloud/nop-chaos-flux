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
