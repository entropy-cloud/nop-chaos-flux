import type { ScopeRef } from './types/scope';
import type { ScopeSnapshot } from './types/node-identity';

/**
 * Checks if an error is an AbortError (from AbortController.abort() or similar).
 * This is the single canonical implementation - all packages should import from here.
 */
export function isAbortError(
  error: unknown,
): error is DOMException | { name?: string; code?: string } {
  if (error == null || typeof error !== 'object') return false;
  const e = error as { name?: string; code?: string };
  return e.name === 'AbortError' || e.code === 'ABORT_ERR';
}

/**
 * Builds a scope chain snapshot from a scope reference, walking up parent chain.
 * Single canonical implementation for all scope chain introspection.
 */
export function buildScopeChain(scope: ScopeRef | undefined): ScopeSnapshot[] | undefined {
  if (!scope) {
    return undefined;
  }

  const chain: ScopeSnapshot[] = [];
  let current: ScopeRef | undefined = scope;

  while (current) {
    chain.push({
      id: current.id,
      path: current.path,
      label: current.path || current.id,
      data: current.readOwn() as Record<string, unknown>,
    });
    current = current.parent;
  }

  return chain;
}
