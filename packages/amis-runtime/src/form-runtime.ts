import type {
  ActionResult,
  ApiObject,
  CompiledFormValidationField,
  CompiledFormValidationModel,
  CompiledValidationRule,
  FormValidationResult,
  FormRuntime,
  PageRuntime,
  RuntimeFieldRegistration,
  ScopeRef,
  ValidationError,
  ValidationResult,
  ValidationRule
} from '@nop-chaos/amis-schema';
import { getIn, setIn } from '@nop-chaos/amis-schema';
import {
  clampArrayIndex,
  clampInsertIndex,
  insertArrayValue,
  moveArrayValue,
  remapBooleanState,
  remapErrorState,
  removeArrayValue,
  swapArrayValue,
  transformArrayIndexedPath
} from './form-path-state';
import { createFormStore } from './form-store';
import { normalizeCompiledValidationRules, normalizeRuntimeValidationErrors } from './form-validation-errors';
import { createValidationTraversalOrder } from './schema-compiler';
import { createScopeRef, toRecord } from './scope';

interface CreateManagedFormRuntimeInput {
  id?: string;
  initialValues?: Record<string, any>;
  parentScope: ScopeRef;
  page?: PageRuntime;
  validation?: CompiledFormValidationModel;
  executeValidationRule: (
    compiledRule: CompiledValidationRule,
    rule: Extract<ValidationRule, { kind: 'async' }>,
    field: CompiledFormValidationField,
    scope: ScopeRef
  ) => Promise<ValidationError | undefined>;
  validateRule: (
    compiledRule: CompiledValidationRule,
    value: unknown,
    field: CompiledFormValidationField,
    scope: ScopeRef
  ) => ValidationError | undefined;
  submitApi: (api: ApiObject, scope: ScopeRef) => Promise<ActionResult>;
}

function buildInitialFieldState(values: Record<string, any>, validation?: CompiledFormValidationModel) {
  const initialValues: Record<string, unknown> = {};
  const dirty: Record<string, boolean> = {};

  for (const path of validation?.order ?? []) {
    initialValues[path] = getIn(values, path);
    dirty[path] = false;
  }

  return {
    initialValues,
    dirty
  };
}

