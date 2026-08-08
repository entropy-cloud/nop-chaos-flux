import React, { useMemo } from 'react';
import { cleanup, render, waitFor, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDefaultEnv } from '@nop-chaos/flux-react';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { PointStore } from '../binding/point-store.js';
import { ReverseIndex } from '../binding/reverse-index.js';
import { DirtyCollector, type ApplyAttrs } from '../binding/dirty-collector.js';
import { RefreshPipeline } from '../binding/refresh-pipeline.js';
import {
  useScadaPointsBridge,
  type ScadaPointsBridgeRuntime,
} from './hooks/use-scada-points-bridge.js';
import { ScadaTestProviders, createScadaTestEnvironment } from '../test-support/renderer-test-support.js';
import type { ScadaConfig } from '../serialization/config-types.js';

// Integration-boundary proof（plan 2026-08-05-2129-3 Phase 2，multi P1-1）：挂载真实 useScadaPointsBridge
// + 真实 useScopeSelector（经 ScadaTestProviders）+ 真实 RefreshPipeline，关闭 dimension-23 mock 盲点。
// 既有 variables-optional-contract 场景 ① 直接驱动 pipeline 并手工注入 scope（绕过桥接层）→ false-green；
// 本文件经桥接层订阅并集端到端验证「无点表直连 scope」契约（variables:[] + binding.expression）。
vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));

const expressionCompiler = createExpressionCompiler(createFormulaCompiler());
const env = createDefaultEnv();

afterEach(() => {
  cleanup();
});

interface BridgeProbeHarness {
  applied: Array<Record<string, Record<string, unknown>>>;
  pending: Array<() => void>;
  flush: () => void;
}

/**
 * 与 scada-points-bridge.test.tsx 的 createBridgeProbe 同构：挂载真实 useScadaPointsBridge，
 * runtime 经真实 PointStore/ReverseIndex/RefreshPipeline 装配（不 mock 桥接/renderer 边界）。
 * scope 经 ScadaTestProviders 注入并由 useScopeSelector 订阅（经 paths 精细化）。
 */
function createBindingScopeProbe(config: ScadaConfig): { Probe: React.FC; harness: BridgeProbeHarness } {
  const harness: BridgeProbeHarness = { applied: [], pending: [], flush: () => undefined };
  const pendingFlushes = harness.pending;
  harness.flush = () => {
    const flush = pendingFlushes.shift();
    flush?.();
  };

  function BindingScopeProbe() {
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
      enabled: true,
      expressionCompiler,
      env,
      onError: () => undefined,
    });
    return null;
  }

  return { Probe: BindingScopeProbe, harness };
}

describe('binding.expression direct-scope subscription (multi P1-1, plan 2026-08-05-2129-3 Phase 2)', () => {
  it('variables:[] + binding.expression reads scope member reactively (no point table, contract ①)', async () => {
    // 契约 ①：无点表（variables:[]）+ binding.expression 直连 scope。scopeVal 变化 → text 重算。
    // 修复前（false-green 源）：桥接层 analyzeFluxSubscriptions 仅扫 variables → paths=[] →
    // useScopeSelector enabled:false + fallback:{} → scopeData 永久 {} → binding 求值 scopeVal*2 得 NaN。
    // 修复后：bindingScopePaths 并入 paths=['scopeVal'] → scopeData={scopeVal:21} → text=42。
    const environment = createScadaTestEnvironment([], { scopeVal: 21 });
    const config: ScadaConfig = {
      version: 1,
      variables: [],
      symbols: [
        {
          id: 'sym',
          type: 'scada-rect',
          x: 0,
          y: 0,
          bindings: { text: { expression: '${scopeVal * 2}' } },
        },
      ],
    };
    const { Probe, harness } = createBindingScopeProbe(config);
    render(
      <ScadaTestProviders environment={environment}>
        <Probe />
      </ScadaTestProviders>,
    );

    await waitFor(() => expect(harness.pending.length).toBeGreaterThan(0));
    harness.flush();
    await waitFor(() => expect(harness.applied.length).toBe(1));
    // 断言结果值（非 NaN/永久 undefined）：scopeVal=21 → 21*2=42
    expect(harness.applied[0]).toEqual({ sym: { text: 42 } });

    // reactive 更新：scope 变化 → binding 重算
    harness.applied.length = 0;
    act(() => environment.scope.update('scopeVal', 30));
    await waitFor(() => expect(harness.pending.length).toBeGreaterThan(0));
    harness.flush();
    await waitFor(() => expect(harness.applied.length).toBe(1));
    expect(harness.applied[0]).toEqual({ sym: { text: 60 } });
  });

  it('nested-children binding.expression scope paths are collected (recursive symbol walk)', async () => {
    // 守护：collectBindingExpressionScopePaths 递归 children（与 ReverseIndex.addSymbol 同序）。
    // group 子图元的 binding.expression 直连 scope 也并入订阅。
    const environment = createScadaTestEnvironment([], { child: 5 });
    const config: ScadaConfig = {
      version: 1,
      variables: [],
      symbols: [
        {
          id: 'group',
          type: 'scada-group',
          x: 0,
          y: 0,
          children: [
            {
              id: 'leaf',
              type: 'scada-rect',
              x: 0,
              y: 0,
              bindings: { text: { expression: '${child + 1}' } },
            },
          ],
        },
      ],
    };
    const { Probe, harness } = createBindingScopeProbe(config);
    render(
      <ScadaTestProviders environment={environment}>
        <Probe />
      </ScadaTestProviders>,
    );

    await waitFor(() => expect(harness.pending.length).toBeGreaterThan(0));
    harness.flush();
    await waitFor(() => expect(harness.applied.length).toBe(1));
    expect(harness.applied[0]).toEqual({ leaf: { text: 6 } });
  });
});
