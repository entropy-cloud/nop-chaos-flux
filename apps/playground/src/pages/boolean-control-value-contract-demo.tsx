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
      type: 'form',
      id: 'boolean-contract-form',
      name: 'booleanContractForm',
      data: {
        enabled: 0,
        notify: 'no',
        agree: false,
        featured: false,
      },
      body: [
        {
          type: 'text',
          text: 'Custom value mapping — checkbox stores 1/0, switch stores "yes"/"no".',
        },
        {
          type: 'checkbox',
          name: 'enabled',
          label: 'Enabled',
          option: { label: 'Enabled (stores 1 when checked, 0 when unchecked)' },
          trueValue: 1,
          falseValue: 0,
        },
        {
          type: 'switch',
          name: 'notify',
          label: 'Notify',
          trueValue: 'yes',
          falseValue: 'no',
          option: { onLabel: 'Subscribed', offLabel: 'Unsubscribed' },
        },
        {
          type: 'text',
          text: 'Default fallback — no trueValue/falseValue configured, stores true/false.',
        },
        {
          type: 'checkbox',
          name: 'agree',
          label: 'Agree',
          option: { label: 'Agree (stores boolean true/false)' },
        },
        {
          type: 'switch',
          name: 'featured',
          label: 'Featured',
        },
        {
          type: 'flex',
          direction: 'column',
          gap: 'sm',
          className: 'mt-4 p-4 rounded-lg bg-muted/40',
          body: [
            {
              type: 'text',
              text: 'Live form values:',
            },
            {
              type: 'text',
              testid: 'boolean-contract-value-enabled',
              text: 'enabled = ${enabled}',
            },
            {
              type: 'text',
              testid: 'boolean-contract-value-notify',
              text: 'notify = ${notify}',
            },
            {
              type: 'text',
              testid: 'boolean-contract-value-agree',
              text: 'agree = ${agree}',
            },
            {
              type: 'text',
              testid: 'boolean-contract-value-featured',
              text: 'featured = ${featured}',
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
    console.info(`[boolean-control-value-contract-demo] ${level}: ${message}`);
  },
};

interface BooleanControlValueContractDemoPageProps {
  onBack: () => void;
}

export function BooleanControlValueContractDemoPage({
  onBack,
}: BooleanControlValueContractDemoPageProps) {
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
          Boolean Control Value Contract (E3)
        </p>
        <h1 className="m-0 mb-4">布尔控件值契约 — trueValue / falseValue</h1>
        <p className="text-lg leading-relaxed text-[var(--nop-body-copy)] mb-2">
          演示 checkbox/switch 的 schema 级 <code>trueValue</code> / <code>falseValue</code>
          值映射：勾选/切换时表单存储业务值（如 <code>1</code>/<code>0</code>、
          <code>&quot;yes&quot;</code>/<code>&quot;no&quot;</code>），而非硬编码布尔。缺省时回退
          <code>true</code>/<code>false</code>（无回归）。
        </p>
        <div className="mt-8">
          <SchemaRenderer
            schemaUrl="playground://pages/boolean-control-value-contract-demo"
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
