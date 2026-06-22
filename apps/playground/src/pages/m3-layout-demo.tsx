import { useMemo } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { Button, toast, Toaster } from '@nop-chaos/ui';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';

interface M3LayoutDemoPageProps {
  onBack: () => void;
}

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);

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
  navigate: (to) => {
    const target = typeof to === 'string' ? to : String(to);
    toast.info(`navigate → ${target}`);
  },
};

const TABBAR_SCHEMA = {
  type: 'page',
  testid: 'm3-tabbar-page',
  body: [
    {
      type: 'container',
      body: [{ type: 'text', text: 'Tabbar 模式：底部路由导航（≠ tabs 内容切换）。点击下方按钮触发 navigate action。' }],
    },
  ],
  footerClassName: 'nop-tabbar fixed bottom-0 inset-x-0 nop-safe-bottom bg-background border-t',
  footer: {
    type: 'flex',
    justify: 'around',
    items: [
      {
        type: 'button',
        variant: 'ghost',
        className: 'flex-col h-14 w-16 nop-haptic',
        label: '首页',
        icon: 'home',
        testid: 'm3-tabbar-home',
        onClick: { action: 'navigate', args: { url: '/home' } },
      },
      {
        type: 'button',
        variant: 'ghost',
        className: 'flex-col h-14 w-16 nop-haptic',
        label: '分类',
        icon: 'grid',
        testid: 'm3-tabbar-category',
        onClick: { action: 'navigate', args: { url: '/category' } },
      },
    ],
  },
};

const NAVBAR_SCHEMA = {
  type: 'page',
  testid: 'm3-navbar-page',
  toolbarClassName: 'nop-navbar sticky top-0 nop-safe-top bg-background',
  header: {
    type: 'flex',
    justify: 'between',
    align: 'center',
    className: 'h-11 px-2',
    items: [
      {
        type: 'button',
        variant: 'ghost',
        icon: 'arrow-left',
        className: 'w-11 h-11 nop-haptic',
        testid: 'm3-navbar-back',
        onClick: { action: 'navigate', args: { back: true } },
      },
      { type: 'text', text: 'NavBar 标题', className: 'flex-1 text-center font-medium' },
      {
        type: 'button',
        variant: 'ghost',
        label: '更多',
        className: 'w-11 h-11 nop-haptic',
        testid: 'm3-navbar-more',
      },
    ],
  },
  body: [
    {
      type: 'container',
      body: [{ type: 'text', text: 'NavBar 模式：顶部返回 + 居中标题 + 右操作。' }],
    },
  ],
};

const ACTIONBAR_SCHEMA = {
  type: 'page',
  testid: 'm3-actionbar-page',
  body: [
    {
      type: 'container',
      body: [{ type: 'text', text: 'ActionBar 模式：底部图标按钮组 + 大号 CTA。' }],
    },
  ],
  footerClassName: 'nop-action-bar fixed bottom-0 inset-x-0 h-14 nop-safe-bottom bg-background border-t',
  footer: {
    type: 'flex',
    align: 'center',
    items: [
      {
        type: 'flex',
        direction: 'column',
        align: 'center',
        className: 'w-14',
        items: [
          { type: 'icon', icon: 'customer-service', className: 'nop-haptic' },
          { type: 'text', text: '客服', className: 'text-xs' },
        ],
      },
      {
        type: 'flex',
        direction: 'column',
        align: 'center',
        className: 'w-14',
        items: [
          { type: 'icon', icon: 'star', className: 'nop-haptic' },
          { type: 'text', text: '收藏', className: 'text-xs' },
        ],
      },
      {
        type: 'button',
        variant: 'default',
        label: '加入购物车',
        className: 'flex-1 h-12 nop-haptic',
        testid: 'm3-actionbar-cart',
      },
      {
        type: 'button',
        variant: 'default',
        label: '立即购买',
        className: 'flex-1 h-12 nop-haptic',
        testid: 'm3-actionbar-buy',
      },
    ],
  },
};

