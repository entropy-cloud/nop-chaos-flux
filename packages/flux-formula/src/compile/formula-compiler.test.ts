import { describe, expect, it } from 'vitest';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from './formula-compiler.js';
import { createFormulaRegistry } from '../registry.js';
import { createEvalContext } from '../evaluate.js';

const env: RendererEnv = {
  fetcher: async <T>() => ({ status: 0, data: null as T }),
  notify: () => undefined,
};

describe('formula compiler compile cache', () => {
  it('returns the same compiled instance for the same expression source', () => {
    const compiler = createFormulaCompiler();
    const first = compiler.compileExpression('${a + b}');
    const second = compiler.compileExpression('${a + b}');
    expect(second).toBe(first);
  });

  it('returns the same compiled instance for the same template source', () => {
    const compiler = createFormulaCompiler();
    const first = compiler.compileTemplate('hello ${name}');
    const second = compiler.compileTemplate('hello ${name}');
    expect(second).toBe(first);
  });

  it('caches expressions and templates under disjoint keys', () => {
    const compiler = createFormulaCompiler();
    const template = compiler.compileTemplate('hello ${name}');
    const expression = compiler.compileExpression('"hello " + name');
    expect(template.kind).toBe('template');
    expect(expression.kind).toBe('expression');
    expect(compiler.compileExpression('"hello " + name')).toBe(expression);
  });

  it('treats the same options object as one key and fresh options as a miss', () => {
    const compiler = createFormulaCompiler();
    const optionsA = { libraryNames: new Set(['math']) };
    const withA = compiler.compileExpression('${x}', optionsA);
    const withAAgain = compiler.compileExpression('${x}', optionsA);
    const withB = compiler.compileExpression('${x}', { libraryNames: new Set(['stats']) });
    expect(withAAgain).toBe(withA);
    expect(withB).not.toBe(withA);
  });

  it('does not reuse cached forms after the registry mutates', () => {
    const registry = createFormulaRegistry();
    registry.registerFunction('double', (x: number) => x * 2);
    const compiler = createFormulaCompiler(registry);
    const before = compiler.compileExpression('${double(x)}');
    registry.registerFunction('triple', (x: number) => x * 3);
    const after = compiler.compileExpression('${double(x)}');
    expect(after).not.toBe(before);
  });

  it('evicts the oldest entry beyond the cache limit', () => {
    const compiler = createFormulaCompiler();
    const first = compiler.compileExpression('${v0}');
    for (let i = 0; i < 1100; i += 1) {
      compiler.compileExpression(`\${item${i}}`);
    }
    const recompiled = compiler.compileExpression('${v0}');
    expect(recompiled).not.toBe(first);
  });

  it('keeps exec semantics identical across cache hits (static-folded and dynamic)', () => {
    const compiler = createFormulaCompiler();
    const folded = compiler.compileExpression<number>('${1 + 2}');
    expect(folded.exec({} as never, env)).toBe(3);
    expect(compiler.compileExpression<number>('${1 + 2}')).toBe(folded);

    const dynamic = compiler.compileExpression<number>('${a + b}');
    const scope = {
      id: 'test',
      path: 'test',
      value: { a: 1, b: 2 },
      get(path: string) {
        return path.split('.').reduce<unknown>((cur, seg) => {
          if (cur == null || typeof cur !== 'object') return undefined;
          return (cur as Record<string, unknown>)[seg];
        }, { a: 1, b: 2 });
      },
      has(path: string) {
        return this.get(path) !== undefined;
      },
      readOwn: () => ({ a: 1, b: 2 }),
      readVisible: () => ({ a: 1, b: 2 }),
      materializeVisible: () => ({ a: 1, b: 2 }),
      update: () => undefined,
      merge: () => {},
    };
    expect(dynamic.exec(createEvalContext(scope as never), env)).toBe(3);
    expect(compiler.compileExpression<number>('${a + b}').exec(createEvalContext(scope as never), env)).toBe(3);
  });
});
