import type { ScopeRef } from '@nop-chaos/flux-core';

export function publishOwnerStatus<TSummary>(scope: ScopeRef | undefined, statusPath: string | undefined, summary: TSummary): void {
  if (!scope || !statusPath) {
    return;
  }

  scope.update(statusPath, summary);
}

export function createReadonlyScopeBinding<TSummary>(scope: ScopeRef, bindingKey: string, getSummary: () => TSummary): ScopeRef {
  return {
    ...scope,
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
      return {
        ...scope.readOwn(),
        [bindingKey]: getSummary()
      };
    },
    read() {
      return {
        ...scope.read(),
        [bindingKey]: getSummary()
      };
    }
  };
}
