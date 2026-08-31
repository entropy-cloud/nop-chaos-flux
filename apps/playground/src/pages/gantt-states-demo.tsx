import { Button } from '@nop-chaos/ui';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerSchedulingRenderers } from '@nop-chaos/flux-renderers-scheduling';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { ArrowLeft } from 'lucide-react';

interface GanttStatesDemoPageProps {
  onBack: () => void;
}

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerSchedulingRenderers(registry);
const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

const env: RendererEnv = {
  fetcher: async function <T>(req: { url: string }) {
    console.log('[GANTT-STATES] fetcher:', req.url);
    return { status: 0, data: null as T };
  },
  notify: (level, msg) => console.log(`[${level}] ${msg}`),
};

const BASE_ZOOM_LEVELS = [
  { key: 'day', label: 'Day', minCellWidth: 60, scales: [{ unit: 'day', step: 1, format: '%d' }, { unit: 'month', format: '%Y/%m' }] },
  { key: 'week', label: 'Week', minCellWidth: 30, scales: [{ unit: 'week', format: 'W%V' }, { unit: 'month', format: '%Y/%m' }] },
  { key: 'month', label: 'Month', minCellWidth: 12, scales: [{ unit: 'month', format: '%Y/%m' }, { unit: 'year', format: '%Y' }] },
];

export const STATES_SCHEMA = {
  type: 'page',
  body: [
    {
      type: 'text',
      className: 'text-sm font-semibold mt-4 mb-1',
      text: 'Empty — no tasks (bare container)',
    },
    {
      type: 'gantt',
      testid: 'gantt-empty-basic',
      tasks: [],
      links: [],
      zoomLevels: BASE_ZOOM_LEVELS,
    },
    {
      type: 'text',
      className: 'text-sm font-semibold mt-4 mb-1',
      text: 'Empty — custom empty region',
    },
    {
      type: 'gantt',
      testid: 'gantt-empty-region',
      tasks: [],
      links: [],
      zoomLevels: BASE_ZOOM_LEVELS,
      empty: { type: 'text', text: 'No tasks yet — custom empty region', testid: 'gantt-empty-region-text' },
    },
    {
      type: 'text',
      className: 'text-sm font-semibold mt-4 mb-1',
      text: 'Loading — skeleton',
    },
    {
      type: 'gantt',
      testid: 'gantt-loading-skeleton',
      tasks: [
        { id: '1', text: 'Hidden Task', start: '2026-08-01', end: '2026-08-05' },
      ],
      links: [],
      zoomLevels: BASE_ZOOM_LEVELS,
      loading: '${isLoading}',
    },
    {
      type: 'text',
      className: 'text-sm font-semibold mt-4 mb-1',
      text: 'Baselines — deviation bars and labels',
    },
    {
      type: 'gantt',
      testid: 'gantt-baselines',
      cellWidth: 40,
      defaultZoom: 'week',
      taskBarHeight: 28,
      showToday: false,
      tasks: [
        {
          id: 'b1',
          text: 'Late Task',
          start: '2026-08-04',
          end: '2026-08-10',
          baselines: [{ id: 'bl1', baseStart: '2026-08-01', baseEnd: '2026-08-07' }],
        },
        {
          id: 'b2',
          text: 'Early Task',
          start: '2026-08-08',
          end: '2026-08-14',
          baselines: [{ id: 'bl2', baseStart: '2026-08-10', baseEnd: '2026-08-16' }],
        },
        {
          id: 'b3',
          text: 'On Track',
          start: '2026-08-18',
          end: '2026-08-24',
          baselines: [{ id: 'bl3', baseStart: '2026-08-18', baseEnd: '2026-08-24' }],
        },
      ],
      links: [],
      zoomLevels: BASE_ZOOM_LEVELS,
    },
    {
      type: 'text',
      className: 'text-sm font-semibold mt-4 mb-1',
      text: 'Custom toolbar region',
    },
    {
      type: 'gantt',
      testid: 'gantt-toolbar-region',
      tasks: [
        { id: 't1', text: 'Task One', start: '2026-08-01', end: '2026-08-06' },
      ],
      links: [],
      zoomLevels: BASE_ZOOM_LEVELS,
      toolbar: {
        type: 'flex',
        direction: 'row',
        gap: '2',
        body: [
          { type: 'text', text: 'Host toolbar region', testid: 'gantt-toolbar-region-text' },
        ],
      },
    },
    {
      type: 'text',
      className: 'text-sm font-semibold mt-4 mb-1',
      text: 'Custom task bar region',
    },
    {
      type: 'gantt',
      testid: 'gantt-taskbar-region',
      tasks: [
        { id: 'r1', text: 'Region Bar', start: '2026-08-01', end: '2026-08-08' },
      ],
      links: [],
      zoomLevels: BASE_ZOOM_LEVELS,
      taskBar: { type: 'text', text: '◆${$slot.task.text}◆', className: 'text-[10px] absolute left-1 top-0 leading-[28px]' },
    },
    {
      type: 'text',
      className: 'text-sm font-semibold mt-4 mb-1',
      text: 'Default zoom levels (no zoomLevels config)',
    },
    {
      type: 'gantt',
      testid: 'gantt-default-zoom',
      cellWidth: 40,
      tasks: [
        { id: 'dz1', text: 'Default Zoom Task', start: '2026-07-01', end: '2026-07-20' },
        { id: 'dz2', text: 'Second Span', start: '2026-08-01', end: '2026-09-15' },
      ],
      links: [{ id: 'dzl1', source: 'dz1', target: 'dz2', type: 'FS' }],
    },
    {
      type: 'text',
      className: 'text-sm font-semibold mt-4 mb-1',
      text: 'Custom column region',
    },
    {
      type: 'gantt',
      testid: 'gantt-column-region',
      tasks: [
        { id: 'c1', text: 'Column Region Task', start: '2026-08-02', end: '2026-08-09' },
        { id: 'c2', text: 'Second Task', start: '2026-08-10', end: '2026-08-16' },
      ],
      links: [{ id: 'cl1', source: 'c1', target: 'c2', type: 'FS' }],
      zoomLevels: BASE_ZOOM_LEVELS,
      columns: [
        { name: 'text', label: 'Task Name', width: 200 },
        { name: 'start', label: 'Start', width: 140 },
      ],
      start: { type: 'text', text: '≔ ${$slot.task.start}', testid: 'gantt-column-region-start' },
    },
  ],
};

export function GanttStatesDemoPage({ onBack }: GanttStatesDemoPageProps) {
  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-white shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-semibold">Gantt States — empty / loading / baselines / regions</h1>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <SchemaRenderer
          schemaUrl="gantt://states"
          schema={STATES_SCHEMA as React.ComponentProps<typeof SchemaRenderer>['schema']}
          registry={registry as React.ComponentProps<typeof SchemaRenderer>['registry']}
          env={env}
          formulaCompiler={formulaCompiler}
          data={{ isLoading: true }}
        />
      </div>
    </div>
  );
}
