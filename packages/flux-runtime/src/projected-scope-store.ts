import type { ScopeRef, ScopeStore } from '@nop-chaos/flux-core';

export function createProjectedScopeStore(
  scope: ScopeRef,
  projectSnapshot: () => Record<string, any>,
): {
  store?: ScopeStore<Record<string, any>>;
  readSnapshot: () => Record<string, any>;
} {
  let lastBaseSnapshot: Record<string, any> | undefined;
  let lastProjected: Record<string, any> | undefined;

  function readSnapshot() {
    const baseSnapshot = scope.store?.getSnapshot() ?? scope.readVisible();

    if (lastProjected && lastBaseSnapshot === baseSnapshot) {
      return lastProjected;
    }

    lastBaseSnapshot = baseSnapshot;
    lastProjected = projectSnapshot();
    return lastProjected;
  }

  if (!scope.store) {
    return { readSnapshot };
  }

  return {
    readSnapshot,
    store: {
      getSnapshot: readSnapshot,
      getLastChange() {
        return scope.store?.getLastChange();
      },
      setSnapshot() {
        throw new Error('Cannot set snapshot on projected scope store');
      },
      subscribe(listener) {
        return scope.store?.subscribe(listener) ?? (() => undefined);
      },
    },
  };
}
