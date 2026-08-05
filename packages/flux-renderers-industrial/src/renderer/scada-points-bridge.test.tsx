import React, { useMemo } from 'react';
import { cleanup, render, waitFor, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDefaultEnv } from '@nop-chaos/flux-react';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { PointStore } from '../binding/point-store.js';
import { ReverseIndex } from '../binding/reverse-index.js';
import { DirtyCollector, RefreshPipeline, type ApplyAttrs } from '../binding/dirty-collector.js';
import {
  createPrivateEvalScope,
  extractExpressionDepsViaProbe,
  extractFluxScopePaths,
  normalizeFluxExpression,
  useScadaPointsBridge,
  type ScadaPointsBridgeRuntime,
} from './hooks/use-scada-points-bridge.js';
import { ScadaTestProviders, createScadaTestEnvironment } from '../test-support/renderer-test-support.js';
import type { ScadaConfig } from '../serialization/config-types.js';

// test-support 引入链含 renderer → engine → leafer-ui；happy-dom 无 canvas 上下文，mock leafer-ui 类。
// 注：flux 错误上报 / 去重 / reload-clear / deps-empty 诊断类用例已拆分到
// `scada-points-bridge-diagnostics.test.tsx`（plan 2026-08-05-0653-2 Phase 1 拆分 oversized 文件）。
vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));

const expressionCompiler = createExpressionCompiler(createFormulaCompiler());
const env = createDefaultEnv();

const bridgeConfig = (
  fluxDecls: Array<{ id: string; flux: string }>,
  symbols: ScadaConfig['symbols'] = [
    {
      id: 'rect-1',
      type: 'scada-rect',
      x: 0,
      y: 0,
      bindings: { fill: { expression: "${temp > 30 ? 'hot' : 'cool'}" } },
    },
  ],
): ScadaConfig =>
  ({
    version: 1,
    variables: fluxDecls.map((decl) => ({ ...decl, source: 'flux' })),
    symbols,
  }) as ScadaConfig;

afterEach(() => {
  cleanup();
});

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

interface BridgeProbeHarness {
  applied: Array<Record<string, Record<string, unknown>>>;
  pending: Array<() => void>;
  flush: () => void;
}

function createBridgeProbe(config: ScadaConfig, options?: { enabled?: boolean; harness?: BridgeProbeHarness }) {
  const harness: BridgeProbeHarness = options?.harness ?? { applied: [], pending: [], flush: () => undefined };
  const pendingFlushes = harness.pending;
  harness.flush = () => {
    const flush = pendingFlushes.shift();
    flush?.();
  };

  function PointsBridgeProbe() {
    const { enabled = true } = options ?? {};
    const runtime = useMemo<ScadaPointsBridgeRuntime>(() => {
      const pointStore = new PointStore();
      pointStore.loadDeclarations(config.variables ?? []);
      const reverseIndex = new ReverseIndex(config.symbols, { compiler: expressionCompiler, env });
      const collector = new DirtyCollector({ scheduleTick: () => () => undefined });
      const pipeline = new RefreshPipeline({
        pointStore,
        reverseIndex,
        collector,
        compiler: expressionCompiler,
        env,
        scheduleTick: (cb) => {
          pendingFlushes.push(cb);
          return () => undefined;
        },
      });
      const applyAttrs: ApplyAttrs = (attrs) => {
        harness.applied.push(attrs as Record<string, Record<string, unknown>>);
      };
      return { pointStore, pipeline, applyAttrs };
    }, []);
    useScadaPointsBridge({
      config,
      runtime,
      enabled,
      expressionCompiler,
      env,
      onError: () => undefined,
    });
    return null;
  }

  return { Probe: PointsBridgeProbe, harness };
}

