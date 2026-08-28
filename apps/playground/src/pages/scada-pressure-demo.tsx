import { useMemo, useState } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerScadaRenderers } from '@nop-chaos/flux-renderers-industrial';
import type { ScadaConfig, ScadaSymbolNode } from '@nop-chaos/flux-renderers-industrial';
import { Button } from '@nop-chaos/ui';

// I13.2 scada-pressure-demo 大屏/复杂组态示例页：万级图元压力示例 + 多画面切换。
//
// 结构裁定（I13 plan Phase 2 Decision）：**单页多画面 tab 切换**——一个 scada-canvas 挂载点，
// 顶部 tab 切换两个组态画面（工艺流程大屏 + 高密度图元压力画面）；切换时经 `key={screen}`
// 重挂载 SchemaRenderer（引擎实例销毁/重建，`config.version` 恒为 1——validate 契约严格校验
// version === 1，不能借版本号触发 reload；I10.1 的 config 全量 reset 路径由首次挂载承担）。
// 不新增页面级多路由（注册面最小化，roadmap I13.2「多画面切换（页面导航）」的 tab 形态等价演示）。
//
// 万级图元压力画面：程序化生成 ~10k 图元（矩形/线/管道/文本混合），固定随机种子（mulberry32(42)）
// 保证 e2e 确定性。10 万级测量场景加载方式（扩展本页 scale 参数 vs 独立 harness）**交 I14.1 决策**
// （Failure Paths `pressure-scale-drift` 裁定记录），本页只做万级载体、不越界实现 10 万场景。
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

function generatePressureSymbols(count: number): ScadaSymbolNode[] {
  const rand = mulberry32(42);
  const symbols: ScadaSymbolNode[] = [];
  for (let i = 0; i < count; i++) {
    const x = Math.round(rand() * 1800);
    const y = Math.round(rand() * 1300);
    switch (i % 4) {
      case 0:
        symbols.push({
          id: `gen-${i}`,
          type: 'scada-rect',
          x,
          y,
          width: Math.round(18 + rand() * 42),
          height: Math.round(18 + rand() * 42),
          fill: RECT_PALETTE[Math.floor(rand() * RECT_PALETTE.length)],
          stroke: '#263238',
          strokeWidth: 1,
        });
        break;
      case 1:
        symbols.push({
          id: `gen-${i}`,
          type: 'scada-line',
          x,
          y,
          width: Math.round(40 + rand() * 90),
          height: 0,
          stroke: '#78909c',
          strokeWidth: 2,
        });
        break;
      case 2:
        symbols.push({
          id: `gen-${i}`,
          type: 'scada-pipe',
          x,
          y,
          width: Math.round(40 + rand() * 110),
          height: 0,
          stroke: '#3f7b5a',
          strokeWidth: 4,
        });
        break;
      default:
        symbols.push({
          id: `gen-${i}`,
          type: 'scada-text',
          x,
          y,
          text: `T-${String(i % 9000).padStart(4, '0')}`,
          textSize: 10,
          textColor: '#546e7a',
        });
    }
  }
  return symbols;
}

const PRESSURE_COUNT = 10_000;

// 工艺流程大屏画面（多画面切换之一）：设备 + 管道 + 仪表大屏总览（~40 图元）。
const overviewSymbols: ScadaSymbolNode[] = [
  { id: 'ov-title', type: 'scada-text', x: 40, y: 30, text: '生产总览大屏', textSize: 24, textColor: '#e3f2fd' },
  { id: 'ov-subtitle', type: 'scada-text', x: 40, y: 66, text: '整厂工艺流程运行状态总览（I13.2 画面一）', textSize: 12, textColor: '#90caf9' },
  { id: 'ov-tank', type: 'scada-instrument-level', x: 120, y: 160, width: 80, height: 200, custom: { min: 0, max: 100, unit: '%' }, bindings: { height: { point: 'ovLevel', scale: { k: 2 } }, text: { point: 'ovLevel', format: '%d%%' } } },
  { id: 'ov-pipe-1', type: 'scada-pipe', x: 200, y: 330, width: 140, height: 0 },
  { id: 'ov-pump', type: 'scada-device-pump', x: 340, y: 300, width: 80, height: 60 },
  { id: 'ov-pipe-2', type: 'scada-pipe', x: 420, y: 320, width: 120, height: 0 },
  { id: 'ov-valve', type: 'scada-device-valve', x: 540, y: 300, width: 80, height: 40, custom: { openRatio: 1 } },
  { id: 'ov-pipe-3', type: 'scada-pipe', x: 620, y: 310, width: 130, height: 0 },
  { id: 'ov-motor', type: 'scada-device-motor', x: 780, y: 120, width: 80, height: 60 },
  { id: 'ov-fan', type: 'scada-device-fan', x: 780, y: 260, width: 80, height: 60 },
  { id: 'ov-gauge-1', type: 'scada-instrument-gauge', x: 980, y: 100, width: 140, height: 140, custom: { min: 0, max: 100, unit: 'MPa' }, bindings: { rotation: { point: 'ovPressure', scale: { k: 2.7, b: -135 } }, text: { point: 'ovPressure', format: '%d MPa' } } },
  { id: 'ov-gauge-2', type: 'scada-instrument-gauge', x: 980, y: 280, width: 140, height: 140, custom: { min: 0, max: 100, unit: 'L/min' }, bindings: { rotation: { point: 'ovFlow', scale: { k: 2.7, b: -135 } }, text: { point: 'ovFlow', format: '%d L/min' } } },
  { id: 'ov-thermo', type: 'scada-instrument-thermometer', x: 200, y: 90, width: 50, height: 180, bindings: { height: { point: 'ovTemp', scale: { k: 1.5 } }, text: { point: 'ovTemp', format: '%d °C' } } },
  { id: 'ov-ind-1', type: 'scada-sensor-control-indicator', x: 420, y: 90, width: 64, height: 36 },
  { id: 'ov-ind-2', type: 'scada-sensor-control-indicator', x: 540, y: 90, width: 64, height: 36 },
  { id: 'ov-txt-1', type: 'scada-text', x: 120, y: 370, text: '储罐 LT-1', textSize: 12, textColor: '#90caf9' },
  { id: 'ov-txt-2', type: 'scada-text', x: 340, y: 368, text: '泵 P-1', textSize: 12, textColor: '#90caf9' },
  { id: 'ov-txt-3', type: 'scada-text', x: 540, y: 348, text: '阀 V-1', textSize: 12, textColor: '#90caf9' },
  { id: 'ov-txt-4', type: 'scada-text', x: 780, y: 186, text: '电机 M-1', textSize: 12, textColor: '#90caf9' },
  { id: 'ov-txt-5', type: 'scada-text', x: 780, y: 326, text: '风机 F-1', textSize: 12, textColor: '#90caf9' },
];

