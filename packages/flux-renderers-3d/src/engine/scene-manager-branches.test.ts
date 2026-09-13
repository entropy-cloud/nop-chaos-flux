import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { probeExpressionPaths, analyzeBindingSubscriptions } from '../binding/flux-eval.js';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createDefaultEnv } from '@nop-chaos/flux-react';
import { SceneManager } from './scene-manager.js';
import type { ThreeSceneConfig } from '../schemas.js';

const compiler = createExpressionCompiler(createFormulaCompiler());
const env = createDefaultEnv();

describe('branch supplement (plan 465 Phase 5 coverage policy)', () => {
  it('probeExpressionPaths: no context → empty; failure → empty; ok → paths', () => {
    expect(probeExpressionPaths('${a.b}')).toEqual([]);
    const context = { compiler, env };
    expect(probeExpressionPaths('${a.b}', context)).toEqual(expect.arrayContaining(['a']));
    expect(probeExpressionPaths('not ${valid', context)).toEqual([]);
  });

  it('analyzeBindingSubscriptions: non-expression garbage and * deps filtered', () => {
    // 非 ${} 且非 bare-path（含空格/符号）→ 不产出路径
    expect(analyzeBindingSubscriptions([{ source: { expression: 'a b + c' } }]).paths).toEqual([]);
    // wildcard dep 过滤分支
    const stubCompiler = {
      compileValue: () => ({ kind: 'dynamic' }),
      createState: () => ({ root: { kind: 'leaf-state', initialized: true, dependencies: { wildcard: false, paths: ['*', 'ok.path'] } } }),
      evaluateWithState: () => ({ value: 1, changed: true, reusedReference: false }),
    } as unknown as typeof compiler;
    const result = analyzeBindingSubscriptions(
      [{ source: { expression: '${some.fn(ok.path)}' } }],
      { compiler: stubCompiler as never, env },
    );
    expect(result.paths).toEqual(['ok.path']);
  });

  it('SceneManager: hover enter/leave transitions and drag threshold', async () => {
    const listeners: Record<string, Array<(e: unknown) => void>> = {};
    const canvas = {
      addEventListener: (type: string, cb: (e: unknown) => void) => {
        (listeners[type] ??= []).push(cb);
      },
      removeEventListener: vi.fn(),
      style: {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    };
    const group = new THREE.Group();
    group.name = 'valve';
    group.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial()));
    const manager = new SceneManager(
      {
        camera: { position: [0, 0, 5] },
        lights: [],
        models: [{ id: 'valve', url: 'valve.glb', interactive: true, position: [0, 0, 0] }],
      } as unknown as ThreeSceneConfig,
      {
        rendererFactory: () =>
          ({ domElement: canvas, setSize: vi.fn(), render: vi.fn(), dispose: vi.fn() }) as unknown as THREE.WebGLRenderer,
        scheduleFrame: () => () => undefined,
        controlsFactory: () => ({ update: vi.fn(), dispose: vi.fn() }) as never,
        loaderFactory: () => ({ loadAsync: () => Promise.resolve({ scene: group, animations: [] }) }) as never,
      },
    );
    manager.init();
    await manager.loadModels();
    const onHover = vi.fn();
    manager.onHover(onHover);
    // enter
    for (const cb of listeners['pointerdown'] ?? []) cb({ clientX: 400, clientY: 300 });
    expect(onHover).toHaveBeenCalledWith({ modelId: 'valve', hovered: true });
    // leave（移出命中区）
    for (const cb of listeners['pointerup'] ?? []) cb({ clientX: 790, clientY: 10 });
    expect(onHover).toHaveBeenCalledWith({ modelId: 'valve', hovered: false });
    onHover.mockClear();

    // 拖拽（位移 > 阈值）不触发 pick
    const onPick = vi.fn();
    manager.onPick(onPick);
    for (const cb of listeners['pointerdown'] ?? []) cb({ clientX: 400, clientY: 300 });
    for (const cb of listeners['pointerup'] ?? []) cb({ clientX: 700, clientY: 300 });
    expect(onPick).not.toHaveBeenCalled();
    manager.dispose();
  });

  it('SceneManager: resize uses container metrics and hemisphere light with ground color', () => {
    const sizeTarget = { clientWidth: 1024, clientHeight: 768, appendChild: vi.fn() };
    const renderer = {
      domElement: { addEventListener: vi.fn(), removeEventListener: vi.fn(), style: {} },
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      render: vi.fn(),
      dispose: vi.fn(),
    };
    const manager = new SceneManager(
      {
        camera: { position: [0, 0, 5] },
        lights: [{ type: 'hemisphere', color: '#ffffff', intensity: 0.5 }],
        environment: {},
        models: [],
      } as unknown as ThreeSceneConfig,
      {
        rendererFactory: () => renderer as unknown as THREE.WebGLRenderer,
        scheduleFrame: () => () => undefined,
        controlsFactory: () => ({ update: vi.fn(), dispose: vi.fn() }) as never,
        loaderFactory: () => ({ loadAsync: () => Promise.resolve({ scene: new THREE.Group(), animations: [] }) }) as never,
      },
    );
    // attach 后 init → setSize 用容器度量
    manager.attach(sizeTarget as unknown as HTMLElement);
    manager.init();
    manager.resize();
    expect(renderer.setSize).toHaveBeenCalledWith(1024, 768);
    expect(sizeTarget.appendChild).toHaveBeenCalled();
    const scene = manager.getScene();
    const hemi = scene.children.find((c) => c instanceof THREE.HemisphereLight) as THREE.HemisphereLight;
    expect(hemi).toBeInstanceOf(THREE.HemisphereLight);
    manager.dispose();
  });

  it('SceneManager: loadModels after dispose resolves without side effects', async () => {
    const manager = new SceneManager(
      { camera: { position: [0, 0, 5] }, lights: [], models: [] } as unknown as ThreeSceneConfig,
      { scheduleFrame: () => () => undefined },
    );
    manager.dispose();
    await expect(manager.loadModels()).resolves.toBeUndefined();
    expect(() => manager.updateProperty('x', 'position', [1, 1, 1])).not.toThrow();
  });
});

