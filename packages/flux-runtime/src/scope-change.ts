import type { ScopeChange, ScopeDependencySet } from '@nop-chaos/flux-core';
import { normalizeRootPath, normalizeRootPaths } from '@nop-chaos/flux-core';

function getChangeRoots(change: ScopeChange): readonly string[] {
  return normalizeRootPaths(change.paths);
}

function getDependencyRoots(dependencies: ScopeDependencySet): readonly string[] {
  if (dependencies.wildcard) {
    return ['*'];
  }

  return normalizeRootPaths(dependencies.paths);
}

export function createRootDependencySet(paths: readonly string[] | undefined): ScopeDependencySet | undefined {
  if (!paths || paths.length === 0) {
    return undefined;
  }

  const normalizedPaths = normalizeRootPaths(paths);

  if (normalizedPaths.length === 0) {
    return undefined;
  }

  const wildcard = normalizedPaths.includes('*');

  return {
    paths: wildcard ? ['*'] : normalizedPaths,
    wildcard,
    broadAccess: wildcard
  };
}

export function filterScopeChangeByIgnoredRoots(
  change: ScopeChange | undefined,
  ignoredPaths: readonly string[]
): ScopeChange | undefined {
  if (!change || ignoredPaths.length === 0) {
    return change;
  }

  if (change.paths.includes('*')) {
    return change;
  }

  const ignoredRoots = new Set(normalizeRootPaths(ignoredPaths));

  if (ignoredRoots.size === 0) {
    return change;
  }

  const filteredPaths = change.paths.filter((path) => {
    const root = normalizeRootPath(path);
    return !root || !ignoredRoots.has(root);
  });

  if (filteredPaths.length === change.paths.length) {
    return change;
  }

  if (filteredPaths.length === 0) {
    return undefined;
  }

  return {
    ...change,
    paths: filteredPaths
  };
}

export function scopeChangeHitsDependencies(
  change: ScopeChange | undefined,
  dependencies: ScopeDependencySet | undefined
): boolean {
  if (!change || !dependencies) {
    return true;
  }

  if (dependencies.wildcard || change.paths.includes('*')) {
    return true;
  }

  const changeRoots = getChangeRoots(change);
  const dependencyRoots = getDependencyRoots(dependencies);

  if (changeRoots.includes('*') || dependencyRoots.includes('*')) {
    return true;
  }

  return changeRoots.some((root) => dependencyRoots.includes(root));
}
