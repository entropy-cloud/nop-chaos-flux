import { useMemo } from 'react';
import type {
  ActionScope,
  CompiledSchemaNode,
  ComponentHandleRegistry,
  RendererRuntime
} from '@nop-chaos/flux-core';

function createNodeOwnedActionScope(runtime: RendererRuntime, parent: ActionScope | undefined, node: CompiledSchemaNode) {
  return runtime.createActionScope({
    id: `${node.id}:action-scope`,
    parent
  });
}

function createNodeOwnedComponentRegistry(runtime: RendererRuntime, parent: ComponentHandleRegistry | undefined, node: CompiledSchemaNode) {
  return runtime.createComponentHandleRegistry({
    id: `${node.id}:component-registry`,
    parent
  });
}

export function useNodeScopes(
  runtime: RendererRuntime,
  node: CompiledSchemaNode,
  actionScope: ActionScope | undefined,
  componentRegistry: ComponentHandleRegistry | undefined
): {
  activeActionScope: ActionScope | undefined;
  activeComponentRegistry: ComponentHandleRegistry | undefined;
} {
  const nodeActionScope = useMemo(() => {
    if (node.component.actionScopePolicy !== 'new') {
      return undefined;
    }

    return createNodeOwnedActionScope(runtime, actionScope, node);
  }, [runtime, actionScope, node]);

  const nodeComponentRegistry = useMemo(() => {
    if (node.component.componentRegistryPolicy !== 'new') {
      return undefined;
    }

    return createNodeOwnedComponentRegistry(runtime, componentRegistry, node);
  }, [runtime, componentRegistry, node]);

  const activeActionScope = node.component.actionScopePolicy === 'new'
    ? nodeActionScope
    : actionScope;
  const activeComponentRegistry = node.component.componentRegistryPolicy === 'new'
    ? nodeComponentRegistry
    : componentRegistry;

  return { activeActionScope, activeComponentRegistry };
}
