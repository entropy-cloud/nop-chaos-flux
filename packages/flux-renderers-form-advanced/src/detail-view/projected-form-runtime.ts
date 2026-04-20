import type {
  FieldRegistrationHandle,
  FormRuntime,
  FormStoreApi,
  FormStoreState,
  RuntimeFieldRegistration,
} from '@nop-chaos/flux-core';
import { createPathBinding, getIn, projectFieldStates } from '@nop-chaos/flux-core';

type ProjectValues = (state: FormStoreState) => FormStoreState['values'];

interface CreateProjectedFormStoreOptions {
  ownerRootPath: string;
  scalarValueAlias?: string;
  projectValues?: ProjectValues;
}

interface CreateProjectedFormRuntimeOptions {
  prefixPath: (path: string) => string;
  store: FormStoreApi;
  mapChildPath?: (path: string) => string;
  supportsArrayMutations?: boolean;
  setValue?: (path: string, value: unknown) => void;
  setValues?: (values: Record<string, unknown>) => void;
}

export function createProjectedFormStore(
  parentStore: FormStoreApi,
  options: CreateProjectedFormStoreOptions,
): FormStoreApi {
  const binding = createPathBinding({
    ownerRootPath: options.ownerRootPath,
    scalarValueAlias: options.scalarValueAlias,
  });
  let lastParentState: FormStoreState | undefined;
  let lastProjectedState: FormStoreState | undefined;

  function projectState(state: FormStoreState): FormStoreState {
    if (state === lastParentState && lastProjectedState !== undefined) {
      return lastProjectedState;
    }

    const projected: FormStoreState = {
      ...state,
      values: options.projectValues
        ? options.projectValues(state)
        : ((getIn(state.values, options.ownerRootPath) ?? {}) as Record<string, unknown>),
      fieldStates: projectFieldStates(state.fieldStates, binding),
    };

    lastParentState = state;
    lastProjectedState = projected;
    return projected;
  }

  return {
    ...parentStore,
    getState(): FormStoreState {
      return projectState(parentStore.getState());
    },
    getFieldState(path) {
      return parentStore.getFieldState(binding.toAbsolute(path));
    },
    setFieldState(path, state) {
      parentStore.setFieldState(binding.toAbsolute(path), state);
    },
    subscribe(listener) {
      return parentStore.subscribe(listener);
    },
    subscribeToPath(relativePath, listener) {
      return parentStore.subscribeToPath(binding.toAbsolute(relativePath), listener);
    },
    subscribeToSubmitting(listener) {
      return parentStore.subscribeToSubmitting(listener);
    },
    getPathState(relativePath) {
      return parentStore.getPathState(binding.toAbsolute(relativePath));
    },
  };
}

export function createProjectedFormRuntime(
  parentForm: FormRuntime,
  options: CreateProjectedFormRuntimeOptions,
): FormRuntime {
  const mapChildPath = options.mapChildPath ?? options.prefixPath;

  function mapRegistration(registration: RuntimeFieldRegistration): RuntimeFieldRegistration {
    return {
      ...registration,
      path: options.prefixPath(registration.path),
      childPaths: registration.childPaths?.map((path) => mapChildPath(path)),
    };
  }

  const proxy: FormRuntime = {
    ...parentForm,
    get store() {
      return options.store;
    },
    get validation() {
      return parentForm.validation;
    },
    get lifecycleState() {
      return parentForm.lifecycleState;
    },
    get modelGeneration() {
      return parentForm.modelGeneration;
    },
    get scopeId() {
      return parentForm.scopeId;
    },
    get rootPath() {
      return parentForm.rootPath;
    },
    get canSubmit() {
      return parentForm.canSubmit;
    },
    get allTouched() {
      return parentForm.allTouched;
    },
    isPathOwned(path) {
      return parentForm.isPathOwned(options.prefixPath(path));
    },
    getFieldState(path) {
      return parentForm.getFieldState(options.prefixPath(path));
    },
    validateAt(path, reason) {
      return parentForm.validateAt(options.prefixPath(path), reason);
    },
    validateField(path, reason) {
      return parentForm.validateField(options.prefixPath(path), reason);
    },
    getField(path) {
      return parentForm.getField(options.prefixPath(path));
    },
    getDependents(path) {
      return parentForm.getDependents(options.prefixPath(path));
    },
    findByPrefix(path) {
      return parentForm.findByPrefix(options.prefixPath(path));
    },
    getChildren(path) {
      return parentForm.getChildren(options.prefixPath(path));
    },
    getError(path) {
      return parentForm.getError(options.prefixPath(path));
    },
    isValidating(path) {
      return parentForm.isValidating(options.prefixPath(path));
    },
    isTouched(path) {
      return parentForm.isTouched(options.prefixPath(path));
    },
    isDirty(path) {
      return parentForm.isDirty(options.prefixPath(path));
    },
    isVisited(path) {
      return parentForm.isVisited(options.prefixPath(path));
    },
    touchField(path) {
      parentForm.touchField(options.prefixPath(path));
    },
    visitField(path) {
      parentForm.visitField(options.prefixPath(path));
    },
    clearErrors(path) {
      parentForm.clearErrors(path === undefined ? undefined : options.prefixPath(path));
    },
    setValue(path, value) {
      if (options.setValue) {
        options.setValue(path, value);
        return;
      }

      parentForm.setValue(options.prefixPath(path), value);
    },
    setValues(values) {
      if (options.setValues) {
        options.setValues(values);
        return;
      }

      const prefixed: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(values)) {
        prefixed[options.prefixPath(key)] = value;
      }
      parentForm.setValues(prefixed);
    },
    registerField(registration): FieldRegistrationHandle {
      return parentForm.registerField(mapRegistration(registration));
    },
    notifyFieldHidden(path, hidden) {
      parentForm.notifyFieldHidden(options.prefixPath(path), hidden);
    },
    validateSubtree(path, reason) {
      return parentForm.validateSubtree(options.prefixPath(path), reason);
    },
  };

  if (options.supportsArrayMutations) {
    proxy.appendValue = (path, value) => parentForm.appendValue(options.prefixPath(path), value);
    proxy.prependValue = (path, value) => parentForm.prependValue(options.prefixPath(path), value);
    proxy.insertValue = (path, index, value) => parentForm.insertValue(options.prefixPath(path), index, value);
    proxy.removeValue = (path, index) => parentForm.removeValue(options.prefixPath(path), index);
    proxy.moveValue = (path, from, to) => parentForm.moveValue(options.prefixPath(path), from, to);
    proxy.swapValue = (path, a, b) => parentForm.swapValue(options.prefixPath(path), a, b);
    proxy.replaceValue = (path, value) => parentForm.replaceValue(options.prefixPath(path), value);
  }

  return proxy;
}
