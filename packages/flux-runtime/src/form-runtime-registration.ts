import type { FieldState } from '@nop-chaos/flux-core';
import { setIn } from '@nop-chaos/flux-core';
import type { FormRuntimeRegistrationState, RegisteredFieldEntry } from './form-runtime-types';

export function findRuntimeRegistration(
  sharedState: FormRuntimeRegistrationState,
  path: string,
): { entry: RegisteredFieldEntry | undefined; childPath: string | undefined } {
  const registrationId = sharedState.pathToRegistrationId.get(path);

  if (registrationId) {
    const entry = sharedState.runtimeFieldRegistrations.get(registrationId);
    if (entry) {
      return { entry, childPath: undefined };
    }
  }

  for (const entry of sharedState.runtimeFieldRegistrations.values()) {
    if (entry.registration.childPaths?.includes(path)) {
      return { entry, childPath: path };
    }
  }

  return { entry: undefined, childPath: undefined };
}

export function syncRegisteredFieldValue(sharedState: FormRuntimeRegistrationState, path: string) {
  const registrationId = sharedState.pathToRegistrationId.get(path);
  if (!registrationId) {
    return undefined;
  }

  const entry = sharedState.runtimeFieldRegistrations.get(registrationId);
  if (!entry) {
    return undefined;
  }

  const registration = entry.registration;
  const nextValue = registration.syncValue ? registration.syncValue() : registration.getValue();
  const currentValue = sharedState.scope.get(path);

  if (Object.is(currentValue, nextValue)) {
    return nextValue;
  }

  const baseline = sharedState.initialFieldState.initialValues[path];
  const state = sharedState.store.getState();
  const isDirty = !Object.is(baseline, nextValue);

  const fieldStates = state.fieldStates;
  const existingFieldState = fieldStates[path];
  const nextFieldState: FieldState = { ...existingFieldState };

  if (isDirty) {
    nextFieldState.dirty = true;
  } else {
    delete nextFieldState.dirty;
  }

  const nextFieldStates =
    Object.keys(nextFieldState).length > 0
      ? { ...fieldStates, [path]: nextFieldState }
      : (() => {
          const next = { ...fieldStates };
          delete next[path];
          return next;
        })();

  sharedState.store.batchUpdate({
    fieldStates: nextFieldStates,
    values: setIn(state.values, path, nextValue),
  });

  return nextValue;
}
