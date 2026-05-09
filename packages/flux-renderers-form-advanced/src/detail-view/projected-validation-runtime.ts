import type {
  CompiledFormValidationModel,
  FieldRegistrationHandle,
  RuntimeFieldRegistration,
  ScopeRef,
  ScopeStore,
  ValidationStoreApi,
  ValidationScopeRuntime,
} from '@nop-chaos/flux-core';
import { buildCompiledFormValidationModel, createPathBinding, getIn } from '@nop-chaos/flux-core';

type LiveValidationScopeRuntime = ValidationScopeRuntime & {
  store: ValidationStoreApi;
  scope: ScopeRef;
};

function assertLiveValidationScopeRuntime(
  owner: ValidationScopeRuntime,
): asserts owner is LiveValidationScopeRuntime {
  if (!owner.store || !owner.scope) {
    throw new Error('Projected validation runtime requires a live validation owner with store and scope');
  }
}

interface CreateProjectedValidationRuntimeOptions {
  ownerRootPath?: string;
  scalarValueAlias?: string;
  prefixPath: (path: string) => string;
  mapChildPath?: (path: string) => string;
}

function isProjectedValidationPath(path: string, ownerRootPath: string): boolean {
  if (!ownerRootPath) {
    return true;
  }

  return path === ownerRootPath || path.startsWith(`${ownerRootPath}.`);
}

