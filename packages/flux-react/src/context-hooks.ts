import { useContext } from 'react';
import type {
  ActionScope,
  ComponentHandleRegistry,
  InstanceFrame,
  ImportFrame,
  PageRuntime,
  RenderNodeMeta,
  StructuralLoopRenderContext,
  SurfaceRuntime,
} from '@nop-chaos/flux-core';
import {
  ActionScopeContext,
  ComponentRegistryContext,
  ImportFrameContext,
  NodeMetaContext,
  PageContext,
  RenderInstancePathContext,
  StructuralLoopContext,
  SurfaceContext,
  useRequiredContext,
} from './contexts.js';

export function useCurrentActionScope(): ActionScope | undefined {
  return useContext(ActionScopeContext);
}

export function useCurrentComponentRegistry(): ComponentHandleRegistry | undefined {
  return useContext(ComponentRegistryContext);
}

export function useCurrentImportFrame(): ImportFrame | undefined {
  return useContext(ImportFrameContext);
}

export function useRenderInstancePath(): readonly InstanceFrame[] | undefined {
  return useContext(RenderInstancePathContext);
}

export function useCurrentPage(): PageRuntime | undefined {
  return useContext(PageContext);
}

export function useCurrentSurfaceRuntime(): SurfaceRuntime | undefined {
  return useContext(SurfaceContext);
}

export function useCurrentNodeMeta(): RenderNodeMeta {
  return useRequiredContext(NodeMetaContext, 'NodeMeta');
}

export function useCurrentNodeInstance() {
  return useContext(NodeMetaContext)?.node ?? undefined;
}

export function useStructuralLoopContext(): StructuralLoopRenderContext | undefined {
  return useContext(StructuralLoopContext);
}
