import { describe, expect, it, vi } from 'vitest';
import { createAsyncGovernanceStore } from '../async-data/async-governance.js';
import { createFormStore } from '../form-store.js';
import { createScopeRef } from '../scope.js';
import { refreshCompiledModelState } from '../form-runtime-owner-lifecycle.js';
import type {
  ManagedFormRuntimeSharedState,
  CreateManagedFormRuntimeInput,
} from '../form-runtime-types.js';
import { buildFormOwnerRuntime } from '../form-runtime-owner.js';

function createSharedState(
  overrides: Partial<ManagedFormRuntimeSharedState> = {},
): ManagedFormRuntimeSharedState {
  return {
    inputValue: {
      executeValidationRule: async () => undefined,
      validateRule: () => undefined,
      validation: undefined,
    } satisfies CreateManagedFormRuntimeInput,
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
    modelGenerationListeners: new Set(),
    lifecycleWaiters: new Set(),
    externalErrors: new Map(),
    childContracts: new Map(),
    ...overrides,
  };
}

describe('validateSubtree threads the caller abort signal through the compiled-model path (H28)', () => {
  function buildOwnerWithModel() {
    const sharedState = createSharedState({
      inputValue: {
        executeValidationRule: async () => undefined,
        validateRule: () => undefined,
        validation: {
          nodes: { field: { kind: 'field', children: [] } },
          order: ['field'],
          rootPath: '',
          dependents: {},
        },
      } as unknown as CreateManagedFormRuntimeInput,
    });

    const owner = buildFormOwnerRuntime({
      sharedState,
      formId: 'form-1',
      getCurrentValidation: () => sharedState.inputValue.validation as any,
      setCurrentValidation: vi.fn(),
      getIsSubmitting: () => false,
      getThisForm: () =>
        ({
          isPathOwned: () => true,
          validateField: vi.fn(async () => ({ ok: true, errors: [] })),
        }) as any,
      setLastChange: vi.fn(),
    });
    return owner;
  }

  it('aborts early when the caller signal is already aborted', async () => {
    const owner = buildOwnerWithModel();
    const controller = new AbortController();
    controller.abort();

    // Before H28 the compiled-model path (validateSubtreeByNode) dropped
    // `options`, so an aborted signal never reached the per-node loop.
    await expect(
      owner.validateSubtree('field', 'change', { signal: controller.signal }),
    ).rejects.toThrow('Validation aborted');
  });

  it('completes when the signal is not aborted', async () => {
    const owner = buildOwnerWithModel();
    const controller = new AbortController();
    const result = await owner.validateSubtree('field', 'change', {
      signal: controller.signal,
    });
    expect(result).toBeDefined();
  });
});

describe('validateForm gates on a transitional lifecycle even with a model (AUDIT-14)', () => {
  it('waits for an active lifecycle before running when bootstrapping with a compiled model', async () => {
    const sharedState = createSharedState({
      lifecycleState: 'refreshing',
      inputValue: {
        executeValidationRule: async () => undefined,
        validateRule: () => undefined,
        validation: {
          nodes: { name: { kind: 'field', children: [] } },
          order: ['name'],
          rootPath: '',
          dependents: {},
        },
      } as unknown as CreateManagedFormRuntimeInput,
    });

    const owner = buildFormOwnerRuntime({
      sharedState,
      formId: 'form-1',
      getCurrentValidation: () => sharedState.inputValue.validation as any,
      setCurrentValidation: vi.fn(),
      getIsSubmitting: () => false,
      getThisForm: () =>
        ({
          isPathOwned: () => true,
          validateField: vi.fn(async () => ({ ok: true, errors: [] })),
        }) as any,
      setLastChange: vi.fn(),
    });

    let resolved = false;
    const pending = owner.validateForm('change').then(() => {
      resolved = true;
    });

    // While the lifecycle is transitional, validation must NOT proceed.
    await Promise.resolve();
    await Promise.resolve();
    expect(resolved).toBe(false);

    // Transition to active resolves the waiter and lets validation complete.
    refreshCompiledModelState({
      sharedState,
      formId: 'form-1',
      getCurrentValidation: () => sharedState.inputValue.validation as any,
      setCurrentValidation: vi.fn(),
      newModel: sharedState.inputValue.validation as any,
      setLastChange: vi.fn(),
    });

    await pending;
    expect(resolved).toBe(true);
  });
});
