import type { FieldState, ValidationError } from '@nop-chaos/flux-core';

export function mergeFieldStateErrors(args: {
  currentFieldStates: Record<string, FieldState>;
  nextErrors: Record<string, ValidationError[]>;
}) {
  const nextFieldStates = { ...args.currentFieldStates };

  for (const path of Object.keys(nextFieldStates)) {
    const existingFs = nextFieldStates[path];
    if (existingFs?.errors && !args.nextErrors[path]) {
      const { errors: _removed, ...rest } = existingFs;
      if (Object.keys(rest).length > 0) {
        nextFieldStates[path] = rest;
      } else {
        delete nextFieldStates[path];
      }
    }
  }

  for (const [path, pathErrors] of Object.entries(args.nextErrors)) {
    nextFieldStates[path] = { ...nextFieldStates[path], errors: pathErrors };
  }

  return nextFieldStates;
}