describe('scada-canvas points bridge (I10.3)', () => {
  it('subscribes to extracted scope paths and injects evaluated values into the point store + pipeline', async () => {
    const environment = createScadaTestEnvironment([], { analog: { temp: 25 } });
    const { Probe, harness } = createBridgeProbe(
      bridgeConfig([{ id: 'temp', flux: '${analog.temp}' }]),
    );
    render(
      <ScadaTestProviders environment={environment}>
        <Probe />
      </ScadaTestProviders>,
    );
    await waitFor(() => expect(harness.pending.length).toBeGreaterThan(0));
    harness.flush();
    await waitFor(() => expect(harness.applied.length).toBe(1));
    expect(harness.applied[0]).toEqual({ 'rect-1': { fill: 'cool' } });

    act(() => {
      environment.scope.update('analog.temp', 40);
    });
    await waitFor(() => expect(harness.pending.length).toBeGreaterThan(0));
    harness.flush();
    await waitFor(() => expect(harness.applied.length).toBe(2));
    expect(harness.applied[1]).toEqual({ 'rect-1': { fill: 'hot' } });
  });

  it('complex expression re-evaluates on scope changes (Phase 3 WD-2: platform dep collection)', async () => {
    // 复杂表达式 `${analog.temp + 1}` 的订阅路径由平台依赖收集产出 → useScopeSelector 订阅生效
    const environment = createScadaTestEnvironment([], { analog: { temp: 25 } });
    const { Probe, harness } = createBridgeProbe(
      bridgeConfig(
        [{ id: 'computed', flux: '${analog.temp + 1}' }],
        [
          {
            id: 'rect-1',
            type: 'scada-rect',
            x: 0,
            y: 0,
            bindings: { text: { point: 'computed' } },
          },
        ],
      ),
    );
    render(
      <ScadaTestProviders environment={environment}>
        <Probe />
      </ScadaTestProviders>,
    );
    // 初始求值：25 + 1 = 26
    await waitFor(() => expect(harness.pending.length).toBeGreaterThan(0));
    harness.flush();
    await waitFor(() => expect(harness.applied.length).toBe(1));
    expect(harness.applied[0]).toEqual({ 'rect-1': { text: 26 } });

    // scope 变更触发重新求值（依赖路径 'analog.temp' 由平台收集产出）
    act(() => {
      environment.scope.update('analog.temp', 100);
    });
    await waitFor(() => expect(harness.pending.length).toBeGreaterThan(0));
    harness.flush();
    await waitFor(() => expect(harness.applied.length).toBe(2));
    expect(harness.applied[1]).toEqual({ 'rect-1': { text: 101 } });
  });

  it('clears compiledCache on config change (Phase 3 WD-3: bounded cache lifecycle)', async () => {
    // WD-3：config 变更（含绑定域重载）时 compiledCache 清空——观察编译次数：初次 1 次 + 配置变更
    // 后再次 1 次（cache 已清空），而非累计。多次 scope 变更不重新触发编译（cache 命中）。
    // plan 2026-08-05-2129-3 Phase 2：config 传 symbols:[]（无 binding.expression）——本用例聚焦
    // flux 点 compiledCache 生命周期，binding-expression 探针编译（collectBindingExpressionScopePaths）
    // 由 binding-expression-scope-integration.test.tsx 独立覆盖，此处剥离以保持编译计数可读。
    const environment = createScadaTestEnvironment([], { analog: { temp: 25 } });
    const compileSpy = vi.spyOn(expressionCompiler, 'compileValue');

    let currentConfig: ScadaConfig = bridgeConfig([{ id: 'temp', flux: '${analog.temp}' }], []);

    function ConfigSwitch({ config }: { config: ScadaConfig }) {
      const runtime = useMemo<ScadaPointsBridgeRuntime>(() => {
        const pointStore = new PointStore();
        pointStore.loadDeclarations(config.variables ?? []);
        const reverseIndex = new ReverseIndex(config.symbols);
        const pendingFlushes: Array<() => void> = [];
        const collector = new DirtyCollector({ scheduleTick: () => () => undefined });
        const pipeline = new RefreshPipeline({
          pointStore,
          reverseIndex,
          collector,
          scheduleTick: (cb) => {
            pendingFlushes.push(cb);
            return () => undefined;
          },
        });
        return {
          pointStore,
          pipeline,
          applyAttrs: () => undefined,
        };
      }, [config]);
      useScadaPointsBridge({
        config,
        runtime,
        expressionCompiler,
        env,
        onError: () => undefined,
      });
      return null;
    }

    const { rerender } = render(
      <ScadaTestProviders environment={environment}>
        <ConfigSwitch config={currentConfig} />
      </ScadaTestProviders>,
    );

    // 初次编译：1 次（$analog.temp → ${analog.temp}）
    await waitFor(() => expect(compileSpy).toHaveBeenCalledTimes(1));

    // 多次 scope 变更：cache 命中，编译次数不增加
    act(() => environment.scope.update('analog.temp', 30));
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(compileSpy).toHaveBeenCalledTimes(1);

    // config 变更（新身份）：compiledCache 清空 → 重新编译 1 次
    currentConfig = bridgeConfig([{ id: 'temp', flux: '${analog.temp}' }], []);
    rerender(
      <ScadaTestProviders environment={environment}>
        <ConfigSwitch config={currentConfig} />
      </ScadaTestProviders>,
    );
    await waitFor(() => expect(compileSpy).toHaveBeenCalledTimes(2));

    // 长会话模拟：多次 config 变更，编译次数随变更次数线性增长（cache 每次重置，不累积）
    for (let i = 0; i < 5; i++) {
      currentConfig = bridgeConfig([{ id: 'temp', flux: '${analog.temp}' }], []);
      rerender(
        <ScadaTestProviders environment={environment}>
          <ConfigSwitch config={currentConfig} />
        </ScadaTestProviders>,
      );
    }
    await waitFor(() => expect(compileSpy).toHaveBeenCalledTimes(7));
    compileSpy.mockRestore();
  });

  it('evaluates string and boolean flux values (non-numeric primitives)', async () => {
    const environment = createScadaTestEnvironment([], {
      plant: { mode: 'auto', running: true },
    });
    const { Probe, harness } = createBridgeProbe(
      bridgeConfig(
        [
          { id: 'mode', flux: '${plant.mode}' },
          { id: 'running', flux: '${plant.running}' },
        ],
        [
          {
            id: 'rect-1',
            type: 'scada-rect',
            x: 0,
            y: 0,
            bindings: {
              text: { point: 'mode' },
              visible: { point: 'running' },
            },
          },
        ],
      ),
    );
    render(
      <ScadaTestProviders environment={environment}>
        <Probe />
      </ScadaTestProviders>,
    );
    await waitFor(() => expect(harness.pending.length).toBeGreaterThan(0));
    harness.flush();
    await waitFor(() => expect(harness.applied.length).toBe(1));
    expect(harness.applied[0]).toEqual({ 'rect-1': { text: 'auto', visible: true } });
  });

  it('skips non-primitive flux values (object refs are not point values)', async () => {
    const environment = createScadaTestEnvironment([], {
      plant: { config: { tag: 'pump-1' } },
    });
    // I18: binding 经 flux compiler 求值；用 `point: 'cfg'` 直接读取 cfg 点。
    // cfg 是 object（非 primitive）→ useScadaPointsBridge 跳过 setPointValues → cfg 永不进点表 → binding 不应用。
    const { Probe, harness } = createBridgeProbe(
      bridgeConfig(
        [{ id: 'cfg', flux: '${plant.config}' }],
        [
          {
            id: 'rect-1',
            type: 'scada-rect',
            x: 0,
            y: 0,
            bindings: { text: { point: 'cfg' } },
          },
        ],
      ),
    );
    render(
      <ScadaTestProviders environment={environment}>
        <Probe />
      </ScadaTestProviders>,
    );
    await new Promise((resolve) => setTimeout(resolve, 30));
    // cfg 永不进点表（object 非 primitive）→ text binding 求值得 undefined → 不应用
    expect(harness.applied.length).toBe(0);
  });

  it('does not re-evaluate on unrelated scope paths (fine-grained invalidation, 无订阅风暴)', async () => {
    const environment = createScadaTestEnvironment([], { analog: { temp: 25, humidity: 50 } });
    const { Probe, harness } = createBridgeProbe(
      bridgeConfig([{ id: 'temp', flux: '${analog.temp}' }]),
    );
    render(
      <ScadaTestProviders environment={environment}>
        <Probe />
      </ScadaTestProviders>,
    );
    await waitFor(() => expect(harness.pending.length).toBeGreaterThan(0));
    harness.flush();
    await waitFor(() => expect(harness.applied.length).toBe(1));

    act(() => {
      environment.scope.update('analog.humidity', 80);
    });
    await new Promise((resolve) => setTimeout(resolve, 30));
    // fine-grained 订阅：humidity 不在订阅路径 → scope 快照不变（Object.is）→ 无新帧
    expect(harness.applied.length).toBe(1);

    act(() => {
      environment.scope.update('analog.temp', 31);
    });
    await waitFor(() => expect(harness.pending.length).toBeGreaterThan(0));
    harness.flush();
    await waitFor(() => expect(harness.applied.length).toBe(2));
    expect(harness.applied[1]).toEqual({ 'rect-1': { fill: 'hot' } });
  });

  it('skips evaluation when disabled (fallback behavior)', async () => {
    const environment = createScadaTestEnvironment([], { analog: { temp: 25 } });
    const harness: BridgeProbeHarness = { applied: [], pending: [], flush: () => undefined };
    const { Probe } = createBridgeProbe(bridgeConfig([{ id: 'temp', flux: '${analog.temp}' }]), {
      enabled: false,
      harness,
    });
    render(
      <ScadaTestProviders environment={environment}>
        <Probe />
      </ScadaTestProviders>,
    );
    await new Promise((resolve) => setTimeout(resolve, 30));
    // enabled=false：bridge 主 effect + scope effect 均 early-return，不调度帧、不应用绑定
    expect(harness.applied.length).toBe(0);
  });
});

