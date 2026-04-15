import type { ScopeRef } from '@nop-chaos/flux-core';
import { createProjectedScopeStore } from './projected-scope-store';

export function publishOwnerStatus<TSummary>(scope: ScopeRef | undefined, statusPath: string | undefined, summary: TSummary): void {
  if (!scope || !statusPath) {
    return;
  }

  scope.update(statusPath, summary);
}

export function createReadonlyScopeBinding<TSummary>(scope: ScopeRef, bindingKey: string, getSummary: () => TSummary): ScopeRef {
  const buildOwnSnapshot = () => ({
    ...scope.readOwn(),
    [bindingKey]: getSummary()
  });
  const { readSnapshot, store } = createProjectedScopeStore(scope, buildOwnSnapshot);

  return {
    ...scope,
    store,
    get(path) {
      if (path === bindingKey) {
        return getSummary();
      }

      return scope.get(path);
    },
    has(path) {
      if (path === bindingKey) {
        return true;
      }

      return scope.has(path);
    },
    readOwn() {
      return readSnapshot();
    },
    readVisible() {
      const overlay = Object.create(scope.readVisible()) as Record<string, any>;
      overlay[bindingKey] = getSummary();
      return overlay;
    },
    materializeVisible() {
      return {
        ...scope.materializeVisible(),
        [bindingKey]: getSummary()
      };
    }
  };
}
