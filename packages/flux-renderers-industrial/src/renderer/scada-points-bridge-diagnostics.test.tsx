import React from 'react';
import { cleanup, render, waitFor, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDefaultEnv } from '@nop-chaos/flux-react';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { PointStore } from '../binding/point-store.js';
import { ReverseIndex } from '../binding/reverse-index.js';
import { DirtyCollector, RefreshPipeline } from '../binding/dirty-collector.js';
import {
  useScadaPointsBridge,
  type ScadaPointsBridgeRuntime,
} from './hooks/use-scada-points-bridge.js';
import { ScadaTestProviders, createScadaTestEnvironment } from '../test-support/renderer-test-support.js';
import type { ScadaConfig } from '../serialization/config-types.js';

// test-support 引入链含 renderer → engine → leafer-ui；happy-dom 无 canvas 上下文，mock leafer-ui 类。
// 拆分自 scada-points-bridge.test.tsx：flux 错误上报 / 去重 / config reload 重报 / deps-empty 诊断类用例
// （flux-compile-failed / flux-evaluate-failed / dedup / sym-clear reload / flux-deps-empty）。
// 仅移动、不改断言。
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

describe('scada-canvas points bridge diagnostics (flux error reporting + dedup + reload-clear)', () => {
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

  // plan 2026-08-05-0325-1 Phase 1（failing-first，实现前红）：复杂表达式「读取 scope 但平台 collector
  // 返空 deps」时 useScopeSelector 静默 disable。修复后经既有非升级诊断通道一次性上报 flux-deps-empty。
  it('reports flux-deps-empty once when a complex expression reads scope but the probe returns no deps (W1 successor)', async () => {
    const environment = createScadaTestEnvironment([], { analog: { temp: 25 } });
    const errors: Array<{ code: string; message: string }> = [];
    const pendingFlushes: Array<() => void> = [];
    const pointStore = new PointStore();
    const config = bridgeConfig([{ id: 'computed', flux: '${analog.temp + 1}' }], [
      {
        id: 'rect-1',
        type: 'scada-rect',
        x: 0,
        y: 0,
        bindings: { text: { point: 'computed' } },
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
      applyAttrs: () => undefined,
    };
    // stub compiler：createState 返 root 无 dependencies → extractExpressionDepsViaProbe 返 []；
    // evaluateValue 返值（主 effect 求值成功，不产生 flux-evaluate-failed）。
    const depsEmptyCompiler = {
      compileValue: () => ({ kind: 'dynamic' }),
      createState: () => ({ root: { kind: 'leaf-state', dependencies: undefined } }),
      evaluateWithState: () => ({ value: 1, changed: false, reusedReference: false }),
      evaluateValue: () => 1,
    } as unknown as typeof expressionCompiler;
    function Probe() {
      useScadaPointsBridge({
        config,
        runtime,
        expressionCompiler: depsEmptyCompiler,
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
    await waitFor(() => expect(errors.some((e) => e.code === 'flux-deps-empty')).toBe(true));
    const depsEmptyErrors = errors.filter((e) => e.code === 'flux-deps-empty');
    expect(depsEmptyErrors).toHaveLength(1);
    expect(depsEmptyErrors[0].message).toContain('${analog.temp + 1}');
    // 非升级：仅 flux-deps-empty，无 status-upgrading 码（config-*/engine-*）
    expect(errors.every((e) => e.code === 'flux-deps-empty')).toBe(true);

    // 重复 scope 更新不重报（一次性：depsEmptyExpressions 稳定 → effect 不重跑；reportOnce 去重兜底）
    act(() => {
      environment.scope.update('analog', { temp: 99 });
    });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(errors.filter((e) => e.code === 'flux-deps-empty')).toHaveLength(1);
  });

  // plan 2026-08-05-0325-1 Phase 1（failing-first 负向）：纯字面量复杂表达式（无标识符）不触发
  // flux-deps-empty（expressionReadsScope 为假）。
  it('does not report flux-deps-empty for a literal-only complex expression with no identifiers', async () => {
    const environment = createScadaTestEnvironment([], {});
    const errors: Array<{ code: string; message: string }> = [];
    const pointStore = new PointStore();
    const config = bridgeConfig([{ id: 'literal', flux: '${1 + 2}' }], [
      {
        id: 'rect-1',
        type: 'scada-rect',
        x: 0,
        y: 0,
        bindings: { text: { point: 'literal' } },
      },
    ]);
    pointStore.loadDeclarations(config.variables ?? []);
    const runtime: ScadaPointsBridgeRuntime = {
      pointStore,
      pipeline: new RefreshPipeline({
        pointStore,
        reverseIndex: new ReverseIndex(config.symbols),
        collector: new DirtyCollector({ scheduleTick: () => () => undefined }),
        scheduleTick: () => () => undefined,
      }),
      applyAttrs: () => undefined,
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
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(errors.some((e) => e.code === 'flux-deps-empty')).toBe(false);
  });
});
