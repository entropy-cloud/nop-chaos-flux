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
  /**
   * Projection origin (`path` + `scopeLabel`) supplied at creation. The
   * runtime is the single-sided owner of the `${path}:${scopeLabel}-host`
   * scopeKey format; consumers must not re-derive it from `id`.
   */
  readonly origin: { path: string; scopeLabel: string };
  /**
   * Synchronously set to `true` by {@link dispose}. Introspection channel for
   * consumers holding a `ScopeRef` that may be a disposed host projection.
   */
  readonly disposed: boolean;
}

/**
 * Contract guard for host projection scopes. Replaces the former id-prefix
 * string sniffing (`id.startsWith(`${path}:${scopeLabel}-host:`)`) and the
 * unregistered `__fdDisposed__` flag read: the scopeKey format convention is
 * owned by this module alone.
 */
export function isHostProjectionScope(
  value: unknown,
  origin: { path: string; scopeLabel: string },
): value is HostProjectionScopeRef {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<HostProjectionScopeRef>;
  return (
    typeof candidate.dispose === 'function' &&
    typeof candidate.disposed === 'boolean' &&
    candidate.origin?.path === origin.path &&
    candidate.origin?.scopeLabel === origin.scopeLabel
  );
}

export function createHostProjectionScope(input: {
  parentScope: ScopeRef;
  projection: Record<string, unknown>;
  path: string;
  scopeLabel: string;
  createChildScope: (
    parent: ScopeRef,
    patch: Record<string, unknown>,
    options?: { scopeKey?: string; pathSuffix?: string; isolate?: boolean; delegateWrites?: boolean },
  ) => ScopeRef;
}): HostProjectionScopeRef {
  let disposed = false;
  let reservedKeys = new Set(Object.keys(input.projection));
  const origin = { path: input.path, scopeLabel: input.scopeLabel };
  const hostScope = input.createChildScope(input.parentScope, input.projection, {
    scopeKey: `${input.path}:${input.scopeLabel}-host`,
    pathSuffix: input.scopeLabel,
  });

  return {
    id: hostScope.id,
    path: hostScope.path,
    parent: hostScope.parent,
    store: hostScope.store,
    origin,
    get disposed() {
      return disposed;
    },
    get value() {
      return this.readVisible();
    },
    get(targetPath: string) {
      if (disposed) {
        return undefined;
      }
      return hostScope.get(targetPath);
    },
    has(targetPath: string) {
      if (disposed) {
        return false;
      }
      return hostScope.has(targetPath);
    },
    readOwn() {
      if (disposed) {
        return {};
      }
      return hostScope.readOwn();
    },
    readVisible() {
      if (disposed) {
        return {};
      }
      return hostScope.readVisible();
    },
    materializeVisible() {
      if (disposed) {
        return {};
      }
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
      (hostScope as ScopeRef & { dispose?: () => void }).dispose?.();
    },
  };
}
