import type { RendererRuntime, ScopeRef } from '@nop-chaos/flux-core';
import { RuntimeContext, ScopeContext, useRequiredContext } from './contexts.js';

export function useRendererRuntimeContext(): RendererRuntime {
  return useRequiredContext(RuntimeContext, 'RendererRuntime');
}

export function useRenderScopeContext(): ScopeRef {
  return useRequiredContext(ScopeContext, 'RenderScope');
}
