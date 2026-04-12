import type {
  ApplyExternalErrorsInput,
  ApplyScopeChangesInput,
  FormRuntime,
  FormValidationResult,
  ScopeValidationStateSnapshot,
  ValidationError,
  ValidationReason
} from '@nop-chaos/flux-core';
import {
  getCompiledValidationDependents,
  getCompiledValidationField,
  getCompiledValidationTraversalOrder,
  setIn
} from '@nop-chaos/flux-core';
import { computeRefreshErrorRetention } from './form-runtime-lifecycle';
import { validationErrorsEqual } from './form-runtime-status';
import { collectSubtreeValidationTargets } from './form-runtime-subtree';
import { cancelAllValidationDebounces, cancelValidationDebounce, validatePath, validateSubtreeByNode } from './form-runtime-validation';
import type { ExternalErrorEntry, ManagedFormRuntimeSharedState } from './form-runtime-types';

export function buildFormOwnerRuntime(input: {
  sharedState: ManagedFormRuntimeSharedState;
  formId: string;
  getCurrentValidation: () => FormRuntime['validation'];
  setCurrentValidation: (validation: FormRuntime['validation']) => void;
  getIsSubmitting: () => boolean;
  getThisForm: () => FormRuntime;
}) {
  function computeScopeState(): ScopeValidationStateSnapshot {
    const state = input.sharedState.store.getState();
    const hasErrors = Object.keys(state.errors).length > 0;
    const isValidating = Object.values(state.validating).some(Boolean);
    const valid = !hasErrors;
    return {
      valid,
      hasErrors,
      validating: isValidating,
      lifecycleState: input.sharedState.lifecycleState,
      ready: valid && !isValidating,
      modelGeneration: input.sharedState.modelGeneration
    };
  }

  async function revalidateDependents(path: string) {
    const dependentPaths = getCompiledValidationDependents(input.getCurrentValidation(), path);

    for (const dependentPath of dependentPaths) {
      if (dependentPath === path) {
        continue;
      }

      input.sharedState.validationRuns.set(dependentPath, (input.sharedState.validationRuns.get(dependentPath) ?? 0) + 1);
      cancelValidationDebounce(input.sharedState, dependentPath);

      const currentDependentValue = input.sharedState.scope.get(dependentPath);
      const dependentBaseline = input.sharedState.initialFieldState.initialValues[dependentPath];
      const isDirty = !Object.is(dependentBaseline, currentDependentValue);

      const state = input.sharedState.store.getState();
      const nextValidating = { ...state.validating };
      delete nextValidating[dependentPath];

      const nextDirty = isDirty
        ? { ...state.dirty, [dependentPath]: true }
        : (() => { const dirty = { ...state.dirty }; delete dirty[dependentPath]; return dirty; })();

      input.sharedState.store.batchUpdate({ validating: nextValidating, dirty: nextDirty });

      if (
        input.sharedState.store.getState().touched[dependentPath]
        || input.sharedState.store.getState().visited[dependentPath]
        || input.getIsSubmitting()
      ) {
        await input.getThisForm().validateField(dependentPath);
      } else {
        input.getThisForm().clearErrors(dependentPath);
      }
    }
  }

  function rebuildStoreErrorsFromExternal(
    baseErrors: Record<string, ValidationError[]>
  ): Record<string, ValidationError[]> {
    const next: Record<string, ValidationError[]> = {};

    for (const [path, pathErrors] of Object.entries(baseErrors)) {
      const nonExternal = pathErrors.filter((error) => error.sourceKind !== 'external');
      if (nonExternal.length > 0) {
        next[path] = nonExternal;
      }
    }

    for (const entry of input.sharedState.externalErrors.values()) {
      for (const error of entry.errors) {
        const externalError: ValidationError = { ...error, sourceKind: 'external' };
        const existing = next[error.path];
        next[error.path] = existing ? [...existing, externalError] : [externalError];
      }
    }

    return next;
  }

  function clearExternalErrorsForPath(name: string): boolean {
    let changed = false;

    for (const [sourceId, entry] of input.sharedState.externalErrors) {
      const filtered = entry.errors.filter(
        (error: ValidationError) => error.path !== name && !error.path.startsWith(`${name}.`)
      );

      if (filtered.length !== entry.errors.length) {
        changed = true;
        if (filtered.length === 0) {
          input.sharedState.externalErrors.delete(sourceId);
        } else {
          input.sharedState.externalErrors.set(sourceId, { sourceId, errors: filtered } satisfies ExternalErrorEntry);
        }
      }
    }

    return changed;
  }

  function applyExternalErrors(inputValue: ApplyExternalErrorsInput): ScopeValidationStateSnapshot {
    const { sourceId, errors, replace } = inputValue;
    const existing = input.sharedState.externalErrors.get(sourceId);

    if (replace || !existing) {
      input.sharedState.externalErrors.set(sourceId, { sourceId, errors });
    } else {
      input.sharedState.externalErrors.set(sourceId, { sourceId, errors: [...existing.errors, ...errors] });
    }

    const nextErrors = rebuildStoreErrorsFromExternal(input.sharedState.store.getState().errors);
    input.sharedState.store.setErrors(nextErrors);
    return computeScopeState();
  }

  function supersedeLowerPriorityWork(): void {
    const allPaths = Array.from(input.sharedState.validationRuns.keys());
    for (const path of allPaths) {
      input.sharedState.validationRuns.set(path, (input.sharedState.validationRuns.get(path) ?? 0) + 1);
      cancelValidationDebounce(input.sharedState, path);
    }
  }

  async function applyChangesAndRevalidate(inputValue: ApplyScopeChangesInput): Promise<FormValidationResult> {
    if (input.sharedState.lifecycleState === 'disposed') {
      return { ok: true, errors: [], fieldErrors: {} };
    }

    const { writes, changedPaths, reason } = inputValue;
    const state = input.sharedState.store.getState();
    let nextValues = state.values;

    for (const [path, value] of Object.entries(writes)) {
      nextValues = setIn(nextValues, path, value);
      input.sharedState.validationRuns.set(path, (input.sharedState.validationRuns.get(path) ?? 0) + 1);
      cancelValidationDebounce(input.sharedState, path);
    }

    input.sharedState.store.batchUpdate({ values: nextValues });

    for (const path of changedPaths) {
      await revalidateDependents(path);
    }

    return input.getThisForm().validateForm(reason);
  }

  async function validateForm(reason?: ValidationReason) {
    const currentValidation = input.getCurrentValidation();

    if (!currentValidation && input.sharedState.runtimeFieldRegistrations.size === 0) {
      return {
        ok: true,
        errors: [],
        fieldErrors: {}
      } as FormValidationResult;
    }

    const fieldErrors: Record<string, ValidationError[]> = {};
    const errors: ValidationError[] = [];
    const initialErrors = input.sharedState.store.getState().errors;
    const validatedPaths = new Set<string>();

    const validationPaths = getCompiledValidationTraversalOrder(currentValidation);

    for (const path of validationPaths) {
      validatedPaths.add(path);
      const result = await input.getThisForm().validateField(path, reason);

      if (!result.ok) {
        fieldErrors[path] = result.errors;
        errors.push(...result.errors);
      }
    }

    async function validateRegisteredChildren(registration: import('@nop-chaos/flux-core').RuntimeFieldRegistration) {
      if (!registration.validateChild || !registration.childPaths?.length) return;
      for (const childPath of registration.childPaths) {
        validatedPaths.add(childPath);
        const result = await input.getThisForm().validateField(childPath, reason);
        if (!result.ok) {
          fieldErrors[childPath] = result.errors;
          errors.push(...result.errors);
        }
      }
    }

    for (const entry of input.sharedState.runtimeFieldRegistrations.values()) {
      const { registration } = entry;
      const path = registration.path;
      validatedPaths.add(path);

      if (getCompiledValidationField(currentValidation, path)) {
        await validateRegisteredChildren(registration);
        continue;
      }

      if (!registration.validate) {
        await validateRegisteredChildren(registration);
        continue;
      }

      const result = await input.getThisForm().validateField(path, reason);

      if (!result.ok) {
        fieldErrors[path] = result.errors;
        errors.push(...result.errors);
      }

      await validateRegisteredChildren(registration);
    }

    const currentErrors = input.sharedState.store.getState().errors;
    const preservedErrors: Record<string, ValidationError[]> = {};

    for (const [path, pathErrors] of Object.entries(currentErrors)) {
      if (!validatedPaths.has(path)) {
        preservedErrors[path] = pathErrors;
        continue;
      }

      const nextFieldErrors = fieldErrors[path];
      if (nextFieldErrors) {
        preservedErrors[path] = nextFieldErrors;
      }
    }

    const mergedErrors = {
      ...preservedErrors,
      ...fieldErrors
    };

    if (mergedErrors !== currentErrors) {
      input.sharedState.store.setErrors(mergedErrors);
    }

    for (const [path, pathErrors] of Object.entries(mergedErrors)) {
      if (fieldErrors[path]) {
        continue;
      }

      if (validationErrorsEqual(initialErrors[path], pathErrors)) {
        continue;
      }

      fieldErrors[path] = pathErrors as ValidationError[];
      errors.push(...(pathErrors as ValidationError[]));
    }

    return {
      ok: errors.length === 0,
      errors,
      fieldErrors
    } as FormValidationResult;
  }

  async function validateSubtree(path: string, reason?: ValidationReason) {
    const currentValidation = input.getCurrentValidation();

    if (!currentValidation) {
      return {
        ok: true,
        errors: [],
        fieldErrors: {}
      } as FormValidationResult;
    }

    const nodeResult = await validateSubtreeByNode(input.sharedState, path, reason);

    if (nodeResult) {
      return nodeResult;
    }

    const targetPaths = collectSubtreeValidationTargets(input.sharedState, path);
    const errors: ValidationError[] = [];
    const fieldErrors: Record<string, ValidationError[]> = {};

    for (const targetPath of targetPaths) {
      const result = await validatePath(input.sharedState, targetPath, reason);

      if (!result.ok) {
        fieldErrors[targetPath] = result.errors;
        errors.push(...result.errors);
      }
    }

    return {
      ok: errors.length === 0,
      errors,
      fieldErrors
    } as FormValidationResult;
  }

  function refreshCompiledModel(newModel: NonNullable<FormRuntime['validation']>) {
    if (input.sharedState.lifecycleState === 'disposed') {
      return;
    }

    input.sharedState.lifecycleState = 'refreshing';
    input.sharedState.modelGeneration += 1;

    const oldModel = input.getCurrentValidation();
    input.setCurrentValidation(newModel);
    input.sharedState.inputValue = { ...input.sharedState.inputValue, validation: newModel };

    cancelAllValidationDebounces(input.sharedState);
    input.sharedState.validationRuns.clear();

    const staleRegistrations = Array.from(input.sharedState.runtimeFieldRegistrations.entries());
    for (const [regId, entry] of staleRegistrations) {
      input.sharedState.runtimeFieldRegistrations.delete(regId);
      input.sharedState.pathToRegistrationId.delete(entry.registration.path);
    }

    if (oldModel) {
      const currentErrors = input.sharedState.store.getState().errors;
      const retainedErrors = computeRefreshErrorRetention(oldModel, newModel, currentErrors);
      input.sharedState.store.setErrors(retainedErrors);
    } else {
      input.sharedState.store.setErrors({});
    }

    input.sharedState.lifecycleState = 'active';
  }

  function dispose() {
    if (input.sharedState.lifecycleState === 'disposed') {
      return;
    }

    input.sharedState.lifecycleState = 'disposed';
    cancelAllValidationDebounces(input.sharedState);
    input.sharedState.validationRuns.clear();
    input.sharedState.runtimeFieldRegistrations.clear();
    input.sharedState.pathToRegistrationId.clear();
    input.sharedState.childContracts.clear();
    input.sharedState.externalErrors.clear();
    input.sharedState.store.batchUpdate({ errors: {}, validating: {}, touched: {}, dirty: {}, visited: {} });
  }

  return {
    computeScopeState,
    revalidateDependents,
    rebuildStoreErrorsFromExternal,
    clearExternalErrorsForPath,
    applyExternalErrors,
    supersedeLowerPriorityWork,
    applyChangesAndRevalidate,
    validateForm,
    validateSubtree,
    refreshCompiledModel,
    dispose
  };
}
