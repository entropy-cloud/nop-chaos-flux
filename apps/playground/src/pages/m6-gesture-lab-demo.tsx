import { useState } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { Button } from '@nop-chaos/ui';
import { notifyWithToast } from './notify-toast.js';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { registerMobileRenderers, useLockScroll } from '@nop-chaos/flux-renderers-mobile';

interface M6GestureLabDemoPageProps {
  onBack: () => void;
}

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerDataRenderers(registry);
registerMobileRenderers(registry);

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

const env: RendererEnv = {
  fetcher: async function <T>() {
    return { status: 0, data: null as T };
  },
  notify: notifyWithToast,
};

const SWIPE_CELL_SCHEMA = {
  type: 'page',
  body: [
    {
      type: 'swipe-cell',
      testid: 'm6-swipe-cell',
      threshold: 30,
      body: [{ type: 'text', text: '快扫（flick）或拖过 30px 都能开启；拖过操作区 1.15 倍宽触发首个动作', testid: 'm6-swipe-cell-body' }],
      left: [
        {
          type: 'button',
          label: '归档',
          variant: 'primary',
          testid: 'm6-swipe-left-action',
        },
      ],
      right: [
        {
          type: 'button',
          label: '删除',
          variant: 'destructive',
          testid: 'm6-swipe-right-action',
        },
      ],
    },
    {
      type: 'pull-refresh',
      testid: 'm6-pull-refresh',
      threshold: 60,
      pullingText: '下拉刷新（1:1 跟手）',
      loosingText: '释放刷新（过阈值 rubberband 阻尼）',
      loadingText: '加载中...',
      successText: '刷新成功',
      body: [{ type: 'text', text: '下拉体验 rubberband 阻尼 — 越过 60px 后越拉越紧', testid: 'm6-pull-refresh-body' }],
    },
  ],
};

function LockScrollDemoHost() {
  const [open, setOpen] = useState(false);
  // M6b: global-mode scroll lock — body gets `nop-scroll-lock` while the
  // overlay is up, and the bitmask touchmove guard blocks scroll-through on
  // touch devices.
  useLockScroll(open);

  return (
    <div className="space-y-2">
      <Button
        size="sm"
        variant="outline"
        data-testid="m6-lock-open"
        onClick={() => setOpen(true)}
      >
        打开锁定弹层
      </Button>
      {open ? (
        <div
          data-testid="m6-lock-overlay"
          className="fixed inset-0 z-50 bg-black/60 flex items-end"
        >
          <div className="w-full rounded-t-2xl bg-zinc-900 p-4 space-y-3 max-h-[70%] overflow-y-auto">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-400 m-0">
                弹层内容可滚动（锁生效时 body 不可滚动穿透）
              </p>
              <Button
                size="sm"
                variant="ghost"
                data-testid="m6-lock-close"
                onClick={() => setOpen(false)}
              >
                关闭
              </Button>
            </div>
            {Array.from({ length: 24 }, (_, i) => (
              <p key={i} className="text-xs text-zinc-300 m-0 py-1 border-b border-zinc-800">
                列表项 {i + 1} — 在弹层内滚动
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function M6GestureLabDemoPage({ onBack }: M6GestureLabDemoPageProps) {
  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col">
      <div className="flex items-center gap-3 px-6 py-3 bg-zinc-900 border-b border-zinc-800">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-zinc-400 hover:text-white">
          ← Back
        </Button>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">Gesture Lab (M6)</p>
          <h1 className="text-sm font-semibold text-white m-0">
            M6 手势基建 — velocity / rubberband / useLockScroll
          </h1>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center gap-8 p-6 lg:p-10">
        <div
          data-testid="m6-phone-frame"
          className="relative mx-auto overflow-hidden rounded-[2.5rem] border-[3px] border-zinc-800 bg-black shadow-2xl shrink-0"
          style={{ width: 390, height: 844 }}
        >
          <div className="relative w-full h-full overflow-y-auto bg-background" style={{ transform: 'translateZ(0)' }}>
            <div className="p-3 space-y-3">
              <div className="rounded-xl border border-zinc-800 p-3 space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 m-0">
                  useLockScroll（M6b）
                </p>
                <LockScrollDemoHost />
              </div>
              <SchemaRenderer
                schemaUrl="playground://m6-gesture-lab/app"
                schema={SWIPE_CELL_SCHEMA as React.ComponentProps<typeof SchemaRenderer>['schema']}
                registry={registry as React.ComponentProps<typeof SchemaRenderer>['registry']}
                env={env}
                formulaCompiler={formulaCompiler}
              />
            </div>
          </div>
        </div>

        <div className="w-full lg:w-80 shrink-0 space-y-4">
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">M6a 纯函数层</p>
            <p className="text-xs text-zinc-400 m-0 leading-relaxed">
              rubberband `(d·dim·c)/(dim+c·d)`、velocity 170ms 采样窗、flick ≥0.1px/ms、投掷投影
              `|δ|+|v|·50`、overswipe 1.15×、momentum rAF quartEaseOut（M7 picker 底座）。
            </p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">M6d 手感升级</p>
            <p className="text-xs text-zinc-400 m-0 leading-relaxed">
              swipe-cell：flick 开启 / 投掷投影 / overswipe 首动作 / K-map 松手决策；
              pull-refresh：1:1 至阈值 + rubberband 统一阻尼。
            </p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">M6b 滚动锁</p>
            <p className="text-xs text-zinc-400 m-0 leading-relaxed">
              `useLockScroll` 方向位掩码 + 全局计数 + strict/局部模式，供 M7/M8 移动 surface 消费。
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
