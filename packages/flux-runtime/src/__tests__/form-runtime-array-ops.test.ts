import { describe, expect, it } from 'vitest';
import type { ScopeRef } from '@nop-chaos/flux-core';
import { createManagedFormRuntime } from '../form-runtime';

function createStubScope(): ScopeRef {
  return {
    id: 'root',
    path: '',
    parent: undefined as any,
    store: {
      getSnapshot: () => ({}),
      getLastChange: () => ({ paths: ['*'], sourceScopeId: 'root', kind: 'replace' as const }),
      setSnapshot: () => {},
      subscribe: () => () => {}
    },
    value: {},
    update: () => {},
    get: () => undefined,
    has: () => false,
    readOwn: () => ({}),
    readVisible: () => ({}),
    materializeVisible: () => ({}),
    merge: () => {}
  };
}

function createForm(initialValues: Record<string, any> = {}) {
  return createManagedFormRuntime({
    id: 'test-form',
    initialValues,
    parentScope: createStubScope(),
    executeValidationRule: async () => undefined,
    validateRule: () => undefined
  });
}

function getValues(form: ReturnType<typeof createForm>, path: string) {
  return (form.store.getState().values as any)[path];
}

describe('form-runtime array-ops: prepend', () => {
  it('prepends to existing array', () => {
    const form = createForm({ items: ['b', 'c'] });
    form.prependValue('items', 'a');
    expect(getValues(form, 'items')).toEqual(['a', 'b', 'c']);
  });

  it('prepends to empty array', () => {
    const form = createForm({ items: [] as string[] });
    form.prependValue('items', 'x');
    expect(getValues(form, 'items')).toEqual(['x']);
  });

  it('prepends to undefined path (no initial array)', () => {
    const form = createForm({});
    form.prependValue('items', 'first');
    expect(getValues(form, 'items')).toEqual(['first']);
  });

  it('prepends object value', () => {
    const form = createForm({ items: [{ id: 2 }] });
    form.prependValue('items', { id: 1 });
    expect(getValues(form, 'items')).toEqual([{ id: 1 }, { id: 2 }]);
  });
});

describe('form-runtime array-ops: insert', () => {
  it('inserts at beginning (index 0)', () => {
    const form = createForm({ items: ['b', 'c'] });
    form.insertValue('items', 0, 'a');
    expect(getValues(form, 'items')).toEqual(['a', 'b', 'c']);
  });

  it('inserts at middle', () => {
    const form = createForm({ items: ['a', 'c'] });
    form.insertValue('items', 1, 'b');
    expect(getValues(form, 'items')).toEqual(['a', 'b', 'c']);
  });

  it('inserts at end (index == length)', () => {
    const form = createForm({ items: ['a', 'b'] });
    form.insertValue('items', 2, 'c');
    expect(getValues(form, 'items')).toEqual(['a', 'b', 'c']);
  });

  it('inserts past end (clamped to length)', () => {
    const form = createForm({ items: ['a'] });
    form.insertValue('items', 99, 'z');
    expect(getValues(form, 'items')).toEqual(['a', 'z']);
  });

  it('inserts into empty array', () => {
    const form = createForm({ items: [] as string[] });
    form.insertValue('items', 0, 'x');
    expect(getValues(form, 'items')).toEqual(['x']);
  });

  it('inserts at negative index (clamped to 0)', () => {
    const form = createForm({ items: ['b'] });
    form.insertValue('items', -5, 'a');
    expect(getValues(form, 'items')).toEqual(['a', 'b']);
  });
});

