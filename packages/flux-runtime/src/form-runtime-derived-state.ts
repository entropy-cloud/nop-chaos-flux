import { getCompiledValidationTraversalOrder, getIn, type FieldState } from '@nop-chaos/flux-core';
import type { FormRuntime } from '@nop-chaos/flux-core';
import type { ArrayMutationContext } from './form-runtime-array-ops.js';
import type { ManagedFormRuntimeSharedState } from './form-runtime-types.js';

export function computeCanSubmitState(args: {
  ownerRuntime: Pick<FormRuntime, 'getScopeState'>;
  sharedState: ManagedFormRuntimeSharedState;
}) {
  const scopeState = args.ownerRuntime.getScopeState();
  if (!scopeState.valid || scopeState.validating) {
    return false;
  }

  for (const contract of args.sharedState.childContracts.values()) {
    if (contract.mode === 'summary-gate' && contract.active) {
      const childState = contract.getState();
      if (!childState.ready || childState.validating || !childState.valid) {
        return false;
      }
    }
  }

  return true;
}

export function createAllTouchedComputer(args: {
  store: FormRuntime['store'];
  getCurrentValidation: () => FormRuntime['validation'];
}) {
  let cachedAllTouchedFieldStates: Record<string, FieldState> | undefined;
  let cachedAllTouchedResult: boolean | undefined;

  return function computeAllTouched() {
    const state = args.store.getState();
    if (cachedAllTouchedResult !== undefined && cachedAllTouchedFieldStates === state.fieldStates) {
      return cachedAllTouchedResult;
    }
    cachedAllTouchedFieldStates = state.fieldStates;
    const order = getCompiledValidationTraversalOrder(args.getCurrentValidation());
    if (order.length === 0) {
      cachedAllTouchedResult = true;
      return true;
    }
    cachedAllTouchedResult = order.every((path) => state.fieldStates[path]?.touched === true);
    return cachedAllTouchedResult;
  };
}

export function buildArrayMutationContext(args: {
  sharedState: ManagedFormRuntimeSharedState;
  scope: FormRuntime['scope'];
  store: FormRuntime['store'];
  formId: string;
  setLastChange: (change: import('@nop-chaos/flux-core').ScopeChange) => void;
  revalidateDependents: ArrayMutationContext['revalidateDependents'];
  reportDependentRevalidationFailure?: ArrayMutationContext['reportDependentRevalidationFailure'];
}): ArrayMutationContext {
  return {
    sharedState: args.sharedState,
    scope: args.scope,
    formId: args.formId,
    setLastChange: args.setLastChange,
    getArrayValue(path) {
      return getIn(args.store.getState().values, path);
    },
    revalidateDependents: args.revalidateDependents,
    reportDependentRevalidationFailure: args.reportDependentRevalidationFailure,
  };
}
