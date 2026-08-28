import { useMemo, useState } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerScadaRenderers } from '@nop-chaos/flux-renderers-industrial';
import type { ScadaConfig, ScadaSymbolNode } from '@nop-chaos/flux-renderers-industrial';
import { Button } from '@nop-chaos/ui';

// I14.1 10 万级测量场景（scada-perf-scale）：独立 perf 页/路由（对齐 calendar-perf-scale 先例），
// 消费 I13 plan `pressure-scale-drift` 裁定记录（10 万级加载方式交 I14.1 决策）。
//
// 裁定（I14.1 Decision `perf-load-channel`）：
//   - 独立页面 + 独立路由 `#/scada-perf-scale`（不扩展 scada-pressure-demo 规模参数，I13 既有 10k 模式零回归）；
//   - 10 万图元测量基体为矩形（对齐 spike 165.3 ms 口径「10 万矩形创建至首帧」），stroke/no-stroke 变体由生成器开关；
//   - 默认挂载小占位画面（10 图元，App 启动快），e2e 经 `window.__scadaPerfScale.generate()` 生成组态后
//     用测试句柄 `engine.reset()` 驱动 10 万构建（组态生成完成 → tree render 首帧，导航/生成开销排除在计时外）；
//   - 页面级 dev/test 投影 `window.__scadaPerfScale`（非 scada-canvas 公共契约变更）。
//
// 1 万点实时刷新场景：10k 静态点 + 10k 矩形（每图元绑定 opacity ← 点值量程换算），
// 经 UI 切换整页重挂载（config.version 恒 1，validate 严格校验，借用 key={screen} 重挂载实现全量重建），
// 点表注入走测试句柄批量通道 `setPointValues`（I14.1 Decision `perf-injection-channel`）。
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RECT_PALETTE = ['#1565c0', '#2e7d32', '#e65100', '#6a1b9a', '#00838f', '#37474f'];

export interface ScadaPerfGenerateOptions {
  stroke?: boolean;
}

/** 10 万图元矩形基体（固定种子 42，e2e 确定性；口径对齐 spike「10 万矩形创建至首帧」）。 */
function generateScaleSymbols(count: number, options: ScadaPerfGenerateOptions = {}): ScadaSymbolNode[] {
  const rand = mulberry32(42);
  const symbols: ScadaSymbolNode[] = [];
  for (let i = 0; i < count; i++) {
    symbols.push({
      id: `perf-${i}`,
      type: 'scada-rect',
      x: Math.round(rand() * 2000),
      y: Math.round(rand() * 1300),
      width: Math.round(18 + rand() * 42),
      height: Math.round(18 + rand() * 42),
      fill: RECT_PALETTE[Math.floor(rand() * RECT_PALETTE.length)],
      ...(options.stroke === true ? { stroke: '#263238', strokeWidth: 1 } : {}),
    });
  }
  return symbols;
}

export function generateScaleConfig(count: number, options: ScadaPerfGenerateOptions = {}): ScadaConfig {
  return { version: 1, symbols: generateScaleSymbols(count, options) };
}

/** 1 万点实时刷新场景：10k 静态点 + 10k 矩形（opacity ← 点值 k=0.001 量程换算）。 */
export function generateRefreshConfig(count: number): ScadaConfig {
  const variables: ScadaConfig['variables'] = [];
  const symbols: ScadaSymbolNode[] = [];
  const rand = mulberry32(7);
  for (let i = 0; i < count; i++) {
    variables.push({ id: `pt-${i}`, source: 'static', value: i % 1000 });
    symbols.push({
      id: `rf-${i}`,
      type: 'scada-rect',
      x: Math.round(rand() * 2000),
      y: Math.round(rand() * 1300),
      width: Math.round(18 + rand() * 42),
      height: Math.round(18 + rand() * 42),
      fill: RECT_PALETTE[Math.floor(rand() * RECT_PALETTE.length)],
      bindings: { opacity: { point: `pt-${i}`, scale: { k: 0.001 } } },
    });
  }
  return { version: 1, variables, symbols };
}

const PLACEHOLDER_CONFIG: ScadaConfig = {
  version: 1,
  symbols: [
    { id: 'perf-placeholder-0', type: 'scada-rect', x: 40, y: 40, width: 120, height: 80, fill: '#1565c0' },
    { id: 'perf-placeholder-1', type: 'scada-rect', x: 200, y: 40, width: 120, height: 80, fill: '#2e7d32' },
    { id: 'perf-placeholder-2', type: 'scada-line', x: 40, y: 200, width: 160, height: 0, stroke: '#78909c', strokeWidth: 2 },
    { id: 'perf-placeholder-3', type: 'scada-text', x: 40, y: 240, text: 'scada-perf-scale 占位画面（e2e 经测试句柄驱动 10 万构建）', textSize: 14, textColor: '#546e7a' },
  ],
};

