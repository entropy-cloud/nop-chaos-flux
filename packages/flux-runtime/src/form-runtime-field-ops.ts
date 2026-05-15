import type {
  CompiledFormValidationModel,
  FieldRegistrationHandle,
  FieldState,
  RuntimeFieldRegistration,
} from '@nop-chaos/flux-core';
import { getCompiledValidationField, setIn } from '@nop-chaos/flux-core';
import { findRuntimeRegistration } from './form-runtime-registration.js';
import type { ManagedFormRuntimeSharedState } from './form-runtime-types.js';

export interface FieldValuePatchResult {
  nextValues: Record<string, unknown>;
  nextFieldStates: Record<string, FieldState>;
}

function updateFieldStateInMap(
  fieldStates: Record<string, FieldState>,
  path: string,
  patch: Partial<FieldState>,
): Record<string, FieldState> {
  const existing = fieldStates[path];
  const merged: FieldState = { ...existing };

  if ('touched' in patch) {
    if (patch.touched === true) merged.touched = true;
    else delete merged.touched;
  }

  if ('dirty' in patch) {
    if (patch.dirty === true) merged.dirty = true;
    else delete merged.dirty;
  }

  if ('visited' in patch) {
    if (patch.visited === true) merged.visited = true;
    else delete merged.visited;
  }

  if ('validating' in patch) {
    if (patch.validating === true) merged.validating = true;
    else delete merged.validating;
  }

  if ('errors' in patch) {
    if (patch.errors && patch.errors.length > 0) merged.errors = patch.errors;
    else delete merged.errors;
  }

  const hasKeys = Object.keys(merged).length > 0;

  if (!hasKeys) {
    if (!(path in fieldStates)) {
      return fieldStates;
    }
    const { [path]: _removed, ...rest } = fieldStates;
    return rest;
  }

  if (
    existing &&
    existing.touched === merged.touched &&
    existing.dirty === merged.dirty &&
    existing.visited === merged.visited &&
    existing.validating === merged.validating &&
    existing.errors === merged.errors
  ) {
    return fieldStates;
  }

  return { ...fieldStates, [path]: merged };
}

export function applyFieldValuePatch(
  sharedState: ManagedFormRuntimeSharedState,
  state: { values: Record<string, unknown>; fieldStates: Record<string, FieldState> },
  name: string,
  value: unknown,
  forceDirty: boolean,
): FieldValuePatchResult {
  const runtimeTarget = findRuntimeRegistration(sharedState, name);
  const nextValues = setIn(state.values, name, value);

  let nextFieldStates = updateFieldStateInMap(state.fieldStates, name, {
    validating: undefined,
    errors: undefined,
  });

  const shouldDirty = runtimeTarget.childPath && runtimeTarget.entry ? true : forceDirty;
  nextFieldStates = updateFieldStateInMap(nextFieldStates, name, {
    dirty: shouldDirty ? true : undefined,
  });

  return { nextValues, nextFieldStates };
}

let _registrationIdCounter = 0;

export function nextRegistrationId(): string {
  return `reg-${++_registrationIdCounter}`;
}

function isOwnedRegistrationPath(
  sharedState: ManagedFormRuntimeSharedState,
  path: string,
): boolean {
  const rootPath = sharedState.inputValue.validation?.rootPath ?? '';

  return rootPath === '' || path === rootPath || path.startsWith(`${rootPath}.`);
}

function isRegistrationContained(
  sharedState: ManagedFormRuntimeSharedState,
  registration: Pick<RuntimeFieldRegistration, 'path' | 'childPaths'>,
): boolean {
  if (!isOwnedRegistrationPath(sharedState, registration.path)) {
    return false;
  }

  return !registration.childPaths?.some(
    (childPath) => !isOwnedRegistrationPath(sharedState, childPath),
  );
}

