import { describe, expect, it, vi } from 'vitest';
import { executeSetValues } from '../form-runtime-values.js';
import { createFormStore } from '../form-store.js';
import { createScopeRef } from '../scope.js';
import { createAsyncGovernanceStore } from '../async-data/async-governance.js';
import type {
  ManagedFormRuntimeSharedState,
  CreateManagedFormRuntimeInput,
} from '../form-runtime-types.js';
import type { ScopeRef } from '@nop-chaos/flux-core';

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

function createSharedState(initialValues: Record<string, any> = {}) {
  const store = createFormStore(initialValues);
  const scope = createScopeRef({
    id: 'test-form',
    path: '$root.form',
    parent: createStubScope(),
    store: {
      getSnapshot: () => store.getState().values,
      getLastChange: () => ({
        paths: ['*'],
        sourceScopeId: 'test-form',
        kind: 'replace' as const,
        revision: 0,
      }),
      setSnapshot: (next) => store.setValues(next),
      subscribe: (listener) =>
        store.subscribe(() =>
          listener({ paths: ['*'], sourceScopeId: 'test-form', kind: 'replace' }),
        ),
    },
    update: (path, value) => store.setValue(path, value),
  });

  const sharedState: ManagedFormRuntimeSharedState = {
    inputValue: {
      executeValidationRule: async () => undefined,
      validateRule: () => undefined,
    } as CreateManagedFormRuntimeInput,
    store,
    scope,
    initialFieldState: { initialValues: { ...initialValues }, dirty: {} },
    validationRuns: new Map(),
    pendingValidationDebounces: new Map(),
    validationAbortControllers: new Map(),
    validationAsyncGovernance: createAsyncGovernanceStore(),
    runtimeFieldRegistrations: new Map(),
    pathToRegistrationId: new Map(),
    childPathToRegistrationId: new Map(),
    hiddenFields: new Set(),
    lifecycleState: 'active',
    lifecycleWaiters: new Set(),
    modelGeneration: 1,
    externalErrors: new Map(),
    childContracts: new Map(),
  };

  return sharedState;
}

describe('executeSetValues', () => {
  it('does nothing when lifecycleState is disposed', () => {
    const sharedState = createSharedState({ x: 1 });
    sharedState.lifecycleState = 'disposed';
    let lastChange: any = null;
    executeSetValues(
      {
        sharedState,
        formId: 'f1',
        setLastChange: (c) => {
          lastChange = c;
        },
        clearExternalErrorsForPath: () => false,
        rebuildStoreErrorsFromExternal: () => ({}),
        revalidateDependents: vi.fn(),
      },
      { x: 2 },
    );
    expect(sharedState.store.getState().values.x).toBe(1);
    expect(lastChange).toBeNull();
  });

  it('does nothing when values is empty', () => {
    const sharedState = createSharedState({ x: 1 });
    let lastChange: any = null;
    executeSetValues(
      {
        sharedState,
        formId: 'f1',
        setLastChange: (c) => {
          lastChange = c;
        },
        clearExternalErrorsForPath: () => false,
        rebuildStoreErrorsFromExternal: () => ({}),
        revalidateDependents: vi.fn(),
      },
      {},
    );
    expect(sharedState.store.getState().values.x).toBe(1);
    expect(lastChange).toBeNull();
  });

  it('sets multiple values at once', () => {
    const sharedState = createSharedState({ a: 0, b: 0 });
    let lastChange: any = null;
    executeSetValues(
      {
        sharedState,
        formId: 'f1',
        setLastChange: (c) => {
          lastChange = c;
        },
        clearExternalErrorsForPath: () => false,
        rebuildStoreErrorsFromExternal: () => ({}),
        revalidateDependents: vi.fn(),
      },
      { a: 10, b: 20 },
    );
    expect(sharedState.store.getState().values.a).toBe(10);
    expect(sharedState.store.getState().values.b).toBe(20);
    expect(lastChange.paths).toEqual(['a', 'b']);
    expect(lastChange.kind).toBe('update');
  });

  it('increments validationRuns for each changed path', () => {
    const sharedState = createSharedState({ x: 1, y: 2 });
    executeSetValues(
      {
        sharedState,
        formId: 'f1',
        setLastChange: () => {},
        clearExternalErrorsForPath: () => false,
        rebuildStoreErrorsFromExternal: () => ({}),
        revalidateDependents: vi.fn(),
      },
      { x: 10, y: 20 },
    );
    expect(sharedState.validationRuns.get('x')).toBe(1);
    expect(sharedState.validationRuns.get('y')).toBe(1);
  });

  it('calls revalidateDependents for each changed path', () => {
    const sharedState = createSharedState({ a: 1, b: 2 });
    const revalidate = vi.fn();
    executeSetValues(
      {
        sharedState,
        formId: 'f1',
        setLastChange: () => {},
        clearExternalErrorsForPath: () => false,
        rebuildStoreErrorsFromExternal: () => ({}),
        revalidateDependents: revalidate,
      },
      { a: 10 },
    );
    expect(revalidate).toHaveBeenCalledWith('a', 'change');
  });

  it('reports dependent revalidation failures without throwing', async () => {
    const sharedState = createSharedState({ a: 1 });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    executeSetValues(
      {
        sharedState,
        formId: 'f1',
        setLastChange: () => {},
        clearExternalErrorsForPath: () => false,
        rebuildStoreErrorsFromExternal: () => ({}),
        revalidateDependents: vi.fn().mockRejectedValue(new Error('boom')),
      },
      { a: 10 },
    );

    await Promise.resolve();

    expect(warn).toHaveBeenCalledWith(
      '[form-runtime] dependent revalidation failed for "a"',
      expect.any(Error),
    );

    warn.mockRestore();
  });

  it('clears external errors and rebuilds store errors', () => {
    const sharedState = createSharedState({ x: 1 });
    sharedState.externalErrors.set('ext1', {
      sourceId: 'ext1',
      errors: [{ path: 'x', message: 'ext err', rule: 'required' }],
    });
    sharedState.store.batchUpdate({
      fieldStates: {
        x: { errors: [{ path: 'x', message: 'ext err', rule: 'required' }] },
      },
    });

    let externalCleared = false;
    executeSetValues(
      {
        sharedState,
        formId: 'f1',
        setLastChange: () => {},
        clearExternalErrorsForPath: (path) => {
          if (path === 'x' && !externalCleared) {
            externalCleared = true;
            return true;
          }
          return false;
        },
        rebuildStoreErrorsFromExternal: () => ({}),
        revalidateDependents: vi.fn(),
      },
      { x: 2 },
    );
    expect(externalCleared).toBe(true);
    const state = sharedState.store.getState();
    expect(state.values.x).toBe(2);
  });

  it('cancels pending validation debounces for changed paths', () => {
    const sharedState = createSharedState({ x: 1 });
    let resolved = false;
    sharedState.pendingValidationDebounces.set('x', {
      timer: setTimeout(() => {}, 10000),
      resolve: () => {
        resolved = true;
      },
      reject: () => {},
    });
    executeSetValues(
      {
        sharedState,
        formId: 'f1',
        setLastChange: () => {},
        clearExternalErrorsForPath: () => false,
        rebuildStoreErrorsFromExternal: () => ({}),
        revalidateDependents: vi.fn(),
      },
      { x: 2 },
    );
    expect(resolved).toBe(true);
    expect(sharedState.pendingValidationDebounces.has('x')).toBe(false);
  });
});
