import type {
  FieldRegistrationHandle,
  RuntimeFieldRegistration,
  ValidationError
} from '@nop-chaos/flux-core';
import { getCompiledValidationField, setIn } from '@nop-chaos/flux-core';
import { findRuntimeRegistration } from './form-runtime-registration';
import type { ManagedFormRuntimeSharedState } from './form-runtime-types';

export function buildBooleanPathState(input: Record<string, boolean>, path: string, nextValue: boolean): Record<string, boolean> {
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

export function buildErrorPathState(input: Record<string, ValidationError[]>, path: string): Record<string, ValidationError[]> {
  if (!input[path]) {
    return input;
  }

  const next = { ...input };
  delete next[path];
  return next;
}

export function applyFieldValuePatch(
  sharedState: ManagedFormRuntimeSharedState,
  state: { values: Record<string, unknown>; validating: Record<string, boolean>; errors: Record<string, ValidationError[]>; dirty: Record<string, boolean> },
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

let _registrationIdCounter = 0;

export function nextRegistrationId(): string {
  return `reg-${++_registrationIdCounter}`;
}

export function registerField(
  sharedState: ManagedFormRuntimeSharedState,
  registration: RuntimeFieldRegistration
): FieldRegistrationHandle {
  const { runtimeFieldRegistrations, pathToRegistrationId } = sharedState;

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
}

export function updateFieldRegistration(
  sharedState: ManagedFormRuntimeSharedState,
  registrationId: string,
  patch: Partial<RuntimeFieldRegistration>
): void {
  const { runtimeFieldRegistrations } = sharedState;
  const entry = runtimeFieldRegistrations.get(registrationId);
  if (!entry) return;

  if (entry.modelGeneration !== sharedState.modelGeneration) return;

  runtimeFieldRegistrations.set(registrationId, {
    ...entry,
    registration: { ...entry.registration, ...patch }
  });
}

export function notifyFieldHidden(
  sharedState: ManagedFormRuntimeSharedState,
  path: string,
  hidden: boolean,
  currentValidation: import('@nop-chaos/flux-core').CompiledFormValidationModel | undefined,
  setValue: (path: string, value: unknown) => void
): void {
  const wasHidden = sharedState.hiddenFields.has(path);

  if (hidden === wasHidden) {
    return;
  }

  if (hidden) {
    sharedState.hiddenFields.add(path);
    const field = getCompiledValidationField(currentValidation, path);

    if (field?.hiddenFieldPolicy.clearValueWhenHidden) {
      setValue(path, undefined);
    }
  } else {
    sharedState.hiddenFields.delete(path);
  }
}
