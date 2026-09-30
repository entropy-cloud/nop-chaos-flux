import { describe, expect, it } from 'vitest';
import type { EvalContext, RendererEnv } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from './index.js';
import { evaluateAst } from './evaluator.js';
import { parseFormula } from './parser.js';

const env: RendererEnv = {
  fetcher: async <T>() => ({ status: 0, data: null as T }),
  notify: () => undefined,
};

const compiler = createFormulaCompiler();

function createContext(data: Record<string, unknown>): EvalContext {
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

/**
 * cq-6 Phase 1 characterisation matrix (plan 2026-09-30-cq-6): pins the exact
 * JS coercion semantics of the binary `+` and relational operators over legal
 * operand types BEFORE the `as any` branches are replaced with explicit
 * typeof normalization. Legal combinations only — illegal (object) operands
 * get their own diagnostics test below.
 */
const OPERANDS: Record<string, unknown> = {
  $num: 2,
  $str: 'a',
  $boolTrue: true,
  $boolFalse: false,
  $nullv: null,
  $undef: undefined,
  $big: 3n,
};

const OPERATOR_CASES: Array<{ op: string; l: string; r: string; expected: unknown }> = [
  // `+`
  { op: '+', l: 'num', r: 'num', expected: 4 },
  { op: '+', l: 'num', r: 'str', expected: '2a' },
  { op: '+', l: 'str', r: 'num', expected: 'a2' },
  { op: '+', l: 'str', r: 'str', expected: 'aa' },
  { op: '+', l: 'num', r: 'boolTrue', expected: 3 },
  { op: '+', l: 'num', r: 'nullv', expected: 2 },
  { op: '+', l: 'num', r: 'undef', expected: Number.NaN },
  // OBSERVED quirk pinned: mixed bigint arithmetic throws TypeError under the current `(as any)` implementation.
  { op: '+', l: 'num', r: 'big', expected: 'THROWS' },
  { op: '+', l: 'big', r: 'big', expected: 6n },
  // relational (string pairs compare lexicographically, everything else numeric)
  { op: '<', l: 'num', r: 'num', expected: false },
  { op: '<', l: 'str', r: 'str', expected: false },
  { op: '<', l: 'str', r: 'num', expected: false }, // JS: either operand non-string → numeric coercion (NaN)
  { op: '<', l: 'num', r: 'str', expected: false },
  { op: '<', l: 'num', r: 'big', expected: true }, // native JS relational bigint comparison
  { op: '<=', l: 'num', r: 'num', expected: true },
  { op: '>', l: 'str', r: 'str', expected: false },
  { op: '>=', l: 'num', r: 'big', expected: false }, // same bigint relational quirk
  { op: '>', l: 'num', r: 'undef', expected: false },
  { op: '<', l: 'num', r: 'boolTrue', expected: false }, // JS: true coerces to 1; 2 < 1 === false
];

describe('binary operator characterisation (cq-6, pre-refactor pin)', () => {
  for (const { op, l, r, expected } of OPERATOR_CASES) {
    it(`${l} ${op} ${r} === ${String(expected)}`, () => {
      const expr = '$' + l + ' ' + op + ' $' + r;
      const ast = parseFormula(expr);
      const run = () =>
        evaluateAst(ast, {
          env,
          context: createContext(OPERANDS),
          registry: compiler.getRegistry?.() ?? undefined,
        });
      if (expected === 'THROWS') {
        expect(run).toThrow(/Cannot mix BigInt/);
        return;
      }
      const result = run();
      if (typeof expected === 'number' && Number.isNaN(expected)) {
        expect(result).toBeNaN();
      } else {
        expect(result).toBe(expected);
      }
    });
  }

  it('does not throw for the whole legal matrix (registry snapshot stable)', () => {
    for (const { op, l, r, expected } of OPERATOR_CASES) {
      if (expected === 'THROWS') continue;
      const expr = '$' + l + ' ' + op + ' $' + r;
      const ast = parseFormula(expr);
      expect(() =>
        evaluateAst(ast, {
          env,
          context: createContext(OPERANDS),
        }),
      ).not.toThrow();
    }
  });
});

describe('illegal operand diagnostics (cq-6, red first)', () => {
  const OBJECTS = { $left: { a: 1 }, $right: { b: 2 }, $arr: [1, 2] };

  function createContextFor(data: Record<string, unknown>): EvalContext {
    return {
      resolve(path: string) {
        return path.split('.').reduce<unknown>((current, segment) => {
          if (current == null || typeof current !== 'object') return undefined;
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

  const ILLEGAL_CASES: Array<{ expr: string; op: string }> = [
    { expr: '$left + $right', op: '+' },
    { expr: '$left < $right', op: '<' },
    { expr: '$arr > $arr', op: '>' },
  ];

  for (const { expr, op } of ILLEGAL_CASES) {
    it(`object operands in ${op} yield undefined with a reported diagnostic`, () => {
      const reported: unknown[] = [];
      const ast = parseFormula(expr);
      const result = evaluateAst(ast, {
        env,
        context: createContextFor(OBJECTS),
        reportError: (error) => reported.push(error),
      });
      expect(result).toBeUndefined();
      expect(reported.length).toBeGreaterThan(0);
      expect(String(reported[0])).toContain(op);
    });
  }
});
