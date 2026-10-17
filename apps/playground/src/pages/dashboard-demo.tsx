import { useMemo } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createActionScope } from '@nop-chaos/flux-runtime';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { Button } from '@nop-chaos/ui';
import { createDesignerRegistry, DASHBOARD_DEMO_RECIPE } from '../designer-hosts/registry-factory.js';

/**
 * dashboard-demo 示例页（BI 看板：KPI 卡 + chart + table 面板，编辑态↔运行态切换，
 * 保存 → 序列化布局 → 持久化（host 层 localStorage）→ 刷新后布局还原）。
 *
 * 渲染器职责边界：页面组件（host）负责 localStorage 持久化；renderer 只经
 * `dashboard-editor:save` 事件抛出序列化布局，经 namespaced action 接回 host。
 */

const DEFAULT_LAYOUT_PANELS = [
  {
    id: 'kpi-revenue',
    type: 'stat-tile',
    title: 'Revenue',
    x: 0,
    y: 0,
    w: 3,
    h: 2,
    props: { value: '${revenue}', delta: 12.5, formatter: { thousands: true, decimals: 0 } },
  },
  {
    id: 'kpi-orders',
    type: 'stat-tile',
    title: 'Orders',
    x: 3,
    y: 0,
    w: 3,
    h: 2,
    props: { value: '${orders}', delta: { value: -3.2, direction: 'down' }, formatter: { thousands: true, decimals: 0 } },
  },
  {
    id: 'chart-sales',
    type: 'chart',
    title: 'Sales Trend',
    x: 6,
    y: 0,
    w: 6,
    h: 4,
    source: '${salesData}',
    props: {
      chartType: 'line',
      height: 140,
      xAxis: { dataKey: 'month' },
      series: [{ name: 'Sales', dataRegionKey: 'sales' }],
      legend: true,
    },
  },
  {
    id: 'table-orders',
    type: 'table',
    title: 'Orders',
    x: 0,
    y: 4,
    w: 12,
    h: 5,
    source: '${ordersData}',
    props: {
      columns: [
        { name: 'orderId', label: 'Order ID' },
        { name: 'product', label: 'Product' },
        { name: 'amount', label: 'Amount' },
        { name: 'status', label: 'Status' },
      ],
    },
  },
];

const LAYOUT_STORAGE_KEY = 'flux-dashboard-layout:v2';
const LEGACY_LAYOUT_STORAGE_KEY = 'flux-dashboard-layout';

function readSavedLayout(): string {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (raw) return raw;
    // 旧 key 布局可能携带修复前的坏面板配置（如 chart series 未声明
    // dataRegionKey），迁移会永久绕过新默认布局——直接废弃。
    localStorage.removeItem(LEGACY_LAYOUT_STORAGE_KEY);
  } catch {
    // storage may be unavailable; fall back to the default layout
  }
  return JSON.stringify({ panels: DEFAULT_LAYOUT_PANELS });
}

const registry = createDesignerRegistry(DASHBOARD_DEMO_RECIPE);

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

function makeDemoEnv(): RendererEnv {
  return {
    fetcher: async <T,>() => ({ status: 0, data: {} as T }),
    notify: (_level, message) => console.log('[dashboard-demo]', message),
    navigate: () => undefined,
  };
}

interface DashboardDemoPageProps {
  onBack: () => void;
}

