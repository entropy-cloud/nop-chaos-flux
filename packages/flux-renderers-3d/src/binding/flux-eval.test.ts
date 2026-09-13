import { describe, expect, it } from 'vitest';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createDefaultEnv } from '@nop-chaos/flux-react';
import {
  analyzeBindingSubscriptions,
  createPrivateEvalScope,
  expressionReadsScope,
  extractExpressionDepsViaProbe,
  normalizeBindingExpression,
  probeExpressionPaths,
} from './flux-eval.js';

const compiler = createExpressionCompiler(createFormulaCompiler());
const env = createDefaultEnv();

describe('extractExpressionDepsViaProbe (plan 465 Phase 3, semantics aligned with industrial flux-eval)', () => {
  it('collects root-level dependencies for complex expressions', () => {
    expect(extractExpressionDepsViaProbe(compiler, env, '${analog.temp + 1}')).toEqual({
      status: 'ok',
      paths: expect.arrayContaining(['analog']),
    });
    expect(extractExpressionDepsViaProbe(compiler, env, '${plant.pump.speed * 2}')).toEqual({
      status: 'ok',
      paths: expect.arrayContaining(['plant']),
    });
    expect(
      extractExpressionDepsViaProbe(compiler, env, '${analog.temp + plant.pump.speed}'),
    ).toEqual({
      status: 'ok',
      paths: expect.arrayContaining(['analog', 'plant']),
    });
  });

  it('returns ok with empty paths for static expressions (no diagnostics)', () => {
    expect(extractExpressionDepsViaProbe(compiler, env, 'just a string')).toEqual({
      status: 'ok',
      paths: [],
    });
    // flux-formula 把畸形 `${...}`（如 `${a +}`）当 static 字符串字面量——同走 ok 空集分支（不诊断）。
    expect(extractExpressionDepsViaProbe(compiler, env, '${a +}')).toEqual({
      status: 'ok',
      paths: [],
    });
  });

  it('reports compile-failed via discriminated result when compilation throws', () => {
    const throwingCompiler = {
      compileValue: () => {
        throw new Error('syntax error');
      },
    } as unknown as typeof compiler;
    expect(extractExpressionDepsViaProbe(throwingCompiler, env, '${analog.temp}')).toEqual({
      status: 'compile-failed',
    });
  });

  it('reports create-state-failed when createState throws', () => {
    const failingCompiler = {
      compileValue: () => ({ kind: 'static' }),
      createState: () => {
        throw new Error('no state');
      },
    } as unknown as typeof compiler;
    // static kind short-circuits before createState; force dynamic shape
    const dynamicCompiler = {
      compileValue: () => ({ kind: 'dynamic' }),
      createState: () => {
        throw new Error('no state');
      },
    } as unknown as typeof compiler;
    expect(extractExpressionDepsViaProbe(failingCompiler, env, '${a}')).toEqual({
      status: 'ok',
      paths: [],
    });
    expect(extractExpressionDepsViaProbe(dynamicCompiler, env, '${a}')).toEqual({
      status: 'create-state-failed',
    });
  });

  it('reports evaluate-failed when probe evaluation throws', () => {
    const dynamicState = { root: { kind: 'leaf-state', initialized: false } };
    const failingCompiler = {
      compileValue: () => ({ kind: 'dynamic' }),
      createState: () => dynamicState,
      evaluateWithState: () => {
        throw new Error('boom');
      },
    } as unknown as typeof compiler;
    expect(extractExpressionDepsViaProbe(failingCompiler, env, '${a}')).toEqual({
      status: 'evaluate-failed',
    });
  });

  it('reports deps-empty when root is not leaf-state, wildcard, or has no paths', () => {
    const cases = [
      { root: { kind: 'object-state', initialized: false, entries: {} } },
      { root: { kind: 'leaf-state', initialized: false, dependencies: { wildcard: true, paths: [] } } },
      { root: { kind: 'leaf-state', initialized: false, dependencies: { wildcard: false, paths: [] } } },
      { root: { kind: 'leaf-state', initialized: false } },
    ];
    for (const state of cases) {
      const failingCompiler = {
        compileValue: () => ({ kind: 'dynamic' }),
        createState: () => state,
        evaluateWithState: () => ({ value: 1, changed: true, reusedReference: false }),
      } as unknown as typeof compiler;
      expect(extractExpressionDepsViaProbe(failingCompiler, env, '${a}')).toEqual({
        status: 'deps-empty',
      });
    }
  });

  it('returns ok with collected paths from leaf-state dependencies', () => {
    const state = {
      root: {
        kind: 'leaf-state',
        initialized: true,
        dependencies: { wildcard: false, paths: ['sceneState', 'sceneState.valve'] },
      },
    };
    const stubCompiler = {
      compileValue: () => ({ kind: 'dynamic' }),
      createState: () => state,
      evaluateWithState: () => ({ value: 1, changed: true, reusedReference: false }),
    } as unknown as typeof compiler;
    expect(extractExpressionDepsViaProbe(stubCompiler, env, '${sceneState.valve}')).toEqual({
      status: 'ok',
      paths: ['sceneState', 'sceneState.valve'],
    });
  });
});

