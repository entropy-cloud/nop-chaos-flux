import type { RendererDefinition, SchemaRendererProps } from '@nop-chaos/amis-schema';
import { createRendererRegistry } from '@nop-chaos/amis-runtime';

export function createDefaultRegistry(definitions: RendererDefinition[] = []) {
  return createRendererRegistry(definitions);
}

export function createDefaultEnv(input?: Partial<SchemaRendererProps['env']>) {
  return {
    fetcher: async function <T>(api: any) {
      if (typeof api.url === 'string' && api.url.startsWith('/api/')) {
        return {
          ok: true,
          status: 200,
          data: null as T
        };
      }

      return {
        ok: true,
        status: 200,
        data: null as T
      };
    },
    notify: () => undefined,
    ...input
  };
}
