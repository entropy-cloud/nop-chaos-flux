import { describe, expect, it, vi } from 'vitest';
import type { FormStoreState } from '@nop-chaos/flux-core';
import { createFormStore } from '../form-store.js';
import { createOwnedFormStore } from '../form-store-owned.js';

describe('createOwnedFormStore snapshot identity', () => {
  it('returns the same state reference while base inputs are unchanged', () => {
    const baseStore = createFormStore({});
    const owned = createOwnedFormStore(baseStore, 'child');

    const first = owned.getState();
    const second = owned.getState();

    expect(second).toBe(first);
  });

  it('returns a new reference when values change and keeps decoded content correct', () => {
    const baseStore = createFormStore({});
    const owned = createOwnedFormStore(baseStore, 'child');

    const first = owned.getState();
    baseStore.setValue('child::name', 'abc');
    const second = owned.getState();

    expect(second).not.toBe(first);
    expect(second.values).toEqual({ 'child::name': 'abc' });
    expect(second.fieldStates).toEqual(first.fieldStates);
  });

  it('returns a new reference when owned field states change', () => {
    const baseStore = createFormStore({});
    const owned = createOwnedFormStore(baseStore, 'child');

    const first = owned.getState();
    owned.setTouched('name', true);
    const second = owned.getState();

    expect(second).not.toBe(first);
    expect(second.fieldStates.name?.touched).toBe(true);
  });

  it('returns a new reference when submitting or submitAttempted flips', () => {
    const baseStore = createFormStore({});
    const owned = createOwnedFormStore(baseStore, 'child');

    const first = owned.getState();
    baseStore.setSubmitting(true);
    const second = owned.getState();
    expect(second).not.toBe(first);
    expect(second.submitting).toBe(true);

    baseStore.setSubmitting(false);
    baseStore.setSubmitAttempted(true);
    const third = owned.getState();
    expect(third).not.toBe(second);
    expect(third.submitAttempted).toBe(true);
  });

  it('keeps base field states outside the owner namespace invisible', () => {
    const baseStore = createFormStore({});
    baseStore.setTouched('sibling::path', true);
    const owned = createOwnedFormStore(baseStore, 'child');

    const state = owned.getState();
    expect(Object.keys(state.fieldStates)).toEqual([]);
  });

  it('keeps summary consistent with owned field states across recomposition', () => {
    const baseStore = createFormStore({});
    const owned = createOwnedFormStore(baseStore, 'child');

    owned.setDirty('a', true);
    owned.setDirty('b', true);
    const withTwo = owned.getState() as FormStoreState & { summary: { dirtyCount: number } };
    expect(withTwo.summary.dirtyCount).toBe(2);

    owned.setDirty('b', false);
    const withOne = owned.getState() as FormStoreState & { summary: { dirtyCount: number } };
    expect(withOne).not.toBe(withTwo);
    expect(withOne.summary.dirtyCount).toBe(1);
  });

  it('notifies subscribers only when the visible owned state changes', () => {
    const baseStore = createFormStore({});
    const owned = createOwnedFormStore(baseStore, 'child');
    const listener = vi.fn();

    owned.subscribe(listener);
    baseStore.setTouched('unrelated::path', true);
    expect(listener).not.toHaveBeenCalled();

    owned.setValue('name', 'x');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
