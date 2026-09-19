import { useEffect, useMemo, useRef, useState } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerThreeRenderers, AISchemaGenerator, type LlmProvider, type ThreeCanvasSchema } from '@nop-chaos/flux-renderers-3d';
import type { ExecutableApiRequest, RendererEnv } from '@nop-chaos/flux-core';
import { Button } from '@nop-chaos/ui';
import { threeCanvasDemoSchema, type ThreeDemoSim } from './three-canvas-demo-schema';

// plan 469 three-canvas 正式演示页（plan 465 Deferred「浏览器侧 fps e2e 基准」后继义务的演示场景）：
// 声明式图元场景 + 表达式绑定 + 关键帧动画 + 对象点击事件。
// 页面内自建 registry（scada-demo 同法）；three.js 仅经 App.tsx 懒加载入口进入浏览器
// （leafer-examples 同法），主 bundle 与 App 单测不加载 three。
//
// 绑定负载（flux 轨，scada-demo 点表刷新同法）：10Hz setInterval 生成模拟数据注入 page
// scope → three-canvas 绑定管线（useScopeSelector paths 订阅 → 求值 → TransformEngine →
// SceneManager.updateProperty），spin 弧度持续积分驱动 cube 自旋、heat 驱动 orb 高度 /
// ring 显隐 / cube 材质色，构成 fps 基准的绑定热路径负载。

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerThreeRenderers(registry);

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

// plan 473 (V3-F5): AI 生成链路出口演示——canned mock LlmProvider（离线、无外部 API），
// 返回一份合法 three-canvas schema JSON（generateFromPrompt 的围栏剥离/校验/修复回路照常工作）。
const CANNED_SCHEMA_JSON = JSON.stringify(
  {
    type: 'three-canvas',
    scene: {
      camera: { position: [5, 4, 8], fov: 55 },
      environment: { background: '#101826' },
      lights: [
        { type: 'ambient', intensity: 0.7 },
        { type: 'directional', position: [5, 8, 5], intensity: 1.2 },
      ],
      models: [
        { id: 'generated-cube', primitive: { geometry: { type: 'box', args: { width: 1.4, height: 1.4, depth: 1.4 } }, material: { type: 'standard', color: '#7ea6ff' } }, position: [-1.4, 0.4, 0] },
        { id: 'generated-sphere', primitive: { geometry: { type: 'sphere', args: { radius: 0.8 } }, material: { type: 'standard', color: '#ffb86b' } }, position: [1.6, 0.5, 0] },
      ],
    },
  },
  null,
  2,
);

function createCannedLlmProvider(): LlmProvider {
  return {
    complete: async () => CANNED_SCHEMA_JSON,
  };
}

/** plan 473 (V3-F4): 坏 url 演示画布 schema——error 态内建 UI（文案 + Retry）的展示载体。 */
const brokenUrlDemoSchema = {
  type: 'three-canvas',
  testid: 'three-demo-error-canvas',
  height: '220px',
  className: 'rounded-xl overflow-hidden border border-[var(--nop-nav-border)]',
  scene: {
    camera: { position: [0, 0, 6] },
    lights: [{ type: 'ambient', intensity: 0.5 }],
    models: [{ id: 'missing', url: 'https://nonexistent.invalid/models/missing.glb', interactive: false }],
  },
};

function makeDemoEnv(onNotify?: (level: string, message: string) => void): RendererEnv {
  return {
    fetcher: async <T,>(api: ExecutableApiRequest) => {
      console.log('[three-canvas-demo] ajax', api.method ?? 'GET', api.url);
      return { status: 0, data: { value: 42 } as T };
    },
    notify: (level, message) => {
      onNotify?.(level, message);
      console.log('[three-canvas-demo] notify', level, message);
    },
    navigate: (to) => {
      if (typeof to === 'string') window.location.hash = to;
      else window.history.back();
    },
  };
}

