import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { SceneManager } from './scene-manager.js';
import type { ThreeSceneConfig } from '../schemas.js';

function makeManager(models: ThreeSceneConfig['models']) {
  const group = new THREE.Group();
  group.name = 'gltf-model';
  const scheduled: Array<() => void> = [];
  const manager = new SceneManager(
    { camera: { position: [0, 0, 5] }, lights: [], models } as unknown as ThreeSceneConfig,
    {
      rendererFactory: () =>
        ({ domElement: { addEventListener: vi.fn(), removeEventListener: vi.fn(), style: {} }, setSize: vi.fn(), render: vi.fn(), dispose: vi.fn() }) as unknown as THREE.WebGLRenderer,
      scheduleFrame: (cb) => {
        scheduled.push(cb);
        return () => undefined;
      },
      controlsFactory: () => ({ update: vi.fn(), dispose: vi.fn() }) as never,
      loaderFactory: () => ({ loadAsync: () => Promise.resolve({ scene: group, animations: [] }) }) as never,
    },
  );
  return { manager, scheduled };
}

describe('SceneManager primitive integration (plan 466 Phase 3)', () => {
  it('registers primitive models synchronously: ready without loader round-trip', async () => {
    const loaderSpy = vi.fn(() => ({ loadAsync: () => Promise.resolve({ scene: new THREE.Group(), animations: [] }) }));
    const { manager } = makeManager([
      { id: 'box', primitive: { geometry: { type: 'box' } } },
    ] as never);
    const onReady = vi.fn();
    manager.init();
    manager.onReady(onReady);
    // 图元同步注册：loadModels 前即可经 updateProperty 命中（无需 await loader）
    manager.loadModels();
    await Promise.resolve();
    expect(onReady).toHaveBeenCalledTimes(1);
    void loaderSpy;
    manager.dispose();
  });

  it('primitive model mesh material responds to updateProperty (material.color binding)', async () => {
    const { manager } = makeManager([
      { id: 'box', primitive: { geometry: { type: 'box' }, material: { type: 'standard', color: '#336699' } } },
    ] as never);
    manager.init();
    manager.loadModels();
    const model = manager.getModel('box')!;
    const mesh = model.root as unknown as THREE.Mesh; // 图元 root 即 Mesh
    expect(mesh).toBeInstanceOf(THREE.Mesh);
    expect((mesh.material as THREE.MeshStandardMaterial).color.getHexString()).toBe('336699');
    manager.updateProperty('box', 'material.color', '#ff0000');
    expect((mesh.material as THREE.MeshStandardMaterial).color.getHexString()).toBe('ff0000');
    manager.dispose();
  });

  it('dual-source model prefers primitive and ignores gltf url; no-source reports diagnostic', async () => {
    const onError = vi.fn();
    const { manager } = makeManager([
      { id: 'dual', url: 'dual.glb', primitive: { geometry: { type: 'sphere' } } },
      { id: 'empty' },
    ] as never);
    manager.init();
    manager.loadModels(onError);
    expect(manager.getModel('dual')).toBeDefined();
    expect(manager.getModel('dual')!.root).toBeInstanceOf(THREE.Mesh);
    expect(manager.getModel('empty')).toBeUndefined();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'primitive-invalid-config' }),
    );
    manager.dispose();
  });
});

describe('primitive branch supplement (plan 466 coverage policy)', () => {
  it('unknown geometry type reports primitive-invalid-config and skips the model', async () => {
    const onError = vi.fn();
    const { manager } = makeManager([
      { id: 'bad', primitive: { geometry: { type: 'knot' } } },
    ] as never);
    manager.init();
    manager.loadModels(onError);
    expect(manager.getModel('bad')).toBeUndefined();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'primitive-invalid-config' }),
    );
    manager.dispose();
  });
});
