import { registerRendererDefinitions, type RendererRegistry } from '@nop-chaos/flux-core';
import { schedulingRendererDefinitions } from './scheduling-renderer-definitions.js';

export type {
  GanttSchema,
  GanttTask,
  GanttLink,
  GanttResource,
  GanttAssignment,
  KanbanSchema,
  CalendarSchema,
  CalendarEvent,
  CalendarResource,
} from './schemas.js';

export { schedulingRendererDefinitions } from './scheduling-renderer-definitions.js';
export type { SchedulingRendererSchema } from './scheduling-renderer-definitions.js';

export function registerSchedulingRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, schedulingRendererDefinitions);
}
