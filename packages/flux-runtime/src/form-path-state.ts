import type { FieldState, ValidationError } from '@nop-chaos/flux-core';

function isNumericPathSegment(segment: string | undefined): boolean {
  return typeof segment === 'string' && /^\d+$/.test(segment);
}

export function transformArrayIndexedPath(
  path: string,
  arrayPath: string,
  transformIndex: (index: number) => number | undefined,
): string | undefined {
  if (path === arrayPath) {
    return path;
  }

  const prefix = `${arrayPath}.`;

  if (!path.startsWith(prefix)) {
    return path;
  }

  const remainder = path.slice(prefix.length);
  const [indexSegment, ...rest] = remainder.split('.');

  if (!isNumericPathSegment(indexSegment)) {
    return path;
  }

  const nextIndex = transformIndex(Number(indexSegment));

  if (nextIndex === undefined) {
    return undefined;
  }

  return [arrayPath, String(nextIndex), ...rest].filter(Boolean).join('.');
}

function transformValidationError(
  error: ValidationError,
  arrayPath: string,
  transformIndex: (index: number) => number | undefined,
): ValidationError | undefined {
  const mappedPath = transformArrayIndexedPath(error.path, arrayPath, transformIndex);

  if (!mappedPath) {
    return undefined;
  }

  const mappedOwnerPath = error.ownerPath
    ? (transformArrayIndexedPath(error.ownerPath, arrayPath, transformIndex) ?? error.ownerPath)
    : error.ownerPath;

  const mappedRelatedPaths = error.relatedPaths?.map((relatedPath) => {
    const mappedRelatedPath = transformArrayIndexedPath(relatedPath, arrayPath, transformIndex);
    return mappedRelatedPath ?? relatedPath;
  });

  if (
    mappedPath === error.path &&
    mappedOwnerPath === error.ownerPath &&
    !mappedRelatedPaths?.some((p, i) => p !== error.relatedPaths?.[i])
  ) {
    return error;
  }

  return {
    ...error,
    path: mappedPath,
    ownerPath: mappedOwnerPath,
    relatedPaths: mappedRelatedPaths,
  };
}

function transformFieldStateErrors(
  errors: ValidationError[] | undefined,
  arrayPath: string,
  transformIndex: (index: number) => number | undefined,
): ValidationError[] | undefined {
  if (!errors || errors.length === 0) {
    return undefined;
  }

  const result: ValidationError[] = [];

  for (const error of errors) {
    const transformed = transformValidationError(error, arrayPath, transformIndex);
    if (transformed) {
      result.push(transformed);
    }
  }

  return result.length > 0 ? result : undefined;
}

export function remapFieldStates(
  fieldStates: Record<string, FieldState>,
  arrayPath: string,
  transformIndex: (index: number) => number | undefined,
): Record<string, FieldState> {
  const result: Record<string, FieldState> = {};

  for (const [path, state] of Object.entries(fieldStates)) {
    const newPath = transformArrayIndexedPath(path, arrayPath, transformIndex);

    if (!newPath) {
      continue;
    }

    const transformedErrors = transformFieldStateErrors(state.errors, arrayPath, transformIndex);
    const hasErrors = transformedErrors && transformedErrors.length > 0;

    if (newPath === path && (state.errors === transformedErrors || (!state.errors && !hasErrors))) {
      result[newPath] = state;
    } else {
      const newState: FieldState = {};
      if (state.touched) newState.touched = true;
      if (state.dirty) newState.dirty = true;
      if (state.visited) newState.visited = true;
      if (state.validating) newState.validating = true;
      if (hasErrors) newState.errors = transformedErrors;

      if (Object.keys(newState).length > 0) {
        result[newPath] = newState;
      }
    }
  }

  return result;
}

export function remapBooleanState(
  input: Record<string, boolean>,
  arrayPath: string,
  transformIndex: (index: number) => number | undefined,
): Record<string, boolean> {
  const next: Record<string, boolean> = {};

  for (const [path, value] of Object.entries(input)) {
    const nextPath = transformArrayIndexedPath(path, arrayPath, transformIndex);

    if (nextPath) {
      next[nextPath] = value;
    }
  }

  return next;
}

export function remapErrorState(
  input: Record<string, ValidationError[]>,
  arrayPath: string,
  transformIndex: (index: number) => number | undefined,
): Record<string, ValidationError[]> {
  const next: Record<string, ValidationError[]> = {};

  for (const [path, errors] of Object.entries(input)) {
    const nextPath = transformArrayIndexedPath(path, arrayPath, transformIndex);

    if (!nextPath) {
      continue;
    }

    const nextErrors: ValidationError[] = [];

    for (const error of errors) {
      const transformed = transformValidationError(error, arrayPath, transformIndex);
      if (transformed) {
        nextErrors.push(transformed);
      }
    }

    if (nextErrors.length > 0) {
      next[nextPath] = nextErrors;
    }
  }

  return next;
}
