import { useLayoutEffect, useMemo, useRef, useSyncExternalStore } from 'react';
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
  const reservedKeysRef = useRef(new Set<string>(Object.keys(scopeData)));
  reservedKeysRef.current = new Set(Object.keys(scopeData));
  const initialScopeDataRef = useRef(scopeData);

  const scope = useMemo(
    () => {
      const hostScope = runtime.createChildScope(parentScope, initialScopeDataRef.current, {
        scopeKey: `${path}:${scopeLabel}-host`,
        pathSuffix: scopeLabel,
      });

      return {
        id: hostScope.id,
        path: hostScope.path,
        parent: hostScope.parent,
        store: hostScope.store,
        get value() {
          return this.read();
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
        read() {
          return hostScope.read();
        },
        update(targetPath: string, value: unknown) {
          const rootKey = targetPath.split('.')[0];

          if (reservedKeysRef.current.has(rootKey)) {
            throw new Error(`Cannot write projected host field: ${targetPath}`);
          }

          hostScope.update(targetPath, value);
        },
        merge(data: Record<string, unknown>) {
          const nextKeys = Object.keys(data);

          if (nextKeys.some((key) => reservedKeysRef.current.has(key))) {
            throw new Error(`Cannot merge projected host fields into host scope: ${nextKeys.join(', ')}`);
          }

          hostScope.merge(data);
        },
        replace(data: Record<string, unknown>) {
          hostScope.replace?.(data);
        }
      };
    },
    [path, parentScope, runtime, scopeLabel],
  );

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
