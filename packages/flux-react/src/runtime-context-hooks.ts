import type { RendererRuntime, ScopeRef } from '@nop-chaos/flux-core';
import { useContext } from 'react';
import { RuntimeContext, ScopeContext, useRequiredContext } from './contexts.js';

export function useRendererRuntimeContext(): RendererRuntime {
  return useRequiredContext(RuntimeContext, 'RendererRuntime');
}

/**
 * Nullable runtime read for graceful degradation (cq-2 Phase 4): returns null
 * instead of throwing when no RendererRuntime provider is mounted — harness
 * renders and partial flux-react mocks included. Supersedes the table
 * package's private RuntimeContext namespace bypass ([G3-R3-视角5-01]).
 */
export function useRendererRuntimeOrNullContext(): RendererRuntime | null {
  return useContext(RuntimeContext);
}

export function useRenderScopeContext(): ScopeRef {
  return useRequiredContext(ScopeContext, 'RenderScope');
}
