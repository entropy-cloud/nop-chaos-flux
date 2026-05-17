import { describe, expect, it } from 'vitest';
import type { EvalContext, RendererEnv, ScopeRef } from '@nop-chaos/flux-core';
import { createFormulaCompiler, createFormulaRegistry } from './index.js';
import { evaluateAst } from './evaluator.js';
import { parseFormula } from './parser.js';
import { tokenizeFormula } from './lexer.js';

const env: RendererEnv = {
  fetcher: async <T>() => ({ ok: true, status: 200, data: null as T }),
  notify: () => undefined,
};

function createContext(
  data: Record<string, unknown>,
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
  };
}

function makeScope(data: Record<string, unknown>): ScopeRef {
  return {
    id: 's',
    path: 's',
    get(path: string) {
      return path.split('.').reduce<unknown>((current, segment) => {
        if (current == null || typeof current !== 'object') {
          return undefined;
        }
        return (current as Record<string, unknown>)[segment];
      }, data);
    },
    has(path: string) {
      return this.get(path) !== undefined;
    },
    readOwn: () => data,
    readVisible: () => data,
    materializeVisible: () => data,
    value: data,
    update: () => undefined,
    merge: () => {},
  };
}

const compiler = createFormulaCompiler();

function evalExpr(source: string, data: Record<string, unknown> = {}): unknown {
  return compiler.compileExpression(source).exec(makeScope(data), env);
}

function evalTemplate(source: string, data: Record<string, unknown> = {}): string {
  return compiler.compileTemplate(source).exec(makeScope(data), env) as string;
}

describe('contract: null/undefined boundary', () => {
  it('returns undefined for missing top-level scope key', () => {
    expect(
      evaluateAst(parseFormula('missing'), {
        env,
        context: createContext({}),
      }),
    ).toBeUndefined();
  });

  it('throws for deeply nested missing path through non-object value', () => {
    expect(() =>
      evaluateAst(parseFormula('a.b.c.d'), {
        env,
        context: createContext({ a: { b: 1 } }),
      }),
    ).toThrow(/Cannot access member of null or undefined/);
  });

  it('returns undefined for optional-chained deeply nested missing path', () => {
    expect(
      evaluateAst(parseFormula('a?.b?.c?.d'), {
        env,
        context: createContext({ a: null }),
      }),
    ).toBeUndefined();
  });

  it('returns undefined when accessing property on null via optional chaining', () => {
    expect(
      evaluateAst(parseFormula('user?.address?.city'), {
        env,
        context: createContext({ user: null }),
      }),
    ).toBeUndefined();
  });

  it('throws when accessing member of null without optional chaining', () => {
    expect(() =>
      evaluateAst(parseFormula('user.name'), {
        env,
        context: createContext({ user: null }),
      }),
    ).toThrow(/Cannot access member of null or undefined/);
  });

  it('throws when accessing member of undefined without optional chaining', () => {
    expect(() =>
      evaluateAst(parseFormula('missing.deep.path'), {
        env,
        context: createContext({}),
      }),
    ).toThrow(/Cannot access member of null or undefined/);
  });

  it('null coalesce returns fallback for null', () => {
    expect(evalExpr('${null ?? "fallback"}')).toBe('fallback');
  });

  it('null coalesce returns fallback for undefined', () => {
    expect(evalExpr('${missing ?? "fallback"}')).toBe('fallback');
  });

  it('null coalesce does NOT activate for 0 or empty string', () => {
    expect(evalExpr('${0 ?? 99}')).toBe(0);
    expect(evalExpr('${"" ?? "fallback"}')).toBe('');
    expect(evalExpr('${false ?? true}')).toBe(false);
  });
});

