import type { ScopeChange, ScopeDependencySet } from '@nop-chaos/flux-core';
import { normalizeRootPath, normalizeRootPaths } from '@nop-chaos/flux-core';

// P14 (plan 2026-09-28-6): dependency sets are static per subscription and a
// change object fans out to N subscribers — cache the derived artifacts per
// object identity instead of rebuilding a Set + path index on every
// change × subscriber pair.
interface DependencyMatchArtifacts {
  roots: readonly string[];
  index: { exact: Set<string>; descendantsByPrefix: Map<string, Set<string>> };
}

const dependencyArtifactsCache = new WeakMap<ScopeDependencySet, DependencyMatchArtifacts>();

function getDependencyArtifacts(dependencies: ScopeDependencySet): DependencyMatchArtifacts {
  let cached = dependencyArtifactsCache.get(dependencies);
  if (!cached) {
    const roots = dependencies.wildcard ? ['*'] : normalizeRootPaths(dependencies.paths);
    cached = { roots, index: buildDependencyPathIndex(dependencies.paths) };
    dependencyArtifactsCache.set(dependencies, cached);
  }
  return cached;
}

interface ChangeArtifacts {
  roots: readonly string[];
  rootSet: Set<string>;
}

const changeArtifactsCache = new WeakMap<ScopeChange, ChangeArtifacts>();

function getChangeArtifacts(change: ScopeChange): ChangeArtifacts {
  let cached = changeArtifactsCache.get(change);
  if (!cached) {
    const roots = normalizeRootPaths(change.paths);
    cached = { roots, rootSet: new Set(roots) };
    changeArtifactsCache.set(change, cached);
  }
  return cached;
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

function pathsOverlap(changePath: string, dependencyPath: string): boolean {
  return (
    changePath === dependencyPath ||
    changePath.startsWith(`${dependencyPath}.`) ||
    dependencyPath.startsWith(`${changePath}.`)
  );
}

function buildDependencyPathIndex(paths: readonly string[]) {
  const exact = new Set<string>();
  const descendantsByPrefix = new Map<string, Set<string>>();

  for (const path of paths) {
    exact.add(path);

    const prefixes = pathPrefixes(path);
    for (let index = 1; index < prefixes.length; index += 1) {
      const prefix = prefixes[index];
      const descendants = descendantsByPrefix.get(prefix);
      if (descendants) {
        descendants.add(path);
      } else {
        descendantsByPrefix.set(prefix, new Set([path]));
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
  if (!change) {
    return false;
  }

  if (!dependencies) {
    return true;
  }

  if (dependencies.wildcard || change.paths.includes('*')) {
    return true;
  }

  const changeArtifacts = getChangeArtifacts(change);
  const dependencyArtifacts = getDependencyArtifacts(dependencies);
  const changeRoots = changeArtifacts.roots;
  const dependencyRoots = dependencyArtifacts.roots;

  if (changeRoots.includes('*') || dependencyRoots.includes('*')) {
    return true;
  }

  const changeRootsSet = changeArtifacts.rootSet;

  if (!hasMultiSegmentPath(change.paths) && !hasMultiSegmentPath(dependencies.paths)) {
    for (const root of dependencyRoots) {
      if (changeRootsSet.has(root)) return true;
    }
    return false;
  }

  const dependencyIndex = dependencyArtifacts.index;

  for (const changePath of change.paths) {
    if (dependencyIndex.exact.has(changePath)) {
      return true;
    }

    for (const prefix of pathPrefixes(changePath)) {
      if (dependencyIndex.exact.has(prefix)) {
        return true;
      }

      const descendants = dependencyIndex.descendantsByPrefix.get(prefix);
      if (!descendants) {
        continue;
      }

      for (const dependencyPath of descendants) {
        if (pathsOverlap(changePath, dependencyPath)) {
          return true;
        }
      }
    }
  }

  return false;
}
