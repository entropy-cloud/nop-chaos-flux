import type {
  ApplyExternalErrorsInput,
  ApplyScopeChangesInput,
  FieldState,
  FormRuntime,
  FormValidationResult,
  ScopeChange,
  ScopeValidationStateSnapshot,
  ValidationError,
  ValidationReason
} from '@nop-chaos/flux-core';
import {
  getCompiledValidationDependents,
  getCompiledValidationField,
  getCompiledValidationTraversalOrder,
  setIn,
  validationErrorsEqual
} from '@nop-chaos/flux-core';
import { computeRefreshErrorRetention } from './form-runtime-lifecycle';
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
  setLastChange: (change: ScopeChange) => void;
}) {
  let cachedFieldStatesRef: Record<string, FieldState> | undefined;
  let cachedScopeState: ScopeValidationStateSnapshot | undefined;

  function computeScopeState(): ScopeValidationStateSnapshot {
    const state = input.sharedState.store.getState();
    const fieldStates = state.fieldStates;

    if (cachedScopeState && cachedFieldStatesRef === fieldStates) {
      return cachedScopeState;
    }

    let hasErrors = false;
    let isValidating = false;

    for (const fs of Object.values(fieldStates)) {
      if (fs.errors && fs.errors.length > 0) hasErrors = true;
      if (fs.validating) isValidating = true;
      if (hasErrors && isValidating) break;
    }

    const valid = !hasErrors;
    cachedFieldStatesRef = fieldStates;
    cachedScopeState = {
      valid,
      hasErrors,
      validating: isValidating,
      lifecycleState: input.sharedState.lifecycleState,
      ready: valid && !isValidating,
      modelGeneration: input.sharedState.modelGeneration
    };
    return cachedScopeState;
  }

  async function revalidateDependents(path: string, reason: ValidationReason = 'system') {
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

      const fieldStates = input.sharedState.store.getState().fieldStates;
      const existingFieldState = fieldStates[dependentPath];

      const nextFieldState: FieldState = { ...existingFieldState };
      delete nextFieldState.validating;
      if (isDirty) {
        nextFieldState.dirty = true;
      } else {
        delete nextFieldState.dirty;
      }

      const nextFieldStates = Object.keys(nextFieldState).length > 0
        ? { ...fieldStates, [dependentPath]: nextFieldState }
        : (() => { const next = { ...fieldStates }; delete next[dependentPath]; return next; })();

      input.setLastChange({
        paths: [],
        sourceScopeId: input.formId,
        kind: 'update'
      });
      input.sharedState.store.batchUpdate({ fieldStates: nextFieldStates });

      const currentFieldState = input.sharedState.store.getState().fieldStates[dependentPath];
      if (
        currentFieldState?.touched
        || currentFieldState?.visited
        || input.getIsSubmitting()
      ) {
        await input.getThisForm().validateField(dependentPath, reason);
      } else {
        await input.getThisForm().validateField(dependentPath, 'system');
      }
    }
  }

  function rebuildStoreErrorsFromExternal(
    fieldStates: Record<string, FieldState>
  ): Record<string, ValidationError[]> {
    const next: Record<string, ValidationError[]> = {};

    for (const [path, fs] of Object.entries(fieldStates)) {
      const pathErrors = fs.errors;
      if (pathErrors) {
        const nonExternal = pathErrors.filter((error) => error.sourceKind !== 'external');
        if (nonExternal.length > 0) {
          next[path] = nonExternal;
        }
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

    const fieldStates = input.sharedState.store.getState().fieldStates;
    const nextErrors = rebuildStoreErrorsFromExternal(fieldStates);

    const nextFieldStates = { ...fieldStates };
    for (const path of Object.keys(nextFieldStates)) {
      const existingFs = nextFieldStates[path];
      if (existingFs?.errors && !nextErrors[path]) {
        const { errors: _removed, ...rest } = existingFs;
        nextFieldStates[path] = Object.keys(rest).length > 0 ? rest : undefined!;
        if (!nextFieldStates[path]) delete nextFieldStates[path];
      }
    }
    for (const [path, pathErrors] of Object.entries(nextErrors)) {
      nextFieldStates[path] = { ...nextFieldStates[path], errors: pathErrors };
    }
    input.setLastChange({
      paths: [],
      sourceScopeId: input.formId,
      kind: 'update'
    });
    input.sharedState.store.batchUpdate({ fieldStates: nextFieldStates });

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
    const invalidPaths = Array.from(new Set([
      ...Object.keys(writes).filter((path) => !input.getThisForm().isPathOwned(path)),
      ...changedPaths.filter((path) => !input.getThisForm().isPathOwned(path))
    ]));

    if (invalidPaths.length > 0) {
      const errors = invalidPaths.map((path) => ({
        path,
        ownerPath: path,
        rule: 'required' as const,
        message: `Path "${path}" is not owned by form "${input.formId}".`,
        sourceKind: 'form' as const
      }));

      const fieldErrors = Object.fromEntries(errors.map((error) => [error.path, [error]]));
      return { ok: false, errors, fieldErrors };
    }

    const state = input.sharedState.store.getState();
    let nextValues = state.values;

    for (const [path, value] of Object.entries(writes)) {
      nextValues = setIn(nextValues, path, value);
      input.sharedState.validationRuns.set(path, (input.sharedState.validationRuns.get(path) ?? 0) + 1);
      cancelValidationDebounce(input.sharedState, path);
    }

    input.setLastChange({
      paths: changedPaths.length > 0 ? changedPaths : ['*'],
      sourceScopeId: input.formId,
      kind: 'update'
    });
    input.sharedState.store.batchUpdate({ values: nextValues });

    for (const path of changedPaths) {
      await revalidateDependents(path, reason);
    }

    if (reason === 'change') {
      const fieldStates = input.sharedState.store.getState().fieldStates;
      const fieldErrors: Record<string, ValidationError[]> = {};
      const errors: ValidationError[] = [];

      for (const [path, fs] of Object.entries(fieldStates)) {
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
        fieldErrors: {}
      } as FormValidationResult;
    }

    const fieldErrors: Record<string, ValidationError[]> = {};
    const errors: ValidationError[] = [];
    const initialFieldStates = input.sharedState.store.getState().fieldStates;
    const validatedPaths = new Set<string>();

    const validationPaths = getCompiledValidationTraversalOrder(currentValidation);

    const pathResults = await Promise.all(
      validationPaths.map(async (path) => {
        validatedPaths.add(path);
        return { path, result: await input.getThisForm().validateField(path, reason) };
      })
    );

    for (const { path, result } of pathResults) {
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
      ...fieldErrors
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
        kind: 'update'
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
      const currentFieldStates = input.sharedState.store.getState().fieldStates;
      const currentErrors: Record<string, ValidationError[]> = {};
      for (const [path, fs] of Object.entries(currentFieldStates)) {
        if (fs.errors && fs.errors.length > 0) {
          currentErrors[path] = fs.errors;
        }
      }
      const retainedErrors = computeRefreshErrorRetention(oldModel, newModel, currentErrors);

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
      input.setLastChange({
        paths: [],
        sourceScopeId: input.formId,
        kind: 'update'
      });
      input.sharedState.store.batchUpdate({ fieldStates: nextFieldStates });
    } else {
      const currentFieldStates = input.sharedState.store.getState().fieldStates;
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
      input.setLastChange({
        paths: [],
        sourceScopeId: input.formId,
        kind: 'update'
      });
      input.sharedState.store.batchUpdate({ fieldStates: nextFieldStates });
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
    input.setLastChange({
      paths: [],
      sourceScopeId: input.formId,
      kind: 'update'
    });
    input.sharedState.store.batchUpdate({ fieldStates: {} });
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