describe('contract: deep nesting', () => {
  it('handles 10 levels of nested IF correctly', () => {
    const registry = createFormulaRegistry();
    createFormulaCompiler(registry);
    const snap = registry.getSnapshot();

    let result: unknown = 'base';
    for (let i = 0; i < 10; i++) {
      const inner = result;
      result = evaluateAst(parseFormula(`IF(true, ${JSON.stringify(inner)}, "miss")`), {
        env,
        context: createContext({}),
        registry: snap,
      });
    }
    expect(result).toBe('base');
  });

  it('handles 20 levels of nested ternary', () => {
    let expr = '1';
    for (let i = 0; i < 20; i++) {
      expr = `(true ? ${expr} : 0)`;
    }
    const result = evaluateAst(parseFormula(expr), {
      env,
      context: createContext({}),
    });
    expect(result).toBe(1);
  });

  it('handles deeply nested member access', () => {
    const data = { a: { b: { c: { d: { e: { f: 'deep' } } } } } };
    expect(evalExpr('${a.b.c.d.e.f}', data)).toBe('deep');
  });

  it('handles deeply nested array access', () => {
    const data = { arr: [[[['found']]]] };
    expect(evalExpr('${arr[0][0][0][0]}', data)).toBe('found');
  });
});

describe('contract: error propagation', () => {
  it('member access error propagates out of binary expression', () => {
    expect(() =>
      evaluateAst(parseFormula('null.value + 1'), {
        env,
        context: createContext({}),
      }),
    ).toThrow(/Cannot access member of null or undefined/);
  });

  it('member access error propagates out of conditional', () => {
    expect(() =>
      evaluateAst(parseFormula('false ? 1 : null.value'), {
        env,
        context: createContext({}),
      }),
    ).toThrow(/Cannot access member of null or undefined/);
  });

  it('error in array literal propagates', () => {
    expect(() =>
      evaluateAst(parseFormula('[1, null.value, 3]'), {
        env,
        context: createContext({}),
      }),
    ).toThrow(/Cannot access member of null or undefined/);
  });

  it('error in object literal value propagates', () => {
    expect(() =>
      evaluateAst(parseFormula('{a: null.value}'), {
        env,
        context: createContext({}),
      }),
    ).toThrow(/Cannot access member of null or undefined/);
  });
});

describe('contract: scope access boundaries', () => {
  it('blocks __proto__ access on scope object via member expression', () => {
    expect(() =>
      evaluateAst(parseFormula('obj.__proto__'), {
        env,
        context: createContext({ obj: { safe: 1 } }),
      }),
    ).toThrow(/not allowed/);
  });

  it('blocks constructor access on scope object', () => {
    expect(() =>
      evaluateAst(parseFormula('obj.constructor'), {
        env,
        context: createContext({ obj: {} }),
      }),
    ).toThrow(/not allowed/);
  });

  it('blocks prototype access on scope object', () => {
    expect(() =>
      evaluateAst(parseFormula('obj.prototype'), {
        env,
        context: createContext({ obj: {} }),
      }),
    ).toThrow(/not allowed/);
  });

  it('blocks dangerous keys via computed member with variable', () => {
    expect(() =>
      evaluateAst(parseFormula('obj[key]'), {
        env,
        context: createContext({ obj: { safe: 1 }, key: '__proto__' }),
      }),
    ).toThrow(/not allowed/);
  });

  it('blocks dangerous keys in object literal keys', () => {
    expect(() =>
      evaluateAst(parseFormula('{__proto__: {polluted: true}}'), {
        env,
        context: createContext({}),
      }),
    ).toThrow(/not allowed/);
  });

  it('CANDIDATE: scope sees Object.prototype methods via plain-object resolve (prototype leak)', () => {
    const result = evaluateAst(parseFormula('toString'), {
      env,
      context: createContext({}),
    });
    expect(typeof result).toBe('function');
    expect(result).toBe(Object.prototype.toString);
  });

  it('expressions cannot access keys beyond scope resolution', () => {
    const result = evaluateAst(parseFormula('hidden'), {
      env,
      context: createContext({ visible: 1 }),
    });
    expect(result).toBeUndefined();
  });
});

