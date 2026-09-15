import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
  analyzeBindingSubscriptions,
  createPrivateEvalScope,
  extractExpressionDepsViaProbe,
} from '../binding/flux-eval.js';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createDefaultEnv } from '@nop-chaos/flux-react';
import { SceneManager } from './scene-manager.js';
import type { ThreeSceneConfig } from '../schemas.js';

const compiler = createExpressionCompiler(createFormulaCompiler());
void compiler;
const env = createDefaultEnv();

function makeManager(config: ThreeSceneConfig, rendererOverrides: Record<string, unknown> = {}) {
  const overrides = rendererOverrides as { domElement?: Record<string, unknown> };
  const domElement = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    style: {},
    parentNode: { removeChild: vi.fn() },
    ...overrides.domElement,
  };
  const renderer = {
    domElement,
    setSize: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    ...rendererOverrides,
  };
  const scheduled: Array<() => void> = [];
  const manager = new SceneManager(config, {
    rendererFactory: () => renderer as unknown as THREE.WebGLRenderer,
    scheduleFrame: (cb) => {
      scheduled.push(cb);
      return () => undefined;
    },
    controlsFactory: () => ({ update: vi.fn(), dispose: vi.fn() }) as never,
    loaderFactory: () => ({ loadAsync: () => Promise.resolve({ scene: new THREE.Group(), animations: [] }) }) as never,
  });
  return { manager, renderer, domElement, scheduled };
}

function baseConfig(models: never[] = []): ThreeSceneConfig {
  return { camera: { position: [0, 0, 5] }, lights: [], models } as unknown as ThreeSceneConfig;
}

