import type { RuntimeFieldRegistration } from '@nop-chaos/amis-schema';
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
  sharedState.store.setDirty(path, !Object.is(baseline, nextValue));
  sharedState.store.setValue(path, nextValue);
  return nextValue;
}
