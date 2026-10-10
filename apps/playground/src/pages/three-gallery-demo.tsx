import { useEffect, useMemo, useRef, useState } from 'react';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import type { RendererEnv, ScopeRef } from '@nop-chaos/flux-core';
import { IndustrialAdapter, type IndustrialTagConfig } from '@nop-chaos/flux-renderers-3d';
import { createDefaultEnv } from '@nop-chaos/flux-react';
import { Button } from '@nop-chaos/ui';
import {
  GALLERY_EXAMPLES,
  GallerySchemaRenderer,
  galleryFormulaCompiler,
  galleryRegistry,
  makeGalleryEnv,
  type GalleryExampleMeta,
} from './three-gallery-shared.js';
import {
  buildGltfLoadedSchema,
  buildInteractionsSchema,
  buildLightsSchema,
  buildPrimitivesSchema,
  buildRobotExportGroup,
  buildRobotSourceSchema,
  buildSceneJsonSchema,
  buildCraneSceneJson,
  buildTwinSchema,
} from './three-gallery-schemas.js';

/**
 * three-gallery 示例画廊（559 Phase 4）：6 个单能力点示例 + 数字孪生端到端 showcase，
 * 对标开源 3D 库「基础教学 / showcase」gallery 形态。three.js 仅经本懒加载页进入浏览器。
 *
 * 数据链路（twin 示例）：合成 openSocket 标签帧 → IndustrialAdapter（scope.dataSources.*）
 * → 500ms 镜像进组件 state → SchemaRenderer data → flux 绑定 → SceneManager.updateProperty。
 * GLB 示例：GLTFExporter 现场导出组合场景 → data URL → 第二画布 url 加载（零外部资产）。
 * SceneJSON 示例：three 构建吊车 → toJSON → { json } 薄桥接形态 + name 寻址绑定。
 */

