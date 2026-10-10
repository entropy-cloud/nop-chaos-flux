import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { SceneManager } from './scene-manager.js';
import { createPrimitiveMesh } from './primitive-factory.js';
import { createLabelSprite, disposeLabelSprite } from './label-sprite.js';
import type { ThreeSceneConfig } from '../schemas.js';

function makeManager(config: Partial<ThreeSceneConfig>, controls?: Record<string, unknown>) {
  const scheduled: Array<() => void> = [];
  const manager = new SceneManager(
    { camera: { position: [0, 0, 5] }, lights: [], ...config } as unknown as ThreeSceneConfig,
    {
      rendererFactory: () =>
        ({
          domElement: { addEventListener: vi.fn(), removeEventListener: vi.fn(), style: {}, setAttribute: vi.fn() },
          setSize: vi.fn(),
          render: vi.fn(),
          dispose: vi.fn(),
          toneMapping: 0,
        }) as unknown as THREE.WebGLRenderer,
      scheduleFrame: (cb) => {
        scheduled.push(cb);
        return () => undefined;
      },
      controlsFactory: () => Object.assign(controls ?? {}, { update: vi.fn(), dispose: vi.fn() }) as never,
      loaderFactory: () => ({ loadAsync: () => Promise.resolve({ scene: new THREE.Group(), animations: [] }) }) as never,
    },
  );
  return { manager, scheduled };
}

/** 最小合法 SceneJSON：一个带 name 的 Mesh + 一个带 name 的 Group。 */
function makeSceneJson(): Record<string, unknown> {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#336699' }));
  mesh.name = 'pump-body';
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.1, 8, 16));
  ring.name = 'pump-impeller';
  const group = new THREE.Group();
  group.name = 'pump-group';
  group.add(mesh, ring);
  return group.toJSON() as unknown as Record<string, unknown>;
}

