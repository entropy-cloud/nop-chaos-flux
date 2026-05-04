import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EvalContext, RendererEnv, ScopeDependencyCollector } from '@nop-chaos/flux-core';
import {
  createFormulaCompiler,
  registerFunction,
  registerNamespace,
  resetFormulaRegistry,
} from './index';
import { evaluateAst } from './evaluator';
import { parseFormula } from './parser';
import type { FormulaAstNode, IdentifierNode, ObjectExpressionNode, PropertyNode } from './ast';

const env: RendererEnv = {
  fetcher: async <T>() => ({ ok: true, status: 200, data: null as T }),
  notify: () => undefined,
};

function createContext(
  data: Record<string, unknown>,
  collector?: ScopeDependencyCollector,
): EvalContext {
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
    collector,
  };
}

const loc = { start: 0, end: 0 };

function literal(value: unknown): FormulaAstNode {
  return { type: 'Literal', value, raw: JSON.stringify(value), loc } as FormulaAstNode;
}

function identifier(name: string, binding?: IdentifierNode['binding']): FormulaAstNode {
  return { type: 'Identifier', name, binding, loc } as FormulaAstNode;
}

function unary(op: string, argument: FormulaAstNode): FormulaAstNode {
  return { type: 'UnaryExpression', op, argument, loc } as FormulaAstNode;
}

function binary(op: string, left: FormulaAstNode, right: FormulaAstNode): FormulaAstNode {
  return { type: 'BinaryExpression', op, left, right, loc } as FormulaAstNode;
}

function member(
  object: FormulaAstNode,
  property: FormulaAstNode,
  input: { computed?: boolean; optional?: boolean } = {},
): FormulaAstNode {
  return {
    type: 'MemberExpression',
    object,
    property,
    computed: input.computed ?? false,
    optional: input.optional ?? false,
    loc,
  } as FormulaAstNode;
}

function property(key: FormulaAstNode, value: FormulaAstNode, computed = false): PropertyNode {
  return {
    type: 'Property',
    key,
    value,
    computed,
    shorthand: false,
    loc,
  } as PropertyNode;
}

function objectExpression(properties: PropertyNode[]): ObjectExpressionNode {
  return { type: 'ObjectExpression', properties, loc } as ObjectExpressionNode;
}

function call(callee: FormulaAstNode, args: FormulaAstNode[]): FormulaAstNode {
  return { type: 'CallExpression', callee, arguments: args, loc } as FormulaAstNode;
}

