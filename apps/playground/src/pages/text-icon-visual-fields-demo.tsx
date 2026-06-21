import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerFormAdvancedRenderers } from '@nop-chaos/flux-renderers-form-advanced';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { Button } from '@nop-chaos/ui';

const longText =
  'Flux 是 AMIS 低代码渲染器的现代化重写。text 组件现在支持 copyable（一键复制）与 maxLine（行数截断）。本段落演示 maxLine=2 的截断效果——超过两行的文本将被隐藏，纯 line-clamp 实现简单可观测。';

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
          text: 'copyable — 一键复制',
        },
        {
          type: 'text',
          text: '点击右侧复制图标将文本写入剪贴板（toast 反馈）。',
          testid: 'text-visual-copyable-hint',
        },
        {
          type: 'text',
          text: 'hello@nop-chaos.dev',
          copyable: true,
          testid: 'text-visual-copyable-target',
        },
        {
          type: 'text',
          tag: 'h2',
          text: 'maxLine — 行数截断',
        },
        {
          type: 'text',
          text: 'maxLine=2 的长文本：',
        },
        {
          type: 'text',
          text: longText,
          maxLine: 2,
          testid: 'text-visual-maxline-2',
        },
        {
          type: 'text',
          text: 'maxLine=3 的长文本：',
        },
        {
          type: 'text',
          text: longText,
          maxLine: 3,
          testid: 'text-visual-maxline-3',
        },
        {
          type: 'text',
          tag: 'h2',
          text: 'icon — size / color',
        },
        {
          type: 'flex',
          direction: 'row',
          gap: 'md',
          align: 'center',
          body: [
            { type: 'icon', icon: 'star', testid: 'text-visual-icon-default' },
            {
              type: 'icon',
              icon: 'star',
              size: 24,
              testid: 'text-visual-icon-size-24',
            },
            {
              type: 'icon',
              icon: 'star',
              size: 32,
              color: '#eab308',
              testid: 'text-visual-icon-size-32-color',
            },
            {
              type: 'icon',
              icon: 'heart',
              size: 24,
              color: '#ef4444',
              testid: 'text-visual-icon-heart-red',
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
    console.info(`[text-icon-visual-fields-demo] ${level}: ${message}`);
  },
};

interface TextIconVisualFieldsDemoPageProps {
  onBack: () => void;
}

export function TextIconVisualFieldsDemoPage({
  onBack,
}: TextIconVisualFieldsDemoPageProps) {
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <section className="max-w-[900px] w-full p-10 rounded-3xl bg-[var(--nop-hero-bg)] border border-[var(--nop-hero-border)] shadow-[var(--nop-hero-shadow)]">
        <Button
          variant="outline"
          className="mb-[18px] px-3.5 py-2.5 rounded-full border border-[var(--nop-nav-border)] bg-[var(--nop-nav-surface)] text-[var(--nop-text-strong)] font-sans text-[13px] font-bold cursor-pointer transition-[transform,box-shadow,border-color] duration-160 hover:-translate-y-px hover:shadow-[var(--nop-nav-shadow-active)] hover:border-[var(--nop-nav-hover-border)]"
          onClick={onBack}
        >
          Back to Home
        </Button>
        <p className="mb-3 uppercase tracking-[0.16em] text-xs text-[var(--nop-eyebrow)]">
          Text / Icon Visual Fields (E3)
        </p>
        <h1 className="m-0 mb-4">text copyable/maxLine + icon size/color</h1>
        <p className="text-lg leading-relaxed text-[var(--nop-body-copy)] mb-2">
          演示 <code>text</code> 的 <code>copyable</code>（一键复制 + toast 反馈）与
          <code>maxLine</code>（line-clamp 截断），以及 <code>icon</code> 的 schema 级
          <code>size</code> 与 <code>color</code>（替代硬编码 size=16）。缺省回退无回归。
        </p>
        <div className="mt-8">
          <SchemaRenderer
            schemaUrl="playground://pages/text-icon-visual-fields-demo"
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
