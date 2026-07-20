import { Button } from '@nop-chaos/ui';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import { registerSchedulingRenderers } from '@nop-chaos/flux-renderers-scheduling';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { ArrowLeft } from 'lucide-react';

interface KanbanDemoPageProps {
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

const SAMPLE_KANBAN_DATA = {
  root: {
    id: 'root',
    type: 'root',
    children: ['col-todo', 'col-progress', 'col-done', 'col-review'],
    data: {},
    meta: {},
  },
  'col-todo': {
    id: 'col-todo',
    type: 'column',
    parentId: 'root',
    children: ['card-1', 'card-2', 'card-3'],
    data: { title: '待办' },
    meta: { color: '#3b82f6' },
  },
  'col-progress': {
    id: 'col-progress',
    type: 'column',
    parentId: 'root',
    children: ['card-4', 'card-5'],
    data: { title: '进行中' },
    meta: { color: '#f59e0b' },
  },
  'col-done': {
    id: 'col-done',
    type: 'column',
    parentId: 'root',
    children: ['card-6', 'card-7', 'card-8'],
    data: { title: '已完成' },
    meta: { color: '#10b981' },
  },
  'col-review': {
    id: 'col-review',
    type: 'column',
    parentId: 'root',
    children: [],
    data: { title: '评审中' },
    meta: { color: '#8b5cf6' },
  },
  'card-1': {
    id: 'card-1',
    type: 'card',
    parentId: 'col-todo',
    children: [],
    data: { title: '需求分析', description: '完成用户需求调研和功能规格编写', type: 'task' },
    meta: { priority: 1, color: '#3b82f6' },
  },
  'card-2': {
    id: 'card-2',
    type: 'card',
    parentId: 'col-todo',
    children: [],
    data: { title: 'UI 设计评审', description: '审查首页和登录页的交互设计稿', type: 'task' },
    meta: { priority: 2, color: '#8b5cf6' },
  },
  'card-3': {
    id: 'card-3',
    type: 'card',
    parentId: 'col-todo',
    children: [],
    data: { title: '数据库设计', description: '设计核心业务表结构', type: 'task' },
    meta: { priority: 1, color: '#ef4444' },
  },
  'card-4': {
    id: 'card-4',
    type: 'card',
    parentId: 'col-progress',
    children: [],
    data: { title: 'API 开发', description: '实现用户模块 RESTful API', type: 'task' },
    meta: { priority: 1, color: '#f59e0b' },
  },
  'card-5': {
    id: 'card-5',
    type: 'card',
    parentId: 'col-progress',
    children: [],
    data: { title: '前端框架搭建', description: '配置构建工具、路由、状态管理', type: 'task' },
    meta: { priority: 2, color: '#10b981' },
  },
  'card-6': {
    id: 'card-6',
    type: 'card',
    parentId: 'col-done',
    children: [],
    data: { title: '技术选型文档', description: '确定技术栈和开发规范' },
    meta: { priority: 3 },
  },
  'card-7': {
    id: 'card-7',
    type: 'card',
    parentId: 'col-done',
    children: [],
    data: { title: '项目初始化', description: '创建仓库、搭建 CI/CD 流水线' },
    meta: { priority: 3 },
  },
  'card-8': {
    id: 'card-8',
    type: 'card',
    parentId: 'col-done',
    children: [],
    data: { title: '环境配置', description: '配置开发/测试/生产环境' },
    meta: { priority: 3 },
  },
};

const SAMPLE_KANBAN_SCHEMA = {
  type: 'kanban',
  data: SAMPLE_KANBAN_DATA,
  draggable: true,
  columnWidth: 280,
};

export function KanbanDemoPage({ onBack }: KanbanDemoPageProps) {
  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-white shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-semibold">Kanban Board Demo</h1>
      </div>
      <div className="flex-1 min-h-0">
        <SchemaRenderer
          schemaUrl="kanban://demo"
          schema={SAMPLE_KANBAN_SCHEMA as React.ComponentProps<typeof SchemaRenderer>['schema']}
          registry={registry as React.ComponentProps<typeof SchemaRenderer>['registry']}
          env={env}
          formulaCompiler={formulaCompiler}
        />
      </div>
    </div>
  );
}
