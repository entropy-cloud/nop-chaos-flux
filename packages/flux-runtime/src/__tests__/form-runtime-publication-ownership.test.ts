import { describe, expect, it } from 'vitest';
import type { ScopeRef } from '@nop-chaos/flux-core';
import { createManagedFormRuntime } from '../form-runtime.js';
import { createScopeRef } from '../scope.js';

function createParentScope(): ScopeRef {
  return createScopeRef({ id: 'parent', path: '$parent', initialData: {} });
}

function createPublishingForm(parentScope: ScopeRef, id: string, initialValues: Record<string, unknown>) {
  return createManagedFormRuntime({
    id,
    initialValues,
    parentScope,
    statusPath: 'ui.status',
    valuesPath: 'ui.values',
    executeValidationRule: async () => undefined,
    validateRule: () => undefined,
  });
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

// Plan 860 (B1): withdrawal on dispose must be ownership-aware — a runtime only
// clears a published path while that path still holds the value it published.
describe('createManagedFormRuntime external publication ownership on dispose', () => {
  it('ours: a runtime that still owns both paths withdraws them on dispose', async () => {
    const parentScope = createParentScope();
    const form = createPublishingForm(parentScope, 'form-a', { name: 'A' });
    await flushMicrotasks();
    expect(parentScope.get('ui.values')).toEqual({ name: 'A' });

    form.dispose();

    expect(parentScope.get('ui.values')).toBeUndefined();
    expect(parentScope.get('ui.status')).toBeUndefined();
  });

  it("successor's: a late dispose of the predecessor keeps the successor's publication", async () => {
    const parentScope = createParentScope();
    const predecessor = createPublishingForm(parentScope, 'form-a', { name: 'A' });
    await flushMicrotasks();

    const successor = createPublishingForm(parentScope, 'form-b', { name: 'B' });
    await flushMicrotasks();
    const successorValues = parentScope.get('ui.values');
    const successorStatus = parentScope.get('ui.status');
    expect(successorValues).toEqual({ name: 'B' });
    expect(successorStatus).toMatchObject({ id: 'form-b' });

    predecessor.dispose();

    expect(parentScope.get('ui.values')).toBe(successorValues);
    expect(parentScope.get('ui.status')).toBe(successorStatus);

    successor.dispose();
    expect(parentScope.get('ui.values')).toBeUndefined();
    expect(parentScope.get('ui.status')).toBeUndefined();
  });

  it("successor's (identity, not content): an equal-content successor publication is still not withdrawn", async () => {
    const parentScope = createParentScope();
    const predecessor = createPublishingForm(parentScope, 'form-a', { name: 'same' });
    await flushMicrotasks();
    const predecessorValues = parentScope.get('ui.values');

    createPublishingForm(parentScope, 'form-a', { name: 'same' });
    await flushMicrotasks();
    const successorValues = parentScope.get('ui.values');
    expect(successorValues).toEqual(predecessorValues);
    expect(successorValues).not.toBe(predecessorValues);

    predecessor.dispose();

    expect(parentScope.get('ui.values')).toBe(successorValues);
  });

  it("successor's (shared initial object): a successor publishing the very same values reference is still not withdrawn", async () => {
    // FormRenderer hands every recreated runtime the same initialValuesRef
    // object, and the store keeps it by reference — so predecessor and
    // successor publish an identical reference. Ownership cannot be decided by
    // value identity alone.
    const parentScope = createParentScope();
    const shared = { name: 'shared' };
    const predecessor = createPublishingForm(parentScope, 'form-a', shared);
    await flushMicrotasks();
    expect(parentScope.get('ui.values')).toBe(shared);

    createPublishingForm(parentScope, 'form-a', shared);
    await flushMicrotasks();

    predecessor.dispose();

    expect(parentScope.get('ui.values')).toBe(shared);
  });

  it("third-party's: a path overwritten by another writer is left alone on dispose", async () => {
    const parentScope = createParentScope();
    const form = createPublishingForm(parentScope, 'form-a', { name: 'A' });
    await flushMicrotasks();

    const external = { name: 'written-by-page' };
    parentScope.update('ui.values', external);

    form.dispose();

    expect(parentScope.get('ui.values')).toBe(external);
    expect(parentScope.get('ui.status')).toBeUndefined();
  });

  it('a runtime disposed before its deferred first publication leaves the path untouched', async () => {
    const parentScope = createParentScope();
    const external = { name: 'pre-existing' };
    parentScope.update('ui.values', external);

    const form = createPublishingForm(parentScope, 'form-a', { name: 'A' });
    form.dispose();
    await flushMicrotasks();

    expect(parentScope.get('ui.values')).toBe(external);
  });
});