export function registerField(
  sharedState: ManagedFormRuntimeSharedState,
  registration: RuntimeFieldRegistration,
): FieldRegistrationHandle {
  const { runtimeFieldRegistrations, pathToRegistrationId, childPathToRegistrationId } =
    sharedState;

  if (sharedState.lifecycleState === 'disposed') {
    return {
      accepted: false,
      registrationId: '',
      unregister() {},
    };
  }

  if (!isRegistrationContained(sharedState, registration)) {
    return {
      accepted: false,
      registrationId: '',
      unregister() {},
    };
  }

  const existingId = pathToRegistrationId.get(registration.path);
  if (existingId && runtimeFieldRegistrations.has(existingId)) {
    return {
      accepted: false,
      registrationId: '',
      unregister() {},
    };
  }

  const registrationId = nextRegistrationId();
  const capturedGeneration = sharedState.modelGeneration;

  runtimeFieldRegistrations.set(registrationId, {
    registrationId,
    registration,
    modelGeneration: capturedGeneration,
  });
  pathToRegistrationId.set(registration.path, registrationId);

  if (registration.childPaths) {
    for (const childPath of registration.childPaths) {
      childPathToRegistrationId.set(childPath, registrationId);
    }
  }

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

      if (entry.registration.childPaths) {
        for (const childPath of entry.registration.childPaths) {
          if (childPathToRegistrationId.get(childPath) === registrationId) {
            childPathToRegistrationId.delete(childPath);
          }
        }
      }
    },
  };
}

export function updateFieldRegistration(
  sharedState: ManagedFormRuntimeSharedState,
  registrationId: string,
  patch: Partial<RuntimeFieldRegistration>,
): void {
  const { runtimeFieldRegistrations, childPathToRegistrationId } = sharedState;
  const entry = runtimeFieldRegistrations.get(registrationId);
  if (!entry) return;

  if (entry.modelGeneration !== sharedState.modelGeneration) return;

  if (patch.path !== undefined && patch.path !== entry.registration.path) {
    return;
  }

  if (
    patch.childPaths !== undefined &&
    !isRegistrationContained(sharedState, {
      path: entry.registration.path,
      childPaths: patch.childPaths,
    })
  ) {
    return;
  }

  if (patch.childPaths !== undefined) {
    const oldChildPaths = entry.registration.childPaths;
    if (oldChildPaths) {
      for (const childPath of oldChildPaths) {
        if (childPathToRegistrationId.get(childPath) === registrationId) {
          childPathToRegistrationId.delete(childPath);
        }
      }
    }
    for (const childPath of patch.childPaths) {
      childPathToRegistrationId.set(childPath, registrationId);
    }
  }

  runtimeFieldRegistrations.set(registrationId, {
    ...entry,
    registration: { ...entry.registration, ...patch },
  });
}

function isHiddenPath(sharedState: ManagedFormRuntimeSharedState, path: string): boolean {
  for (const hiddenPath of sharedState.hiddenFields) {
    if (path === hiddenPath || path.startsWith(`${hiddenPath}.`)) {
      return true;
    }
  }

  return false;
}

function clearHiddenSubtreeFieldStates(
  sharedState: ManagedFormRuntimeSharedState,
  path: string,
  currentValidation: CompiledFormValidationModel | undefined,
) {
  const fieldStates = sharedState.store.getState().fieldStates;
  let changed = false;
  const nextFieldStates: Record<string, FieldState> = { ...fieldStates };

  for (const [fieldPath, existingFieldState] of Object.entries(fieldStates)) {
    if (fieldPath !== path && !fieldPath.startsWith(`${path}.`)) {
      continue;
    }

    const field = getCompiledValidationField(currentValidation, fieldPath);
    if (field?.hiddenFieldPolicy.validateWhenHidden) {
      continue;
    }

    if (!existingFieldState?.errors && !existingFieldState?.validating) {
      continue;
    }

    changed = true;
    const nextFieldState: FieldState = { ...existingFieldState };
    delete nextFieldState.errors;
    delete nextFieldState.validating;

    if (Object.keys(nextFieldState).length > 0) {
      nextFieldStates[fieldPath] = nextFieldState;
    } else {
      delete nextFieldStates[fieldPath];
    }
  }

  if (changed) {
    sharedState.store.batchUpdate({ fieldStates: nextFieldStates });
  }
}

