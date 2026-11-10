import type { FormRuntime } from '@nop-chaos/flux-core';
import { attachValidationRejectionHandler } from './validation-rejection.js';
import { shouldValidateOn } from '@nop-chaos/flux-renderers-form';

type WriteFieldValueTrigger = 'change' | 'blur';

/**
 * Shared gated post-write validation for the composite field writers: after a
 * value write, validate `validatePath` on `owner` — but only when the compiled
 * behavior of the GATE path (`gatePath`, usually the composite field name)
 * declares the trigger. The gate path and the validated path may differ
 * (key-value/array rows validate `name.<i>.key` child paths while gating on
 * the composite `name`).
 *
 * Returns whether the validation fired. `tag-list` uses the boolean for its
 * early-return over the validation-scope fallback branch.
 */
export function writeFieldValue(
  owner: FormRuntime | undefined,
  gatePath: string,
  validatePath: string,
  trigger: WriteFieldValueTrigger,
  report?: (error: unknown) => void,
): boolean {
  if (!owner || !shouldValidateOn(gatePath, owner, trigger)) {
    return false;
  }
  attachValidationRejectionHandler(
    owner.validateField(validatePath, trigger),
    report ?? ((error: unknown) => console.warn('[flux-form-advanced] validateField failed', error)),
  );
  return true;
}
