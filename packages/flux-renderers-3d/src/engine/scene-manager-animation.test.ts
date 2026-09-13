import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { SceneManager } from './scene-manager.js';
import type { ThreeSceneConfig } from '../schemas.js';

function makeManager() {
  let now = 0;
  const group = new THREE.Group();
  group.name = 'valve';
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
  group.add(mesh);
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

describe('SceneManager keyframe clip integration (plan 466 Phase 4)', () => {
  it('time-triggered clips play on the frame clock and apply to the target property', async () => {
    const { manager, group, clock } = makeManager();
    manager.init();
    await manager.loadModels();
    manager.registerClips([
      {
        id: 'spin',
        trigger: { type: 'time', source: '' },
        target: { modelId: 'valve', property: 'position.x' },
        keyframes: [
          { time: 0, value: 0 },
          { time: 1000, value: 10 },
        ],
      },
    ]);
    clock.advance(500);
    expect(group.position.x).toBeCloseTo(5, 1);
    clock.advance(500);
    expect(group.position.x).toBe(10);
    manager.dispose();
  });

  it('state/event-triggered clips wait for startClip', async () => {
    const { manager, group, clock } = makeManager();
    manager.init();
    await manager.loadModels();
    manager.registerClips([
      {
        id: 'onOpen',
        trigger: { type: 'state', source: 'sceneState.open' },
        target: { modelId: 'valve', property: 'rotation.y' },
        keyframes: [
          { time: 0, value: 0 },
          { time: 1000, value: 1 },
        ],
      },
    ]);
    clock.advance(1500);
    expect(group.rotation.y).toBe(0); // 未触发：不动
    manager.startClip('onOpen');
    clock.advance(500);
    expect(group.rotation.y).toBeGreaterThan(0);
    expect(group.rotation.y).toBeLessThan(1);
    manager.dispose();
  });

  it('clips targeting a missing model apply once the model registers (late-binding)', async () => {
    const group = new THREE.Group();
    group.name = 'late';
    const manager = new SceneManager(
      {
        camera: { position: [0, 0, 5] },
        lights: [],
        models: [{ id: 'late', url: 'late.glb' }],
      } as unknown as ThreeSceneConfig,
      {
        rendererFactory: () =>
          ({ domElement: { addEventListener: vi.fn(), removeEventListener: vi.fn(), style: {} }, setSize: vi.fn(), render: vi.fn(), dispose: vi.fn() }) as unknown as THREE.WebGLRenderer,
        now: () => 0,
        scheduleFrame: () => () => undefined,
        controlsFactory: () => ({ update: vi.fn(), dispose: vi.fn() }) as never,
        loaderFactory: () => ({ loadAsync: () => Promise.resolve({ scene: group, animations: [] }) }) as never,
      },
    );
    manager.init();
    // 模型未加载：clip 注册不抛错
    manager.registerClips([
      {
        id: 'late-clip',
        trigger: { type: 'time', source: '' },
        target: { modelId: 'late', property: 'position.x' },
        keyframes: [
          { time: 0, value: 0 },
          { time: 1000, value: 5 },
        ],
      },
    ]);
    await manager.loadModels();
    manager.dispose();
  });

  it('clip overrides transition tween on the same target property (clip priority)', async () => {
    const { manager, group, clock } = makeManager();
    manager.init();
    await manager.loadModels();
    manager.updateProperty('valve', 'position.x', 100, { type: 'tween', duration: 10000, easing: 'linear' });
    manager.registerClips([
      {
        id: 'override',
        trigger: { type: 'time', source: '' },
        target: { modelId: 'valve', property: 'position.x' },
        keyframes: [
          { time: 0, value: 0 },
          { time: 1000, value: 1 },
        ],
      },
    ]);
    clock.advance(500);
    // clip 后应用：值来自 clip（0.5），而非 tween（~95）
    expect(group.position.x).toBeCloseTo(0.5, 1);
    manager.dispose();
  });

  it('empty-keyframe clips are rejected at registration with a diagnostic', async () => {
    const onError = vi.fn();
    const { manager } = makeManager();
    manager.init();
    await manager.loadModels();
    manager.registerClips(
      [
        {
          id: 'empty',
          trigger: { type: 'time', source: '' },
          target: { modelId: 'valve', property: 'position.x' },
          keyframes: [],
        },
      ],
      onError,
    );
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'keyframes-degenerate' }));
    manager.dispose();
  });
});

describe('event-triggered clips (plan 466 Phase 4 audit fix F2)', () => {
  it('notifyEvent starts clips whose trigger.source matches the normalized event type', async () => {
    const { manager, group, clock } = makeManager();
    manager.init();
    await manager.loadModels();
    manager.registerClips([
      {
        id: 'onClickSpin',
        trigger: { type: 'event', source: 'object:click' },
        target: { modelId: 'valve', property: 'rotation.y' },
        keyframes: [
          { time: 0, value: 0 },
          { time: 1000, value: 1 },
        ],
      },
      {
        id: 'onHoverClip',
        trigger: { type: 'event', source: 'object:hover' },
        target: { modelId: 'valve', property: 'position.y' },
        keyframes: [
          { time: 0, value: 0 },
          { time: 1000, value: 2 },
        ],
      },
    ]);
    // 未触发前不动
    clock.advance(2000);
    expect(group.rotation.y).toBe(0);
    expect(group.position.y).toBe(0);
    // hover 事件只启动匹配 source 的 clip
    manager.notifyEvent('object:hover');
    clock.advance(500);
    expect(group.position.y).toBeCloseTo(1, 1);
    expect(group.rotation.y).toBe(0);
    // click 事件启动 click clip
    manager.notifyEvent('object:click');
    clock.advance(1000);
    expect(group.rotation.y).toBe(1);
    manager.dispose();
  });
});
