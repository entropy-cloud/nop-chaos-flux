import { createRendererRegistry } from '@nop-chaos/flux-runtime';
export function createDefaultRegistry(definitions = []) {
    return createRendererRegistry(definitions);
}
export function createDefaultEnv(input) {
    return {
        fetcher: async function (api) {
            if (typeof api.url === 'string' && api.url.startsWith('/api/')) {
                return {
                    ok: true,
                    status: 200,
                    data: null
                };
            }
            return {
                ok: true,
                status: 200,
                data: null
            };
        },
        notify: () => undefined,
        ...input
    };
}
