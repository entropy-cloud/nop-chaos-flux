import { describe, expect, it } from 'vitest';
import type { ScopeRef } from '@nop-chaos/flux-core';
import { createManagedFormRuntime } from '../form-runtime.js';

function createStubScope(): ScopeRef {
  return {
    id: 'root',
    path: '',
    parent: undefined as any,
    store: {
      getSnapshot: () => ({}),
      getLastChange: () => ({ paths: ['*'], sourceScopeId: 'root', kind: 'replace' as const }),
      setSnapshot: () => {},
      subscribe: () => () => {},
    },
    value: {},
    update: () => {},
    get: () => undefined,
    has: () => false,
    readOwn: () => ({}),
    readVisible: () => ({}),
    materializeVisible: () => ({}),
    merge: () => {},
  };
}

// plan 549 (IS-component-handles-002): an argumentless reset (the form-level
// component:reset path) must restore the creation-time data defaults — it used
// to wipe every field to {} (a false affordance the IS-6 review convicted).
describe('FormRuntime reset semantics', () => {
  it('reset() without values restores the creation-time initialValues', () => {
    const form = createManagedFormRuntime({
      id: 'reset-defaults-form',
      initialValues: { name: 'Alice', count: 7 },
      parentScope: createStubScope(),
      executeValidationRule: async () => undefined,
      validateRule: () => undefined,
    });

    form.setValue('name', 'Bob');
    expect(form.store.getState().values.name).toBe('Bob');

    form.reset();

    expect(form.store.getState().values.name).toBe('Alice');
    expect(form.store.getState().values.count).toBe(7);
  });

  it('reset(values) with explicit values re-baselines to those values', () => {
    const form = createManagedFormRuntime({
      id: 'reset-explicit-form',
      initialValues: { name: 'Alice' },
      parentScope: createStubScope(),
      executeValidationRule: async () => undefined,
      validateRule: () => undefined,
    });

    form.setValue('name', 'Bob');
    form.reset({ name: 'Carol' });

    expect(form.store.getState().values.name).toBe('Carol');
  });
});