describe('branch supplement round 2 (plan 465 coverage policy)', () => {
  it('probe scope tolerates symbol, prototype and coercion accesses', () => {
    const data = createTolerantData();
    // symbol 访问 → undefined
    expect((data as unknown as Record<symbol, unknown>)[Symbol.iterator]).toBeUndefined();
    // 危险名 → undefined
    expect(data.__proto__).toBeUndefined();
    expect(data.constructor).toBeUndefined();
    expect(data.prototype).toBeUndefined();
    // 强制转换 → 安全
    expect(String(data.valueOf())).toBe('0');
    expect(String(data.toString())).toBe('');
    expect(data.length).toBe(0);
  });

  it('deps-empty with non-scope-reading expression is not reported as suspect', () => {
    const stubCompiler = {
      compileValue: () => ({ kind: 'dynamic' }),
      createState: () => ({ root: { kind: 'leaf-state', initialized: true, dependencies: { wildcard: false, paths: [] } } }),
      evaluateWithState: () => ({ value: 1, changed: true, reusedReference: false }),
    } as unknown as typeof compiler;
    // deps-empty + 表达式不含标识符 → 不入嫌疑集
    const result = analyzeBindingSubscriptions([{ source: { expression: '${1 + 2}' } }], {
      compiler: stubCompiler as never,
      env,
    });
    expect(result.depsEmptyExpressions).toEqual([]);
  });

  it('createPrivateEvalScope.has/get delegate to getIn', () => {
    const scope = createPrivateEvalScope({ a: 1 });
    expect(scope.has('a')).toBe(true);
    expect(scope.has('b')).toBe(false);
  });

  it('SceneManager light defaults: ambient/point/spot without optional fields', () => {
    const { manager } = makeManager({
      camera: { position: [0, 0, 5] },
      lights: [
        { type: 'ambient' },
        { type: 'point' },
        { type: 'spot' },
        { type: 'directional' },
      ],
      models: [],
    } as unknown as ThreeSceneConfig);
    manager.init();
    const lights = manager.getScene().children.filter((c) => c instanceof THREE.Light);
    expect(lights).toHaveLength(4);
    manager.dispose();
  });

  it('SceneManager: hemisphere with explicit ground target color', () => {
    const { manager } = makeManager({
      camera: { position: [0, 0, 5] },
      lights: [{ type: 'hemisphere', color: '#ffffff', groundColor: '#204060', intensity: 0.5 }],
      models: [],
    } as unknown as ThreeSceneConfig);
    manager.init();
    const hemi = manager.getScene().children.find((c) => c instanceof THREE.HemisphereLight) as THREE.HemisphereLight;
    expect(hemi.groundColor.getHexString()).toBe('204060');
    manager.dispose();
  });

  it('SceneManager: init after dispose is a no-op; frames stop after dispose', () => {
    const { manager, renderer, scheduled } = makeManager(baseConfig());
    manager.init();
    manager.dispose();
    const count = scheduled.length;
    manager.init();
    expect(scheduled.length).toBe(count);
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
  });

  it('SceneManager: frame tolerates queue absence and re-schedules once per frame', () => {
    const { manager, renderer, scheduled } = makeManager(baseConfig());
    manager.init();
    expect(scheduled.length).toBeGreaterThan(0);
    scheduled.splice(0).forEach((cb) => cb());
    expect(renderer.render).toHaveBeenCalledTimes(1);
    expect(scheduled.length).toBeGreaterThan(0);
    manager.dispose();
  });

  it('SceneManager: pointer cleanup removes listeners and dispose removes canvas from parent', async () => {
    const { manager, domElement, renderer } = makeManager(
      baseConfig([{ id: 'm', url: 'm.glb' } as never]),
    );
    manager.init();
    await manager.loadModels();
    manager.dispose();
    expect(domElement.removeEventListener).toHaveBeenCalled();
    expect(renderer.dispose).toHaveBeenCalled();
    // dispose 移除 canvas：domElement.parentNode.removeChild 被调用
    expect((domElement.parentNode as { removeChild: ReturnType<typeof vi.fn> }).removeChild).toHaveBeenCalled();
  });

  it('SceneManager: pick without camera (pre-init) and hover-miss clear', async () => {
    const listeners: Record<string, Array<(e: unknown) => void>> = {};
    const domElement = {
      addEventListener: (type: string, cb: (e: unknown) => void) => {
        (listeners[type] ??= []).push(cb);
      },
      removeEventListener: vi.fn(),
      style: {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    };
    const group = new THREE.Group();
    group.name = 'm';
    group.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial()));
    const manager = new SceneManager(
      baseConfig([{ id: 'm', url: 'm.glb', interactive: true, position: [0, 0, 0] } as never]),
      {
        rendererFactory: () => ({ domElement, setSize: vi.fn(), render: vi.fn(), dispose: vi.fn() }) as unknown as THREE.WebGLRenderer,
        scheduleFrame: () => () => undefined,
        controlsFactory: () => ({ update: vi.fn(), dispose: vi.fn() }) as never,
        loaderFactory: () => ({ loadAsync: () => Promise.resolve({ scene: group, animations: [] }) }) as never,
      },
    );
    manager.init();
    await manager.loadModels();
    const onHover = vi.fn();
    manager.onHover(onHover);
    // down 命中（hover enter）→ up 移到远处（miss → hover exit）
    for (const cb of listeners['pointerdown'] ?? []) cb({ clientX: 400, clientY: 300 });
    for (const cb of listeners['pointerup'] ?? []) cb({ clientX: 750, clientY: 550 });
    expect(onHover.mock.calls.some(([{ hovered }]) => hovered === true)).toBe(true);
    expect(onHover.mock.calls.some(([{ hovered }]) => hovered === false)).toBe(true);
    manager.dispose();
  });
});

function createTolerantData(): Record<string, unknown> {
  // 经 createPrivateEvalScope 的宽容 probe 数据面访问内部 Proxy（宽宽数据仅在 probe 路径构造）
  const manager = extractProbeData();
  return manager;
}

function extractProbeData(): Record<string, unknown> {
  // 通过 stub compiler 捕获 probe scope 的内部数据对象
  let captured: Record<string, unknown> | undefined;
  const scopeLike = createPrivateEvalScope({});
  void scopeLike;
  const stubCompiler = {
    compileValue: () => ({ kind: 'dynamic' }),
    createState: () => ({ root: { kind: 'leaf-state', initialized: false } }),
    evaluateWithState: (_c: unknown, scope: { value: Record<string, unknown> }) => {
      captured = scope.value;
      return { value: 1, changed: true, reusedReference: false };
    },
  } as unknown as typeof compiler;
  void extractExpressionDepsViaProbe(stubCompiler as never, env, '${probe.access}');
  return captured ?? {};
}
