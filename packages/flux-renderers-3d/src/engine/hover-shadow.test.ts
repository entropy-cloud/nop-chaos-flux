import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { SceneManager, type SceneManagerOptions } from './scene-manager.js';
import type { HoverEvent } from './scene-manager.js';
import type { ThreeSceneConfig } from '../schemas.js';

/**
 * Plan 473 Phase 1 (visual-quality V3): real hover (pointermove + enter/leave
 * + emissive highlight with restore) and shadow wiring (shadowMap.enabled,
 * per-mesh castShadow/receiveShadow, light.target scene membership, shadow
 * camera coverage). Uses the established makeManager harness pattern
 * (renderer stub + injected scheduleFrame + captured DOM listeners).
 */

interface Harness {
  manager: SceneManager;
  renderer: RendererStub & { shadowMap: { enabled: boolean } };
  domListeners: Map<string, Array<(e: unknown) => void>>;
  scheduled: Array<() => void>;
  fire: (type: string, event: unknown) => void;
  ready: Promise<void>;
}

type RendererStub = {
  domElement: HTMLCanvasElement;
  setSize: (w: number, h: number) => void;
  render: (scene: THREE.Scene, camera: THREE.Camera) => void;
  dispose: () => void;
};

function makeHarness(
  configOverrides: Partial<ThreeSceneConfig> = {},
  overrides: Partial<SceneManagerOptions> = {},
): Harness {
  const domListeners = new Map<string, Array<(e: unknown) => void>>();
  const canvas = {
    addEventListener: (type: string, cb: (e: unknown) => void) => {
      const list = domListeners.get(type) ?? [];
      list.push(cb);
      domListeners.set(type, list);
    },
    removeEventListener: vi.fn(),
    getBoundingClientRect: () => ({ width: 800, height: 600, left: 0, top: 0 }),
    style: {},
  } as unknown as HTMLCanvasElement;
  const renderer = {
    domElement: canvas,
    setSize: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    shadowMap: { enabled: false },
  } as unknown as RendererStub & { shadowMap: { enabled: boolean } };

  const scheduled: Array<() => void> = [];
  const base: ThreeSceneConfig = {
    camera: { position: [0, 0, 10] as [number, number, number] },
    lights: [
      { type: 'ambient', intensity: 0.6 },
      {
        type: 'directional',
        position: [6, 10, 6],
        castShadow: true,
        target: [0, 0, 0],
      },
    ],
    models: [
      {
        id: 'cube',
        primitive: { geometry: { type: 'box', width: 2, height: 2, depth: 2 } },
        position: [0, 0, 0],
        interactive: true,
        castShadow: true,
        receiveShadow: true,
      } as unknown as ThreeSceneConfig['models'][number],
    ],
    ...configOverrides,
  };
  const manager = new SceneManager(base, {
    rendererFactory: () => renderer as unknown as THREE.WebGLRenderer,
    scheduleFrame: (cb) => {
      scheduled.push(cb);
      return () => undefined;
    },
    controlsFactory: () =>
      ({ update: vi.fn(), dispose: vi.fn() }) as unknown as import('three/examples/jsm/controls/OrbitControls.js').OrbitControls,
    ...overrides,
  });
  manager.container = {
    appendChild: vi.fn(),
    clientWidth: 800,
    clientHeight: 600,
  } as unknown as HTMLElement;
  manager.init();
  const ready = manager.loadModels();
  return {
    ready,
    manager,
    renderer,
    domListeners,
    scheduled,
    fire: (type, event) => {
      for (const cb of domListeners.get(type) ?? []) cb(event);
    },
  };
}

function clientToNdc(clientX: number, clientY: number): { clientX: number; clientY: number } {
  return { clientX, clientY };
}

