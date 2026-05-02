import { describe, expect, it, vi } from 'vitest';
import { createAsyncGovernanceStore } from '../async-data/async-governance';
import { createFormStore } from '../form-store';
import { createScopeRef } from '../scope';
import { disposeOwnerState, refreshCompiledModelState } from '../form-runtime-owner-lifecycle';
import type { ManagedFormRuntimeSharedState } from '../form-runtime-types';

function createSharedState(
  overrides: Partial<ManagedFormRuntimeSharedState> = {},
): ManagedFormRuntimeSharedState {
  return {
    inputValue: {
      executeValidationRule: async () => undefined,
      validateRule: () => undefined,
      validation: undefined,
    } as any,
    store: createFormStore({ name: 'Alice' }),
    scope: createScopeRef({ id: 'form-scope', path: '$form', initialData: { name: 'Alice' } }),
    initialFieldState: { initialValues: { name: 'Alice' }, dirty: {} },
    validationRuns: new Map(),
    pendingValidationDebounces: new Map(),
    validationAbortControllers: new Map(),
    validationAsyncGovernance: createAsyncGovernanceStore(),
    runtimeFieldRegistrations: new Map(),
    pathToRegistrationId: new Map(),
    childPathToRegistrationId: new Map(),
    hiddenFields: new Set(),
    lifecycleState: 'active',
    modelGeneration: 1,
    externalErrors: new Map(),
    childContracts: new Map(),
    ...overrides,
  };
}

describe('refreshCompiledModelState', () => {
  it('returns early when the owner is already disposed', () => {
    const sharedState = createSharedState({ lifecycleState: 'disposed' as const });
    const setCurrentValidation = vi.fn();

    refreshCompiledModelState({
      sharedState,
      getCurrentValidation: () => ({ nodes: {} }) as any,
      setCurrentValidation,
      newModel: { nodes: {} } as any,
      formId: 'form-1',
      setLastChange: vi.fn(),
    });

    expect(setCurrentValidation).not.toHaveBeenCalled();
    expect(sharedState.modelGeneration).toBe(1);
  });

  it('retains matching errors, clears stale async state, and removes stale registrations', () => {
    const sharedState = createSharedState();
    const resolved = vi.fn();
    const abortController = new AbortController();

    sharedState.validationAsyncGovernance.beginRun({
      ownerKind: 'validation',
      ownerId: 'validation:form-scope:name',
      scopeId: 'form-scope',
      cause: 'change',
    });
    sharedState.validationAsyncGovernance.beginRun({
      ownerKind: 'validation',
      ownerId: 'validation:form-scope:email',
      scopeId: 'form-scope',
      cause: 'change',
    });

    sharedState.validationRuns.set('name', 1);
    sharedState.pendingValidationDebounces.set('name', {
      timer: setTimeout(() => undefined, 10_000),
      resolve: resolved,
      reject: vi.fn(),
    });
    sharedState.validationAbortControllers.set('email', abortController);
    sharedState.runtimeFieldRegistrations.set('reg-1', {
      registrationId: 'reg-1',
      registration: { path: 'name' } as any,
      modelGeneration: 1,
    });
    sharedState.pathToRegistrationId.set('name', 'reg-1');
    sharedState.store.batchUpdate({
      fieldStates: {
        name: {
          errors: [{ path: 'name', message: 'keep', rule: 'required' } as any],
          touched: true,
        },
        email: {
          errors: [{ path: 'email', message: 'drop', rule: 'required' } as any],
          visited: true,
        },
      },
    });

    const oldModel = {
      nodes: {
        name: { rules: [{ id: 'r1', rule: { kind: 'required' } }] },
        email: { rules: [{ id: 'r2', rule: { kind: 'required' } }] },
      },
    } as any;
    const newModel = {
      nodes: {
        name: { rules: [{ id: 'r1', rule: { kind: 'required' } }] },
        email: { rules: [{ id: 'r3', rule: { kind: 'required' } }] },
      },
    } as any;
    const setLastChange = vi.fn();
    const setCurrentValidation = vi.fn();

    refreshCompiledModelState({
      sharedState,
      getCurrentValidation: () => oldModel,
      setCurrentValidation,
      newModel,
      formId: 'form-1',
      setLastChange,
    });

    expect(setCurrentValidation).toHaveBeenCalledWith(newModel);
    expect(sharedState.inputValue.validation).toBe(newModel);
    expect(sharedState.modelGeneration).toBe(2);
    expect(sharedState.validationRuns.size).toBe(0);
    expect(sharedState.pendingValidationDebounces.size).toBe(0);
    expect(sharedState.validationAbortControllers.size).toBe(0);
    expect(resolved).toHaveBeenCalledWith(false);
    expect(abortController.signal.aborted).toBe(false);
    expect(
      sharedState.validationAsyncGovernance.getOwnerState('validation:form-scope:name'),
    ).toBeUndefined();
    expect(
      sharedState.validationAsyncGovernance.getOwnerState('validation:form-scope:email'),
    ).toBeUndefined();
    expect(sharedState.runtimeFieldRegistrations.size).toBe(0);
    expect(sharedState.pathToRegistrationId.size).toBe(0);
    expect(sharedState.store.getState().fieldStates).toEqual({
      name: { errors: [{ path: 'name', message: 'keep', rule: 'required' }], touched: true },
      email: { visited: true },
    });
    expect(setLastChange).toHaveBeenCalledWith({
      paths: [],
      sourceScopeId: 'form-1',
      kind: 'update',
    });
    expect(sharedState.lifecycleState).toBe('active');
  });

  it('clears all errors when no old model existed', () => {
    const sharedState = createSharedState();
    sharedState.store.batchUpdate({
      fieldStates: {
        name: {
          errors: [{ path: 'name', message: 'drop', rule: 'required' } as any],
          touched: true,
        },
        email: { visited: true },
      },
    });

    refreshCompiledModelState({
      sharedState,
      getCurrentValidation: () => undefined,
      setCurrentValidation: vi.fn(),
      newModel: { nodes: {} } as any,
      formId: 'form-1',
      setLastChange: vi.fn(),
    });

    expect(sharedState.store.getState().fieldStates).toEqual({
      name: { touched: true },
      email: { visited: true },
    });
  });
});

