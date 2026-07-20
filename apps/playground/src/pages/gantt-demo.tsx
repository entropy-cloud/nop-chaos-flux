import { Button } from '@nop-chaos/ui';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import { registerSchedulingRenderers } from '@nop-chaos/flux-renderers-scheduling';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { ArrowLeft } from 'lucide-react';

interface GanttDemoPageProps {
  onBack: () => void;
}

const registry = createDefaultRegistry();
registerSchedulingRenderers(registry);
const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

const env: RendererEnv = {
  fetcher: async function <T>(req: { url: string }) {
    console.log('[GANTT] fetcher:', req.url);
    return { ok: true, status: 200, data: null as T };
  },
  notify: (level, msg) => console.log(`[${level}] ${msg}`),
};

const SAMPLE_GANTT_SCHEMA = {
  type: 'gantt',
  cellWidth: 40,
  defaultZoom: 'week',
  taskBarHeight: 28,
  showWeekends: true,
  showToday: true,
  draggable: true,
  editable: true,
  linkable: true,
  tasks: [
    {
      id: '1',
      text: 'Project Alpha',
      type: 'project',
      start: '2026-07-01',
      end: '2026-08-30',
      progress: 40,
      children: [
        {
          id: '2',
          text: 'Requirements',
          start: '2026-07-01',
          end: '2026-07-10',
          progress: 100,
          parent: '1',
        },
        {
          id: '3',
          text: 'Design',
          start: '2026-07-11',
          end: '2026-07-25',
          progress: 70,
          parent: '1',
        },
        {
          id: '4',
          text: 'Development',
          start: '2026-07-26',
          end: '2026-08-15',
          progress: 30,
          parent: '1',
          children: [
            {
              id: '5',
              text: 'Frontend',
              start: '2026-07-26',
              end: '2026-08-05',
              progress: 40,
              parent: '4',
            },
            {
              id: '6',
              text: 'Backend',
              start: '2026-07-26',
              end: '2026-08-10',
              progress: 25,
              parent: '4',
            },
            {
              id: '7',
              text: 'API Integration',
              start: '2026-08-01',
              end: '2026-08-15',
              progress: 10,
              parent: '4',
            },
          ],
        },
        {
          id: '8',
          text: 'Testing',
          start: '2026-08-16',
          end: '2026-08-25',
          progress: 0,
          parent: '1',
        },
        {
          id: '9',
          text: 'Deployment',
          type: 'milestone',
          start: '2026-08-30',
          end: '2026-08-30',
          parent: '1',
        },
      ],
    },
    {
      id: '10',
      text: 'Project Beta',
      type: 'project',
      start: '2026-07-15',
      end: '2026-09-15',
      progress: 20,
      children: [
        {
          id: '11',
          text: 'Research',
          start: '2026-07-15',
          end: '2026-07-31',
          progress: 60,
          parent: '10',
        },
        {
          id: '12',
          text: 'Prototype',
          start: '2026-08-01',
          end: '2026-08-20',
          progress: 10,
          parent: '10',
        },
        {
          id: '13',
          text: 'Review',
          type: 'milestone',
          start: '2026-08-20',
          end: '2026-08-20',
          parent: '10',
        },
        {
          id: '14',
          text: 'Production',
          start: '2026-08-21',
          end: '2026-09-15',
          progress: 0,
          parent: '10',
        },
      ],
    },
  ],
  links: [
    { id: 'l1', source: '2', target: '3', type: 'FS' },
    { id: 'l2', source: '3', target: '4', type: 'FS' },
    { id: 'l3', source: '5', target: '6', type: 'FS' },
    { id: 'l4', source: '6', target: '7', type: 'FS' },
    { id: 'l5', source: '4', target: '8', type: 'FS' },
    { id: 'l6', source: '8', target: '9', type: 'FS' },
    { id: 'l7', source: '11', target: '12', type: 'FS' },
    { id: 'l8', source: '12', target: '13', type: 'FS' },
    { id: 'l9', source: '13', target: '14', type: 'FS' },
  ],
  columns: [
    { name: 'text', label: 'Task Name', width: 240 },
    { name: 'start', label: 'Start', width: 100 },
    { name: 'end', label: 'End', width: 100 },
    { name: 'duration', label: 'Days', width: 60 },
    { name: 'predecessor', label: 'Dependencies', width: 100 },
  ],
  zoomLevels: [
    { key: 'day', label: 'Day', minCellWidth: 60, scales: [{ unit: 'day', step: 1, format: '%d' }, { unit: 'month', format: '%Y/%m' }] },
    { key: 'week', label: 'Week', minCellWidth: 30, scales: [{ unit: 'week', format: 'W%V' }, { unit: 'month', format: '%Y/%m' }] },
    { key: 'month', label: 'Month', minCellWidth: 12, scales: [{ unit: 'month', format: '%Y/%m' }, { unit: 'year', format: '%Y' }] },
  ],
};

export function GanttDemoPage({ onBack }: GanttDemoPageProps) {
  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-white shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-semibold">Gantt Chart Demo</h1>
      </div>
      <div className="flex-1 min-h-0">
        <SchemaRenderer
          schemaUrl="gantt://demo"
          schema={SAMPLE_GANTT_SCHEMA as React.ComponentProps<typeof SchemaRenderer>['schema']}
          registry={registry as React.ComponentProps<typeof SchemaRenderer>['registry']}
          env={env}
          formulaCompiler={formulaCompiler}
        />
      </div>
    </div>
  );
}
