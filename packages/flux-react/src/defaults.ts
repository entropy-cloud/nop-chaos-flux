import type { ExecutableApiRequest, SchemaRendererProps } from '@nop-chaos/flux-core';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { ensureRendererComponent } from './auto-renderer.js';
import type { RendererDefinition } from './react-contracts.js';

export function createDefaultRegistry(definitions: RendererDefinition[] = []) {
  const registry = createRendererRegistry();
  for (const raw of definitions) {
    registry.register(ensureRendererComponent(raw));
  }
  return registry;
}

export function createDefaultEnv(input?: Partial<SchemaRendererProps['env']>) {
  return {
    fetcher: async function <T>(_api: ExecutableApiRequest) {
      // obs-1 (plan 483 Phase 7 batch c): the `/api/` branch previously
      // returned the same shape as the fallthrough (dead condition, misindented)
      // — collapsed into one return. `status: 0` success semantics align with
      // request-runtime.ts:431 (intentional).
      return {
        status: 0,
        data: null as T,
      };
    },
    notify: () => undefined,
    ...input,
  };
}
