import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EvalContext, RendererEnv, ScopeDependencyCollector } from '@nop-chaos/flux-core';
import { createFormulaCompiler, registerNamespace, resetFormulaRegistry } from './index';
import { evaluateAst } from './evaluator';
import { parseFormula } from './parser';

const env: RendererEnv = {
  fetcher: async <T>() => ({ ok: true, status: 200, data: null as T }),
  notify: () => undefined
};

function createContext(data: Record<string, unknown>, collector?: ScopeDependencyCollector): EvalContext {
  return {
    resolve(path: string) {
      return path.split('.').reduce<unknown>((current, segment) => {
        if (current == null || typeof current !== 'object') {
          return undefined;
        }

        return (current as Record<string, unknown>)[segment];
      }, data);
    },
    has(path: string) {
      return this.resolve(path) !== undefined;
    },
    materialize() {
      return data;
    },
    collector
  };
}

describe('evaluateAst', () => {
  afterEach(() => {
    resetFormulaRegistry();
  });

  it('preserves member-call receivers and supports imported $ aliases', () => {
    createFormulaCompiler();
    registerNamespace('$calc', {
      base: 2,
      add(this: { base: number }, value: number) {
        return this.base + value;
      }
    });

    expect(evaluateAst(parseFormula('$calc.add(3)'), {
      env,
      context: createContext({})
    })).toBe(5);

    expect(evaluateAst(parseFormula('$demo.value'), {
      env,
      context: createContext({}),
      imports: {
        demo: { value: 'imported' }
      }
    })).toBe('imported');
  });

  it('supports lambda shadowing, optional members, instanceof, and dependency collection', () => {
    createFormulaCompiler();
    const collector = {
      recordPath: vi.fn(),
      recordWildcard: vi.fn()
    };

    expect(evaluateAst(parseFormula('ARRAYMAP(items, x => x + tax)[1]'), {
      env,
      context: createContext({ items: [1, 2], tax: 10, x: 100 }, collector)
    })).toBe(12);
    expect(evaluateAst(parseFormula('user?.name'), {
      env,
      context: createContext({ user: null })
    })).toBeUndefined();
    expect(evaluateAst(parseFormula('created instanceof $Ctor'), {
      env,
      context: createContext({ created: new Date() }),
      imports: { Ctor: Date }
    })).toBe(true);

    expect(evaluateAst(parseFormula('missing'), {
      env,
      context: createContext({}, collector)
    })).toBeUndefined();
    expect(collector.recordPath).toHaveBeenCalledWith('items');
    expect(collector.recordPath).toHaveBeenCalledWith('tax');
    expect(collector.recordPath).toHaveBeenCalledWith('missing');
  });

  it('reports and throws on invalid call targets', () => {
    createFormulaCompiler();
    const reportError = vi.fn();

    expect(() => evaluateAst(parseFormula('value()'), {
      env,
      context: createContext({ value: 1 }),
      reportError
    })).toThrow(/Call target is not a function/);

    expect(reportError).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({
      source: 'formula-evaluator'
    }));
  });
});
