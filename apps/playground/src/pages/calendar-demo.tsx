import { Button } from '@nop-chaos/ui';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import { registerSchedulingRenderers } from '@nop-chaos/flux-renderers-scheduling';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { ArrowLeft } from 'lucide-react';

interface CalendarDemoPageProps {
  onBack: () => void;
}

const registry = createDefaultRegistry();
registerSchedulingRenderers(registry);
const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

const env: RendererEnv = {
  fetcher: async function <T>(_req: { url: string }) {
    return { ok: true, status: 200, data: null as T };
  },
  notify: (level, msg) => console.log(`[${level}] ${msg}`),
};

const SHIFT_TYPES = ['shift', 'leave', 'appointment', 'maintenance'];

const SAMPLE_RESOURCES = [
  { id: 'r1', title: '张三', text: '张三', type: 'shift', color: '#4ade80' },
  { id: 'r2', title: '李四', text: '李四', type: 'shift', color: '#60a5fa' },
  { id: 'r3', title: '王五', text: '王五', type: 'shift', color: '#fbbf24' },
  { id: 'r4', title: '赵六', text: '赵六', type: 'shift', color: '#f87171' },
  { id: 'r5', title: '陈七', text: '陈七', type: 'shift', color: '#a78bfa' },
  { id: 'r6', title: '周八', text: '周八', type: 'leave', color: '#f472b6' },
  { id: 'r7', title: '吴九', text: '吴九', type: 'shift', color: '#34d399' },
  { id: 'r8', title: '郑十', text: '郑十', type: 'shift', color: '#fb923c' },
  { id: 'r9', title: '孙一', text: '孙一', type: 'maintenance', color: '#e879f9' },
  { id: 'r10', title: '刘二', text: '刘二', type: 'shift', color: '#22d3ee' },
];

function getRandomShiftType(): string {
  return SHIFT_TYPES[Math.floor(Math.random() * SHIFT_TYPES.length)];
}

function generateSampleEvents(): Array<{
  id: string;
  title: string;
  start: string;
  end: string;
  type: string;
  resourceId: string;
  color?: string;
}> {
  const events: Array<{
    id: string;
    title: string;
    start: string;
    end: string;
    type: string;
    resourceId: string;
    color?: string;
  }> = [];
  const startDate = new Date(Date.UTC(2026, 6, 1));
  const _endDate = new Date(Date.UTC(2026, 7, 31));

  const shiftNames: Record<string, string[]> = {
    shift: ['早班', '中班', '晚班'],
    leave: ['年假', '事假', '病假', '调休'],
    appointment: ['会议', '培训', '面试'],
    maintenance: ['设备检修', '系统维护', '巡检'],
  };

  let eventId = 1;
  for (const resource of SAMPLE_RESOURCES) {
    const numEvents = 5 + Math.floor(Math.random() * 8);
    for (let i = 0; i < numEvents; i++) {
      const dayOffset = Math.floor(Math.random() * 61);
      const eventDate = new Date(startDate);
      eventDate.setUTCDate(startDate.getUTCDate() + dayOffset);
      const duration = Math.random() > 0.7 ? 2 + Math.floor(Math.random() * 3) : 1;
      const endEventDate = new Date(eventDate);
      endEventDate.setUTCDate(eventDate.getUTCDate() + duration - 1);

      const type = getRandomShiftType();
      const names = shiftNames[type] ?? ['排班'];
      const title = names[Math.floor(Math.random() * names.length)];

      events.push({
        id: `e${eventId++}`,
        title,
        start: eventDate.toISOString().split('T')[0],
        end: endEventDate.toISOString().split('T')[0],
        type,
        resourceId: resource.id,
      });
    }
  }

  return events;
}

const SAMPLE_EVENTS = generateSampleEvents();

const SAMPLE_CALENDAR_SCHEMA = {
  type: 'calendar',
  view: 'month',
  date: '2026-07-20',
  showWeekends: true,
  maxConcurrent: 4,
  showCrossDayLines: true,
  events: SAMPLE_EVENTS,
  resources: SAMPLE_RESOURCES,
  onEventClick: { actionType: 'toast', args: { msg: '${event.title} - ${date}' } },
  onEventChange: { actionType: 'toast', args: { msg: '排班已更新: ${event.title}' } },
  onViewChange: { actionType: 'toast', args: { msg: '视图切换: ${view}' } },
  onDateChange: { actionType: 'toast', args: { msg: '日期变更: ${date}' } },
};

export function CalendarDemoPage({ onBack }: CalendarDemoPageProps) {
  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-white shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-semibold">Calendar Demo</h1>
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: '#4ade80' }} />
          早班
          <span className="inline-block w-3 h-3 rounded-sm ml-2" style={{ backgroundColor: '#f87171' }} />
          休假
          <span className="inline-block w-3 h-3 rounded-sm ml-2" style={{ backgroundColor: '#60a5fa' }} />
          预约
          <span className="inline-block w-3 h-3 rounded-sm ml-2" style={{ backgroundColor: '#fbbf24' }} />
          维保
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <SchemaRenderer
          schemaUrl="calendar://demo"
          schema={SAMPLE_CALENDAR_SCHEMA as React.ComponentProps<typeof SchemaRenderer>['schema']}
          registry={registry as React.ComponentProps<typeof SchemaRenderer>['registry']}
          env={env}
          formulaCompiler={formulaCompiler}
        />
      </div>
    </div>
  );
}
