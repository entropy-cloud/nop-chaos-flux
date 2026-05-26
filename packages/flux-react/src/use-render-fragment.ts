import { useContext, useMemo } from 'react';
import {
  useCurrentActionScope,
  useCurrentComponentRegistry,
  useCurrentPage,
  useCurrentSurfaceRuntime,
} from './context-hooks.js';
import { NodeMetaContext } from './contexts.js';
import { createHelpers } from './helpers.js';
import { useCurrentForm } from './hooks/use-form-hooks.js';
import { useRenderScopeContext, useRendererRuntimeContext } from './runtime-context-hooks.js';

export function useRenderFragment() {
  const runtime = useRendererRuntimeContext();
  const scope = useRenderScopeContext();
  const actionScope = useCurrentActionScope();
  const componentRegistry = useCurrentComponentRegistry();
  const form = useCurrentForm();
  const page = useCurrentPage();
  const surfaceRuntime = useCurrentSurfaceRuntime();
  const nodeMeta = useContext(NodeMetaContext);

  return useMemo(
    () =>
      createHelpers({
        runtime,
        scope,
        actionScope,
        componentRegistry,
        form,
        page,
        surfaceRuntime,
        nodeInstance: nodeMeta?.node ?? undefined,
        dialogId: scope.get('dialogId') as string | undefined,
      }).render,
    [runtime, scope, actionScope, componentRegistry, form, page, surfaceRuntime, nodeMeta],
  );
}
