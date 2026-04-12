import type {
  ApiSchema,
  ApplyExternalErrorsInput,
  ApplyScopeChangesInput,
  ChildValidationContractRegistration,
  FieldRegistrationHandle,
  FormLifecycleHandlers,
  FormRuntime,
  FormValidationResult,
  RuntimeFieldRegistration,
  ScopeChange,
  ScopeValidationStateSnapshot,
  ValidationError
} from '@nop-chaos/flux-core';
import {
  clampArrayIndex,
  clampInsertIndex,
  getCompiledValidationDependents,
  getCompiledValidationField,
  getCompiledValidationTraversalOrder,
  getCompiledValidationNode,
  insertArrayValue,
  moveArrayValue,
  removeArrayValue,
  setIn,
  swapArrayValue
} from '@nop-chaos/flux-core';
import { createFormStore } from './form-store';
import { executeArrayMutation } from './form-runtime-array';
import { findRuntimeRegistration } from './form-runtime-registration';
import { buildInitialFieldState } from './form-runtime-state';
import { createInitialFormScopeChange, createFormScopeWithBinding, validationErrorsEqual } from './form-runtime-status';
import { collectSubtreeValidationTargets } from './form-runtime-subtree';
import { buildSubmitTouchedState, classifySubmitResult } from './form-runtime-submit';
import {
  cancelAllValidationDebounces,
  cancelValidationDebounce,
  validatePath,
  validateSubtreeByNode
} from './form-runtime-validation';
import { computeRefreshErrorRetention } from './form-runtime-lifecycle';
import type { CreateManagedFormRuntimeInput, ManagedFormRuntimeSharedState } from './form-runtime-types';
import { createScopeRef, toRecord } from './scope';

let _registrationIdCounter = 0;

function nextRegistrationId(): string {
  return `reg-${++_registrationIdCounter}`;
}

function buildBooleanPathState(input: Record<string, boolean>, path: string, nextValue: boolean): Record<string, boolean> {
  if (nextValue) {
    if (input[path]) {
      return input;
    }

    return {
      ...input,
      [path]: true
    };
  }

  if (!input[path]) {
    return input;
  }

  const next = { ...input };
  delete next[path];
  return next;
}

function buildErrorPathState(input: Record<string, ValidationError[]>, path: string): Record<string, ValidationError[]> {
  if (!input[path]) {
    return input;
  }

  const next = { ...input };
  delete next[path];
  return next;
}

