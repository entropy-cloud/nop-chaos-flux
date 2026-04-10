import React from 'react';
import type {
  ActionScope,
  ComponentHandleRegistry,
  NodeInstance,
  ScopeRef,
  TemplateNode
} from '@nop-chaos/flux-core';
import {
  ActionScopeContext,
  ClassAliasesContext,
  ComponentRegistryContext,
  NodeMetaContext,
  ScopeContext
} from './contexts';

export function NodeRendererProviders(props: React.PropsWithChildren<{
  templateNode: TemplateNode;
  nodeInstance: NodeInstance;
  actionScope?: ActionScope;
  componentRegistry?: ComponentHandleRegistry;
  scope: ScopeRef;
  classAliases?: Record<string, string>;
}>) {
  const { component, schema } = props.templateNode;
  const publishActionScope = component.actionScopePolicy === 'new';
  const publishComponentRegistry = component.componentRegistryPolicy === 'new';
  const publishClassAliases = Boolean(
    (schema as { classAliases?: Record<string, string> }).classAliases &&
    Object.keys((schema as { classAliases?: Record<string, string> }).classAliases!).length > 0
  );

  let children: React.ReactNode = props.children;

  if (publishActionScope) {
    children = (
      <ActionScopeContext.Provider value={props.actionScope}>
        {children}
      </ActionScopeContext.Provider>
    );
  }

  if (publishComponentRegistry) {
    children = (
      <ComponentRegistryContext.Provider value={props.componentRegistry}>
        {children}
      </ComponentRegistryContext.Provider>
    );
  }

  if (publishClassAliases) {
    children = (
      <ClassAliasesContext.Provider value={props.classAliases}>
        {children}
      </ClassAliasesContext.Provider>
    );
  }

  return (
    <NodeMetaContext.Provider value={{
      id: props.templateNode.id,
      path: props.templateNode.templatePath,
      type: props.templateNode.rendererType,
      cid: props.nodeInstance.cid,
      templateNode: props.templateNode,
      node: props.nodeInstance
    }}>
      <ScopeContext.Provider value={props.scope}>
        {children}
      </ScopeContext.Provider>
    </NodeMetaContext.Provider>
  );
}
