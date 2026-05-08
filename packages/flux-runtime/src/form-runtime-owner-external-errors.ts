import type {
  ApplyExternalErrorsInput,
  FieldState,
  FormRuntime,
  ValidationError,
} from '@nop-chaos/flux-core';
import { transformArrayIndexedPath } from './form-path-state.js';
import type { ExternalErrorEntry, ManagedFormRuntimeSharedState } from './form-runtime-types.js';

export function rebuildStoreErrorsFromExternal(
  sharedState: ManagedFormRuntimeSharedState,
  fieldStates: Record<string, FieldState>,
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

export function getExternalErrorsForPath(
  sharedState: ManagedFormRuntimeSharedState,
  path: string,
): ValidationError[] {
  const next: ValidationError[] = [];

  for (const entry of sharedState.externalErrors.values()) {
    for (const error of entry.errors) {
      if (error.path !== path) {
        continue;
      }

      next.push({ ...error, sourceKind: 'external' });
    }
  }

  return next;
}

export function overlayFieldErrorsWithExternal(
  sharedState: ManagedFormRuntimeSharedState,
  path: string,
  errors: ValidationError[],
): ValidationError[] {
  const externalErrors = getExternalErrorsForPath(sharedState, path);

  if (externalErrors.length === 0) {
    return errors.filter((error) => error.sourceKind !== 'external');
  }

  const nonExternalErrors = errors.filter((error) => error.sourceKind !== 'external');
  return [...nonExternalErrors, ...externalErrors];
}

export function clearExternalErrorsForPath(args: {
  name: string;
  sharedState: ManagedFormRuntimeSharedState;
  getThisForm: () => FormRuntime;
}): boolean {
  let changed = false;

  for (const [sourceId, entry] of args.sharedState.externalErrors) {
    const filtered = entry.errors.filter((error: ValidationError) => {
      if (error.path === args.name || error.path.startsWith(`${args.name}.`)) {
        return false;
      }

      return !(
        args.name.startsWith(`${error.path}.`) || error.path === args.getThisForm().rootPath
      );
    });

    if (filtered.length !== entry.errors.length) {
      changed = true;
      if (filtered.length === 0) {
        args.sharedState.externalErrors.delete(sourceId);
      } else {
        args.sharedState.externalErrors.set(sourceId, {
          sourceId,
          errors: filtered,
        } satisfies ExternalErrorEntry);
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
    args.sharedState.externalErrors.set(sourceId, {
      sourceId,
      errors: [...existing.errors, ...ownedErrors],
    });
  }
}

export function remapExternalErrors(
  externalErrors: Map<string, ExternalErrorEntry>,
  arrayPath: string,
  transformIndex: (index: number) => number | undefined,
) {
  for (const [sourceId, entry] of Array.from(externalErrors.entries())) {
    const nextErrors: ValidationError[] = [];

    for (const error of entry.errors) {
      const nextPath = transformArrayIndexedPath(error.path, arrayPath, transformIndex);

      if (!nextPath) {
        continue;
      }

      nextErrors.push({
        ...error,
        path: nextPath,
        ownerPath:
          typeof error.ownerPath === 'string'
            ? transformArrayIndexedPath(error.ownerPath, arrayPath, transformIndex) ?? error.ownerPath
            : error.ownerPath,
      });
    }

    if (nextErrors.length === 0) {
      externalErrors.delete(sourceId);
      continue;
    }

    externalErrors.set(sourceId, {
      sourceId,
      errors: nextErrors,
    });
  }
}
