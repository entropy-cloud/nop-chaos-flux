import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { SceneManager } from './scene-manager.js';
import { createPrimitiveMesh, resolvePrimitiveModel } from './primitive-factory.js';
import type { ThreeSceneConfig } from '../schemas.js';

describe('probe primitive', () => {
  it('debug', async () => {
    const mesh = createPrimitiveMesh({ geometry: { type: 'box' }, material: { type: 'standard', color: '#336699' } });
    console.log('factory mesh:', mesh?.constructor.name, (mesh?.material as THREE.MeshStandardMaterial)?.color?.getHexString?.());
    const resolved = resolvePrimitiveModel({ id: 'box', primitive: { geometry: { type: 'box' } } } as never);
    console.log('resolved:', resolved.kind);
    const scheduled: Array<() => void> = [];
    const manager = new SceneManager(
      { camera: { position: [0, 0, 5] }, lights: [], models: [{ id: 'box', primitive: { geometry: { type: 'box' }, material: { type: 'standard', color: '#336699' } } }] } as unknown as ThreeSceneConfig,
      {
        rendererFactory: () => ({ domElement: { addEventListener: vi.fn(), removeEventListener: vi.fn(), style: {} }, setSize: vi.fn(), render: vi.fn(), dispose: vi.fn() }) as unknown as THREE.WebGLRenderer,
        scheduleFrame: (cb) => { scheduled.push(cb); return () => undefined; },
        controlsFactory: () => ({ update: vi.fn(), dispose: vi.fn() }) as never,
        loaderFactory: () => ({ loadAsync: () => Promise.resolve({ scene: new THREE.Group(), animations: [] }) }) as never,
      },
    );
    manager.init();
    const ready = manager.loadModels();
    console.log('getModel box:', manager.getModel('box')?.root.name, 'children:', manager.getModel('box')?.root.children.length);
    await ready;
    console.log('after ready — getModel:', !!manager.getModel('box'));
    expect(true).toBe(true);
  });
});
