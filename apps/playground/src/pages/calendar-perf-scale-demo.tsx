import { Button } from '@nop-chaos/ui';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import { registerSchedulingRenderers } from '@nop-chaos/flux-renderers-scheduling';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { ArrowLeft } from 'lucide-react';

interface CalendarPerfScalePageProps {
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

function generateScaleResources(count: number) {
  const names = ['张', '李', '王', '赵', '陈', '刘', '周', '吴', '郑', '孙'];
  return Array.from({ length: count }, (_, i) => ({
    id: `r${i + 1}`,
    title: `${names[i % names.length]}${Math.floor(i / names.length) + 1}`,
    text: `${names[i % names.length]}${Math.floor(i / names.length) + 1}`,
    type: SHIFT_TYPES[i % SHIFT_TYPES.length],
    color: ['#4ade80', '#60a5fa', '#fbbf24', '#f87171'][i % 4],
  }));
}

function generateScaleEvents(resources: { id: string }[], days: number, eventsPerResource: number) {
  const events: Array<{
    id: string;
    title: string;
    start: string;
    end: string;
    type: string;
    resourceId: string;
  }> = [];
  const startDate = new Date(Date.UTC(2026, 6, 1));
  const shiftNames: Record<string, string[]> = {
    shift: ['早班', '中班', '晚班'],
    leave: ['年假', '事假', '病假', '调休'],
    appointment: ['会议', '培训', '面试'],
    maintenance: ['设备检修', '系统维护', '巡检'],
  };

  let eventId = 1;
  for (const resource of resources) {
    for (let i = 0; i < eventsPerResource; i++) {
      const dayOffset = Math.floor(Math.random() * days);
      const eventDate = new Date(startDate);
      eventDate.setUTCDate(startDate.getUTCDate() + dayOffset);
      const duration = Math.random() > 0.7 ? 2 + Math.floor(Math.random() * 3) : 1;
      const endEventDate = new Date(eventDate);
      endEventDate.setUTCDate(eventDate.getUTCDate() + duration - 1);

      const type = SHIFT_TYPES[Math.floor(Math.random() * SHIFT_TYPES.length)];
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

const RESOURCE_COUNT = 300;
const DAYS = 31;
const EVENTS_PER_RESOURCE = 5;

const SCALE_RESOURCES = generateScaleResources(RESOURCE_COUNT);
const SCALE_EVENTS = generateScaleEvents(SCALE_RESOURCES, DAYS, EVENTS_PER_RESOURCE);

const SCALE_CALENDAR_SCHEMA = {
  type: 'calendar',
  view: 'month',
  date: '2026-07-20',
  showWeekends: true,
  maxConcurrent: 4,
  showCrossDayLines: true,
  events: SCALE_EVENTS,
  resources: SCALE_RESOURCES,
  onEventClick: { actionType: 'toast', args: { msg: '${event.title} - ${date}' } },
  onEventChange: { actionType: 'toast', args: { msg: '排班已更新: ${event.title}' } },
};

export function CalendarPerfScaleDemoPage({ onBack }: CalendarPerfScalePageProps) {
  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-white shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-semibold">Calendar Performance Scale (300×31)</h1>
        <div className="flex-1" />
      </div>
      <div className="flex-1 min-h-0">
        <SchemaRenderer
          schemaUrl="calendar://perf-scale"
          schema={SCALE_CALENDAR_SCHEMA as React.ComponentProps<typeof SchemaRenderer>['schema']}
          registry={registry as React.ComponentProps<typeof SchemaRenderer>['registry']}
          env={env}
          formulaCompiler={formulaCompiler}
        />
      </div>
    </div>
  );
}
