import { computeRefreshErrorRetention } from './form-runtime-lifecycle.js';
import { cancelAllValidationDebounces } from './form-runtime-validation.js';
import type { FieldState, FormRuntime, ScopeChange, ValidationError } from '@nop-chaos/flux-core';
import type { ManagedFormRuntimeSharedState } from './form-runtime-types.js';

function clearValidationAsyncOwners(sharedState: ManagedFormRuntimeSharedState) {
  for (const path of sharedState.validationRuns.keys()) {
    sharedState.validationAsyncGovernance.clearOwner(`validation:${sharedState.scope.id}:${path}`);
  }

  for (const path of sharedState.validationAbortControllers.keys()) {
    sharedState.validationAsyncGovernance.clearOwner(`validation:${sharedState.scope.id}:${path}`);
  }
}

function resolveLifecycleWaiters(sharedState: ManagedFormRuntimeSharedState) {
  const waiters = Array.from(sharedState.lifecycleWaiters);
  sharedState.lifecycleWaiters.clear();

  for (const waiter of waiters) {
    waiter();
  }
}

export function refreshCompiledModelState(args: {
  sharedState: ManagedFormRuntimeSharedState;
  getCurrentValidation: () => FormRuntime['validation'];
  setCurrentValidation: (validation: FormRuntime['validation']) => void;
  newModel: NonNullable<FormRuntime['validation']>;
  formId: string;
  setLastChange: (change: ScopeChange) => void;
}) {
  if (args.sharedState.lifecycleState === 'disposed') {
    return;
  }

  args.sharedState.lifecycleState = 'refreshing';
  args.sharedState.modelGeneration += 1;

  const oldModel = args.getCurrentValidation();
  args.setCurrentValidation(args.newModel);
  args.sharedState.inputValue = { ...args.sharedState.inputValue, validation: args.newModel };

  cancelAllValidationDebounces(args.sharedState);
  clearValidationAsyncOwners(args.sharedState);
  args.sharedState.validationRuns.clear();
  for (const controller of args.sharedState.validationAbortControllers.values()) {
    controller.abort();
  }
  args.sharedState.validationAbortControllers.clear();

  const staleRegistrations = Array.from(args.sharedState.runtimeFieldRegistrations.entries());
  for (const [regId, entry] of staleRegistrations) {
    args.sharedState.runtimeFieldRegistrations.delete(regId);
    args.sharedState.pathToRegistrationId.delete(entry.registration.path);
    if (entry.registration.childPaths) {
      for (const childPath of entry.registration.childPaths) {
        if (args.sharedState.childPathToRegistrationId.get(childPath) === regId) {
          args.sharedState.childPathToRegistrationId.delete(childPath);
        }
      }
    }
  }

  if (oldModel) {
    const currentFieldStates = args.sharedState.store.getState().fieldStates;
    const currentErrors: Record<string, ValidationError[]> = {};
    for (const [path, fs] of Object.entries(currentFieldStates)) {
      if (fs.errors && fs.errors.length > 0) {
        currentErrors[path] = fs.errors;
      }
    }
    const retainedErrors = computeRefreshErrorRetention(oldModel, args.newModel, currentErrors);

    const nextFieldStates = { ...currentFieldStates };
    for (const path of Object.keys(currentFieldStates)) {
      if (currentFieldStates[path]?.errors && !retainedErrors[path]) {
        const { errors: _removed, ...rest } = currentFieldStates[path];
        nextFieldStates[path] = Object.keys(rest).length > 0 ? rest : undefined!;
        if (!nextFieldStates[path]) delete nextFieldStates[path];
      }
    }
    for (const [path, pathErrors] of Object.entries(retainedErrors)) {
      nextFieldStates[path] = { ...nextFieldStates[path], errors: pathErrors };
    }
    args.setLastChange({
      paths: [],
      sourceScopeId: args.formId,
      kind: 'update',
    });
    args.sharedState.store.batchUpdate({ fieldStates: nextFieldStates });
  } else {
    const currentFieldStates = args.sharedState.store.getState().fieldStates;
    const nextFieldStates: Record<string, FieldState> = {};
    for (const [path, fs] of Object.entries(currentFieldStates)) {
      if (fs.errors) {
        const { errors: _removed, ...rest } = fs;
        if (Object.keys(rest).length > 0) {
          nextFieldStates[path] = rest;
        }
      } else {
        nextFieldStates[path] = fs;
      }
    }
    args.setLastChange({
      paths: [],
      sourceScopeId: args.formId,
      kind: 'update',
    });
    args.sharedState.store.batchUpdate({ fieldStates: nextFieldStates });
  }

  args.sharedState.lifecycleState = 'active';
  resolveLifecycleWaiters(args.sharedState);
}

export function disposeOwnerState(args: {
  sharedState: ManagedFormRuntimeSharedState;
  formId: string;
  setLastChange: (change: ScopeChange) => void;
}) {
  if (args.sharedState.lifecycleState === 'disposed') {
    return;
  }

  args.sharedState.lifecycleState = 'disposed';
  resolveLifecycleWaiters(args.sharedState);
  cancelAllValidationDebounces(args.sharedState);
  clearValidationAsyncOwners(args.sharedState);
  args.sharedState.validationRuns.clear();
  for (const controller of args.sharedState.validationAbortControllers.values()) {
    controller.abort();
  }
  args.sharedState.validationAbortControllers.clear();
  args.sharedState.runtimeFieldRegistrations.clear();
  args.sharedState.pathToRegistrationId.clear();
  args.sharedState.childPathToRegistrationId.clear();
  args.sharedState.childContracts.clear();
  args.sharedState.externalErrors.clear();
  args.setLastChange({
    paths: [],
    sourceScopeId: args.formId,
    kind: 'update',
  });
  args.sharedState.store.batchUpdate({ fieldStates: {} });
}