describe('disposed-manager branches (plan 465 coverage policy)', () => {
  it('guards all entry points after dispose and dispose is idempotent', async () => {
    const group = new THREE.Group();
    const renderer = {
      domElement: { addEventListener: vi.fn(), removeEventListener: vi.fn(), style: {} },
      setSize: vi.fn(),
      render: vi.fn(),
      dispose: vi.fn(),
    };
    const scheduled: Array<() => void> = [];
    const manager = new SceneManager(
      {
        camera: { position: [0, 0, 5] },
        lights: [{ type: 'ambient', intensity: 0.4 }],
        models: [{ id: 'valve', url: 'valve.glb', interactive: true, position: [0, 0, 0] }],
      } as unknown as ThreeSceneConfig,
      {
        rendererFactory: () => renderer as unknown as THREE.WebGLRenderer,
        scheduleFrame: (cb) => {
          scheduled.push(cb);
          return () => undefined;
        },
        controlsFactory: () => ({ update: vi.fn(), dispose: vi.fn() }) as never,
        loaderFactory: () => ({ loadAsync: () => Promise.resolve({ scene: group, animations: [] }) }) as never,
      },
    );
    manager.init();
    await manager.loadModels();
    manager.dispose();
    manager.dispose();
    await expect(manager.loadModels()).resolves.toBeUndefined();
    expect(() => manager.updateProperty('valve', 'position', [9, 9, 9])).not.toThrow();
    expect(group.position.toArray()).toEqual([0, 0, 0]);
    expect(() => manager.getScene()).toThrow('not initialized');
    expect(manager.getModel('valve')).toBeUndefined();
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
  });

  it('updateProperty tolerates non-object navigation targets and non-set leaves', async () => {
    const group = new THREE.Group();
    const renderer = {
      domElement: { addEventListener: vi.fn(), removeEventListener: vi.fn(), style: {} },
      setSize: vi.fn(),
      render: vi.fn(),
      dispose: vi.fn(),
    };
    const manager = new SceneManager(
      { camera: { position: [0, 0, 5] }, lights: [], models: [{ id: 'm', url: 'm.glb' }] } as unknown as ThreeSceneConfig,
      {
        rendererFactory: () => renderer as unknown as THREE.WebGLRenderer,
        scheduleFrame: () => () => undefined,
        controlsFactory: () => ({ update: vi.fn(), dispose: vi.fn() }) as never,
        loaderFactory: () => ({ loadAsync: () => Promise.resolve({ scene: group, animations: [] }) }) as never,
      },
    );
    manager.init();
    await manager.loadModels();
    // 导航中途命中原始值 → 安全返回
    (group as unknown as Record<string, unknown>).primitive = 42;
    expect(() => manager.updateProperty('m', 'primitive.x.y', 1)).not.toThrow();
    // 末段无 set（普通成员）→ 直接赋值
    manager.updateProperty('m', 'customFlag', true);
    expect((group as unknown as Record<string, unknown>).customFlag).toBe(true);
    manager.dispose();
  });
});