describe('form-runtime array-ops: remove', () => {
  it('removes first element', () => {
    const form = createForm({ items: ['a', 'b', 'c'] });
    form.removeValue('items', 0);
    expect(getValues(form, 'items')).toEqual(['b', 'c']);
  });

  it('removes last element', () => {
    const form = createForm({ items: ['a', 'b', 'c'] });
    form.removeValue('items', 2);
    expect(getValues(form, 'items')).toEqual(['a', 'b']);
  });

  it('removes middle element', () => {
    const form = createForm({ items: ['a', 'b', 'c'] });
    form.removeValue('items', 1);
    expect(getValues(form, 'items')).toEqual(['a', 'c']);
  });

  it('removes from single-element array', () => {
    const form = createForm({ items: ['only'] });
    form.removeValue('items', 0);
    expect(getValues(form, 'items')).toEqual([]);
  });

  it('removes out-of-bounds index (clamped to last)', () => {
    const form = createForm({ items: ['a', 'b'] });
    form.removeValue('items', 99);
    expect(getValues(form, 'items')).toEqual(['a']);
  });

  it('removes negative index (clamped to 0)', () => {
    const form = createForm({ items: ['a', 'b'] });
    form.removeValue('items', -1);
    expect(getValues(form, 'items')).toEqual(['b']);
  });

  it('no-op on empty array', () => {
    const form = createForm({ items: [] as string[] });
    form.removeValue('items', 0);
    expect(getValues(form, 'items')).toEqual([]);
  });

  it('no-op when path is not an array', () => {
    const form = createForm({ items: 'not-array' });
    form.removeValue('items', 0);
    expect(getValues(form, 'items')).toBe('not-array');
  });

  it('removes and remaps field states for remaining elements', () => {
    const form = createForm({
      items: [{ name: 'A' }, { name: 'B' }, { name: 'C' }]
    });
    form.store.setTouched('items.1.name', true);
    form.store.setDirty('items.1.name', true);

    form.removeValue('items', 0);

    const state = form.store.getState();
    expect(state.values.items).toEqual([{ name: 'B' }, { name: 'C' }]);
    expect(state.fieldStates['items.0.name']?.touched).toBe(true);
    expect(state.fieldStates['items.0.name']?.dirty).toBe(true);
    expect(state.fieldStates['items.1.name']).toBeUndefined();
  });
});

describe('form-runtime array-ops: move', () => {
  it('moves element forward', () => {
    const form = createForm({ items: ['a', 'b', 'c', 'd'] });
    form.moveValue('items', 0, 2);
    expect(getValues(form, 'items')).toEqual(['b', 'c', 'a', 'd']);
  });

  it('moves element backward', () => {
    const form = createForm({ items: ['a', 'b', 'c', 'd'] });
    form.moveValue('items', 2, 0);
    expect(getValues(form, 'items')).toEqual(['c', 'a', 'b', 'd']);
  });

  it('moves to last position', () => {
    const form = createForm({ items: ['a', 'b', 'c'] });
    form.moveValue('items', 0, 2);
    expect(getValues(form, 'items')).toEqual(['b', 'c', 'a']);
  });

  it('no-op when from === to (same index)', () => {
    const form = createForm({ items: ['a', 'b', 'c'] });
    form.moveValue('items', 1, 1);
    expect(getValues(form, 'items')).toEqual(['a', 'b', 'c']);
  });

  it('no-op on single-element array', () => {
    const form = createForm({ items: ['only'] });
    form.moveValue('items', 0, 0);
    expect(getValues(form, 'items')).toEqual(['only']);
  });

  it('no-op on empty array', () => {
    const form = createForm({ items: [] as string[] });
    form.moveValue('items', 0, 1);
    expect(getValues(form, 'items')).toEqual([]);
  });

  it('no-op when path is not an array', () => {
    const form = createForm({ items: 'string' });
    form.moveValue('items', 0, 1);
    expect(getValues(form, 'items')).toBe('string');
  });

  it('clamps out-of-bounds from index', () => {
    const form = createForm({ items: ['a', 'b', 'c'] });
    form.moveValue('items', 99, 0);
    expect(getValues(form, 'items')).toEqual(['c', 'a', 'b']);
  });

  it('moves and remaps field states', () => {
    const form = createForm({
      items: [{ v: 1 }, { v: 2 }, { v: 3 }]
    });
    form.store.setTouched('items.0.v', true);
    form.store.setTouched('items.2.v', true);

    form.moveValue('items', 0, 2);

    const state = form.store.getState();
    expect(state.values.items).toEqual([{ v: 2 }, { v: 3 }, { v: 1 }]);
    expect(state.fieldStates['items.2.v']?.touched).toBe(true);
  });
});

