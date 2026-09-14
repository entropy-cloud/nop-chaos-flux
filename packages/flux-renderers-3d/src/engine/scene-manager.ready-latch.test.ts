import { describe, expect, it } from 'vitest';
import { SceneManager } from './scene-manager.js';
import type { ThreeSceneConfig } from '../schemas.js';

/**
 * ready 闩语义回归（plan 469 Fix）：纯图元场景 loadModels 同步 emitReady，
 * 之后订阅的 onReady 监听器必须立即被调用（React 壳订阅 effect 晚于引擎挂载 effect
 * 一个 render——不重放则 ready 事件被确定性错过，状态停留在 loading）。
 * 真实 SceneManager 级验证（test-support mock 早已建模该语义，live 实现此前缺失）。
 */

const primitiveOnlyConfig: ThreeSceneConfig = {
  camera: { position: [0, 0, 5] },
  lights: [{ type: 'ambient', intensity: 1 }],
  models: [
    { id: 'a', primitive: { geometry: { type: 'box', args: { width: 1 } } } },
    { id: 'b', primitive: { geometry: { type: 'sphere', args: { radius: 1 } } } },
  ],
};

describe('SceneManager ready latch', () => {
  it('invokes onReady listeners subscribed after synchronous emitReady', async () => {
    const manager = new SceneManager(primitiveOnlyConfig);
    await manager.loadModels();
    let called = 0;
    manager.onReady(() => {
      called++;
    });
    expect(called, 'late subscriber must be invoked immediately (latch replay)').toBe(1);
    manager.dispose();
  });

  it('notifies subscribers registered before emitReady and latches for late ones', async () => {
    const manager = new SceneManager(primitiveOnlyConfig);
    const early: number[] = [];
    manager.onReady(() => early.push(1));
    await manager.loadModels();
    expect(early).toEqual([1]);
    let lateCalled = 0;
    manager.onReady(() => {
      lateCalled++;
    });
    expect(lateCalled).toBe(1);
    manager.dispose();
  });
});