export function DashboardDemoPage({ onBack }: DashboardDemoPageProps) {
  const env = useMemo(() => makeDemoEnv(), []);

  const actionScope = useMemo(() => {
    const scope = createActionScope({ id: 'dashboard-demo-page-action-scope' });
    scope.registerNamespace('dashboardDemo', {
      kind: 'host',
      listMethods() {
        return ['persist'];
      },
      invoke(method, payload) {
        if (method === 'persist') {
          const serialized = (payload as { serialized?: unknown } | undefined)?.serialized;
          if (typeof serialized === 'string') {
            try {
              localStorage.setItem(LAYOUT_STORAGE_KEY, serialized);
            } catch {
              // storage may be unavailable; the in-scope layout still updates
            }
          }
          return { ok: true };
        }
        return { ok: false, error: new Error(`Unknown dashboardDemo method: ${method}`) };
      },
    });
    return scope;
  }, []);

  const schema = useMemo(
    () => ({
      type: 'page',
      body: [
        {
          type: 'flex',
          direction: 'column',
          className: 'gap-3',
          body: [
            {
              type: 'dashboard-editor',
              id: 'bi-dashboard',
              testid: 'bi-dashboard',
              layout: '${dashboardLayout}',
              height: 560,
              onSave: [
                {
                  action: 'setValue',
                  args: { path: 'dashboardLayout', value: '${event.serialized}' },
                },
                {
                  action: 'dashboardDemo:persist',
                  args: { serialized: '${event.serialized}' },
                },
              ],
            },
            {
              type: 'panel',
              title: 'Saved Layout (dashboard-editor:save → host persist)',
              body: [
                { type: 'json-view', data: '${dashboardLayout}' },
              ],
            },
          ],
        },
      ],
    }),
    [],
  );

  return (
    <main className="min-h-screen p-6">
      <section className="mx-auto w-full max-w-[1200px] rounded-3xl border border-[var(--nop-hero-border)] bg-[var(--nop-hero-bg)] p-8 shadow-[var(--nop-hero-shadow)]">
        <div className="mb-4 flex items-center gap-3 border-b border-[var(--nop-hero-border)] pb-4">
          <Button
            variant="outline"
            data-testid="dashboard-back"
            className="px-3.5 py-2.5 rounded-full border border-[var(--nop-nav-border)] bg-[var(--nop-nav-surface)] text-[var(--nop-text-strong)] font-sans text-[13px] font-bold cursor-pointer transition-[transform,box-shadow,border-color] duration-160 hover:-translate-y-px hover:shadow-[var(--nop-nav-shadow-active)] hover:border-[var(--nop-nav-hover-border)]"
            onClick={onBack}
          >
            Back to Home
          </Button>
          <div className="min-w-0">
            <p className="uppercase tracking-[0.16em] text-xs text-[var(--nop-eyebrow)]">
              BI Dashboard · editor-core
            </p>
            <h1 className="text-[22px] font-semibold leading-tight text-[var(--nop-text-strong)]">
              dashboard-editor 演示页
            </h1>
          </div>
        </div>
        {/* ux-r10 DB-4/G-4：开发态说明收进折叠说明——打开即看板 */}
        <details className="mb-2 text-sm text-[var(--nop-body-copy)]">
          <summary className="cursor-pointer select-none text-[13px] font-medium opacity-80">
            页面说明（外壳构成 / 持久化语义）
          </summary>
          <p className="mt-2 leading-relaxed">
            WorkbenchShell 三段式外壳（palette + canvas + inspector）+ editor-core 会话（undo/redo/commit）+
            网格拖拽/缩放/吸附。保存后布局持久化到 localStorage，刷新页面自动还原；Editor 内 Preview 切换展示运行态渲染。
          </p>
        </details>
        <div className="mt-8">
          <SchemaRenderer
            schemaUrl="playground://pages/dashboard-demo"
            schema={schema}
            env={env}
            registry={registry as never}
            formulaCompiler={formulaCompiler}
            actionScope={actionScope}
            data={{
              dashboardLayout: readSavedLayout(),
              revenue: 1284300,
              orders: 8642,
              salesData: [
                { month: 'Jan', sales: 320 },
                { month: 'Feb', sales: 410 },
                { month: 'Mar', sales: 380 },
                { month: 'Apr', sales: 520 },
                { month: 'May', sales: 610 },
                { month: 'Jun', sales: 590 },
              ],
              ordersData: [
                { orderId: 'A-1001', product: 'Laptop', amount: 1299, status: 'Paid' },
                { orderId: 'A-1002', product: 'Monitor', amount: 349, status: 'Paid' },
                { orderId: 'A-1003', product: 'Keyboard', amount: 89, status: 'Pending' },
                { orderId: 'A-1004', product: 'Dock', amount: 249, status: 'Paid' },
              ],
            }}
          />
        </div>
      </section>
    </main>
  );
}
