import { describe, expect, it, vi } from 'vitest';
import {
  remapValidationRunState,
  remapInitialFieldState,
  remapArrayFieldState,
  replaceManagedArrayValue,
  executeArrayMutation,
} from '../form-runtime-array';
import { createFormStore } from '../form-store';
import { createScopeRef } from '../scope';
import { createAsyncGovernanceStore } from '../async-data/async-governance';
import type { FieldState } from '@nop-chaos/flux-core';
import type {
  FormRuntimeValidationRunState,
  FormRuntimeInitialStateSlice,
  ManagedFormRuntimeSharedState,
  PendingValidationDebounce,
} from '../form-runtime-types';

describe('remapValidationRunState', () => {
  it('remaps validation run paths under array', () => {
    const validationRuns = new Map<string, number>([
      ['items.0.name', 1],
      ['items.1.name', 2],
      ['items.2.name', 3],
      ['unrelated', 4],
    ]);
    const pendingDebounces = new Map();
    remapValidationRunState(
      { validationRuns, pendingValidationDebounces: pendingDebounces } as FormRuntimeValidationRunState,
      'items',
      (i) => i - 1,
      vi.fn(),
    );
    expect(validationRuns.get('items.0.name')).toBe(2);
    expect(validationRuns.get('items.1.name')).toBe(3);
    expect(validationRuns.has('items.2.name')).toBe(false);
    expect(validationRuns.get('unrelated')).toBe(4);
  });

  it('remaps pending validation debounces', () => {
    const validationRuns = new Map<string, number>();
    const pendingDebounces = new Map<string, PendingValidationDebounce>([
      ['items.1.field', { timer: 1, resolve: vi.fn(), reject: vi.fn() }],
      ['items.2.field', { timer: 2, resolve: vi.fn(), reject: vi.fn() }],
    ]);
    remapValidationRunState(
      { validationRuns, pendingValidationDebounces: pendingDebounces } as FormRuntimeValidationRunState,
      'items',
      (i) => i - 1,
      vi.fn(),
    );
    expect(pendingDebounces.has('items.0.field')).toBe(true);
    expect(pendingDebounces.has('items.1.field')).toBe(true);
    expect(pendingDebounces.has('items.2.field')).toBe(false);
  });

  it('cancels debounces when transform returns undefined', () => {
    const validationRuns = new Map<string, number>();
    const cancelFn = vi.fn();
    const pendingDebounces = new Map<string, PendingValidationDebounce>([
      ['items.2.field', { timer: 1, resolve: vi.fn(), reject: vi.fn() }],
    ]);
    remapValidationRunState(
      { validationRuns, pendingValidationDebounces: pendingDebounces } as FormRuntimeValidationRunState,
      'items',
      () => undefined,
      cancelFn,
    );
    expect(cancelFn).toHaveBeenCalledWith('items.2.field');
  });

  it('skips pending debounce when entry is missing', () => {
    const validationRuns = new Map<string, number>();
    const pendingDebounces = new Map<string, PendingValidationDebounce | undefined>([['items.1.field', undefined]]);
    remapValidationRunState(
      { validationRuns, pendingValidationDebounces: pendingDebounces } as FormRuntimeValidationRunState,
      'items',
      (i) => i - 1,
      vi.fn(),
    );
    expect(pendingDebounces.has('items.0.field')).toBe(false);
  });

  it('leaves unchanged paths untouched', () => {
    const validationRuns = new Map<string, number>([['items.0.name', 5]]);
    const pendingDebounces = new Map();
    remapValidationRunState(
      { validationRuns, pendingValidationDebounces: pendingDebounces } as FormRuntimeValidationRunState,
      'items',
      (i) => i,
      vi.fn(),
    );
    expect(validationRuns.get('items.0.name')).toBe(5);
  });
});

