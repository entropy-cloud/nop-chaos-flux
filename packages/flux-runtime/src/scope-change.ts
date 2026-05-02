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

function pathPrefixes(path: string): readonly string[] {
  const prefixes = [path];
  let index = path.lastIndexOf('.');

  while (index >= 0) {
    prefixes.push(path.slice(0, index));
    index = path.lastIndexOf('.', index - 1);
  }

  return prefixes;
}

function buildDependencyPathIndex(paths: readonly string[]) {
  const exact = new Set<string>();
  const descendantsByPrefix = new Map<string, string[]>();

  for (const path of paths) {
    exact.add(path);

    const prefixes = pathPrefixes(path);
    for (let index = 1; index < prefixes.length; index += 1) {
      const prefix = prefixes[index];
      const descendants = descendantsByPrefix.get(prefix);
      if (descendants) {
        descendants.push(path);
      } else {
        descendantsByPrefix.set(prefix, [path]);
      }
    }
  }

  return {
    exact,
    descendantsByPrefix,
  };
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

  const dependencyIndex = buildDependencyPathIndex(dependencies.paths);

  for (const changePath of change.paths) {
    if (dependencyIndex.exact.has(changePath)) {
      return true;
    }

    for (const prefix of pathPrefixes(changePath)) {
      if (dependencyIndex.exact.has(prefix) || dependencyIndex.descendantsByPrefix.has(prefix)) {
        return true;
      }
    }
  }

  return false;
}
