import type { ApiObject, FormValidationResult, FormRuntime, RuntimeFieldRegistration, ScopeChange, ValidationError } from '@nop-chaos/flux-core';
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
import { collectSubtreeValidationTargets } from './form-runtime-subtree';
import {
  cancelAllValidationDebounces,
  cancelValidationDebounce,
  validatePath,
  validateSubtreeByNode
} from './form-runtime-validation';
import type { CreateManagedFormRuntimeInput, ManagedFormRuntimeSharedState } from './form-runtime-types';
import { createScopeRef, toRecord } from './scope';

function validationErrorsEqual(
  left: ValidationError[] | undefined,
  right: ValidationError[] | undefined
) {
  if (left === right) {
    return true;
  }

  if (!left || !right || left.length !== right.length) {
    return false;
  }

  return left.every((error, index) => {
    const candidate = right[index];

    return candidate?.path === error.path && candidate?.rule === error.rule && candidate?.message === error.message;
  });
}

function buildTouchedStateWithPath(input: Record<string, boolean>, path: string): Record<string, boolean> {
  if (input[path]) {
    return input;
  }

  return {
    ...input,
    [path]: true
  };
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
  const runtimeFieldRegistrations = new Map<string, RuntimeFieldRegistration>();
  const initialFieldState = buildInitialFieldState(inputValue.initialValues ?? {}, inputValue.validation);
  const defaultValidationTriggers = inputValue.validation?.behavior.triggers ?? ['blur'];
  const submittingDelay = inputValue.submittingDelay ?? 0;

  let isSubmittingInternal = false;
  let lastChange: ScopeChange = {
    paths: ['*'],
    sourceScopeId: formId,
    kind: 'replace' as const
  };

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

  const sharedState: ManagedFormRuntimeSharedState = {
    inputValue,
    store,
    scope,
    initialFieldState,
    validationRuns,
    pendingValidationDebounces,
    runtimeFieldRegistrations
  };

  function applyFieldValuePatch(
    state: ReturnType<typeof store.getState>,
    name: string,
    value: unknown,
    forceDirty: boolean
  ) {
    const runtimeTarget = findRuntimeRegistration(sharedState.runtimeFieldRegistrations, name);
    const nextValues = setIn(state.values, name, value);
    const nextValidating = buildBooleanPathState(state.validating, name, false);
    const nextErrors = buildErrorPathState(state.errors, name);

    if (runtimeTarget.childPath && runtimeTarget.registration) {
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
    const dependentPaths = getCompiledValidationDependents(inputValue.validation, path);

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

  const thisForm: FormRuntime = {
    id: formId,
    name: formName,
    store,
    scope,
    validation: inputValue.validation,
    registerField(registration) {
      runtimeFieldRegistrations.set(registration.path, registration);

      return () => {
        if (runtimeFieldRegistrations.get(registration.path) === registration) {
          registration.onRemove?.();
          runtimeFieldRegistrations.delete(registration.path);
        }
      };
    },
    async validateField(path) {
      return validatePath(sharedState, path);
    },
    async validateForm() {
      if (!inputValue.validation && runtimeFieldRegistrations.size === 0) {
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

      const validationPaths = getCompiledValidationTraversalOrder(inputValue.validation);

      for (const path of validationPaths) {
        validatedPaths.add(path);
        const result = await thisForm.validateField(path);

        if (!result.ok) {
          fieldErrors[path] = result.errors;
          errors.push(...result.errors);
        }
      }

      async function validateRegisteredChildren(registration: RuntimeFieldRegistration) {
        if (!registration.validateChild || !registration.childPaths?.length) return;
        for (const childPath of registration.childPaths) {
          validatedPaths.add(childPath);
          const result = await thisForm.validateField(childPath);
          if (!result.ok) {
            fieldErrors[childPath] = result.errors;
            errors.push(...result.errors);
          }
        }
      }

      for (const [path, registration] of runtimeFieldRegistrations) {
        validatedPaths.add(path);

        if (getCompiledValidationField(inputValue.validation, path)) {
          await validateRegisteredChildren(registration);
          continue;
        }

        if (!registration.validate) {
          await validateRegisteredChildren(registration);
          continue;
        }

        const result = await thisForm.validateField(path);

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
    async validateSubtree(path) {
      if (!inputValue.validation) {
        return {
          ok: true,
          errors: [],
          fieldErrors: {}
        } as FormValidationResult;
      }

      const nodeResult = await validateSubtreeByNode(sharedState, path);

      if (nodeResult) {
        return nodeResult;
      }

      const targetPaths = collectSubtreeValidationTargets(sharedState, path);
      const errors: ValidationError[] = [];
      const fieldErrors: Record<string, ValidationError[]> = {};

      for (const targetPath of targetPaths) {
        const result = await validatePath(sharedState, targetPath);

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
    async submit(api?: ApiObject, options?: { interactionId?: string }) {
      if (isSubmittingInternal) {
        return {
          ok: false,
          cancelled: true,
          error: new Error('Submit already in progress')
        };
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

      const submitTargets = getCompiledValidationTraversalOrder(inputValue.validation);
      let nextTouched = store.getState().touched;

      for (const path of submitTargets) {
        const behavior = getCompiledValidationField(inputValue.validation, path)?.behavior;
        const triggers = behavior?.triggers ?? defaultValidationTriggers;
        const showErrorOn = behavior?.showErrorOn ?? inputValue.validation?.behavior.showErrorOn ?? ['touched', 'submit'];

        if (triggers.includes('submit') || showErrorOn.includes('submit')) {
          nextTouched = buildTouchedStateWithPath(nextTouched, path);
        }
      }

      for (const path of runtimeFieldRegistrations.keys()) {
        nextTouched = buildTouchedStateWithPath(nextTouched, path);
      }

      for (const registration of runtimeFieldRegistrations.values()) {
        for (const childPath of registration.childPaths ?? []) {
          nextTouched = buildTouchedStateWithPath(nextTouched, childPath);
        }
      }

      if (nextTouched !== store.getState().touched) {
        store.batchUpdate({ touched: nextTouched });
      }

      const validation = await thisForm.validateForm();

      if (!validation.ok) {
        isSubmittingInternal = false;

        if (submittingTimer !== undefined) {
          clearTimeout(submittingTimer);
          submittingTimer = undefined;
        }

        store.setSubmitting(false);

        return {
          ok: false,
          error: validation.errors,
          data: validation.fieldErrors
        };
      }

      if (!api) {
        isSubmittingInternal = false;

        if (submittingTimer !== undefined) {
          clearTimeout(submittingTimer);
          submittingTimer = undefined;
        }

        store.setSubmitting(false);

        return { ok: true, data: store.getState().values };
      }

      try {
        return await inputValue.submitApi(api, scope, options);
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
      const nextInitialFieldState = buildInitialFieldState(nextValues, inputValue.validation);

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

      void revalidateDependents(name);
    },
    setValues(values) {
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
      return getCompiledValidationField(inputValue.validation, path);
    },
    getDependents(path) {
      return getCompiledValidationDependents(inputValue.validation, path);
    },
    findByPrefix(prefix) {
      const order = getCompiledValidationTraversalOrder(inputValue.validation);
      return order.filter((p) => p === prefix || p.startsWith(`${prefix}.`));
    },
    getChildren(path) {
      const node = getCompiledValidationNode(inputValue.validation, path);
      return node?.children ?? [];
    }
  };

  return thisForm;
}
