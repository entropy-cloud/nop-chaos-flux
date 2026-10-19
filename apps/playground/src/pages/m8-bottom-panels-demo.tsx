import { useState } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { Button, Sheet, SheetContent, SheetHeader, SheetTitle } from '@nop-chaos/ui';
import { notifyWithToast } from './notify-toast.js';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerMobileRenderers } from '@nop-chaos/flux-renderers-mobile';

interface M8BottomPanelsDemoPageProps {
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
      type: 'action-sheet',
      testid: 'm8-action-sheet',
      triggerText: '打开操作菜单',
      title: '操作',
      display: 'list',
      items: [
        { label: '分享', value: 'share' },
        { label: '收藏', value: 'favorite' },
        { label: '删除（不可用）', value: 'delete', disabled: true },
      ],
    },
    {
      type: 'floating-bubble',
      testid: 'm8-floating-bubble',
      initialX: 320,
      initialY: 700,
    },
    {
      type: 'floating-panel',
      testid: 'm8-floating-panel',
      anchors: [120, 320],
      defaultHeight: 120,
      body: [
        { type: 'text', text: '拖拽面板把手切换锚点；满屏后此内容区可滚动', testid: 'm8-panel-body-text' },
      ],
    },
  ],
};

function GestureSheetHost() {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-2">
      <Button
        size="sm"
        variant="outline"
        data-testid="m8-sheet-open"
        onClick={() => setOpen(true)}
      >
        打开手势关闭 Sheet
      </Button>
      <Sheet open={open} onOpenChange={setOpen} gestureClose onGestureClose={() => setOpen(false)}>
        <SheetContent side="bottom" data-testid="m8-gesture-sheet" aria-label="手势关闭示例">
          <SheetHeader>
            <SheetTitle>下拉关闭（快速下拉或超过半屏）</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6 text-sm text-zinc-500">
            触摸此面板向下拖拽：快速短拉或超过半屏即关闭，慢速小拉回弹。
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function M8BottomPanelsDemoPage({ onBack }: M8BottomPanelsDemoPageProps) {
  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col">
      <div className="flex items-center gap-3 px-6 py-3 bg-zinc-900 border-b border-zinc-800">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-zinc-400 hover:text-white">
          ← Back
        </Button>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">Bottom Panels (M8)</p>
          <h1 className="text-sm font-semibold text-white m-0">
            M8 底部面板组 — floating-panel / bubble / action-sheet / Sheet 手势关闭
          </h1>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center gap-8 p-6 lg:p-10">
        <div
          data-testid="m8-phone-frame"
          className="relative mx-auto overflow-hidden rounded-[2.5rem] border-[3px] border-zinc-800 bg-black shadow-2xl shrink-0"
          style={{ width: 390, height: 844 }}
        >
          <div
            className="relative w-full h-full overflow-y-auto bg-background"
            style={{ transform: 'translateZ(0)' }}
          >
            <div className="p-3 space-y-3">
              <SchemaRenderer
                schemaUrl="playground://m8-bottom-panels/app"
                schema={DEMO_SCHEMA as React.ComponentProps<typeof SchemaRenderer>['schema']}
                registry={registry as React.ComponentProps<typeof SchemaRenderer>['registry']}
                env={env}
                formulaCompiler={formulaCompiler}
              />
              <div className="rounded-xl border border-zinc-800 p-3 space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 m-0">
                  ui Sheet 手势关闭（M8c）
                </p>
                <GestureSheetHost />
              </div>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-80 shrink-0 space-y-4">
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">M8a 滚动仲裁</p>
            <p className="text-xs text-zinc-400 m-0 leading-relaxed">
              面板未满屏拖面板 / 满屏滚内容（8 格真值表逐 move 重评）；
              nearest 锚点吸附 + 240ms 回弹动画；useLockScroll localRef 首个消费方。
            </p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">M8c Sheet 手势</p>
            <p className="text-xs text-zinc-400 m-0 leading-relaxed">
              f7 swipeToClose 判定 `(t&lt;300&amp;&amp;d&gt;20)||d&gt;h/2`；backdrop 随 progress 渐隐；
              breakpoints 半开档位裁定归 floating-panel 锚点（本组件 opt-in gestureClose 默认关）。
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