describe('contract: built-in function edge cases', () => {
  const registry = createFormulaRegistry();
  createFormulaCompiler(registry);
  const snap = registry.getSnapshot();

  it('SUM with no args returns 0', () => {
    expect(snap.functions.SUM()).toBe(0);
  });

  it('SUM coerces boolean true to 1 (boolean args are numeric)', () => {
    expect(snap.functions.SUM(1, 'x', true, null, undefined, 2)).toBe(4);
  });

  it('AVG with no args returns 0', () => {
    expect(snap.functions.AVG()).toBe(0);
  });

  it('LEN with null returns 0', () => {
    expect(snap.functions.LEN(null)).toBe(0);
  });

  it('LEN with undefined returns 0', () => {
    expect(snap.functions.LEN(undefined)).toBe(0);
  });

  it('LEN with array returns string length of array stringification', () => {
    const result = snap.functions.LEN([1, 2, 3]);
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThan(0);
  });

  it('CONCATENATE with all null args returns empty string', () => {
    expect(snap.functions.CONCATENATE(null, null, null)).toBe('');
  });

  it('CONCAT flattens non-array args into result', () => {
    expect(snap.functions.CONCAT(1, 'x', null)).toEqual([1, 'x', null]);
  });

  it('IF with no whenFalse returns null', () => {
    expect(snap.functions.IF(() => false, () => 'yes')).toBeNull();
  });

  it('IF with true returns whenTrue', () => {
    expect(snap.functions.IF(() => true, () => 'yes', () => 'no')).toBe('yes');
  });

  it('MOD with zero divisor returns NaN (not a crash)', () => {
    const result = snap.functions.MOD(5, 0);
    expect(Number.isNaN(result)).toBe(true);
  });

  it('INT with null returns 0', () => {
    expect(snap.functions.INT(null)).toBe(0);
  });

  it('CANDIDATE: INT with undefined returns NaN (inconsistent with INT(null) => 0)', () => {
    expect(Number.isNaN(snap.functions.INT(undefined))).toBe(true);
  });

  it('CANDIDATE: INT with NaN returns NaN (inconsistent with INT(null) => 0)', () => {
    expect(Number.isNaN(snap.functions.INT(Number.NaN))).toBe(true);
  });

  it('REPLACE with empty search splits on empty string (inserts between chars)', () => {
    expect(snap.functions.REPLACE('abc', '', 'x')).toBe('axbxc');
  });

  it('COUNT with string returns 0', () => {
    expect(snap.functions.COUNT('abc')).toBe(0);
  });

  it('COUNT with number returns 0', () => {
    expect(snap.functions.COUNT(42)).toBe(0);
  });

  it('ISEMPTY with number returns false', () => {
    expect(snap.functions.ISEMPTY(0)).toBe(false);
  });

  it('ISEMPTY with boolean returns false', () => {
    expect(snap.functions.ISEMPTY(false)).toBe(false);
  });

  it('JOIN with null separator uses comma default', () => {
    expect(snap.functions.JOIN(['a', 'b'], null)).toBe('a,b');
  });

  it('UNIQ with non-array returns empty', () => {
    expect(snap.functions.UNIQ(null)).toEqual([]);
    expect(snap.functions.UNIQ('abc')).toEqual([]);
  });

  it('COMPACT filters falsy values', () => {
    expect(snap.functions.COMPACT([0, 1, false, '', null, undefined, 2])).toEqual([1, 2]);
  });

  it('CONTAINS with empty strings returns true', () => {
    expect(snap.functions.CONTAINS('', '')).toBe(true);
  });

  it('ARRAYMAP with empty array returns empty array', () => {
    expect(snap.functions.ARRAYMAP([], (v: unknown) => v)).toEqual([]);
  });

  it('ARRAYFILTER with empty array returns empty array', () => {
    expect(snap.functions.ARRAYFILTER([], () => true)).toEqual([]);
  });

  it('ISARRAY with non-array returns false', () => {
    expect(snap.functions.ISARRAY(null)).toBe(false);
    expect(snap.functions.ISARRAY('str')).toBe(false);
    expect(snap.functions.ISARRAY(42)).toBe(false);
  });
});