const SUBMITBAR_SCHEMA = {
  type: 'page',
  testid: 'm3-submitbar-page',
  body: [
    {
      type: 'container',
      body: [{ type: 'text', text: 'SubmitBar 模式：全选复选 + 价格展示 + 结算 CTA。' }],
    },
  ],
  footerClassName: 'nop-submit-bar fixed bottom-0 inset-x-0 h-14 nop-safe-bottom bg-background border-t px-3',
  footer: {
    type: 'flex',
    align: 'center',
    justify: 'between',
    items: [
      { type: 'checkbox', name: 'selectAll', option: { label: '全选' } },
      {
        type: 'flex',
        align: 'center',
        items: [
          { type: 'text', text: '合计：', className: 'text-sm' },
          { type: 'text', text: '¥199.00', className: 'text-red-500 font-bold' },
        ],
      },
      {
        type: 'button',
        variant: 'default',
        label: '结算(3)',
        className: 'h-12 px-6 nop-haptic',
        testid: 'm3-submitbar-submit',
      },
    ],
  },
};

const STICKY_SCHEMA = {
  type: 'page',
  testid: 'm3-sticky-page',
  body: [
    {
      type: 'container',
      className: 'nop-sticky sticky top-0 z-10 bg-background',
      header: [{ type: 'text', text: 'Sticky 吸顶筛选条', tag: 'h3' }],
      body: [{ type: 'text', text: '吸顶内容（top-0）— 滚动时保持在顶部。' }],
    },
    {
      type: 'container',
      body: [
        { type: 'text', text: '页面正文（滚动以观察 sticky 行为）.' },
        { type: 'text', text: '更多内容…' },
      ],
    },
  ],
};

function Section({
  title,
  testidPrefix,
  schema,
}: {
  title: string;
  testidPrefix: string;
  schema: Record<string, unknown>;
}) {
  const schemaUrl = `playground://m3-layout/${testidPrefix}`;
  return (
    <section className="mb-10 border rounded-md p-4">
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      {/*
        Device frame: `transform` establishes a containing block for `position: fixed`
        descendants, so each section's fixed footer is scoped to its own frame and
        the 5 patterns don't overlap on a single demo page. Real usage renders one
        pattern per page (no overlap); the frame here is demo-only isolation.
      */}
      <div
        data-testid={`${testidPrefix}-root`}
        className="relative h-80 overflow-hidden border bg-muted/30"
        style={{ transform: 'translateZ(0)' }}
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

export function M3LayoutDemoPage({ onBack }: M3LayoutDemoPageProps) {
  const schemas = useMemo(
    () => ({
      tabbar: TABBAR_SCHEMA,
      navbar: NAVBAR_SCHEMA,
      actionbar: ACTIONBAR_SCHEMA,
      submitbar: SUBMITBAR_SCHEMA,
      sticky: STICKY_SCHEMA,
    }),
    [],
  );

  return (
    <main className="min-h-screen p-6">
      <Button variant="outline" onClick={onBack} className="mb-4">
        Back to Home
      </Button>
      <p className="mb-3 uppercase tracking-[0.16em] text-xs text-muted-foreground">
        Mobile Layout Skeletons (M3a)
      </p>
      <h1 className="m-0 mb-2">M3a 移动端页面骨架模式 — Tabbar / NavBar / ActionBar / SubmitBar / Sticky</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        本页通过 5 段独立 SchemaRenderer 各渲染一类移动端页面骨架模板（<code>page.header</code>/<code>page.footer</code> region + 现有组件，<strong>非新增 renderer</strong>）。
        在 DevTools 设备模拟器中切到 <strong>&lt; 768px</strong> 视口观察 fixed/sticky 栏与 VisualViewport 行为；Tabbar 按钮触发 <code>navigate</code> action（≠ <code>tabs</code> 内容切换）。
      </p>

      <Section title="§14.1 Tabbar — 底部路由导航" testidPrefix="m3-tabbar" schema={schemas.tabbar} />
      <Section title="§14.2 NavBar — 顶部返回栏" testidPrefix="m3-navbar" schema={schemas.navbar} />
      <Section title="§14.3 ActionBar — 商品详情底部操作栏" testidPrefix="m3-actionbar" schema={schemas.actionbar} />
      <Section title="§14.4 SubmitBar — 购物车结算栏" testidPrefix="m3-submitbar" schema={schemas.submitbar} />
      <Section title="§14.5 Sticky — 吸顶容器" testidPrefix="m3-sticky" schema={schemas.sticky} />

      <Toaster />
    </main>
  );
}
