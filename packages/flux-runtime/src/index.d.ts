import type { ActionContext, ExpressionCompiler, PageStoreApi, RendererEnv, RendererPlugin, RendererRegistry, RendererRuntime, SchemaCompiler } from '@nop-chaos/flux-core';
export { createRendererRegistry, registerRendererDefinitions } from './registry';
export { createSchemaCompiler } from './schema-compiler';
export { createScopeRef } from './scope';
export { createActionScope } from './action-scope';
export { createComponentHandleRegistry } from './component-handle-registry';
export { createFormComponentHandle } from './form-component-handle';
export { createApiCacheStore, resolveCacheKey } from './api-cache';
export { applyRequestAdaptor, applyResponseAdaptor, prepareApiData, buildUrlWithParams } from './request-runtime';
export declare function createRendererRuntime(input: {
    registry: RendererRegistry;
    env: RendererEnv;
    expressionCompiler?: ExpressionCompiler;
    schemaCompiler?: SchemaCompiler;
    plugins?: RendererPlugin[];
    pageStore?: PageStoreApi;
    onActionError?: (error: unknown, ctx: ActionContext) => void;
}): RendererRuntime;
