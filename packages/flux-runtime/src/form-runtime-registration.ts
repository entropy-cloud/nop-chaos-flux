import { setIn, type RuntimeFieldRegistration } from '@nop-chaos/flux-core';
import type { ManagedFormRuntimeSharedState } from './form-runtime-types';

export function findRuntimeRegistration(
  runtimeFieldRegistrations: Map<string, RuntimeFieldRegistration>,
  path: string
): { registration: RuntimeFieldRegistration | undefined; childPath: string | undefined } {
  const direct = runtimeFieldRegistrations.get(path);

  if (direct) {
    return {
      registration: direct,
      childPath: undefined
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
    childPath: undefined
  };
}

export function syncRegisteredFieldValue(sharedState: ManagedFormRuntimeSharedState, path: string) {
  const registration = sharedState.runtimeFieldRegistrations.get(path);

  if (!registration) {
    return undefined;
  }

  const nextValue = registration.syncValue ? registration.syncValue() : registration.getValue();
  const currentValue = sharedState.scope.get(path);

  if (Object.is(currentValue, nextValue)) {
    return nextValue;
  }

  const baseline = sharedState.initialFieldState.initialValues[path];
  const state = sharedState.store.getState();
  const isDirty = !Object.is(baseline, nextValue);
  const nextDirty = isDirty
    ? { ...state.dirty, [path]: true }
    : (() => {
        const next = { ...state.dirty };
        delete next[path];
        return next;
      })();

  sharedState.store.batchUpdate({
    dirty: nextDirty,
    values: setIn(state.values, path, nextValue)
  });

  return nextValue;
}
