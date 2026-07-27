import type { FieldState, FormStoreApi, FormValidationResult, ScopeValidationStateSnapshot, ValidationOwnerLifecycleState } from '@nop-chaos/flux-core';
import { cancelValidationDebounce } from './form-runtime-validation.js';
import type { ManagedFormRuntimeSharedState } from './form-runtime-types.js';

export function createLifecycleBlockedValidationResult(sharedState: ManagedFormRuntimeSharedState): FormValidationResult {
  const lifecycleState = sharedState.lifecycleState;
  const message =
    lifecycleState === 'disposed'
      ? 'Validation is blocked because the owner is disposed.'
      : `Validation is blocked while owner lifecycleState is "${lifecycleState}".`;

  return {
    ok: false,
    errors: [
      {
        path: '',
        ownerPath: '',
        rule: 'async',
        message,
        sourceKind: 'form',
      },
    ],
    fieldErrors: {},
  } as FormValidationResult;
}

interface ComputeScopeStateCacheEntry {
  fieldStatesRef: Record<string, FieldState> | undefined;
  lifecycleState: ValidationOwnerLifecycleState;
  modelGeneration: number;
  pendingValidationDebounceCount: number;
  result: ScopeValidationStateSnapshot;
}

const computeScopeStateCache = new WeakMap<FormStoreApi, ComputeScopeStateCacheEntry>();

export function computeScopeState(sharedState: ManagedFormRuntimeSharedState): ScopeValidationStateSnapshot {
  const state = sharedState.store.getState();
  const fieldStates = state.fieldStates;
  const lifecycleState = sharedState.lifecycleState;
  const modelGeneration = sharedState.modelGeneration;
  const pendingValidationDebounceCount = sharedState.pendingValidationDebounces.size;

  const cached = computeScopeStateCache.get(sharedState.store);
  if (
    cached &&
    cached.fieldStatesRef === fieldStates &&
    cached.lifecycleState === lifecycleState &&
    cached.modelGeneration === modelGeneration &&
    cached.pendingValidationDebounceCount === pendingValidationDebounceCount
  ) {
    return cached.result;
  }

  let hasErrors = false;
  let isValidating = false;

  for (const fs of Object.values(fieldStates)) {
    if (fs.errors && fs.errors.length > 0) hasErrors = true;
    if (fs.validating) isValidating = true;
    if (hasErrors && isValidating) break;
  }

  if (!isValidating && pendingValidationDebounceCount > 0) {
    isValidating = true;
  }

  const valid = !hasErrors;
  const ready = lifecycleState === 'active' && valid && !isValidating;

  const result: ScopeValidationStateSnapshot = {
    valid,
    hasErrors,
    validating: isValidating,
    lifecycleState,
    ready,
    modelGeneration,
  };

  computeScopeStateCache.set(sharedState.store, {
    fieldStatesRef: fieldStates,
    lifecycleState,
    modelGeneration,
    pendingValidationDebounceCount,
    result,
  });

  return result;
}

export function supersedeLowerPriorityWork(sharedState: ManagedFormRuntimeSharedState, prefix?: string): void {
  const allPaths = Array.from(sharedState.validationRuns.keys());
  for (const path of allPaths) {
    if (prefix && path !== prefix && !path.startsWith(`${prefix}.`)) {
      continue;
    }

    sharedState.validationRuns.set(
      path,
      (sharedState.validationRuns.get(path) ?? 0) + 1,
    );
    cancelValidationDebounce(sharedState, path);
  }
}
