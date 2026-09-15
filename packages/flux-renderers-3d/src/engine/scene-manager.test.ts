import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ModelLoader } from './model-loader.js';
import { SceneManager, type SceneManagerOptions } from './scene-manager.js';
import type { ThreeSceneConfig } from '../schemas.js';

function makeRendererStub() {
  const canvas = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    style: {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    setAttribute: vi.fn(),
  };
  return {
    domElement: canvas,
    setSize: vi.fn(),
    setPixelRatio: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    setSizeInvoked: canvas,
  };
}

type RendererStub = ReturnType<typeof makeRendererStub>;

function makeSceneConfig(overrides: Partial<ThreeSceneConfig> = {}): ThreeSceneConfig {
  return {
    camera: { position: [0, 0, 5], fov: 60 },
    lights: [
      { type: 'ambient', color: '#ffffff', intensity: 0.4 },
      { type: 'directional', color: '#ffffff', intensity: 0.8, position: [5, 5, 5], target: [0, 0, 0], castShadow: true },
      { type: 'point', color: '#ffcc88', intensity: 0.6, position: [0, 2, 0] },
      { type: 'spot', color: '#ffffff', intensity: 0.7, position: [0, 10, 0] },
      { type: 'hemisphere', color: '#ffffff', intensity: 0.5 },
    ],
    environment: { background: '#101820', fog: { color: '#101820', near: 10, far: 100 } },
    models: [],
    ...overrides,
  };
}

interface Harness {
  manager: SceneManager;
  renderer: RendererStub;
  frame: () => void;
  scheduled: Array<() => void>;
}

function makeManager(
  config: ThreeSceneConfig,
  overrides: Partial<SceneManagerOptions> = {},
): Harness {
  const renderer = makeRendererStub();
  const scheduled: Array<() => void> = [];
  const manager = new SceneManager(config, {
    rendererFactory: () => renderer as unknown as THREE.WebGLRenderer,
    scheduleFrame: (cb) => {
      scheduled.push(cb);
      return () => undefined;
    },
    controlsFactory: () => ({ update: vi.fn(), dispose: vi.fn() }) as unknown as import('three/examples/jsm/controls/OrbitControls.js').OrbitControls,
    ...overrides,
  });
  return { manager, renderer, frame: () => scheduled.splice(0).forEach((cb) => cb()), scheduled };
}

function makeGltfResult(id: string): { scene: THREE.Group; animations: THREE.AnimationClip[] } {
  const group = new THREE.Group();
  group.name = id;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
  group.add(mesh);
  return { scene: group, animations: [] };
}

