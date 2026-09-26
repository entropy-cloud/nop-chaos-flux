import { useCallback } from 'react';
import {
  useCurrentComponentRegistry,
  useRendererEnv,
  useRenderScope,
} from '@nop-chaos/flux-react';
import { createCrudQueryFormId } from './crud-query-form-id.js';
import { useUrlFilterSync } from './use-url-filter-sync.js';

/**
 * crud-side wiring for filter↔URL sync (host-channels contract §5, plan 512
 * L3.5). Reads `env.location` off the renderer env and bridges the embedded
 * query form handle so restored filter values echo in the inputs.
 */
export function useCrudUrlSync(args: {
  schemaSyncLocation: boolean;
  instanceId: string;
  queryStatePath: string;
  componentId: string;
  componentPath: string;
  query: Record<string, unknown>;
  defaultQuery: Record<string, unknown>;
}): void {
  const {
    schemaSyncLocation,
    instanceId,
    queryStatePath,
    componentId,
    componentPath,
    query,
    defaultQuery,
  } = args;
  const scope = useRenderScope();
  const componentRegistry = useCurrentComponentRegistry();
  const urlEnv = useRendererEnv();
  const applyRestoredFilters = useCallback(
    (values: Record<string, unknown>) => {
      const handle = componentRegistry?.resolve({
        componentId: createCrudQueryFormId(componentId, componentPath),
      });
      if (!handle?.capabilities?.hasMethod?.('setValues')) {
        return false;
      }
      void Promise.resolve(
        handle.capabilities.invoke('setValues', { values }, {} as never),
      ).catch(() => false);
      return true;
    },
    [componentRegistry, componentId, componentPath],
  );
  useUrlFilterSync({
    enabled: schemaSyncLocation,
    instanceId,
    location: urlEnv.location,
    scope,
    queryStatePath,
    applyToForm: applyRestoredFilters,
    query,
    defaultQuery,
  });
}
