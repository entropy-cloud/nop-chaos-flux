import type {
  CompiledFormValidationModel,
  FieldRegistrationHandle,
  RuntimeFieldRegistration,
  ValidationScopeRuntime,
} from '@nop-chaos/flux-core';
import { buildCompiledFormValidationModel, createPathBinding } from '@nop-chaos/flux-core';

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

export function createProjectedValidationRuntime(
  parentOwner: ValidationScopeRuntime,
  options: CreateProjectedValidationRuntimeOptions,
): ValidationScopeRuntime {
  const mapChildPath = options.mapChildPath ?? options.prefixPath;
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

  const proxy: ValidationScopeRuntime = {
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
    get store() {
      return parentOwner.store;
    },
    get scope() {
      return parentOwner.scope;
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