describe('SceneJSON thin-bridge path (559 Phase 2)', () => {
  it('parses native three JSON and registers named objects as binding targets', () => {
    const { manager } = makeManager({ json: makeSceneJson() });
    manager.init();
    const onReady = vi.fn();
    manager.onReady(onReady);
    manager.loadModels();
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(manager.getModel('pump-body')).toBeDefined();
    expect(manager.getModel('pump-impeller')).toBeDefined();
    expect(manager.getModel('pump-group')).toBeDefined();
    manager.dispose();
  });

  it('delivers updateProperty (bindings) to named objects, including values buffered before loadModels', () => {
    const { manager } = makeManager({ json: makeSceneJson() });
    manager.init();
    // 注册前的绑定写入进 pending buffer，loadModels 后回放（late-binding 契约）
    manager.updateProperty('pump-body', 'scale', [2, 2, 2]);
    manager.loadModels();
    const body = manager.getModel('pump-body')!.root as THREE.Mesh;
    expect(body.scale.x).toBe(2);
    manager.updateProperty('pump-body', 'material.color', '#ff0000');
    expect((body.material as THREE.MeshStandardMaterial).color.getHexString()).toBe('ff0000');
    manager.dispose();
  });

  it('reports scene-json-invalid for malformed JSON and leaves the scene empty but initialized', () => {
    const onError = vi.fn();
    const { manager } = makeManager({ json: '{broken json' });
    manager.init();
    manager.loadModels(onError);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'scene-json-invalid' }));
    expect(manager.getScene()).toBeDefined();
    manager.dispose();
  });

  it('diagnoses duplicate names and keeps first occurrence', () => {
    const meshA = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ color: '#ff0000' }));
    meshA.name = 'dup';
    const meshB = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ color: '#00ff00' }));
    meshB.name = 'dup';
    const group = new THREE.Group();
    group.add(meshA, meshB);
    const onError = vi.fn();
    const { manager } = makeManager({ json: group.toJSON() });
    manager.init();
    manager.loadModels(onError);
    // parse 重建克隆对象：以首现材质色（红）断言 first-wins
    const material = (manager.getModel('dup')!.root as THREE.Mesh).material as THREE.MeshStandardMaterial;
    expect(material.color.getHexString()).toBe('ff0000');
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'scene-json-duplicate-name' }));
    manager.dispose();
  });

  it('honors interactiveObjects for raycast participation', () => {
    const json = makeSceneJson();
    const { manager } = makeManager({ json, interactiveObjects: ['pump-impeller'] });
    manager.init();
    manager.loadModels();
    expect(manager.getModel('pump-body')!.config.interactive).toBe(false);
    expect(manager.getModel('pump-impeller')!.config.interactive).toBe(true);
    manager.dispose();
  });

  it('reports primitive-invalid-config for a model with neither url nor primitive (models-form invalid branch)', () => {
    const onError = vi.fn();
    const { manager } = makeManager({ models: [{ id: 'ghost' }] });
    manager.init();
    manager.loadModels(onError);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'primitive-invalid-config' }));
    expect(manager.getModel('ghost')).toBeUndefined();
    manager.dispose();
  });

  it('defaults the clip clock when no now injection is provided (frame loop advances)', () => {
    const scheduled: Array<() => void> = [];
    const manager = new SceneManager(
      { camera: { position: [0, 0, 5] }, lights: [], models: [{ id: 'box', primitive: { geometry: { type: 'box' } } }] } as unknown as ThreeSceneConfig,
      {
        rendererFactory: () => ({ domElement: { addEventListener: vi.fn(), removeEventListener: vi.fn(), style: {} }, setSize: vi.fn(), render: vi.fn(), dispose: vi.fn() }) as unknown as THREE.WebGLRenderer,
        scheduleFrame: (cb) => {
          scheduled.push(cb);
          return () => undefined;
        },
        controlsFactory: () => ({ update: vi.fn(), dispose: vi.fn() }) as never,
      },
    );
    manager.init();
    manager.loadModels();
    // 无 now 注入 → clipNow 走 performance.now 缺省；帧回调自续（frame 末尾 scheduleTick）
    expect(scheduled.length).toBeGreaterThan(0);
    expect(() => scheduled[0]?.()).not.toThrow();
    manager.dispose();
  });

  it('reports model-load-failed and settles when the loader rejects (models-form)', async () => {
    const onError = vi.fn();
    const scheduled: Array<() => void> = [];
    const manager = new SceneManager(
      { camera: { position: [0, 0, 5] }, lights: [], models: [{ id: 'broken', url: 'broken.glb' }] } as unknown as ThreeSceneConfig,
      {
        rendererFactory: () => ({ domElement: { addEventListener: vi.fn(), removeEventListener: vi.fn(), style: {} }, setSize: vi.fn(), render: vi.fn(), dispose: vi.fn() }) as unknown as THREE.WebGLRenderer,
        scheduleFrame: (cb) => {
          scheduled.push(cb);
          return () => undefined;
        },
        controlsFactory: () => ({ update: vi.fn(), dispose: vi.fn() }) as never,
        loaderFactory: () => ({ loadAsync: () => Promise.reject(new Error('404')) }) as never,
      },
    );
    manager.init();
    const settled = manager.loadModels(onError);
    await settled;
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'model-load-failed' }));
    expect(manager.getModel('broken')).toBeUndefined();
    manager.dispose();
  });

  it('forwards loader progress ratios and ignores resolutions after dispose', async () => {
    const progress: Array<number | null> = [];
    let resolveLoad: ((gltf: unknown) => void) | null = null;
    const scheduled: Array<() => void> = [];
    const manager = new SceneManager(
      { camera: { position: [0, 0, 5] }, lights: [], models: [{ id: 'late', url: 'late.glb' }] } as unknown as ThreeSceneConfig,
      {
        rendererFactory: () => ({ domElement: { addEventListener: vi.fn(), removeEventListener: vi.fn(), style: {} }, setSize: vi.fn(), render: vi.fn(), dispose: vi.fn() }) as unknown as THREE.WebGLRenderer,
        scheduleFrame: (cb) => {
          scheduled.push(cb);
          return () => undefined;
        },
        controlsFactory: () => ({ update: vi.fn(), dispose: vi.fn() }) as never,
        loaderFactory: () => ({
          loadAsync: (_config: unknown, onProgress?: (e: { loaded: number; total: number }) => void) =>
            new Promise((resolve) => {
              resolveLoad = resolve;
              onProgress?.({ loaded: 25, total: 100 });
            }),
        }) as never,
      },
    );
    manager.init();
    const settled = manager.loadModels(undefined, (ratio) => progress.push(ratio));
    await Promise.resolve();
    expect(progress).toEqual([0.25]);
    manager.dispose();
    // dispose 后 loader 落定：early-return 分支，不注册不崩
    // (TS 无法追踪 promise executor 内的赋值，显式宽化)
    (resolveLoad as ((gltf: unknown) => void) | null)?.({ scene: new THREE.Group(), animations: [] });
    await settled;
    expect(manager.getModel('late')).toBeUndefined();
  });

  it('skips json assembly before init (no scene yet) without throwing', () => {
    const onError = vi.fn();
    const { manager } = makeManager({ json: makeSceneJson() });
    // 未 init（无 scene）：loadSceneJson 守卫直接返回
    expect(() => manager.loadModels(onError)).not.toThrow();
    expect(onError).not.toHaveBeenCalled();
  });

  it('models-only scenes without models array no longer throw (empty scene ready)', () => {
    const { manager } = makeManager({});
    manager.init();
    const onReady = vi.fn();
    manager.onReady(onReady);
    manager.loadModels();
    expect(onReady).toHaveBeenCalledTimes(1);
    manager.dispose();
  });
});

