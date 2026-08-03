import { useMemo } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { ExecutableApiRequest, RendererEnv } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { registerScadaRenderers } from '@nop-chaos/flux-renderers-industrial';
import { Button } from '@nop-chaos/ui';

// I11 验证用页面（临时）：图元事件→flux action 三链路（click→dialog / dblclick→页面跳转 / click→数据请求）。
// 最小验证场景，I13.1 scada-demo 正式页面落地后由本页退役或并入。
const schema = {
  type: 'page',
  body: [
    {
      type: 'scada-canvas',
      id: 'i11-canvas',
      width: 760,
      height: 320,
      config: {
        version: 1,
        variables: [{ id: 'level', source: 'static', value: 10 }],
        symbols: [
          {
            id: 'rect-dialog',
            type: 'scada-rect',
            x: 20,
            y: 40,
            width: 200,
            height: 110,
            fill: '#2f6fed',
            bindings: { fill: { point: 'level' } },
            events: [
              { on: 'click', action: { action: 'openDialog', args: { dialogId: 'i11-dialog' } } },
              { on: 'dblclick', action: { action: 'navigate', args: { url: '#/flux-basic' } } },
            ],
          },
          {
            id: 'rect-ajax',
            type: 'scada-rect',
            x: 260,
            y: 40,
            width: 200,
            height: 110,
            fill: '#16a34a',
            events: [
              {
                on: 'click',
                action: { action: 'ajax', args: { url: '/api/i11/points', method: 'get' } },
              },
            ],
          },
        ],
      },
      events: {
        onReady: { action: 'showToast', args: { message: 'I11 scada canvas ready' } },
      },
    },
    {
      type: 'text',
      text: '蓝：单击 → dialog（双击 → 跳转 flux-basic）；绿：单击 → 数据请求（env.fetcher mock 200）',
    },
    {
      type: 'dialog',
      id: 'i11-dialog',
      title: 'I11 图元事件联动验证',
      defaultOpen: false,
      body: [{ type: 'text', text: 'click 声明派发 openDialog 成功（声明优先链路）。' }],
    },
  ],
};

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerDataRenderers(registry);
registerScadaRenderers(registry);

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

function makeDemoEnv(): RendererEnv {
  return {
    fetcher: async <T,>(api: ExecutableApiRequest) => {
      console.log('[scada-i11] ajax', api.method ?? 'GET', api.url);
      return {
        ok: true,
        status: 200,
        data: { value: 42 } as T,
      };
    },
    notify: (level, message) => {
      console.log('[scada-i11] notify', level, message);
    },
    navigate: (to) => {
      if (typeof to === 'string') window.location.hash = to;
      else window.history.back();
    },
  };
}

interface ScadaEventLinkageDemoPageProps {
  onBack: () => void;
}

export function ScadaEventLinkageDemoPage({ onBack }: ScadaEventLinkageDemoPageProps) {
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
          Industrial HMI · I11 验证用
        </p>
        <h1 className="m-0 mb-2">scada-canvas 事件联动验证页</h1>
        <p className="text-lg leading-relaxed text-[var(--nop-body-copy)]">
          图元事件声明 → flux action 全链路最小验证（I11.1）：组态内 <code>events</code> 声明经
          action dispatcher 派发。I13.1 scada-demo 正式页面落地后本页退役。
        </p>
        <div className="mt-8">
          <SchemaRenderer
            schemaUrl="playground://pages/scada-event-linkage-demo"
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
