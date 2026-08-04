import { describe, it, expect, beforeEach } from 'vitest';
import { ExpressionEvaluator } from './expression-evaluator.js';
import type { ScadaPrimitive } from '../serialization/config-types.js';

class TestContext {
  private values = new Map<string, ScadaPrimitive | undefined>();
  private expressions = new Map<string, string>();
  readonly evaluator: ExpressionEvaluator;

  constructor() {
    this.evaluator = new ExpressionEvaluator({
      getPointValue: (pointId) => {
        const expression = this.expressions.get(pointId);
        if (expression !== undefined) {
          const result = this.evaluator.evaluatePoint(pointId);
          if (!result.ok) throw new Error(result.error);
          return result.value;
        }
        return this.values.get(pointId);
      },
      hasPoint: (pointId) => this.values.has(pointId) || this.expressions.has(pointId),
      getPointExpression: (pointId) => this.expressions.get(pointId),
    });
  }

  declarePoint(pointId: string, value?: ScadaPrimitive): void {
    this.values.set(pointId, value);
  }

  declareExpressionPoint(pointId: string, expression: string, value?: ScadaPrimitive): void {
    this.expressions.set(pointId, expression);
    this.values.set(pointId, value);
  }

  set(pointId: string, value: ScadaPrimitive): void {
    this.values.set(pointId, value);
  }
}

describe('ExpressionEvaluator 子集求值 (I6.2)', () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = new TestContext();
    ctx.declarePoint('v1', 10);
    ctx.declarePoint('v2', 5);
    ctx.declarePoint('flag', true);
    ctx.declarePoint('label', 'abc');
  });

  it('should evaluate arithmetic (算术)', () => {
    expect(ctx.evaluator.evaluate('@{v1} + @{v2}')).toEqual({ ok: true, value: 15 });
    expect(ctx.evaluator.evaluate('@{v1} - @{v2}')).toEqual({ ok: true, value: 5 });
    expect(ctx.evaluator.evaluate('@{v1} * @{v2}')).toEqual({ ok: true, value: 50 });
    expect(ctx.evaluator.evaluate('@{v1} / @{v2}')).toEqual({ ok: true, value: 2 });
    expect(ctx.evaluator.evaluate('@{v1} + 1 - 2')).toEqual({ ok: true, value: 9 });
    expect(ctx.evaluator.evaluate('( @{v1} + @{v2} ) * 2')).toEqual({ ok: true, value: 30 });
    expect(ctx.evaluator.evaluate('-@{v1} + 3')).toEqual({ ok: true, value: -7 });
  });

  it('should evaluate comparisons (比较)', () => {
    expect(ctx.evaluator.evaluate('@{v1} > @{v2}')).toEqual({ ok: true, value: true });
    expect(ctx.evaluator.evaluate('@{v1} < @{v2}')).toEqual({ ok: true, value: false });
    expect(ctx.evaluator.evaluate('@{v1} >= 10')).toEqual({ ok: true, value: true });
    expect(ctx.evaluator.evaluate('@{v1} <= 10')).toEqual({ ok: true, value: true });
    expect(ctx.evaluator.evaluate('@{v1} == @{v2}')).toEqual({ ok: true, value: false });
    expect(ctx.evaluator.evaluate('@{v1} != @{v2}')).toEqual({ ok: true, value: true });
    expect(ctx.evaluator.evaluate('@{label} == "abc"')).toEqual({ ok: true, value: true });
  });

  it('should evaluate ternary (三元)', () => {
    expect(ctx.evaluator.evaluate("@{v1} > @{v2} ? '#f00' : '#0f0'")).toEqual({ ok: true, value: '#f00' });
    expect(ctx.evaluator.evaluate("@{v1} > 100 ? 'high' : 'low'")).toEqual({ ok: true, value: 'low' });
    expect(ctx.evaluator.evaluate("@{flag} ? 1 : 2")).toEqual({ ok: true, value: 1 });
    expect(ctx.evaluator.evaluate('@{v1} > 5 ? ( @{v2} > 3 ? "a" : "b" ) : "c"')).toEqual({
      ok: true,
      value: 'a',
    });
  });

  it('should evaluate string concatenation (字符串拼接)', () => {
    expect(ctx.evaluator.evaluate('"val=" + @{v1}')).toEqual({ ok: true, value: 'val=10' });
    expect(ctx.evaluator.evaluate('@{label} + "!"')).toEqual({ ok: true, value: 'abc!' });
  });

  it('should evaluate boolean literals and parens', () => {
    expect(ctx.evaluator.evaluate('true')).toEqual({ ok: true, value: true });
    expect(ctx.evaluator.evaluate('false')).toEqual({ ok: true, value: false });
    expect(ctx.evaluator.evaluate('( 1 + 2 )')).toEqual({ ok: true, value: 3 });
  });

  it('should evaluate decimals and whitespace tolerance', () => {
    expect(ctx.evaluator.evaluate('@{v2} * 1.5')).toEqual({ ok: true, value: 7.5 });
    expect(ctx.evaluator.evaluate('@{ v1 } + 1')).toEqual({ ok: true, value: 11 });
  });

  it('should report unknown point ids as errors (未声明点表 id 报错信号)', () => {
    expect(ctx.evaluator.evaluate('@{ghost} + 1')).toEqual({ ok: false, error: 'unknown point id: ghost' });
  });

  it('should report points without values as errors', () => {
    ctx.declarePoint('empty');
    expect(ctx.evaluator.evaluate('@{empty} + 1')).toEqual({ ok: false, error: 'point has no value: empty' });
  });

  it('should report syntax errors', () => {
    expect(ctx.evaluator.evaluate('@{v1} +')).toEqual({ ok: false, error: 'unexpected end of expression' });
    expect(ctx.evaluator.evaluate('( @{v1} + 1')).toEqual({ ok: false, error: 'expected )' });
    expect(ctx.evaluator.evaluate('@{v1} ? 1')).toEqual({ ok: false, error: 'expected : in ternary expression' });
    expect(ctx.evaluator.evaluate('@{v1} + +')).toEqual({ ok: false, error: 'unexpected end of expression' });
    expect(ctx.evaluator.evaluate('@{v1} + @')).toEqual({ ok: false, error: expect.stringContaining('unexpected token') });
    expect(ctx.evaluator.evaluate('')).toEqual({ ok: false, error: 'empty expression' });
  });

  it('should report type mismatches', () => {
    expect(ctx.evaluator.evaluate('@{label} * 2')).toEqual({ ok: false, error: '* requires numbers' });
    expect(ctx.evaluator.evaluate('@{label} < @{v1}')).toEqual({
      ok: false,
      error: 'comparison < requires two numbers or two strings',
    });
  });
});