/** 热度 → 蓝→红渐变色（与 schema 的 heatColor 绑定配套，页面积分避免表达式里拼字符串）。 */
function heatToColor(heat: number): string {
  const t = Math.min(100, Math.max(0, heat)) / 100;
  const r = Math.round(0x3d + (0xe0 - 0x3d) * t);
  const g = Math.round(0x5a + (0x52 - 0x5a) * t);
  const b = Math.round(0x80 + (0x52 - 0x80) * t);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

interface ThreeCanvasDemoPageProps {
  onBack: () => void;
}

export function ThreeCanvasDemoPage({ onBack }: ThreeCanvasDemoPageProps) {
  const [notifications, setNotifications] = useState<Array<{ id: number; text: string }>>([]);
  const notificationId = useRef(0);
  const notifyRef = useRef<(level: string, message: string) => void>(null);
  notifyRef.current = (level: string, message: string) => {
    notificationId.current += 1;
    const id = notificationId.current;
    setNotifications((prev) => [{ id, text: `${level}: ${message}` }, ...prev].slice(0, 4));
  };
  const env = useMemo(() => makeDemoEnv((level, message) => notifyRef.current?.(level, message)), []);
  const [sim, setSim] = useState<ThreeDemoSim>({ spin: 0, heat: 40, heatColor: heatToColor(40) });

  useEffect(() => {
    let spin = 0;
    const timer = setInterval(() => {
      const t = Date.now() / 1000;
      spin = (spin + 0.08) % (Math.PI * 2);
      const heat = 50 + 45 * Math.sin(t / 3);
      setSim({ spin, heat, heatColor: heatToColor(heat) });
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // plan 473 (V3-F5): AI 生成演示状态（canned provider，离线）
  const [generatedJson, setGeneratedJson] = useState<string | null>(null);
  const [generatedSchema, setGeneratedSchema] = useState<ThreeCanvasSchema | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  return (
    <main className="h-screen grid place-items-center p-6">
      <section className="max-w-[1100px] w-full h-full p-10 rounded-3xl bg-[var(--nop-hero-bg)] border border-[var(--nop-hero-border)] shadow-[var(--nop-hero-shadow)] flex flex-col min-h-0">
        <Button
          variant="outline"
          className="mb-[18px] px-3.5 py-2.5 rounded-full border border-[var(--nop-nav-border)] bg-[var(--nop-nav-surface)] text-[var(--nop-text-strong)] font-sans text-[13px] font-bold cursor-pointer transition-[transform,box-shadow,border-color] duration-160 hover:-translate-y-px hover:shadow-[var(--nop-nav-shadow-active)] hover:border-[var(--nop-nav-hover-border)]"
          onClick={onBack}
        >
          Back to Home
        </Button>
        <p className="mb-3 uppercase tracking-[0.16em] text-xs text-[var(--nop-eyebrow)]">3D Rendering · three-canvas</p>
        <h1 className="m-0 mb-2">three-canvas 数据驱动 3D 场景演示页</h1>
        <p className="text-lg leading-relaxed text-[var(--nop-body-copy)]">
          声明式图元（box/sphere/cylinder/cone/torus/plane）+ 相机/四类灯光 + 表达式绑定
          （tween 过渡、range 映射、condition 显隐）+ time 触发循环关键帧 + onObjectClick。
          页面 10Hz 注入模拟数据驱动绑定热路径（cube 自旋 / orb 浮沉 / ring 报警显隐 / 立方体热度变色）。
          画布支持轨道控制（拖拽旋转、滚轮缩放）。
        </p>
        <div className="mt-4 flex items-center gap-3">
          <Button
            variant="outline"
            data-testid="three-demo-ai-generate"
            disabled={generating}
            onClick={async () => {
              setGenerating(true);
              setGenerationError(null);
              try {
                const schema = await AISchemaGenerator.generateFromPrompt({
                  prompt: 'Generate a small product showcase scene with a cube and a sphere',
                  provider: createCannedLlmProvider(),
                });
                setGeneratedJson(JSON.stringify(schema, null, 2));
                setGeneratedSchema(schema);
              } catch (error) {
                setGenerationError(error instanceof Error ? error.message : String(error));
              } finally {
                setGenerating(false);
              }
            }}
          >
            {generating ? 'Generating…' : 'AI 生成 schema（离线演示）'}
          </Button>
          {generatedSchema ? (
            <Button variant="ghost" data-testid="three-demo-ai-apply" onClick={() => { setGeneratedSchema(null); setGeneratedJson(null); }}>
              恢复默认场景
            </Button>
          ) : null}
          {generationError ? <span className="text-sm text-destructive">{generationError}</span> : null}
        </div>
        {generatedJson ? (
          <pre
            data-testid="three-demo-ai-json"
            className="mt-3 max-h-40 overflow-auto rounded-lg bg-black/30 p-3 text-xs text-[var(--nop-body-copy)]"
          >
            {generatedJson}
          </pre>
        ) : null}

        <div className="mt-6">
          <SchemaRenderer
            key={generatedSchema ? 'generated' : 'default'}
            schemaUrl={generatedSchema ? 'playground://pages/three-canvas-demo-generated' : 'playground://pages/three-canvas-demo'}
            schema={
              generatedSchema
                ? ({
                    type: 'page',
                    body: [
                      // keep the observability handle + canvas sizing on the generated scene
                      { ...generatedSchema, testid: 'three-demo-canvas', height: 'min(62vh, 560px)' },
                    ],
                  } as unknown as typeof threeCanvasDemoSchema)
                : threeCanvasDemoSchema
            }
            data={sim}
            env={env}
            registry={registry as never}
            formulaCompiler={formulaCompiler}
          />
        </div>

        <div data-testid="three-demo-notify" className="mt-3 min-h-[20px] text-xs text-[var(--nop-body-copy)]">
          {notifications.map((entry) => (
            <div key={entry.id}>{entry.text}</div>
          ))}
        </div>

        {/* plan 473 (V3-F4): error 态内建 UI 演示（坏 url → 文案 + Retry） */}
        <div className="mt-4">
          <SchemaRenderer
            schemaUrl="playground://pages/three-canvas-demo-error"
            schema={brokenUrlDemoSchema}
            env={env}
            registry={registry as never}
            formulaCompiler={formulaCompiler}
          />
        </div>
      </section>
    </main>
  );
}
