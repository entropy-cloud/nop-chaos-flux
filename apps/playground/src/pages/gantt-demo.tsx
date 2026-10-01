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
    return { status: 0, data: null as T };
  },
  notify: (level, msg) => console.log(`[${level}] ${msg}`),
};


// ux-r8 GT-1：演示日期相对今天动态生成——打开即与"今天"相关（静态 2026-07/08 日期
// 使初始视口与当前时间脱节）
const TODAY = new Date();
function iso(offsetDays: number): string {
  const d = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + offsetDays);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

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
      start: iso(0),
      end: iso(60),
      progress: 40,
      children: [
        {
          id: '2',
          text: 'Requirements',
          start: iso(0),
          end: iso(9),
          progress: 100,
          parent: '1',
        },
        {
          id: '3',
          text: 'Design',
          start: iso(10),
          end: iso(24),
          progress: 70,
          parent: '1',
        },
        {
          id: '4',
          text: 'Development',
          start: iso(25),
          end: iso(45),
          progress: 30,
          parent: '1',
          children: [
            {
              id: '5',
              text: 'Frontend',
              start: iso(25),
              end: iso(35),
              progress: 40,
              parent: '4',
            },
            {
              id: '6',
              text: 'Backend',
              start: iso(25),
              end: iso(40),
              progress: 25,
              parent: '4',
            },
            {
              id: '7',
              text: 'API Integration',
              start: iso(31),
              end: iso(45),
              progress: 10,
              parent: '4',
            },
          ],
        },
        {
          id: '8',
          text: 'Testing',
          start: iso(46),
          end: iso(55),
          progress: 0,
          parent: '1',
        },
        {
          id: '9',
          text: 'Deployment',
          type: 'milestone',
          start: iso(60),
          end: iso(60),
          parent: '1',
        },
      ],
    },
    {
      id: '10',
      text: 'Project Beta',
      type: 'project',
      start: iso(14),
      end: iso(76),
      progress: 20,
      children: [
        {
          id: '11',
          text: 'Research',
          start: iso(14),
          end: iso(30),
          progress: 60,
          parent: '10',
        },
        {
          id: '12',
          text: 'Prototype',
          start: iso(31),
          end: iso(50),
          progress: 10,
          parent: '10',
        },
        {
          id: '13',
          text: 'Review',
          type: 'milestone',
          start: iso(50),
          end: iso(50),
          parent: '10',
        },
        {
          id: '14',
          text: 'Production',
          start: iso(51),
          end: iso(76),
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
