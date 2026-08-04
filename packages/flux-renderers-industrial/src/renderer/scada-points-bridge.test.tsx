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
});
