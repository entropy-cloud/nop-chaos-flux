import { describe, it, expect } from 'vitest';
import { computeSymbolBounds } from './use-scada-config-sync.js';
import { MAX_SCALE, MIN_SCALE, fit } from '../../engine/viewport.js';
import type { ScadaSymbolNode } from '../../serialization/config-types.js';

describe('computeSymbolBounds — custom.points 几何族 (plan 2026-08-04-1558-3 Phase 1)', () => {
  it('derives bounds from custom.points ({x,y} 形式) 而非退化为 0 尺寸', () => {
    const polygon: ScadaSymbolNode = {
      id: 'p1',
      type: 'scada-polygon',
      x: 100,
      y: 200,
      custom: { points: [{ x: 10, y: 10 }, { x: 50, y: 10 }, { x: 30, y: 60 }] },
    };
    const bounds = computeSymbolBounds([polygon]);
    expect(bounds).toBeDefined();
    expect(bounds).toEqual({ x: 110, y: 210, width: 40, height: 50 });
  });

  it('derives bounds from custom.points (flat [x1,y1,...] 形式)', () => {
    const line: ScadaSymbolNode = {
      id: 'l1',
      type: 'scada-line',
      x: 0,
      y: 0,
      custom: { points: [0, 0, 30, 40] },
    };
    const bounds = computeSymbolBounds([line]);
    expect(bounds).toEqual({ x: 0, y: 0, width: 30, height: 40 });
  });

  it('polygon-only 场景 fit 后 scale 有界（< MAX_SCALE）且包围盒含图元', () => {
    const polygon: ScadaSymbolNode = {
      id: 'pg',
      type: 'scada-polygon',
      x: 500,
      y: 500,
      custom: { points: [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 100, y: 150 }] },
    };
    const bounds = computeSymbolBounds([polygon]);
    expect(bounds).toBeDefined();
    expect(bounds!.width).toBe(200);
    expect(bounds!.height).toBe(150);
    const viewport = { width: 800, height: 600 };
    const state = fit(bounds!, viewport, 0);
    expect(state.scale).toBeGreaterThanOrEqual(MIN_SCALE);
    expect(state.scale).toBeLessThan(MAX_SCALE);
    expect(state.scale).toBeLessThan(20);
  });

  it('ignores malformed points (非数字坐标) 并回退到 width/height 矩形', () => {
    const node: ScadaSymbolNode = {
      id: 'bad',
      type: 'scada-polygon',
      x: 10,
      y: 20,
      width: 30,
      height: 40,
      custom: { points: [{ x: 'no', y: 1 }] },
    };
    const bounds = computeSymbolBounds([node]);
    expect(bounds).toEqual({ x: 10, y: 20, width: 30, height: 40 });
  });

  it('aggregates multiple nodes (rect + polygon) into a union bounds', () => {
    const rect: ScadaSymbolNode = { id: 'r', type: 'scada-rect', x: 0, y: 0, width: 50, height: 50 };
    const polygon: ScadaSymbolNode = {
      id: 'p',
      type: 'scada-polygon',
      x: 100,
      y: 100,
      custom: { points: [{ x: 0, y: 0 }, { x: 50, y: 50 }] },
    };
    const bounds = computeSymbolBounds([rect, polygon]);
    expect(bounds).toEqual({ x: 0, y: 0, width: 150, height: 150 });
  });

  it('returns undefined for an empty symbol list', () => {
    expect(computeSymbolBounds([])).toBeUndefined();
  });

  it('returns undefined when no symbols', () => {
    expect(computeSymbolBounds([])).toBeUndefined();
  });
});

// Proof-1/Proof-2 (plan 2026-08-04-2242-2 Phase 1, 失败用例先行)：
// 收口 ScadaSymbolNode x/y 三层契约漂移——JSON 省略 x/y + viewport policy 时，
// bounds consumer 原样读取 node.x/node.y（undefined）→ NaN bounds → NaN viewport → 空白 ready 画布。
// 经 `as ScadaSymbolNode` 绕过当前必填类型构造省略 x/y 的节点；Fix 前应失败（返回 undefined/NaN）。
describe('computeSymbolBounds / viewport pipeline — omitted x/y contract (plan 2026-08-04-2242-2)', () => {
  it('Proof-1a: rect 节点省略 x/y 时 bounds.x/y 为有限（0），width/height 仍按声明', () => {
    const node = { id: 'r', type: 'scada-rect', width: 100, height: 50 } as ScadaSymbolNode;
    const bounds = computeSymbolBounds([node]);
    expect(bounds).toBeDefined();
    expect(Number.isFinite(bounds!.x)).toBe(true);
    expect(Number.isFinite(bounds!.y)).toBe(true);
    expect(bounds!.x).toBe(0);
    expect(bounds!.y).toBe(0);
    expect(bounds!.width).toBe(100);
    expect(bounds!.height).toBe(50);
  });

  it('Proof-1b: custom.points 节点省略 x/y 时 bounds 按 (0,0) 原点 + points 极值得有限包围盒', () => {
    const node = {
      id: 'p',
      type: 'scada-polygon',
      custom: { points: [{ x: 10, y: 10 }, { x: 50, y: 10 }, { x: 30, y: 60 }] },
    } as ScadaSymbolNode;
    const bounds = computeSymbolBounds([node]);
    expect(bounds).toBeDefined();
    expect(Number.isFinite(bounds!.x)).toBe(true);
    expect(Number.isFinite(bounds!.y)).toBe(true);
    expect(Number.isFinite(bounds!.width)).toBe(true);
    expect(Number.isFinite(bounds!.height)).toBe(true);
    // 原点默认 0：bounds = (0+10, 0+10, 40, 50)
    expect(bounds!.x).toBe(10);
    expect(bounds!.y).toBe(10);
    expect(bounds!.width).toBe(40);
    expect(bounds!.height).toBe(50);
  });

  it('Proof-2: 省略 x/y 的 symbol + viewport fit → viewport x/y/scale 全有限（非 NaN-blank）', () => {
    const node = { id: 'r', type: 'scada-rect', width: 100, height: 50 } as ScadaSymbolNode;
    const bounds = computeSymbolBounds([node]);
    expect(bounds).toBeDefined();
    // unionBounds 结果不含 NaN（bounds 四分量全有限）
    expect(Number.isFinite(bounds!.x)).toBe(true);
    expect(Number.isFinite(bounds!.y)).toBe(true);
    expect(Number.isFinite(bounds!.width)).toBe(true);
    expect(Number.isFinite(bounds!.height)).toBe(true);
    // applyInitialViewport 的 fit 分支委托同一 pure fit（viewport.ts:54，engine.fit 同源）
    const state = fit(bounds!, { width: 800, height: 600 }, 0);
    expect(Number.isFinite(state.x)).toBe(true);
    expect(Number.isFinite(state.y)).toBe(true);
    expect(Number.isFinite(state.scale)).toBe(true);
    expect(state.scale).toBeGreaterThanOrEqual(MIN_SCALE);
    expect(state.scale).toBeLessThanOrEqual(MAX_SCALE);
  });
});
