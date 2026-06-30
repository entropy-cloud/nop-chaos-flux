import type { CompiledRuntimeValue, ScopeRef } from '@nop-chaos/flux-core';

export type CompiledRemoveWhenEvaluator = (
  compiled: CompiledRuntimeValue<unknown>,
  scope: ScopeRef,
) => unknown;

/**
 * Whether a `removeWhen` lazy-eval field is meaningfully configured.
 *
 * The compiler only omits a handle when the field is absent; an authored empty
 * or whitespace-only string still compiles to a static handle, so we treat a
 * static empty/whitespace string as "not configured" to preserve the legacy
 * trim guard semantics.
 */
export function isRemoveWhenConfigured(
  handle: CompiledRuntimeValue<unknown> | undefined,
): boolean {
  if (!handle) {
    return false;
  }
  if (
    handle.kind === 'static' &&
    typeof handle.value === 'string' &&
    handle.value.trim() === ''
  ) {
    return false;
  }
  return true;
}

/**
 * Evaluate a per-item `removeWhen` compiled handle and report whether removal
 * is BLOCKED.
 *
 * Contract (B3.2 C3): when `removeWhen` is declared, a row is removable only
 * when the expression evaluates truthy against the projected item scope.
 * Removal is blocked when the expression is falsy. Evaluation errors fail open
 * (removal allowed) so a buggy expression cannot trap data; the error is logged.
 *
 * Uses the precompiled `lazyEval` handle from `templateNode.structuralFields`
 * (compiled once) instead of recompiling the raw schema string per item.
 */
export function isRemoveBlockedByWhen(args: {
  removeWhenHandle: CompiledRuntimeValue<unknown> | undefined;
  itemScope: ScopeRef;
  evaluateCompiled: CompiledRemoveWhenEvaluator;
}): boolean {
  const { removeWhenHandle, itemScope, evaluateCompiled } = args;
  if (!isRemoveWhenConfigured(removeWhenHandle)) {
    return false;
  }
  try {
    const result = evaluateCompiled(removeWhenHandle as CompiledRuntimeValue<unknown>, itemScope);
    return !result;
  } catch (error) {
    console.error(
      '[flux] removeWhen expression evaluation failed; failing open (removal allowed).',
      error,
    );
    return false;
  }
}