describe('analyzeBindingSubscriptions', () => {
  it('extracts exact paths for simple-path expressions and root paths for complex ones', () => {
    const bindings = [
      { source: { expression: '${sceneState.valve1.open}' } },
      { source: { expression: '${sceneState.valve1.open + 1}' } },
      { source: { expression: '${dataSources.tank / 100}' } },
    ];
    const result = analyzeBindingSubscriptions(bindings, { compiler, env });
    expect(result.paths).toEqual(
      expect.arrayContaining(['sceneState.valve1.open', 'sceneState', 'dataSources']),
    );
    expect(result.paths).toEqual([...result.paths].sort());
    expect(result.depsEmptyExpressions).toEqual([]);
  });

  it('normalizes bare paths and unwrapped expressions through the ${} entry', () => {
    const result = analyzeBindingSubscriptions([{ source: { expression: 'sceneState.temp' } }], {
      compiler,
      env,
    });
    // bare path wraps to ${sceneState.temp} → simple-path branch → exact path
    expect(result.paths).toContain('sceneState.temp');
  });

  it('collects deps-empty suspect expressions (reads scope but collector returns no deps)', () => {
    // 数学库/全局名表达式：含标识符（expressionReadsScope 真），依赖收集依赖平台库表。
    // 若平台把 Math 视为非 scope 依赖，则 probe 返 deps-empty → 入嫌疑集。
    const result = analyzeBindingSubscriptions([{ source: { expression: '${Math.PI}' } }], {
      compiler,
      env,
    });
    if (result.paths.length === 0) {
      expect(result.depsEmptyExpressions).toEqual(['${Math.PI}']);
    } else {
      expect(result.depsEmptyExpressions).toEqual([]);
    }
  });

  it('does not flag literal-only expressions as deps-empty suspects', () => {
    const result = analyzeBindingSubscriptions([{ source: { expression: '${1 + 2}' } }], {
      compiler,
      env,
    });
    // ${1 + 2} 求值为静态或无 scope 读 → 不入嫌疑集（expressionReadsScope 排除纯字面量/运算符）。
    expect(result.depsEmptyExpressions).toEqual([]);
  });
});

describe('expressionReadsScope / normalizeBindingExpression', () => {
  it('detects identifiers (heuristic includes global names like Math)', () => {
    expect(expressionReadsScope('sceneState.temp')).toBe(true);
    expect(expressionReadsScope('Math.PI')).toBe(true);
    expect(expressionReadsScope('1 + 2')).toBe(false);
    expect(expressionReadsScope('')).toBe(false);
  });

  it('normalizes to the ${} entry without stripping $-prefixed identifiers', () => {
    expect(normalizeBindingExpression('${a.b}')).toBe('${a.b}');
    expect(normalizeBindingExpression('a.b')).toBe('${a.b}');
    expect(normalizeBindingExpression(' a.b ')).toBe('${a.b}');
  });
});

describe('branch micro-supplement', () => {
  it('probeExpressionPaths returns [] when probe fails (compile-failed stub)', () => {
    const throwing = {
      compileValue: () => {
        throw new Error('nope');
      },
    } as unknown as typeof compiler;
    expect(probeExpressionPaths('${a.b}', { compiler: throwing, env })).toEqual([]);
  });

  it('analyzeBindingSubscriptions skips entries that are not expressions at all', () => {
    // 空表达式 normalize 后为 ${} —— direct 匹配空串失败 → continue
    const result = analyzeBindingSubscriptions([{ source: { expression: '' } }]);
    expect(result.paths).toEqual([]);
    expect(result.depsEmptyExpressions).toEqual([]);
  });
});

describe('createPrivateEvalScope', () => {
  it('satisfies the read-only ScopeRef contract', () => {
    const scope = createPrivateEvalScope({ a: { b: 1 } });
    expect(scope.get('a.b')).toBe(1);
    expect(scope.has('a.b')).toBe(true);
    expect(scope.has('nope')).toBe(false);
    expect(scope.readOwn()).toEqual({ a: { b: 1 } });
    expect(scope.readVisible()).toEqual({ a: { b: 1 } });
    expect(scope.materializeVisible()).toEqual({ a: { b: 1 } });
    scope.update('x', 1);
    scope.merge({ x: 1 });
    expect(scope.readOwn()).toEqual({ a: { b: 1 } });
    expect(scope.get('x')).toBeUndefined();
  });
});

describe('analyzeBindingSubscriptions deps-empty branch (deterministic stub)', () => {
  it('flags complex deps-empty expressions that read scope', () => {
    const stubCompiler = {
      compileValue: () => ({ kind: 'dynamic' }),
      createState: () => ({ root: { kind: 'leaf-state', initialized: true, dependencies: { wildcard: false, paths: [] } } }),
      evaluateWithState: () => ({ value: 1, changed: true, reusedReference: false }),
    } as unknown as typeof compiler;
    const result = analyzeBindingSubscriptions(
      [{ source: { expression: '${some.fn(sceneState.a)}' } }],
      { compiler: stubCompiler as never, env },
    );
    expect(result.paths).toEqual([]);
    expect(result.depsEmptyExpressions).toEqual(['${some.fn(sceneState.a)}']);
  });

  it('keeps deps-empty silent when no compiler/env provided', () => {
    const result = analyzeBindingSubscriptions([{ source: { expression: '${some.fn(a)}' } }]);
    expect(result.paths).toEqual([]);
    expect(result.depsEmptyExpressions).toEqual([]);
  });
});
