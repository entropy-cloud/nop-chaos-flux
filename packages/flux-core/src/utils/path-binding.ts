import type { FieldState, ValidationError } from '../types';

export interface PathBindingContext {
  ownerRootPath: string;
  scalarValueAlias?: string;
}

export interface PathBindingService {
  toAbsolute(relativePath: string): string;
  toRelative(absolutePath: string): string | undefined;
  owns(absolutePath: string): boolean;
}

export function createPathBinding(ctx: PathBindingContext): PathBindingService {
  const { ownerRootPath, scalarValueAlias } = ctx;
  const prefixDot = ownerRootPath ? `${ownerRootPath}.` : '';

  function toAbsolute(relativePath: string): string {
    if (!ownerRootPath) {
      return relativePath;
    }

    if (!relativePath) {
      return ownerRootPath;
    }

    if (scalarValueAlias && relativePath === scalarValueAlias) {
      return ownerRootPath;
    }

    return `${ownerRootPath}.${relativePath}`;
  }

  function toRelative(absolutePath: string): string | undefined {
    if (!ownerRootPath) {
      return absolutePath;
    }

    if (absolutePath === ownerRootPath) {
      return scalarValueAlias ?? '';
    }

    if (absolutePath.startsWith(prefixDot)) {
      return absolutePath.slice(prefixDot.length);
    }

    return undefined;
  }

  function owns(absolutePath: string): boolean {
    if (!ownerRootPath) {
      return true;
    }

    return absolutePath === ownerRootPath || absolutePath.startsWith(prefixDot);
  }

  return {
    toAbsolute,
    toRelative,
    owns,
  };
}

export function projectBooleanMap(
  map: Record<string, boolean>,
  binding: PathBindingService,
): Record<string, boolean> {
  const result: Record<string, boolean> = {};

  for (const [key, val] of Object.entries(map)) {
    const relKey = binding.toRelative(key);

    if (relKey !== undefined) {
      result[relKey] = val;
    }
  }

  return result;
}

function projectValidationErrors(
  errors: ValidationError[],
  binding: PathBindingService,
): ValidationError[] {
  return errors.map((e) => {
    const projectedPath =
      typeof e.path === 'string' ? (binding.toRelative(e.path) ?? e.path) : e.path;
    const projectedOwnerPath =
      typeof e.ownerPath === 'string' ? binding.toRelative(e.ownerPath) : undefined;
    return {
      ...e,
      path: projectedPath,
      ownerPath: projectedOwnerPath ?? projectedPath,
    };
  });
}

export function projectFieldStates(
  fieldStates: Record<string, FieldState>,
  binding: PathBindingService,
): Record<string, FieldState> {
  const result: Record<string, FieldState> = {};

  for (const [key, state] of Object.entries(fieldStates)) {
    const relKey = binding.toRelative(key);

    if (relKey !== undefined) {
      const projectedState: FieldState = {};
      if (state.touched) projectedState.touched = true;
      if (state.dirty) projectedState.dirty = true;
      if (state.visited) projectedState.visited = true;
      if (state.validating) projectedState.validating = true;
      if (state.errors && state.errors.length > 0) {
        projectedState.errors = projectValidationErrors(state.errors, binding);
      }

      if (Object.keys(projectedState).length > 0) {
        result[relKey] = projectedState;
      }
    }
  }

  return result;
}
