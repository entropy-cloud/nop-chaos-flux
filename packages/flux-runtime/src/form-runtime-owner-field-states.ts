import type { FieldState, ValidationError } from '@nop-chaos/flux-core';

interface MergeFieldStateErrorsWithGuardArgs {
  currentFieldStates: Record<string, FieldState>;
  nextErrors: Record<string, ValidationError[]>;
  /**
   * Owner validateForm tail variant: when the stored errors deep-equal the
   * incoming payload, keep them untouched (and leave `changed` false so the
   * caller skips the rewrite). Without the guard every payload is grafted.
   */
  errorsEqualGuard?: (
    left: ValidationError[] | undefined,
    right: ValidationError[] | undefined,
  ) => boolean;
}

export function mergeFieldStateErrorsWithGuard(
  args: MergeFieldStateErrorsWithGuardArgs,
): { fieldStates: Record<string, FieldState>; changed: boolean } {
  const nextFieldStates = { ...args.currentFieldStates };
  let changed = false;

  for (const path of Object.keys(nextFieldStates)) {
    const existingFs = nextFieldStates[path];
    if (existingFs?.errors && !args.nextErrors[path]) {
      const { errors: _removed, ...rest } = existingFs;
      if (Object.keys(rest).length > 0) {
        nextFieldStates[path] = rest;
      } else {
        delete nextFieldStates[path];
      }
      changed = true;
    }
  }

  for (const [path, pathErrors] of Object.entries(args.nextErrors)) {
    const existing = nextFieldStates[path];
    if (args.errorsEqualGuard?.(existing?.errors, pathErrors)) {
      continue;
    }
    nextFieldStates[path] = { ...existing, errors: pathErrors };
    changed = true;
  }

  return { fieldStates: nextFieldStates, changed };
}

export function mergeFieldStateErrors(args: {
  currentFieldStates: Record<string, FieldState>;
  nextErrors: Record<string, ValidationError[]>;
}) {
  return mergeFieldStateErrorsWithGuard(args).fieldStates;
}
