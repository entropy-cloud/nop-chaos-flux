import { vi } from 'vitest';
import * as THREE from 'three';

/**
 * SceneManager 测试替身（three-canvas.test.tsx 经 vi.mock('../engine/scene-manager.js') 注入）。
 * 覆盖 use-scene-manager/use-binding-bridge/use-three-events 消费的引擎面：
 * attach/init/loadModels/setFrameUpdateQueue/onPick/onHover/onReady/updateProperty/dispose。
 */

export interface MockDiagnostic {
  code: string;
  message: string;
  error?: unknown;
}

const instances: SceneManager[] = [];

export class SceneManager {
  static instances = instances;

  attach = vi.fn();
  init = vi.fn();
  loadModels = vi.fn(() => {
    this.readyEmitted = true;
    return Promise.resolve();
  });
  setFrameUpdateQueue = vi.fn();
  onPick = vi.fn(() => () => undefined);
  onHover = vi.fn(() => () => undefined);
  onReady = vi.fn((cb: () => void) => {
    this.readyCallbacks.push(cb);
    if (this.readyEmitted) cb();
    return () => undefined;
  });
  updateProperty = vi.fn();
  registerClips = vi.fn();
  startClip = vi.fn();
  notifyEvent = vi.fn();
  dispose = vi.fn();
  getScene = vi.fn(() => new THREE.Scene());
  resize = vi.fn();

  readyEmitted = false;
  readyCallbacks: Array<() => void> = [];

  constructor(public config: unknown, public options?: unknown) {
    instances.push(this);
  }
}

export const sceneManagerMock = {
  instances,
  reset(): void {
    instances.splice(0);
  },
};
