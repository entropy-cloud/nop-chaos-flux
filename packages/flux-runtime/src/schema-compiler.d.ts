import type { CompiledValidationNode, ExpressionCompiler, RendererPlugin, RendererRegistry, SchemaCompiler } from '@nop-chaos/flux-core';
export declare function createSchemaCompiler(input: {
    registry: RendererRegistry;
    expressionCompiler?: ExpressionCompiler;
    plugins?: RendererPlugin[];
}): SchemaCompiler;
export declare function createValidationTraversalOrder(nodes: Record<string, CompiledValidationNode>, rootPath: string | undefined): string[];
