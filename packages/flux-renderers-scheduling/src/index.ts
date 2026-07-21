import { registerRendererDefinitions, type RendererRegistry } from '@nop-chaos/flux-core';
import { schedulingRendererDefinitions } from './scheduling-renderer-definitions.js';

export type {
  GanttSchema,
  GanttResource,
  GanttAssignment,
  KanbanSchema,
  KanbanEvents,
  KanbanColumnConfig,
  KanbanCardConfig,
  BoardData,
  BoardItem,
  CalendarSchema,
  CalendarEvent,
  CalendarResource,
  BarcodeInputSchema,
} from './schemas.js';

export type { SchedulingRendererSchema } from './scheduling-renderer-definitions.js';

export function registerSchedulingRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, schedulingRendererDefinitions);
}