describe('remapInitialFieldState', () => {
  it('remaps initial values and dirty state', () => {
    const sharedState = {
      initialFieldState: {
        initialValues: {
          'items.0.name': 'A',
          'items.1.name': 'B',
          'items.2.name': 'C',
          standalone: 42,
        },
        dirty: {
          'items.0.name': false,
          'items.1.name': true,
          'items.2.name': true,
        },
      },
    };
    remapInitialFieldState(sharedState as FormRuntimeInitialStateSlice, 'items', (i) => i - 1);
    expect(sharedState.initialFieldState.initialValues['items.0.name']).toBe('B');
    expect(sharedState.initialFieldState.initialValues['items.1.name']).toBe('C');
    expect(sharedState.initialFieldState.initialValues['standalone']).toBe(42);
    expect(sharedState.initialFieldState.dirty['items.0.name']).toBe(true);
    expect(sharedState.initialFieldState.dirty['items.1.name']).toBe(true);
  });

  it('removes entries when transform returns undefined', () => {
    const sharedState = {
      initialFieldState: {
        initialValues: { 'items.0.x': 1, 'items.1.x': 2 },
        dirty: { 'items.0.x': true, 'items.1.x': false },
      },
    };
    remapInitialFieldState(sharedState as FormRuntimeInitialStateSlice, 'items', () => undefined);
    expect(Object.keys(sharedState.initialFieldState.initialValues)).toHaveLength(0);
    expect(Object.keys(sharedState.initialFieldState.dirty)).toHaveLength(0);
  });

  it('skips falsy dirty values', () => {
    const sharedState = {
      initialFieldState: {
        initialValues: { 'items.0.x': 1 },
        dirty: { 'items.0.x': false },
      },
    };
    remapInitialFieldState(sharedState as FormRuntimeInitialStateSlice, 'items', (i) => i);
    expect(sharedState.initialFieldState.dirty['items.0.x']).toBeUndefined();
  });
});

describe('remapArrayFieldState', () => {
  it('remaps field states using transform', () => {
    const fieldStates: Record<string, FieldState> = {
      'items.1': { touched: true },
      'items.2': { dirty: true },
      other: { visited: true },
    };
    const result = remapArrayFieldState('items', (i) => i - 1, { fieldStates });
    expect(result.fieldStates['items.0']).toEqual({ touched: true });
    expect(result.fieldStates['items.1']).toEqual({ dirty: true });
    expect(result.fieldStates['other']).toEqual({ visited: true });
  });
});

describe('replaceManagedArrayValue', () => {
  it('marks dirty when value differs from initial', () => {
    const result = replaceManagedArrayValue({
      arrayPath: 'items',
      nextValue: ['a', 'b'],
      state: { values: {}, fieldStates: {} },
      initialFieldState: { initialValues: { items: ['a'] }, dirty: {} },
      remappedState: { fieldStates: {} },
    });
    expect(result.values.items).toEqual(['a', 'b']);
    expect(result.fieldStates['items']?.dirty).toBe(true);
  });

  it('removes dirty when value matches initial', () => {
    const initial = ['a', 'b'];
    const result = replaceManagedArrayValue({
      arrayPath: 'items',
      nextValue: initial,
      state: { values: {}, fieldStates: {} },
      initialFieldState: { initialValues: { items: initial }, dirty: {} },
      remappedState: { fieldStates: { items: { dirty: true, touched: true } } },
    });
    expect(result.fieldStates['items']).toEqual({ touched: true });
  });

  it('clears validating and errors from existing field state', () => {
    const result = replaceManagedArrayValue({
      arrayPath: 'items',
      nextValue: ['x'],
      state: { values: {}, fieldStates: {} },
      initialFieldState: { initialValues: { items: [] }, dirty: {} },
      remappedState: {
        fieldStates: {
          items: {
            validating: true,
            errors: [{ path: 'items', message: 'err', rule: 'required' }],
          },
        },
      },
    });
    expect(result.fieldStates['items']?.validating).toBeUndefined();
    expect(result.fieldStates['items']?.errors).toBeUndefined();
    expect(result.fieldStates['items']?.dirty).toBe(true);
  });

  it('removes field state when empty after cleanup', () => {
    const arr = ['x'];
    const result = replaceManagedArrayValue({
      arrayPath: 'items',
      nextValue: arr,
      state: { values: {}, fieldStates: {} },
      initialFieldState: { initialValues: { items: arr }, dirty: {} },
      remappedState: { fieldStates: { items: { validating: true } } },
    });
    expect(result.fieldStates['items']).toBeUndefined();
  });

  it('creates dirty field state when no prior state and value differs', () => {
    const result = replaceManagedArrayValue({
      arrayPath: 'items',
      nextValue: ['new'],
      state: { values: {}, fieldStates: {} },
      initialFieldState: { initialValues: { items: [] }, dirty: {} },
      remappedState: { fieldStates: {} },
    });
    expect(result.fieldStates['items']).toEqual({ dirty: true });
  });

  it('does not create field state when value matches initial and no prior state', () => {
    const arr = ['a'];
    const result = replaceManagedArrayValue({
      arrayPath: 'items',
      nextValue: arr,
      state: { values: {}, fieldStates: {} },
      initialFieldState: { initialValues: { items: arr }, dirty: {} },
      remappedState: { fieldStates: {} },
    });
    expect(result.fieldStates['items']).toBeUndefined();
  });
});

