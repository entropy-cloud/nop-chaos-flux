import { describe, expect, it } from 'vitest';
import type { ScopeChange, ScopeRef } from '@nop-chaos/flux-core';
import { createManagedFormRuntime } from '../form-runtime.js';

function createStubScope(): ScopeRef {
  return {
    id: 'bug30-root',
    path: '',
    parent: undefined as unknown as ScopeRef,
    store: {
      getSnapshot: () => ({}),
      getLastChange: () => ({ paths: ['*'], sourceScopeId: 'bug30-root', kind: 'replace' as const }),
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

function createFreshnessForm(id: string) {
  return createManagedFormRuntime({
    id,
    initialValues: { name: '' },
    parentScope: createStubScope(),
    executeValidationRule: async () => undefined,
    validateRule: () => undefined,
  });
}

function lastChangeOf(scope: ScopeRef): ScopeChange {
  const change = scope.store?.getLastChange();
  if (!change) {
    throw new Error('scope store or lastChange missing');
  }
  return change;
}

// P1-MA4.1-006 / bug 30 regression guard: lastChange is the snapshot key of
// NodeRenderer's useSyncExternalStoreWithSelector
// (node-renderer-resolved.tsx getSnapshot -> scope.store.getLastChange()).
// The discriminating assertion lost to test reorg is REFERENCE IDENTITY
// change across consecutive writes — "setLastChange was called" or
// "paths content" assertions stay green when freshness regresses.
describe('bug 30 regression guard: lastChange freshness across repeated writes', () => {
  it('setValue twice for the same path yields different lastChange references with incrementing revision', () => {
    const form = createFreshnessForm('bug30-setvalue-freshness');

    const first = lastChangeOf(form.scope);
    form.setValue('name', 'a');
    const second = lastChangeOf(form.scope);

    expect(second).not.toBe(first);
    expect(second.paths).toEqual(['name']);
    expect(second.kind).toBe('update');
    expect(second.sourceScopeId).toBe('bug30-setvalue-freshness');
    expect(second.revision ?? 0).toBeGreaterThan(first.revision ?? 0);

    form.setValue('name', 'b');
    const third = lastChangeOf(form.scope);

    expect(third).not.toBe(second);
    expect(third.revision ?? 0).toBeGreaterThan(second.revision ?? 0);
  });

  it('setValues twice also yields different lastChange references (bug 30 names both paths)', async () => {
    const form = createFreshnessForm('bug30-setvalues-freshness');

    const first = lastChangeOf(form.scope);
    await form.setValues({ name: 'a' });
    const second = lastChangeOf(form.scope);

    expect(second).not.toBe(first);
    expect(second.paths).toEqual(['name']);

    await form.setValues({ name: 'b' });
    const third = lastChangeOf(form.scope);

    expect(third).not.toBe(second);
  });
});
