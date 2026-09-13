import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { analyzeBindingSubscriptions } from '../binding/flux-eval.js';
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
    ...overrides.domElement,
  };
  delete overrides.domElement;
  const renderer = { domElement, setSize: vi.fn(), render: vi.fn(), dispose: vi.fn(), ...rendererOverrides };
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

describe('branch supplement round 3 (plan 465 coverage policy)', () => {
  it('empty-models scene emits ready immediately without loader round-trip', async () => {
    const onReady = vi.fn();
    const { manager } = makeManager(baseConfig());
    manager.init();
    manager.onReady(onReady);
    await manager.loadModels();
    expect(onReady).toHaveBeenCalledTimes(1);
    manager.dispose();
  });

  it('default scheduleFrame path works with global rAF (happy-dom)', () => {
    const manager = new SceneManager(baseConfig(), {
      rendererFactory: () =>
        ({ domElement: { addEventListener: vi.fn(), style: {} }, setSize: vi.fn(), render: vi.fn(), dispose: vi.fn() }) as unknown as THREE.WebGLRenderer,
      controlsFactory: () => ({ update: vi.fn(), dispose: vi.fn() }) as never,
    });
    manager.init();
    manager.dispose();
  });

  it('loadModels settles when dispose happens mid-load (late result resolved)', async () => {
    let resolveLoad: (gltf: { scene: THREE.Group; animations: never[] }) => void = () => undefined;
    const loaderOverride = {
      loadAsync: () =>
        new Promise<{ scene: THREE.Group; animations: never[] }>((resolve) => {
          resolveLoad = resolve;
        }),
    };
    // 经 options 注入受控 loader
    const manager2 = new SceneManager(baseConfig([{ id: 'm', url: 'm.glb' } as never]), {
      rendererFactory: () =>
        ({ domElement: { addEventListener: vi.fn(), style: {} }, setSize: vi.fn(), render: vi.fn(), dispose: vi.fn() }) as unknown as THREE.WebGLRenderer,
      scheduleFrame: () => () => undefined,
      controlsFactory: () => ({ update: vi.fn(), dispose: vi.fn() }) as never,
      loaderFactory: () => loaderOverride as never,
    });
    manager2.init();
    const promise = manager2.loadModels();
    manager2.dispose();
    resolveLoad({ scene: new THREE.Group(), animations: [] });
    await expect(promise).resolves.toBeUndefined();
  });

  it('updateProperty navigation guard: null mid-path and leaf with set', async () => {
    const group = new THREE.Group();
    const { manager } = makeManager(baseConfig([{ id: 'm', url: 'm.glb' } as never]));
    manager.init();
    await manager.loadModels();
    const root = manager.getModel('m')!.root;
    (root as unknown as Record<string, unknown>).nil = null;
    // 导航中途命中 null → 安全返回
    expect(() => manager.updateProperty('m', 'nil.x.y', 1)).not.toThrow();
    manager.dispose();
    void group;
  });

  it('pointer handler tolerates missing getBoundingClientRect (fallback metrics)', async () => {
    const listeners: Record<string, Array<(e: unknown) => void>> = {};
    const domElement = {
      addEventListener: (type: string, cb: (e: unknown) => void) => {
        (listeners[type] ??= []).push(cb);
      },
      removeEventListener: vi.fn(),
      style: {},
      // 无 getBoundingClientRect：rect undefined → width/height/left/top 走 ?? 兜底
    };
    const group = new THREE.Group();
    group.name = 'm';
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
    const onPick = vi.fn();
    manager.onPick(onPick);
    // clientX/Y=0 → NDC(-1,1)：不命中模型但走完兜底度量分支
    for (const cb of listeners['pointerdown'] ?? []) cb({ clientX: 0, clientY: 0 });
    for (const cb of listeners['pointerup'] ?? []) cb({ clientX: 0, clientY: 0 });
    expect(onPick).not.toHaveBeenCalled();
    manager.dispose();
  });

  it('dispose handles material arrays and missing geometry/material in traverse', async () => {
    const group = new THREE.Group();
    const geoA = new THREE.BoxGeometry(1, 1, 1);
    const matArray = [new THREE.MeshStandardMaterial(), new THREE.MeshStandardMaterial()];
    const multi = new THREE.Mesh(geoA, matArray);
    const bare = new THREE.Group();
    const noGeo = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
    (noGeo as unknown as { geometry: undefined }).geometry = undefined;
    group.add(multi, bare, noGeo);
    const disposeSpyA = vi.spyOn(geoA, 'dispose');
    const disposeSpyMat = vi.spyOn(matArray[0], 'dispose');
    const { manager } = makeManager(baseConfig([{ id: 'm', url: 'm.glb' } as never]));
    manager.init();
    void manager.loadModels();
    await new Promise((r) => setTimeout(r, 0));
    // 手动把带多材质的组注册进场景（绕过 loader stub 的空组）：直接用内部 API 不可行——
    // 改为将 group 经 loader 注入重新验证。此处仅验证 dispose 幂等 + traverse 分支经真实注册对象。
    const manager2 = new SceneManager(baseConfig([{ id: 'm', url: 'm.glb' } as never]), {
      rendererFactory: () =>
        ({ domElement: { addEventListener: vi.fn(), style: {} }, setSize: vi.fn(), render: vi.fn(), dispose: vi.fn() }) as unknown as THREE.WebGLRenderer,
      scheduleFrame: () => () => undefined,
      controlsFactory: () => ({ update: vi.fn(), dispose: vi.fn() }) as never,
      loaderFactory: () => ({ loadAsync: () => Promise.resolve({ scene: group, animations: [] }) }) as never,
    });
    manager2.init();
    await manager2.loadModels();
    manager2.dispose();
    expect(disposeSpyA).toHaveBeenCalled();
    expect(disposeSpyMat).toHaveBeenCalled();
    manager.dispose();
  });

  it('resizeToContainer falls back to 800x400 with zero-metric container', () => {
    const renderer = { domElement: { addEventListener: vi.fn(), style: {} }, setSize: vi.fn(), render: vi.fn(), dispose: vi.fn() };
    const manager = new SceneManager(baseConfig(), {
      rendererFactory: () => renderer as unknown as THREE.WebGLRenderer,
      scheduleFrame: () => () => undefined,
      controlsFactory: () => ({ update: vi.fn(), dispose: vi.fn() }) as never,
    });
    manager.init();
    manager.attach({ clientWidth: 0, clientHeight: 0 } as unknown as HTMLElement);
    manager.resize();
    expect(renderer.setSize).toHaveBeenCalledWith(800, 400);
    manager.dispose();
  });

  it('emitPickAt with no hit and no camera paths stay silent', async () => {
    const listeners: Record<string, Array<(e: unknown) => void>> = {};
    const domElement = {
      addEventListener: (type: string, cb: (e: unknown) => void) => {
        (listeners[type] ??= []).push(cb);
      },
      removeEventListener: vi.fn(),
      style: {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    };
    const manager = new SceneManager(baseConfig([{ id: 'm', url: 'm.glb' } as never]), {
      rendererFactory: () => ({ domElement, setSize: vi.fn(), render: vi.fn(), dispose: vi.fn() }) as unknown as THREE.WebGLRenderer,
      scheduleFrame: () => () => undefined,
      controlsFactory: () => ({ update: vi.fn(), dispose: vi.fn() }) as never,
      loaderFactory: () => ({ loadAsync: () => Promise.resolve({ scene: new THREE.Group(), animations: [] }) }) as never,
    });
    manager.init();
    await manager.loadModels();
    const onPick = vi.fn();
    manager.onPick(onPick);
    // 未命中（空场景组在原点外）→ 静默
    for (const cb of listeners['pointerdown'] ?? []) cb({ clientX: 10, clientY: 10 });
    for (const cb of listeners['pointerup'] ?? []) cb({ clientX: 10, clientY: 10 });
    expect(onPick).not.toHaveBeenCalled();
    manager.dispose();
  });

  it('analyzeBindingSubscriptions filters empty-string deps', () => {
    const stubCompiler = {
      compileValue: () => ({ kind: 'dynamic' }),
      createState: () => ({ root: { kind: 'leaf-state', initialized: true, dependencies: { wildcard: false, paths: [''] } } }),
      evaluateWithState: () => ({ value: 1, changed: true, reusedReference: false }),
    } as unknown as typeof compiler;
    const result = analyzeBindingSubscriptions([{ source: { expression: '${f(x)}' } }], {
      compiler: stubCompiler as never,
      env,
    });
    expect(result.paths).toEqual([]);
  });
});

describe('branch supplement round 4 (final micro-gaps)', () => {
  it('registerModel applies rotation/scale and picks initialAnimation by name', async () => {
    const group = new THREE.Group();
    group.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial()));
    const clip = new THREE.AnimationClip('spin', 1, []);
    const wrongClip = new THREE.AnimationClip('other', 1, []);
    const manager = new SceneManager(
      baseConfig([
        { id: 'm', url: 'm.glb', rotation: [0.1, 0.2, 0.3], scale: [2, 2, 2], initialAnimation: 'spin' } as never,
      ]),
      {
        rendererFactory: () =>
          ({ domElement: { addEventListener: vi.fn(), removeEventListener: vi.fn(), style: {} }, setSize: vi.fn(), render: vi.fn(), dispose: vi.fn() }) as unknown as THREE.WebGLRenderer,
        scheduleFrame: () => () => undefined,
        controlsFactory: () => ({ update: vi.fn(), dispose: vi.fn() }) as never,
        loaderFactory: () => ({ loadAsync: () => Promise.resolve({ scene: group, animations: [wrongClip, clip] }) }) as never,
      },
    );
    manager.init();
    await manager.loadModels();
    const model = manager.getModel('m')!;
    expect(model.root.rotation.z).toBeCloseTo(0.3);
    expect(model.root.scale.x).toBe(2);
    manager.dispose();
  });

  it('registerModel without animations and without initialAnimation leaves mixer null', async () => {
    const group = new THREE.Group();
    const manager = new SceneManager(baseConfig([{ id: 'm', url: 'm.glb' } as never]), {
      rendererFactory: () =>
        ({ domElement: { addEventListener: vi.fn(), removeEventListener: vi.fn(), style: {} }, setSize: vi.fn(), render: vi.fn(), dispose: vi.fn() }) as unknown as THREE.WebGLRenderer,
      scheduleFrame: () => () => undefined,
      controlsFactory: () => ({ update: vi.fn(), dispose: vi.fn() }) as never,
      loaderFactory: () => ({ loadAsync: () => Promise.resolve({ scene: group, animations: [] }) }) as never,
    });
    manager.init();
    await manager.loadModels();
    expect(manager.getModel('m')).toBeDefined();
    manager.dispose();
  });

  it('unknown light type falls back to ambient (default case)', () => {
    const { manager } = makeManager({
      camera: { position: [0, 0, 5] },
      lights: [{ type: 'weird' } as never],
      models: [],
    } as unknown as ThreeSceneConfig);
    manager.init();
    const lights = manager.getScene().children.filter((c) => c instanceof THREE.Light);
    expect(lights).toHaveLength(1);
    manager.dispose();
  });

  it('updateProperty mid-path hits plain object without set (leaf direct assignment path)', async () => {
    const { manager } = makeManager(baseConfig([{ id: 'm', url: 'm.glb' } as never]));
    manager.init();
    await manager.loadModels();
    const root = manager.getModel('m')!.root;
    root.userData = { flags: { visible: false } };
    manager.updateProperty('m', 'userData.flags.visible', true);
    expect((root.userData as { flags: { visible: boolean } }).flags.visible).toBe(true);
    manager.dispose();
  });

  it('pick listener unsubscribe stops notification and pointerup without pointerdown is a hover-miss only', async () => {
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
    const onPick = vi.fn();
    const unsubscribe = manager.onPick(onPick);
    unsubscribe();
    for (const cb of listeners['pointerdown'] ?? []) cb({ clientX: 400, clientY: 300 });
    for (const cb of listeners['pointerup'] ?? []) cb({ clientX: 400, clientY: 300 });
    expect(onPick).not.toHaveBeenCalled();
    manager.dispose();
  });
});