// 注入面与 GLTFLoader 对齐：loadAsync(url)（ModelLoader D5 注入点，测试按 url 索引）。
type GltfFixture = { scene: THREE.Group; animations: THREE.AnimationClip[] };
function loaderStub(
  results: Map<string, GltfFixture>,
  failures: Set<string> = new Set(),
): ReturnType<NonNullable<SceneManagerOptions['loaderFactory']>> {
  return {
    loadAsync: (url: string): Promise<GltfFixture> => {
      if (failures.has(url)) return Promise.reject(new Error('load failed'));
      const gltf = results.get(url);
      if (!gltf) return Promise.reject(new Error(`no fixture for ${url}`));
      return Promise.resolve(gltf);
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SceneManager (plan 465 Phase 4, stub renderer)', () => {
  it('assembles lights, background and fog from the scene config', () => {
    const { manager } = makeManager(makeSceneConfig());
    manager.init();
    const scene = manager.getScene();
    expect(scene).toBeInstanceOf(THREE.Scene);
    const lights = scene.children.filter((c) => c instanceof THREE.Light);
    expect(lights).toHaveLength(5);
    expect(lights.some((l) => l instanceof THREE.AmbientLight)).toBe(true);
    expect(lights.some((l) => l instanceof THREE.DirectionalLight)).toBe(true);
    expect(lights.some((l) => l instanceof THREE.PointLight)).toBe(true);
    expect(lights.some((l) => l instanceof THREE.SpotLight)).toBe(true);
    expect(lights.some((l) => l instanceof THREE.HemisphereLight)).toBe(true);
    expect((scene.background as THREE.Color).getHexString()).toBe('101820');
    expect(scene.fog).toBeInstanceOf(THREE.Fog);
    manager.dispose();
  });

  it('dispatches updateProperty by type: position/rotation via set, visible direct, material.color via Color', async () => {
    const model = makeGltfResult('valve');
    const { manager } = makeManager(
      makeSceneConfig({ models: [{ id: 'valve', url: 'valve.glb' }] }),
      { loaderFactory: () => loaderStub(new Map([['valve.glb', model]])) },
    );
    manager.init();
    await manager.loadModels();
    const group = manager.getModel('valve')!.root;

    manager.updateProperty('valve', 'position', [1, 2, 3]);
    expect(group.position.toArray()).toEqual([1, 2, 3]);

    manager.updateProperty('valve', 'rotation', [0, Math.PI / 2, 0]);
    expect(group.rotation.y).toBeCloseTo(Math.PI / 2);

    // mesh-root 模型形态：material 挂在 model root 上（I2.2 图元库的 Mesh root 同形）
    const mesh = group.children[0] as THREE.Mesh;
    (group as unknown as { material: THREE.Material }).material = mesh.material as THREE.Material;
    manager.updateProperty('valve', 'material.color', '#ff0000');
    expect((mesh.material as THREE.MeshStandardMaterial).color.getHexString()).toBe('ff0000');

    manager.updateProperty('valve', 'visible', false);
    expect(group.visible).toBe(false);

    // 未知路径静默容错（绑定先行、目标可后置）
    expect(() => manager.updateProperty('valve', 'nope.deeper.path', 1)).not.toThrow();
    manager.dispose();
  });

  it('buffers updates for unregistered models and replays on registration (initial-value preservation)', async () => {
    const model = makeGltfResult('valve');
    const { manager } = makeManager(
      makeSceneConfig({ models: [{ id: 'valve', url: 'valve.glb' }] }),
      { loaderFactory: () => loaderStub(new Map([['valve.glb', model]])) },
    );
    manager.init();
    // 模型未就绪：更新入 pending buffer（modelId::path 键，后写覆盖先写）
    manager.updateProperty('valve', 'position', [1, 1, 1]);
    manager.updateProperty('valve', 'position', [2, 2, 2]);
    manager.updateProperty('valve', 'visible', false);
    expect(manager.getModel('valve')).toBeUndefined();

    await manager.loadModels();
    const group = manager.getModel('valve')!.root;
    expect(group.position.toArray()).toEqual([2, 2, 2]);
    expect(group.visible).toBe(false);
    manager.dispose();
  });

  it('drops pending buffer entries when a model fails to load', async () => {
    const onError = vi.fn();
    const { manager } = makeManager(
      makeSceneConfig({ models: [{ id: 'broken', url: 'broken.glb' }] }),
      { loaderFactory: () => loaderStub(new Map(), new Set(['broken.glb'])) },
    );
    manager.init();
    manager.updateProperty('broken', 'position', [1, 1, 1]);
    await manager.loadModels(onError);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'model-load-failed' }),
    );
    expect(manager.getModel('broken')).toBeUndefined();
    manager.dispose();
  });

  it('drains the registered frame queue once per frame and applies updates', async () => {
    const model = makeGltfResult('valve');
    const drain = vi.fn(() => [
      { modelId: 'valve', path: 'position', value: [4, 5, 6] },
    ]);
    const { manager, frame, scheduled } = makeManager(
      makeSceneConfig({ models: [{ id: 'valve', url: 'valve.glb' }] }),
      { loaderFactory: () => loaderStub(new Map([['valve.glb', model]])) },
    );
    manager.init();
    await manager.loadModels();
    manager.setFrameUpdateQueue({ drain });
    expect(scheduled.length).toBeGreaterThan(0);
    frame();
    frame();
    expect(drain).toHaveBeenCalledTimes(2);
    expect(manager.getModel('valve')!.root.position.toArray()).toEqual([4, 5, 6]);
    manager.dispose();
  });

  it('emits pick events only for interactive models', async () => {
    const interactive = makeGltfResult('valve');
    const plain = makeGltfResult('wall');
    const listeners: Record<string, Array<(e: unknown) => void>> = {};
    const canvas = {
      addEventListener: (type: string, cb: (e: unknown) => void) => {
        (listeners[type] ??= []).push(cb);
      },
      removeEventListener: vi.fn(),
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    };
    const renderer = makeRendererStub();
    (renderer as unknown as { domElement: unknown }).domElement = canvas;
    const { manager } = makeManager(
      makeSceneConfig({
        models: [
          { id: 'valve', url: 'valve.glb', interactive: true, position: [0, 0, 0] },
          { id: 'wall', url: 'wall.glb', position: [10, 0, 0] },
        ],
      }),
      {
        rendererFactory: () => renderer as unknown as THREE.WebGLRenderer,
        loaderFactory: () =>
          loaderStub(
            new Map([
              ['valve.glb', interactive],
              ['wall.glb', plain],
            ]),
          ),
      },
    );
    manager.init();
    await manager.loadModels();

    const onPick = vi.fn();
    const unsubscribe = manager.onPick(onPick);
    // 模拟 pointerdown/up 在画布中心：valve 置于原点，相机看向 -z，射线应命中 valve
    for (const cb of listeners['pointerdown'] ?? []) cb({ clientX: 400, clientY: 300 });
    for (const cb of listeners['pointerup'] ?? []) cb({ clientX: 400, clientY: 300 });
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ modelId: 'valve' }));
    unsubscribe();

    // wall 未声明 interactive：不参与拾取
    onPick.mockClear();
    for (const cb of listeners['pointerdown'] ?? []) cb({ clientX: 400, clientY: 300 });
    for (const cb of listeners['pointerup'] ?? []) cb({ clientX: 400, clientY: 300 });
    expect(onPick).not.toHaveBeenCalled();
    manager.dispose();
  });

  it('fires onReady after all models finish loading', async () => {
    const onReady = vi.fn();
    const a = makeGltfResult('a');
    const { manager } = makeManager(
      makeSceneConfig({ models: [{ id: 'a', url: 'a.glb' }] }),
      { loaderFactory: () => loaderStub(new Map([['a.glb', a]])) },
    );
    manager.init();
    manager.onReady(onReady);
    await manager.loadModels();
    expect(onReady).toHaveBeenCalledTimes(1);
    manager.dispose();
  });

  it('dispose tears down renderer, controls and stops scheduling frames', () => {
    const controls = { update: vi.fn(), dispose: vi.fn() };
    const { manager, renderer, scheduled } = makeManager(makeSceneConfig(), {
      controlsFactory: () => controls as unknown as import('three/examples/jsm/controls/OrbitControls.js').OrbitControls,
    });
    manager.init();
    expect(scheduled.length).toBeGreaterThan(0);
    manager.dispose();
    expect(renderer.dispose).toHaveBeenCalled();
    expect(controls.dispose).toHaveBeenCalled();
    const before = scheduled.length;
    manager.updateProperty('valve', 'position', [1, 1, 1]);
    expect(scheduled.length).toBe(before);
  });

  it('propagates webgl-unavailable when the renderer factory throws', () => {
    const onError = vi.fn();
    const manager = new SceneManager(makeSceneConfig(), {
      rendererFactory: () => {
        throw new Error('no gl context');
      },
      scheduleFrame: () => () => undefined,
    });
    expect(() => manager.init(onError)).not.toThrow();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'webgl-unavailable' }),
    );
  });
});

