import { Button, Card, CardContent, CardHeader, cn } from '@nop-chaos/ui';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import { registerGraphRenderers } from '@nop-chaos/flux-renderers-graph';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { ArrowLeft } from 'lucide-react';

interface GraphDemoPageProps {
  onBack: () => void;
}

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerContentRenderers(registry);
registerGraphRenderers(registry);
const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

const env: RendererEnv = {
  fetcher: async function <T>(_req: { url: string }) {
    return { ok: true, status: 200, data: null as T };
  },
  notify: (level, msg) => console.log(`[${level}] ${msg}`),
};

const TRACE_NODES = [
  { id: 'root', label: 'Agent Plan', type: 'agent', level: 'info' },
  { id: 'search', label: 'Web Search', type: 'tool_call', level: 'info' },
  { id: 'extract', label: 'Extract Entities', type: 'model_call', level: 'info' },
  { id: 'policy', label: 'Policy Check', type: 'policy_call', level: 'warning' },
  { id: 'error', label: 'API Call', type: 'tool_call', level: 'error' },
  { id: 'reply', label: 'Compose Reply', type: 'model_call', level: 'success' },
];

const TRACE_EDGES = [
  { source: 'root', target: 'search' },
  { source: 'root', target: 'extract' },
  { source: 'search', target: 'extract' },
  { source: 'extract', target: 'policy' },
  { source: 'extract', target: 'error' },
  { source: 'policy', target: 'reply' },
  { source: 'error', target: 'reply' },
];

const DEMO_TRACE_SCHEMA = {
  type: 'flex',
  direction: 'row',
  gap: 'sm',
  items: [
    {
      type: 'graph',
      id: 'demoTraceGraph',
      label: 'Trace 执行流',
      nodes: TRACE_NODES,
      edges: TRACE_EDGES,
      layout: 'hierarchy',
      orientation: 'LR',
      searchable: true,
      showControls: true,
      selectable: true,
      className: 'h-96 flex-1',
      node: {
        type: 'container',
        className: 'min-w-40 rounded-md p-2',
        body: {
          type: 'flex',
          direction: 'column',
          gap: 'sm',
          items: [
            {
              type: 'text',
              text: '${$slot.node.label}',
              className: 'text-sm font-medium',
            },
            {
              type: 'badge',
              level: "${$slot.node.level === 'error' ? 'danger' : $slot.node.level === 'warning' ? 'warning' : $slot.node.level === 'success' ? 'success' : 'info'}",
              text: '${$slot.node.type}',
            },
          ],
        },
      },
      onSelectionChange: {
        action: 'setValue',
        args: { path: 'selectedNode', value: '${event.node}' },
      },
    },
    {
      type: 'flex',
      direction: 'column',
      gap: 'sm',
      items: [
        {
          type: 'button',
          label: 'Focus Error Node',
          onClick: {
            action: 'component:focusNode',
            componentId: 'demoTraceGraph',
            args: { nodeId: 'error' },
          },
        },
        {
          type: 'button',
          label: 'Focus Missing Node',
          onClick: {
            action: 'component:focusNode',
            componentId: 'demoTraceGraph',
            args: { nodeId: 'ghost' },
          },
        },
        {
          type: 'button',
          label: 'Set Hierarchy Layout',
          onClick: {
            action: 'component:setLayout',
            componentId: 'demoTraceGraph',
            args: { layout: 'hierarchy' },
          },
        },
        {
          type: 'button',
          label: 'Set Flow Layout',
          onClick: {
            action: 'component:setLayout',
            componentId: 'demoTraceGraph',
            args: { layout: 'flow' },
          },
        },
        {
          type: 'button',
          label: 'Search "call"',
          onClick: {
            action: 'component:search',
            componentId: 'demoTraceGraph',
            args: { keyword: 'call' },
          },
        },
      ],
    },
  ],
};

const FLOW_LAYOUT_SCHEMA = {
  type: 'graph',
  id: 'demoFlowGraph',
  label: 'Flow 自由布局',
  nodes: TRACE_NODES,
  edges: TRACE_EDGES,
  layout: 'flow',
  searchable: false,
  showControls: true,
  levelMap: { error: 'danger', warning: 'warning', success: 'success', info: 'info' },
};

const MALFORMED_SCHEMA = {
  type: 'graph',
  id: 'demoMalformedGraph',
  label: '畸形数据',
  nodes: [{ id: 'a', label: 'Alive', type: 'node', level: 'info' }],
  // 悬垂边引用不存在的节点 → 跳过 + dev 告警；其余正常渲染
  edges: [
    { source: 'a', target: 'ghost' },
    { source: 'ghost', target: 'another-ghost' },
  ],
  layout: 'flow',
  searchable: false,
  showControls: false,
};

const EMPTY_SCHEMA = {
  type: 'graph',
  id: 'demoEmptyGraph',
  label: '空数据',
  nodes: [],
  edges: [],
  layout: 'flow',
  searchable: false,
  showControls: false,
};

function DemoSchemaCard(props: {
  title: string;
  description: string;
  schema: unknown;
  className?: string;
}) {
  return (
    <Card className={cn('flex flex-col', props.className)}>
      <CardHeader>
        <h2 className="text-sm font-medium">{props.title}</h2>
        <p className="text-xs text-muted-foreground">{props.description}</p>
      </CardHeader>
      <CardContent className="min-h-80 flex-1">
        <SchemaRenderer
          schemaUrl={`graph://demo-${props.title}`}
          schema={props.schema as never}
          registry={registry as never}
          env={env}
          formulaCompiler={formulaCompiler}
        />
      </CardContent>
    </Card>
  );
}

export function GraphDemoPage({ onBack }: GraphDemoPageProps) {
  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-white shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-semibold">Graph Viewer Demo</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <DemoSchemaCard
            title="Trace Hierarchy"
            description="dagre LR 分层 + 搜索 + 单选联动（onSelectionChange 落 scope）+ node region"
            schema={DEMO_TRACE_SCHEMA}
            className="h-[420px]"
          />
          <DemoSchemaCard
            title="Flow Layout"
            description="flow 自由布局 + 内置控制条（zoom±/fitView/layout 切换）+ levelMap 语义色"
            schema={FLOW_LAYOUT_SCHEMA}
            className="h-[420px]"
          />
          <DemoSchemaCard
            title="Malformed Data"
            description="悬垂边引用缺失节点 → 跳过 + dev 告警，渲染不抛错"
            schema={MALFORMED_SCHEMA}
            className="h-[280px]"
          />
          <DemoSchemaCard
            title="Empty Data"
            description="nodes/edges 均空 → empty slot（缺省 noData）"
            schema={EMPTY_SCHEMA}
            className="h-[280px]"
          />
        </div>
      </div>
    </div>
  );
}
