import { describe, expect, it, vi } from 'vitest';
import { commitCompositeState } from './commit-state.js';

describe('commitCompositeState', () => {
  it('commits on the first call and mutates the state in place', () => {
    const state: { initialized: boolean; lastValue?: unknown } = { initialized: false };
    const nextValue = ['a'];

    const result = commitCompositeState(state, nextValue, false);

    expect(result).toEqual({ value: ['a'], changed: true, reusedReference: false });
    expect(state.initialized).toBe(true);
    expect(state.lastValue).toBe(nextValue);
  });

  it('reuses lastValue by reference when no child changed', () => {
    const state = { initialized: true, lastValue: ['a'] as unknown };

    const result = commitCompositeState(state, ['a'], false);

    expect(result).toEqual({ value: ['a'], changed: false, reusedReference: true });
    expect(result.value).toBe(state.lastValue);
  });

  it('skips the equality predicate on the no-child-change reuse path', () => {
    const isEqual = vi.fn(() => false);
    const lastValue = { v: 1 };

    const result = commitCompositeState({ initialized: true, lastValue }, { v: 1 }, false, isEqual);

    expect(result.value).toBe(lastValue);
    expect(result.reusedReference).toBe(true);
    expect(isEqual).not.toHaveBeenCalled();
  });

  it('reuses lastValue when children changed but the equality predicate matches', () => {
    const lastValue = ['a'];
    const isEqual = vi.fn(() => true);

    const result = commitCompositeState({ initialized: true, lastValue }, ['b'], true, isEqual);

    expect(isEqual).toHaveBeenCalledWith(lastValue, ['b']);
    expect(result).toEqual({ value: lastValue, changed: false, reusedReference: true });
    expect(result.value).toBe(lastValue);
  });

  it('commits changed:true when the equality predicate misses', () => {
    const state = { initialized: true, lastValue: ['a'] as unknown };
    const nextValue = ['b'];

    const result = commitCompositeState(state, nextValue, true);

    expect(result).toEqual({ value: ['b'], changed: true, reusedReference: false });
    expect(state.lastValue).toBe(nextValue);
  });

  it('bypasses reuse for a falsy lastValue even when initialized', () => {
    const state = { initialized: true, lastValue: null };
    const nextValue = ['a'];

    const result = commitCompositeState(state, nextValue, false);

    expect(result).toEqual({ value: ['a'], changed: true, reusedReference: false });
    expect(state.lastValue).toBe(nextValue);
  });

  it('defaults equality to shallowEqual over array and object composites', () => {
    const arrayState = { initialized: true, lastValue: [1, 'x'] as unknown };
    expect(commitCompositeState(arrayState, [1, 'x'], true).reusedReference).toBe(true);
    expect(commitCompositeState(arrayState, [1, 'y'], true).changed).toBe(true);

    const objectState = { initialized: true, lastValue: { a: 1 } as unknown };
    expect(commitCompositeState(objectState, { a: 1 }, true).reusedReference).toBe(true);
    expect(commitCompositeState(objectState, { a: 2 }, true).changed).toBe(true);
  });
});
