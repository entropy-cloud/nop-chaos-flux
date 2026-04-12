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
import { buildFormOwnerRuntime } from './form-runtime-owner';
import { findRuntimeRegistration } from './form-runtime-registration';
import { buildInitialFieldState } from './form-runtime-state';
import { createInitialFormScopeChange, createFormScopeWithBinding } from './form-runtime-status';
import { buildSubmitTouchedState, classifySubmitResult } from './form-runtime-submit';
import {
  cancelAllValidationDebounces,
  cancelValidationDebounce,
  validatePath
} from './form-runtime-validation';
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

  function computeCanSubmit(): boolean {
    const scopeState = ownerRuntime.computeScopeState();
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

  const formRuntimeRef: { current?: FormRuntime } = {};
  const ownerRuntime = buildFormOwnerRuntime({
    sharedState,
    formId,
    getCurrentValidation: () => currentValidation,
    setCurrentValidation: (validation) => {
      currentValidation = validation;
    },
    getIsSubmitting: () => isSubmittingInternal,
    getThisForm: () => formRuntimeRef.current as FormRuntime
  });

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
      return ownerRuntime.computeScopeState();
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
      return ownerRuntime.applyExternalErrors(input);
    },

    async applyChangesAndRevalidate(input: ApplyScopeChangesInput): Promise<FormValidationResult> {
      return ownerRuntime.applyChangesAndRevalidate(input);
    },

    refreshCompiledModel(newModel) {
      ownerRuntime.refreshCompiledModel(newModel);
    },

    dispose() {
      ownerRuntime.dispose();
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
      return ownerRuntime.validateForm(reason);
    },

    async validateSubtree(path, reason?) {
      return ownerRuntime.validateSubtree(path, reason);
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

      ownerRuntime.supersedeLowerPriorityWork();

      const validation = (!currentValidation && runtimeFieldRegistrations.size === 0)
        ? { ok: true, errors: [], fieldErrors: {} } as FormValidationResult
        : await thisForm.validateForm('submit');

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

      if (ownerRuntime.clearExternalErrorsForPath(name)) {
        const nextErrors = ownerRuntime.rebuildStoreErrorsFromExternal(store.getState().errors);
        store.setErrors(nextErrors);
      }

      void ownerRuntime.revalidateDependents(name);
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
        if (ownerRuntime.clearExternalErrorsForPath(changedPath)) {
          externalChanged = true;
        }
      }

      if (externalChanged) {
        const nextStoreErrors = ownerRuntime.rebuildStoreErrorsFromExternal(store.getState().errors);
        store.setErrors(nextStoreErrors);
      }

      for (const changedPath of changedPaths) {
        void ownerRuntime.revalidateDependents(changedPath);
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
        revalidateDependents: ownerRuntime.revalidateDependents
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
        revalidateDependents: ownerRuntime.revalidateDependents
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
        revalidateDependents: ownerRuntime.revalidateDependents
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
        revalidateDependents: ownerRuntime.revalidateDependents
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
        revalidateDependents: ownerRuntime.revalidateDependents
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
        revalidateDependents: ownerRuntime.revalidateDependents
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
        revalidateDependents: ownerRuntime.revalidateDependents
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

  formRuntimeRef.current = thisForm;

  return thisForm;
}
