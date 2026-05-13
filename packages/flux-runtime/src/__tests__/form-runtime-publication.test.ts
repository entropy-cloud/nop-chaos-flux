import { describe, expect, it, vi } from 'vitest';
import type { ScopeRef } from '@nop-chaos/flux-core';
import { createManagedFormRuntime } from '../form-runtime.js';
import { createScopeRef } from '../scope.js';

function createStubScope(initialValues: Record<string, unknown> = {}): ScopeRef {
  const scope = createScopeRef({ id: 'parent', path: '$parent', initialData: initialValues });
  const originalUpdate = scope.update.bind(scope);
  scope.update = vi.fn((path: string, value: unknown) => {
    originalUpdate(path, value);
  });
  return scope;
}

describe('createManagedFormRuntime external publication', () => {
  it('publishes status and values through the runtime lifecycle', () => {
    const parentScope = createStubScope();
    const form = createManagedFormRuntime({
      id: 'profile-form',
      name: 'profile',
      initialValues: { username: 'Alice' },
      parentScope,
      statusPath: 'ui.status',
      valuesPath: 'ui.values',
      executeValidationRule: async () => undefined,
      validateRule: () => undefined,
    });

    expect(parentScope.get('ui.status')).toMatchObject({
      id: 'profile-form',
      name: 'profile',
      valid: true,
      invalid: false,
      errorCount: 0,
    });
    expect(parentScope.get('ui.values')).toEqual({ username: 'Alice' });

    form.setValue('username', 'Bob');

    expect(parentScope.get('ui.values')).toEqual({ username: 'Bob' });
    expect(parentScope.get('ui.status')).toMatchObject({
      dirty: true,
      valid: true,
      invalid: false,
    });

    form.dispose();

    expect(parentScope.get('ui.status')).toBeUndefined();
    expect(parentScope.get('ui.values')).toBeUndefined();
  });

  it('dedupes unchanged summaries and values snapshots', () => {
    const parentScope = createStubScope();
    const updateSpy = parentScope.update;
    const form = createManagedFormRuntime({
      id: 'profile-form',
      initialValues: { username: 'Alice' },
      parentScope,
      statusPath: 'ui.status',
      valuesPath: 'ui.values',
      executeValidationRule: async () => undefined,
      validateRule: () => undefined,
    });

    const initialCallCount = (updateSpy as any).mock.calls.length;

    form.store.setFieldState('username', { touched: true });
    const afterTouchedCallCount = (updateSpy as any).mock.calls.length;

    form.store.setFieldState('username', { touched: true });

    expect((updateSpy as any).mock.calls.length).toBe(afterTouchedCallCount);
    expect(afterTouchedCallCount).toBe(initialCallCount + 1);

    const currentValues = form.store.getState().values;
    form.store.batchUpdate({
      values: currentValues,
      fieldStates: form.store.getState().fieldStates,
      submitting: false,
      submitAttempted: false,
    });

    expect((updateSpy as any).mock.calls.length).toBe(afterTouchedCallCount);

    form.dispose();
  });
});
