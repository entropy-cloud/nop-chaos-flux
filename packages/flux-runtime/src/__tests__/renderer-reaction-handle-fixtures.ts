import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { compileActions } from '@nop-chaos/flux-compiler';
import { createRendererRuntime } from '../index.js';
import { env, textRenderer } from './test-fixtures.js';

const expressionCompiler = createExpressionCompiler(createFormulaCompiler());

export function makePlan(dependsOn: readonly string[], ignoreWritesTo?: readonly string[]) {
  return {
    action: compileActions(
      { action: 'record' },
      expressionCompiler,
      {},
    ),
    dependsOn,
    ...(ignoreWritesTo ? { ignoreWritesTo } : {}),
  };
}

export function setup() {
  const runtime = createRendererRuntime({
    registry: createRendererRegistry([textRenderer]),
    env,
    expressionCompiler,
  });
  const page = runtime.createPageRuntime({ user: { id: 'u1' }, pagination: { page: 1 } });
  return { runtime, page };
}
