import { Button } from '@nop-chaos/ui';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import { registerSchedulingRenderers } from '@nop-chaos/flux-renderers-scheduling';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { ArrowLeft } from 'lucide-react';

interface KanbanPerfScalePageProps {
  onBack: () => void;
}

const registry = createDefaultRegistry();
registerSchedulingRenderers(registry);
const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

const env: RendererEnv = {
  fetcher: async function <T>(req: { url: string }) {
    console.log('[KANBAN] fetcher:', req.url);
    return { ok: true, status: 200, data: null as T };
  },
  notify: (level, msg) => console.log(`[${level}] ${msg}`),
};

const COLUMN_COUNT = 20;
const CARDS_PER_COLUMN = 300;

const columnNames = [
  '待办', '进行中', '评审中', '已完成', '阻塞',
  '计划中', '开发中', '测试中', '已发布', '待回归',
  '设计中', '原型中', '已验证', '待部署', '已归档',
  '需求池', '待排期', '已排期', '待验收', '已关闭',
];

const taskPrefixes = ['优化', '修复', '重构', '升级', '迁移', '集成', '配置', '调研', '实现', '设计'];

const taskSuffixes = [
  '用户中心模块', '权限管理', '数据导出功能', '报表系统', '消息通知',
  '搜索功能', '缓存策略', '日志系统', '监控告警', 'CI/CD流水线',
  'API网关', '统一认证', '配置中心', '任务调度', '文件存储',
  '邮件服务', '短信通道', '支付模块', '订单系统', '库存管理',
];

function generateScaleKanbanData() {
  const data: Record<string, {
    id: string;
    type: string;
    parentId?: string;
    children: string[];
    data: Record<string, string>;
    meta: Record<string, string | number | undefined>;
  }> = {};

  const rootChildren: string[] = [];
  const columnColors = [
    '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444',
    '#6366f1', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
    '#06b6d4', '#d946ef', '#22c55e', '#eab308', '#64748b',
    '#a855f7', '#0ea5e9', '#f43f5e', '#65a30d', '#0284c7',
  ];

  let cardId = 1;

  for (let col = 0; col < COLUMN_COUNT; col++) {
    const colId = `col-${col + 1}`;
    rootChildren.push(colId);

    const cardChildren: string[] = [];

    for (let card = 0; card < CARDS_PER_COLUMN; card++) {
      const cardIdStr = `card-${cardId++}`;
      cardChildren.push(cardIdStr);

      const prefix = taskPrefixes[Math.floor(Math.random() * taskPrefixes.length)];
      const suffix = taskSuffixes[Math.floor(Math.random() * taskSuffixes.length)];

      data[cardIdStr] = {
        id: cardIdStr,
        type: 'card',
        parentId: colId,
        children: [],
        data: {
          title: `${prefix}${suffix}`,
          description: `第${col + 1}列第${card + 1}项任务的详细描述`,
          type: Math.random() > 0.5 ? 'task' : 'bug',
        },
        meta: {
          priority: (card % 3) + 1,
          color: columnColors[col % columnColors.length],
        },
      };
    }

    data[colId] = {
      id: colId,
      type: 'column',
      parentId: 'root',
      children: cardChildren,
      data: { title: columnNames[col % columnNames.length] },
      meta: { color: columnColors[col % columnColors.length] },
    };
  }

  data.root = {
    id: 'root',
    type: 'root',
    children: rootChildren,
    data: {},
    meta: {},
  };

  return data;
}

const SCALE_KANBAN_DATA = generateScaleKanbanData();

const SCALE_KANBAN_SCHEMA = {
  type: 'kanban',
  data: SCALE_KANBAN_DATA,
  draggable: true,
  columnWidth: 280,
  headerClassName: '',
};

export function KanbanPerfScaleDemoPage({ onBack }: KanbanPerfScalePageProps) {
  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-white shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-semibold">Kanban Performance Scale (20×300)</h1>
      </div>
      <div className="flex-1 min-h-0">
        <SchemaRenderer
          schemaUrl="kanban://perf-scale"
          schema={SCALE_KANBAN_SCHEMA as React.ComponentProps<typeof SchemaRenderer>['schema']}
          registry={registry as React.ComponentProps<typeof SchemaRenderer>['registry']}
          env={env}
          formulaCompiler={formulaCompiler}
        />
      </div>
    </div>
  );
}
