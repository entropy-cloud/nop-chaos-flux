import React from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
import type {
  ActionScope,
  ComponentHandleRegistry,
  CompiledSchemaNode,
  RenderNodeInput,
  ScopeRef
} from '@nop-chaos/flux-core';
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
  ownerNode?: CompiledSchemaNode;
  ownerNodeInstance?: unknown;
}

function isCompiledNode(input: unknown): input is CompiledSchemaNode {
  if (!input || typeof input !== 'object') {
    return false;
  }

  const candidate = input as Partial<CompiledSchemaNode>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.path === 'string' &&
    typeof candidate.type === 'string' &&
    !!candidate.component &&
    !!candidate.schema &&
    !!candidate.regions
  );
}

function isCompiledNodeArray(input: unknown): input is CompiledSchemaNode[] {
  return Array.isArray(input) && input.every((item) => isCompiledNode(item));
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

  if (isCompiledNode(node) || isCompiledNodeArray(node)) {
    return (
      <RenderNodes
        input={node as RenderNodeInput}
        options={{
          scope: context.scope,
          actionScope: context.actionScope,
          componentRegistry: context.componentRegistry,
          ownerNode: context.ownerNode,
          ownerNodeInstance: context.ownerNodeInstance as any
        }}
      />
    );
  }

  return String(node);
}