describe('form-runtime array-ops: swap', () => {
  it('swaps first and last', () => {
    const form = createForm({ items: ['a', 'b', 'c'] });
    form.swapValue('items', 0, 2);
    expect(getValues(form, 'items')).toEqual(['c', 'b', 'a']);
  });

  it('swaps adjacent elements', () => {
    const form = createForm({ items: ['a', 'b', 'c'] });
    form.swapValue('items', 0, 1);
    expect(getValues(form, 'items')).toEqual(['b', 'a', 'c']);
  });

  it('no-op when a === b (same index)', () => {
    const form = createForm({ items: ['a', 'b', 'c'] });
    form.swapValue('items', 1, 1);
    expect(getValues(form, 'items')).toEqual(['a', 'b', 'c']);
  });

  it('no-op on single-element array', () => {
    const form = createForm({ items: ['only'] });
    form.swapValue('items', 0, 0);
    expect(getValues(form, 'items')).toEqual(['only']);
  });

  it('no-op on empty array', () => {
    const form = createForm({ items: [] as string[] });
    form.swapValue('items', 0, 1);
    expect(getValues(form, 'items')).toEqual([]);
  });

  it('no-op when path is not an array', () => {
    const form = createForm({ items: 42 });
    form.swapValue('items', 0, 1);
    expect(getValues(form, 'items')).toBe(42);
  });

  it('clamps out-of-bounds indices', () => {
    const form = createForm({ items: ['a', 'b'] });
    form.swapValue('items', 0, 99);
    expect(getValues(form, 'items')).toEqual(['b', 'a']);
  });

  it('swaps and remaps field states', () => {
    const form = createForm({
      items: [{ v: 1 }, { v: 2 }]
    });
    form.store.setTouched('items.0.v', true);
    form.store.setPathErrors('items.0.v', [{ path: 'items.0.v', message: 'err', rule: 'required' }]);

    form.swapValue('items', 0, 1);

    const state = form.store.getState();
    expect(state.values.items).toEqual([{ v: 2 }, { v: 1 }]);
    expect(state.fieldStates['items.1.v']?.touched).toBe(true);
    expect(state.fieldStates['items.1.v']?.errors?.[0]?.message).toBe('err');
  });
});

describe('form-runtime array-ops: replace', () => {
  it('replaces with new array', () => {
    const form = createForm({ items: ['a', 'b', 'c'] });
    form.replaceValue('items', ['x', 'y']);
    expect(getValues(form, 'items')).toEqual(['x', 'y']);
  });

  it('replaces with empty array', () => {
    const form = createForm({ items: ['a', 'b'] });
    form.replaceValue('items', []);
    expect(getValues(form, 'items')).toEqual([]);
  });

  it('replaces with larger array', () => {
    const form = createForm({ items: ['a'] });
    form.replaceValue('items', ['a', 'b', 'c', 'd']);
    expect(getValues(form, 'items')).toEqual(['a', 'b', 'c', 'd']);
  });

  it('replaces non-array value with array', () => {
    const form = createForm({ items: 'not-array' });
    form.replaceValue('items', ['a', 'b']);
    expect(getValues(form, 'items')).toEqual(['a', 'b']);
  });

  it('non-array value becomes empty array', () => {
    const form = createForm({ items: ['a', 'b'] });
    form.replaceValue('items', 'not-array');
    expect(getValues(form, 'items')).toEqual([]);
  });

  it('removes field states for truncated indices', () => {
    const form = createForm({
      items: [{ v: 1 }, { v: 2 }, { v: 3 }]
    });
    form.store.setTouched('items.2.v', true);
    form.store.setPathErrors('items.2.v', [{ path: 'items.2.v', message: 'err', rule: 'required' }]);

    form.replaceValue('items', [{ v: 10 }]);

    const state = form.store.getState();
    expect(state.values.items).toEqual([{ v: 10 }]);
    expect(state.fieldStates['items.2.v']).toBeUndefined();
  });

  it('marks dirty when value differs from initial', () => {
    const form = createForm({ items: ['a', 'b'] });
    form.replaceValue('items', ['x']);
    const state = form.store.getState();
    expect(state.fieldStates['items']?.dirty).toBe(true);
  });
});
