import type { FormStoreApi, PageStoreApi } from '@nop-chaos/flux-core';
export declare function createFormStore(initialValues: Record<string, any>): FormStoreApi;
export declare function createPageStore(initialData: Record<string, any>): PageStoreApi;
