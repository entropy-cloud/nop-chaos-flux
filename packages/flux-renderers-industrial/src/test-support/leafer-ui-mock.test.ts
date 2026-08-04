import { describe, expect, it } from 'vitest';
import { MockApp, MockGroup, MockLeafer, MockRect, resetLeaferMock } from './leafer-ui-mock.js';

// T1/T2 Proof（plan 2026-08-04-2243-3 Workstream 1）：
// mock-invariant 单测——锁定 mock 对真实 leafer 的两处身份/语义对齐，防止未来回归：
// (a) `tree.zoomLayer === tree`（viewport 插件语义；此前独立实例掩蔽 live defect）
// (b) bounds API stub 抛「mock 不建模」错（产线代码误用 mock 路径时可见失败）

describe('leafer-ui-mock invariants (T1/T2 plan 2026-08-04-2243-3)', () => {
  it('T1: app.tree.zoomLayer === app.tree (identity aligned to real leafer viewport plugin)', () => {
    const app = new MockApp({ ground: {}, tree: {}, sky: {} });
    expect(app.tree.zoomLayer).toBe(app.tree);
    // engine 路径经 app.tree.zoomLayer 操作的就是 tree 本身
    app.tree.zoomLayer.move({ x: -100, y: -60 });
    expect(app.tree.x).toBe(-100);
    expect(app.tree.y).toBe(-60);
    expect(app.tree.moveCalls).toEqual([{ x: -100, y: -60 }]);
    app.destroy();
  });

  it('T1: standalone MockLeafer tree.zoomLayer === tree', () => {
    const tree = new MockLeafer();
    expect(tree.zoomLayer).toBe(tree);
    // scaleOfWorld 经 zoomLayer 身份写回 tree 自身
    tree.zoomLayer.scaleOfWorld({ x: 0, y: 0 }, 2);
    expect(tree.scaleX).toBe(2);
    expect(tree.scaleY).toBe(2);
    expect(tree.scaleOfWorldCalls).toHaveLength(1);
  });

  it('T1: tree carries zoom layer capabilities (scaleX/scaleY/x/y defaults)', () => {
    const app = new MockApp({ tree: {} });
    const tree = app.tree;
    expect(tree.scaleX).toBe(1);
    expect(tree.scaleY).toBe(1);
    expect(tree.x).toBe(0);
    expect(tree.y).toBe(0);
    expect(tree.moveCalls).toEqual([]);
    expect(tree.scaleOfWorldCalls).toEqual([]);
    app.destroy();
  });

  it('T2: MockLeaf bounds API stubs throw (mock does not model bounds)', () => {
    const leaf = new MockRect();
    expect(() => leaf.getBoundsToWorld()).toThrow(/bounds API/);
    expect(() => leaf.getBounds()).toThrow(/bounds API/);
    expect(() => leaf.worldBox).toThrow(/bounds API/);
  });

  it('T2: MockGroup/MockLeafer inherit bounds stubs', () => {
    const group = new MockGroup();
    expect(() => group.getBoundsToWorld()).toThrow(/bounds API/);
    const tree = new MockLeafer();
    expect(() => tree.getBounds()).toThrow(/bounds API/);
    expect(() => tree.worldBox).toThrow(/bounds API/);
  });

  it('resetLeaferMock clears pending tap timers without affecting identity invariant', () => {
    resetLeaferMock();
    const app = new MockApp({ tree: {} });
    expect(app.tree.zoomLayer).toBe(app.tree);
    app.destroy();
  });

  it('MockLeaf remains a valid base (toJSON excludes getter-only bounds stubs)', () => {
    const leaf = new MockRect({ id: 'r1' });
    const json = leaf.toJSON();
    expect(json).toMatchObject({ tag: 'Rect' });
    expect(json).not.toHaveProperty('worldBox');
  });
});