export function createManagedFormRuntime(inputValue: CreateManagedFormRuntimeInput): FormRuntime {
  const store = createFormStore(inputValue.initialValues ?? {});
  const formId = inputValue.id ?? `${inputValue.parentScope.id}-form`;
  const formName = inputValue.name;
  const validationRuns = new Map<string, number>();
  const pendingValidationDebounces = new Map<string, {
    timer: ReturnType<typeof setTimeout>;
    resolve: (run: boolean) => void;
    reject: (error: unknown) => void;
  }>();
  const runtimeFieldRegistrations = new Map<string, import('./form-runtime-types').RegisteredFieldEntry>();
  const pathToRegistrationId = new Map<string, string>();
  const initialFieldState = buildInitialFieldState(inputValue.initialValues ?? {}, inputValue.validation);
  const defaultValidationTriggers = inputValue.validation?.behavior.triggers ?? ['blur'];
  const submittingDelay = inputValue.submittingDelay ?? 0;
  let lifecycleHandlers: FormLifecycleHandlers | undefined = inputValue.lifecycle;

  let isSubmittingInternal = false;
  let lastChange: ScopeChange = createInitialFormScopeChange(formId);
  let currentValidation = inputValue.validation;

  function setLastChange(change: ScopeChange) {
    lastChange = change;
  }

  const scope = createScopeRef({
    id: formId,
    path: `${inputValue.parentScope.path}.form`,
    parent: inputValue.parentScope,
    store: {
      getSnapshot: () => store.getState().values,
      getLastChange: () => lastChange,
      setSnapshot: (next, change) => {
        setLastChange(change ?? {
          paths: ['*'],
          sourceScopeId: formId,
          kind: 'replace'
        });
        store.setValues(next);
      },
      subscribe: (listener) => store.subscribe(() => listener(lastChange))
    },
    update: (path, value) => {
      setLastChange({
        paths: [path || '*'],
        sourceScopeId: formId,
        kind: 'update'
      });
      store.setValue(path, value);
    }
  });

  const formScopeWithBinding = createFormScopeWithBinding({
    scope,
    formId,
    formName,
    getStoreState: () => store.getState()
  });

  const sharedState: ManagedFormRuntimeSharedState = {
    inputValue,
    store,
    scope: formScopeWithBinding,
    initialFieldState,
    validationRuns,
    pendingValidationDebounces,
    runtimeFieldRegistrations,
    pathToRegistrationId,
    hiddenFields: new Set(),
    lifecycleState: 'active',
    modelGeneration: 1,
    externalErrors: new Map(),
    childContracts: new Map()
  };

  function computeScopeState(): ScopeValidationStateSnapshot {
    const state = store.getState();
    const hasErrors = Object.keys(state.errors).length > 0;
    const isValidating = Object.values(state.validating).some(Boolean);
    const valid = !hasErrors;
    return {
      valid,
      hasErrors,
      validating: isValidating,
      lifecycleState: sharedState.lifecycleState,
      ready: valid && !isValidating,
      modelGeneration: sharedState.modelGeneration
    };
  }

  function computeCanSubmit(): boolean {
    const scopeState = computeScopeState();
    if (!scopeState.valid || scopeState.validating) {
      return false;
    }

    for (const contract of sharedState.childContracts.values()) {
      if (contract.mode === 'summary-gate' && contract.active) {
        return false;
      }
    }

    return true;
  }

  function computeAllTouched(): boolean {
    const state = store.getState();
    const order = getCompiledValidationTraversalOrder(currentValidation);
    if (order.length === 0) {
      return true;
    }
    return order.every((path) => state.touched[path]);
  }

  function applyFieldValuePatch(
    state: ReturnType<typeof store.getState>,
    name: string,
    value: unknown,
    forceDirty: boolean
  ) {
    const runtimeTarget = findRuntimeRegistration(sharedState, name);
    const nextValues = setIn(state.values, name, value);
    const nextValidating = buildBooleanPathState(state.validating, name, false);
    const nextErrors = buildErrorPathState(state.errors, name);

    if (runtimeTarget.childPath && runtimeTarget.entry) {
      return {
        nextValues,
        nextValidating,
        nextErrors,
        nextDirty: buildBooleanPathState(state.dirty, name, true)
      };
    }

    return {
      nextValues,
      nextValidating,
      nextErrors,
      nextDirty: buildBooleanPathState(state.dirty, name, forceDirty)
    };
  }

  async function revalidateDependents(path: string) {
    const dependentPaths = getCompiledValidationDependents(currentValidation, path);

    for (const dependentPath of dependentPaths) {
      if (dependentPath === path) {
        continue;
      }

      sharedState.validationRuns.set(dependentPath, (sharedState.validationRuns.get(dependentPath) ?? 0) + 1);
      cancelValidationDebounce(sharedState, dependentPath);

      const currentDependentValue = scope.get(dependentPath);
      const dependentBaseline = initialFieldState.initialValues[dependentPath];
      const isDirty = !Object.is(dependentBaseline, currentDependentValue);

      const state = store.getState();
      const nextValidating = { ...state.validating };
      delete nextValidating[dependentPath];

      const nextDirty = isDirty
        ? { ...state.dirty, [dependentPath]: true }
        : (() => { const d = { ...state.dirty }; delete d[dependentPath]; return d; })();

      store.batchUpdate({ validating: nextValidating, dirty: nextDirty });

      if (
        store.getState().touched[dependentPath] ||
        store.getState().visited[dependentPath] ||
        isSubmittingInternal
      ) {
        await thisForm.validateField(dependentPath);
      } else {
        thisForm.clearErrors(dependentPath);
      }
    }
  }

  function rebuildStoreErrorsFromExternal(
    baseErrors: Record<string, ValidationError[]>
  ): Record<string, ValidationError[]> {
    const next: Record<string, ValidationError[]> = {};

    for (const [path, pathErrors] of Object.entries(baseErrors)) {
      const nonExternal = pathErrors.filter((e) => e.sourceKind !== 'external');
      if (nonExternal.length > 0) {
        next[path] = nonExternal;
      }
    }

    for (const entry of sharedState.externalErrors.values()) {
      for (const err of entry.errors) {
        const externalErr: ValidationError = { ...err, sourceKind: 'external' };
        const existing = next[err.path];
        next[err.path] = existing ? [...existing, externalErr] : [externalErr];
      }
    }

    return next;
  }

  function clearExternalErrorsForPath(name: string): boolean {
    let changed = false;

    for (const [sourceId, entry] of sharedState.externalErrors) {
      const filtered = entry.errors.filter(
        (e) => e.path !== name && !e.path.startsWith(`${name}.`)
      );

      if (filtered.length !== entry.errors.length) {
        changed = true;
        if (filtered.length === 0) {
          sharedState.externalErrors.delete(sourceId);
        } else {
          sharedState.externalErrors.set(sourceId, { sourceId, errors: filtered });
        }
      }
    }

    return changed;
  }

  function applyExternalErrors(input: ApplyExternalErrorsInput): ScopeValidationStateSnapshot {
    const { sourceId, errors, replace } = input;
    const existing = sharedState.externalErrors.get(sourceId);

    if (replace || !existing) {
      sharedState.externalErrors.set(sourceId, { sourceId, errors });
    } else {
      sharedState.externalErrors.set(sourceId, { sourceId, errors: [...existing.errors, ...errors] });
    }

    const nextErrors = rebuildStoreErrorsFromExternal(store.getState().errors);
    store.setErrors(nextErrors);
    return computeScopeState();
  }

  function supersedeLowerPriorityWork(): void {
    const allPaths = Array.from(sharedState.validationRuns.keys());
    for (const path of allPaths) {
      sharedState.validationRuns.set(path, (sharedState.validationRuns.get(path) ?? 0) + 1);
      cancelValidationDebounce(sharedState, path);
    }
  }

  const thisForm: FormRuntime = {
    id: formId,
    name: formName,
    store,
    scope: formScopeWithBinding,

    get validation() {
      return currentValidation;
    },

    get lifecycleState() {
      return sharedState.lifecycleState;
    },

    get modelGeneration() {
      return sharedState.modelGeneration;
    },

    get scopeId() {
      return formId;
    },

    get rootPath() {
      return currentValidation?.rootPath ?? '';
    },

    get canSubmit() {
      return computeCanSubmit();
    },

    get allTouched() {
      return computeAllTouched();
    },

    getScopeState() {
      return computeScopeState();
    },

    getScopeRootErrors() {
      const rootPath = currentValidation?.rootPath ?? '';
      const state = store.getState();
      const rootErrors = state.errors[rootPath] ?? [];
      return rootErrors.filter((e) => e.sourceKind === 'scope-root');
    },

    isPathOwned(path: string): boolean {
      const rootPath = currentValidation?.rootPath ?? '';
      return path === rootPath || path.startsWith(`${rootPath}.`) || rootPath === '';
    },

    getFieldState(path: string) {
      const state = store.getState();
      return {
        ownerId: formId,
        path,
        errors: state.errors[path] ?? [],
        validating: state.validating[path] === true
      };
    },

    applyExternalErrors(input: ApplyExternalErrorsInput): ScopeValidationStateSnapshot {
      return applyExternalErrors(input);
    },

    async applyChangesAndRevalidate(input: ApplyScopeChangesInput): Promise<FormValidationResult> {
      if (sharedState.lifecycleState === 'disposed') {
        return { ok: true, errors: [], fieldErrors: {} };
      }

      const { writes, changedPaths, reason } = input;
      const state = store.getState();
      let nextValues = state.values;

      for (const [path, value] of Object.entries(writes)) {
        nextValues = setIn(nextValues, path, value);
        validationRuns.set(path, (validationRuns.get(path) ?? 0) + 1);
        cancelValidationDebounce(sharedState, path);
      }

      store.batchUpdate({ values: nextValues });

      for (const path of changedPaths) {
        await revalidateDependents(path);
      }

      return thisForm.validateForm(reason);
    },

    refreshCompiledModel(newModel) {
      if (sharedState.lifecycleState === 'disposed') {
        return;
      }

      sharedState.lifecycleState = 'refreshing';
      sharedState.modelGeneration += 1;

      const oldModel = currentValidation;
      currentValidation = newModel;
      sharedState.inputValue = { ...sharedState.inputValue, validation: newModel };

      cancelAllValidationDebounces(sharedState);
      sharedState.validationRuns.clear();

      const staleRegistrations = Array.from(sharedState.runtimeFieldRegistrations.entries());
      for (const [regId, entry] of staleRegistrations) {
        sharedState.runtimeFieldRegistrations.delete(regId);
        sharedState.pathToRegistrationId.delete(entry.registration.path);
      }

      if (oldModel) {
        const currentErrors = store.getState().errors;
        const retainedErrors = computeRefreshErrorRetention(oldModel, newModel, currentErrors);
        store.setErrors(retainedErrors);
      } else {
        store.setErrors({});
      }

      sharedState.lifecycleState = 'active';
    },

    dispose() {
      if (sharedState.lifecycleState === 'disposed') {
        return;
      }

      sharedState.lifecycleState = 'disposed';
      cancelAllValidationDebounces(sharedState);
      sharedState.validationRuns.clear();
      sharedState.runtimeFieldRegistrations.clear();
      sharedState.pathToRegistrationId.clear();
      sharedState.childContracts.clear();
      sharedState.externalErrors.clear();
      store.batchUpdate({ errors: {}, validating: {}, touched: {}, dirty: {}, visited: {} });
    },

    registerChildContract(contract: ChildValidationContractRegistration): void {
      sharedState.childContracts.set(contract.childOwnerId, contract);
    },

    unregisterChildContract(childOwnerId: string): void {
      sharedState.childContracts.delete(childOwnerId);
    },

    validateAt(path, reason) {
      return thisForm.validateField(path, reason);
    },

    validateAll(reason) {
      return thisForm.validateForm(reason);
    },

    setLifecycleHandlers(handlers) {
      lifecycleHandlers = handlers;
    },

    registerField(registration: RuntimeFieldRegistration): FieldRegistrationHandle {
      if (sharedState.lifecycleState === 'disposed') {
        return {
          accepted: false,
          registrationId: '',
          unregister() {}
        };
      }

      const existingId = pathToRegistrationId.get(registration.path);
      if (existingId && runtimeFieldRegistrations.has(existingId)) {
        return {
          accepted: false,
          registrationId: '',
          unregister() {}
        };
      }

      const registrationId = nextRegistrationId();
      const capturedGeneration = sharedState.modelGeneration;

      runtimeFieldRegistrations.set(registrationId, {
        registrationId,
        registration,
        modelGeneration: capturedGeneration
      });
      pathToRegistrationId.set(registration.path, registrationId);

      return {
        accepted: true,
        registrationId,
        unregister() {
          const entry = runtimeFieldRegistrations.get(registrationId);
          if (!entry) return;
          if (entry.modelGeneration !== capturedGeneration) return;

          entry.registration.onRemove?.();
          runtimeFieldRegistrations.delete(registrationId);

          if (pathToRegistrationId.get(registration.path) === registrationId) {
            pathToRegistrationId.delete(registration.path);
          }
        }
      };
    },

    updateFieldRegistration(registrationId, patch) {
      const entry = runtimeFieldRegistrations.get(registrationId);
      if (!entry) return;

      if (entry.modelGeneration !== sharedState.modelGeneration) return;

      runtimeFieldRegistrations.set(registrationId, {
        ...entry,
        registration: { ...entry.registration, ...patch }
      });
    },

    notifyFieldHidden(path, hidden) {
      const wasHidden = sharedState.hiddenFields.has(path);

      if (hidden === wasHidden) {
        return;
      }

      if (hidden) {
        sharedState.hiddenFields.add(path);
        const field = getCompiledValidationField(currentValidation, path);

        if (field?.hiddenFieldPolicy.clearValueWhenHidden) {
          thisForm.setValue(path, undefined);
        }
      } else {
        sharedState.hiddenFields.delete(path);
      }
    },

    async validateField(path, reason?) {
      return validatePath(sharedState, path, reason);
    },

    async validateForm(reason?) {
      if (!currentValidation && runtimeFieldRegistrations.size === 0) {
        return {
          ok: true,
          errors: [],
          fieldErrors: {}
        } as FormValidationResult;
      }

      const fieldErrors: Record<string, ValidationError[]> = {};
      const errors: ValidationError[] = [];
      const initialErrors = store.getState().errors;
      const validatedPaths = new Set<string>();

      const validationPaths = getCompiledValidationTraversalOrder(currentValidation);

      for (const path of validationPaths) {
        validatedPaths.add(path);
        const result = await thisForm.validateField(path, reason);

        if (!result.ok) {
          fieldErrors[path] = result.errors;
          errors.push(...result.errors);
        }
      }

      async function validateRegisteredChildren(registration: RuntimeFieldRegistration) {
        if (!registration.validateChild || !registration.childPaths?.length) return;
        for (const childPath of registration.childPaths) {
          validatedPaths.add(childPath);
          const result = await thisForm.validateField(childPath, reason);
          if (!result.ok) {
            fieldErrors[childPath] = result.errors;
            errors.push(...result.errors);
          }
        }
      }

      for (const entry of runtimeFieldRegistrations.values()) {
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

        const result = await thisForm.validateField(path, reason);

        if (!result.ok) {
          fieldErrors[path] = result.errors;
          errors.push(...result.errors);
        }

        await validateRegisteredChildren(registration);
      }

      const currentErrors = store.getState().errors;
      const preservedErrors: Record<string, ValidationError[]> = {};

      for (const [path, pathErrors] of Object.entries(currentErrors)) {
        if (!validatedPaths.has(path)) {
          preservedErrors[path] = pathErrors;
          continue;
        }

        if (fieldErrors[path]) {
          preservedErrors[path] = fieldErrors[path];
        }
      }

      const mergedErrors = {
        ...preservedErrors,
        ...fieldErrors
      };

      if (mergedErrors !== currentErrors) {
        store.setErrors(mergedErrors);
      }

      for (const [path, pathErrors] of Object.entries(mergedErrors)) {
        if (fieldErrors[path]) {
          continue;
        }

        if (validationErrorsEqual(initialErrors[path], pathErrors)) {
          continue;
        }

        fieldErrors[path] = pathErrors;
        errors.push(...pathErrors);
      }

      return {
        ok: errors.length === 0,
        errors,
        fieldErrors
      } as FormValidationResult;
    },

    async validateSubtree(path, reason?) {
      if (!currentValidation) {
        return {
          ok: true,
          errors: [],
          fieldErrors: {}
        } as FormValidationResult;
      }

      const nodeResult = await validateSubtreeByNode(sharedState, path, reason);

      if (nodeResult) {
        return nodeResult;
      }

      const targetPaths = collectSubtreeValidationTargets(sharedState, path);
      const errors: ValidationError[] = [];
      const fieldErrors: Record<string, ValidationError[]> = {};

      for (const targetPath of targetPaths) {
        const result = await validatePath(sharedState, targetPath, reason);

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
    },

    getError(path) {
      return store.getState().errors[path];
    },

    isValidating(path) {
      return store.getState().validating[path] === true;
    },

    isTouched(path) {
      return store.getState().touched[path] === true;
    },

    isDirty(path) {
      return store.getState().dirty[path] === true;
    },

    isVisited(path) {
      return store.getState().visited[path] === true;
    },

    touchField(path) {
      store.setTouched(path, true);
    },

    visitField(path) {
      store.setVisited(path, true);
    },

    clearErrors(path) {
      if (!path) {
        store.setErrors({});
        return;
      }

      store.setPathErrors(path);
    },

    async submit(api?: ApiSchema, options?: { interactionId?: string }) {
      if (isSubmittingInternal) {
        return {
          ok: false,
          cancelled: true,
          error: new Error('Submit already in progress')
        };
      }

      if (sharedState.lifecycleState === 'disposed') {
        return { ok: false, cancelled: true, error: new Error('Form is disposed') };
      }

      isSubmittingInternal = true;

      let submittingTimer: ReturnType<typeof setTimeout> | undefined;

      if (submittingDelay > 0) {
        submittingTimer = setTimeout(() => {
          submittingTimer = undefined;

          if (isSubmittingInternal) {
            store.setSubmitting(true);
          }
        }, submittingDelay);
      } else {
        store.setSubmitting(true);
      }

      const nextTouched = buildSubmitTouchedState({
        touched: store.getState().touched,
        validation: currentValidation,
        runtimeFieldRegistrations: Array.from(runtimeFieldRegistrations.values()).map((e) => e.registration),
        defaultValidationTriggers
      });

      if (nextTouched !== store.getState().touched) {
        store.batchUpdate({ touched: nextTouched });
      }

      supersedeLowerPriorityWork();

      const validation = await thisForm.validateForm('submit');

      if (!validation.ok) {
        const validationFailure = {
          ok: false,
          error: validation.errors,
          data: validation.fieldErrors
        } as const;

        const lifecycleResult = lifecycleHandlers?.onValidateError
          ? await lifecycleHandlers.onValidateError(validationFailure, options)
          : undefined;

        isSubmittingInternal = false;

        if (submittingTimer !== undefined) {
          clearTimeout(submittingTimer);
          submittingTimer = undefined;
        }

        store.setSubmitting(false);

        return lifecycleResult ?? validationFailure;
      }

      for (const contract of sharedState.childContracts.values()) {
        if (contract.mode === 'recurse-submit' && contract.active) {
          contract.unregister();
        }
      }

      const submitLifecycleAction = lifecycleHandlers?.submitAction;
      const executeSubmit = submitLifecycleAction
        ? () => submitLifecycleAction(options)
        : api
          ? () => inputValue.submitApi(api, scope, options)
          : () => Promise.resolve({ ok: true, data: store.getState().values });

      try {
        const result = await executeSubmit();
        const resultClass = classifySubmitResult(result);

        if (resultClass === 'success') {
          return lifecycleHandlers?.onSubmitSuccess
            ? await lifecycleHandlers.onSubmitSuccess(result, options)
            : result;
        }

        if (resultClass === 'failure') {
          return lifecycleHandlers?.onSubmitError
            ? await lifecycleHandlers.onSubmitError(result, options)
            : result;
        }

        return result;
      } finally {
        isSubmittingInternal = false;

        if (submittingTimer !== undefined) {
          clearTimeout(submittingTimer);
          submittingTimer = undefined;
        }

        store.setSubmitting(false);
      }
    },

    reset(values) {
      const nextValues = toRecord(values);
      const nextInitialFieldState = buildInitialFieldState(nextValues, currentValidation);

      initialFieldState.initialValues = nextInitialFieldState.initialValues;
      cancelAllValidationDebounces(sharedState);
      store.batchUpdate({
        values: nextValues,
        errors: {},
        validating: {},
        touched: {},
        dirty: {},
        visited: {}
      });
    },

    setValue(name, value) {
      if (sharedState.lifecycleState === 'disposed') return;

      validationRuns.set(name, (validationRuns.get(name) ?? 0) + 1);
      cancelValidationDebounce(sharedState, name);

      const state = store.getState();
      const baseline = initialFieldState.initialValues[name];
      const patch = applyFieldValuePatch(state, name, value, !Object.is(baseline, value));

      store.batchUpdate({
        validating: patch.nextValidating,
        dirty: patch.nextDirty,
        values: patch.nextValues,
        errors: patch.nextErrors
      });

      if (clearExternalErrorsForPath(name)) {
        const nextErrors = rebuildStoreErrorsFromExternal(store.getState().errors);
        store.setErrors(nextErrors);
      }

      void revalidateDependents(name);
    },

    setValues(values) {
      if (sharedState.lifecycleState === 'disposed') return;

      const entries = Object.entries(values);

      if (entries.length === 0) {
        return;
      }

      const state = store.getState();
      let nextValues = state.values;
      let nextDirty = state.dirty;
      let nextErrors = state.errors;
      let nextValidating = state.validating;
      const changedPaths: string[] = [];

      for (const [name, value] of entries) {
        validationRuns.set(name, (validationRuns.get(name) ?? 0) + 1);
        cancelValidationDebounce(sharedState, name);

        const baseline = initialFieldState.initialValues[name];
        const patch = applyFieldValuePatch(
          {
            ...state,
            values: nextValues,
            dirty: nextDirty,
            errors: nextErrors,
            validating: nextValidating
          },
          name,
          value,
          !Object.is(baseline, value)
        );

        nextValues = patch.nextValues;
        nextDirty = patch.nextDirty;
        nextErrors = patch.nextErrors;
        nextValidating = patch.nextValidating;

        changedPaths.push(name);
      }

      store.batchUpdate({
        values: nextValues,
        dirty: nextDirty,
        errors: nextErrors,
        validating: nextValidating
      });

      let externalChanged = false;
      for (const changedPath of changedPaths) {
        if (clearExternalErrorsForPath(changedPath)) {
          externalChanged = true;
        }
      }

      if (externalChanged) {
        const nextStoreErrors = rebuildStoreErrorsFromExternal(store.getState().errors);
        store.setErrors(nextStoreErrors);
      }

      for (const changedPath of changedPaths) {
        void revalidateDependents(changedPath);
      }
    },

    appendValue(path, value) {
      executeArrayMutation({
        sharedState,
        scope,
        arrayPath: path,
        arrayOperation: (current) => insertArrayValue(current, Number.MAX_SAFE_INTEGER, value),
        indexTransform: (index) => index,
        cancelValidationDebounce: (targetPath) => cancelValidationDebounce(sharedState, targetPath),
        revalidateDependents
      });
    },

    prependValue(path, value) {
      executeArrayMutation({
        sharedState,
        scope,
        arrayPath: path,
        arrayOperation: (current) => insertArrayValue(current, 0, value),
        indexTransform: (index) => index + 1,
        cancelValidationDebounce: (targetPath) => cancelValidationDebounce(sharedState, targetPath),
        revalidateDependents
      });
    },

    insertValue(path, index, value) {
      const currentValue = scope.get(path);
      const safeArray = Array.isArray(currentValue) ? currentValue : [];
      const insertIndex = clampInsertIndex(index, safeArray.length);
      executeArrayMutation({
        sharedState,
        scope,
        arrayPath: path,
        arrayOperation: () => insertArrayValue(safeArray, insertIndex, value),
        indexTransform: (candidate) => (candidate >= insertIndex ? candidate + 1 : candidate),
        cancelValidationDebounce: (targetPath) => cancelValidationDebounce(sharedState, targetPath),
        revalidateDependents
      });
    },

    removeValue(path, index) {
      const currentValue = scope.get(path);

      if (!Array.isArray(currentValue) || currentValue.length === 0) {
        return;
      }

      const removeIndex = clampArrayIndex(index, currentValue.length);
      executeArrayMutation({
        sharedState,
        scope,
        arrayPath: path,
        arrayOperation: () => removeArrayValue(currentValue, removeIndex),
        indexTransform: (candidate) => {
          if (candidate === removeIndex) {
            return undefined;
          }

          return candidate > removeIndex ? candidate - 1 : candidate;
        },
        cancelValidationDebounce: (targetPath) => cancelValidationDebounce(sharedState, targetPath),
        revalidateDependents
      });
    },

    moveValue(path, from, to) {
      const currentValue = scope.get(path);

      if (!Array.isArray(currentValue) || currentValue.length <= 1) {
        return;
      }

      const fromIndex = clampArrayIndex(from, currentValue.length);
      const toIndex = clampArrayIndex(to, currentValue.length);

      if (fromIndex === toIndex) {
        return;
      }

      executeArrayMutation({
        sharedState,
        scope,
        arrayPath: path,
        arrayOperation: () => moveArrayValue(currentValue, fromIndex, toIndex),
        indexTransform: (candidate) => {
          if (candidate === fromIndex) {
            return toIndex;
          }

          if (fromIndex < toIndex && candidate > fromIndex && candidate <= toIndex) {
            return candidate - 1;
          }

          if (fromIndex > toIndex && candidate >= toIndex && candidate < fromIndex) {
            return candidate + 1;
          }

          return candidate;
        },
        cancelValidationDebounce: (targetPath) => cancelValidationDebounce(sharedState, targetPath),
        revalidateDependents
      });
    },

    swapValue(path, a, b) {
      const currentValue = scope.get(path);

      if (!Array.isArray(currentValue) || currentValue.length <= 1) {
        return;
      }

      const first = clampArrayIndex(a, currentValue.length);
      const second = clampArrayIndex(b, currentValue.length);

      if (first === second) {
        return;
      }

      executeArrayMutation({
        sharedState,
        scope,
        arrayPath: path,
        arrayOperation: () => swapArrayValue(currentValue, first, second),
        indexTransform: (candidate) => {
          if (candidate === first) {
            return second;
          }

          if (candidate === second) {
            return first;
          }

          return candidate;
        },
        cancelValidationDebounce: (targetPath) => cancelValidationDebounce(sharedState, targetPath),
        revalidateDependents
      });
    },

    replaceValue(path, value) {
      const nextValue = Array.isArray(value) ? value : [];
      executeArrayMutation({
        sharedState,
        scope,
        arrayPath: path,
        arrayOperation: () => nextValue,
        indexTransform: (candidate) => (candidate < nextValue.length ? candidate : undefined),
        cancelValidationDebounce: (targetPath) => cancelValidationDebounce(sharedState, targetPath),
        revalidateDependents
      });
    },

    getField(path) {
      return getCompiledValidationField(currentValidation, path);
    },

    getDependents(path) {
      return getCompiledValidationDependents(currentValidation, path);
    },

    findByPrefix(prefix) {
      const order = getCompiledValidationTraversalOrder(currentValidation);
      return order.filter((p) => p === prefix || p.startsWith(`${prefix}.`));
    },

    getChildren(path) {
      const node = getCompiledValidationNode(currentValidation, path);
      return node?.children ?? [];
    }
  };

  return thisForm;
}
