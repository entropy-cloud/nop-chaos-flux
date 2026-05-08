import type {
  ApplyExternalErrorsInput,
  ApplyScopeChangesInput,
  FieldState,
  FormRuntime,
  FormValidationResult,
  ScopeChange,
  ScopeValidationStateSnapshot,
  ValidationError,
  ValidationReason,
} from '@nop-chaos/flux-core';
import {
  getCompiledValidationDependents,
  getCompiledValidationField,
  getCompiledValidationTraversalOrder,
  setIn,
  validationErrorsEqual,
} from '@nop-chaos/flux-core';
import {
  clearExternalErrorsForPath,
  rebuildStoreErrorsFromExternal,
  storeOwnedExternalErrors,
} from './form-runtime-owner-external-errors.js';
import { mergeFieldStateErrors } from './form-runtime-owner-field-states.js';
import { disposeOwnerState, refreshCompiledModelState } from './form-runtime-owner-lifecycle.js';
import { collectSubtreeValidationTargets } from './form-runtime-subtree.js';
import {
  cancelValidationDebounce,
  validatePath,
  validateSubtreeByNode,
} from './form-runtime-validation.js';
import type { ManagedFormRuntimeSharedState } from './form-runtime-types.js';

export function buildFormOwnerRuntime(input: {
  sharedState: ManagedFormRuntimeSharedState;
  formId: string;
  getCurrentValidation: () => FormRuntime['validation'];
  setCurrentValidation: (validation: FormRuntime['validation']) => void;
  getIsSubmitting: () => boolean;
  getThisForm: () => FormRuntime;
  setLastChange: (change: ScopeChange) => void;
}) {
  let cachedFieldStatesRef: Record<string, FieldState> | undefined;
  let cachedLifecycleState = input.sharedState.lifecycleState;
  let cachedModelGeneration = input.sharedState.modelGeneration;
  let cachedPendingValidationDebounceCount = input.sharedState.pendingValidationDebounces.size;
  let cachedScopeState: ScopeValidationStateSnapshot | undefined;

  function computeScopeState(): ScopeValidationStateSnapshot {
    const state = input.sharedState.store.getState();
    const fieldStates = state.fieldStates;
    const lifecycleState = input.sharedState.lifecycleState;
    const modelGeneration = input.sharedState.modelGeneration;
    const pendingValidationDebounceCount = input.sharedState.pendingValidationDebounces.size;

    if (
      cachedScopeState &&
      cachedFieldStatesRef === fieldStates &&
      cachedLifecycleState === lifecycleState &&
      cachedModelGeneration === modelGeneration &&
      cachedPendingValidationDebounceCount === pendingValidationDebounceCount
    ) {
      return cachedScopeState;
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
    cachedFieldStatesRef = fieldStates;
    cachedLifecycleState = lifecycleState;
    cachedModelGeneration = modelGeneration;
    cachedPendingValidationDebounceCount = pendingValidationDebounceCount;
    cachedScopeState = {
      valid,
      hasErrors,
      validating: isValidating,
      lifecycleState,
      ready,
      modelGeneration,
    };
    return cachedScopeState;
  }

  async function revalidateDependents(path: string, reason: ValidationReason = 'system') {
    const model = input.getCurrentValidation();
    const queue = [...getCompiledValidationDependents(model, path)];
    const dependentPaths: string[] = [];
    const visited = new Set<string>([path]);

    while (queue.length > 0) {
      const dependentPath = queue.shift();
      if (!dependentPath || visited.has(dependentPath)) {
        continue;
      }

      visited.add(dependentPath);
      dependentPaths.push(dependentPath);

      for (const nestedDependent of getCompiledValidationDependents(model, dependentPath)) {
        if (!visited.has(nestedDependent)) {
          queue.push(nestedDependent);
        }
      }
    }

    for (const dependentPath of dependentPaths) {
      if (dependentPath === path) {
        continue;
      }

      input.sharedState.validationRuns.set(
        dependentPath,
        (input.sharedState.validationRuns.get(dependentPath) ?? 0) + 1,
      );
      cancelValidationDebounce(input.sharedState, dependentPath);

      const currentDependentValue = input.sharedState.scope.get(dependentPath);
      const dependentBaseline = input.sharedState.initialFieldState.initialValues[dependentPath];
      const isDirty = !Object.is(dependentBaseline, currentDependentValue);

      const fieldStates = input.sharedState.store.getState().fieldStates;
      const existingFieldState = fieldStates[dependentPath];

      const nextFieldState: FieldState = { ...existingFieldState };
      delete nextFieldState.validating;
      if (isDirty) {
        nextFieldState.dirty = true;
      } else {
        delete nextFieldState.dirty;
      }

      const nextFieldStates =
        Object.keys(nextFieldState).length > 0
          ? { ...fieldStates, [dependentPath]: nextFieldState }
          : (() => {
              const next = { ...fieldStates };
              delete next[dependentPath];
              return next;
            })();

      input.setLastChange({
        paths: [],
        sourceScopeId: input.formId,
        kind: 'update',
      });
      input.sharedState.store.batchUpdate({ fieldStates: nextFieldStates });

      const currentFieldState = input.sharedState.store.getState().fieldStates[dependentPath];
      if (currentFieldState?.touched || currentFieldState?.visited || input.getIsSubmitting()) {
        await input.getThisForm().validateField(dependentPath, reason);
      } else {
        await input.getThisForm().validateField(dependentPath, 'system');
      }
    }
  }

  function applyExternalErrors(inputValue: ApplyExternalErrorsInput): ScopeValidationStateSnapshot {
    storeOwnedExternalErrors({
      inputValue,
      sharedState: input.sharedState,
      isPathOwned: (path) => input.getThisForm().isPathOwned(path),
    });

    const fieldStates = input.sharedState.store.getState().fieldStates;
    const nextErrors = rebuildStoreErrorsFromExternal(input.sharedState, fieldStates);

    const nextFieldStates = mergeFieldStateErrors({ currentFieldStates: fieldStates, nextErrors });
    input.setLastChange({
      paths: [],
      sourceScopeId: input.formId,
      kind: 'update',
    });
    input.sharedState.store.batchUpdate({ fieldStates: nextFieldStates });

    return computeScopeState();
  }

  function supersedeLowerPriorityWork(): void {
    const allPaths = Array.from(input.sharedState.validationRuns.keys());
    for (const path of allPaths) {
      input.sharedState.validationRuns.set(
        path,
        (input.sharedState.validationRuns.get(path) ?? 0) + 1,
      );
      cancelValidationDebounce(input.sharedState, path);
    }
  }

  async function applyChangesAndRevalidate(
    inputValue: ApplyScopeChangesInput,
  ): Promise<FormValidationResult> {
    if (input.sharedState.lifecycleState === 'disposed') {
      return { ok: true, errors: [], fieldErrors: {} };
    }

    const { writes, changedPaths, reason } = inputValue;
    const invalidPaths = Array.from(
      new Set([
        ...Object.keys(writes).filter((path) => !input.getThisForm().isPathOwned(path)),
        ...changedPaths.filter((path) => !input.getThisForm().isPathOwned(path)),
      ]),
    );

    if (invalidPaths.length > 0) {
      const errors = invalidPaths.map((path) => ({
        path,
        ownerPath: path,
        rule: 'required' as const,
        message: `Path "${path}" is not owned by form "${input.formId}".`,
        sourceKind: 'form' as const,
      }));

      const fieldErrors = Object.fromEntries(errors.map((error) => [error.path, [error]]));
      return { ok: false, errors, fieldErrors };
    }

    const state = input.sharedState.store.getState();
    let nextValues = state.values;

    for (const [path, value] of Object.entries(writes)) {
      nextValues = setIn(nextValues, path, value);
      input.sharedState.validationRuns.set(
        path,
        (input.sharedState.validationRuns.get(path) ?? 0) + 1,
      );
      cancelValidationDebounce(input.sharedState, path);
    }

    input.setLastChange({
      paths: changedPaths.length > 0 ? changedPaths : ['*'],
      sourceScopeId: input.formId,
      kind: 'update',
    });
    input.sharedState.store.batchUpdate({ values: nextValues });

    let externalErrorsChanged = false;
    for (const path of new Set([...Object.keys(writes), ...changedPaths])) {
      if (clearExternalErrorsForPath({ name: path, sharedState: input.sharedState, getThisForm: input.getThisForm })) {
        externalErrorsChanged = true;
      }
    }

    if (externalErrorsChanged) {
      const currentFieldStates = input.sharedState.store.getState().fieldStates;
      const nextErrors = rebuildStoreErrorsFromExternal(input.sharedState, currentFieldStates);
      const nextFieldStates = mergeFieldStateErrors({ currentFieldStates, nextErrors });
      input.setLastChange({
        paths: [],
        sourceScopeId: input.formId,
        kind: 'update',
      });
      input.sharedState.store.batchUpdate({ fieldStates: nextFieldStates });
    }

    const changedPathResults = new Map<string, ValidationError[]>();

    if (reason === 'change') {
      for (const path of changedPaths) {
        const result = await input.getThisForm().validateField(path, reason);

        if (!result.ok) {
          changedPathResults.set(path, result.errors);
        }
      }
    }

    for (const path of changedPaths) {
      await revalidateDependents(path, reason);
    }

    if (reason === 'change') {
      const fieldStates = input.sharedState.store.getState().fieldStates;
      const fieldErrors: Record<string, ValidationError[]> = {};
      const errors: ValidationError[] = [];

       for (const [path, pathErrors] of changedPathResults.entries()) {
        if (pathErrors.length > 0) {
          fieldErrors[path] = pathErrors;
          errors.push(...pathErrors);
        }
      }

      for (const [path, fs] of Object.entries(fieldStates)) {
        if (changedPathResults.has(path)) {
          continue;
        }

        if (fs.errors && fs.errors.length > 0) {
          fieldErrors[path] = fs.errors;
          errors.push(...fs.errors);
        }
      }

      return { ok: errors.length === 0, errors, fieldErrors };
    }

    return input.getThisForm().validateForm(reason);
  }

  async function validateForm(reason?: ValidationReason) {
    const currentValidation = input.getCurrentValidation();

    if (!currentValidation && input.sharedState.runtimeFieldRegistrations.size === 0) {
      return {
        ok: true,
        errors: [],
        fieldErrors: {},
      } as FormValidationResult;
    }

    const fieldErrors: Record<string, ValidationError[]> = {};
    const errors: ValidationError[] = [];
    const initialFieldStates = input.sharedState.store.getState().fieldStates;
    const validatedPaths = new Set<string>();

    const validationPaths = getCompiledValidationTraversalOrder(currentValidation);

    const pathResults = await Promise.allSettled(
      validationPaths.map(async (path) => {
        validatedPaths.add(path);
        return { path, result: await input.getThisForm().validateField(path, reason) };
      }),
    );

    for (let index = 0; index < pathResults.length; index++) {
      const settled = pathResults[index]!;
      if (settled.status === 'rejected') {
        const fieldPath = validationPaths[index];
        console.error(`[flux-runtime] Field validation threw for path "${fieldPath}":`, settled.reason);
        // Treat validator crash as validation failure rather than silently skipping
        if (fieldPath) {
          fieldErrors[fieldPath] = [{ path: fieldPath, message: 'Validation failed due to an internal error', rule: 'async' }];
          errors.push({ path: fieldPath, message: 'Validation failed due to an internal error', rule: 'async' });
        }
        continue;
      }
      const { path, result } = settled.value;
      if (!result.ok) {
        fieldErrors[path] = result.errors;
        errors.push(...result.errors);
      }
    }

    async function validateRegisteredChildren(
      registration: import('@nop-chaos/flux-core').RuntimeFieldRegistration,
    ) {
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

    const currentFieldStates = input.sharedState.store.getState().fieldStates;
    const preservedErrors: Record<string, ValidationError[]> = {};

    for (const [path, fs] of Object.entries(currentFieldStates)) {
      const pathErrors = fs.errors;
      if (!pathErrors) continue;

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
      ...fieldErrors,
    };

    const nextFieldStates = { ...currentFieldStates };
    let changed = false;
    for (const [path, pathErrors] of Object.entries(mergedErrors)) {
      const existing = nextFieldStates[path];
      if (!validationErrorsEqual(existing?.errors, pathErrors)) {
        nextFieldStates[path] = { ...existing, errors: pathErrors };
        changed = true;
      }
    }
    for (const path of Object.keys(currentFieldStates)) {
      if (!mergedErrors[path] && currentFieldStates[path]?.errors) {
        const { errors: _removed, ...rest } = currentFieldStates[path];
        nextFieldStates[path] = Object.keys(rest).length > 0 ? rest : undefined!;
        if (!nextFieldStates[path]) delete nextFieldStates[path];
        changed = true;
      }
    }
    if (changed) {
      input.setLastChange({
        paths: [],
        sourceScopeId: input.formId,
        kind: 'update',
      });
      input.sharedState.store.batchUpdate({ fieldStates: nextFieldStates });
    }

    for (const [path, fs] of Object.entries(currentFieldStates)) {
      const pathErrors = fs.errors;
      if (!pathErrors) continue;

      if (fieldErrors[path]) {
        continue;
      }

      if (validationErrorsEqual(initialFieldStates[path]?.errors, pathErrors)) {
        continue;
      }

      fieldErrors[path] = pathErrors as ValidationError[];
      errors.push(...(pathErrors as ValidationError[]));
    }

    return {
      ok: errors.length === 0,
      errors,
      fieldErrors,
    } as FormValidationResult;
  }

  async function validateSubtree(path: string, reason?: ValidationReason) {
    const currentValidation = input.getCurrentValidation();

    if (!currentValidation) {
      const targetPaths = collectSubtreeValidationTargets(input.sharedState, path);
      if (targetPaths.length === 0) {
        return {
          ok: true,
          errors: [],
          fieldErrors: {},
        } as FormValidationResult;
      }

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
        fieldErrors,
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
      fieldErrors,
    } as FormValidationResult;
  }

  function refreshCompiledModel(newModel: NonNullable<FormRuntime['validation']>) {
    refreshCompiledModelState({
      sharedState: input.sharedState,
      getCurrentValidation: input.getCurrentValidation,
      setCurrentValidation: input.setCurrentValidation,
      newModel,
      formId: input.formId,
      setLastChange: input.setLastChange,
    });
  }

  function dispose() {
    disposeOwnerState({
      sharedState: input.sharedState,
      formId: input.formId,
      setLastChange: input.setLastChange,
    });
  }

  return {
    computeScopeState,
    revalidateDependents,
    rebuildStoreErrorsFromExternal: (fieldStates: Record<string, FieldState>) =>
      rebuildStoreErrorsFromExternal(input.sharedState, fieldStates),
    clearExternalErrorsForPath: (name: string) =>
      clearExternalErrorsForPath({
        name,
        sharedState: input.sharedState,
        getThisForm: input.getThisForm,
      }),
    applyExternalErrors,
    supersedeLowerPriorityWork,
    applyChangesAndRevalidate,
    validateForm,
    validateSubtree,
    refreshCompiledModel,
    dispose,
  };
}
