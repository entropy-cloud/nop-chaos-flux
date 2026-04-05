import type { ScopeChange, ScopeDependencySet } from '@nop-chaos/flux-core';
import { parsePath } from '@nop-chaos/flux-core';

function normalizePath(path: string): string {
  return parsePath(path).join('.');
}

function pathMatchesDependency(changePath: string, dependencyPath: string): boolean {
  const normalizedChange = normalizePath(changePath);
  const normalizedDependency = normalizePath(dependencyPath);

  if (!normalizedChange || !normalizedDependency) {
    return false;
  }

  return (
    normalizedChange === normalizedDependency ||
    normalizedChange.startsWith(`${normalizedDependency}.`) ||
    normalizedDependency.startsWith(`${normalizedChange}.`)
  );
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

  return change.paths.some((changePath) => dependencies.paths.some((dependencyPath) => pathMatchesDependency(changePath, dependencyPath)));
}