// plan 2026-08-05-1253-1 Phase 3（open-audit P2-2）：useScadaPointsBridge 快照 generation-memoize +
// 合并优先级（scope 遮蔽 point）契约守护。
// ① 合并优先级（contract lock-in，非 red-on-current）：scope 与 point 同 id 冲突时 scope 遮蔽 point。
// ② generation-memo skip（red-on-current）：scope-only 变更（generation 不变）不重建快照（pointIds 不重调）。
// ③ generation-memo rebuild（回归守护）：point 写入 bump generation → 下次 scope 变更重建快照，新值进入 evalScope。
interface ExposedBridgeHarness {
  applied: Array<Record<string, Record<string, unknown>>>;
  pending: Array<() => void>;
  flush: () => void;
  pointStore: PointStore;
  runtime: ScadaPointsBridgeRuntime;
}

function createExposedBridge(
  config: ScadaConfig,
  symbols: ScadaConfig['symbols'] = [],
  options?: { enabled?: boolean },
): { Probe: React.ReactElement; harness: ExposedBridgeHarness } {
  const applied: Array<Record<string, Record<string, unknown>>> = [];
  const pending: Array<() => void> = [];
  const pointStore = new PointStore();
  pointStore.loadDeclarations(config.variables ?? []);
  const reverseIndex = new ReverseIndex(symbols, { compiler: expressionCompiler, env });
  const collector = new DirtyCollector({ scheduleTick: () => () => undefined });
  const pipeline = new RefreshPipeline({
    pointStore,
    reverseIndex,
    collector,
    compiler: expressionCompiler,
    env,
    scheduleTick: (cb) => {
      pending.push(cb);
      return () => undefined;
    },
  });
  const applyAttrs: ApplyAttrs = (attrs) => {
    applied.push(attrs as Record<string, Record<string, unknown>>);
  };
  const runtime: ScadaPointsBridgeRuntime = { pointStore, pipeline, applyAttrs };
  const flush = () => {
    const f = pending.shift();
    f?.();
  };
  const harness: ExposedBridgeHarness = { applied, pending, flush, pointStore, runtime };

  function PointsBridgeProbe() {
    const { enabled = true } = options ?? {};
    useScadaPointsBridge({
      config,
      runtime,
      enabled,
      expressionCompiler,
      env,
      onError: () => undefined,
    });
    return null;
  }

  return { Probe: <PointsBridgeProbe />, harness };
}

