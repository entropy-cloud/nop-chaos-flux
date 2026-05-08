import type {
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
} from '@nop-chaos/flux-core';
import {
  getCompiledValidationDependents,
  getCompiledValidationField,
  getCompiledValidationTraversalOrder,
  getCompiledValidationNode,
} from '@nop-chaos/flux-core';
import { createFormStore } from './form-store.js';
import { createAsyncGovernanceStore } from './async-data/async-governance.js';
import { buildFormOwnerRuntime } from './form-runtime-owner.js';
import {
  buildArrayMutationContext,
  computeCanSubmitState,
  createAllTouchedComputer,
} from './form-runtime-derived-state.js';
import { buildInitialFieldState } from './form-runtime-state.js';
import { createInitialFormScopeChange, createFormScopeWithBinding } from './form-runtime-status.js';
import { mergeFieldStateErrors } from './form-runtime-owner-field-states.js';
import {
  cancelAllValidationDebounces,
  cancelValidationDebounce,
  validatePath,
} from './form-runtime-validation.js';
import type {
  CreateManagedFormRuntimeInput,
  ManagedFormRuntimeSharedState,
} from './form-runtime-types.js';
import {
  applyFieldValuePatch,
  notifyFieldHidden,
  registerField,
  updateFieldRegistration,
} from './form-runtime-field-ops.js';
import { executeFormSubmit } from './form-runtime-submit-flow.js';
import { executeSetValues } from './form-runtime-values.js';
import {
  appendValueOp,
  prependValueOp,
  insertValueOp,
  removeValueOp,
  moveValueOp,
  swapValueOp,
  replaceValueOp,
  type ArrayMutationContext,
} from './form-runtime-array-ops.js';
import { createScopeRef, toRecord } from './scope.js';

