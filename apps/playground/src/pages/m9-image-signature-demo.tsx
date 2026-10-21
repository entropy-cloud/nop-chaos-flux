import { useState } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { Button } from '@nop-chaos/ui';
import { notifyWithToast } from './notify-toast.js';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerMobileRenderers, ImageViewerRenderer } from '@nop-chaos/flux-renderers-mobile';

interface M9ImageSignatureDemoPageProps {
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

const DEMO_SCHEMA = {
  type: 'page',
  body: [
    {
      type: 'input-signature',
      name: 'signature',
      label: '签名',
      testid: 'm9-signature',
      penWidth: 3,
    },
  ],
};

function ViewerHost() {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-2">
      <Button
        size="sm"
        variant="outline"
        data-testid="m9-viewer-open"
        onClick={() => setOpen(true)}
      >
        打开图片预览
      </Button>
      <ImageViewerRenderer
        {...({
          schema: { type: 'image-viewer' },
          props: {
            open,
            images: [
              'data:image/svg+xml;utf8,' +
                encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="#334155"/><text x="150" y="200" fill="#fff" text-anchor="middle">1</text></svg>'),
              'data:image/svg+xml;utf8,' +
                encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="#475569"/><text x="150" y="200" fill="#fff" text-anchor="middle">2</text></svg>'),
            ],
          },
          events: { onClose: () => setOpen(false) },
          meta: { testid: 'm9-image-viewer', visible: true, hidden: false, disabled: false, changed: false },
          node: { scope: {} },
          id: 'm9-image-viewer',
          path: ['m9-image-viewer'],
        } as unknown as Parameters<typeof ImageViewerRenderer>[0])}
      />
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)} data-testid="m9-viewer-close-btn">
        关闭预览
      </Button>
    </div>
  );
}

export function M9ImageSignatureDemoPage({ onBack }: M9ImageSignatureDemoPageProps) {
  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col">
      <div className="flex items-center gap-3 px-6 py-3 bg-zinc-900 border-b border-zinc-800">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-zinc-400 hover:text-white">
          ← Back
        </Button>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">Image & Signature (M9)</p>
          <h1 className="text-sm font-semibold text-white m-0">
            M9 图像与手写 — image-viewer / input-signature 增强
          </h1>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center gap-8 p-6 lg:p-10">
        <div
          data-testid="m9-phone-frame"
          className="relative mx-auto overflow-hidden rounded-[2.5rem] border-[3px] border-zinc-800 bg-black shadow-2xl shrink-0"
          style={{ width: 390, height: 844 }}
        >
          <div className="relative w-full h-full overflow-y-auto bg-background p-3 space-y-3" style={{ transform: 'translateZ(0)' }}>
            <div className="rounded-xl border border-zinc-800 p-3 space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 m-0">image-viewer（M9a）</p>
              <ViewerHost />
            </div>
            <SchemaRenderer
              schemaUrl="playground://m9-image-signature/app"
              schema={DEMO_SCHEMA as React.ComponentProps<typeof SchemaRenderer>['schema']}
              registry={registry as React.ComponentProps<typeof SchemaRenderer>['registry']}
              env={env}
              formulaCompiler={formulaCompiler}
            />
          </div>
        </div>

        <div className="w-full lg:w-80 shrink-0 space-y-4">
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">M9a 手势</p>
            <p className="text-xs text-zinc-400 m-0 leading-relaxed">
              双指触点中点缩放（clamp 1–4）、双击 1↔2、横翻翻页、下滑关闭；缩放态冻结横翻（resolveGesture 仲裁）。
            </p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">M9b 签名增强</p>
            <p className="text-xs text-zinc-400 m-0 leading-relaxed">
              input-signature 增强：二次贝塞尔中点平滑 + undo/export 句柄（经 flux-runtime 句柄通道扩展）。
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
