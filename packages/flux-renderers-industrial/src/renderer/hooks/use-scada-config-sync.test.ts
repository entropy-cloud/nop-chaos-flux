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