describe('real hover — pointermove + emissive highlight (plan 473 V3-F1)', () => {
  it('registers a pointermove listener and dispatches hover enter/leave on movement', async () => {
    const harness = makeHarness();
    expect(harness.domListeners.has('pointermove')).toBe(true);

    await harness.ready;
    const events: HoverEvent[] = [];
    harness.manager.onHover((e) => events.push(e));

    // move over the cube centre (NDC ~0,~0 with the default camera setup the
    // cube at [0,1,0] projected near centre; generous sweep covers it)
    harness.fire('pointermove', clientToNdc(400, 300));
    harness.scheduled.splice(0).forEach((cb) => cb()); // flush rAF throttle

    const enter = events.find((e) => e.hovered);
    expect(enter?.modelId).toBe('cube');

    // move far away → leave
    harness.fire('pointermove', clientToNdc(20, 20));
    harness.scheduled.splice(0).forEach((cb) => cb());
    const leave = events.find((e) => !e.hovered);
    expect(leave?.modelId).toBe('cube');
  });

  it('boosts emissive on hover and restores the original value on leave', async () => {
    const harness = makeHarness();
    await harness.ready;
    const model = harness.manager.getModel('cube');
    expect(model).toBeTruthy();
    const mesh = model!.root as THREE.Mesh;
    const material = mesh.material as THREE.MeshStandardMaterial;
    const originalEmissive = material.emissive.getHex();
    const originalIntensity = material.emissiveIntensity;

    harness.fire('pointermove', clientToNdc(400, 300));
    harness.scheduled.splice(0).forEach((cb) => cb());
    expect(material.emissive.getHex()).not.toBe(originalEmissive);

    harness.fire('pointermove', clientToNdc(20, 20));
    harness.scheduled.splice(0).forEach((cb) => cb());
    expect(material.emissive.getHex()).toBe(originalEmissive);
    expect(material.emissiveIntensity).toBe(originalIntensity);
  });

  it('restores emissive when the manager is disposed mid-hover', async () => {
    const harness = makeHarness();
    await harness.ready;
    const mesh = harness.manager.getModel('cube')!.root as THREE.Mesh;
    const material = mesh.material as THREE.MeshStandardMaterial;
    const originalEmissive = material.emissive.getHex();

    harness.fire('pointermove', clientToNdc(400, 300));
    harness.scheduled.splice(0).forEach((cb) => cb());
    expect(material.emissive.getHex()).not.toBe(originalEmissive);

    harness.manager.dispose();
    expect(material.emissive.getHex()).toBe(originalEmissive);
  });

  it('skips highlight for MeshBasicMaterial (no emissive) without throwing', async () => {
    const harness = makeHarness();
    await harness.ready;
    // basic material swap after load (emissive-less surface): hover events
    // still fire, only the emissive boost is absent
    const mesh = harness.manager.getModel('cube')!.root as THREE.Mesh;
    mesh.material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const events: HoverEvent[] = [];
    harness.manager.onHover((e) => events.push(e));

    expect(() => {
      harness.fire('pointermove', clientToNdc(400, 300));
      harness.scheduled.splice(0).forEach((cb) => cb());
    }).not.toThrow();
    expect(events.some((e) => e.hovered)).toBe(true);
  });

  it('keeps the pointerdown/up driven hover for touch taps (no move)', async () => {
    const harness = makeHarness();
    await harness.ready;
    const events: HoverEvent[] = [];
    harness.manager.onHover((e) => events.push(e));
    harness.fire('pointerdown', clientToNdc(400, 300));
    harness.scheduled.splice(0).forEach((cb) => cb());
    expect(events.some((e) => e.hovered)).toBe(true);
  });
});

describe('shadow wiring (plan 473 V3-F2)', () => {
  it('enables shadowMap when a light declares castShadow', () => {
    const harness = makeHarness();
    expect(harness.renderer.shadowMap.enabled).toBe(true);
  });

  it('applies mesh castShadow/receiveShadow from the model schema', async () => {
    const harness = makeHarness();
    await harness.ready;
    const mesh = harness.manager.getModel('cube')!.root as THREE.Mesh;
    expect(mesh.castShadow).toBe(true);
    expect(mesh.receiveShadow).toBe(true);
  });

  it('adds the directional light target to the scene and widens the shadow camera', () => {
    const harness = makeHarness();
    const scene = harness.manager.getScene();
    expect(scene).toBeTruthy();
    const target = scene!.children.find((child) => child.type === 'DirectionalLight' && child.castShadow) as
      | THREE.DirectionalLight
      | undefined;
    expect(target).toBeTruthy();
    // light.target must be a scene child for target position to take effect
    expect(target!.target.parent).toBe(scene);
    const cam = target!.shadow.camera as THREE.OrthographicCamera;
    expect(cam.right).toBeGreaterThanOrEqual(12);
    expect(cam.top).toBeGreaterThanOrEqual(12);
    expect(cam.far).toBeGreaterThan(30);
  });

  it('leaves shadowMap disabled when no light casts shadows', () => {
    const harness = makeHarness({
      lights: [{ type: 'ambient', intensity: 0.6 }],
    });
    expect(harness.renderer.shadowMap.enabled).toBe(false);
  });
});

