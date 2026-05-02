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

function hasMultiSegmentPath(paths: readonly string[]): boolean {
  for (const p of paths) {
    if (p.includes('.')) {
      return true;
    }
  }
  return false;
}

function pathsOverlap(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < b.length) return b.startsWith(a + '.');
  if (b.length < a.length) return a.startsWith(b + '.');
  return false;
}

export function createRootDependencySet(
  paths: readonly string[] | undefined,
): ScopeDependencySet | undefined {
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
    broadAccess: wildcard,
  };
}

export function filterScopeChangeByIgnoredRoots(
  change: ScopeChange | undefined,
  ignoredPaths: readonly string[] | Set<string>,
): ScopeChange | undefined {
  if (!change) {
    return change;
  }

  const ignoredRoots =
    ignoredPaths instanceof Set
      ? ignoredPaths
      : ignoredPaths.length === 0
        ? undefined
        : new Set(normalizeRootPaths(ignoredPaths));

  if (!ignoredRoots || ignoredRoots.size === 0) {
    return change;
  }

  if (change.paths.includes('*')) {
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
    paths: filteredPaths,
  };
}

export function scopeChangeHitsDependencies(
  change: ScopeChange | undefined,
  dependencies: ScopeDependencySet | undefined,
): boolean {
  if (!change || !dependencies) {
    return false;
  }

  if (dependencies.wildcard || change.paths.includes('*')) {
    return true;
  }

  const changeRoots = getChangeRoots(change);
  const dependencyRoots = getDependencyRoots(dependencies);

  if (changeRoots.includes('*') || dependencyRoots.includes('*')) {
    return true;
  }

  const changeRootsSet = new Set(changeRoots);

  if (!hasMultiSegmentPath(change.paths) && !hasMultiSegmentPath(dependencies.paths)) {
    for (const root of dependencyRoots) {
      if (changeRootsSet.has(root)) return true;
    }
    return false;
  }

  const sortedDeps = [...dependencies.paths].sort();
  for (const changePath of change.paths) {
    for (const depPath of sortedDeps) {
      if (pathsOverlap(changePath, depPath)) {
        return true;
      }
    }
  }

  return false;
}
