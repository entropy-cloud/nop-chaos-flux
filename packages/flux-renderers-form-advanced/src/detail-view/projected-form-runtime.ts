import type {
  ApplyExternalErrorsInput,
  CompiledFormValidationModel,
  CompiledValidationNode,
  FieldRegistrationHandle,
  FormStoreCommitDiagnostic,
  FormStoreDiagnosticsOptions,
  FormStoreDiagnosticsSnapshot,
  FormRuntime,
  FormStoreApi,
  FormStoreState,
  RuntimeFieldRegistration,
} from '@nop-chaos/flux-core';
import {
  buildCompiledFormValidationModel,
  createPathBinding,
  getIn,
  projectFieldStates,
} from '@nop-chaos/flux-core';

type ProjectValues = (state: FormStoreState) => FormStoreState['values'];

interface CreateProjectedFormStoreOptions {
  ownerRootPath: string;
  scalarValueAlias?: string;
  projectValues?: ProjectValues;
}

interface CreateProjectedFormRuntimeOptions {
  ownerRootPath?: string;
  scalarValueAlias?: string;
  prefixPath: (path: string) => string;
  store: FormStoreApi;
  mapChildPath?: (path: string) => string;
  supportsArrayMutations?: boolean;
  setValue?: (path: string, value: unknown) => void;
  setValues?: (values: Record<string, unknown>) => void;
}

function isProjectedValidationPath(path: string, ownerRootPath: string): boolean {
  if (!ownerRootPath) {
    return true;
  }

  return path === ownerRootPath || path.startsWith(`${ownerRootPath}.`);
}

function projectValidationModel(
  model: CompiledFormValidationModel | undefined,
  options: Pick<CreateProjectedFormRuntimeOptions, 'ownerRootPath' | 'scalarValueAlias'>,
): CompiledFormValidationModel | undefined {
  const ownerRootPath = options.ownerRootPath;

  if (!model || !ownerRootPath) {
    return model;
  }

  const binding = createPathBinding({
    ownerRootPath,
    scalarValueAlias: options.scalarValueAlias,
  });
  const nodeEntries = Object.entries(model.nodes ?? {}).filter(([path]) =>
    isProjectedValidationPath(path, ownerRootPath),
  );

  if (nodeEntries.length === 0) {
    return undefined;
  }

  const projectedNodes: Record<string, CompiledValidationNode> = {};

  for (const [path, node] of nodeEntries) {
    const relativePath = binding.toRelative(path);
    if (relativePath === undefined) {
      continue;
    }

    projectedNodes[relativePath] = {
      ...node,
      path: relativePath,
      parent: node.parent ? binding.toRelative(node.parent) : undefined,
      children: node.children
        .map((childPath) => binding.toRelative(childPath))
        .filter((childPath): childPath is string => childPath !== undefined),
      rules: node.rules.map((rule) => ({
        ...rule,
        dependencyPaths: rule.dependencyPaths
          .map((dependencyPath) => binding.toRelative(dependencyPath))
          .filter((dependencyPath): dependencyPath is string => dependencyPath !== undefined),
      })),
    };
  }

  const rootPath = binding.toRelative(ownerRootPath) ?? '';
  const projectedModel = buildCompiledFormValidationModel({
    behavior: model.behavior,
    nodes: projectedNodes,
    rootPath,
    defaultHiddenFieldPolicy: model.defaultHiddenFieldPolicy,
  });

  if (!projectedModel) {
    return undefined;
  }

  return {
    ...projectedModel,
    ownerId: model.ownerId,
  };
}

function translateProjectedDiagnosticsSnapshot(
  snapshot: FormStoreDiagnosticsSnapshot,
  binding: ReturnType<typeof createPathBinding>,
): FormStoreDiagnosticsSnapshot {
  if (!snapshot.enabled) {
    return snapshot;
  }

  return {
    ...snapshot,
    recentCommits: snapshot.recentCommits.map((commit): FormStoreCommitDiagnostic => ({
      ...commit,
      changedPaths: commit.changedPaths.map((path) => {
        if (path === '*') {
          return path;
        }

        return binding.toRelative(path) ?? '*';
      }),
    })),
  };
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
    subscribeToPaths(relativePaths, listener) {
      return parentStore.subscribeToPaths(
        relativePaths.map((relativePath) => binding.toAbsolute(relativePath)),
        listener,
      );
    },
    subscribeToSubmitting(listener) {
      return parentStore.subscribeToSubmitting(listener);
    },
    subscribeToModelGeneration(listener) {
      return parentStore.subscribeToModelGeneration?.(listener) ?? (() => undefined);
    },
    getPathState(relativePath) {
      return parentStore.getPathState(binding.toAbsolute(relativePath));
    },
    startDiagnosticsSession(options?: FormStoreDiagnosticsOptions) {
      parentStore.startDiagnosticsSession(options);
    },
    stopDiagnosticsSession() {
      parentStore.stopDiagnosticsSession();
    },
    clearDiagnosticsSession() {
      parentStore.clearDiagnosticsSession();
    },
    getDiagnosticsSnapshot() {
      return translateProjectedDiagnosticsSnapshot(parentStore.getDiagnosticsSnapshot(), binding);
    },
  };
}

