import type { RendererDefinition } from '@nop-chaos/flux-core';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaCompiler } from './index';

export function makeCompiler(renderers: RendererDefinition[] = []) {
  return createSchemaCompiler({
    registry: createRendererRegistry(renderers),
    expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
  });
}
