import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerFormAdvancedRenderers } from '@nop-chaos/flux-renderers-form-advanced';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { Button } from '@nop-chaos/ui';

const schema = {
  type: 'page',
  body: [
    {
      type: 'flex',
      direction: 'column',
      gap: 'lg',
      body: [
        {
          type: 'text',
          tag: 'h2',
          text: 'flex — 枚举扩展（reverse / evenly / baseline / alignContent）',
        },
        {
          type: 'flex',
          direction: 'row-reverse',
          gap: 'md',
          body: [
            { type: 'text', text: 'A (row-reverse)', testid: 'lf-flex-reverse-a' },
            { type: 'text', text: 'B', testid: 'lf-flex-reverse-b' },
            { type: 'text', text: 'C', testid: 'lf-flex-reverse-c' },
          ],
        },
        {
          type: 'flex',
          justify: 'evenly',
          body: [
            { type: 'text', text: 'space-evenly X', testid: 'lf-flex-evenly-1' },
            { type: 'text', text: 'space-evenly Y', testid: 'lf-flex-evenly-2' },
            { type: 'text', text: 'space-evenly Z', testid: 'lf-flex-evenly-3' },
          ],
        },
        {
          type: 'flex',
          align: 'baseline',
          gap: 'md',
          body: [
            { type: 'text', tag: 'h3', text: 'Title', testid: 'lf-flex-baseline-title' },
            { type: 'text', text: 'baseline-aligned caption', testid: 'lf-flex-baseline-cap' },
          ],
        },
        {
          type: 'flex',
          wrap: true,
          alignContent: 'center',
          className: 'h-24',
          body: [
            { type: 'text', text: 'wrap+content-center 1', testid: 'lf-flex-content-1' },
            { type: 'text', text: 'wrap+content-center 2', testid: 'lf-flex-content-2' },
          ],
        },
        {
          type: 'text',
          tag: 'h2',
          text: 'page — aside + subTitle + remark',
        },
        {
          type: 'page',
          title: '管理页',
          subTitle: '子标题副文案',
          remark: '这是 remark Tooltip 提示文本',
          body: [
            {
              type: 'container',
              body: [{ type: 'text', text: '主内容区 body', testid: 'lf-page-body' }],
            },
          ],
          aside: [
            {
              type: 'container',
              body: [{ type: 'text', text: '侧边栏 aside（left）', testid: 'lf-page-aside' }],
            },
          ],
        },
        {
          type: 'page',
          title: '右侧 aside',
          asidePosition: 'right',
          body: [
            {
              type: 'container',
              body: [{ type: 'text', text: '主内容（asidePosition=right）', testid: 'lf-page-body-right' }],
            },
          ],
          aside: [
            {
              type: 'container',
              body: [{ type: 'text', text: '右侧 aside', testid: 'lf-page-aside-right' }],
            },
          ],
        },
        {
          type: 'text',
          tag: 'h2',
          text: 'tabs — per-tab badge / icon / mountOnEnter',
        },
        {
          type: 'tabs',
          value: 'overview',
          items: [
            {
              key: 'overview',
              title: '概览',
              icon: 'layout-dashboard',
              badge: 5,
              body: [{ type: 'text', text: '概览内容（badge=5, icon=layout-dashboard）', testid: 'lf-tabs-overview-body' }],
            },
            {
              key: 'settings',
              title: '设置',
              icon: 'settings',
              badge: 'new',
              mountOnEnter: true,
              body: [{ type: 'text', text: '设置内容（mountOnEnter=true，切到才挂载）', testid: 'lf-tabs-settings-body' }],
            },
            {
              key: 'logs',
              title: '日志',
              icon: 'file-text',
              unmountOnExit: true,
              body: [{ type: 'text', text: '日志内容（unmountOnExit=true，切走后卸载）', testid: 'lf-tabs-logs-body' }],
            },
          ],
        },
      ],
    },
  ],
} as any;

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerFormAdvancedRenderers(registry);
registerDataRenderers(registry);

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

const pageEnv: RendererEnv = {
  fetcher: async <T,>() => ({ ok: true, status: 200, data: null as T }),
  notify(level, message) {
    console.info(`[layout-family-enhancements-demo] ${level}: ${message}`);
  },
};

interface LayoutFamilyEnhancementsDemoPageProps {
  onBack: () => void;
}

export function LayoutFamilyEnhancementsDemoPage({
  onBack,
}: LayoutFamilyEnhancementsDemoPageProps) {
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <section className="max-w-[1100px] w-full p-10 rounded-3xl bg-[var(--nop-hero-bg)] border border-[var(--nop-hero-border)] shadow-[var(--nop-hero-shadow)]">
        <Button
          variant="outline"
          className="mb-[18px] px-3.5 py-2.5 rounded-full border border-[var(--nop-nav-border)] bg-[var(--nop-nav-surface)] text-[var(--nop-text-strong)] font-sans text-[13px] font-bold cursor-pointer transition-[transform,box-shadow,border-color] duration-160 hover:-translate-y-px hover:shadow-[var(--nop-nav-shadow-active)] hover:border-[var(--nop-nav-hover-border)]"
          onClick={onBack}
        >
          Back to Home
        </Button>
        <p className="mb-3 uppercase tracking-[0.16em] text-xs text-[var(--nop-eyebrow)]">
          Layout Family Enhancements (E3)
        </p>
        <h1 className="m-0 mb-4">flex / page / tabs 布局族能力补齐</h1>
        <p className="text-lg leading-relaxed text-[var(--nop-body-copy)] mb-2">
          演示 <code>flex</code> 的 reverse/evenly/baseline/alignContent 枚举扩展、
          <code>page</code> 的 aside region + subTitle/remark、
          <code>tabs</code> 的 per-tab badge/icon + mountOnEnter/unmountOnExit。缺省回退无回归。
        </p>
        <div className="mt-8">
          <SchemaRenderer
            schemaUrl="playground://pages/layout-family-enhancements-demo"
            schema={schema}
            env={pageEnv}
            registry={registry as any}
            formulaCompiler={formulaCompiler}
          />
        </div>
      </section>
    </main>
  );
}
