import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBridge, buildSymbolEventPayload } from './event-bridge.js';
import type { ScadaSymbolEventPayload } from './event-bridge.js';
import { HitResolver } from './hit.js';
import { MockApp, MockLeafer, MockRect, TAP_MERGE_TIME, resetLeaferMock } from '../test-support/leafer-ui-mock.js';

function createBridge(options?: {
  pointValues?: Record<string, unknown>;
  symbolType?: string;
  viewportToWorld?: (point: { x: number; y: number }) => { x: number; y: number };
  hitLeaf?: MockRect | null;
}) {
  const tree = new MockLeafer();
  // pointer.move/pointer.leave 挂 App 视图面（I15.1 live defect 修复：真实 leafer 空白区
  // 命中路径为空、tree 层收不到 pointer.move——app 面对画布内任意位置恒发射，实测 probe 佐证）
  const app = new MockApp({ ground: {}, sky: {} });
  const leaf = options?.hitLeaf ?? new MockRect({ id: 'pump-1' });
  // 真实 leafer `getByPoint` 返回 `IPickResult { target, path }`（gate-3-review M-2 回归）
  tree.selector.getByPoint = () =>
    options?.hitLeaf === null ? { target: null, path: [] } : { target: leaf, path: [leaf] };
  const resolver = new HitResolver({
    getByPoint: (point) => tree.selector.getByPoint(point),
    idOf: (hit) => (hit as { id?: string })?.id,
  });
  const onSymbolEvent = vi.fn();
  const bridge = new EventBridge({
    tree,
    moveTarget: app,
    resolver,
    viewportToWorld: options?.viewportToWorld ?? ((point) => ({ x: point.x / 2, y: point.y / 2 })),
    getSymbolType: () => options?.symbolType,
    getPointValues: () => options?.pointValues,
    onSymbolEvent,
  });
  return { tree, app, bridge, onSymbolEvent };
}

beforeEach(() => {
  resetLeaferMock();
});