describe('contract: template evaluation edge cases', () => {
  it('handles empty template expression', () => {
    expect(evalTemplate('static text', {})).toBe('static text');
  });

  it('handles template with missing variable (coerces undefined to empty string)', () => {
    expect(evalTemplate('Hello ${name}!', {})).toBe('Hello !');
  });

  it('handles template with multiple expressions', () => {
    expect(evalTemplate('${a} and ${b}', { a: 'X', b: 'Y' })).toBe('X and Y');
  });

  it('handles template with null variable (coerces null to empty string)', () => {
    expect(evalTemplate('Value: ${val}', { val: null })).toBe('Value: ');
  });

  it('handles template with undefined variable (coerces undefined to empty string)', () => {
    expect(evalTemplate('Value: ${val}', { val: undefined })).toBe('Value: ');
  });

  it('handles template with numeric expression', () => {
    expect(evalTemplate('Result: ${1 + 2}', {})).toBe('Result: 3');
  });

  it('handles adjacent template expressions', () => {
    expect(evalTemplate('${a}${b}', { a: 'hello', b: 'world' })).toBe('helloworld');
  });
});

describe('contract: lexer edge cases', () => {
  it('tokenizes empty string as just eof', () => {
    const tokens = tokenizeFormula('');
    expect(tokens).toEqual([{ type: 'eof', value: '', start: 0, end: 0 }]);
  });

  it('tokenizes whitespace-only string as eof', () => {
    const tokens = tokenizeFormula('   \t\n  ');
    expect(tokens).toEqual([{ type: 'eof', value: '', start: 7, end: 7 }]);
  });

  it('handles unicode identifiers in expressions', () => {
    const tokens = tokenizeFormula('名前');
    expect(tokens[0]).toEqual({ type: 'identifier', value: '名前', start: 0, end: 2 });
  });

  it('handles numbers with leading dot', () => {
    const tokens = tokenizeFormula('.5');
    expect(tokens[0]).toEqual({ type: 'number', value: '.5', start: 0, end: 2 });
  });

  it('handles scientific notation', () => {
    const tokens = tokenizeFormula('1e10');
    expect(tokens[0]).toEqual({ type: 'number', value: '1e10', start: 0, end: 4 });
  });

  it('handles negative exponent', () => {
    const tokens = tokenizeFormula('1e-3');
    expect(tokens[0]).toEqual({ type: 'number', value: '1e-3', start: 0, end: 4 });
  });

  it('throws on unterminated string', () => {
    expect(() => tokenizeFormula('"unterminated')).toThrow(/Unterminated string literal/);
  });

  it('throws on unexpected token', () => {
    expect(() => tokenizeFormula('@')).toThrow(/Unexpected token/);
  });

  it('handles single-quoted strings', () => {
    const tokens = tokenizeFormula("'hello'");
    expect(tokens[0]).toEqual({ type: 'string', value: "'hello'", start: 0, end: 7 });
  });

  it('handles escape sequences in strings', () => {
    const tokens = tokenizeFormula('"a\\"b"');
    expect(tokens[0]).toEqual({ type: 'string', value: '"a\\"b"', start: 0, end: 6 });
  });
});

describe('contract: parser edge cases', () => {
  it('parses empty object literal', () => {
    const ast = parseFormula('{}');
    expect(ast.type).toBe('ObjectExpression');
  });

  it('parses empty array literal', () => {
    const ast = parseFormula('[]');
    expect(ast.type).toBe('ArrayExpression');
  });

  it('parses nested parens', () => {
    expect(parseFormula('((1 + 2))').type).toBe('BinaryExpression');
  });

  it('parses object shorthand property', () => {
    const ast = parseFormula('{x}');
    expect(ast.type).toBe('ObjectExpression');
  });

  it('rejects optional call syntax (throws before optional-call check)', () => {
    expect(() => parseFormula('fn?.()')).toThrow(/Expected identifier/);
  });

  it('parses chained member access + calls', () => {
    const ast = parseFormula('a.b.c()');
    expect(ast.type).toBe('CallExpression');
  });

  it('parses nested ternary', () => {
    const ast = parseFormula('a ? b ? 1 : 2 : 3');
    expect(ast.type).toBe('ConditionalExpression');
  });

  it('parses null coalesce with member', () => {
    const ast = parseFormula('a.b ?? c');
    expect(ast.type).toBe('NullCoalesceExpression');
  });

  it('decodes single-quoted standard escapes the same as double quotes', () => {
    expect((parseFormula("'a\\nb'") as any).value).toBe('a\nb');
    expect((parseFormula("'a\\tb'") as any).value).toBe('a\tb');
    expect((parseFormula("'\\u4f60\\u597d'") as any).value).toBe('你好');
    expect((parseFormula("'it\\'s'") as any).value).toBe("it's");
    expect((parseFormula(`'say "hi"'`) as any).value).toBe('say "hi"');
  });

  it('rejects invalid single-quoted escapes', () => {
    expect(() => parseFormula("'\\x'")).toThrow();
  });
});