describe('scada-canvas points bridge generation-memoize + merge priority (plan 2026-08-05-1253-1 Phase 3)', () => {
  it('Proof ① (contract lock-in): 同 id point 与 scope 冲突时 scope 遮蔽 point（文档化契约）', async () => {
    // point 'shared' static 值 1；scope 数据 { shared: 2 }；flux point 'r' = ${shared} 应得 2（scope 遮蔽）。
    const environment = createScadaTestEnvironment([], { shared: 2 });
    const config: ScadaConfig = {
      version: 1,
      variables: [
        { id: 'shared', source: 'static', value: 1 },
        { id: 'r', source: 'flux', flux: '${shared}' },
      ],
      symbols: [
        { id: 'rect-1', type: 'scada-rect', x: 0, y: 0, bindings: { text: { point: 'r' } } },
      ],
    } as ScadaConfig;
    const { Probe, harness } = createExposedBridge(config, config.symbols);
    render(<ScadaTestProviders environment={environment}>{Probe}</ScadaTestProviders>);
    await waitFor(() => expect(harness.pending.length).toBeGreaterThan(0));
    harness.flush();
    await waitFor(() => expect(harness.applied.length).toBe(1));
    // evalScope = { ...pointValues(shared:1), ...scopeData(shared:2) } = { shared:2 } → r = 2（scope 遮蔽 point）
    expect(harness.applied[0]).toEqual({ 'rect-1': { text: 2 } });
  });

  it('Proof ② (generation-memo · skip, red-on-current): scope-only 变更不重建快照（pointIds 不重调）', async () => {
    const environment = createScadaTestEnvironment([], { analog: { temp: 25 } });
    const config = bridgeConfig([{ id: 'temp', flux: '${analog.temp}' }]);
    const { Probe, harness } = createExposedBridge(config, [
      {
        id: 'rect-1',
        type: 'scada-rect',
        x: 0,
        y: 0,
        bindings: { fill: { expression: "${temp > 30 ? 'hot' : 'cool'}" } },
      },
    ]);
    render(<ScadaTestProviders environment={environment}>{Probe}</ScadaTestProviders>);
    // 初始求值：snapshot 首次重建
    await waitFor(() => expect(harness.pending.length).toBeGreaterThan(0));
    harness.flush();
    await waitFor(() => expect(harness.applied.length).toBe(1));

    // 清零 pointIds 计数后触发 scope-only 变更（无 point 写入 → generation 不变）
    // I18：pipeline.buildEvalScope 也调 pointIds（构建 eval scope 用），pointIds spy 不能区分
    // bridge snapshot 重建 vs pipeline 内部调用。改 spy `getPointValue`：bridge snapshot 重建唯一调它
    // （pipeline.buildEvalScope 调 getPointState；resolver 在本测试用 expression binding 不调 getPointValue）。
    const getPointValueSpy = vi.spyOn(harness.pointStore, 'getPointValue');
    act(() => {
      environment.scope.update('analog.temp', 40);
    });
    await waitFor(() => expect(harness.pending.length).toBeGreaterThan(0));
    harness.flush();
    await waitFor(() => expect(harness.applied.length).toBe(2));
    // generation-memo：scope-only 变更（generation 不变）复用快照 → getPointValue 不重调。
    // 修复前（无 memo）：每次 scope 变更都全量重建 → getPointValue 被调 → 断言失败（red on current）。
    expect(getPointValueSpy).not.toHaveBeenCalled();
    getPointValueSpy.mockRestore();
  });

  it('Proof ③ (generation-memo · rebuild, 回归守护): point 写入 bump generation → 下次 scope 变更重建快照，新值进入 evalScope', async () => {
    const environment = createScadaTestEnvironment([], { clk: 0 });
    // static point 'base'=1；flux 'clk_reader'=${clk}（订阅 clk，触发 effect 重跑）；
    // flux 'base_reader'=${base}（读 base 合并值）。host 写 base=5（bump generation）后 scope clk 变更
    // 应使 base_reader=5（generation 变化→快照重建→不返回 stale base=1）。
    const config: ScadaConfig = {
      version: 1,
      variables: [
        { id: 'base', source: 'static', value: 1 },
        { id: 'clk_reader', source: 'flux', flux: '${clk}' },
        { id: 'base_reader', source: 'flux', flux: '${base}' },
      ],
      symbols: [
        { id: 'rect-1', type: 'scada-rect', x: 0, y: 0, bindings: { text: { point: 'base_reader' } } },
      ],
    } as ScadaConfig;
    const { Probe, harness } = createExposedBridge(config, config.symbols);
    render(<ScadaTestProviders environment={environment}>{Probe}</ScadaTestProviders>);
    await waitFor(() => expect(harness.pending.length).toBeGreaterThan(0));
    harness.flush();
    await waitFor(() => expect(harness.applied.length).toBe(1));
    // 初始：base=1 → base_reader=1
    expect(harness.applied[0]).toEqual({ 'rect-1': { text: 1 } });

    // host 写入 base=5（generation bump；PointStore 写不经 scope 订阅）
    act(() => {
      harness.pointStore.setPointValue('base', 5);
    });
    // scope clk 变更（订阅路径，触发 effect 重跑）：generation 变化→快照重建→evalScope 含 base=5
    act(() => {
      environment.scope.update('clk', 1);
    });
    await waitFor(() => expect(harness.pending.length).toBeGreaterThan(0));
    harness.flush();
    // generation 变化 → 快照重建 → evalScope.base=5 → base_reader=5（不返回 stale 1）
    await waitFor(() => {
      const last = harness.applied[harness.applied.length - 1];
      expect(last).toEqual({ 'rect-1': { text: 5 } });
    });
  });
});
