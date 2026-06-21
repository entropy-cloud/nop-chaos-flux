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
      type: 'text',
      text: 'input-number — 长按 stepper 按钮连续步进（初始延迟 ~400ms，间隔 ~80ms），越界 clamp 后停止。',
    },
    {
      type: 'form',
      id: 'form-input-enhancements',
      name: 'formInputEnhancements',
      data: {
        count: 0,
        tags: [{ value: 'alpha' }, { value: 'beta' }],
        headers: [
          { key: 'env', value: 'prod' },
          { key: 'region', value: 'us-east' },
        ],
      },
      body: [
        {
          type: 'input-number',
          name: 'count',
          label: 'Count (long-press stepper, max 10)',
          step: 1,
          max: 10,
          showStepper: true,
        },
        {
          type: 'text',
          text: 'array-editor — minItems 1 / maxItems 4，上下移动重排：',
        },
        {
          type: 'array-editor',
          name: 'tags',
          label: 'Tags',
          itemLabel: 'Tag',
          minItems: 1,
          maxItems: 4,
        },
        {
          type: 'text',
          text: 'key-value — minItems 1 / maxItems 3，上下移动重排：',
        },
        {
          type: 'key-value',
          name: 'headers',
          label: 'Headers',
          minItems: 1,
          maxItems: 3,
        },
        {
          type: 'flex',
          direction: 'column',
          gap: 'sm',
          className: 'mt-4 p-4 rounded-lg bg-muted/40',
          body: [
            { type: 'text', text: 'Live form values:' },
            { type: 'text', testid: 'form-input-enhancements-count', text: 'count = ${count}' },
            {
              type: 'text',
              testid: 'form-input-enhancements-tags',
              text: 'tags = ${tags}',
            },
            {
              type: 'text',
              testid: 'form-input-enhancements-headers',
              text: 'headers = ${headers}',
            },
            {
              type: 'button',
              label: 'Submit (see console)',
              onClick: { action: 'submitForm' },
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
    console.info(`[form-input-enhancements-demo] ${level}: ${message}`);
  },
};

interface FormInputEnhancementsDemoPageProps {
  onBack: () => void;
}

export function FormInputEnhancementsDemoPage({
  onBack,
}: FormInputEnhancementsDemoPageProps) {
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
          Form Input Enhancements (E3)
        </p>
        <h1 className="m-0 mb-4">表单输入控件增强 — 长按步进 + min/max + 重排</h1>
        <p className="text-lg leading-relaxed text-[var(--nop-body-copy)] mb-2">
          演示 <code>input-number</code> 长按连续步进（pointer-down 连续递增/递减，越界 clamp 停止），
          以及 <code>array-editor</code> / <code>key-value</code> 的可配置
          <code>minItems</code>/<code>maxItems</code>（达到上限禁用新增、达到下限禁用删除）
          与上下移动重排（对接 form runtime <code>moveValue</code>）。缺省回退无回归。
        </p>
        <div className="mt-8">
          <SchemaRenderer
            schemaUrl="playground://pages/form-input-enhancements-demo"
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