const overviewConfig: ScadaConfig = {
  version: 1,
  variables: [
    { id: 'ovLevel', source: 'static', value: 62 },
    { id: 'ovPressure', source: 'static', value: 45 },
    { id: 'ovFlow', source: 'static', value: 60 },
    { id: 'ovTemp', source: 'static', value: 48 },
  ],
  symbols: overviewSymbols,
};

const pressureConfig: ScadaConfig = {
  version: 1,
  symbols: generatePressureSymbols(PRESSURE_COUNT),
};

function buildSchema(screen: 'overview' | 'pressure') {
  const isPressure = screen === 'pressure';
  return {
    type: 'page',
    body: [
      {
        type: 'scada-canvas',
        id: 'scada-pressure-canvas',
        width: 1100,
        height: 620,
        viewport: { fit: 'contain' as const },
        config: (isPressure ? pressureConfig : overviewConfig) as never,
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

interface ScadaPressureDemoPageProps {
  onBack: () => void;
}

export function ScadaPressureDemoPage({ onBack }: ScadaPressureDemoPageProps) {
  const [screen, setScreen] = useState<'overview' | 'pressure'>('overview');
  const schema = useMemo(() => buildSchema(screen), [screen]);

  return (
    <main className="min-h-screen flex flex-col p-4 gap-3">
      <header className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back to Home
        </Button>
        <div>
          <p className="mb-1 uppercase tracking-[0.16em] text-xs text-[var(--nop-eyebrow)]">
            Industrial HMI · I13.2
          </p>
          <h1 className="m-0 text-xl font-bold">scada-pressure-demo 大屏/复杂组态示例页</h1>
        </div>
      </header>
      <div className="flex items-center gap-3 flex-wrap rounded-xl border border-[var(--nop-nav-border)] bg-[var(--nop-nav-surface)] p-3">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={screen === 'overview' ? 'default' : 'outline'}
            size="sm"
            data-testid="scada-screen-overview"
            onClick={() => setScreen('overview')}
          >
            工艺流程大屏
          </Button>
          <Button
            type="button"
            variant={screen === 'pressure' ? 'default' : 'outline'}
            size="sm"
            data-testid="scada-screen-pressure"
            onClick={() => setScreen('pressure')}
          >
            高密度压力画面（{PRESSURE_COUNT.toLocaleString()} 图元）
          </Button>
        </div>
        <div className="ml-auto text-sm text-[var(--nop-body-copy)]">
          当前画面：{screen === 'overview' ? '工艺流程大屏（~20 图元）' : `高密度压力画面（${PRESSURE_COUNT} 图元）`}
          <span className="ml-2 text-xs opacity-70">滚轮缩放 / 拖拽平移 / 悬停高亮；10 万级测量场景加载方式交 I14.1 决策</span>
        </div>
      </div>
      <div className="flex-1 min-h-0 rounded-xl border border-[var(--nop-nav-border)] bg-[#0b1220] overflow-hidden">
        <SchemaRenderer
          key={screen}
          schemaUrl="playground://pages/scada-pressure-demo"
          schema={schema}
          env={env}
          registry={registry as never}
          formulaCompiler={formulaCompiler}
        />
      </div>
    </main>
  );
}
