import { describe, it, expectTypeOf } from 'vitest';
import type {
  RendererComponentProps,
  RendererResolvedProps,
  RendererRuntime,
  ScopeRef,
} from '@nop-chaos/flux-core';
import type {
  GanttSchema,
  KanbanSchema,
  CalendarSchema,
} from './schemas.js';
import type { SchedulingRendererSchema } from './scheduling-renderer-definitions.js';

describe('Phase 1: RendererComponentProps cross-package generic narrowing', () => {
  it('RendererComponentProps<GanttSchema> schema is GanttSchema', () => {
    expectTypeOf<RendererComponentProps<GanttSchema>['schema']>().toEqualTypeOf<GanttSchema>();
  });

  it('RendererComponentProps<GanttSchema> templateNode carries GanttSchema generic', () => {
    expectTypeOf<RendererComponentProps<GanttSchema>['templateNode']>().toHaveProperty('schema');
  });

  it('RendererComponentProps<GanttSchema> node carries GanttSchema generic', () => {
    expectTypeOf<RendererComponentProps<GanttSchema>['node']>().toHaveProperty('templateNode');
  });

  it('RendererComponentProps<GanttSchema> props includes GanttSchema prop fields', () => {
    type Props = RendererComponentProps<GanttSchema>['props'];
    expectTypeOf<Props>().toHaveProperty('tasks');
    expectTypeOf<Props>().toHaveProperty('defaultZoom');
    expectTypeOf<Props>().toHaveProperty('cellWidth');
    expectTypeOf<Props>().toHaveProperty('taskBarHeight');
    expectTypeOf<Props>().toHaveProperty('showWeekends');
    expectTypeOf<Props>().toHaveProperty('showToday');
    expectTypeOf<Props>().toHaveProperty('draggable');
    expectTypeOf<Props>().toHaveProperty('editable');
    expectTypeOf<Props>().toHaveProperty('linkable');
    expectTypeOf<Props>().toHaveProperty('toolbarClassName');
    expectTypeOf<Props>().toHaveProperty('taskBarClassName');
    expectTypeOf<Props>().toHaveProperty('editorClassName');
    expectTypeOf<Props>().toHaveProperty('emptyClassName');
    expectTypeOf<Props>().toHaveProperty('type');
  });

  it('RendererComponentProps<GanttSchema> regions is Readonly<Record<string, RenderRegionHandle>>', () => {
    const check: Readonly<Record<string, unknown>> = {} as RendererComponentProps<GanttSchema>['regions'];
    expectTypeOf(check).toMatchTypeOf<object>();
  });

  it('RendererComponentProps<KanbanSchema> schema is KanbanSchema', () => {
    expectTypeOf<RendererComponentProps<KanbanSchema>['schema']>().toEqualTypeOf<KanbanSchema>();
  });

  it('RendererComponentProps<KanbanSchema> props includes KanbanSchema fields', () => {
    type Props = RendererComponentProps<KanbanSchema>['props'];
    expectTypeOf<Props>().toHaveProperty('data');
    expectTypeOf<Props>().toHaveProperty('configMap');
    expectTypeOf<Props>().toHaveProperty('columnsConfig');
    expectTypeOf<Props>().toHaveProperty('filterText');
    expectTypeOf<Props>().toHaveProperty('columnWidth');
    expectTypeOf<Props>().toHaveProperty('columnDraggable');
    expectTypeOf<Props>().toHaveProperty('draggable');
    expectTypeOf<Props>().toHaveProperty('kanbanOwnership');
    expectTypeOf<Props>().toHaveProperty('kanbanStatePath');
  });

  it('RendererComponentProps<CalendarSchema> schema is CalendarSchema', () => {
    expectTypeOf<RendererComponentProps<CalendarSchema>['schema']>().toEqualTypeOf<CalendarSchema>();
  });

  it('RendererComponentProps<CalendarSchema> props includes CalendarSchema fields', () => {
    type Props = RendererComponentProps<CalendarSchema>['props'];
    expectTypeOf<Props>().toHaveProperty('view');
    expectTypeOf<Props>().toHaveProperty('date');
    expectTypeOf<Props>().toHaveProperty('events');
    expectTypeOf<Props>().toHaveProperty('resources');
    expectTypeOf<Props>().toHaveProperty('firstDayOfWeek');
    expectTypeOf<Props>().toHaveProperty('showWeekends');
    expectTypeOf<Props>().toHaveProperty('maxConcurrent');
    expectTypeOf<Props>().toHaveProperty('locale');
    expectTypeOf<Props>().toHaveProperty('viewOwnership');
  });
});

