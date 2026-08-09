import { useMemo, useState } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerScadaRenderers } from '@nop-chaos/flux-renderers-industrial';
import type { ScadaConfig } from '@nop-chaos/flux-renderers-industrial';
import { Button } from '@nop-chaos/ui';

// I15.1 scada 边界用例测试页（#/scada-edge-cases）：空画面/非法 JSON/非矩形图元 hover 覆盖物验证。
//
// 挂载载体裁定（I15 plan Phase 1 Decision `edge-case-carrier`）：
//   - 空画面/非法 JSON 新增独立测试页（对齐 scada-perf-scale 独立页先例：route-model
//     DOMAIN_RENDERER_ROUTES + App switch + pages/index + home-page NAV_CARDS），不扩展既有演示页；
//   - 超大画面复用既有载体（10k pressure / 100k perf-scale），不新增重复载体；
//   - 非矩形图元（线/多边形）hover 覆盖物验证同页承载（m-C 兜底语义，gate-4 §6:173-174）。
//
// 边界 config 形态（断言矩阵清单钉死，scada-edge-cases.spec.ts 按路径分断言）：
//   - minimal：最小合法 config（1 个矩形）→ 正常挂载（data-status=ready，无 empty region）；
//   - empty-scene：合法空画面（symbols: []）→ 正常挂载（ready，getSymbols() 为空）；
//   - invalid-json：非法 JSON 文本（parse 失败）→ data-status=error + empty region 可见 + onError；
//   - line-polygon：线/多边形组态（hover 覆盖物验证载体，scada-line/scada-polygon）。
//
// onError 观测面：schema 级 events.onError → showToast → env.notify 落库为页面文本
// （data-testid="scada-edge-notify"），e2e 程序化断言 onError 派发（不依赖 toast surface）。
const MINIMAL_CONFIG: ScadaConfig = {
  version: 1,
  symbols: [
    { id: 'edge-min-rect', type: 'scada-rect', x: 100, y: 100, width: 80, height: 60, fill: '#1565c0' },
  ],
};

const EMPTY_CONFIG: ScadaConfig = {
  version: 1,
  symbols: [],
};

const INVALID_JSON = '{ not-valid-json';

const LINE_POLYGON_CONFIG: ScadaConfig = {
  version: 1,
  symbols: [
    { id: 'edge-line', type: 'scada-line', x: 80, y: 240, width: 240, height: 0, stroke: '#78909c', strokeWidth: 3 },
    { id: 'edge-poly', type: 'scada-polygon', x: 400, y: 120, custom: { points: [0, 0, 160, 0, 160, 90, 80, 120, 0, 90] }, fill: '#2e7d32' },
  ],
};

// plan 2026-08-04-2243-2 D1 e2e 几何载体：默认几何族（polygon 无 custom.points、无 width/height）
// + viewport {fit:'contain'}。修复前 bounds 退化为 0 尺寸 → fit 冲到 MAX_SCALE(20×)；修复后
// 按符号定义默认 points（DEFAULT_TRIANGLE 100×86）算包围盒，fit scale 合理（< MAX_SCALE）。
const DEFAULT_GEOMETRY_FIT_CONFIG: ScadaConfig = {
  version: 1,
  symbols: [
    { id: 'edge-default-poly', type: 'scada-polygon', x: 200, y: 120, fill: '#6a1b9a' },
    { id: 'edge-default-line', type: 'scada-line', x: 200, y: 300, stroke: '#ef6c00', strokeWidth: 3 },
  ],
};

type EdgeScreen = 'minimal' | 'empty-scene' | 'invalid-json' | 'line-polygon' | 'default-geometry-fit';