interface DemoSocket {
  onopen: (() => void) | null;
  onclose: ((e: unknown) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onmessage: ((e: { data: string }) => void) | null;
  close(code?: number, reason?: string): void;
  send(data: string): void;
}

const TWIN_TAGS: IndustrialTagConfig = {
  id: 'twin-tags',
  url: 'ws://demo.industrial/pump-station',
  tags: [
    { name: 'temp', address: '40001', type: 'float32' },
    { name: 'running', address: '40002', type: 'bool' },
    { name: 'count', address: '40003', type: 'int16' },
  ],
};

/** 最小可写 ScopeRef（three-industrial-demo 同法：createPrivateEvalScope 只读，adapter.update 需可写）。 */
function createWritableScope(): ScopeRef {
  const data: Record<string, unknown> = { dataSources: {} };
  const getIn = (path: string): unknown => {
    let current: unknown = data;
    for (const segment of path.split('.')) {
      if (current === null || typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[segment];
    }
    return current;
  };
  return {
    id: 'three-gallery-twin-scope',
    path: '$',
    value: data,
    get: getIn,
    has: (path) => getIn(path) !== undefined,
    readOwn: () => data,
    readVisible: () => data,
    materializeVisible: () => data,
    update: (path, value) => {
      const segments = path.split('.');
      let current = data;
      for (let i = 0; i < segments.length - 1; i++) {
        const key = segments[i];
        if (typeof current[key] !== 'object' || current[key] === null) current[key] = {};
        current = current[key] as Record<string, unknown>;
      }
      current[segments[segments.length - 1]] = value;
    },
    merge: () => undefined,
    isolate: true,
  } as ScopeRef;
}

function heatToColor(value: number): string {
  const t = Math.min(100, Math.max(0, value)) / 100;
  const r = Math.round(0x26 + (0xe5 - 0x26) * t);
  const g = Math.round(0xa6 + (0x39 - 0xa6) * t);
  const b = Math.round(0x9e + (0x35 - 0x9e) * t);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

interface ThreeGalleryDemoPageProps {
  onBack: () => void;
}

export function ThreeGalleryDemoPage({ onBack }: ThreeGalleryDemoPageProps) {
  const env = useMemo(() => makeGalleryEnv(), []);
  const [active, setActive] = useState<GalleryExampleMeta['id']>('primitives');
  const meta = GALLERY_EXAMPLES.find((item) => item.id === active)!;

  // —— primitives/keyframes 示例共享模拟数据（10Hz 热路径负载；twin 用标签帧独立链路）
  const [sim, setSim] = useState<Record<string, number | string>>({ spin: 0, heat: 40, heatColor: heatToColor(40), armSwing: 0, hookLift: 1.7, glowColor: '#222833' });

  // —— SceneJSON 示例：three 构建吊车 → toJSON（每会话构建一次）
  const craneJson = useMemo(() => buildCraneSceneJson(), []);

  // —— GLB 示例：GLTFExporter 现场导出 → data URL
  const [glbUrl, setGlbUrl] = useState<string | null>(null);
  const [glbError, setGlbError] = useState<string | null>(null);
  useEffect(() => {
    if (active !== 'gltf' || glbUrl) return;
    const group = buildRobotExportGroup();
    new GLTFExporter().parse(
      group,
      (result) => {
        const blob = new Blob([result as ArrayBuffer], { type: 'model/gltf-binary' });
        setGlbUrl(URL.createObjectURL(blob));
      },
      (error) => setGlbError(error?.message ?? 'GLTFExporter failed'),
      { binary: true },
    );
  }, [active, glbUrl]);

  // —— twin 示例：合成 socket → IndustrialAdapter → scope 镜像
  const twinEnabled = active === 'twin';
  const [tagValues, setTagValues] = useState<Record<string, number>>({ temp: 45, running: 1, count: 40 });
  const socketsRef = useRef<DemoSocket[]>([]);
  const twinEnv = useMemo(() => {
    const base = createDefaultEnv() as RendererEnv;
    return {
      ...base,
      openSocket: (): DemoSocket => {
        const socket: DemoSocket = {
          onopen: null,
          onclose: null,
          onerror: null,
          onmessage: null,
          close: () => undefined,
          send: (data) => {
            if (JSON.parse(data).type !== 'subscribe') return;
            const timer = window.setInterval(() => {
              socket.onmessage?.({
                data: JSON.stringify({
                  type: 'data',
                  payload: {
                    '40001': Math.round((30 + Math.random() * 65) * 10) / 10,
                    '40002': Math.random() > 0.25 ? 1 : 0,
                    '40003': Math.floor(Math.random() * 100),
                  },
                }),
              });
            }, 1000);
            const originalClose = socket.close;
            socket.close = (code?: number, reason?: string) => {
              window.clearInterval(timer);
              originalClose(code, reason);
            };
          },
        };
        socketsRef.current.push(socket);
        window.setTimeout(() => socket.onopen?.(), 30);
        return socket;
      },
    } as unknown as RendererEnv;
  }, []);
  const twinScope = useMemo(() => createWritableScope(), []);
  useEffect(() => {
    if (!twinEnabled) return;
    const adapter = new IndustrialAdapter({ env: twinEnv, scope: twinScope, onError: (code, message) => console.warn(`[three-gallery twin] ${code}: ${message}`) });
    adapter.connect(TWIN_TAGS);
    const mirror = window.setInterval(() => {
      setTagValues({
        temp: Number(twinScope.get('dataSources.temp') ?? 45),
        running: Number(twinScope.get('dataSources.running') ?? 0),
        count: Number(twinScope.get('dataSources.count') ?? 0),
      });
    }, 500);
    return () => {
      window.clearInterval(mirror);
      adapter.disconnect(TWIN_TAGS.id);
    };
  }, [twinEnabled, twinEnv, twinScope]);

  // —— primitives/keyframes 模拟数据（10Hz）；scene-json 示例 1Hz 摆动
  useEffect(() => {
    if (twinEnabled) return;
    const period = active === 'scene-json' ? 1000 : 100;
    const timer = window.setInterval(() => {
      const t = Date.now() / 1000;
      const heat = 50 + 45 * Math.sin(t / 3);
      setSim({
        spin: (t * 0.8) % (Math.PI * 2),
        heat,
        heatColor: heatToColor(heat),
        armSwing: 0.5 * Math.sin(t / 2.5),
        hookLift: 1.7 + 0.5 * Math.sin(t / 4),
        glowColor: heat > 70 ? '#e53935' : '#2dd4bf',
      });
    }, period);
    return () => window.clearInterval(timer);
  }, [active, twinEnabled]);

  const schema = useMemo(() => {
    switch (active) {
      case 'primitives':
        return buildPrimitivesSchema();
      case 'lights':
        return buildLightsSchema();
      case 'scene-json':
        return buildSceneJsonSchema(craneJson);
      case 'gltf':
        return buildRobotSourceSchema();
      case 'keyframes':
        return buildInteractionsSchema();
      default:
        return buildTwinSchema();
    }
  }, [active, craneJson]);

  const twinData = {
    tagTemp: tagValues.temp,
    tagRunning: tagValues.running,
    tagCount: tagValues.count,
    pumpColor: tagValues.running ? '#26a69a' : '#90a4ae',
  };
  // GLB 加载画布：url 就绪后与源画布并排（key=glbUrl 保证加载一次）
  const glbSchema = useMemo(() => (glbUrl ? buildGltfLoadedSchema(glbUrl) : null), [glbUrl]);

  return (
    <main className="min-h-screen flex flex-col p-4 gap-3">
      <header className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack} data-testid="three-gallery-back">
          ← Back to Home
        </Button>
        <div>
          <p className="mb-1 uppercase tracking-[0.16em] text-xs text-[var(--nop-eyebrow)]">3D Rendering · three-canvas gallery</p>
          <h1 className="m-0 text-xl font-bold">three-gallery 示例画廊（图元材质 / 灯光 / 原生 JSON / GLB / 关键帧 / 数字孪生）</h1>
        </div>
      </header>
      <div className="flex items-center gap-3 flex-wrap rounded-xl border border-[var(--nop-nav-border)] bg-[var(--nop-nav-surface)] p-3">
        <div className="flex gap-2 flex-wrap">
          {GALLERY_EXAMPLES.map((item) => (
            <Button
              key={item.id}
              type="button"
              variant={active === item.id ? 'default' : 'outline'}
              size="sm"
              data-testid={item.testid}
              onClick={() => setActive(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <div className="ml-auto text-sm text-[var(--nop-body-copy)] max-w-[520px]">{meta.description}</div>
      </div>

      {twinEnabled ? (
        <div className="flex gap-4 text-sm rounded-lg border border-[var(--nop-nav-border)] bg-[var(--nop-nav-surface)] px-4 py-2" data-testid="three-gallery-twin-tags">
          <span>tagTemp（float32）：<b data-testid="three-gallery-twin-temp">{tagValues.temp.toFixed(1)}</b></span>
          <span>tagRunning（bool）：<b data-testid="three-gallery-twin-running">{tagValues.running}</b></span>
          <span>tagCount（int16）：<b data-testid="three-gallery-twin-count">{tagValues.count}</b></span>
          <span className="opacity-70">IndustrialAdapter 合成 socket 1Hz 帧 → 500ms 镜像 → flux 绑定</span>
        </div>
      ) : null}

      <div className="flex-1 min-h-0 flex flex-col gap-3">
        <div className="rounded-xl border border-[var(--nop-nav-border)] bg-[#0b1220] overflow-hidden">
          <GallerySchemaRenderer
            key={`${active}-main`}
            schemaUrl="playground://pages/three-gallery"
            schema={schema as never}
            data={twinEnabled ? twinData : sim}
            env={twinEnabled ? twinEnv : env}
            registry={galleryRegistry as never}
            formulaCompiler={galleryFormulaCompiler}
          />
        </div>
        {active === 'gltf' ? (
          glbError ? (
            <div className="text-sm text-destructive">{glbError}</div>
          ) : glbSchema ? (
            <div className="rounded-xl border border-[var(--nop-nav-border)] bg-[#0b1220] overflow-hidden" data-testid="three-gallery-gltf-loaded-wrap">
              <GallerySchemaRenderer
                key={glbUrl ?? 'glb'}
                schemaUrl="playground://pages/three-gallery-gltf-loaded"
                schema={glbSchema as never}
                env={env}
                registry={galleryRegistry as never}
                formulaCompiler={galleryFormulaCompiler}
              />
            </div>
          ) : (
            <div className="text-sm text-[var(--nop-body-copy)]" data-testid="three-gallery-gltf-pending">
              GLTFExporter 导出中…
            </div>
          )
        ) : null}
      </div>
    </main>
  );
}