describe('Phase 2: RendererResolvedProps meta key exclusion', () => {
  it('RendererResolvedProps<GanttSchema> has type narrowed to include "gantt"', () => {
    type Resolved = RendererResolvedProps<GanttSchema>;
    expectTypeOf<Resolved>().toHaveProperty('type');
  });

  it('RendererResolvedProps<GanttSchema> re-exposes disabled/className as optional', () => {
    type Resolved = RendererResolvedProps<GanttSchema>;
    expectTypeOf<Resolved>().toHaveProperty('disabled');
    expectTypeOf<Resolved>().toHaveProperty('className');
    expectTypeOf<Resolved>().toHaveProperty('testid');
  });

  it('RendererResolvedProps excludes meta-only fields (visible, hidden, when)', () => {
    const resolved: RendererResolvedProps<GanttSchema> = {} as RendererResolvedProps<GanttSchema>;
    const check = resolved as Record<string, unknown>;
    expectTypeOf(check).toMatchTypeOf<Record<string, unknown>>();
  });

  it('RendererResolvedProps<KanbanSchema> has KanbanSchema fields', () => {
    type Resolved = RendererResolvedProps<KanbanSchema>;
    expectTypeOf<Resolved>().toHaveProperty('data');
    expectTypeOf<Resolved>().toHaveProperty('configMap');
    expectTypeOf<Resolved>().toHaveProperty('columnsConfig');
    expectTypeOf<Resolved>().toHaveProperty('columnHeaderClassName');
  });

  it('RendererResolvedProps<CalendarSchema> has CalendarSchema fields', () => {
    type Resolved = RendererResolvedProps<CalendarSchema>;
    expectTypeOf<Resolved>().toHaveProperty('view');
    expectTypeOf<Resolved>().toHaveProperty('date');
    expectTypeOf<Resolved>().toHaveProperty('events');
    expectTypeOf<Resolved>().toHaveProperty('resources');
    expectTypeOf<Resolved>().toHaveProperty('firstDayOfWeek');
    expectTypeOf<Resolved>().toHaveProperty('locale');
    expectTypeOf<Resolved>().toHaveProperty('headerClassName');
    expectTypeOf<Resolved>().toHaveProperty('eventClassName');
    expectTypeOf<Resolved>().toHaveProperty('emptyClassName');
  });
});

describe('Phase 3: SchedulingRendererSchema union type discrimination', () => {
  it('GanttSchema is assignable to SchedulingRendererSchema', () => {
    expectTypeOf<GanttSchema>().toMatchTypeOf<SchedulingRendererSchema>();
  });

  it('KanbanSchema is assignable to SchedulingRendererSchema', () => {
    expectTypeOf<KanbanSchema>().toMatchTypeOf<SchedulingRendererSchema>();
  });

  it('CalendarSchema is assignable to SchedulingRendererSchema', () => {
    expectTypeOf<CalendarSchema>().toMatchTypeOf<SchedulingRendererSchema>();
  });

  it('SchedulingRendererSchema discriminates on type', () => {
    const gantt = { type: 'gantt' } as SchedulingRendererSchema;
    if (gantt.type === 'gantt') {
      expectTypeOf(gantt).toMatchTypeOf<GanttSchema>();
    }
  });

  it('SchedulingRendererSchema discriminates kanban type', () => {
    const kanban = { type: 'kanban' } as SchedulingRendererSchema;
    if (kanban.type === 'kanban') {
      expectTypeOf(kanban).toMatchTypeOf<KanbanSchema>();
    }
  });

  it('SchedulingRendererSchema discriminates calendar type', () => {
    const cal = { type: 'calendar' } as SchedulingRendererSchema;
    if (cal.type === 'calendar') {
      expectTypeOf(cal).toMatchTypeOf<CalendarSchema>();
    }
  });
});

describe('Phase 4: Hook return type contracts (flux-react boundary)', () => {
  it('RendererRuntime type has runtimeId and core methods', () => {
    expectTypeOf<RendererRuntime>().toHaveProperty('runtimeId');
    expectTypeOf<RendererRuntime>().toHaveProperty('registry');
    expectTypeOf<RendererRuntime>().toHaveProperty('compile');
    expectTypeOf<RendererRuntime>().toHaveProperty('evaluate');
    expectTypeOf<RendererRuntime>().toHaveProperty('dispatch');
  });

  it('ScopeRef type has id and core methods', () => {
    expectTypeOf<ScopeRef>().toHaveProperty('id');
    expectTypeOf<ScopeRef>().toHaveProperty('path');
    expectTypeOf<ScopeRef>().toHaveProperty('readVisible');
    expectTypeOf<ScopeRef>().toHaveProperty('readOwn');
    expectTypeOf<ScopeRef>().toHaveProperty('update');
    expectTypeOf<ScopeRef>().toHaveProperty('merge');
  });
});
