import React, { useMemo } from 'react';
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

type TemplateNodeWithProviderPlan = TemplateNode & {
  providerPlan?: {
    actionScope: boolean;
    componentRegistry: boolean;
    classAliases: boolean;
  };
  providerWrap?: (
    wrapProvider: (kind: string, value: unknown, children: unknown) => unknown,
    values: Record<string, unknown>,
    children: unknown
  ) => unknown;
};

export function NodeRendererProviders(props: React.PropsWithChildren<{
  templateNode: TemplateNode;
  nodeInstance: NodeInstance;
  actionScope?: ActionScope;
  componentRegistry?: ComponentHandleRegistry;
  scope: ScopeRef;
  classAliases?: Record<string, string>;
}>) {
  const providerWrap = (props.templateNode as TemplateNodeWithProviderPlan).providerWrap;
  const children = providerWrap
    ? providerWrap((kind, value, nestedChildren) => {
      if (kind === 'actionScope') {
        return <ActionScopeContext.Provider value={value as ActionScope | undefined}>{nestedChildren as React.ReactNode}</ActionScopeContext.Provider>;
      }

      if (kind === 'componentRegistry') {
        return <ComponentRegistryContext.Provider value={value as ComponentHandleRegistry | undefined}>{nestedChildren as React.ReactNode}</ComponentRegistryContext.Provider>;
      }

      if (kind === 'classAliases') {
        return <ClassAliasesContext.Provider value={value as Record<string, string> | undefined}>{nestedChildren as React.ReactNode}</ClassAliasesContext.Provider>;
      }

      return nestedChildren;
    }, {
      actionScope: props.actionScope,
      componentRegistry: props.componentRegistry,
      classAliases: props.classAliases
    }, props.children)
    : props.children;

  return (
    <NodeMetaContext.Provider value={useMemo(() => ({
      id: props.templateNode.id,
      path: props.templateNode.templatePath,
      type: props.templateNode.rendererType,
      cid: props.nodeInstance.cid,
      templateNode: props.templateNode,
      node: props.nodeInstance
    }), [props.templateNode, props.nodeInstance])}>
      <ScopeContext.Provider value={props.scope}>
        {children as React.ReactNode}
      </ScopeContext.Provider>
    </NodeMetaContext.Provider>
  );
}
