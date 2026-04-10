import React from 'react';
import type {
  ActionScope,
  ComponentHandleRegistry,
  CompiledSchemaNode,
  ScopeRef,
  TemplateNode
} from '@nop-chaos/flux-core';
import {
  ActionScopeContext,
  ClassAliasesContext,
  CompiledNodeContext,
  ComponentRegistryContext,
  NodeInstanceContext,
  NodeMetaContext,
  ScopeContext
} from './contexts';

const PROVIDER_CONTEXTS: Record<string, React.Context<any>> = {
  classAliases: ClassAliasesContext,
  componentRegistry: ComponentRegistryContext,
  actionScope: ActionScopeContext,
};

export function wrapProvider(kind: string, value: unknown, children: unknown): unknown {
  const context = PROVIDER_CONTEXTS[kind];
  if (!context) {
    return children;
  }

  return React.createElement(context.Provider, { value }, children as React.ReactNode);
}

export function NodeRendererProviders(props: React.PropsWithChildren<{
  node: CompiledSchemaNode;
  templateNode: TemplateNode;
  locator: import('@nop-chaos/flux-core').NodeLocator | undefined;
  nodeInstance: import('@nop-chaos/flux-core').NodeInstance;
  actionScope?: ActionScope;
  componentRegistry?: ComponentHandleRegistry;
  scope: ScopeRef;
  classAliases?: Record<string, string>;
}>) {
  const wrappedByPlan = props.node.renderPlan.wrapProviders(
    wrapProvider,
    {
      classAliases: props.classAliases,
      componentRegistry: props.componentRegistry,
      actionScope: props.actionScope,
    },
    props.children
  ) as React.ReactNode;

  return (
    <CompiledNodeContext.Provider value={props.node}>
      <NodeMetaContext.Provider value={{
        id: props.templateNode.id,
        path: props.templateNode.templatePath,
        type: props.templateNode.rendererType,
        locator: props.locator,
        templateNode: props.templateNode,
        node: props.node,
        nodeInstance: props.nodeInstance
      }}>
        <NodeInstanceContext.Provider value={props.nodeInstance}>
          <ScopeContext.Provider value={props.scope}>
            {wrappedByPlan}
          </ScopeContext.Provider>
        </NodeInstanceContext.Provider>
      </NodeMetaContext.Provider>
    </CompiledNodeContext.Provider>
  );
}
