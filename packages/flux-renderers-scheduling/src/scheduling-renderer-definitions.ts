import type { RendererDefinition } from '@nop-chaos/flux-core';
import type { GanttSchema, KanbanSchema, CalendarSchema } from './schemas.js';

export const schedulingRendererDefinitions: RendererDefinition[] = [
  {
    type: 'gantt',
    displayName: 'Gantt',
    category: 'scheduling',
    sourcePackage: '@nop-chaos/flux-renderers-scheduling',
    defaultSchema: { type: 'gantt', body: [] },
    component: () => null,
    fields: [
      { key: 'body', kind: 'region', regionKey: 'body' },
      { key: 'tasks', kind: 'prop' },
      { key: 'links', kind: 'prop' },
      { key: 'resources', kind: 'prop' },
      { key: 'assignments', kind: 'prop' },
    ],
  },
  {
    type: 'kanban',
    displayName: 'Kanban',
    category: 'scheduling',
    sourcePackage: '@nop-chaos/flux-renderers-scheduling',
    defaultSchema: { type: 'kanban', body: [] },
    component: () => null,
    fields: [
      { key: 'body', kind: 'region', regionKey: 'body' },
    ],
  },
  {
    type: 'calendar',
    displayName: 'Calendar',
    category: 'scheduling',
    sourcePackage: '@nop-chaos/flux-renderers-scheduling',
    defaultSchema: { type: 'calendar', body: [] },
    component: () => null,
    fields: [
      { key: 'body', kind: 'region', regionKey: 'body' },
      { key: 'events', kind: 'prop' },
      { key: 'resources', kind: 'prop' },
      { key: 'onEventChange', kind: 'event' },
    ],
  },
];

export type SchedulingRendererSchema = GanttSchema | KanbanSchema | CalendarSchema;
