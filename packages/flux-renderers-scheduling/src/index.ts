import { registerRendererDefinitions, type RendererRegistry } from '@nop-chaos/flux-core';
import { schedulingRendererDefinitions } from './scheduling-renderer-definitions.js';
import type { GanttTaskData, GanttLinkData } from './gantt/gantt.types.js';

export type {
  GanttSchema,
  GanttResource,
  GanttAssignment,
  KanbanSchema,
  CalendarSchema,
  CalendarEvent,
  CalendarResource,
  BarcodeInputSchema,
} from './schemas.js';

export type { GanttTaskData, GanttLinkData };

export type { SchedulingRendererSchema } from './scheduling-renderer-definitions.js';

export function registerSchedulingRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, schedulingRendererDefinitions);
}
