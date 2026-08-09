import { describe, expect, it, vi } from 'vitest';
import {
  createPrivateEvalScope,
  extractExpressionDepsViaProbe,
  extractFluxScopePaths,
  normalizeFluxExpression,
} from './hooks/use-scada-points-bridge.js';
import { bridgeConfig, expressionCompiler, env } from './scada-points-bridge-test-helpers.js';
import type { ScadaConfig } from '../serialization/config-types.js';

// test-support 引入链含 renderer → engine → leafer-ui；happy-dom 无 canvas 上下文，mock leafer-ui 类。
vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));

describe('flux scope path extraction (漏订阅/过订阅 判定)', () => {
  it('extracts the full path set from config with dedupe + sort (no over/under subscription)', () => {
    const config = bridgeConfig([
      { id: 't1', flux: '${analog.temp}' },
      { id: 't2', flux: '${analog.temp}' },
      { id: 't3', flux: '${plant.pump-1.speed}' },
      { id: 't4', flux: '${analog.pressure}' },
      { id: 'static-1', flux: '' },
    ]);
    const paths = extractFluxScopePaths(config);
    expect(paths).toEqual(['analog.pressure', 'analog.temp', 'plant.pump-1.speed']);
  });

  it('ignores non-flux declarations and missing flux fields', () => {
    const config = {
      version: 1,
      variables: [
        { id: 's1', source: 'static', value: 1 },
        { id: 'e1', source: 'expression', expression: '${s1 * 2}' },
        { id: 'noflux', source: 'flux' },
      ],
      symbols: [],
    } as unknown as ScadaConfig;
    expect(extractFluxScopePaths(config)).toEqual([]);
  });

  it('I18 normalizeFluxExpression 仅接受 ${...} 入口（$xxx 简写不再剥离）', () => {
    // I18 表达式一元化：$xxx 简写已移除，normalizeFluxExpression 不再剥离 $ 前缀。
    // $xxx 直接经 ${$xxx} 包裹 → 视为未知标识符（dollar-without-brace Failure Path）。
    expect(normalizeFluxExpression('${analog.temp}')).toBe('${analog.temp}');
    // 兜底：非 ${ 开头的字符串包裹为 ${<source>}（裸路径仍兼容）。
    expect(normalizeFluxExpression('analog.temp')).toBe('${analog.temp}');
    // $xxx 简写视为普通字符串 → ${$xxx}（求值时 $xxx 是未知标识符 → undefined）。
    expect(normalizeFluxExpression('$analog.temp')).toBe('${$analog.temp}');
  });

  it('I18 bare-path 经 normalizeFluxExpression 兜底为 ${<path>}（兼容裸路径写法）', () => {
    // 裸路径 `analog.temp` 经 normalize 兜底为 `${analog.temp}`，再走平台依赖收集产出订阅路径。
    // 注：platform collector normalize 到根段（flux-core normalizeRootPath），故产出 'analog' 而非 'analog.temp'。
    const config = bridgeConfig([{ id: 't', flux: 'analog.temp' }]);
    const paths = extractFluxScopePaths(config, { compiler: expressionCompiler, env });
    expect(paths).toContain('analog');
  });

  it('I18 `$xxx` 残留（迁移遗漏）→ normalize 为 `${$xxx}` → 视为未知标识符 → 无订阅路径', () => {
    // dollar-without-brace Failure Path 守护：残留 $xxx 不再剥离，normalize 后是未知标识符。
    // 平台依赖收集 normalize 到根段 '$xxx'（合法标识符）→ 入订阅路径，但求值时 undefined。
    // 此用例守护：$xxx 残留不会被静默识别为旧简写（无 silent corruption）。
    const config = bridgeConfig([{ id: 't', flux: '$analog.temp' }]);
    const paths = extractFluxScopePaths(config, { compiler: expressionCompiler, env });
    // $analog.temp 经 normalize 为 ${$analog.temp}；platform collector 把 $analog 当根段标识符 → 订阅 '$analog'
    // （注意：collector normalize 到首个 `.` 之前，故 '$analog.temp' → '$analog'）
    expect(paths.some((p) => p.startsWith('$'))).toBe(true);
  });

  it('complex expressions fall back to text-scan (no deps) when compiler/env are not provided', () => {
    const config = bridgeConfig([{ id: 'temp', flux: '${analog.temp + 1}' }]);
    // 无 compiler/env：复杂表达式无 path 提取（保留既有行为，向后兼容）
    expect(extractFluxScopePaths(config)).toEqual([]);
  });

  it('extracts scope paths for complex expressions via platform dependency collection (WD-2)', () => {
    const config = bridgeConfig([
      { id: 'a', flux: '${analog.temp + 1}' },
      { id: 'b', flux: '${plant.pump.speed * 100}' },
      { id: 'c', flux: '${analog.temp}' },
      { id: 'd', flux: '${analog.humidity}' },
    ]);
    const paths = extractFluxScopePaths(config, { compiler: expressionCompiler, env });
    // 平台依赖收集 normalize 到根段（flux-core normalizeRootPath）：复杂表达式产出根级订阅路径
    // （'analog'、'plant'）；纯路径 ${analog.temp} / $analog.humidity 走既有文本扫描产出全路径。
    // 复杂表达式经根级订阅生效（覆盖该根下任意子路径变更，scopeChangeHitsDependencies 前缀匹配）。
    expect(paths).toEqual(expect.arrayContaining(['analog', 'analog.humidity', 'analog.temp', 'plant']));
  });

  it('extractExpressionDepsViaProbe collects root-level dependencies for arithmetic and member chains', () => {
    // 平台 collector normalize 到根段（normalizeRootPath）——记录所有标识符与成员表达式的 root path。
    // 多标识符表达式（如 `${a + b}`）返回 ['a', 'b']；链式 `${x.y.z}` 返回 ['x']（根段）。
    // plan 2026-08-05-0653-4 C4：probe 返 discriminated result——成功（含 paths）断言 `.status === 'ok'` +
    // `.paths`；compile 失败断言 `.status === 'compile-failed'`；静态表达式（compiled.kind !== 'dynamic'）
    // 返 `{ status: 'ok', paths: [] }`（与 deps-empty 区分：静态表达式不触发诊断）。
    expect(extractExpressionDepsViaProbe(expressionCompiler, env, '${analog.temp + 1}')).toEqual({
      status: 'ok',
      paths: expect.arrayContaining(['analog']),
    });
    expect(extractExpressionDepsViaProbe(expressionCompiler, env, '${plant.pump.speed * 2}')).toEqual({
      status: 'ok',
      paths: expect.arrayContaining(['plant']),
    });
    expect(extractExpressionDepsViaProbe(expressionCompiler, env, '${analog.temp + plant.pump.speed}')).toEqual({
      status: 'ok',
      paths: expect.arrayContaining(['analog', 'plant']),
    });
    // 编译失败的语法 → compile-failed（不抛错；不再塌缩为空 paths）。
    // 注：flux-formula 对形如 `${a +}`/`${@@invalid@@}` 等畸形 `${...}` 一律按 static 字符串字面量处理
    // （不抛 compile 错），故真实 compile-failed 需 mock compiler 触发（见 scada-points-bridge-diagnostics
    // Proof-C4）。此处用 mock compiler 直接断言 compile-failed 状态。
    const throwingCompiler = {
      compileValue: () => {
        throw new Error('syntax error');
      },
    } as unknown as typeof expressionCompiler;
    expect(extractExpressionDepsViaProbe(throwingCompiler, env, '${analog.temp}')).toEqual({
      status: 'compile-failed',
    });
    // 静态表达式 → ok 空集（无 scope 读，不触发 deps-empty 诊断）。
    // flux-formula 把畸形 `${...}`（如 `${a +}`）当 static 字符串字面量——同走 ok 空集分支（不诊断）。
    expect(extractExpressionDepsViaProbe(expressionCompiler, env, 'just a string')).toEqual({
      status: 'ok',
      paths: [],
    });
    expect(extractExpressionDepsViaProbe(expressionCompiler, env, '${a +}')).toEqual({
      status: 'ok',
      paths: [],
    });
  });

  it('the private eval scope satisfies the ScopeRef contract without side effects', () => {
    const scope = createPrivateEvalScope({ a: { b: 1 } });
    expect(scope.get('a.b')).toBe(1);
    expect(scope.has('a.b')).toBe(true);
    expect(scope.has('nope')).toBe(false);
    expect(scope.readOwn()).toEqual({ a: { b: 1 } });
    expect(scope.readVisible()).toEqual({ a: { b: 1 } });
    expect(scope.materializeVisible()).toEqual({ a: { b: 1 } });
    // T6（plan 2026-08-04-2243-3）：负向副作用断言——update/merge 为只读 no-op，
    // 调用后 scope 数据保持不变（不写入）。替代原 not.toThrow() 弱断言。
    scope.update('x', 1);
    scope.merge({ x: 1 });
    expect(scope.readOwn()).toEqual({ a: { b: 1 } });
    expect(scope.get('x')).toBeUndefined();
  });
});
