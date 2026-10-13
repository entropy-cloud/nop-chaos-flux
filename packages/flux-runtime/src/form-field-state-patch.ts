import type { FieldState } from '@nop-chaos/flux-core';
import { validationErrorsEqual } from '@nop-chaos/flux-core';

interface MergeFieldStatePatchOptions {
  /**
   * Validation-commit variant: when the incoming non-empty error payload
   * deep-equals the stored one, keep the stored array identity instead of
   * reassigning (form-runtime commitPathValidationState shape).
   */
  errorsEqualGuard?: boolean;
}

export function mergeFieldStatePatch(
  existing: FieldState | undefined,
  patch: Partial<FieldState>,
  options?: MergeFieldStatePatchOptions,
): FieldState | undefined {
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
    if (patch.errors && patch.errors.length > 0) {
      const unchangedByGuard =
        options?.errorsEqualGuard && validationErrorsEqual(existing?.errors, patch.errors);
      if (!unchangedByGuard) {
        merged.errors = patch.errors;
      }
    } else {
      delete merged.errors;
    }
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
}

interface PatchFieldStateInMapInput {
  fieldStates: Record<string, FieldState>;
  path: string;
  patch: Partial<FieldState>;
  /**
   * Validation-commit variant: skip the errors reassignment when the payload
   * deep-equals the stored errors (array identity preservation).
   */
  errorsEqualGuard?: boolean;
  /**
   * field-ops map variant: hand back the SAME map reference when the patch
   * produces no effective change (absent path emptied, or merged state
   * shallow-identical to the existing entry, errors compared by identity).
   * Without this flag the map is always copied (owner/registration/validation
   * revalidate shapes).
   */
  reuseMapWhenUnchanged?: boolean;
}

export function patchFieldStateInMap(input: PatchFieldStateInMapInput): Record<string, FieldState> {
  const { fieldStates, path, patch } = input;
  const existing = fieldStates[path];
  const merged = mergeFieldStatePatch(existing, patch, {
    errorsEqualGuard: input.errorsEqualGuard,
  });

  if (merged === undefined) {
    if (!(path in fieldStates)) {
      return input.reuseMapWhenUnchanged ? fieldStates : { ...fieldStates };
    }
    const { [path]: _removed, ...rest } = fieldStates;
    return rest;
  }

  if (
    input.reuseMapWhenUnchanged &&
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