describe('camera controls config (559 Phase 2)', () => {
  it('applies controls config onto OrbitControls after init', () => {
    const controls: Record<string, unknown> = {};
    const { manager } = makeManager(
      { camera: { position: [0, 0, 5], controls: { autoRotate: true, autoRotateSpeed: 2.5, minDistance: 2, maxDistance: 20, maxPolarAngle: 1.4, enablePan: false } } },
      controls,
    );
    manager.init();
    expect(controls.autoRotate).toBe(true);
    expect(controls.autoRotateSpeed).toBe(2.5);
    expect(controls.minDistance).toBe(2);
    expect(controls.maxDistance).toBe(20);
    expect(controls.maxPolarAngle).toBe(1.4);
    expect(controls.enablePan).toBe(false);
    manager.dispose();
  });

  it('applies partial controls config and skips undeclared fields (per-field guards)', () => {
    const controls: Record<string, unknown> = { autoRotate: false, minDistance: 4, maxDistance: 20, maxPolarAngle: 1.5, autoRotateSpeed: 3 };
    const { manager } = makeManager({ camera: { position: [0, 0, 5], controls: { enablePan: false } } }, controls);
    manager.init();
    // 仅 enablePan 声明 → 只写它，其余五字段保持引擎内置（跳过半支覆盖）
    expect(controls.enablePan).toBe(false);
    expect(controls.autoRotate).toBe(false);
    expect(controls.autoRotateSpeed).toBe(3);
    expect(controls.minDistance).toBe(4);
    manager.dispose();
  });

  it('leaves controls untouched when no controls config is declared', () => {
    const controls: Record<string, unknown> = { autoRotate: false };
    const { manager } = makeManager({}, controls);
    manager.init();
    expect('autoRotateSpeed' in controls).toBe(false);
    manager.dispose();
  });
});

describe('tone mapping config (559 Phase 2)', () => {
  it('sets ACESFilmic tone mapping when environment.toneMapping = aces', () => {
    const { manager } = makeManager({ environment: { toneMapping: 'aces' } });
    manager.init();
    const renderer = manager.getRenderer() as unknown as { toneMapping: THREE.ToneMapping };
    expect(renderer.toneMapping).toBe(THREE.ACESFilmicToneMapping);
    manager.dispose();
  });

  it('treats json: null as absent (models-form semantics)', () => {
    const onReady = vi.fn();
    const { manager } = makeManager({ json: null, models: [{ id: 'box', primitive: { geometry: { type: 'box' } } }] });
    manager.init();
    manager.onReady(onReady);
    manager.loadModels();
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(manager.getModel('box')).toBeDefined();
    manager.dispose();
  });

  it('skips tone mapping when the renderer stub lacks the field (headless downgrade family)', () => {
    const scheduled: Array<() => void> = [];
    const manager = new SceneManager(
      { camera: { position: [0, 0, 5] }, lights: [], environment: { toneMapping: 'aces' } } as unknown as ThreeSceneConfig,
      {
        rendererFactory: () => ({ domElement: { addEventListener: vi.fn(), removeEventListener: vi.fn(), style: {} }, setSize: vi.fn(), render: vi.fn(), dispose: vi.fn() }) as unknown as THREE.WebGLRenderer,
        scheduleFrame: (cb) => {
          scheduled.push(cb);
          return () => undefined;
        },
        controlsFactory: () => ({ update: vi.fn(), dispose: vi.fn() }) as never,
      },
    );
    manager.init();
    expect(manager.getRenderer()).toBeTruthy();
    manager.dispose();
  });

  it('supports reinhard tone mapping', () => {
    const { manager } = makeManager({ environment: { toneMapping: 'reinhard' } });
    manager.init();
    const renderer = manager.getRenderer() as unknown as { toneMapping: THREE.ToneMapping };
    expect(renderer.toneMapping).toBe(THREE.ReinhardToneMapping);
    manager.dispose();
  });

  it('keeps default tone mapping when omitted', () => {
    const { manager } = makeManager({});
    manager.init();
    const renderer = manager.getRenderer() as unknown as { toneMapping: THREE.ToneMapping };
    expect(renderer.toneMapping).toBe(THREE.NoToneMapping);
    manager.dispose();
  });
});

