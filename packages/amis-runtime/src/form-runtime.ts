import type { ApiObject, FormValidationResult, FormRuntime, RuntimeFieldRegistration, ValidationError } from '@nop-chaos/amis-schema';
import {
  clampArrayIndex,
  clampInsertIndex,
  getCompiledValidationDependents,
  getCompiledValidationField,
  getCompiledValidationTraversalOrder,
  insertArrayValue,
  moveArrayValue,
  removeArrayValue,
  swapArrayValue
} from '@nop-chaos/amis-schema';
import { createFormStore } from './form-store';
import { remapArrayFieldState, replaceManagedArrayValue } from './form-runtime-array';
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

export function createManagedFormRuntime(inputValue: CreateManagedFormRuntimeInput): FormRuntime {
  const store = createFormStore(inputValue.initialValues ?? {});
  const formId = inputValue.id ?? `${inputValue.parentScope.id}-form`;
  const validationRuns = new Map<string, number>();
  const pendingValidationDebounces = new Map<string, { timer: ReturnType<typeof setTimeout>; resolve: (run: boolean) => void }>();
  const runtimeFieldRegistrations = new Map<string, RuntimeFieldRegistration>();
  const initialFieldState = buildInitialFieldState(inputValue.initialValues ?? {}, inputValue.validation);
  const defaultValidationTriggers = inputValue.validation?.behavior.triggers ?? ['blur'];

  const scope = createScopeRef({
    id: formId,
    path: `${inputValue.parentScope.path}.form`,
    parent: inputValue.parentScope,
    store: {
      getSnapshot: () => store.getState().values,
      setSnapshot: (next) => store.setValues(next),
      subscribe: (listener) => store.subscribe(listener)
    },
    update: (path, value) => store.setValue(path, value)
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

  async function revalidateDependents(path: string) {
    const dependentPaths = getCompiledValidationDependents(inputValue.validation, path);

    for (const dependentPath of dependentPaths) {
      if (dependentPath === path) {
        continue;
      }

      sharedState.validationRuns.set(dependentPath, (sharedState.validationRuns.get(dependentPath) ?? 0) + 1);
      cancelValidationDebounce(sharedState, dependentPath);
      store.setValidating(dependentPath, false);

      const currentDependentValue = scope.get(dependentPath);
      const dependentBaseline = initialFieldState.initialValues[dependentPath];
      store.setDirty(dependentPath, !Object.is(dependentBaseline, currentDependentValue));

      if (
        store.getState().touched[dependentPath] ||
        store.getState().visited[dependentPath] ||
        store.getState().submitting
      ) {
        await thisForm.validateField(dependentPath);
      } else {
        thisForm.clearErrors(dependentPath);
      }
    }
  }

  const thisForm: FormRuntime = {
    id: formId,
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

      const validationPaths = getCompiledValidationTraversalOrder(inputValue.validation);

      for (const path of validationPaths) {
        const result = await thisForm.validateField(path);

        if (!result.ok) {
          fieldErrors[path] = result.errors;
          errors.push(...result.errors);
        }
      }

      for (const [path, registration] of runtimeFieldRegistrations) {
        if (getCompiledValidationField(inputValue.validation, path)) {
          if (registration.validateChild && registration.childPaths?.length) {
            for (const childPath of registration.childPaths) {
              const result = await thisForm.validateField(childPath);

              if (!result.ok) {
                fieldErrors[childPath] = result.errors;
                errors.push(...result.errors);
              }
            }
          }

          continue;
        }

        if (!registration.validate) {
          if (registration.validateChild && registration.childPaths?.length) {
            for (const childPath of registration.childPaths) {
              const result = await thisForm.validateField(childPath);

              if (!result.ok) {
                fieldErrors[childPath] = result.errors;
                errors.push(...result.errors);
              }
            }
          }

          continue;
        }

        const result = await thisForm.validateField(path);

        if (!result.ok) {
          fieldErrors[path] = result.errors;
          errors.push(...result.errors);
        }

        if (registration.validateChild && registration.childPaths?.length) {
          for (const childPath of registration.childPaths) {
            const childResult = await thisForm.validateField(childPath);

            if (!childResult.ok) {
              fieldErrors[childPath] = childResult.errors;
              errors.push(...childResult.errors);
            }
          }
        }
      }

      const mergedErrors = {
        ...store.getState().errors,
        ...fieldErrors
      };

      store.setErrors(mergedErrors);

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
    async submit(api?: ApiObject) {
      if (store.getState().submitting) {
        return {
          ok: false,
          cancelled: true,
          error: new Error('Submit already in progress')
        };
      }

      store.setSubmitting(true);

      const submitTargets = getCompiledValidationTraversalOrder(inputValue.validation);

      for (const path of submitTargets) {
        const behavior = getCompiledValidationField(inputValue.validation, path)?.behavior;
        const triggers = behavior?.triggers ?? defaultValidationTriggers;
        const showErrorOn = behavior?.showErrorOn ?? inputValue.validation?.behavior.showErrorOn ?? ['touched', 'submit'];

        if (triggers.includes('submit') || showErrorOn.includes('submit')) {
          store.setTouched(path, true);
        }
      }

      for (const path of runtimeFieldRegistrations.keys()) {
        store.setTouched(path, true);
      }

      for (const registration of runtimeFieldRegistrations.values()) {
        for (const childPath of registration.childPaths ?? []) {
          store.setTouched(childPath, true);
        }
      }

      const validation = await thisForm.validateForm();

      if (!validation.ok) {
        store.setSubmitting(false);
        return {
          ok: false,
          error: validation.errors,
          data: validation.fieldErrors
        };
      }

      if (!api) {
        store.setSubmitting(false);
        return { ok: true, data: store.getState().values };
      }

      try {
        return await inputValue.submitApi(api, scope);
      } finally {
        store.setSubmitting(false);
      }
    },
    reset(values) {
      const nextValues = toRecord(values);
      const nextInitialFieldState = buildInitialFieldState(nextValues, inputValue.validation);

      initialFieldState.initialValues = nextInitialFieldState.initialValues;
      cancelAllValidationDebounces(sharedState);
      store.setValues(nextValues);
      store.setErrors({});
      for (const path of Object.keys(store.getState().validating)) {
        store.setValidating(path, false);
      }
      for (const path of Object.keys(store.getState().touched)) {
        store.setTouched(path, false);
      }
      for (const path of Object.keys(store.getState().dirty)) {
        store.setDirty(path, false);
      }
      for (const path of Object.keys(store.getState().visited)) {
        store.setVisited(path, false);
      }
    },
    setValue(name, value) {
      const runtimeTarget = findRuntimeRegistration(sharedState.runtimeFieldRegistrations, name);

      if (runtimeTarget.childPath && runtimeTarget.registration) {
        validationRuns.set(name, (validationRuns.get(name) ?? 0) + 1);
        cancelValidationDebounce(sharedState, name);
        store.setValidating(name, false);
        store.setDirty(name, true);
        store.setValue(name, value);
        thisForm.clearErrors(name);
        void revalidateDependents(name);
        return;
      }

      validationRuns.set(name, (validationRuns.get(name) ?? 0) + 1);
      cancelValidationDebounce(sharedState, name);
      store.setValidating(name, false);
      const baseline = initialFieldState.initialValues[name];
      store.setDirty(name, !Object.is(baseline, value));
      store.setValue(name, value);
      thisForm.clearErrors(name);
      void revalidateDependents(name);
    },
    appendValue(path, value) {
      const currentValue = scope.get(path);
      const nextValue = insertArrayValue(Array.isArray(currentValue) ? currentValue : [], Number.MAX_SAFE_INTEGER, value);
      remapArrayFieldState(sharedState, path, (index) => index, (targetPath) => cancelValidationDebounce(sharedState, targetPath));
      replaceManagedArrayValue({
        sharedState,
        arrayPath: path,
        nextValue,
        cancelValidationDebounce: (targetPath) => cancelValidationDebounce(sharedState, targetPath),
        clearErrors: (targetPath) => thisForm.clearErrors(targetPath),
        revalidateDependents
      });
    },
    prependValue(path, value) {
      const currentValue = scope.get(path);
      const nextValue = insertArrayValue(Array.isArray(currentValue) ? currentValue : [], 0, value);
      remapArrayFieldState(sharedState, path, (index) => index + 1, (targetPath) => cancelValidationDebounce(sharedState, targetPath));
      replaceManagedArrayValue({
        sharedState,
        arrayPath: path,
        nextValue,
        cancelValidationDebounce: (targetPath) => cancelValidationDebounce(sharedState, targetPath),
        clearErrors: (targetPath) => thisForm.clearErrors(targetPath),
        revalidateDependents
      });
    },
    insertValue(path, index, value) {
      const currentValue = scope.get(path);
      const safeArray = Array.isArray(currentValue) ? currentValue : [];
      const insertIndex = clampInsertIndex(index, safeArray.length);
      const nextValue = insertArrayValue(safeArray, insertIndex, value);
      remapArrayFieldState(
        sharedState,
        path,
        (candidate) => (candidate >= insertIndex ? candidate + 1 : candidate),
        (targetPath) => cancelValidationDebounce(sharedState, targetPath)
      );
      replaceManagedArrayValue({
        sharedState,
        arrayPath: path,
        nextValue,
        cancelValidationDebounce: (targetPath) => cancelValidationDebounce(sharedState, targetPath),
        clearErrors: (targetPath) => thisForm.clearErrors(targetPath),
        revalidateDependents
      });
    },
    removeValue(path, index) {
      const currentValue = scope.get(path);

      if (!Array.isArray(currentValue) || currentValue.length === 0) {
        return;
      }

      const removeIndex = clampArrayIndex(index, currentValue.length);
      const nextValue = removeArrayValue(currentValue, removeIndex);
      remapArrayFieldState(
        sharedState,
        path,
        (candidate) => {
          if (candidate === removeIndex) {
            return undefined;
          }

          return candidate > removeIndex ? candidate - 1 : candidate;
        },
        (targetPath) => cancelValidationDebounce(sharedState, targetPath)
      );
      replaceManagedArrayValue({
        sharedState,
        arrayPath: path,
        nextValue,
        cancelValidationDebounce: (targetPath) => cancelValidationDebounce(sharedState, targetPath),
        clearErrors: (targetPath) => thisForm.clearErrors(targetPath),
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

      const nextValue = moveArrayValue(currentValue, fromIndex, toIndex);
      remapArrayFieldState(
        sharedState,
        path,
        (candidate) => {
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
        (targetPath) => cancelValidationDebounce(sharedState, targetPath)
      );
      replaceManagedArrayValue({
        sharedState,
        arrayPath: path,
        nextValue,
        cancelValidationDebounce: (targetPath) => cancelValidationDebounce(sharedState, targetPath),
        clearErrors: (targetPath) => thisForm.clearErrors(targetPath),
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

      const nextValue = swapArrayValue(currentValue, first, second);
      remapArrayFieldState(
        sharedState,
        path,
        (candidate) => {
          if (candidate === first) {
            return second;
          }

          if (candidate === second) {
            return first;
          }

          return candidate;
        },
        (targetPath) => cancelValidationDebounce(sharedState, targetPath)
      );
      replaceManagedArrayValue({
        sharedState,
        arrayPath: path,
        nextValue,
        cancelValidationDebounce: (targetPath) => cancelValidationDebounce(sharedState, targetPath),
        clearErrors: (targetPath) => thisForm.clearErrors(targetPath),
        revalidateDependents
      });
    },
    replaceValue(path, value) {
      const nextValue = Array.isArray(value) ? value : [];
      remapArrayFieldState(
        sharedState,
        path,
        (candidate) => (candidate < nextValue.length ? candidate : undefined),
        (targetPath) => cancelValidationDebounce(sharedState, targetPath)
      );
      replaceManagedArrayValue({
        sharedState,
        arrayPath: path,
        nextValue,
        cancelValidationDebounce: (targetPath) => cancelValidationDebounce(sharedState, targetPath),
        clearErrors: (targetPath) => thisForm.clearErrors(targetPath),
        revalidateDependents
      });
    }
  };

  return thisForm;
}
