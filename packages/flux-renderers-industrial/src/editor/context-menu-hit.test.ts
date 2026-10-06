import { describe, expect, it } from 'vitest';
import type { ScadaSymbolNode } from '../serialization/config-types.js';
import { pickSymbolAtPoint } from './context-menu-hit.js';

function rect(id: string, x: number, y: number, width = 100, height = 100, children?: ScadaSymbolNode[]): ScadaSymbolNode {
  return { id, type: 'scada-rect', x, y, width, height, ...(children ? { children } : {}) } as ScadaSymbolNode;
}

describe('pickSymbolAtPoint (plan 532 S3 Phase 1, collectWorldBounds 世界系 rect)', () => {
  it('hits a top-level symbol containing the world point', () => {
    const symbols = [rect('a', 100, 100)];
    expect(pickSymbolAtPoint(symbols, { x: 150, y: 150 })).toBe('a');
    expect(pickSymbolAtPoint(symbols, { x: 100, y: 100 })).toBe('a');
    expect(pickSymbolAtPoint(symbols, { x: 200, y: 200 })).toBe('a');
  });

  it('returns null for blank canvas (no symbols or point outside all rects)', () => {
    expect(pickSymbolAtPoint([], { x: 50, y: 50 })).toBeNull();
    expect(pickSymbolAtPoint([rect('a', 100, 100)], { x: 50, y: 50 })).toBeNull();
  });

  it('resolves group-nested children via world-space rects (判别性: 裸节点 rect 原语下 parent-relative 错位必挂)', () => {
    // group world (300,200)，子图元 parent-relative (10,10,40,40) → 世界 (310,210)。
    const symbols = [rect('g', 300, 200, 100, 100, [rect('inner', 10, 10, 40, 40)])];
    expect(pickSymbolAtPoint(symbols, { x: 320, y: 230 })).toBe('inner');
    // 裸节点 rect 原语会把 inner 当 (10,10) 世界 → (320,230) 不命中 → 本断言转红。
    expect(pickSymbolAtPoint(symbols, { x: 20, y: 20 })).toBeNull();
  });

  it('prefers the topmost symbol when rects overlap (返回序末尾 = 绘制序顶层)', () => {
    const symbols = [rect('bottom', 0, 0), rect('top', 50, 50)];
    expect(pickSymbolAtPoint(symbols, { x: 80, y: 80 })).toBe('top');
    expect(pickSymbolAtPoint(symbols, { x: 20, y: 20 })).toBe('bottom');
    // 顶层图元挪到数组更后 → 命中随数组序翻转（z-order 语义）。
    const reordered = [rect('top', 50, 50), rect('bottom', 0, 0)];
    expect(pickSymbolAtPoint(reordered, { x: 80, y: 80 })).toBe('bottom');
  });

  it('skips zero-size rects (无宽高语义节点不参与命中)', () => {
    const symbols = [rect('line', 0, 0, 100, 0)];
    expect(pickSymbolAtPoint(symbols, { x: 50, y: 0 })).toBeNull();
  });
});
