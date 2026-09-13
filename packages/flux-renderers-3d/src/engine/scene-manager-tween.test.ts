import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { SceneManager } from './scene-manager.js';
import type { ThreeSceneConfig } from '../schemas.js';

function makeManager() {
  let now = 0;
  const group = new THREE.Group();
  group.name = 'valve';
  group.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial()));
  const scheduled: Array<() => void> = [];
  const manager = new SceneManager(
    {
      camera: { position: [0, 0, 5] },
      lights: [],
      models: [{ id: 'valve', url: 'valve.glb' }],
    } as unknown as ThreeSceneConfig,
    {
      rendererFactory: () =>
        ({ domElement: { addEventListener: vi.fn(), removeEventListener: vi.fn(), style: {} }, setSize: vi.fn(), render: vi.fn(), dispose: vi.fn() }) as unknown as THREE.WebGLRenderer,
      now: () => now,
      scheduleFrame: (cb) => {
        scheduled.push(cb);
        return () => undefined;
      },
      controlsFactory: () => ({ update: vi.fn(), dispose: vi.fn() }) as never,
      loaderFactory: () => ({ loadAsync: () => Promise.resolve({ scene: group, animations: [] }) }) as never,
    },
  );
  return {
    manager,
    group,
    clock: { advance(ms: number) { now += ms; scheduled.splice(0).forEach((cb) => cb()); } },
  };
}

const TWEEN: import('../schemas.js').BindingAnimationConfig = { type: 'tween', duration: 1000, easing: 'linear' };

describe('SceneManager transition-animation integration (plan 466 Phase 2)', () => {
  it('updateProperty with animation tweens over frames and snaps at the end', async () => {
    const { manager, group, clock } = makeManager();
    manager.init();
    await manager.loadModels();
    manager.updateProperty('valve', 'position', [10, 0, 0], TWEEN);
    clock.advance(500);
    expect(group.position.x).toBeCloseTo(5, 1);
    clock.advance(500);
    expect(group.position.x).toBe(10);
    manager.dispose();
  });

  it('frame-queue updates carry animation config into the tween', async () => {
    const { manager, group, clock } = makeManager();
    manager.init();
    await manager.loadModels();
    // drain 语义 = splice（清空）：更新只入队一次
    let drained = false;
    manager.setFrameUpdateQueue({
      drain: () => {
        if (drained) return [];
        drained = true;
        return [{ modelId: 'valve', path: 'position', value: [8, 0, 0], animation: TWEEN }];
      },
    });
    clock.advance(400); // 该帧 drain → tween 启动（startedAt = 当前时钟）
    clock.advance(500); // 下一帧：raw = 500/1000 → 中点
    expect(group.position.x).toBeGreaterThan(0);
    expect(group.position.x).toBeLessThan(8);
    clock.advance(1200);
    expect(group.position.x).toBe(8);
    manager.dispose();
  });

  it('pending-buffer replay applies instantly (adjudicated: replay does not animate)', async () => {
    const { manager, group, clock } = makeManager();
    manager.init();
    // 模型未就绪：带动画配置的更新进 buffer（动画配置被丢弃）
    manager.updateProperty('valve', 'position', [10, 0, 0], TWEEN);
    await manager.loadModels();
    // 回放即时落值（注册后第一帧前已就位，且无中间帧）
    expect(group.position.x).toBe(10);
    clock.advance(1000);
    expect(group.position.x).toBe(10);
    manager.dispose();
  });

  it('dispose clears active tweens (no writes after dispose)', async () => {
    const { manager, group, clock } = makeManager();
    manager.init();
    await manager.loadModels();
    manager.updateProperty('valve', 'position', [10, 0, 0], TWEEN);
    manager.dispose();
    const x = group.position.x;
    clock.advance(1000);
    expect(group.position.x).toBe(x);
  });
});