function arrow(params: string[], body: FormulaAstNode): FormulaAstNode {
  return {
    type: 'ArrowFunctionExpression',
    params: params.map((name) => ({ type: 'Identifier', name, loc })),
    body,
    loc,
  } as FormulaAstNode;
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
      },
    });

    expect(
      evaluateAst(parseFormula('$calc.add(3)'), {
        env,
        context: createContext({}),
      }),
    ).toBe(5);

    expect(
      evaluateAst(parseFormula('$demo.value'), {
        env,
        context: createContext({
          $demo: { value: 'imported' },
        }),
      }),
    ).toBe('imported');
  });

  it('supports lambda shadowing, optional members, instanceof, and dependency collection', () => {
    createFormulaCompiler();
    const collector = {
      recordPath: vi.fn(),
      recordWildcard: vi.fn(),
    };

    expect(
      evaluateAst(parseFormula('ARRAYMAP(items, x => x + tax)[1]'), {
        env,
        context: createContext({ items: [1, 2], tax: 10, x: 100 }, collector),
      }),
    ).toBe(12);
    expect(
      evaluateAst(parseFormula('user?.name'), {
        env,
        context: createContext({ user: null }),
      }),
    ).toBeUndefined();
    expect(
      evaluateAst(parseFormula('created instanceof $Ctor'), {
        env,
        context: createContext({ created: new Date(), $Ctor: Date }),
      }),
    ).toBe(true);

    expect(
      evaluateAst(parseFormula('missing'), {
        env,
        context: createContext({}, collector),
      }),
    ).toBeUndefined();
    expect(collector.recordPath).toHaveBeenCalledWith('items');
    expect(collector.recordPath).toHaveBeenCalledWith('tax');
    expect(collector.recordPath).toHaveBeenCalledWith('missing');
  });

  it('reports and throws on invalid call targets', () => {
    createFormulaCompiler();
    const reportError = vi.fn();

    expect(() =>
      evaluateAst(parseFormula('value()'), {
        env,
        context: createContext({ value: 1 }),
        reportError,
      }),
    ).toThrow(/Call target is not a function/);

    expect(reportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        source: 'formula-evaluator',
      }),
    );
  });

  it('covers identifier bindings, logical aliases, members, object keys, and callable resolution', () => {
    createFormulaCompiler();
    registerNamespace('TOOLS', { value: 4, label: 'namespace' });
    registerFunction('LAZY_CAPTURE', (...args: Array<() => unknown>) => args.map((arg) => arg()), {
      invoke: 'lazy',
    });
    registerFunction('APPLY2', (fn: (left: number, right: number) => number) => fn(2, 3));

    const collector = {
      recordPath: vi.fn(),
      recordWildcard: vi.fn(),
    };
    const context = createContext(
      {
        plainValue: 'plain',
        libValue: 'library',
        scopeBag: { value: 5 },
        obj: {
          prefix: 'ctx',
          method(this: { prefix: string }, suffix: string) {
            return `${this.prefix}:${suffix}`;
          },
          value: 99,
          dyn: 'dynamic-value',
        },
        propName: 'dyn',
      },
      collector,
    );

    expect(evaluateAst(identifier('TOOLS', 'namespace'), { env, context })).toEqual({
      value: 4,
      label: 'namespace',
    });
    expect(typeof evaluateAst(identifier('SUM'), { env, context })).toBe('function');
    expect(evaluateAst(identifier('plainValue'), { env, context })).toBe('plain');
    expect(evaluateAst(identifier('libValue', 'library'), { env, context })).toBe('library');

    expect(evaluateAst(parseFormula('0 and missing.value'), { env, context })).toBe(0);
    expect(evaluateAst(parseFormula('1 or missing.value'), { env, context })).toBe(1);

    expect(
      evaluateAst(
        objectExpression([
          property(identifier('plainKey'), literal(1)),
          property(literal('fixed'), literal(2)),
          property(identifier('propName'), literal(3), true),
        ]),
        { env, context },
      ),
    ).toEqual({
      plainKey: 1,
      fixed: 2,
      dyn: 3,
    });

    expect(
      evaluateAst(member(identifier('scopeBag', 'scope'), identifier('value')), { env, context }),
    ).toBe(5);
    expect(
      evaluateAst(member(identifier('obj'), identifier('propName'), { computed: true }), {
        env,
        context,
      }),
    ).toBe('dynamic-value');
    expect(
      evaluateAst(member(identifier('missingObj'), identifier('value'), { optional: true }), {
        env,
        context,
      }),
    ).toBeUndefined();
    expect(() =>
      evaluateAst(member(identifier('missingObj'), identifier('value')), { env, context }),
    ).toThrow(/Cannot access member/);

    expect(
      evaluateAst(call(member(identifier('obj'), identifier('method')), [literal('suffix')]), {
        env,
        context,
      }),
    ).toBe('ctx:suffix');
    expect(() =>
      evaluateAst(call(member(identifier('obj'), identifier('value')), []), { env, context }),
    ).toThrow(/Call target is not a function/);
    expect(
      evaluateAst(
        call(identifier('LAZY_CAPTURE'), [binary('+', literal(1), literal(2)), literal(7)]),
        { env, context },
      ),
    ).toEqual([3, 7]);
    expect(
      evaluateAst(
        call(identifier('APPLY2'), [
          arrow(['left', 'right'], binary('+', identifier('left'), identifier('right'))),
        ]),
        { env, context },
      ),
    ).toBe(5);

    expect(collector.recordPath).toHaveBeenCalledWith('plainValue');
    expect(collector.recordPath).toHaveBeenCalledWith('scopeBag.value');
    expect(collector.recordPath).not.toHaveBeenCalledWith('libValue');
  });

  it('reports unsupported unary and binary operators', () => {
    createFormulaCompiler();
    const reportError = vi.fn();

    expect(() =>
      evaluateAst(binary('//', literal(6), literal(3)), {
        env,
        context: createContext({}),
        reportError,
      }),
    ).toThrow(/Unsupported binary operator/);

    expect(() =>
      evaluateAst(unary('typeof', literal(1)), {
        env,
        context: createContext({}),
        reportError,
      }),
    ).toThrow(/Unsupported unary operator/);

    expect(reportError).toHaveBeenCalledTimes(2);
  });

  it('covers remaining expression branches for arrays, nullish, conditionals, and primitive operators', () => {
    createFormulaCompiler();
    const context = createContext({ left: null, right: 'fallback', flag: false });

    expect(evaluateAst(parseFormula('left ?? right'), { env, context })).toBe('fallback');
    expect(evaluateAst(parseFormula('flag ? 1 : 2'), { env, context })).toBe(2);
    expect(evaluateAst(parseFormula('[1, 2, 3]'), { env, context })).toEqual([1, 2, 3]);
    expect(evaluateAst(parseFormula('!0'), { env, context })).toBe(true);
    expect(evaluateAst(parseFormula('~1'), { env, context })).toBe(-2);
    expect(evaluateAst(parseFormula('-3'), { env, context })).toBe(-3);
    expect(evaluateAst(parseFormula('+"4"'), { env, context })).toBe(4);
    expect(evaluateAst(parseFormula('8 / 2'), { env, context })).toBe(4);
    expect(evaluateAst(parseFormula('7 % 4'), { env, context })).toBe(3);
    expect(evaluateAst(parseFormula('2 ** 3'), { env, context })).toBe(8);
    expect(evaluateAst(parseFormula('1 < 2'), { env, context })).toBe(true);
    expect(evaluateAst(parseFormula('2 <= 2'), { env, context })).toBe(true);
    expect(evaluateAst(parseFormula('3 > 2'), { env, context })).toBe(true);
    expect(evaluateAst(parseFormula('3 >= 3'), { env, context })).toBe(true);
    expect(evaluateAst(parseFormula('5 | 2'), { env, context })).toBe(7);
    expect(evaluateAst(parseFormula('5 ^ 1'), { env, context })).toBe(4);
    expect(evaluateAst(parseFormula('6 & 3'), { env, context })).toBe(2);
    expect(evaluateAst(parseFormula('1 << 2'), { env, context })).toBe(4);
    expect(evaluateAst(parseFormula('8 >> 1'), { env, context })).toBe(4);
    expect(evaluateAst(parseFormula('8 >>> 1'), { env, context })).toBe(4);
    expect(evaluateAst(parseFormula('1 == 1'), { env, context })).toBe(true);
    expect(evaluateAst(parseFormula('1 != 2'), { env, context })).toBe(true);
    expect(evaluateAst(parseFormula('1 !== 2'), { env, context })).toBe(true);
    expect(evaluateAst(parseFormula('1 instanceof 3'), { env, context })).toBe(false);
  });

  it('throws when evaluation depth exceeds limit', () => {
    let expr = '1';
    for (let i = 0; i < 300; i++) {
      expr = `(${expr} + 1)`;
    }
    expect(() => evaluateAst(parseFormula(expr), { env, context: createContext({}) })).toThrow(
      /depth limit exceeded/,
    );
  });
});