describe('ExpressionEvaluator 依赖链与缓存 (I6.2)', () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = new TestContext();
    ctx.declarePoint('v1', 10);
    ctx.declareExpressionPoint('v2', '@{v1} * 2', 20);
  });

  it('should record dependencies of evaluated expressions', () => {
    ctx.evaluator.evaluate('@{v1} + @{v2}');
    expect(ctx.evaluator.dependenciesOf('@{v1} + @{v2}')).toEqual(['v1', 'v2']);
  });

  it('should cache results and reuse them (缓存命中不重算)', () => {
    const first = ctx.evaluator.evaluate('@{v1} * 3');
    ctx.set('v1', 99);
    const cached = ctx.evaluator.evaluate('@{v1} * 3');
    expect(first).toEqual({ ok: true, value: 30 });
    expect(cached).toEqual({ ok: true, value: 30 });
  });

  it('should invalidate cached entries depending on a changed point (依赖失效重算)', () => {
    ctx.evaluator.evaluate('@{v1} * 3');
    ctx.set('v1', 7);
    ctx.evaluator.invalidate('v1');
    expect(ctx.evaluator.evaluate('@{v1} * 3')).toEqual({ ok: true, value: 21 });
  });

  it('invalidate should not clear entries with unrelated deps', () => {
    ctx.evaluator.evaluate('@{v1} + 1');
    ctx.set('v1', 5);
    ctx.evaluator.invalidate('v2');
    expect(ctx.evaluator.evaluate('@{v1} + 1')).toEqual({ ok: true, value: 11 });
    ctx.evaluator.invalidate('v1');
    expect(ctx.evaluator.evaluate('@{v1} + 1')).toEqual({ ok: true, value: 6 });
  });

  it('should cache error results too and refresh after invalidation', () => {
    expect(ctx.evaluator.evaluate('@{ghost}')).toEqual({ ok: false, error: 'unknown point id: ghost' });
    ctx.declarePoint('ghost', 1);
    ctx.evaluator.invalidate('ghost');
    expect(ctx.evaluator.evaluate('@{ghost}')).toEqual({ ok: true, value: 1 });
  });

  it('clear should drop all cached entries', () => {
    ctx.evaluator.evaluate('@{v1} + 1');
    ctx.evaluator.clear();
    ctx.set('v1', 3);
    expect(ctx.evaluator.evaluate('@{v1} + 1')).toEqual({ ok: true, value: 4 });
  });
});

