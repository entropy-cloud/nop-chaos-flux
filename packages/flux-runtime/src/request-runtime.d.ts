import type { ExpressionCompiler, ApiObject, FormRuntime, RendererEnv, ScopeRef, SchemaValue } from '@nop-chaos/flux-core';
export declare function extractScopeData(scope: ScopeRef, includeScope: '*' | string[] | undefined): Record<string, unknown>;
export declare function buildUrlWithParams(url: string, params: Record<string, unknown> | undefined): string;
export declare function prepareApiData(api: ApiObject, scope: ScopeRef): {
    data: SchemaValue | undefined;
    params: Record<string, unknown> | undefined;
};
export declare function applyResponseDataPath(currentData: Record<string, any>, dataPath: string, responseData: unknown): Record<string, any>;
export declare function applyRequestAdaptor(expressionCompiler: ExpressionCompiler, api: ApiObject, scope: ScopeRef, env: RendererEnv): ApiObject;
export declare function applyResponseAdaptor(expressionCompiler: ExpressionCompiler, api: ApiObject, responseData: unknown, scope: ScopeRef, env: RendererEnv): unknown;
export declare function createApiRequestExecutor(env: RendererEnv): <T>(actionType: string, api: ApiObject, scope: ScopeRef, form?: FormRuntime) => Promise<import("@nop-chaos/flux-core").ApiResponse<T>>;