describe('EventBridge 引擎事件桥 (I6.4)', () => {
  it('should emit symbol:click on tree tap with normalized payload', async () => {
    const { tree, bridge, onSymbolEvent } = createBridge({ symbolType: 'scada-rect', pointValues: { level: 42 } });
    bridge.attach();
    // tap 经双击合并延迟 120ms 发射（leafer 交互层语义，I11.1 Proof）
    tree.emit('tap', { x: 100, y: 200 });
    await vi.waitFor(() => expect(onSymbolEvent).toHaveBeenCalledTimes(1));
    expect(onSymbolEvent).toHaveBeenCalledWith('symbol:click', {
      symbolId: 'pump-1',
      symbolType: 'scada-rect',
      pointValues: { level: 42 },
      world: { x: 50, y: 100 },
      viewport: { x: 100, y: 200 },
    });
  });

  it('should emit symbol:dblclick on tree double_tap', () => {
    const { tree, bridge, onSymbolEvent } = createBridge();
    bridge.attach();
    tree.emit('double_tap', { x: 10, y: 20 });
    expect(onSymbolEvent).toHaveBeenCalledWith('symbol:dblclick', expect.objectContaining({ symbolId: 'pump-1' }));
  });

  it('should merge a double tap into dblclick only (双击合并：窗口内第二击取消首击，不发射 click)', async () => {
    const { tree, bridge, onSymbolEvent } = createBridge();
    bridge.attach();
    tree.emit('tap', { x: 10, y: 20 });
    tree.emit('tap', { x: 10, y: 20 });
    expect(onSymbolEvent).toHaveBeenCalledWith('symbol:dblclick', expect.objectContaining({ symbolId: 'pump-1' }));
    await new Promise((resolve) => setTimeout(resolve, TAP_MERGE_TIME + 20));
    expect(onSymbolEvent).not.toHaveBeenCalledWith('symbol:click', expect.anything());
    expect(onSymbolEvent).toHaveBeenCalledTimes(1);
  });

  it('should emit symbol:hover on app pointer.move', () => {
    const { app, bridge, onSymbolEvent } = createBridge();
    bridge.attach();
    app.emit('pointer.move', { x: 10, y: 20 });
    expect(onSymbolEvent).toHaveBeenCalledWith('symbol:hover', expect.objectContaining({ symbolId: 'pump-1' }));
  });

  it('should emit symbol:hover-miss when the pointer leaves a previously hit symbol (hover 退出信号)', () => {
    const { tree, app, bridge, onSymbolEvent } = createBridge();
    bridge.attach();
    app.emit('pointer.move', { x: 10, y: 20 });
    expect(onSymbolEvent).toHaveBeenCalledTimes(1);
    tree.selector.getByPoint = () => ({ target: null, path: [] });
    app.emit('pointer.move', { x: 500, y: 500 });
    expect(onSymbolEvent).toHaveBeenCalledTimes(2);
    expect(onSymbolEvent).toHaveBeenLastCalledWith(
      'symbol:hover-miss',
      expect.objectContaining({ symbolId: 'pump-1' }),
    );
    const missPayload = onSymbolEvent.mock.calls[1][1] as ScadaSymbolEventPayload;
    expect(missPayload.viewport).toBeUndefined();
    expect(missPayload.world).toBeUndefined();
  });

  it('should not emit hover-miss when nothing was previously hovered', () => {
    const { app, bridge, onSymbolEvent } = createBridge({ hitLeaf: null });
    bridge.attach();
    app.emit('pointer.move', { x: 500, y: 500 });
    expect(onSymbolEvent).not.toHaveBeenCalled();
  });

  it('should not emit hover-miss when switching directly to another hit symbol (A→B 不发 miss)', () => {
    const { tree, app, bridge, onSymbolEvent } = createBridge();
    const other = new MockRect({ id: 'pump-2' });
    bridge.attach();
    app.emit('pointer.move', { x: 10, y: 20 });
    tree.selector.getByPoint = () => ({ target: other, path: [other] });
    app.emit('pointer.move', { x: 30, y: 40 });
    const names = onSymbolEvent.mock.calls.map((call) => call[0] as string);
    expect(names).toEqual(['symbol:hover', 'symbol:hover']);
  });

  it('should emit symbol:hover-miss when the pointer leaves the canvas (pointer.leave)', () => {
    const { app, bridge, onSymbolEvent } = createBridge();
    bridge.attach();
    app.emit('pointer.move', { x: 10, y: 20 });
    expect(onSymbolEvent).toHaveBeenCalledTimes(1);
    app.emit('pointer.leave');
    expect(onSymbolEvent).toHaveBeenCalledTimes(2);
    expect(onSymbolEvent).toHaveBeenLastCalledWith(
      'symbol:hover-miss',
      expect.objectContaining({ symbolId: 'pump-1' }),
    );
  });

  it('should not emit hover-miss on pointer.leave when nothing was hovered', () => {
    const { app, bridge, onSymbolEvent } = createBridge({ hitLeaf: null });
    bridge.attach();
    app.emit('pointer.leave');
    expect(onSymbolEvent).not.toHaveBeenCalled();
  });

  it('should not emit when nothing is hit (未命中不发射)', async () => {
    const { tree, app, bridge, onSymbolEvent } = createBridge({ hitLeaf: null });
    bridge.attach();
    tree.emit('tap', { x: 10, y: 20 });
    tree.emit('double_tap', { x: 10, y: 20 });
    app.emit('pointer.move', { x: 10, y: 20 });
    await new Promise((resolve) => setTimeout(resolve, TAP_MERGE_TIME + 20));
    expect(onSymbolEvent).not.toHaveBeenCalled();
  });

  it('should ignore events without a numeric point payload', async () => {
    const { tree, app, bridge, onSymbolEvent } = createBridge();
    bridge.attach();
    tree.emit('tap', {});
    tree.emit('tap', { x: 'a', y: 1 });
    tree.emit('tap', null);
    app.emit('pointer.move', {});
    app.emit('pointer.move', null);
    await new Promise((resolve) => setTimeout(resolve, TAP_MERGE_TIME + 20));
    expect(onSymbolEvent).not.toHaveBeenCalled();
  });

  it('should default symbolType to unknown and omit optional fields', async () => {
    const { tree, bridge, onSymbolEvent } = createBridge();
    bridge.attach();
    tree.emit('tap', { x: 10, y: 20 });
    await vi.waitFor(() => expect(onSymbolEvent).toHaveBeenCalled());
    const payload = onSymbolEvent.mock.calls[0][1] as ScadaSymbolEventPayload;
    expect(payload.symbolType).toBe('unknown');
    expect(payload.pointValues).toBeUndefined();
    expect(payload.world).toEqual({ x: 5, y: 10 });
    expect(payload.viewport).toEqual({ x: 10, y: 20 });
  });

  it('attach should be idempotent (重复注册幂等)', async () => {
    const { tree, bridge, onSymbolEvent } = createBridge();
    bridge.attach();
    bridge.attach();
    tree.emit('tap', { x: 10, y: 20 });
    await vi.waitFor(() => expect(onSymbolEvent).toHaveBeenCalledTimes(1));
  });

  it('destroy should detach all listeners (引擎生命周期注销)', () => {
    const { tree, app, bridge, onSymbolEvent } = createBridge();
    bridge.attach();
    bridge.destroy();
    bridge.destroy();
    tree.emit('tap', { x: 10, y: 20 });
    tree.emit('double_tap', { x: 10, y: 20 });
    app.emit('pointer.move', { x: 10, y: 20 });
    app.emit('pointer.leave');
    expect(onSymbolEvent).not.toHaveBeenCalled();
  });
});

describe('buildSymbolEventPayload 载荷规范化 (I6.4)', () => {
  it('should construct the §8.2 payload shape field by field', () => {
    const payload = buildSymbolEventPayload({
      symbolId: 'pump-1',
      symbolType: 'scada-rect',
      pointValues: { level: 1 },
      world: { x: 10, y: 20 },
      viewport: { x: 30, y: 40 },
    });
    expect(payload).toEqual({
      symbolId: 'pump-1',
      symbolType: 'scada-rect',
      pointValues: { level: 1 },
      world: { x: 10, y: 20 },
      viewport: { x: 30, y: 40 },
    });
  });

  it('should copy world/viewport (只读快照语义) and omit missing fields', () => {
    const world = { x: 1, y: 2 };
    const payload = buildSymbolEventPayload({ symbolId: 'a', symbolType: 't', world });
    world.x = 99;
    expect(payload.world).toEqual({ x: 1, y: 2 });
    expect(payload.viewport).toBeUndefined();
    expect(payload.pointValues).toBeUndefined();
  });
});
