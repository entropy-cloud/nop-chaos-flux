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
  extractFluxRefs,
  extractFluxScopePaths,
  normalizeFluxExpression,
  useScadaPointsBridge,
  type ScadaPointsBridgeRuntime,
} from './hooks/use-scada-points-bridge.js';
import { ScadaTestProviders, createScadaTestEnvironment } from '../test-support/renderer-test-support.js';
import type { ScadaConfig } from '../serialization/config-types.js';

// test-support 引入链含 renderer → engine → leafer-ui；happy-dom 无 canvas 上下文，mock leafer-ui 类。
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
      bindings: { fill: { expression: "@{temp} > 30 ? 'hot' : 'cool'" } },
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
  it('extracts $xxx and $xxx.yyy references from flux point declarations', () => {
    expect(extractFluxRefs('$analog.temp')).toEqual(['analog.temp']);
    expect(extractFluxRefs('$a + $b.c * 2')).toEqual(['a', 'b.c']);
    expect(extractFluxRefs('${analog.temp}')).toEqual([]);
  });

  it('extracts the full path set from config with dedupe + sort (no over/under subscription)', () => {
    const config = bridgeConfig([
      { id: 't1', flux: '$analog.temp' },
      { id: 't2', flux: '$analog.temp' },
      { id: 't3', flux: '$plant.pump-1.speed' },
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
        { id: 'e1', source: 'expression', expression: '@{s1} * 2' },
        { id: 'noflux', source: 'flux' },
      ],
      symbols: [],
    } as unknown as ScadaConfig;
    expect(extractFluxScopePaths(config)).toEqual([]);
  });

  it('normalizes scada $xxx shorthand into platform ${...} expression syntax', () => {
    expect(normalizeFluxExpression('$analog.temp')).toBe('${analog.temp}');
    expect(normalizeFluxExpression('${analog.temp}')).toBe('${analog.temp}');
    expect(normalizeFluxExpression('$a.b')).toBe('${a.b}');
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
      { id: 'd', flux: '$analog.humidity' },
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
    expect(extractExpressionDepsViaProbe(expressionCompiler, env, '${analog.temp + 1}')).toContain('analog');
    expect(extractExpressionDepsViaProbe(expressionCompiler, env, '${plant.pump.speed * 2}')).toContain('plant');
    expect(extractExpressionDepsViaProbe(expressionCompiler, env, '${analog.temp + plant.pump.speed}')).toEqual(
      expect.arrayContaining(['analog', 'plant']),
    );
    // 编译失败的语法 → 空集（不抛错）
    expect(extractExpressionDepsViaProbe(expressionCompiler, env, '${@@invalid@@}')).toEqual([]);
    // 静态表达式 → 空集
    expect(extractExpressionDepsViaProbe(expressionCompiler, env, 'just a string')).toEqual([]);
  });

  it('the private eval scope satisfies the ScopeRef contract without side effects', () => {
    const scope = createPrivateEvalScope({ a: { b: 1 } });
    expect(scope.get('a.b')).toBe(1);
    expect(scope.has('a.b')).toBe(true);
    expect(scope.has('nope')).toBe(false);
    expect(scope.readOwn()).toEqual({ a: { b: 1 } });
    expect(scope.readVisible()).toEqual({ a: { b: 1 } });
    expect(scope.materializeVisible()).toEqual({ a: { b: 1 } });
    expect(() => scope.update('x', 1)).not.toThrow();
    expect(() => scope.merge({ x: 1 })).not.toThrow();
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
      const reverseIndex = new ReverseIndex(config.symbols);
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
      bridgeConfig([{ id: 'temp', flux: '$analog.temp' }]),
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
    const environment = createScadaTestEnvironment([], { analog: { temp: 25 } });
    const compileSpy = vi.spyOn(expressionCompiler, 'compileValue');

    let currentConfig: ScadaConfig = bridgeConfig([{ id: 'temp', flux: '$analog.temp' }]);

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
    currentConfig = bridgeConfig([{ id: 'temp', flux: '$analog.temp' }]);
    rerender(
      <ScadaTestProviders environment={environment}>
        <ConfigSwitch config={currentConfig} />
      </ScadaTestProviders>,
    );
    await waitFor(() => expect(compileSpy).toHaveBeenCalledTimes(2));

    // 长会话模拟：多次 config 变更，编译次数随变更次数线性增长（cache 每次重置，不累积）
    for (let i = 0; i < 5; i++) {
      currentConfig = bridgeConfig([{ id: 'temp', flux: '$analog.temp' }]);
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
          { id: 'mode', flux: '$plant.mode' },
          { id: 'running', flux: '$plant.running' },
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
    const { Probe, harness } = createBridgeProbe(
      bridgeConfig([{ id: 'cfg', flux: '$plant.config' }]),
    );
    render(
      <ScadaTestProviders environment={environment}>
        <Probe />
      </ScadaTestProviders>,
    );
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(harness.pending.length).toBe(0);
    expect(harness.applied.length).toBe(0);
  });

  it('does not re-evaluate on unrelated scope paths (fine-grained invalidation, 无订阅风暴)', async () => {
    const environment = createScadaTestEnvironment([], { analog: { temp: 25, humidity: 50 } });
    const { Probe, harness } = createBridgeProbe(
      bridgeConfig([{ id: 'temp', flux: '$analog.temp' }]),
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
    expect(harness.pending.length).toBe(0);
    expect(harness.applied.length).toBe(1);

    act(() => {
      environment.scope.update('analog.temp', 31);
    });
    await waitFor(() => expect(harness.pending.length).toBeGreaterThan(0));
    harness.flush();
    await waitFor(() => expect(harness.applied.length).toBe(2));
    expect(harness.applied[1]).toEqual({ 'rect-1': { fill: 'hot' } });
  });

  it('reports flux-evaluate-failed through onError', async () => {
    const environment = createScadaTestEnvironment([], { analog: { temp: 25 } });
    const errors: Array<{ code: string; message: string }> = [];
    const pendingFlushes: Array<() => void> = [];
    const pointStore = new PointStore();
    const config = bridgeConfig([{ id: 'temp', flux: '$analog.temp' }]);
    pointStore.loadDeclarations(config.variables ?? []);
    const runtime: ScadaPointsBridgeRuntime = {
      pointStore,
      pipeline: new RefreshPipeline({
        pointStore,
        reverseIndex: new ReverseIndex(config.symbols),
        collector: new DirtyCollector({ scheduleTick: () => () => undefined }),
        scheduleTick: (cb) => {
          pendingFlushes.push(cb);
          return () => undefined;
        },
      }),
      applyAttrs: () => undefined,
    };
    const failingEvaluateCompiler = {
      compileValue: () => ({ kind: 'static', value: 1 }),
      evaluateValue: () => {
        throw 'evaluation boom';
      },
    } as unknown as typeof expressionCompiler;
    function Probe() {
      useScadaPointsBridge({
        config,
        runtime,
        expressionCompiler: failingEvaluateCompiler,
        env,
        onError: (code, message) => errors.push({ code, message }),
      });
      return null;
    }
    render(
      <ScadaTestProviders environment={environment}>
        <Probe />
      </ScadaTestProviders>,
    );
    await waitFor(() => expect(errors.length).toBeGreaterThan(0));
    expect(errors[0].code).toBe('flux-evaluate-failed');
    expect(errors[0].message).toContain('evaluation boom');
    expect(pendingFlushes.length).toBe(0);
  });

  it('skips evaluation when disabled (fallback behavior)', async () => {
    const environment = createScadaTestEnvironment([], { analog: { temp: 25 } });
    const harness: BridgeProbeHarness = { applied: [], pending: [], flush: () => undefined };
    const { Probe } = createBridgeProbe(bridgeConfig([{ id: 'temp', flux: '$analog.temp' }]), {
      enabled: false,
      harness,
    });
    render(
      <ScadaTestProviders environment={environment}>
        <Probe />
      </ScadaTestProviders>,
    );
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(harness.pending.length).toBe(0);
    expect(harness.applied.length).toBe(0);
  });

  it('reports flux-compile-failed through onError and skips the broken declaration', async () => {
    const environment = createScadaTestEnvironment([], { analog: { temp: 25 } });
    const errors: Array<{ code: string; message: string }> = [];
    const pendingFlushes: Array<() => void> = [];
    const pointStore = new PointStore();
    const config = bridgeConfig([{ id: 'temp', flux: '$analog.temp' }]);
    pointStore.loadDeclarations(config.variables ?? []);
    const runtime: ScadaPointsBridgeRuntime = {
      pointStore,
      pipeline: new RefreshPipeline({
        pointStore,
        reverseIndex: new ReverseIndex(config.symbols),
        collector: new DirtyCollector({ scheduleTick: () => () => undefined }),
        scheduleTick: (cb) => {
          pendingFlushes.push(cb);
          return () => undefined;
        },
      }),
      applyAttrs: () => undefined,
    };
    const failingCompiler = {
      compileValue: () => {
        throw 'bad flux syntax';
      },
    } as unknown as typeof expressionCompiler;
    function Probe() {
      useScadaPointsBridge({
        config,
        runtime,
        expressionCompiler: failingCompiler,
        env,
        onError: (code, message) => errors.push({ code, message }),
      });
      return null;
    }
    render(
      <ScadaTestProviders environment={environment}>
        <Probe />
      </ScadaTestProviders>,
    );
    await waitFor(() => expect(errors.length).toBeGreaterThan(0));
    expect(errors[0].code).toBe('flux-compile-failed');
    expect(errors[0].message).toContain('bad flux syntax');
    expect(pendingFlushes.length).toBe(0);
  });

  it('dedupes flux error reports per expression until that declaration evaluates successfully, then recovers (P1-8)', async () => {
    const environment = createScadaTestEnvironment([], { analog: { temp: null } });
    const errors: Array<{ code: string; message: string }> = [];
    const pendingFlushes: Array<() => void> = [];
    const applied: Array<Record<string, Record<string, unknown>>> = [];
    const pointStore = new PointStore();
    const config = bridgeConfig([{ id: 'temp', flux: '$analog.temp.value' }], [
      {
        id: 'rect-1',
        type: 'scada-rect',
        x: 0,
        y: 0,
        text: 'init',
        bindings: { text: { point: 'temp' } },
      },
    ]);
    pointStore.loadDeclarations(config.variables ?? []);
    const runtime: ScadaPointsBridgeRuntime = {
      pointStore,
      pipeline: new RefreshPipeline({
        pointStore,
        reverseIndex: new ReverseIndex(config.symbols),
        collector: new DirtyCollector({ scheduleTick: () => () => undefined }),
        scheduleTick: (cb) => {
          pendingFlushes.push(cb);
          return () => undefined;
        },
      }),
      applyAttrs: (attrs) => applied.push(attrs as Record<string, Record<string, unknown>>),
    };
    function Probe() {
      useScadaPointsBridge({
        config,
        runtime,
        expressionCompiler,
        env,
        onError: (code, message) => errors.push({ code, message }),
      });
      return null;
    }
    render(
      <ScadaTestProviders environment={environment}>
        <Probe />
      </ScadaTestProviders>,
    );
    // 初始求值失败（analog.temp 为 null）→ 上报 1 次
    await waitFor(() => expect(errors.length).toBe(1));
    expect(errors[0].code).toBe('flux-evaluate-failed');

    // 多次失败的 scope 更新 → 同表达式同错误码去重（仍 1 次），无值注入
    act(() => {
      environment.scope.update('analog', { temp: null, other: 1 });
    });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(errors.length).toBe(1);
    expect(applied.length).toBe(0);

    // scope 数据修复 → 求值成功 → 点值回流
    act(() => {
      environment.scope.update('analog.temp', { value: 42 });
    });
    await waitFor(() => expect(pendingFlushes.length).toBeGreaterThan(0));
    const flush = pendingFlushes.shift() as () => void;
    flush();
    await waitFor(() => expect(applied.length).toBe(1));
    expect(applied[0]).toEqual({ 'rect-1': { text: 42 } });

    // 求值成功清空去重记录 → 再次失败重新上报
    act(() => {
      environment.scope.update('analog.temp', null);
    });
    await waitFor(() => expect(errors.length).toBe(2));
    expect(errors[1].code).toBe('flux-evaluate-failed');
  });

  // plan 2026-08-04-2243-1 Phase 2 L5：lastReportedErrors 与 compiledCache 对称清空。
  // 失败用例（修复前）：config reload 后旧 config 的去重记录抑制新 config 同表达式上报
  // （plan {2242-1} 接通 onError 后该缺陷变可观测）。修复后 lastReportedErrors 在 config 变更时清空 → 同表达式重报。
  it('re-reports the same expression error after a config reload (Phase 2 L5: lastReportedErrors sym-clear)', async () => {
    const environment = createScadaTestEnvironment([], { analog: { temp: null } });
    const errors: Array<{ code: string; message: string }> = [];
    const failingEvaluateCompiler = {
      compileValue: () => ({ kind: 'static', value: 1 }),
      evaluateValue: () => {
        throw 'evaluation boom';
      },
    } as unknown as typeof expressionCompiler;

    // 两份 config 结构相同（同一表达式 $analog.temp.value）但对象身份不同（模拟 config reload）。
    // runtime 在组件外构造一次（symbols 跨两份 config 相同，ReverseIndex 恒有效），使 hook 实例
    // 与 lastReportedErrors ref 跨 config reload 持续存在——L5 验证的正是该 ref 被对称清空。
    const baseConfig = bridgeConfig([{ id: 'temp', flux: '$analog.temp.value' }]);
    const pointStore = new PointStore();
    pointStore.loadDeclarations(baseConfig.variables ?? []);
    const runtime: ScadaPointsBridgeRuntime = {
      pointStore,
      pipeline: new RefreshPipeline({
        pointStore,
        reverseIndex: new ReverseIndex(baseConfig.symbols),
        collector: new DirtyCollector({ scheduleTick: () => () => undefined }),
        scheduleTick: () => () => undefined,
      }),
      applyAttrs: () => undefined,
    };

    function Probe({ config }: { config: ScadaConfig }) {
      useScadaPointsBridge({
        config,
        runtime,
        expressionCompiler: failingEvaluateCompiler,
        env,
        onError: (code, message) => errors.push({ code, message }),
      });
      return null;
    }

    const config1 = bridgeConfig([{ id: 'temp', flux: '$analog.temp.value' }]);
    const { rerender } = render(
      <ScadaTestProviders environment={environment}>
        <Probe config={config1} />
      </ScadaTestProviders>,
    );
    // 初次求值失败 → 上报 1 次
    await waitFor(() => expect(errors.length).toBe(1));
    expect(errors[0].code).toBe('flux-evaluate-failed');

    // config reload（新身份、同表达式）：L5 fix 清空 lastReportedErrors → 同表达式重新上报
    const config2 = bridgeConfig([{ id: 'temp', flux: '$analog.temp.value' }]);
    rerender(
      <ScadaTestProviders environment={environment}>
        <Probe config={config2} />
      </ScadaTestProviders>,
    );
    await waitFor(() => expect(errors.length).toBe(2));
    expect(errors[1].code).toBe('flux-evaluate-failed');
  });
});
