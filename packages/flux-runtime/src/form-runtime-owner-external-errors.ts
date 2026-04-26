import type { ApplyExternalErrorsInput, FieldState, FormRuntime, ValidationError } from '@nop-chaos/flux-core';
import type { ExternalErrorEntry, ManagedFormRuntimeSharedState } from './form-runtime-types';

export function rebuildStoreErrorsFromExternal(
  sharedState: ManagedFormRuntimeSharedState,
  fieldStates: Record<string, FieldState>
): Record<string, ValidationError[]> {
  const next: Record<string, ValidationError[]> = {};

  for (const [path, fs] of Object.entries(fieldStates)) {
    const pathErrors = fs.errors;
    if (pathErrors) {
      const nonExternal = pathErrors.filter((error) => error.sourceKind !== 'external');
      if (nonExternal.length > 0) {
        next[path] = nonExternal;
      }
    }
  }

  for (const entry of sharedState.externalErrors.values()) {
    for (const error of entry.errors) {
      const externalError: ValidationError = { ...error, sourceKind: 'external' };
      const existing = next[error.path];
      next[error.path] = existing ? [...existing, externalError] : [externalError];
    }
  }

  return next;
}

export function clearExternalErrorsForPath(args: {
  name: string;
  sharedState: ManagedFormRuntimeSharedState;
  getThisForm: () => FormRuntime;
}): boolean {
  let changed = false;

  for (const [sourceId, entry] of args.sharedState.externalErrors) {
    const filtered = entry.errors.filter(
      (error: ValidationError) => {
        if (error.path === args.name || error.path.startsWith(`${args.name}.`)) {
          return false;
        }

        return !(args.name.startsWith(`${error.path}.`) || error.path === args.getThisForm().rootPath);
      }
    );

    if (filtered.length !== entry.errors.length) {
      changed = true;
      if (filtered.length === 0) {
        args.sharedState.externalErrors.delete(sourceId);
      } else {
        args.sharedState.externalErrors.set(sourceId, { sourceId, errors: filtered } satisfies ExternalErrorEntry);
      }
    }
  }

  return changed;
}

export function storeOwnedExternalErrors(args: {
  inputValue: ApplyExternalErrorsInput;
  sharedState: ManagedFormRuntimeSharedState;
  isPathOwned: (path: string) => boolean;
}) {
  const { sourceId, errors, replace } = args.inputValue;
  const ownedErrors = errors.filter((error) => args.isPathOwned(error.path));
  const existing = args.sharedState.externalErrors.get(sourceId);

  if (replace || !existing) {
    args.sharedState.externalErrors.set(sourceId, { sourceId, errors: ownedErrors });
  } else {
    args.sharedState.externalErrors.set(sourceId, { sourceId, errors: [...existing.errors, ...ownedErrors] });
  }
}
