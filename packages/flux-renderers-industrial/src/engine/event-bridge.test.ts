import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBridge, buildSymbolEventPayload } from './event-bridge.js';
import type { ScadaSymbolEventPayload } from './event-bridge.js';
import { HitResolver } from './hit.js';
import { MockLeafer, MockRect, resetLeaferMock } from '../test-support/leafer-ui-mock.js';

function createBridge(options?: {
  pointValues?: Record<string, unknown>;
  symbolType?: string;
  viewportToWorld?: (point: { x: number; y: number }) => { x: number; y: number };
  hitLeaf?: MockRect | null;
}) {
  const tree = new MockLeafer();
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
    resolver,
    viewportToWorld: options?.viewportToWorld ?? ((point) => ({ x: point.x / 2, y: point.y / 2 })),
    getSymbolType: () => options?.symbolType,
    getPointValues: () => options?.pointValues,
    onSymbolEvent,
  });
  return { tree, bridge, onSymbolEvent };
}

beforeEach(() => {
  resetLeaferMock();
});

describe('EventBridge 引擎事件桥 (I6.4)', () => {
  it('should emit symbol:click on tree tap with normalized payload', () => {
    const { tree, bridge, onSymbolEvent } = createBridge({ symbolType: 'scada-rect', pointValues: { level: 42 } });
    bridge.attach();
    tree.emit('tap', { x: 100, y: 200 });
    expect(onSymbolEvent).toHaveBeenCalledTimes(1);
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

  it('should emit symbol:hover on tree pointer.move', () => {
    const { tree, bridge, onSymbolEvent } = createBridge();
    bridge.attach();
    tree.emit('pointer.move', { x: 10, y: 20 });
    expect(onSymbolEvent).toHaveBeenCalledWith('symbol:hover', expect.objectContaining({ symbolId: 'pump-1' }));
  });

  it('should not emit when nothing is hit (未命中不发射)', () => {
    const { tree, bridge, onSymbolEvent } = createBridge({ hitLeaf: null });
    bridge.attach();
    tree.emit('tap', { x: 10, y: 20 });
    tree.emit('pointer.move', { x: 10, y: 20 });
    expect(onSymbolEvent).not.toHaveBeenCalled();
  });

  it('should ignore events without a numeric point payload', () => {
    const { tree, bridge, onSymbolEvent } = createBridge();
    bridge.attach();
    tree.emit('tap', {});
    tree.emit('tap', { x: 'a', y: 1 });
    tree.emit('tap', null);
    expect(onSymbolEvent).not.toHaveBeenCalled();
  });

  it('should default symbolType to unknown and omit optional fields', () => {
    const { tree, bridge, onSymbolEvent } = createBridge();
    bridge.attach();
    tree.emit('tap', { x: 10, y: 20 });
    const payload = onSymbolEvent.mock.calls[0][1] as ScadaSymbolEventPayload;
    expect(payload.symbolType).toBe('unknown');
    expect(payload.pointValues).toBeUndefined();
    expect(payload.world).toEqual({ x: 5, y: 10 });
    expect(payload.viewport).toEqual({ x: 10, y: 20 });
  });

  it('attach should be idempotent (重复注册幂等)', () => {
    const { tree, bridge, onSymbolEvent } = createBridge();
    bridge.attach();
    bridge.attach();
    tree.emit('tap', { x: 10, y: 20 });
    expect(onSymbolEvent).toHaveBeenCalledTimes(1);
  });

  it('destroy should detach all listeners (引擎生命周期注销)', () => {
    const { tree, bridge, onSymbolEvent } = createBridge();
    bridge.attach();
    bridge.destroy();
    bridge.destroy();
    tree.emit('tap', { x: 10, y: 20 });
    tree.emit('double_tap', { x: 10, y: 20 });
    tree.emit('pointer.move', { x: 10, y: 20 });
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