export function createProjectedFormRuntime(
  parentForm: FormRuntime,
  options: CreateProjectedFormRuntimeOptions,
): FormRuntime {
  const mapChildPath = options.mapChildPath ?? options.prefixPath;
  let lastParentValidation: CompiledFormValidationModel | undefined;
  let lastProjectedValidation: CompiledFormValidationModel | undefined;

  function getProjectedValidation(): CompiledFormValidationModel | undefined {
    const parentValidation = parentForm.validation;

    if (parentValidation === lastParentValidation) {
      return lastProjectedValidation;
    }

    lastParentValidation = parentValidation;
    lastProjectedValidation = projectValidationModel(parentValidation, options);
    return lastProjectedValidation;
  }

  function mapRegistration(registration: RuntimeFieldRegistration): RuntimeFieldRegistration {
    return {
      ...registration,
      path: options.prefixPath(registration.path),
      childPaths: registration.childPaths?.map((path) => mapChildPath(path)),
    };
  }

  function mapExternalErrors(input: ApplyExternalErrorsInput): ApplyExternalErrorsInput {
    return {
      ...input,
      errors: input.errors.map((error) => ({
        ...error,
        path: options.prefixPath(error.path),
        ownerPath: error.ownerPath ? options.prefixPath(error.ownerPath) : error.ownerPath,
      })),
    };
  }

  const proxy: FormRuntime = {
    ...parentForm,
    get store() {
      return options.store;
    },
    get validation() {
      return getProjectedValidation();
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
      return getProjectedValidation()?.rootPath ?? parentForm.rootPath;
    },
    subscribeToModelGeneration(listener) {
      return parentForm.subscribeToModelGeneration?.(listener) ?? (() => undefined);
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
    validateAt(path, reason, validateOptions) {
      return parentForm.validateAt(options.prefixPath(path), reason, validateOptions);
    },
    validateField(path, reason, validateOptions) {
      return parentForm.validateField(options.prefixPath(path), reason, validateOptions);
    },
    applyChangesAndRevalidate(input) {
      return parentForm.applyChangesAndRevalidate({
        ...input,
        writes: Object.fromEntries(
          Object.entries(input.writes).map(([path, value]) => [options.prefixPath(path), value]),
        ),
        changedPaths: input.changedPaths?.map((path) => options.prefixPath(path)),
      });
    },
    applyExternalErrors(input) {
      return parentForm.applyExternalErrors(mapExternalErrors(input));
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
      if (path === undefined) {
        // P0-5: clearErrors() with no path must only clear the projected subtree, not
        // the whole parent form. Enumerate the projected field states that carry errors
        // and clear each on the parent so sibling fields outside this owner are preserved.
        const storeState =
          typeof options.store.getState === 'function' ? options.store.getState() : undefined;
        const projectedFieldStates = storeState?.fieldStates;
        if (projectedFieldStates && typeof projectedFieldStates === 'object') {
          for (const [relativePath, fieldState] of Object.entries(projectedFieldStates)) {
            if (fieldState && (fieldState as { errors?: unknown }).errors) {
              parentForm.clearErrors(options.prefixPath(relativePath));
            }
          }
        }
        return;
      }
      parentForm.clearErrors(options.prefixPath(path));
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
    updateFieldRegistration(registrationId, patch) {
      parentForm.updateFieldRegistration(registrationId, {
        ...patch,
        childPaths: patch.childPaths?.map((path) => mapChildPath(path)),
      });
    },
    notifyFieldHidden(path, hidden) {
      parentForm.notifyFieldHidden(options.prefixPath(path), hidden);
    },
    validateSubtree(path, reason, validateOptions) {
      return parentForm.validateSubtree(options.prefixPath(path), reason, validateOptions);
    },
    validateAll(reason, validateOptions) {
      return options.ownerRootPath
        ? parentForm.validateSubtree(options.ownerRootPath, reason, validateOptions)
        : parentForm.validateForm(reason, validateOptions);
    },
  };

  if (options.supportsArrayMutations) {
    proxy.appendValue = (path, value) => parentForm.appendValue(options.prefixPath(path), value);
    proxy.prependValue = (path, value) => parentForm.prependValue(options.prefixPath(path), value);
    proxy.insertValue = (path, index, value) =>
      parentForm.insertValue(options.prefixPath(path), index, value);
    proxy.removeValue = (path, index) => parentForm.removeValue(options.prefixPath(path), index);
    proxy.moveValue = (path, from, to) => parentForm.moveValue(options.prefixPath(path), from, to);
    proxy.swapValue = (path, a, b) => parentForm.swapValue(options.prefixPath(path), a, b);
    proxy.replaceValue = (path, value) => parentForm.replaceValue(options.prefixPath(path), value);
  }

  return proxy;
}
