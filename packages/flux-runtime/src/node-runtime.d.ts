import type { CompiledNodeRuntimeState, CompiledSchemaNode, ExpressionCompiler, RendererEnv, ResolvedNodeMeta, ResolvedNodeProps, ScopeRef } from '@nop-chaos/flux-core';
export declare function createNodeRuntime(input: {
    expressionCompiler: ExpressionCompiler;
    env: RendererEnv;
}): {
    resolveNodeMeta: (node: CompiledSchemaNode, scope: ScopeRef, state?: CompiledNodeRuntimeState) => ResolvedNodeMeta;
    resolveNodeProps: (node: CompiledSchemaNode, scope: ScopeRef, state?: CompiledNodeRuntimeState) => ResolvedNodeProps;
};
