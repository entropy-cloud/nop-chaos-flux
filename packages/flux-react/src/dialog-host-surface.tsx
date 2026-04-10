import React from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
import type {
  ActionScope,
  ComponentHandleRegistry,
  NodeInstance,
  RenderNodeInput,
  ScopeRef,
  TemplateNode
} from '@nop-chaos/flux-core';
import { isSchema, isSchemaArray } from '@nop-chaos/flux-core';
import {
  ActionScopeContext,
  ComponentRegistryContext,
  ScopeContext
} from './contexts';
import { RenderNodes } from './render-nodes';

export interface SurfaceRenderContext {
  scope: ScopeRef;
  actionScope?: ActionScope;
  componentRegistry?: ComponentHandleRegistry;
  ownerNodeInstance?: NodeInstance;
}

function isTemplateNode(input: unknown): input is TemplateNode {
  if (!input || typeof input !== 'object') {
    return false;
  }

  const candidate = input as Partial<TemplateNode>;

  return (
    typeof candidate.templateNodeId === 'number' &&
    typeof candidate.templatePath === 'string' &&
    typeof candidate.type === 'string' &&
    !!candidate.component &&
    !!candidate.schema &&
    !!candidate.regions
  );
}

function isTemplateNodeArray(input: unknown): input is TemplateNode[] {
  return Array.isArray(input) && input.every((item) => isTemplateNode(item));
}

export function useSurfaceScopeSnapshot(scope: ScopeRef) {
  useSyncExternalStoreWithSelector(
    scope.store?.subscribe ?? (() => () => undefined),
    () => scope.read(),
    () => scope.read(),
    (state: unknown) => state,
    Object.is
  );
}

export function SurfaceScopeProviders(props: React.PropsWithChildren<SurfaceRenderContext>) {
  return (
    <ActionScopeContext.Provider value={props.actionScope}>
      <ComponentRegistryContext.Provider value={props.componentRegistry}>
        <ScopeContext.Provider value={props.scope}>
          {props.children}
        </ScopeContext.Provider>
      </ComponentRegistryContext.Provider>
    </ActionScopeContext.Provider>
  );
}

export function renderSurfaceNode(
  node: unknown,
  context: SurfaceRenderContext
): React.ReactNode {
  if (node == null) {
    return null;
  }

  if (typeof node === 'string') {
    return node;
  }

  if (isTemplateNode(node) || isTemplateNodeArray(node) || isSchema(node) || isSchemaArray(node as unknown[])) {
    return (
      <RenderNodes
        input={node as unknown as RenderNodeInput}
        options={{
          scope: context.scope,
          actionScope: context.actionScope,
          componentRegistry: context.componentRegistry,
          ownerNodeInstance: context.ownerNodeInstance
        }}
      />
    );
  }

  return null;
}
