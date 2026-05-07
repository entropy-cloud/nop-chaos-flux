import type { SchemaRendererProps } from '@nop-chaos/flux-core';
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
    fetcher: async function <T>(api: any) {
      if (typeof api.url === 'string' && api.url.startsWith('/api/')) {
        return {
          ok: true,
          status: 200,
          data: null as T,
        };
      }

      return {
        ok: true,
        status: 200,
        data: null as T,
      };
    },
    notify: () => undefined,
    ...input,
  };
}