describe('executeArrayMutation', () => {
  function createMutationState(initialValues: Record<string, any> = {}) {
    const store = createFormStore(initialValues);
    const scope = createScopeRef({ id: 'test', path: '$test', initialData: {} });
    return {
      store,
      scope,
      initialFieldState: { initialValues: { ...initialValues }, dirty: {} },
      validationRuns: new Map<string, number>(),
      pendingValidationDebounces: new Map(),
      validationAbortControllers: new Map(),
      validationAsyncGovernance: createAsyncGovernanceStore(),
      inputValue: {} as ManagedFormRuntimeSharedState['inputValue'],
      runtimeFieldRegistrations: new Map(),
      pathToRegistrationId: new Map(),
      childPathToRegistrationId: new Map(),
      hiddenFields: new Set(),
      lifecycleState: 'active' as const,
      modelGeneration: 1,
      externalErrors: new Map(),
      childContracts: new Map(),
    } as ManagedFormRuntimeSharedState;
  }

  it('removes an element and remaps state', () => {
    const shared = createMutationState({ items: ['a', 'b', 'c'] });
    shared.store.setFieldState('items.1', { touched: true });

    executeArrayMutation({
      sharedState: shared,
      scope: shared.scope,
      formId: 'test-form',
      setLastChange: vi.fn(),
      getArrayValue: (path) => shared.store.getState().values[path],
      arrayPath: 'items',
      arrayOperation: (arr) => [...arr.slice(0, 1), ...arr.slice(2)],
      indexTransform: (i) => (i < 1 ? i : i > 1 ? i - 1 : undefined),
      cancelValidationDebounce: vi.fn(),
      revalidateDependents: vi.fn(),
    });

    expect(shared.store.getState().values.items).toEqual(['a', 'c']);
  });

  it('handles non-array current value as empty array', () => {
    const shared = createMutationState({ items: 'not-array' });
    executeArrayMutation({
      sharedState: shared,
      scope: shared.scope,
      formId: 'test-form',
      setLastChange: vi.fn(),
      getArrayValue: (path) => shared.store.getState().values[path],
      arrayPath: 'items',
      arrayOperation: (arr) => [...arr, 'new'],
      indexTransform: () => 0,
      cancelValidationDebounce: vi.fn(),
      revalidateDependents: vi.fn(),
    });
    expect(shared.store.getState().values.items).toEqual(['new']);
  });

  it('cancels validation debounce for array path', () => {
    const shared = createMutationState({ items: ['a'] });
    const cancel = vi.fn();
    executeArrayMutation({
      sharedState: shared,
      scope: shared.scope,
      formId: 'test-form',
      setLastChange: vi.fn(),
      getArrayValue: (path) => shared.store.getState().values[path],
      arrayPath: 'items',
      arrayOperation: (arr) => [...arr, 'b'],
      indexTransform: (i) => i,
      cancelValidationDebounce: cancel,
      revalidateDependents: vi.fn(),
    });
    expect(cancel).toHaveBeenCalledWith('items');
  });

  it('calls revalidateDependents', () => {
    const shared = createMutationState({ items: ['a'] });
    const revalidate = vi.fn();
    executeArrayMutation({
      sharedState: shared,
      scope: shared.scope,
      formId: 'test-form',
      setLastChange: vi.fn(),
      getArrayValue: (path) => shared.store.getState().values[path],
      arrayPath: 'items',
      arrayOperation: (arr) => [...arr, 'b'],
      indexTransform: (i) => i,
      cancelValidationDebounce: vi.fn(),
      revalidateDependents: revalidate,
    });
    expect(revalidate).toHaveBeenCalledWith('items', 'change');
  });
});