describe('ModelLoader (generation-guard, D5)', () => {
  it('ignores late loads resolved after cancel() bumps the generation', async () => {
    let resolveLoad: (gltf: { scene: THREE.Group }) => void = () => undefined;
    const innerLoader = {
      loadAsync: () =>
        new Promise<{ scene: THREE.Group }>((resolve) => {
          resolveLoad = resolve;
        }),
    };
    const loader = new ModelLoader(() => innerLoader as unknown as import('three/examples/jsm/loaders/GLTFLoader.js').GLTFLoader);
    const loaded: string[] = [];
    const promise = loader.load({ id: 'a', url: 'a.glb' }, (gltf) => {
      loaded.push(gltf.scene.name);
    });
    loader.cancel();
    resolveLoad({ scene: Object.assign(new THREE.Group(), { name: 'a' }) });
    await promise;
    expect(loaded).toEqual([]);
  });

  it('delivers results resolved within the same generation', async () => {
    const group = Object.assign(new THREE.Group(), { name: 'a' });
    const loader = new ModelLoader(
      () => ({ loadAsync: () => Promise.resolve({ scene: group }) }) as unknown as import('three/examples/jsm/loaders/GLTFLoader.js').GLTFLoader,
    );
    const loaded: string[] = [];
    await loader.load({ id: 'a', url: 'a.glb' }, (gltf) => {
      loaded.push(gltf.scene.name);
    });
    expect(loaded).toEqual(['a']);
  });
});
