import type { ScopeChange } from '@nop-chaos/flux-core';

export function createFragmentScopeChange(
  previous: Record<string, unknown>,
  next: Record<string, unknown>,
): ScopeChange | undefined {
  const changedRoots = new Set<string>();

  for (const key of Object.keys(previous)) {
    if (!Object.prototype.hasOwnProperty.call(next, key) || !Object.is(previous[key], next[key])) {
      changedRoots.add(key);
    }
  }

  for (const key of Object.keys(next)) {
    if (
      !Object.prototype.hasOwnProperty.call(previous, key) ||
      !Object.is(previous[key], next[key])
    ) {
      changedRoots.add(key);
    }
  }

  if (changedRoots.size === 0) {
    return undefined;
  }

  return {
    paths: Array.from(changedRoots).sort(),
    kind: 'replace',
  };
}
