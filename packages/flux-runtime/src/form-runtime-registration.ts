import { setIn } from '@nop-chaos/flux-core';
import { patchFieldStateInMap } from './form-field-state-patch.js';
import type { FormRuntimeRegistrationState, RegisteredFieldEntry } from './form-runtime-types.js';

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

  const childRegId = sharedState.childPathToRegistrationId.get(path);
  if (childRegId) {
    const entry = sharedState.runtimeFieldRegistrations.get(childRegId);
    if (entry) {
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

  // AUDIT-15: the patch touches the dirty key only — `validating` is NOT
  // pre-cleared here (mirrors the owner revalidateDependents graft).
  const nextFieldStates = patchFieldStateInMap({
    fieldStates: state.fieldStates,
    path,
    patch: { dirty: isDirty ? true : undefined },
  });

  sharedState.store.batchUpdate({
    fieldStates: nextFieldStates,
    values: setIn(state.values, path, nextValue),
  });

  return nextValue;
}