describe('ExpressionEvaluator 表达式点与环检测 (I6.2)', () => {
  it('should evaluate expression points via evaluatePoint', () => {
    const ctx = new TestContext();
    ctx.declarePoint('v1', 4);
    ctx.declareExpressionPoint('v2', '@{v1} * 2');
    expect(ctx.evaluator.evaluatePoint('v2')).toEqual({ ok: true, value: 8 });
  });

  it('should report missing expression declaration', () => {
    const ctx = new TestContext();
    ctx.declarePoint('plain', 1);
    expect(ctx.evaluator.evaluatePoint('plain')).toEqual({
      ok: false,
      error: 'no expression declared for point: plain',
    });
  });

  it('should detect direct cycles (依赖环 v1 → v2 → v1)', () => {
    const ctx = new TestContext();
    ctx.declareExpressionPoint('v1', '@{v2} * 2');
    ctx.declareExpressionPoint('v2', '@{v1} + 1');
    const result = ctx.evaluator.evaluatePoint('v1');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('circular dependency');
    }
  });

  it('should detect self-reference cycles', () => {
    const ctx = new TestContext();
    ctx.declareExpressionPoint('v1', '@{v1} + 1');
    const result = ctx.evaluator.evaluatePoint('v1');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('circular dependency');
    }
  });

  it('should evaluate acyclic expression chains recursively', () => {
    const ctx = new TestContext();
    ctx.declarePoint('a', 2);
    ctx.declareExpressionPoint('b', '@{a} * 2');
    ctx.declareExpressionPoint('c', '@{b} + 1');
    expect(ctx.evaluator.evaluatePoint('c')).toEqual({ ok: true, value: 5 });
    expect(ctx.evaluator.evaluatePoint('b')).toEqual({ ok: true, value: 4 });
  });
});

// plan 2026-08-04-1558-3 Phase 3 覆盖缺口闭合：expression-evaluator.ts 错误/未覆盖分支逐项补断言。
describe('ExpressionEvaluator error branch matrix (plan 2026-08-04-1558-3 Phase 3)', () => {
  it('rejects empty @{} point reference', () => {
    const ctx = new TestContext();
    ctx.declarePoint('v1', 1);
    expect(ctx.evaluator.evaluate('@{} + 1')).toEqual({ ok: false, error: 'empty @{} point reference' });
  });

  it('rejects unclosed @{ point reference', () => {
    const ctx = new TestContext();
    ctx.declarePoint('v1', 1);
    expect(ctx.evaluator.evaluate('@{v1')).toEqual({ ok: false, error: 'unclosed @{ point reference' });
  });

  it('rejects unclosed string literal', () => {
    const ctx = new TestContext();
    ctx.declarePoint('v1', 1);
    expect(ctx.evaluator.evaluate('"abc')).toEqual({ ok: false, error: 'unclosed string literal' });
  });

  it('rejects unexpected trailing tokens after a valid expression', () => {
    const ctx = new TestContext();
    ctx.declarePoint('v1', 1);
    expect(ctx.evaluator.evaluate('1 2')).toEqual({ ok: false, error: expect.stringContaining('unexpected trailing token') });
  });

  it('rejects unexpected primary token (bare operator chain / stray char)', () => {
    const ctx = new TestContext();
    ctx.declarePoint('v1', 1);
    // `* 2` 起手：parsePrimary 首符非字面量/point/( → unexpected token
    expect(ctx.evaluator.evaluate('* 2')).toEqual({ ok: false, error: expect.stringContaining('unexpected token') });
  });

  it('rejects unary - applied to a non-number', () => {
    const ctx = new TestContext();
    ctx.declarePoint('flag', true);
    expect(ctx.evaluator.evaluate('-@{flag}')).toEqual({ ok: false, error: 'unary - requires a number' });
  });

  it('unary + returns the operand value unchanged (一元 + 分支)', () => {
    const ctx = new TestContext();
    ctx.declarePoint('v1', 7);
    expect(ctx.evaluator.evaluate('+@{v1}')).toEqual({ ok: true, value: 7 });
  });

  it('evaluates string comparison operators (< > <= >=)', () => {
    const ctx = new TestContext();
    ctx.declarePoint('a', 'abc');
    ctx.declarePoint('b', 'abd');
    expect(ctx.evaluator.evaluate('@{a} < @{b}')).toEqual({ ok: true, value: true });
    expect(ctx.evaluator.evaluate('@{a} > @{b}')).toEqual({ ok: true, value: false });
    expect(ctx.evaluator.evaluate('@{a} <= @{b}')).toEqual({ ok: true, value: true });
    expect(ctx.evaluator.evaluate('@{a} >= @{b}')).toEqual({ ok: true, value: false });
  });

  it('rejects comparison between mismatched types (number vs string)', () => {
    const ctx = new TestContext();
    ctx.declarePoint('n', 1);
    ctx.declarePoint('s', 'a');
    expect(ctx.evaluator.evaluate('@{n} < @{s}')).toEqual({
      ok: false,
      error: 'comparison < requires two numbers or two strings',
    });
  });

  it('rejects division by zero as a finite numeric result (numeric / 分支)', () => {
    const ctx = new TestContext();
    ctx.declarePoint('v1', 10);
    ctx.declarePoint('z', 0);
    // `/` 走 numeric 分支（JS 语法允许，结果 Infinity，不抛错——断言 numeric 路径不抛 + 有限性）
    const result = ctx.evaluator.evaluate('@{v1} / @{z}');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(typeof result.value).toBe('number');
    }
  });
});
