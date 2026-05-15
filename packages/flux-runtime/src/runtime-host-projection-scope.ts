import type { ScopeRef } from '@nop-chaos/flux-core';

function collectNestedChangedPaths(
  current: Record<string, unknown>,
  next: Record<string, unknown>,
  prefix = '',
): string[] {
  const changed = new Set<string>();
  const keys = new Set([...Object.keys(current), ...Object.keys(next)]);

  for (const key of keys) {
    const path = prefix ? `${prefix}.${key}` : key;
    const currentValue = current[key];
    const nextValue = next[key];

    if (Object.is(currentValue, nextValue)) {
      continue;
    }

    const currentIsObject = currentValue != null && typeof currentValue === 'object' && !Array.isArray(currentValue);
    const nextIsObject = nextValue != null && typeof nextValue === 'object' && !Array.isArray(nextValue);

    if (currentIsObject && nextIsObject) {
      const nestedPaths = collectNestedChangedPaths(
        currentValue as Record<string, unknown>,
        nextValue as Record<string, unknown>,
        path,
      );

      if (nestedPaths.length > 0) {
        for (const nestedPath of nestedPaths) {
          changed.add(nestedPath);
        }
        continue;
      }
    }

    changed.add(path);
  }

  return Array.from(changed).sort();
}

export interface HostProjectionScopeRef extends ScopeRef {
  dispose(): void;
}

export function createHostProjectionScope(input: {
  parentScope: ScopeRef;
  projection: Record<string, unknown>;
  path: string;
  scopeLabel: string;
  createChildScope: (
    parent: ScopeRef,
    patch: Record<string, unknown>,
    options?: { scopeKey?: string; pathSuffix?: string; isolate?: boolean },
  ) => ScopeRef;
}): HostProjectionScopeRef {
  let disposed = false;
  let reservedKeys = new Set(Object.keys(input.projection));
  const hostScope = input.createChildScope(input.parentScope, input.projection, {
    scopeKey: `${input.path}:${input.scopeLabel}-host`,
    pathSuffix: input.scopeLabel,
  });

  return {
    id: hostScope.id,
    path: hostScope.path,
    parent: hostScope.parent,
    store: hostScope.store,
    get value() {
      return this.readVisible();
    },
    get(targetPath: string) {
      return hostScope.get(targetPath);
    },
    has(targetPath: string) {
      return hostScope.has(targetPath);
    },
    readOwn() {
      return hostScope.readOwn();
    },
    readVisible() {
      return hostScope.readVisible();
    },
    materializeVisible() {
      return hostScope.materializeVisible();
    },
    update(targetPath: string, value: unknown) {
      if (disposed) return;
      const rootKey = targetPath.split('.')[0];

      if (reservedKeys.has(rootKey)) {
        throw new Error(`Cannot write projected host field: ${targetPath}`);
      }

      hostScope.update(targetPath, value);
    },
    merge(data: Record<string, unknown>) {
      if (disposed) return;
      const nextKeys = Object.keys(data);

      if (nextKeys.some((key) => reservedKeys.has(key))) {
        throw new Error(
          `Cannot merge projected host fields into host scope: ${nextKeys.join(', ')}`,
        );
      }

      hostScope.merge(data);
    },
    replace(data: Record<string, unknown>) {
      if (disposed) return;
      reservedKeys = new Set(Object.keys(data));
      const current = hostScope.readOwn();
      const changedPaths = collectNestedChangedPaths(current, data);

      if (changedPaths.length === 0) {
        return;
      }

      hostScope.store?.setSnapshot(data, {
        paths: changedPaths,
        sourceScopeId: hostScope.id,
        kind: 'replace',
      });
    },
    dispose() {
      disposed = true;
    },
  };
}
