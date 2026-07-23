import { Button } from '@nop-chaos/ui';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import { registerSchedulingRenderers } from '@nop-chaos/flux-renderers-scheduling';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { ArrowLeft } from 'lucide-react';

interface GanttPerfScalePageProps {
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

const TASK_COUNT = 500;
const LINK_COUNT = 2000;

const taskPrefixes = [
  '设计', '开发', '测试', '部署', '优化', '重构', '修复', '升级', '迁移', '集成',
];

const taskSuffixes = [
  '用户中心', '权限管理', '数据导出', '报表系统', '消息通知',
  '搜索功能', '缓存策略', '日志系统', '监控告警', 'CI/CD流水线',
  'API网关', '统一认证', '配置中心', '任务调度', '文件存储',
  '邮件服务', '短信通道', '支付模块', '订单系统', '库存管理',
];

function generateGanttScaleData() {
  const startDate = new Date(Date.UTC(2026, 6, 1));
  const tasks: Array<Record<string, unknown>> = [];
  const links: Array<Record<string, unknown>> = [];

  let linkId = 1;
  let taskId = 1;

  const parentCount = 25;
  const childrenPerParent = Math.floor(TASK_COUNT / parentCount);

  for (let p = 0; p < parentCount; p++) {
    const parentId = `p${p + 1}`;
    const parentStart = new Date(startDate);
    parentStart.setUTCDate(startDate.getUTCDate() + p * 4);
    const parentEnd = new Date(parentStart);
    parentEnd.setUTCDate(parentStart.getUTCDate() + 25);

    const childIndexStart = taskId;
    const childIds: string[] = [];

    for (let c = 0; c < childrenPerParent; c++) {
      const childId = `t${taskId}`;
      childIds.push(childId);
      const childStart = new Date(parentStart);
      childStart.setUTCDate(childStart.getUTCDate() + c * 2);
      const childEnd = new Date(childStart);
      childEnd.setUTCDate(childStart.getUTCDate() + 1 + Math.floor(Math.random() * 5));

      const prefix = taskPrefixes[Math.floor(Math.random() * taskPrefixes.length)];
      const suffix = taskSuffixes[Math.floor(Math.random() * taskSuffixes.length)];

      tasks.push({
        id: childId,
        text: `${prefix}${suffix} #${c + 1}`,
        start: childStart.toISOString().split('T')[0],
        end: childEnd.toISOString().split('T')[0],
        progress: Math.floor(Math.random() * 100),
        parent: parentId,
      });

      taskId++;
    }

    tasks.unshift({
      id: parentId,
      text: `Project ${String.fromCharCode(65 + p)}`,
      type: 'project',
      start: parentStart.toISOString().split('T')[0],
      end: parentEnd.toISOString().split('T')[0],
      progress: Math.floor(Math.random() * 100),
    });

    for (let c = childIndexStart; c < taskId - 1 && links.length < LINK_COUNT; c++) {
      const sourceId = `t${c}`;
      const targetId = `t${c + 1}`;
      links.push({
        id: `l${linkId++}`,
        source: sourceId,
        target: targetId,
        type: 'FS',
      });
    }

    if (p > 0 && links.length < LINK_COUNT) {
      const crossParentSource = `t${childIndexStart}`;
      const prevParentLastChild = `t${childIndexStart - 1}`;
      links.push({
        id: `l${linkId++}`,
        source: prevParentLastChild,
        target: crossParentSource,
        type: 'FS',
      });
    }
  }

  while (links.length < LINK_COUNT) {
    const sourceIdx = Math.floor(Math.random() * TASK_COUNT);
    let targetIdx = Math.floor(Math.random() * TASK_COUNT);
    if (targetIdx === sourceIdx) {
      targetIdx = (targetIdx + 1) % TASK_COUNT;
    }
    const sourceTask = tasks.find(t => t.id === `t${sourceIdx + 1}`);
    const targetTask = tasks.find(t => t.id === `t${targetIdx + 1}`);
    if (sourceTask && targetTask && sourceTask.id !== targetTask.id) {
      links.push({
        id: `l${linkId++}`,
        source: sourceTask.id,
        target: targetTask.id,
        type: 'FS',
      });
    }
  }

  return { tasks, links };
}

const SCALE_GANTT_DATA = generateGanttScaleData();

const SCALE_GANTT_SCHEMA = {
  type: 'gantt',
  cellWidth: 40,
  defaultZoom: 'month',
  taskBarHeight: 28,
  showWeekends: true,
  showToday: true,
  draggable: true,
  editable: true,
  linkable: true,
  tasks: SCALE_GANTT_DATA.tasks,
  links: SCALE_GANTT_DATA.links,
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

export function GanttPerfScaleDemoPage({ onBack }: GanttPerfScalePageProps) {
  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-white shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-semibold">Gantt Performance Scale (500 tasks / 2000 links)</h1>
      </div>
      <div className="flex-1 min-h-0">
        <SchemaRenderer
          schemaUrl="gantt://perf-scale"
          schema={SCALE_GANTT_SCHEMA as React.ComponentProps<typeof SchemaRenderer>['schema']}
          registry={registry as React.ComponentProps<typeof SchemaRenderer>['registry']}
          env={env}
          formulaCompiler={formulaCompiler}
        />
      </div>
    </div>
  );
}