function projectValidationModel(
  model: CompiledFormValidationModel | undefined,
  options: Pick<CreateProjectedValidationRuntimeOptions, 'ownerRootPath' | 'scalarValueAlias'>,
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

  const projectedNodes: NonNullable<CompiledFormValidationModel['nodes']> = {};

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

function createProjectedValidationStore(
  parentOwner: LiveValidationScopeRuntime,
  options: Pick<CreateProjectedValidationRuntimeOptions, 'ownerRootPath' | 'scalarValueAlias'>,
) {
  const binding = createPathBinding({
    ownerRootPath: options.ownerRootPath ?? '',
    scalarValueAlias: options.scalarValueAlias,
  });
  let lastParentState: ReturnType<ValidationStoreApi['getState']> | undefined;
  let lastProjectedState: ReturnType<ValidationStoreApi['getState']> | undefined;

  function projectState(state: ReturnType<ValidationStoreApi['getState']>) {
    if (state === lastParentState && lastProjectedState !== undefined) {
      return lastProjectedState;
    }

    const projected = {
      ...state,
      values: options.ownerRootPath
        ? ((getIn(state.values, options.ownerRootPath) ?? {}) as Record<string, unknown>)
        : state.values,
      fieldStates: Object.fromEntries(
        Object.entries(state.fieldStates).flatMap(([path, fieldState]) => {
          const relativePath = binding.toRelative(path);
          return relativePath === undefined ? [] : [[relativePath, fieldState]];
        }),
      ),
    };

    lastParentState = state;
    lastProjectedState = projected;
    return projected;
  }

  return {
    getState() {
      return projectState(parentOwner.store.getState());
    },
    subscribe(listener: () => void) {
      return parentOwner.store.subscribe(listener);
    },
    subscribeToPath(path: string, listener: () => void) {
      return parentOwner.store.subscribeToPath(binding.toAbsolute(path), listener);
    },
    subscribeToPaths(paths: readonly string[], listener: () => void) {
      return parentOwner.store.subscribeToPaths(paths.map((path) => binding.toAbsolute(path)), listener);
    },
    subscribeToSubmitting(listener: () => void) {
      return parentOwner.store.subscribeToSubmitting(listener);
    },
    subscribeToModelGeneration(listener: () => void) {
      return parentOwner.store.subscribeToModelGeneration?.(listener) ?? (() => undefined);
    },
    getPathState(path: string) {
      return parentOwner.store.getPathState(binding.toAbsolute(path));
    },
    getFieldState(path: string) {
      return parentOwner.store.getFieldState(binding.toAbsolute(path));
    },
  };
}

function createProjectedValidationScope(
  parentScope: ScopeRef,
  options: Pick<CreateProjectedValidationRuntimeOptions, 'ownerRootPath' | 'scalarValueAlias'>,
  projectedStore: ValidationStoreApi,
): ScopeRef {
  const binding = createPathBinding({
    ownerRootPath: options.ownerRootPath ?? '',
    scalarValueAlias: options.scalarValueAlias,
  });
  const store: ScopeStore<Record<string, any>> = {
    getSnapshot() {
      return projectedStore.getState().values as Record<string, any>;
    },
    getLastChange() {
      return parentScope.store?.getLastChange();
    },
    setSnapshot(next, change) {
      parentScope.store?.setSnapshot(next, change);
    },
    subscribe(listener) {
      return parentScope.store?.subscribe(listener) ?? (() => undefined);
    },
  };

  return {
    id: parentScope.id,
    path: options.ownerRootPath ? binding.toRelative(options.ownerRootPath) ?? parentScope.path : parentScope.path,
    parent: parentScope.parent,
    store,
    get value() {
      return projectedStore.getState().values as Record<string, any>;
    },
    get(path: string) {
      return parentScope.get(binding.toAbsolute(path));
    },
    has(path: string) {
      return parentScope.has(binding.toAbsolute(path));
    },
    readOwn() {
      return projectedStore.getState().values as Record<string, any>;
    },
    readVisible() {
      return projectedStore.getState().values as Record<string, any>;
    },
    materializeVisible() {
      return projectedStore.getState().values as Record<string, any>;
    },
    update(path: string, value: unknown) {
      parentScope.update(binding.toAbsolute(path), value);
    },
    merge(data: Record<string, unknown>) {
      for (const [key, value] of Object.entries(data)) {
        parentScope.update(binding.toAbsolute(key), value);
      }
    },
  };
}

export function createProjectedValidationRuntime(
  parentOwner: ValidationScopeRuntime,
  options: CreateProjectedValidationRuntimeOptions,
): LiveValidationScopeRuntime {
  assertLiveValidationScopeRuntime(parentOwner);
  const mapChildPath = options.mapChildPath ?? options.prefixPath;
  const projectedStore = createProjectedValidationStore(parentOwner, options);
  const projectedScope = createProjectedValidationScope(parentOwner.scope, options, projectedStore);
  let lastParentValidation: CompiledFormValidationModel | undefined;
  let lastProjectedValidation: CompiledFormValidationModel | undefined;

  function getProjectedValidation(): CompiledFormValidationModel | undefined {
    const parentValidation = parentOwner.validation;

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

  const proxy: LiveValidationScopeRuntime = {
    get scopeId() {
      return parentOwner.scopeId;
    },
    get rootPath() {
      return getProjectedValidation()?.rootPath ?? parentOwner.rootPath;
    },
    get lifecycleState() {
      return parentOwner.lifecycleState;
    },
    get modelGeneration() {
      return parentOwner.modelGeneration;
    },
    subscribeToModelGeneration(listener) {
      return parentOwner.subscribeToModelGeneration?.(listener) ?? (() => undefined);
    },
    get store() {
      return projectedStore;
    },
    get scope() {
      return projectedScope;
    },
    get validation() {
      return getProjectedValidation();
    },
    validateAt(path, reason) {
      return parentOwner.validateAt(options.prefixPath(path), reason);
    },
    validateSubtree(path, reason) {
      return parentOwner.validateSubtree(options.prefixPath(path), reason);
    },
    validateAll(reason) {
      return parentOwner.validateAll(reason);
    },
    applyChangesAndRevalidate(input) {
      return parentOwner.applyChangesAndRevalidate({
        ...input,
        writes: Object.fromEntries(
          Object.entries(input.writes).map(([path, value]) => [options.prefixPath(path), value]),
        ),
        changedPaths: input.changedPaths?.map((path) => options.prefixPath(path)),
      });
    },
    applyExternalErrors(input) {
      return parentOwner.applyExternalErrors({
        ...input,
        errors: input.errors.map((error) => ({
          ...error,
          path: options.prefixPath(error.path),
          ownerPath: error.ownerPath ? options.prefixPath(error.ownerPath) : undefined,
        })),
      });
    },
    getFieldState(path) {
      return parentOwner.getFieldState(options.prefixPath(path));
    },
    getScopeState() {
      return parentOwner.getScopeState();
    },
    getAsyncOwnerDebugSnapshot: parentOwner.getAsyncOwnerDebugSnapshot?.bind(parentOwner),
    getScopeRootErrors() {
      return parentOwner.getScopeRootErrors();
    },
    isPathOwned(path) {
      return parentOwner.isPathOwned(options.prefixPath(path));
    },
    registerField(registration): FieldRegistrationHandle {
      return parentOwner.registerField(mapRegistration(registration));
    },
    updateFieldRegistration(registrationId, patch) {
      parentOwner.updateFieldRegistration(registrationId, {
        ...patch,
        childPaths: patch.childPaths?.map((path) => mapChildPath(path)),
      });
    },
    notifyFieldHidden(path, hidden) {
      parentOwner.notifyFieldHidden(options.prefixPath(path), hidden);
    },
    touchField(path) {
      parentOwner.touchField?.(options.prefixPath(path));
    },
    visitField(path) {
      parentOwner.visitField?.(options.prefixPath(path));
    },
    refreshCompiledModel(newModel) {
      parentOwner.refreshCompiledModel(newModel);
    },
    dispose() {
      parentOwner.dispose();
    },
    registerChildContract(contract) {
      parentOwner.registerChildContract(contract);
    },
    unregisterChildContract(childOwnerId) {
      parentOwner.unregisterChildContract(childOwnerId);
    },
  };

  return proxy;
}
