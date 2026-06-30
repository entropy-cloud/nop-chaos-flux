import { useMemo } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { Button, toast, Toaster } from '@nop-chaos/ui';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { registerLayoutRenderers } from '@nop-chaos/flux-renderers-layout';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';

interface M4DataDisplayDemoPageProps {
  onBack: () => void;
}

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerDataRenderers(registry);
registerLayoutRenderers(registry);
registerContentRenderers(registry);

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

const env: RendererEnv = {
  fetcher: async function <T>() {
    return { ok: true, status: 200, data: null as T };
  },
  notify: (level, message) => {
    const text = typeof message === 'string' ? message : String(message ?? '');
    if (level === 'error') toast.error(text || 'Error');
    else if (level === 'success') toast.success(text || 'Success');
    else if (level === 'warning') toast.warning?.(text || 'Warning');
    else toast.info?.(text || 'Info');
  },
};

const ROWS = [
  { id: '1', name: 'Alice', department: 'Engineering', role: 'Lead', salary: 12000 },
  { id: '2', name: 'Bob', department: 'Sales', role: 'Manager', salary: 9000 },
  { id: '3', name: 'Carol', department: 'Engineering', role: 'Senior', salary: 10000 },
  { id: '4', name: 'Dave', department: 'Marketing', role: 'Lead', salary: 9500 },
  { id: '5', name: 'Eve', department: 'Sales', role: 'Senior', salary: 8500 },
];

const CHART_SOURCE = [
  { month: 'Jan', revenue: 12, expenses: 8 },
  { month: 'Feb', revenue: 15, expenses: 9 },
  { month: 'Mar', revenue: 11, expenses: 7 },
  { month: 'Apr', revenue: 18, expenses: 10 },
  { month: 'May', revenue: 22, expenses: 12 },
  { month: 'Jun', revenue: 19, expenses: 11 },
];

const CRUD_SCHEMA = {
  type: 'page',
  testid: 'm4-crud-page',
  body: [
    {
      type: 'crud',
      id: 'm4-crud',
      testid: 'm4-crud-widget',
      source: ROWS,
      rowKey: 'id',
      filterTogglable: { defaultCollapsed: false },
      queryForm: {
        body: [
          { type: 'input-text', name: 'name', label: 'Name' },
          { type: 'input-text', name: 'department', label: 'Department' },
        ],
      },
      toolbarLayout: {
        header: ['listActions', 'statistics', 'switch-per-page', 'pagination'],
        footer: ['statistics', 'switch-per-page'],
      },
      listActions: [{ type: 'button', label: 'Bulk Delete', testid: 'm4-bulk-delete' }],
      columns: [
        { name: 'name', label: 'Name' },
        { name: 'department', label: 'Department' },
        { name: 'role', label: 'Role' },
        { name: 'salary', label: 'Salary' },
        {
          type: 'operation',
          label: 'Actions',
          buttons: [{ type: 'button', label: 'Edit' }],
        },
      ],
    },
  ],
};

const CHART_SCHEMA = {
  type: 'page',
  testid: 'm4-chart-page',
  body: [
    {
      type: 'chart',
      id: 'm4-chart',
      testid: 'm4-chart-widget',
      title: 'Revenue vs Expenses',
      chartType: 'bar',
      height: 400,
      xAxis: { dataKey: 'month', label: 'Month' },
      source: CHART_SOURCE,
      series: [
        { name: 'Revenue', dataRegionKey: 'revenue' },
        { name: 'Expenses', dataRegionKey: 'expenses' },
      ],
    },
  ],
};

const GRID_SCHEMA = {
  type: 'page',
  testid: 'm4-grid-page',
  body: [
    {
      type: 'grid',
      id: 'm4-grid',
      testid: 'm4-grid-widget',
      columns: 3,
      gap: 12,
      responsiveColumns: { sm: 1, lg: 3 },
      items: ROWS.slice(0, 3).map((row) => ({
        body: [{ type: 'text', text: `${row.name} · ${row.department}` }],
      })),
    },
  ],
};

const LIST_SCHEMA = {
  type: 'page',
  testid: 'm4-list-page',
  body: [
    {
      type: 'list',
      id: 'm4-list',
      testid: 'm4-list-widget',
      items: ROWS,
      item: { type: 'text', text: '${$slot.item.name} — ${$slot.item.role}' },
    },
  ],
};

