import { useRef } from 'react';
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
  const nodeActionScopeRef = useRef<{ nodeId: string; scope: ActionScope } | undefined>(undefined);
  const nodeComponentRegistryRef = useRef<{ nodeId: string; registry: ComponentHandleRegistry } | undefined>(undefined);

  if (
    node.component.actionScopePolicy === 'new' &&
    (!nodeActionScopeRef.current || nodeActionScopeRef.current.nodeId !== node.id)
  ) {
    nodeActionScopeRef.current = {
      nodeId: node.id,
      scope: createNodeOwnedActionScope(runtime, actionScope, node)
    };
  }

  if (
    node.component.componentRegistryPolicy === 'new' &&
    (!nodeComponentRegistryRef.current || nodeComponentRegistryRef.current.nodeId !== node.id)
  ) {
    nodeComponentRegistryRef.current = {
      nodeId: node.id,
      registry: createNodeOwnedComponentRegistry(runtime, componentRegistry, node)
    };
  }

  const activeActionScope = node.component.actionScopePolicy === 'new'
    ? nodeActionScopeRef.current?.scope
    : actionScope;
  const activeComponentRegistry = node.component.componentRegistryPolicy === 'new'
    ? nodeComponentRegistryRef.current?.registry
    : componentRegistry;

  return { activeActionScope, activeComponentRegistry };
}
