import { useLayoutEffect, useState, useSyncExternalStore } from 'react';
import type { ActionNamespaceProvider, ActionScope, ScopeRef } from '@nop-chaos/flux-core';
import type { DomainBridge } from '@nop-chaos/flux-core';
import { useRendererRuntime, useRenderScope } from '../hooks';

interface HostScopeStore {
  current: ScopeRef;
  subscribe(listener: () => void): () => void;
  getSnapshot(): ScopeRef;
  replace(next: ScopeRef): void;
}

function createHostScopeStore(initial: ScopeRef): HostScopeStore {
  const listeners = new Set<() => void>();
  let current = initial;

  return {
    get current() {
      return current;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      return current;
    },
    replace(next) {
      if (Object.is(current, next)) {
        return;
      }

      current = next;
      for (const listener of listeners) {
        listener();
      }
    },
  };
}

export function useBridgeSnapshot<TSnapshot, TCommand, TResult>(
  bridge: DomainBridge<TSnapshot, TCommand, TResult>,
): TSnapshot {
  return useSyncExternalStore(bridge.subscribe, bridge.getSnapshot, bridge.getSnapshot);
}

export function useHostScope(
  scopeData: Record<string, unknown>,
  path: string,
  scopeLabel: string,
): ScopeRef {
  const runtime = useRendererRuntime();
  const parentScope = useRenderScope();
  const [store] = useState<HostScopeStore>(() =>
    createHostScopeStore(
      runtime.createHostProjectionScope({
        parentScope,
        projection: scopeData,
        path,
        scopeLabel,
      }),
    ),
  );
  const scope = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  useLayoutEffect(() => {
    const current = store.current;
    const expectedId = `${path}:${scopeLabel}-host`;

    if (current.parent === parentScope && current.id === expectedId) {
      return;
    }

    store.replace(
      runtime.createHostProjectionScope({
        parentScope,
        projection: scopeData,
        path,
        scopeLabel,
      }),
    );
  }, [parentScope, path, runtime, scopeData, scopeLabel, store]);

  useLayoutEffect(() => {
    scope.replace?.(scopeData);
  }, [scope, scopeData]);

  return scope;
}

export function useNamespaceRegistration(
  actionScope: ActionScope | undefined | null,
  namespace: string,
  provider: ActionNamespaceProvider | undefined | null,
): void {
  useLayoutEffect(() => {
    if (!actionScope || !provider) {
      return;
    }

    return actionScope.registerNamespace(namespace, provider);
  }, [actionScope, namespace, provider]);
}
