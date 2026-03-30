import type { PageRuntime, PageStoreApi } from '@nop-chaos/flux-core';
export declare function createManagedPageRuntime(input?: {
    data?: Record<string, any>;
    pageStore?: PageStoreApi;
}): PageRuntime;
