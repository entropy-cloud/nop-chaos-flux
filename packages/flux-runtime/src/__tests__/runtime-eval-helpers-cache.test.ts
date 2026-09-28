import { describe, expect, it } from 'vitest';
import { createExpressionCompiler } from '@nop-chaos/flux-formula';
import { createRuntimeEvalHelpers } from '../runtime-eval-helpers.js';

const env = {
  fetcher: async <T>() => ({ status: 0, data: null as T }),
  notify: () => undefined,
};

// [perf P1 proof] helpers.evaluate() on raw expression strings used to run the
// full lexer→parser→binder pipeline per call (per row / per cell in tables).
// The compile cache in createFormulaCompiler must make repeat compiles free.
describe('runtime eval helpers string compile caching', () => {
  it('reuses one compiled expression instance for repeated string compiles', () => {
    const compiler = createExpressionCompiler();
    const helpers = createRuntimeEvalHelpers(compiler, () => env as never);

    const first = helpers.compileValue('${a + b}');
    const second = helpers.compileValue('${a + b}');
    const firstNode = (first as { node: { kind: string; compiled?: unknown } }).node;
    const secondNode = (second as { node: { kind: string; compiled?: unknown } }).node;
    expect(firstNode.kind).toBe('expression-node');
    expect(secondNode.compiled).toBe(firstNode.compiled);
  });

  it('returns consistent evaluation results from the cached compile', () => {
    const helpers = createRuntimeEvalHelpers(createExpressionCompiler(), () => env as never);
    const compiled = helpers.compileValue('${40 + 2}');
    expect(helpers.evaluateCompiled(compiled, { id: 'scope' } as never)).toBe(42);
    expect(helpers.evaluateCompiled(compiled, { id: 'scope' } as never)).toBe(42);
  });
});
