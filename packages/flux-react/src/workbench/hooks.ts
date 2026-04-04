import { useEffect, useLayoutEffect, useMemo, useSyncExternalStore } from 'react';
import type { ActionNamespaceProvider, ActionScope, ScopeRef } from '@nop-chaos/flux-core';
import type { DomainBridge } from '@nop-chaos/flux-core';
import { useRendererRuntime, useRenderScope } from '../hooks';

export function useBridgeSnapshot<TSnapshot, TCommand, TResult>(
  bridge: DomainBridge<TSnapshot, TCommand, TResult>,
): TSnapshot {
  return useSyncExternalStore(
    bridge.subscribe,
    bridge.getSnapshot,
    bridge.getSnapshot,
  );
}

export function useHostScope(
  scopeData: Record<string, unknown>,
  path: string,
  scopeLabel: string,
): ScopeRef {
  const runtime = useRendererRuntime();
  const parentScope = useRenderScope();

  const scope = useMemo(
    () =>
      runtime.createChildScope(parentScope, scopeData, {
        scopeKey: `${path}:${scopeLabel}-host`,
        pathSuffix: scopeLabel,
      }),
    [path, parentScope, runtime, scopeData, scopeLabel],
  );

  useEffect(() => {
    scope.merge(scopeData);
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
