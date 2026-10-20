import { useRef, useState } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { Button, ScrollMask, useScrollMask } from '@nop-chaos/ui';
import { notifyWithToast } from './notify-toast.js';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerMobileRenderers } from '@nop-chaos/flux-renderers-mobile';

interface M10ListNavigationDemoPageProps {
  onBack: () => void;
}

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerMobileRenderers(registry);

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

const env: RendererEnv = {
  fetcher: async function <T>() {
    return { status: 0, data: null as T };
  },
  notify: notifyWithToast,
};

const INDEX_BAR_SCHEMA = {
  type: 'page',
  body: [
    {
      type: 'index-bar',
      testid: 'm10-index-bar',
      targetSelector: '#m10-contact-list',
      className: 'sticky top-0 h-[600px]',
      items: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => ({
        label: letter,
        value: letter,
      })),
    },
  ],
};

function MaskHost() {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const mask = useScrollMask(scrollerRef, 'x');
  return (
    <div className="relative" data-testid="m10-mask-wrap">
      <div
        ref={scrollerRef}
        data-testid="m10-mask-scroller"
        className="overflow-x-auto flex gap-2 px-3 py-2"
        style={{ width: 340 }}
      >
        {Array.from({ length: 16 }, (_, i) => (
          <span
            key={i}
            className="shrink-0 rounded bg-zinc-700 px-3 py-1 text-xs text-zinc-200"
          >
            项目 {i + 1}
          </span>
        ))}
      </div>
      <ScrollMask state={mask} axis="x" size={28} />
    </div>
  );
}

export function M10ListNavigationDemoPage({ onBack }: M10ListNavigationDemoPageProps) {
  const [activeLetter] = useState('A');
  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col">
      <div className="flex items-center gap-3 px-6 py-3 bg-zinc-900 border-b border-zinc-800">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-zinc-400 hover:text-white">
          ← Back
        </Button>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">List Navigation (M10)</p>
          <h1 className="text-sm font-semibold text-white m-0">
            M10 列表导航 — index-bar / scroll-mask
          </h1>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center gap-8 p-6 lg:p-10">
        <div
          data-testid="m10-phone-frame"
          className="relative mx-auto overflow-hidden rounded-[2.5rem] border-[3px] border-zinc-800 bg-black shadow-2xl shrink-0"
          style={{ width: 390, height: 844 }}
        >
          <div className="relative w-full h-full overflow-y-auto bg-background p-3 space-y-3" data-testid="m10-frame-scroll" style={{ transform: 'translateZ(0)' }}>
            <div className="rounded-xl border border-zinc-800 p-3 space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 m-0">
                ScrollMask（M10b，ui 层通用件）
              </p>
              <MaskHost />
            </div>
            <div className="rounded-xl border border-zinc-800 p-3 space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 m-0">
                index-bar（M10a）— 当前键 {activeLetter}
              </p>
            </div>
            <div className="relative overflow-hidden" style={{ height: 600 }}>
              <SchemaRenderer
                schemaUrl="playground://m10-list-navigation/bar"
                schema={INDEX_BAR_SCHEMA as React.ComponentProps<typeof SchemaRenderer>['schema']}
                registry={registry as React.ComponentProps<typeof SchemaRenderer>['registry']}
                env={env}
                formulaCompiler={formulaCompiler}
              />
              <div
                id="m10-contact-list"
                data-testid="m10-contact-list"
                className="absolute inset-y-0 left-0 right-10 overflow-y-auto divide-y divide-zinc-800"
              >
                {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').flatMap((letter) =>
                  [1, 2].map((n) => (
                    <div
                      key={`${letter}${n}`}
                      data-index-anchor={letter.charCodeAt(0) - 65}
                      className="py-3 text-sm text-zinc-200"
                    >
                      {letter} 联系人 {n}
                    </div>
                  )),
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-80 shrink-0 space-y-4">
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">M10a 定位机制</p>
            <p className="text-xs text-zinc-400 m-0 leading-relaxed">
              非 passive touchmove + document.elementFromPoint 命中 [data-index-key]
              → closest 解析当前键 → 高亮气泡 + onChange + scrollIntoView 联动。
            </p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">M10b 滚动渐隐</p>
            <p className="text-xs text-zinc-400 m-0 leading-relaxed">
              useScrollMask 监听 scroll/resize 报告两端可滚状态；ScrollMask 纯展示组件
              data-start/data-end 驱动渐隐。
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