describe('disposeOwnerState', () => {
  it('clears async state, registrations, and field state once', () => {
    const sharedState = createSharedState();
    const resolved = vi.fn();
    const abortController = new AbortController();
    const setLastChange = vi.fn();

    sharedState.pendingValidationDebounces.set('name', {
      timer: setTimeout(() => undefined, 10_000),
      resolve: resolved,
      reject: vi.fn(),
    });
    sharedState.validationRuns.set('name', 1);
    sharedState.validationAbortControllers.set('name', abortController);
    sharedState.runtimeFieldRegistrations.set('reg-1', {
      registrationId: 'reg-1',
      registration: { path: 'name' } as any,
      modelGeneration: 1,
    });
    sharedState.pathToRegistrationId.set('name', 'reg-1');
    sharedState.childContracts.set('child', {} as any);
    sharedState.externalErrors.set('external', { sourceId: 'external', errors: [] });
    sharedState.store.batchUpdate({ fieldStates: { name: { touched: true } } });

    disposeOwnerState({ sharedState, formId: 'form-1', setLastChange });

    expect(sharedState.lifecycleState).toBe('disposed');
    expect(sharedState.pendingValidationDebounces.size).toBe(0);
    expect(sharedState.validationRuns.size).toBe(0);
    expect(sharedState.validationAbortControllers.size).toBe(0);
    expect(sharedState.runtimeFieldRegistrations.size).toBe(0);
    expect(sharedState.pathToRegistrationId.size).toBe(0);
    expect(sharedState.childContracts.size).toBe(0);
    expect(sharedState.externalErrors.size).toBe(0);
    expect(sharedState.store.getState().fieldStates).toEqual({});
    expect(resolved).toHaveBeenCalledWith(false);
    expect(abortController.signal.aborted).toBe(true);
    expect(setLastChange).toHaveBeenCalledTimes(1);

    disposeOwnerState({ sharedState, formId: 'form-1', setLastChange });
    expect(setLastChange).toHaveBeenCalledTimes(1);
  });
});