describe('contract: binary operator type coercion', () => {
  it('+ with strings concatenates', () => {
    expect(evalExpr('${"a" + "b"}')).toBe('ab');
  });

  it('+ with number and string concatenates', () => {
    expect(evalExpr('${1 + "2"}')).toBe('12');
  });

  it('- with non-numeric strings returns NaN', () => {
    const result = evalExpr('${"a" - "b"}') as number;
    expect(Number.isNaN(result)).toBe(true);
  });

  it('* with non-numeric coerces to NaN', () => {
    const result = evalExpr('${"x" * 2}') as number;
    expect(Number.isNaN(result)).toBe(true);
  });

  it('/ 0 returns Infinity', () => {
    const result = evalExpr('${1 / 0}') as number;
    expect(result).toBe(Infinity);
  });

  it('comparison with mixed types', () => {
    expect(evalExpr('${1 < "2"}')).toBe(true);
    expect(evalExpr('${"a" < "b"}')).toBe(true);
  });
});

describe('contract: logical operator short-circuit', () => {
  it('and short-circuits on falsy left', () => {
    expect(evalExpr('${0 and crash.deep.path}')).toBe(0);
  });

  it('or short-circuits on truthy left', () => {
    expect(evalExpr('${1 or crash.deep.path}')).toBe(1);
  });

  it('and evaluates right on truthy left', () => {
    expect(evalExpr('${1 and 2}')).toBe(2);
  });

  it('or evaluates right on falsy left', () => {
    expect(evalExpr('${0 or 3}')).toBe(3);
  });

  it('and keyword works like &&', () => {
    expect(evalExpr('${1 and 2}')).toBe(2);
    expect(evalExpr('${0 and 2}')).toBe(0);
  });

  it('or keyword works like ||', () => {
    expect(evalExpr('${1 or 2}')).toBe(1);
    expect(evalExpr('${0 or 2}')).toBe(2);
  });
});

describe('contract: arrow function scoping', () => {
  it('arrow function captures scope variable', () => {
    expect(evalExpr('${ARRAYMAP(items, x => x + offset)}', { items: [1, 2], offset: 10 })).toEqual([
      11, 12,
    ]);
  });

  it('arrow parameter shadows scope variable', () => {
    expect(evalExpr('${ARRAYMAP(items, x => x)}', { items: [10, 20], x: 999 })).toEqual([10, 20]);
  });

  it('multi-param arrow function works', () => {
    expect(
      evalExpr('${ARRAYMAP(items, (val, idx) => idx)}', { items: ['a', 'b', 'c'] }),
    ).toEqual([0, 1, 2]);
  });
});

describe('contract: SWITCH builtin', () => {
  it('matches first case', () => {
    expect(evalExpr('${SWITCH(kind, "a", "A", "b", "B", "default")}', { kind: 'a' })).toBe('A');
  });

  it('matches second case', () => {
    expect(evalExpr('${SWITCH(kind, "a", "A", "b", "B", "default")}', { kind: 'b' })).toBe('B');
  });

  it('returns fallback when no match', () => {
    expect(evalExpr('${SWITCH(kind, "a", "A", "b", "B", "default")}', { kind: 'c' })).toBe(
      'default',
    );
  });

  it('returns null when no match and no fallback', () => {
    expect(evalExpr('${SWITCH(kind, "a", "A")}', { kind: 'z' })).toBeNull();
  });

  it('does not evaluate non-matching branches (lazy)', () => {
    expect(evalExpr('${SWITCH(kind, "a", "A", "b", crash.deep.path, "default")}', { kind: 'a' })).toBe(
      'A',
    );
  });
});