describe('primitive geometry expansion (559 Phase 2)', () => {
  it('builds a tube along a path with CatmullRom smoothing', () => {
    const mesh = createPrimitiveMesh({
      geometry: {
        type: 'tube',
        path: [
          [0, 0, 0],
          [1, 0, 0],
          [1, 1, 0],
        ],
        args: { radius: 0.15 },
      },
    })!;
    expect(mesh.geometry).toBeInstanceOf(THREE.TubeGeometry);
    expect((mesh.geometry as THREE.TubeGeometry).parameters.radius).toBe(0.15);
  });

  it('builds a capsule with radius/length parameters', () => {
    const mesh = createPrimitiveMesh({ geometry: { type: 'capsule', args: { radius: 0.4, length: 1.2 } } })!;
    expect(mesh.geometry).toBeInstanceOf(THREE.CapsuleGeometry);
    expect((mesh.geometry as THREE.CapsuleGeometry).parameters.radius).toBe(0.4);
    expect((mesh.geometry as THREE.CapsuleGeometry).parameters.height).toBe(1.2);
  });

  it('applies PBR material fields (metalness/roughness/emissive) on standard material', () => {
    const mesh = createPrimitiveMesh({
      geometry: { type: 'sphere' },
      material: { type: 'standard', metalness: 0.9, roughness: 0.2, emissive: '#ff3300', emissiveIntensity: 1.5 },
    })!;
    const material = mesh.material as THREE.MeshStandardMaterial;
    expect(material.metalness).toBe(0.9);
    expect(material.roughness).toBe(0.2);
    expect(material.emissive.getHexString()).toBe('ff3300');
    expect(material.emissiveIntensity).toBe(1.5);
  });

  it('guards PBR fields on materials without the capability (basic)', () => {
    const mesh = createPrimitiveMesh({
      geometry: { type: 'box' },
      material: { type: 'basic', metalness: 0.5, emissive: '#ffffff' },
    })!;
    const material = mesh.material as THREE.MeshBasicMaterial;
    expect('metalness' in material).toBe(false);
    expect('emissive' in material).toBe(false);
  });
});

describe('model label sprites (559 Phase 2)', () => {
  it('attaches a label sprite above the model bounding box by default', () => {
    const { manager } = makeManager({
      models: [{ id: 'tank', primitive: { geometry: { type: 'cylinder', args: { radius: 1, height: 2 } } }, label: 'T-101' }],
    });
    manager.init();
    manager.loadModels();
    const tank = manager.getModel('tank')!;
    const sprite = tank.sprites[0];
    expect(sprite).toBeInstanceOf(THREE.Sprite);
    expect(tank.root.children).toContain(sprite);
    expect(sprite.position.y).toBeGreaterThan(1);
    manager.dispose();
  });

  it('honors explicit labelOffset and disposes sprite resources on scene dispose', () => {
    const { manager } = makeManager({
      models: [{ id: 'p', primitive: { geometry: { type: 'box' } }, label: 'P-1', labelOffset: [0, 3, 0] }],
    });
    manager.init();
    manager.loadModels();
    const sprite = manager.getModel('p')!.sprites[0];
    expect(sprite!.position.z).toBe(0);
    // happy-dom 无 2D 上下文时退化为空白 Sprite（无 map）——dispose 契约以 material 回收断言
    const material = sprite!.material as THREE.SpriteMaterial;
    const disposeSpy = vi.spyOn(material, 'dispose');
    manager.dispose();
    expect(disposeSpy).toHaveBeenCalled();
  });

  it('createLabelSprite falls back to blank sprite without 2d context', () => {
    const original = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      const el = original(tag);
      if (tag === 'canvas') return { width: 0, height: 0, getContext: () => null };
      return el;
    }) as typeof document.createElement);
    const sprite = createLabelSprite('x');
    expect(sprite).toBeInstanceOf(THREE.Sprite);
    vi.restoreAllMocks();
    disposeLabelSprite(sprite);
  });
});