const SCALE_COUNT = 100_000;
const REFRESH_COUNT = 10_000;

type PerfScreen = 'placeholder' | 'scale-stroke' | 'scale-nostroke' | 'refresh';

function buildSchema(screen: PerfScreen) {
  const config =
    screen === 'scale-stroke'
      ? generateScaleConfig(SCALE_COUNT, { stroke: true })
      : screen === 'scale-nostroke'
        ? generateScaleConfig(SCALE_COUNT, { stroke: false })
        : screen === 'refresh'
          ? generateRefreshConfig(REFRESH_COUNT)
          : PLACEHOLDER_CONFIG;
  return {
    type: 'page',
    body: [
      {
        type: 'scada-canvas',
        id: 'scada-perf-scale-canvas',
        width: 1100,
        height: 620,
        viewport: { fit: 'contain' as const },
        config: config as never,
        loading: { type: 'text', text: 'scada 场景构建中…' },
        empty: { type: 'text', text: 'scada 场景构建失败（config 非法）' },
      },
    ],
  };
}

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerScadaRenderers(registry);

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

const env: RendererEnv = {
  fetcher: async <T,>() => ({ status: 0, data: null as T }),
  notify: () => undefined,
};

if (typeof window !== 'undefined') {
  // 页面级 dev/test 投影（I14.1）：组态生成器暴露给 scada-perf.spec.ts 程序化驱动；
  // 非 scada-canvas 公共契约、非 flux scope 数据。
  (window as unknown as Record<string, unknown>).__scadaPerfScale = {
    generate: generateScaleConfig,
    generateRefreshConfig,
  };
}

interface ScadaPerfScalePageProps {
  onBack: () => void;
}

const SCREEN_BUTTONS: Array<{ id: PerfScreen; label: string; testId: string }> = [
  { id: 'placeholder', label: '占位画面', testId: 'scada-perf-placeholder' },
  { id: 'scale-stroke', label: `10 万图元（含 stroke）`, testId: 'scada-perf-scale-stroke' },
  { id: 'scale-nostroke', label: '10 万图元（无 stroke 对照）', testId: 'scada-perf-scale-nostroke' },
  { id: 'refresh', label: `1 万点实时刷新场景`, testId: 'scada-perf-refresh' },
];

export function ScadaPerfScaleDemoPage({ onBack }: ScadaPerfScalePageProps) {
  const [screen, setScreen] = useState<PerfScreen>('placeholder');
  const schema = useMemo(() => buildSchema(screen), [screen]);

  return (
    <main className="min-h-screen flex flex-col p-4 gap-3">
      <header className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back to Home
        </Button>
        <div>
          <p className="mb-1 uppercase tracking-[0.16em] text-xs text-[var(--nop-eyebrow)]">
            Industrial HMI · I14.1
          </p>
          <h1 className="m-0 text-xl font-bold">scada-perf-scale 性能基准测量页</h1>
        </div>
      </header>
      <div className="flex items-center gap-3 flex-wrap rounded-xl border border-[var(--nop-nav-border)] bg-[var(--nop-nav-surface)] p-3">
        <div className="flex gap-2 flex-wrap">
          {SCREEN_BUTTONS.map((btn) => (
            <Button
              key={btn.id}
              type="button"
              variant={screen === btn.id ? 'default' : 'outline'}
              size="sm"
              data-testid={btn.testId}
              onClick={() => setScreen(btn.id)}
            >
              {btn.label}
            </Button>
          ))}
        </div>
        <div className="ml-auto text-sm text-[var(--nop-body-copy)]">
          测量入口：`tests/e2e/scada-perf.spec.ts`（10 万首屏创建 / 拖动 fps 双口径 / 内存含无 stroke 对照 / 1 万点刷新延迟）
        </div>
      </div>
      <div className="flex-1 min-h-0 rounded-xl border border-[var(--nop-nav-border)] bg-[#0b1220] overflow-hidden">
        <SchemaRenderer
          key={screen}
          schemaUrl="playground://pages/scada-perf-scale"
          schema={schema}
          env={env}
          registry={registry as never}
          formulaCompiler={formulaCompiler}
        />
      </div>
    </main>
  );
}
