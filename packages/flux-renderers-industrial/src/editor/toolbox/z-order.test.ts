import { describe, expect, it } from 'vitest';
import type { ScadaSymbolNode } from '../../serialization/config-types.js';
import { reorderZOrder, type ZOrderAction } from './z-order.js';

function rect(id: string): ScadaSymbolNode {
  return { id, type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 };
}

describe('reorderZOrder (design-toolbox.md §4.2.2, symbols array rearrange)', () => {
  it('returns symbol-not-found for empty selection', () => {
    expect(reorderZOrder([rect('a')], [], 'toTop')).toEqual({ ok: false, error: 'symbol-not-found' });
  });

  it('returns symbol-not-found when selection id not in symbols', () => {
    expect(reorderZOrder([rect('a')], ['missing'], 'toTop')).toEqual({
      ok: false,
      error: 'symbol-not-found',
    });
  });

  it('toTop moves selection to array end (top layer)', () => {
    const symbols = [rect('a'), rect('b'), rect('c'), rect('d')];
    const res = reorderZOrder(symbols, ['b'], 'toTop');
    expect(res.ok).toBe(true);
    expect(res.newOrder!.map((s) => s.id)).toEqual(['a', 'c', 'd', 'b']);
    expect(res.movedIds).toContain('b');
  });

  it('toBottom moves selection to array start (bottom layer)', () => {
    const symbols = [rect('a'), rect('b'), rect('c'), rect('d')];
    const res = reorderZOrder(symbols, ['c'], 'toBottom');
    expect(res.newOrder!.map((s) => s.id)).toEqual(['c', 'a', 'b', 'd']);
  });

  it('moveUp swaps selected with previous unselected (toward end)', () => {
    const symbols = [rect('a'), rect('b'), rect('c'), rect('d')];
    const res = reorderZOrder(symbols, ['b'], 'moveUp');
    expect(res.newOrder!.map((s) => s.id)).toEqual(['a', 'c', 'b', 'd']);
  });

  it('moveDown swaps selected with next unselected (toward start)', () => {
    const symbols = [rect('a'), rect('b'), rect('c'), rect('d')];
    const res = reorderZOrder(symbols, ['b'], 'moveDown');
    expect(res.newOrder!.map((s) => s.id)).toEqual(['b', 'a', 'c', 'd']);
  });

  it('toTop at end is a no-op (movedIds empty)', () => {
    const symbols = [rect('a'), rect('b'), rect('c')];
    const res = reorderZOrder(symbols, ['c'], 'toTop');
    expect(res.newOrder!.map((s) => s.id)).toEqual(['a', 'b', 'c']);
    expect(res.movedIds).toHaveLength(0);
  });

  it('moveUp at end is a no-op', () => {
    const symbols = [rect('a'), rect('b'), rect('c')];
    const res = reorderZOrder(symbols, ['c'], 'moveUp');
    expect(res.newOrder!.map((s) => s.id)).toEqual(['a', 'b', 'c']);
    expect(res.movedIds).toHaveLength(0);
  });

  it('moveDown at start is a no-op', () => {
    const symbols = [rect('a'), rect('b'), rect('c')];
    const res = reorderZOrder(symbols, ['a'], 'moveDown');
    expect(res.newOrder!.map((s) => s.id)).toEqual(['a', 'b', 'c']);
    expect(res.movedIds).toHaveLength(0);
  });

  it('multi-selection toTop preserves relative order of selected', () => {
    const symbols = [rect('a'), rect('b'), rect('c'), rect('d'), rect('e')];
    const res = reorderZOrder(symbols, ['b', 'd'], 'toTop');
    // unselected a,c,e then selected b,d (in original relative order)
    expect(res.newOrder!.map((s) => s.id)).toEqual(['a', 'c', 'e', 'b', 'd']);
  });

  it('multi-selection moveUp moves the whole block up by one (toward end)', () => {
    const symbols = [rect('a'), rect('b'), rect('c'), rect('d'), rect('e')];
    const res = reorderZOrder(symbols, ['c', 'd'], 'moveUp');
    // block {c,d} at 2,3 swaps with e at 4 → [a,b,e,c,d]
    expect(res.newOrder!.map((s) => s.id)).toEqual(['a', 'b', 'e', 'c', 'd']);
  });

  it('multi-selection moveDown moves the whole block down by one (toward start)', () => {
    const symbols = [rect('a'), rect('b'), rect('c'), rect('d'), rect('e')];
    const res = reorderZOrder(symbols, ['b', 'c'], 'moveDown');
    // block {b,c} at 1,2 swaps with a at 0 → [b,c,a,d,e]
    expect(res.newOrder!.map((s) => s.id)).toEqual(['b', 'c', 'a', 'd', 'e']);
  });

  it('does not mutate input array', () => {
    const symbols = [rect('a'), rect('b'), rect('c')];
    const snapshot = symbols.map((s) => s.id);
    reorderZOrder(symbols, ['a'], 'toTop');
    expect(symbols.map((s) => s.id)).toEqual(snapshot);
  });

  it('all four actions run without error on valid selection', () => {
    const symbols = [rect('a'), rect('b'), rect('c'), rect('d')];
    const actions: ZOrderAction[] = ['toTop', 'toBottom', 'moveUp', 'moveDown'];
    for (const a of actions) {
      expect(reorderZOrder(symbols, ['b'], a).ok).toBe(true);
    }
  });
});