function invalidateHiddenSubtreeValidation(
  sharedState: ManagedFormRuntimeSharedState,
  path: string,
) {
  const affectedPaths = new Set<string>([path]);

  for (const fieldPath of sharedState.validationRuns.keys()) {
    if (fieldPath === path || fieldPath.startsWith(`${path}.`)) {
      affectedPaths.add(fieldPath);
    }
  }

  for (const fieldPath of sharedState.pendingValidationDebounces.keys()) {
    if (fieldPath === path || fieldPath.startsWith(`${path}.`)) {
      affectedPaths.add(fieldPath);
    }
  }

  for (const fieldPath of sharedState.validationAbortControllers.keys()) {
    if (fieldPath === path || fieldPath.startsWith(`${path}.`)) {
      affectedPaths.add(fieldPath);
    }
  }

  for (const fieldPath of affectedPaths) {
    sharedState.validationRuns.set(fieldPath, (sharedState.validationRuns.get(fieldPath) ?? 0) + 1);

    const pending = sharedState.pendingValidationDebounces.get(fieldPath);
    if (pending) {
      clearTimeout(pending.timer);
      pending.resolve(false);
      sharedState.pendingValidationDebounces.delete(fieldPath);
    }

    const controller = sharedState.validationAbortControllers.get(fieldPath);
    if (controller) {
      controller.abort();
      sharedState.validationAbortControllers.delete(fieldPath);
      sharedState.validationAsyncGovernance.invalidateCurrentRun(
        `validation:${sharedState.scope.id}:${fieldPath}`,
      );
    }
  }
}

function collectClearValueWhenHiddenPaths(
  currentValidation: CompiledFormValidationModel | undefined,
  path: string,
): string[] {
  if (!currentValidation?.nodes) {
    return [];
  }

  const selected: string[] = [];
  const subtreePaths = Object.keys(currentValidation.nodes)
    .filter((candidate) => candidate === path || candidate.startsWith(`${path}.`))
    .sort((left, right) => left.length - right.length);

  for (const candidatePath of subtreePaths) {
    const field = getCompiledValidationField(currentValidation, candidatePath);
    if (!field?.hiddenFieldPolicy.clearValueWhenHidden) {
      continue;
    }

    if (
      selected.some(
        (selectedPath) => candidatePath !== selectedPath && candidatePath.startsWith(`${selectedPath}.`),
      )
    ) {
      continue;
    }

    selected.push(candidatePath);
  }

  return selected;
}

export function notifyFieldHidden(
  sharedState: ManagedFormRuntimeSharedState,
  path: string,
  hidden: boolean,
  currentValidation: import('@nop-chaos/flux-core').CompiledFormValidationModel | undefined,
  setValue: (path: string, value: unknown) => void,
  revalidateSubtree?: (path: string, reason?: import('@nop-chaos/flux-core').ValidationReason) => Promise<unknown>,
): void {
  const wasHidden = sharedState.hiddenFields.has(path);

  if (hidden === wasHidden) {
    return;
  }

  if (hidden) {
    invalidateHiddenSubtreeValidation(sharedState, path);
    sharedState.hiddenFields.add(path);
    clearHiddenSubtreeFieldStates(sharedState, path, currentValidation);

    for (const clearPath of collectClearValueWhenHiddenPaths(currentValidation, path)) {
      setValue(clearPath, undefined);
    }
  } else {
    sharedState.hiddenFields.delete(path);
    void revalidateSubtree?.(path, 'system');
  }
}

export function isPathHiddenByOwner(
  sharedState: ManagedFormRuntimeSharedState,
  path: string,
): boolean {
  return isHiddenPath(sharedState, path);
}
