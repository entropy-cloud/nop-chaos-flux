import { describe, expect, it } from 'vitest';
import { planListMerge } from './list-order.js';

/** Compact rendering of a slot plan as `d<deltaIndex>b<baseIndex>` tokens, `-` for absent. */
function shape(baseCount: number, deltaIndexes: number[]): string[] {
  return planListMerge(baseCount, deltaIndexes).map((slot) => {
    const d = slot.deltaIndex >= 0 ? `d${slot.deltaIndex}` : '-';
    const b = slot.baseIndex >= 0 ? `b${slot.baseIndex}` : '-';
    return `${d}${b}`;
  });
}

describe('planListMerge', () => {
  it('keeps delta order and anchors new delta entries after their base neighbour', () => {
    // base = [a1,a2,a3,a4,a5]; delta = [b1, a2, b3]
    expect(shape(5, [-1, 1, -1])).toEqual(['-b0', 'd0-', 'd1b1', 'd2-', '-b2', '-b3', '-b4']);
  });

  it('emits pure delta order when delta fully covers base', () => {
    // base = [a1,a2,a3]; delta = [a3,b1,a1]
    expect(shape(3, [2, -1, 0])).toEqual(['d0b2', 'd1-', 'd2b0', '-b1']);
  });

  it('appends every delta entry when there is no overlap', () => {
    expect(shape(2, [-1, -1])).toEqual(['-b0', '-b1', 'd0-', 'd1-']);
  });

  it('collapses a single base element move into one reposition', () => {
    // base = [a1,a2,a3]; delta = [a2,a1,a3]
    expect(shape(3, [1, 0, 2])).toEqual(['d0b1', 'd1b0', 'd2b2']);
  });

  it('preserves untouched base entries before the last anchor', () => {
    // base = [a1,a2,a3,a4,a5]; delta = [a5]
    expect(shape(5, [4])).toEqual(['-b0', '-b1', '-b2', '-b3', 'd0b4']);
  });

  it('handles an empty delta by emitting the base in order', () => {
    expect(shape(3, [])).toEqual(['-b0', '-b1', '-b2']);
  });

  it('emits only delta entries when base is empty', () => {
    expect(shape(0, [-1, -1])).toEqual(['d0-', 'd1-']);
  });

  it('never loses or duplicates a base slot', () => {
    const deltaIndexes = [2, -1, 0, -1, 1, 3];
    const slots = planListMerge(5, deltaIndexes);
    expect(slots).toHaveLength(5 + 2);
    const baseSeen = slots.filter((s) => s.baseIndex >= 0).map((s) => s.baseIndex);
    expect([...baseSeen].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
    const deltaSeen = slots.filter((s) => s.deltaIndex >= 0).map((s) => s.deltaIndex);
    expect([...deltaSeen].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('keeps delta entries in their original relative order', () => {
    const deltaIndexes = [-1, 0, -1, 1];
    const slots = planListMerge(2, deltaIndexes);
    const deltaOrder = slots.filter((s) => s.deltaIndex >= 0).map((s) => s.deltaIndex);
    expect(deltaOrder).toEqual([0, 1, 2, 3]);
  });
});