export function createManagedFormRuntime(inputValue: CreateManagedFormRuntimeInput): FormRuntime {
  const store = createFormStore(inputValue.initialValues ?? {});
  const formId = inputValue.id ?? `${inputValue.parentScope.id}-form`;
  const validationRuns = new Map<string, number>();
  const pendingValidationDebounces = new Map<string, { timer: ReturnType<typeof setTimeout>; resolve: (run: boolean) => void }>();
  const runtimeFieldRegistrations = new Map<string, RuntimeFieldRegistration>();
  const initialFieldState = buildInitialFieldState(inputValue.initialValues ?? {}, inputValue.validation);
  const defaultValidationTriggers = inputValue.validation?.behavior.triggers ?? ['blur'];

  async function revalidateDependents(path: string) {
    const dependentPaths = inputValue.validation?.dependents?.[path] ?? [];

    for (const dependentPath of dependentPaths) {
      if (dependentPath === path) {
        continue;
      }

      validationRuns.set(dependentPath, (validationRuns.get(dependentPath) ?? 0) + 1);
      cancelValidationDebounce(dependentPath);
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

  function syncRegisteredFieldValue(path: string) {
    const registration = runtimeFieldRegistrations.get(path);

    if (!registration) {
      return undefined;
    }

    const nextValue = registration.syncValue ? registration.syncValue() : registration.getValue();
    const currentValue = scope.get(path);

    if (Object.is(currentValue, nextValue)) {
      return nextValue;
    }

    const baseline = initialFieldState.initialValues[path];
    store.setDirty(path, !Object.is(baseline, nextValue));
    store.setValue(path, nextValue);
    return nextValue;
  }

  function syncRegisteredChildPaths(registration: RuntimeFieldRegistration) {
    const rootValue = registration.syncValue ? registration.syncValue() : registration.getValue();
    let nextValues = store.getState().values;
    let changed = false;

    for (const childPath of registration.childPaths ?? []) {
      const relativePath = childPath.startsWith(`${registration.path}.`)
        ? childPath.slice(registration.path.length + 1)
        : childPath;
      const value = getIn(rootValue, relativePath);

      if (Object.is(getIn(nextValues, childPath), value)) {
        continue;
      }

      nextValues = setIn(nextValues, childPath, value);
      changed = true;
    }

    if (changed) {
      store.setValues(nextValues);
    }
  }

  function findRuntimeRegistration(path: string) {
    const direct = runtimeFieldRegistrations.get(path);

    if (direct) {
      return {
        registration: direct,
        childPath: undefined as string | undefined
      };
    }

    for (const registration of runtimeFieldRegistrations.values()) {
      if (registration.childPaths?.includes(path)) {
        return {
          registration,
          childPath: path
        };
      }
    }

    return {
      registration: undefined,
      childPath: undefined as string | undefined
    };
  }

  function cancelValidationDebounce(path: string) {
    const pending = pendingValidationDebounces.get(path);

    if (!pending) {
      return;
    }

    clearTimeout(pending.timer);
    pending.resolve(false);
    pendingValidationDebounces.delete(path);
  }

  function cancelAllValidationDebounces() {
    for (const path of Array.from(pendingValidationDebounces.keys())) {
      cancelValidationDebounce(path);
    }
  }

  function remapValidationRunState(arrayPath: string, transformIndex: (index: number) => number | undefined) {
    for (const path of Array.from(validationRuns.keys())) {
      const nextPath = transformArrayIndexedPath(path, arrayPath, transformIndex);

      if (!nextPath) {
        validationRuns.delete(path);
        continue;
      }

      if (nextPath !== path) {
        const value = validationRuns.get(path);
        validationRuns.delete(path);

        if (value !== undefined) {
          validationRuns.set(nextPath, value);
        }
      }
    }

    for (const path of Array.from(pendingValidationDebounces.keys())) {
      const nextPath = transformArrayIndexedPath(path, arrayPath, transformIndex);

      if (!nextPath) {
        cancelValidationDebounce(path);
        continue;
      }

      if (nextPath !== path) {
        const pending = pendingValidationDebounces.get(path);

        if (!pending) {
          continue;
        }

        pendingValidationDebounces.delete(path);
        pendingValidationDebounces.set(nextPath, pending);
      }
    }
  }

  function remapInitialFieldState(arrayPath: string, transformIndex: (index: number) => number | undefined) {
    const nextInitialValues: Record<string, unknown> = {};

    for (const [path, value] of Object.entries(initialFieldState.initialValues)) {
      const nextPath = transformArrayIndexedPath(path, arrayPath, transformIndex);

      if (nextPath) {
        nextInitialValues[nextPath] = value;
      }
    }

    initialFieldState.initialValues = nextInitialValues;
    initialFieldState.dirty = remapBooleanState(initialFieldState.dirty, arrayPath, transformIndex);
  }

  function remapArrayFieldState(arrayPath: string, transformIndex: (index: number) => number | undefined) {
    const state = store.getState();
    store.setErrors(remapErrorState(state.errors, arrayPath, transformIndex));
    store.setTouchedState(remapBooleanState(state.touched, arrayPath, transformIndex));
    store.setDirtyState(remapBooleanState(state.dirty, arrayPath, transformIndex));
    store.setVisitedState(remapBooleanState(state.visited, arrayPath, transformIndex));
    store.setValidatingState(remapBooleanState(state.validating, arrayPath, transformIndex));
    remapValidationRunState(arrayPath, transformIndex);
    remapInitialFieldState(arrayPath, transformIndex);
  }

  function replaceManagedArrayValue(arrayPath: string, nextValue: unknown[]) {
    validationRuns.set(arrayPath, (validationRuns.get(arrayPath) ?? 0) + 1);
    cancelValidationDebounce(arrayPath);
    store.setValidating(arrayPath, false);
    const baseline = initialFieldState.initialValues[arrayPath];
    store.setDirty(arrayPath, !Object.is(baseline, nextValue));
    store.setValue(arrayPath, nextValue);
    thisForm.clearErrors(arrayPath);
    void revalidateDependents(arrayPath);
  }

  function collectSubtreePaths(path: string) {
    const paths = new Set<string>();

    for (const candidate of inputValue.validation?.validationOrder ?? inputValue.validation?.order ?? []) {
      if (candidate === path || candidate.startsWith(`${path}.`)) {
        paths.add(candidate);
      }
    }

    for (const [registrationPath, registration] of runtimeFieldRegistrations) {
      if (registrationPath === path || registrationPath.startsWith(`${path}.`) || path.startsWith(`${registrationPath}.`)) {
        paths.add(registrationPath);
      }

      for (const childPath of registration.childPaths ?? []) {
        if (childPath === path || childPath.startsWith(`${path}.`) || path.startsWith(`${childPath}.`)) {
          paths.add(childPath);
        }
      }
    }

    return Array.from(paths);
  }

  function collectSubtreeNodePaths(path: string) {
    const nodes = inputValue.validation?.nodes;

    if (nodes == null || Object.keys(nodes).length === 0) {
      return [] as string[];
    }

    const nodeMap = nodes;

    const traversalOrder =
      inputValue.validation?.validationOrder ?? createValidationTraversalOrder(nodeMap, inputValue.validation?.rootPath);
    const seen = new Set<string>();
    const ordered: string[] = [];

    function enqueue(candidatePath: string) {
      const node = nodeMap[candidatePath];

      if (!node || node.kind === 'form' || seen.has(candidatePath)) {
        return;
      }

      seen.add(candidatePath);
      ordered.push(candidatePath);

      for (const childPath of node.children) {
        enqueue(childPath);
      }
    }

    if (nodeMap[path]) {
      enqueue(path);
    } else {
      for (const candidatePath of traversalOrder) {
        if (candidatePath === path || candidatePath.startsWith(`${path}.`)) {
          enqueue(candidatePath);
        }
      }
    }

    return ordered;
  }

  function collectSubtreeValidationTargets(path: string) {
    const ordered = collectSubtreeNodePaths(path);
    const targets = new Set<string>(ordered);

    for (const candidatePath of collectSubtreePaths(path)) {
      targets.add(candidatePath);
    }

    return Array.from(targets);
  }

  async function validateRuntimeRegistrationRoot(path: string, registration: RuntimeFieldRegistration): Promise<ValidationResult> {
    const runtimeErrors = normalizeRuntimeValidationErrors(await registration.validate?.(), registration, path) ?? [];
    const nextErrors = { ...store.getState().errors };

    if (runtimeErrors.length > 0) {
      nextErrors[path] = runtimeErrors;
    } else {
      delete nextErrors[path];
    }

    store.setErrors(nextErrors);

    return {
      ok: runtimeErrors.length === 0,
      errors: runtimeErrors
    } as ValidationResult;
  }

  async function validateRuntimeRegistrationChild(
    path: string,
    registration: RuntimeFieldRegistration,
    childPath: string
  ): Promise<ValidationResult> {
    const runtimeErrors = normalizeRuntimeValidationErrors(
      await registration.validateChild?.(childPath),
      registration,
      path,
      childPath
    ) ?? [];
    const nextErrors = { ...store.getState().errors };

    if (runtimeErrors.length > 0) {
      nextErrors[path] = runtimeErrors;
    } else {
      delete nextErrors[path];
    }

    store.setErrors(nextErrors);

    return {
      ok: runtimeErrors.length === 0,
      errors: runtimeErrors
    } as ValidationResult;
  }

  async function validateCompiledField(path: string, field: CompiledFormValidationField): Promise<ValidationResult> {
    const runtimeRegistration = runtimeFieldRegistrations.get(path);
    const syncedRuntimeValue = syncRegisteredFieldValue(path);
    const runId = (validationRuns.get(path) ?? 0) + 1;
    validationRuns.set(path, runId);
    const value = syncedRuntimeValue ?? scope.get(path);
    const errors: ValidationError[] = [];
    const hasAsyncRules = field.rules.some((compiledRule) => compiledRule.rule.kind === 'async');

    if (hasAsyncRules) {
      store.setValidating(path, true);
    }

    try {
      for (const compiledRule of field.rules) {
        const rule = compiledRule.rule;

        if (rule.kind === 'async') {
          const shouldRun = await waitForValidationDebounce(path, rule.debounce, runId);

          if (!shouldRun) {
            return { ok: true, errors: [] } as ValidationResult;
          }

          const asyncError = await inputValue.executeValidationRule(compiledRule, rule, field, scope);

          if (asyncError) {
            errors.push(asyncError);
          }

          continue;
        }

        const syncError = inputValue.validateRule(compiledRule, value, field, scope);

        if (syncError) {
          errors.push(syncError);
        }
      }

      if (runtimeRegistration?.validate) {
        const runtimeErrors = normalizeRuntimeValidationErrors(await runtimeRegistration.validate(), runtimeRegistration, path);

        if (runtimeErrors.length > 0) {
          errors.push(...runtimeErrors);
        }
      }

      if (validationRuns.get(path) !== runId) {
        return { ok: true, errors: [] } as ValidationResult;
      }

      const nextErrors = { ...store.getState().errors };

      if (errors.length > 0) {
        nextErrors[path] = errors;
      } else {
        delete nextErrors[path];
      }

      store.setErrors(nextErrors);

      return {
        ok: errors.length === 0,
        errors
      } as ValidationResult;
    } finally {
      if (hasAsyncRules && validationRuns.get(path) === runId) {
        store.setValidating(path, false);
      }
    }
  }

  async function validatePath(path: string): Promise<ValidationResult> {
    const field = inputValue.validation?.fields[path]
      ? {
          ...inputValue.validation.fields[path],
          rules: normalizeCompiledValidationRules(path, inputValue.validation.fields[path].rules)
        }
      : undefined;
    const runtimeTarget = findRuntimeRegistration(path);
    const runtimeRegistration = runtimeTarget.registration;

    if (!field && !runtimeRegistration) {
      return { ok: true, errors: [] } as ValidationResult;
    }

    if (!field && runtimeTarget.childPath && runtimeRegistration?.validateChild) {
      return validateRuntimeRegistrationChild(path, runtimeRegistration, runtimeTarget.childPath);
    }

    if (!field && runtimeRegistration?.validate) {
      return validateRuntimeRegistrationRoot(path, runtimeRegistration);
    }

    if (!field) {
      return { ok: true, errors: [] } as ValidationResult;
    }

    return validateCompiledField(path, field);
  }

  async function validateSubtreeByNode(path: string): Promise<FormValidationResult | undefined> {
    if (!inputValue.validation?.nodes) {
      return undefined;
    }

    const nodeTargets = collectSubtreeNodePaths(path);

    if (nodeTargets.length === 0) {
      return undefined;
    }

    const remainingRuntimeTargets = new Set(collectSubtreePaths(path));
    const errors: ValidationError[] = [];
    const fieldErrors: Record<string, ValidationError[]> = {};

    for (const targetPath of nodeTargets) {
      remainingRuntimeTargets.delete(targetPath);
      const result = await validatePath(targetPath);

      if (!result.ok) {
        fieldErrors[targetPath] = result.errors;
        errors.push(...result.errors);
      }
    }

    for (const targetPath of remainingRuntimeTargets) {
      const result = await validatePath(targetPath);

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

  function waitForValidationDebounce(path: string, debounce: number | undefined, runId: number): Promise<boolean> {
    if (!debounce || debounce <= 0) {
      return Promise.resolve(validationRuns.get(path) === runId);
    }

    cancelValidationDebounce(path);

    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        pendingValidationDebounces.delete(path);
        resolve(validationRuns.get(path) === runId);
      }, debounce);

      pendingValidationDebounces.set(path, { timer, resolve });
    });
  }

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
      return validatePath(path);
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

      for (const path of inputValue.validation?.order ?? []) {
        const result = await this.validateField(path);

        if (!result.ok) {
          fieldErrors[path] = result.errors;
          errors.push(...result.errors);
        }
      }

      for (const [path, registration] of runtimeFieldRegistrations) {
        if (inputValue.validation?.fields[path]) {
          if (registration.validateChild && registration.childPaths?.length) {
            for (const childPath of registration.childPaths) {
              const result = await this.validateField(childPath);

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
              const result = await this.validateField(childPath);

              if (!result.ok) {
                fieldErrors[childPath] = result.errors;
                errors.push(...result.errors);
              }
            }
          }

          continue;
        }

        const result = await this.validateField(path);

        if (!result.ok) {
          fieldErrors[path] = result.errors;
          errors.push(...result.errors);
        }

        if (registration.validateChild && registration.childPaths?.length) {
          for (const childPath of registration.childPaths) {
            const childResult = await this.validateField(childPath);

            if (!childResult.ok) {
              fieldErrors[childPath] = childResult.errors;
              errors.push(...childResult.errors);
            }
          }
        }
      }

      store.setErrors(fieldErrors);

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

      const nodeResult = await validateSubtreeByNode(path);

      if (nodeResult) {
        return nodeResult;
      }

      const targetPaths = collectSubtreeValidationTargets(path);
      const errors: ValidationError[] = [];
      const fieldErrors: Record<string, ValidationError[]> = {};

      for (const targetPath of targetPaths) {
        const result = await validatePath(targetPath);

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

      const nextErrors = { ...store.getState().errors };
      delete nextErrors[path];
      store.setErrors(nextErrors);
    },
    async submit(api?: ApiObject) {
      store.setSubmitting(true);

      for (const path of inputValue.validation?.order ?? []) {
        const triggers = inputValue.validation?.fields[path]?.behavior?.triggers ?? defaultValidationTriggers;

        if (triggers.includes('submit')) {
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

      const validation = await this.validateForm();

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
      cancelAllValidationDebounces();
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
      const runtimeTarget = findRuntimeRegistration(name);

      if (runtimeTarget.childPath && runtimeTarget.registration) {
        validationRuns.set(name, (validationRuns.get(name) ?? 0) + 1);
        cancelValidationDebounce(name);
        store.setValidating(name, false);
        store.setDirty(name, true);
        store.setValue(name, value);
        this.clearErrors(name);
        void revalidateDependents(name);
        return;
      }

      validationRuns.set(name, (validationRuns.get(name) ?? 0) + 1);
      cancelValidationDebounce(name);
      store.setValidating(name, false);
      const baseline = initialFieldState.initialValues[name];
      store.setDirty(name, !Object.is(baseline, value));
      store.setValue(name, value);
      this.clearErrors(name);
      void revalidateDependents(name);
    },
    appendValue(path, value) {
      const currentValue = scope.get(path);
      const nextValue = insertArrayValue(Array.isArray(currentValue) ? currentValue : [], Number.MAX_SAFE_INTEGER, value);
      remapArrayFieldState(path, (index) => index);
      replaceManagedArrayValue(path, nextValue);
    },
    prependValue(path, value) {
      const currentValue = scope.get(path);
      const nextValue = insertArrayValue(Array.isArray(currentValue) ? currentValue : [], 0, value);
      remapArrayFieldState(path, (index) => index + 1);
      replaceManagedArrayValue(path, nextValue);
    },
    insertValue(path, index, value) {
      const currentValue = scope.get(path);
      const safeArray = Array.isArray(currentValue) ? currentValue : [];
      const insertIndex = clampInsertIndex(index, safeArray.length);
      const nextValue = insertArrayValue(safeArray, insertIndex, value);
      remapArrayFieldState(path, (candidate) => (candidate >= insertIndex ? candidate + 1 : candidate));
      replaceManagedArrayValue(path, nextValue);
    },
    removeValue(path, index) {
      const currentValue = scope.get(path);

      if (!Array.isArray(currentValue) || currentValue.length === 0) {
        return;
      }

      const removeIndex = clampArrayIndex(index, currentValue.length);
      const nextValue = removeArrayValue(currentValue, removeIndex);
      remapArrayFieldState(path, (candidate) => {
        if (candidate === removeIndex) {
          return undefined;
        }

        return candidate > removeIndex ? candidate - 1 : candidate;
      });
      replaceManagedArrayValue(path, nextValue);
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
      remapArrayFieldState(path, (candidate) => {
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
      });
      replaceManagedArrayValue(path, nextValue);
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
      remapArrayFieldState(path, (candidate) => {
        if (candidate === first) {
          return second;
        }

        if (candidate === second) {
          return first;
        }

        return candidate;
      });
      replaceManagedArrayValue(path, nextValue);
    },
    replaceValue(path, value) {
      const nextValue = Array.isArray(value) ? value : [];
      remapArrayFieldState(path, (candidate) => (candidate < nextValue.length ? candidate : undefined));
      replaceManagedArrayValue(path, nextValue);
    }
  };

  return thisForm;
}
