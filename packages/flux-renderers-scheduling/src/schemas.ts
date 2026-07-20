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

export interface GanttSchema extends BaseSchema {
  type: 'gantt';
  tasks?: GanttTask[];
  links?: GanttLink[];
  resources?: GanttResource[];
  assignments?: GanttAssignment[];
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
