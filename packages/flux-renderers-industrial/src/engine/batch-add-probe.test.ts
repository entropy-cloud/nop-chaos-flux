import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetLeaferMock, MockGroup, MockRect } from '../test-support/leafer-ui-mock.js';
import { measureAddStrategies, type AddStrategyTiming } from './batch-add-probe.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));

beforeEach(() => {
  resetLeaferMock();
});

describe('measureAddStrategies (gate-3 §10 m-8 batch.add 探针)', () => {
  it('returns the requested count and full AddStrategyTiming shape (count + 返回 shape)', () => {
    const result = measureAddStrategies(50);
    expect(result.count).toBe(50);
    // 形状断言：count/perNodeMs/batchMs/ratio 四字段齐备且类型正确
    expect(Object.keys(result).sort()).toEqual(['batchMs', 'count', 'perNodeMs', 'ratio']);
    expect(typeof (result as AddStrategyTiming).perNodeMs).toBe('number');
    expect(typeof (result as AddStrategyTiming).batchMs).toBe('number');
    expect(typeof (result as AddStrategyTiming).ratio).toBe('number');
    expect(Number.isFinite(result.perNodeMs)).toBe(true);
    expect(Number.isFinite(result.batchMs)).toBe(true);
    expect(Number.isFinite(result.ratio)).toBe(true);
  });

  it('creates exactly `count` Rect nodes and exercises both per-node and batch Group.add paths', () => {
    // mock 下 Group.add 记录入树节点数，断言两条策略均处理完整 count（不丢节点）。
    // vi.mock 使 'leafer-ui' 的 Group === mock 源的 MockGroup（同一类对象），原型补丁对探针生效。
    // 一次 measureAddStrategies 调用内顺序执行 per-node（逐个 add）与 batch（数组 add）两条路径。
    const perNodeArgs: unknown[][] = [];
    const batchArgs: unknown[][] = [];
    const realAdd = MockGroup.prototype.add;
    const patched = function (this: unknown, node: unknown): unknown {
      if (Array.isArray(node)) batchArgs.push(node);
      else perNodeArgs.push([node]);
      return realAdd.call(this as never, node as never);
    };
    MockGroup.prototype.add = patched as never;
    try {
      measureAddStrategies(25);
    } finally {
      MockGroup.prototype.add = realAdd;
    }
    // per-node 路径：25 次单节点 add
    expect(perNodeArgs.length).toBe(25);
    // batch 路径：1 次数组 add（含 25 节点）
    expect(batchArgs.length).toBe(1);
    expect(batchArgs[0]).toHaveLength(25);
    // 节点实例来自 leafer-ui Rect（mock 下为 MockRect 实例）
    expect(perNodeArgs[0][0]).toBeInstanceOf(MockRect);
    expect((batchArgs[0] as unknown[])[0]).toBeInstanceOf(MockRect);
  });

  it('scales the count parameter through to the returned timing object', () => {
    const small = measureAddStrategies(1);
    const large = measureAddStrategies(500);
    expect(small.count).toBe(1);
    expect(large.count).toBe(500);
    // ratio 始终有限（perNode / max(batch, 0.001)），mock 下 timing 接近 0 但不为 NaN
    expect(Number.isFinite(small.ratio)).toBe(true);
    expect(Number.isFinite(large.ratio)).toBe(true);
  });
});
