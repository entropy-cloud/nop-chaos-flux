import { describe, expect, it } from 'vitest';
import type { ScadaSymbolNode } from '../../serialization/config-types.js';
import {
  alignSelection,
  distributeSelection,
  type AlignDirection,
  type DistributeDirection,
} from './align-distribute.js';

function rect(id: string, x: number, y: number, w = 50, h = 50): ScadaSymbolNode {
  return { id, type: 'scada-rect', x, y, width: w, height: h };
}

function patchOf(
  result: { diff?: { updated: Array<{ id: string; patch: Partial<ScadaSymbolNode> }> } },
  id: string,
): Partial<ScadaSymbolNode> | undefined {
  return result.diff!.updated.find((u) => u.id === id)?.patch;
}

describe('alignSelection (design-toolbox.md §4.2.1)', () => {
  it('returns insufficient-selection when < 2 nodes', () => {
    expect(alignSelection([rect('a', 0, 0)], 'left')).toEqual({ ok: false, error: 'insufficient-selection' });
    expect(alignSelection([], 'left')).toEqual({ ok: false, error: 'insufficient-selection' });
  });

  it('aligns left: all x = min x', () => {
    const nodes = [rect('a', 10, 0), rect('b', 100, 0), rect('c', 50, 0)];
    const res = alignSelection(nodes, 'left');
    expect(res.ok).toBe(true);
    expect(patchOf(res, 'a')?.x).toBeUndefined();
    expect(patchOf(res, 'b')?.x).toBe(10);
    expect(patchOf(res, 'c')?.x).toBe(10);
  });

  it('aligns right: all right edges = max right edge', () => {
    const nodes = [rect('a', 10, 0, 50), rect('b', 100, 0, 50), rect('c', 50, 0, 30)];
    const res = alignSelection(nodes, 'right');
    // max right = 150 (b)
    expect(patchOf(res, 'a')?.x).toBe(100); // 150 - 50
    expect(patchOf(res, 'b')?.x).toBeUndefined(); // already at right
    expect(patchOf(res, 'c')?.x).toBe(120); // 150 - 30
  });

  it('aligns hcenter: centers align to bbox horizontal center', () => {
    const nodes = [rect('a', 0, 0, 50), rect('b', 100, 0, 50)];
    const res = alignSelection(nodes, 'hcenter');
    // bbox: left 0, right 150, center 75
    expect(patchOf(res, 'a')?.x).toBe(50); // 75 - 25
    expect(patchOf(res, 'b')?.x).toBe(50); // 75 - 25
  });

  it('aligns top: all y = min y', () => {
    const nodes = [rect('a', 0, 30), rect('b', 0, 10), rect('c', 0, 200)];
    const res = alignSelection(nodes, 'top');
    expect(patchOf(res, 'a')?.y).toBe(10);
    expect(patchOf(res, 'b')?.y).toBeUndefined();
    expect(patchOf(res, 'c')?.y).toBe(10);
  });

  it('aligns bottom: all bottom edges = max bottom edge', () => {
    const nodes = [rect('a', 0, 0, 50, 50), rect('b', 0, 100, 50, 50)];
    const res = alignSelection(nodes, 'bottom');
    // max bottom = 150 (b)
    expect(patchOf(res, 'a')?.y).toBe(100); // 150 - 50
    expect(patchOf(res, 'b')?.y).toBeUndefined();
  });

  it('aligns vcenter: centers align to bbox vertical center', () => {
    const nodes = [rect('a', 0, 0, 50, 40), rect('b', 0, 100, 50, 60)];
    const res = alignSelection(nodes, 'vcenter');
    // bbox top 0 bottom 160 center 80
    expect(patchOf(res, 'a')?.y).toBe(60); // 80 - 20
    expect(patchOf(res, 'b')?.y).toBe(50); // 80 - 30
  });

  it('does not emit patch for nodes that do not move', () => {
    const nodes = [rect('a', 10, 10), rect('b', 10, 100)];
    const res = alignSelection(nodes, 'left');
    expect(res.diff!.updated.find((u) => u.id === 'a')).toBeUndefined();
    expect(res.diff!.updated.find((u) => u.id === 'b')).toBeUndefined();
    // both already at x=10 = min, no movement
    expect(res.diff!.updated).toHaveLength(0);
  });

  it('horizontal direction does not touch y, vertical does not touch x', () => {
    const nodes = [rect('a', 0, 0), rect('b', 100, 200)];
    const hRes = alignSelection(nodes, 'left');
    for (const u of hRes.diff!.updated) {
      expect(u.patch.y).toBeUndefined();
    }
    const vRes = alignSelection(nodes, 'top');
    for (const u of vRes.diff!.updated) {
      expect(u.patch.x).toBeUndefined();
    }
  });

  it('all six directions run without error on a valid selection', () => {
    const nodes = [rect('a', 0, 0), rect('b', 30, 40), rect('c', 80, 90)];
    const dirs: AlignDirection[] = ['left', 'right', 'top', 'bottom', 'hcenter', 'vcenter'];
    for (const d of dirs) {
      expect(alignSelection(nodes, d).ok).toBe(true);
    }
  });
});

describe('distributeSelection (design-toolbox.md §4.2.1)', () => {
  it('returns insufficient-selection when < 3 nodes', () => {
    expect(distributeSelection([rect('a', 0, 0), rect('b', 10, 0)], 'horizontal')).toEqual({
      ok: false,
      error: 'insufficient-selection',
    });
  });

  it('distributes horizontally: equal spacing by x', () => {
    const nodes = [rect('a', 0, 0), rect('b', 100, 0), rect('c', 300, 0)];
    const res = distributeSelection(nodes, 'horizontal');
    expect(res.ok).toBe(true);
    // first=0, last=300, step=150 → b target = 150
    expect(patchOf(res, 'a')?.x).toBeUndefined();
    expect(patchOf(res, 'b')?.x).toBe(150);
    expect(patchOf(res, 'c')?.x).toBeUndefined();
  });

  it('distributes vertically: equal spacing by y', () => {
    const nodes = [rect('a', 0, 0), rect('b', 0, 50), rect('c', 0, 200)];
    const res = distributeSelection(nodes, 'vertical');
    // first=0, last=200, step=100 → b target = 100
    expect(patchOf(res, 'b')?.y).toBe(100);
  });

  it('sorts nodes before distributing (unsorted input)', () => {
    const nodes = [rect('c', 300, 0), rect('a', 0, 0), rect('b', 100, 0)];
    const res = distributeSelection(nodes, 'horizontal');
    // b (x=100) should move to 150
    expect(patchOf(res, 'b')?.x).toBe(150);
  });

  it('does not modify the orthogonal axis', () => {
    const nodes = [rect('a', 0, 5), rect('b', 100, 50), rect('c', 300, 200)];
    const res = distributeSelection(nodes, 'horizontal');
    for (const u of res.diff!.updated) {
      expect(u.patch.y).toBeUndefined();
    }
  });

  it('both directions run without error on a valid selection', () => {
    const nodes = [rect('a', 0, 0), rect('b', 50, 60), rect('c', 200, 300)];
    const dirs: DistributeDirection[] = ['horizontal', 'vertical'];
    for (const d of dirs) {
      expect(distributeSelection(nodes, d).ok).toBe(true);
    }
  });
});
