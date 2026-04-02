import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import schemaJson from './conditionBuilderSchema.json';

interface ConditionBuilderPageProps {
  onBack: () => void;
}

const pageRegistry = createDefaultRegistry();
registerBasicRenderers(pageRegistry);
registerFormRenderers(pageRegistry);
registerDataRenderers(pageRegistry);

const SchemaRenderer = createSchemaRenderer();
const pageFormulaCompiler = createFormulaCompiler();

const pageEnv: RendererEnv = {
  async fetcher<T>() {
    return { ok: true, status: 200, data: null as T };
  },
  notify(level, message) {
    console.info(`[condition-builder-page] ${level}: ${message}`);
  },
};

export const conditionBuilderPageSchema = schemaJson;

export function ConditionBuilderPage({ onBack }: ConditionBuilderPageProps) {
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <section className="max-w-[1100px] w-full p-10 rounded-3xl bg-[var(--nop-hero-bg)] border border-[var(--nop-hero-border)] shadow-[var(--nop-hero-shadow)]">
        <button
          type="button"
          className="mb-[18px] px-3.5 py-2.5 rounded-full border border-[var(--nop-nav-border)] bg-[var(--nop-nav-surface)] text-[var(--nop-text-strong)] font-sans text-[13px] font-bold cursor-pointer transition-[transform,box-shadow,border-color] duration-160 hover:-translate-y-px hover:shadow-[var(--nop-nav-shadow-active)] hover:border-[var(--nop-nav-hover-border)]"
          onClick={onBack}
        >
          Back to Home
        </button>
        <p className="mb-3 uppercase tracking-[0.16em] text-xs text-[var(--nop-eyebrow)]">Condition Builder</p>
        <h1 className="m-0 mb-4">条件构建器测试</h1>
        <p className="text-lg leading-relaxed text-[var(--nop-body-copy)] mb-2">
          测试 condition-builder 渲染器的各种配置：嵌入/弹出模式、AND/OR/NOT 切换、字段搜索、唯一字段约束、嵌套分组、自定义操作符。
        </p>
        <div className="mt-8 p-6 rounded-[20px] bg-[var(--nop-playground-stage-bg)] border border-[var(--nop-playground-stage-border)]">
          <SchemaRenderer
            schema={conditionBuilderPageSchema}
            data={{}}
            env={pageEnv}
            registry={pageRegistry}
            formulaCompiler={pageFormulaCompiler}
          />
        </div>
      </section>
    </main>
  );
}