function buildSchema(screen: EdgeScreen) {
  const config: unknown =
    screen === 'invalid-json'
      ? INVALID_JSON
      : screen === 'empty-scene'
        ? EMPTY_CONFIG
        : screen === 'line-polygon'
          ? LINE_POLYGON_CONFIG
          : screen === 'default-geometry-fit'
            ? DEFAULT_GEOMETRY_FIT_CONFIG
            : MINIMAL_CONFIG;
  return {
    type: 'page',
    body: [
      {
        type: 'scada-canvas',
        id: 'scada-edge-canvas',
        width: 900,
        height: 480,
        viewport: { fit: 'contain' as const },
        config: config as never,
        loading: { type: 'text', text: 'scada 场景加载中…' },
        empty: { type: 'text', text: 'scada 场景构建失败（config 非法）' },
        events: {
          onError: { action: 'showToast', args: { level: 'error', message: 'edge-onerror-fired' } },
        },
      },
    ],
  };
}

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerScadaRenderers(registry);

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

interface ScadaEdgeDemoPageProps {
  onBack: () => void;
}

export function ScadaEdgeDemoPage({ onBack }: ScadaEdgeDemoPageProps) {
  const [screen, setScreen] = useState<EdgeScreen>('minimal');
  const [notifyMessage, setNotifyMessage] = useState<string>('');
  const schema = useMemo(() => buildSchema(screen), [screen]);

  const env = useMemo<RendererEnv>(
    () => ({
      fetcher: async <T,>() => ({ ok: true, status: 200, data: null as T }),
      notify: (_level, message) => {
        setNotifyMessage(String(message));
      },
    }),
    [],
  );

  return (
    <main className="min-h-screen flex flex-col p-4 gap-3">
      <header className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back to Home
        </Button>
        <div>
          <p className="mb-1 uppercase tracking-[0.16em] text-xs text-[var(--nop-eyebrow)]">
            Industrial HMI · I15.1
          </p>
          <h1 className="m-0 text-xl font-bold">scada 边界用例测试页（I15.1）</h1>
        </div>
        <div className="ml-auto text-sm text-[var(--nop-body-copy)]" data-testid="scada-edge-notify">
          {notifyMessage ? `notify: ${notifyMessage}` : ''}
        </div>
      </header>
      <div className="flex items-center gap-3 flex-wrap rounded-xl border border-[var(--nop-nav-border)] bg-[var(--nop-nav-surface)] p-3">
        <div className="flex gap-2 flex-wrap">
          <Button
            type="button"
            variant={screen === 'minimal' ? 'default' : 'outline'}
            size="sm"
            data-testid="scada-edge-minimal"
            onClick={() => setScreen('minimal')}
          >
            最小合法 config
          </Button>
          <Button
            type="button"
            variant={screen === 'empty-scene' ? 'default' : 'outline'}
            size="sm"
            data-testid="scada-edge-empty"
            onClick={() => setScreen('empty-scene')}
          >
            空画面（symbols: []）
          </Button>
          <Button
            type="button"
            variant={screen === 'invalid-json' ? 'default' : 'outline'}
            size="sm"
            data-testid="scada-edge-invalid"
            onClick={() => setScreen('invalid-json')}
          >
            非法 JSON
          </Button>
          <Button
            type="button"
            variant={screen === 'line-polygon' ? 'default' : 'outline'}
            size="sm"
            data-testid="scada-edge-line-poly"
            onClick={() => setScreen('line-polygon')}
          >
            线/多边形 hover 验证
          </Button>
          <Button
            type="button"
            variant={screen === 'default-geometry-fit' ? 'default' : 'outline'}
            size="sm"
            data-testid="scada-edge-default-geom"
            onClick={() => setScreen('default-geometry-fit')}
          >
            默认几何 fit 验证
          </Button>
        </div>
        <div className="ml-auto text-sm text-[var(--nop-body-copy)]">
          边界断言入口：`tests/e2e/scada-edge-cases.spec.ts`（空画面/非法 JSON/非矩形图元 hover 覆盖物）
        </div>
      </div>
      <div className="flex-1 min-h-0 rounded-xl border border-[var(--nop-nav-border)] bg-[#0b1220] overflow-hidden">
        <SchemaRenderer
          key={screen}
          schemaUrl="playground://pages/scada-edge-cases"
          schema={schema}
          env={env}
          registry={registry as never}
          formulaCompiler={formulaCompiler}
        />
      </div>
    </main>
  );
}
