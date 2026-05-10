import { useEffect, useMemo, useRef } from 'react';
import type { ActionScope, ComponentHandleRegistry, RendererRuntime } from '@nop-chaos/flux-core';

function createNodeOwnedActionScope(
  runtime: RendererRuntime,
  parent: ActionScope | undefined,
  nodeId: string,
) {
  return runtime.createActionScope({
    id: `${nodeId}:action-scope`,
    parent,
  });
}

function createNodeOwnedComponentRegistry(
  runtime: RendererRuntime,
  parent: ComponentHandleRegistry | undefined,
  nodeId: string,
) {
  return runtime.createComponentHandleRegistry({
    id: `${nodeId}:component-registry`,
    parent,
  });
}

export function useNodeScopes(
  runtime: RendererRuntime,
  input: {
    nodeId: string;
    actionScopePolicy: 'inherit' | 'new' | undefined;
    componentRegistryPolicy: 'inherit' | 'new' | undefined;
  },
  actionScope: ActionScope | undefined,
  componentRegistry: ComponentHandleRegistry | undefined,
): {
  activeActionScope: ActionScope | undefined;
  activeComponentRegistry: ComponentHandleRegistry | undefined;
} {
  const mountedRef = useRef(false);
  const activeNodeComponentRegistryRef = useRef<ComponentHandleRegistry | undefined>(undefined);
  const nodeActionScope = useMemo(() => {
    if (input.actionScopePolicy !== 'new') {
      return undefined;
    }

    return createNodeOwnedActionScope(runtime, actionScope, input.nodeId);
  }, [runtime, actionScope, input.actionScopePolicy, input.nodeId]);

  const nodeComponentRegistry = useMemo(() => {
    if (input.componentRegistryPolicy !== 'new') {
      return undefined;
    }

    return createNodeOwnedComponentRegistry(runtime, componentRegistry, input.nodeId);
  }, [runtime, componentRegistry, input.componentRegistryPolicy, input.nodeId]);

  const activeActionScope = input.actionScopePolicy === 'new' ? nodeActionScope : actionScope;
  const activeComponentRegistry =
    input.componentRegistryPolicy === 'new' ? nodeComponentRegistry : componentRegistry;

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    activeNodeComponentRegistryRef.current = nodeComponentRegistry;

    return () => {
      const disposedRegistry = nodeComponentRegistry;

      queueMicrotask(() => {
        if (
          !mountedRef.current ||
          activeNodeComponentRegistryRef.current !== disposedRegistry
        ) {
          disposedRegistry?.dispose?.();
        }
      });
    };
  }, [nodeComponentRegistry]);

  return { activeActionScope, activeComponentRegistry };
}
