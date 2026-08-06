import { useMemo } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerScadaRenderers, registerScadaSymbols } from '@nop-chaos/flux-renderers-industrial';
import { registerScadaEditorRenderers } from '@nop-chaos/flux-renderers-industrial/editor';
import { Button } from '@nop-chaos/ui';

// E5 M1 MVP 编辑器演示页（#/scada-editor-demo）：scada-editor-canvas 编辑态画布 +
// palette + inspector + save/load 按钮，对齐 scada-canvas demo 先例。
const schema = {
  type: 'page',
  body: [
    {
      type: 'flex',
      direction: 'col',
      className: 'gap-3',
      body: [
        {
          type: 'flex',
          direction: 'row',
          className: 'flex-wrap items-center gap-2',
          body: [
            {
              type: 'button',
              label: 'Save',
              testid: 'editor-btn-save',
              onClick: { action: 'component:save', componentId: 'editor-canvas' },
            },
            {
              type: 'button',
              label: 'Load',
              testid: 'editor-btn-load',
              onClick: {
                action: 'component:load',
                componentId: 'editor-canvas',
                args: {
                  config: {
                    version: 1,
                    variables: [],
                    symbols: [
                      { id: 'loaded-rect', type: 'scada-rect', x: 100, y: 100, width: 150, height: 100, fill: '#1565c0' },
                      { id: 'loaded-text', type: 'scada-text', x: 120, y: 120, text: 'Loaded', textSize: 16, textColor: '#ffffff' },
                    ],
                  },
                },
              },
            },
          ],
        },
        {
          type: 'scada-editor-canvas',
          id: 'editor-canvas',
          width: 960,
          height: 520,
          mode: 'edit',
          config: {
            version: 1,
            variables: [],
            symbols: [
              { id: 'demo-rect', type: 'scada-rect', x: 200, y: 160, width: 160, height: 120, fill: '#1565c0' },
              { id: 'demo-text', type: 'scada-text', x: 240, y: 200, text: 'E5 Editor Demo', textSize: 18, textColor: '#ffffff' },
              { id: 'demo-ellipse', type: 'scada-ellipse', x: 440, y: 180, width: 80, height: 80, fill: '#e74c3c' },
            ],
          },
        },
      ],
    },
  ],
};

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerScadaRenderers(registry);
registerScadaSymbols();
registerScadaEditorRenderers(registry);

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

function makeDemoEnv(): RendererEnv {
  return {
    fetcher: async <T,>() => ({ ok: true, status: 200, data: {} as T }),
    notify: (_level, message) => console.log('[scada-editor-demo]', message),
    navigate: () => undefined,
  };
}

interface ScadaEditorDemoPageProps {
  onBack: () => void;
}

export function ScadaEditorDemoPage({ onBack }: ScadaEditorDemoPageProps) {
  const env = useMemo(() => makeDemoEnv(), []);

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
          Industrial HMI Editor · E5 M1
        </p>
        <h1 className="m-0 mb-2">scada-editor-demo 编辑器演示页</h1>
        <p className="text-lg leading-relaxed text-[var(--nop-body-copy)]">
          E5 M1 MVP 编辑器：palette 图元库面板（24 内置图元，拖拽放置）+ canvas 编辑态画布（双态切换经 mode prop + 测试句柄，schema 句柄留 M2 评估）
          + inspector 属性面板（六类字段分组 + validate 衔接）+ save/load 提交语义。
        </p>
        <div className="mt-8">
          <SchemaRenderer
            schemaUrl="playground://pages/scada-editor-demo"
            schema={schema}
            env={env}
            registry={registry as never}
            formulaCompiler={formulaCompiler}
          />
        </div>
      </section>
    </main>
  );
}