const CARDS_SCHEMA = {
  type: 'page',
  testid: 'm4-cards-page',
  body: [
    {
      type: 'cards',
      id: 'm4-cards',
      testid: 'm4-cards-widget',
      columns: { sm: 1, md: 2, lg: 3 },
      items: ROWS,
      card: { type: 'text', text: '${$slot.item.name} / ${$slot.item.department}' },
    },
  ],
};

function Section({
  title,
  testidPrefix,
  schema,
  hint,
}: {
  title: string;
  testidPrefix: string;
  schema: Record<string, unknown>;
  hint: string;
}) {
  const schemaUrl = `playground://m4-data/${testidPrefix}`;
  return (
    <section className="mb-10 border rounded-md p-4">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <p className="mb-3 text-sm text-muted-foreground">{hint}</p>
      <div
        data-testid={`${testidPrefix}-root`}
        className="relative overflow-hidden border bg-muted/30 p-2"
      >
        <SchemaRenderer
          schemaUrl={schemaUrl}
          schema={schema as React.ComponentProps<typeof SchemaRenderer>['schema']}
          registry={registry as React.ComponentProps<typeof SchemaRenderer>['registry']}
          env={env}
          formulaCompiler={formulaCompiler}
        />
      </div>
    </section>
  );
}

export function M4DataDisplayDemoPage({ onBack }: M4DataDisplayDemoPageProps) {
  const schemas = useMemo(
    () => ({
      crud: CRUD_SCHEMA,
      chart: CHART_SCHEMA,
      grid: GRID_SCHEMA,
      list: LIST_SCHEMA,
      cards: CARDS_SCHEMA,
    }),
    [],
  );

  return (
    <main className="min-h-screen p-6">
      <Button variant="outline" onClick={onBack} className="mb-4">
        Back to Home
      </Button>
      <p className="mb-3 uppercase tracking-[0.16em] text-xs text-muted-foreground">
        Mobile Data Display (M4a / M4c) + 新落地 renderer 响应式 (grid / list / cards)
      </p>
      <h1 className="m-0 mb-2">
        M4 数据展示响应式 — crud 工具栏/查询/分页简化 + chart 尺寸自适应 + grid/list/cards 响应式
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        在 DevTools 设备模拟器中切到 <strong>&lt; 768px</strong> 视口观察：crud 隐藏「每页条数切换」、查询区默认折叠、toolbar 纵列堆叠；
        chart 高度 clamp 到 300px、图例换行不挤压；grid 按断点切列数、list hairline 分隔 + 触摸滚动、cards 列数 schema 化。
        桌面宽度下全部维持原样（无回归）。
      </p>

      <Section
        title="M4a CRUD — toolbar 简化 / 查询折叠 / 分页简化"
        testidPrefix="m4-crud"
        schema={schemas.crud}
        hint="小屏：switch-per-page 隐藏、filterTogglable 查询区默认折叠、toolbar 纵列堆叠。桌面：全 block 渲染、查询区展开。"
      />
      <Section
        title="M4c Chart — 高度 clamp + 图例换行"
        testidPrefix="m4-chart"
        schema={schemas.chart}
        hint="小屏容器宽度 < 768px：高度 clamp 到 300px（ authored 400），图例 flex-wrap 换行。ResizeObserver 缺席时回退固定 400px（无报错）。"
      />
      <Section
        title="Grid — 断点列数切换 (responsiveColumns)"
        testidPrefix="m4-grid"
        schema={schemas.grid}
        hint="responsiveColumns: { sm: 1, lg: 3 }。桌面（≥768）：3 列、无 marker；小屏（<768）：1 列、data-responsive='narrow'。colSpan 按有效列数 clamp。"
      />
      <Section
        title="List — hairline 分隔 + 小屏触摸滚动"
        testidPrefix="m4-list"
        schema={schemas.list}
        hint="条目间分隔迁移到 nop-hairline--bottom（0.5px 高 DPI 细线，末项无底边）。小屏：data-responsive='narrow' + touch-pan-y + py-3 触摸目标。桌面：py-2、无 marker。"
      />
      <Section
        title="Cards — 列数 schema 化 (columns)"
        testidPrefix="m4-cards"
        schema={schemas.cards}
        hint="columns: { sm: 1, md: 2, lg: 3 }。桌面（≥768）：3 列、无 marker；小屏（<768）：1 列、data-responsive='narrow'。缺省 columns 时维持原 sm:grid-cols-2 lg:grid-cols-3。"
      />

      <Toaster />
    </main>
  );
}
