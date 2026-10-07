import { Button, toast } from '@nop-chaos/ui';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import { createActionScope } from '@nop-chaos/flux-runtime';
import { registerSchedulingRenderers } from '@nop-chaos/flux-renderers-scheduling';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { ArrowLeft } from 'lucide-react';
import { useMemo, useState } from 'react';

interface CalendarDemoPageProps {
  onBack: () => void;
}

const registry = createDefaultRegistry();
registerSchedulingRenderers(registry);
const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

const env: RendererEnv = {
  fetcher: async function <T>(_req: { url: string }) {
    return { status: 0, data: null as T };
  },
  notify: (level, msg) => {
    const text = typeof msg === 'string' ? msg : String(msg ?? '');
    if (level === 'error') toast.error(text);
    else if (level === 'success') toast.success(text);
    else toast.info(text);
  },
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
  // ux-r8 CA-1：事件锚定今天（当月前后各铺 ~30 天），打开即见排班内容
  const now = new Date();
  const startDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  startDate.setUTCDate(startDate.getUTCDate() - 15);

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

const SAMPLE_CALENDAR_SCHEMA_BASE = {
  type: 'calendar',
  view: 'month',
  // ux-r8 CA-1：不传固定历史日期 → 打开即当前月；CA-2：locale 中文化周表头
  locale: 'zh-CN',
  showWeekends: true,
  maxConcurrent: 4,
  showCrossDayLines: true,
  resources: SAMPLE_RESOURCES,
  onEventClick: { action: 'showToast', args: { message: '${event.title} - ${date}' } },
  onViewChange: { action: 'showToast', args: { message: '视图切换: ${view}' } },
  onDateChange: { action: 'showToast', args: { message: '日期变更: ${date}' } },
};

function shiftIsoDate(iso: string, dayDelta: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dayDelta);
  return d.toISOString().split('T')[0];
}

export function CalendarDemoPage({ onBack }: CalendarDemoPageProps) {
  // plan 546 seed-4 (V3): events are component state — a confirmed drag-move
  // must actually move the event (pre-fix: module-level constant + toast only,
  // so the confirm dialog produced zero state change).
  const [events, setEvents] = useState(SAMPLE_EVENTS);
  // SchemaRenderer compiles static schema data once per mount (page runtime is
  // created a single time), so event mutations need a remount to reach the
  // renderer. Bump on every confirmed mutation; view state resets to the
  // month view centered on today, which is acceptable for the demo surface.
  // Framework-level dynamic-schema propagation is registered as a watch
  // finding (plan 546).
  const [rendererRevision, setRendererRevision] = useState(0);

  const actionScope = useMemo(() => {
    const scope = createActionScope({ id: 'calendar-demo-page-action-scope' });
    scope.registerNamespace('calendarDemo', {
      kind: 'host',
      listMethods() {
        return ['move', 'create'];
      },
      invoke(method: string, payload: unknown) {
        const p = (payload ?? {}) as {
          eventId?: string;
          fromDate?: string;
          toDate?: string;
          toResource?: string;
          event?: { title?: string };
        };
        if (method === 'move') {
          const dayDelta = p.fromDate && p.toDate ? (Date.parse(p.toDate) - Date.parse(p.fromDate)) / 86_400_000 : 0;
          setEvents((prev) =>
            prev.map((e) =>
              e.id === p.eventId
                ? { ...e, start: shiftIsoDate(e.start, dayDelta), end: shiftIsoDate(e.end, dayDelta), resourceId: p.toResource ?? e.resourceId }
                : e,
            ),
          );
          toast.success(`排班已更新: ${p.event?.title ?? ''}`);
          setRendererRevision((r) => r + 1);
          return { ok: true };
        }
        if (method === 'create') {
          const created = p.event as { id?: string; title?: string } | undefined;
          if (created) {
            setEvents((prev) => [...prev, { ...(created as (typeof prev)[number]) , id: created.id ?? `new-${prev.length + 1}` }]);
          }
          toast.success(`已创建排班: ${created?.title ?? ''}`);
          setRendererRevision((r) => r + 1);
          return { ok: true };
        }
        return { ok: false, error: new Error(`Unknown calendarDemo method: ${method}`) };
      },
    });
    return scope;
  }, []);

  const schema = useMemo(
    () => ({
      ...SAMPLE_CALENDAR_SCHEMA_BASE,
      events,
      onEventChange: { action: 'calendarDemo:move' },
      onEventCreate: { action: 'calendarDemo:create' },
    }),
    [events],
  );

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
          key={rendererRevision}
          schemaUrl="calendar://demo"
          schema={schema as React.ComponentProps<typeof SchemaRenderer>['schema']}
          registry={registry as React.ComponentProps<typeof SchemaRenderer>['registry']}
          env={env}
          formulaCompiler={formulaCompiler}
          actionScope={actionScope}
        />
      </div>
    </div>
  );
}