describe('load progress plumbing (plan 473 V3-F4)', () => {
  function urlHarness(emitter: (signal: { onProgress: (e: ProgressEvent) => void }) => void) {
    const loaderStub = () => ({
      loadAsync: (url: string, onProgress?: (e: ProgressEvent) => void) => {
        if (onProgress) emitter({ onProgress });
        return Promise.resolve({ scene: new THREE.Group(), animations: [] });
      },
    });
    return makeHarness(
      {
        models: [{ id: 'glb-model', url: 'model.glb', interactive: true }] as unknown as ThreeSceneConfig['models'],
      },
      {
        loaderFactory: loaderStub,
      } as Partial<SceneManagerOptions>,
    );
  }

  it('forwards ProgressEvent ratios when total is known', async () => {
    const ratios: Array<number | null> = [];
    const harness = urlHarness(({ onProgress }) => {
      onProgress({ loaded: 25, total: 100 } as ProgressEvent);
      onProgress({ loaded: 100, total: 100 } as ProgressEvent);
    });
    await harness.ready;
    void harness.manager.loadModels(undefined, (ratio) => { ratios.push(ratio); });
        await new Promise((r) => setTimeout(r, 0));
    expect(ratios).toContain(0.25);
    expect(ratios).toContain(1);
  });

  it('applies a single receiveShadow flag without castShadow', async () => {
    const harness = makeHarness({
      models: [
        {
          id: 'receiver',
          primitive: { geometry: { type: 'box', args: { width: 2 } } },
          receiveShadow: true,
        },
      ] as unknown as ThreeSceneConfig['models'],
    });
    await harness.ready;
    const mesh = harness.manager.getModel('receiver')!.root as THREE.Mesh;
    expect(mesh.receiveShadow).toBe(true);
    expect(mesh.castShadow).toBe(false);
  });

  it('reports null (indeterminate) when the event carries no total', async () => {
    const ratios: Array<number | null> = [];
    const harness = urlHarness(({ onProgress }) => {
      onProgress({ loaded: 42 } as ProgressEvent);
    });
    await harness.ready;
    void harness.manager.loadModels(undefined, (ratio) => ratios.push(ratio));
    await new Promise((r) => setTimeout(r, 0));
    expect(ratios).toContain(null);
  });

  it('does not re-dispatch hover leave/enter for moves within the same model', async () => {
    const harness = makeHarness();
    await harness.ready;
    const events: HoverEvent[] = [];
    harness.manager.onHover((e) => events.push(e));
    harness.fire('pointermove', clientToNdc(400, 300));
    harness.scheduled.splice(0).forEach((cb) => cb());
    harness.fire('pointermove', clientToNdc(410, 290));
    harness.scheduled.splice(0).forEach((cb) => cb());
    // single enter, no leave while staying on the same model
    expect(events.filter((e) => e.hovered)).toHaveLength(1);
    expect(events.filter((e) => !e.hovered)).toHaveLength(0);
  });
});

describe('model-loader progress passthrough (plan 473 V3-F4)', () => {
  it('drops late progress events after cancel (generation guard)', async () => {
    const { ModelLoader } = await import('./model-loader.js');
    const progressSeen: Array<number | null> = [];
    let fireProgress: (() => void) | undefined = undefined;
    const loader = new ModelLoader(() => ({
      loadAsync: (_url: string, onProgress?: (e: ProgressEvent) => void) =>
        new Promise((_resolve, reject) => {
          fireProgress = () => {
            onProgress?.({ loaded: 50, total: 100 } as ProgressEvent);
            reject(new Error('aborted'));
          };
        }),
    }));
    const settled = loader.load(
      { id: 'm', url: 'model.glb' },
      () => undefined,
      () => undefined,
      (event) => progressSeen.push(event.total > 0 ? Math.min(1, event.loaded / event.total) : null),
    );
    loader.cancel();
    const emit = fireProgress as unknown as () => void;
    emit();
    await settled;
    // late progress after cancel must be dropped by the generation guard
    expect(progressSeen).toEqual([]);
  });
});
