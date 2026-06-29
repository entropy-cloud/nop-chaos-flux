import { describe, expect, it } from 'vitest';
import type { ConditionGroupValue, ConditionItemValue } from './types.js';
import { rewriteItemRight } from './utils.js';

function item(id: string, right: unknown): ConditionItemValue {
  return { id, left: { type: 'field', field: 'f' }, op: 'eq', right };
}

function group(children: Array<ConditionGroupValue | ConditionItemValue>): ConditionGroupValue {
  return { id: 'root', conjunction: 'and', children };
}

describe('rewriteItemRight id-collision short-circuit (H29)', () => {
  it('rewrites only the first matching item when ids collide, preserving the survivor', () => {
    // Two leaf items share the id 'dup' (a collision). Only the FIRST (DFS)
    // must be rewritten so the second is not silently cross-written.
    const before = group([item('dup', 'a'), item('dup', 'b')]);
    const after = rewriteItemRight(before, 'dup', 'NEW');

    const [first, second] = after.children as [ConditionItemValue, ConditionItemValue];
    expect(first.right).toBe('NEW');
    expect(second.right).toBe('b');
  });

  it('still rewrites nested matches but short-circuits after the first', () => {
    const nested = group([item('dup', 'keep')]);
    const before = group([item('dup', 'first'), nested, item('dup', 'last')]);
    const after = rewriteItemRight(before, 'dup', 'NEW');

    const children = after.children as Array<ConditionItemValue | ConditionGroupValue>;
    expect((children[0] as ConditionItemValue).right).toBe('NEW');
    // The nested and trailing colliding items must NOT be cross-written.
    const nestedChild = (children[1] as ConditionGroupValue).children[0] as ConditionItemValue;
    expect(nestedChild.right).toBe('keep');
    expect((children[2] as ConditionItemValue).right).toBe('last');
  });

  it('returns the group unchanged when the id is absent', () => {
    const before = group([item('one', 'a')]);
    const after = rewriteItemRight(before, 'missing', 'NEW');
    expect(((after.children[0] as ConditionItemValue).right)).toBe('a');
  });
});