export function createManagedFormRuntime(inputValue: CreateManagedFormRuntimeInput): FormRuntime {
  const store = inputValue.existingStore ?? createFormStore(inputValue.initialValues ?? {});
  const formId = inputValue.id ?? `${inputValue.parentScope?.id ?? 'scope'}-form`;
  const formName = inputValue.name;
  const validationRuns = new Map<string, number>();
  const pendingValidationDebounces = new Map<
    string,
    {
      timer: ReturnType<typeof setTimeout>;
      resolve: (run: boolean) => void;
      reject: (error: unknown) => void;
    }
  >();
  const runtimeFieldRegistrations = new Map<
    string,
    import('./form-runtime-types.js').RegisteredFieldEntry
  >();
  const pathToRegistrationId = new Map<string, string>();
  const childPathToRegistrationId = new Map<string, string>();
  const validationAsyncGovernance = createAsyncGovernanceStore();
  const initialFieldState = buildInitialFieldState(
    inputValue.initialValues ?? {},
    inputValue.validation,
  );
  const defaultValidationTriggers = inputValue.validation?.behavior.triggers ?? ['blur'];
  const submittingDelay = inputValue.submittingDelay ?? 0;
  let lifecycleHandlers: FormLifecycleHandlers | undefined = inputValue.lifecycle;

  let isSubmittingInternal = false;
  let lastChange: ScopeChange = createInitialFormScopeChange(formId);
  let currentValidation = inputValue.validation;
  let nextChangeRevision = lastChange.revision ?? 0;

  function setLastChange(change: ScopeChange) {
    nextChangeRevision += 1;
    lastChange = {
      ...change,
      revision: change.revision ?? nextChangeRevision,
    };
  }

  const scope =
    inputValue.existingScope ??
    createScopeRef({
      id: formId,
      path: inputValue.scopePath ?? `${inputValue.parentScope?.path ?? '$root'}.form`,
      parent: inputValue.parentScope,
      store: {
        getSnapshot: () => store.getState().values,
        getLastChange: () => lastChange,
        setSnapshot: (next, change) => {
          setLastChange(
            change ?? {
              paths: ['*'],
              sourceScopeId: formId,
              kind: 'replace',
            },
          );
          store.setValues(next);
        },
        subscribe: (listener) => store.subscribe(() => listener(lastChange)),
      },
      update: (path, value) => {
        setLastChange({
          paths: [path || '*'],
          sourceScopeId: formId,
          kind: 'update',
        });
        store.setValue(path, value);
      },
    });

  const runtimeScope =
    inputValue.scopeBinding === 'none'
      ? scope
      : createFormScopeWithBinding({
          scope,
          formId,
          formName,
          getStoreState: () => store.getState(),
          getPendingValidationDebounceCount: () => pendingValidationDebounces.size,
        });

  const sharedState: ManagedFormRuntimeSharedState = {
    inputValue,
    store,
    scope: runtimeScope,
    initialFieldState,
    validationRuns,
    pendingValidationDebounces,
    validationAbortControllers: new Map(),
    validationAsyncGovernance,
    runtimeFieldRegistrations,
    pathToRegistrationId,
    childPathToRegistrationId,
    hiddenFields: new Set(),
    lifecycleState: inputValue.initialLifecycleState ?? 'active',
    modelGeneration: 1,
    modelGenerationListeners: new Set(),
    lifecycleWaiters: new Set(),
    externalErrors: new Map(),
    childContracts: new Map(),
  };

  const formRuntimeRef: { current?: FormRuntime } = {};
  const ownerRuntime = buildFormOwnerRuntime({
    sharedState,
    formId,
    getCurrentValidation: () => currentValidation,
    setCurrentValidation: (validation) => {
      currentValidation = validation;
    },
    getIsSubmitting: () => isSubmittingInternal,
    getThisForm: () => formRuntimeRef.current as FormRuntime,
    setLastChange,
  });
  const computeAllTouched = createAllTouchedComputer({
    store,
    getCurrentValidation: () => currentValidation,
  });

  function buildArrayCtx(): ArrayMutationContext {
    return buildArrayMutationContext({
      sharedState,
      scope,
      store,
      formId,
      setLastChange,
      revalidateDependents: ownerRuntime.revalidateDependents,
    });
  }

  const thisForm: FormRuntime = {
    id: formId,
    name: formName,
    store,
    scope: runtimeScope,

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

    subscribeToModelGeneration(listener) {
      sharedState.modelGenerationListeners.add(listener);
      return () => {
        sharedState.modelGenerationListeners.delete(listener);
      };
    },

    get canSubmit() {
      return computeCanSubmitState({ ownerRuntime: thisForm, sharedState });
    },

    get allTouched() {
      return computeAllTouched();
    },

    getScopeState() {
      return ownerRuntime.computeScopeState();
    },

    getAsyncOwnerDebugSnapshot() {
      return validationAsyncGovernance.getSnapshot();
    },

    getScopeRootErrors() {
      const rootPath = currentValidation?.rootPath ?? '';
      const state = store.getState();
      const rootErrors = state.fieldStates[rootPath]?.errors ?? [];
      return rootErrors.filter(
        (e: import('@nop-chaos/flux-core').ValidationError) => e.sourceKind === 'scope-root',
      );
    },

    isPathOwned(path: string): boolean {
      const rootPath = currentValidation?.rootPath ?? '';
      return path === rootPath || path.startsWith(`${rootPath}.`) || rootPath === '';
    },

    getFieldState(path: string) {
      const state = store.getState();
      const fs = state.fieldStates[path];
      return {
        ownerId: formId,
        path,
        errors: fs?.errors ?? [],
        validating: fs?.validating === true,
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
      return registerField(sharedState, registration);
    },

    updateFieldRegistration(registrationId, patch) {
      updateFieldRegistration(sharedState, registrationId, patch);
    },

    notifyFieldHidden(path, hidden) {
      notifyFieldHidden(sharedState, path, hidden, currentValidation, (p, v) =>
        thisForm.setValue(p, v),
      );
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
      return store.getState().fieldStates[path]?.errors;
    },

    isValidating(path) {
      return store.getState().fieldStates[path]?.validating === true;
    },

    isTouched(path) {
      return store.getState().fieldStates[path]?.touched === true;
    },

    isDirty(path) {
      return store.getState().fieldStates[path]?.dirty === true;
    },

    isVisited(path) {
      return store.getState().fieldStates[path]?.visited === true;
    },

    touchField(path) {
      store.setTouched(path, true);
    },

    visitField(path) {
      store.setVisited(path, true);
    },

    clearErrors(path) {
      if (!path) {
        const currentFieldStates = store.getState().fieldStates;
        const clearedFieldStates: Record<string, import('@nop-chaos/flux-core').FieldState> = {};
        for (const [p, fs] of Object.entries(currentFieldStates)) {
          if (fs.errors) {
            const { errors: _removed, ...rest } = fs;
            if (Object.keys(rest).length > 0) {
              clearedFieldStates[p] = rest;
            }
          } else {
            clearedFieldStates[p] = fs;
          }
        }
        store.batchUpdate({ fieldStates: clearedFieldStates });
        return;
      }

      store.setPathErrors(path);
    },

    async submit(options?: { interactionId?: string; signal?: AbortSignal }) {
      return executeFormSubmit(
        {
          sharedState,
          ownerRuntime,
          defaultValidationTriggers,
          submittingDelay,
          getIsSubmitting: () => isSubmittingInternal,
          setIsSubmitting: (v) => {
            isSubmittingInternal = v;
          },
          getLifecycleHandlers: () => lifecycleHandlers,
          getCurrentValidation: () => currentValidation,
          validateForm: (reason) =>
            thisForm.validateForm(
              reason as import('@nop-chaos/flux-core').ValidationReason | undefined,
            ),
        },
        options,
      );
    },

    reset(values) {
      const nextValues = toRecord(values);
      const nextInitialFieldState = buildInitialFieldState(nextValues, currentValidation);

      initialFieldState.initialValues = nextInitialFieldState.initialValues;
      cancelAllValidationDebounces(sharedState);
      setLastChange({
        paths: ['*'],
        sourceScopeId: formId,
        kind: 'replace',
      });
      store.batchUpdate({
        values: nextValues,
        fieldStates: {},
        submitting: false,
        submitAttempted: false,
      });
    },

    setValue(name, value) {
      if (sharedState.lifecycleState === 'disposed') return;

      validationRuns.set(name, (validationRuns.get(name) ?? 0) + 1);
      cancelValidationDebounce(sharedState, name);

      const state = store.getState();
      const baseline = initialFieldState.initialValues[name];
      const patch = applyFieldValuePatch(
        sharedState,
        state,
        name,
        value,
        !Object.is(baseline, value),
      );

      setLastChange({
        paths: [name || '*'],
        sourceScopeId: formId,
        kind: 'update',
      });

      store.batchUpdate({
        values: patch.nextValues,
        fieldStates: patch.nextFieldStates,
      });

      if (ownerRuntime.clearExternalErrorsForPath(name)) {
        const currentFieldStates = store.getState().fieldStates;
        const nextErrors = ownerRuntime.rebuildStoreErrorsFromExternal(currentFieldStates);

        const updatedFieldStates = mergeFieldStateErrors({ currentFieldStates, nextErrors });
        store.batchUpdate({ fieldStates: updatedFieldStates });
      }

      void ownerRuntime.revalidateDependents(name, 'change');
    },

    setValues(values) {
      executeSetValues(
        {
          sharedState,
          formId,
          setLastChange,
          clearExternalErrorsForPath: ownerRuntime.clearExternalErrorsForPath,
          rebuildStoreErrorsFromExternal: ownerRuntime.rebuildStoreErrorsFromExternal,
          revalidateDependents: ownerRuntime.revalidateDependents,
        },
        values,
      );
    },

    appendValue(path, value) {
      appendValueOp(buildArrayCtx(), path, value);
    },

    prependValue(path, value) {
      prependValueOp(buildArrayCtx(), path, value);
    },

    insertValue(path, index, value) {
      insertValueOp(buildArrayCtx(), path, index, value);
    },

    removeValue(path, index) {
      removeValueOp(buildArrayCtx(), path, index);
    },

    moveValue(path, from, to) {
      moveValueOp(buildArrayCtx(), path, from, to);
    },

    swapValue(path, a, b) {
      swapValueOp(buildArrayCtx(), path, a, b);
    },

    replaceValue(path, value) {
      replaceValueOp(buildArrayCtx(), path, value);
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
    },
  };

  formRuntimeRef.current = thisForm;

  return thisForm;
}
