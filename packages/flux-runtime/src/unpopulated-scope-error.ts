import { UnpopulatedScopeAccessError } from '@nop-chaos/flux-formula';

/**
 * Matches "member access on a scope variable that has not been published yet"
 * — the same sentinel tolerated by the stopWhen evaluation precedent
 * (api-data-source-controller-state). The evaluator throws
 * `UnpopulatedScopeAccessError` (flux-formula) and the formula compiler wraps
 * it once (`Expression evaluation failed for: …` / `Template evaluation
 * failed for: …`, cause = the evaluator error), so detection is single-layer
 * on `cause`. Deeper cause chains intentionally do not match: compiled
 * artifacts wrap at most once per evaluation, and walking the full chain
 * would silently widen the tolerated-error surface (plan 582 M2).
 */
export function isUnpopulatedScopeError(error: unknown): boolean {
  return error instanceof Error && error.cause instanceof UnpopulatedScopeAccessError;
}
