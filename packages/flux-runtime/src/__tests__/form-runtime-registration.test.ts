import { describe, expect, it, vi } from 'vitest';
import { createFormStore } from '../form-store.js';
import { createScopeRef } from '../scope.js';
import { findRuntimeRegistration, syncRegisteredFieldValue } from '../form-runtime-registration.js';
import type { FormRuntimeRegistrationState, RegisteredFieldEntry } from '../form-runtime-types.js';

function createRegistrationEntry(
  path: string,
  overrides: Partial<RegisteredFieldEntry['registration']> = {},
): RegisteredFieldEntry {
  return {
    registrationId: `reg:${path}`,
    registration: {
      path,
      getValue: () => undefined,
      ...overrides,
    } as RegisteredFieldEntry['registration'],
    modelGeneration: 1,
  };
}

function createRegistrationState(values: Record<string, unknown> = {}): FormRuntimeRegistrationState {
  const store = createFormStore(values);
  const scope = createScopeRef({
    id: 'form-runtime-registration-test',
    path: '$form',
    initialData: values,
  });

  return {
    store,
    scope,
    initialFieldState: {
      initialValues: { ...values },
      dirty: {},
    },
    runtimeFieldRegistrations: new Map(),
    pathToRegistrationId: new Map(),
    childPathToRegistrationId: new Map(),
  };
}

describe('findRuntimeRegistration', () => {
  it('falls back to child path registration when direct mapping is absent', () => {
    const state = createRegistrationState();
    const entry = createRegistrationEntry('parent', { childPaths: ['parent.child'] });

    state.runtimeFieldRegistrations.set(entry.registrationId, entry);
    state.childPathToRegistrationId.set('parent.child', entry.registrationId);

    expect(findRuntimeRegistration(state, 'parent.child')).toEqual({
      entry,
      childPath: 'parent.child',
    });
  });
});

describe('syncRegisteredFieldValue', () => {
  it('writes the synced value and clears dirty when it matches the initial baseline', () => {
    const state = createRegistrationState({ name: 'Alice' });
    state.store.setFieldState('name', { dirty: true, touched: true });

    const syncValue = vi.fn(() => 'Alice');
    const getValue = vi.fn(() => 'stale');
    const entry = createRegistrationEntry('name', { syncValue, getValue });

    state.runtimeFieldRegistrations.set(entry.registrationId, entry);
    state.pathToRegistrationId.set('name', entry.registrationId);
    state.scope.update('name', 'Bob');

    const nextValue = syncRegisteredFieldValue(state, 'name');

    expect(nextValue).toBe('Alice');
    expect(syncValue).toHaveBeenCalledTimes(1);
    expect(getValue).not.toHaveBeenCalled();
    expect(state.store.getState().values.name).toBe('Alice');
    expect(state.store.getState().fieldStates.name).toEqual({ touched: true });
  });
});
