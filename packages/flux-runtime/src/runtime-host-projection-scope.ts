import type { ScopeRef } from '@nop-chaos/flux-core';

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
}) {
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
      const rootKey = targetPath.split('.')[0];

      if (reservedKeys.has(rootKey)) {
        throw new Error(`Cannot write projected host field: ${targetPath}`);
      }

      hostScope.update(targetPath, value);
    },
    merge(data: Record<string, unknown>) {
      const nextKeys = Object.keys(data);

      if (nextKeys.some((key) => reservedKeys.has(key))) {
        throw new Error(
          `Cannot merge projected host fields into host scope: ${nextKeys.join(', ')}`,
        );
      }

      hostScope.merge(data);
    },
    replace(data: Record<string, unknown>) {
      reservedKeys = new Set(Object.keys(data));
      hostScope.replace?.(data);
    },
  };
}
