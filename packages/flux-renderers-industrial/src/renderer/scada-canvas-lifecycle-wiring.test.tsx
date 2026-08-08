import React from 'react';
import { act, cleanup, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { ScadaCanvasEngine } from '../engine/scada-engine.js';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import {
  configProp,
  createScadaTestEnvironment,
  makeScadaCanvasProps,
  renderScadaCanvas,
  ScadaTestProviders,
  scadaTestHandle,
  validCanvasConfig,
} from '../test-support/renderer-test-support.js';
import { ScadaCanvasRenderer } from './scada-canvas.js';
import type { ScadaCanvasSchema } from '../schemas.js';
import type { ScadaConfig } from '../serialization/config-types.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));

const wiringConfig = (overrides: Record<string, unknown> = {}): ScadaConfig =>
  validCanvasConfig({
    symbols: [
      { id: 'rect-1', type: 'scada-rect', x: 10, y: 20, width: 100, height: 50, fill: '#ff0000' },
      { id: 'rect-2', type: 'scada-rect', x: 200, y: 20, width: 100, height: 50, fill: '#00ff00' },
    ],
    ...overrides,
  });

beforeEach(() => {
  resetLeaferMock();
  registerBuiltinScadaSymbols();
});

afterEach(() => {
  cleanup();
});

/**
 * plan-2026-08-04-1235-2 生命周期 wiring 五 Phase 回归（P1-2/P1-3/open P1-A/open P1-B/P1-8）。
 * 与 `scada-canvas-lifecycle.test.tsx`（I10.1 生命周期基础）平铺同位，聚焦首帧/ready/错误降级契约。
 */
describe('scada-canvas lifecycle wiring (plan-2026-08-04-1235-2)', () => {
  it('applies static and expression point bindings on the first frame with zero external writes (P1-2)', async () => {
    const firstFrameConfig = wiringConfig({
      version: 1,
      variables: [
        { id: 'temp', source: 'static', value: 30 },
        { id: 'scaled', source: 'expression', expression: '${temp * 2}' },
        { id: 'mode', source: 'static', value: 1 },
      ],
      symbols: [
        {
          id: 'rect-1',
          type: 'scada-rect',
          x: 10,
          y: 20,
          width: 100,
          height: 50,
          fill: '#ff0000',
          bindings: {
            text: { point: 'scaled' },
            fill: { point: 'temp', map: { '30': '#00aa00' } },
          },
        },
        {
          id: 'rect-2',
          type: 'scada-rect',
          x: 200,
          y: 20,
          width: 60,
          height: 40,
          fill: '#ff0000',
          bindings: { stroke: { point: 'mode', map: { '1': '#00ff00' } } },
          states: {
            states: { run: {}, fault: { style: { fill: '#ffff00' } } },
            valueMap: { 1: 'fault' },
          },
          animations: [{ kind: 'rotate', when: 'always', period: 500 }],
        },
      ],
    });
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(makeScadaCanvasProps({ cid: 7, props: { config: configProp(firstFrameConfig) } }), environment);
    await waitFor(() => expect(scadaTestHandle(7)).toBeDefined());
    const engine = scadaTestHandle(7)?.engine as ScadaCanvasEngine;
    // 静态点绑定（map 换算）首帧即应用
    await waitFor(() =>
      expect((engine.getSymbol('rect-1')?.node as unknown as { fill: string }).fill).toBe('#00aa00'),
    );
    // 表达式点首帧求值并应用（`synced=false` 全量首同步路径实际执行）
    expect((engine.getSymbol('rect-1')?.node as unknown as { text: unknown }).text).toBe(60);
    // 状态色首帧生效（静态点 → valueMap → fault 样式）
    await waitFor(() =>
      expect((engine.getSymbol('rect-2')?.node as unknown as { fill: string }).fill).toBe('#ffff00'),
    );
    expect((engine.getSymbol('rect-2')?.node as unknown as { stroke: string }).stroke).toBe('#00ff00');
    // when:'always' 动画首帧启动：旋转增量开始写入节点
    await waitFor(() =>
      expect((engine.getSymbol('rect-2')?.node as unknown as { rotation: number }).rotation).toBeGreaterThan(0),
    );
  });

  it('dispatches scada:ready exactly once per real build: mount, full reset (importConfig), non-empty diff; zero on identity re-renders (P1-3)', async () => {
    const dispatch = vi.fn().mockResolvedValue({ ok: true });
    const environment = createScadaTestEnvironment([]);
    const readyCount = () =>
      dispatch.mock.calls.filter(
        ([, ctx]) => (ctx as { event?: { type?: string } } | undefined)?.event?.type === 'scada:ready',
      ).length;
    const view = renderScadaCanvas(
      makeScadaCanvasProps({ cid: 7,
        props: { config: configProp(wiringConfig()), events: { onReady: { action: 'noop' } } },
        node: { scope: environment.scope } as RendererComponentProps<ScadaCanvasSchema>['node'],
        helpers: { dispatch } as unknown as RendererComponentProps<ScadaCanvasSchema>['helpers'],
      }),
      environment,
    );
    await waitFor(() => expect(scadaTestHandle(7)).toBeDefined());
    // mount 全量构建恰 1 次（reloadBindings → setRuntime 引起的空 diff 重跑不重复触发）
    await waitFor(() => expect(readyCount()).toBe(1));

    // importConfig（全量构建）→ 恰 1 次（config.version 契约恒为 1，版本变更走校验错误而非 full reset，
    // 因此全量路径 = mount / importConfig；change 基准守卫两处语义一致）
    const handle = environment.componentRegistry.resolve({ componentId: 'scada-1' }) as unknown as {
      capabilities: { invoke: (m: string, p: unknown) => Promise<{ ok: boolean }> };
    };
    const imported = {
      version: 1,
      symbols: [{ id: 'import-1', type: 'scada-ellipse', x: 0, y: 0, width: 40, height: 40 }],
    };
    const importResult = await handle.capabilities.invoke('importConfig', { config: imported });
    expect(importResult.ok).toBe(true);
    await waitFor(() => expect(readyCount()).toBe(2));

    // 同版本非空 diff → 恰 1 次
    view.rerender(
      <ScadaTestProviders environment={environment}>
        <ScadaCanvasRenderer
          {...makeScadaCanvasProps({ cid: 7,
            props: {
              config: configProp({
                version: 1,
                symbols: [{ id: 'import-1', type: 'scada-ellipse', x: 100, y: 100, width: 40, height: 40 }],
              }),
              events: { onReady: { action: 'noop' } },
            },
            node: { scope: environment.scope } as RendererComponentProps<ScadaCanvasSchema>['node'],
            helpers: { dispatch } as unknown as RendererComponentProps<ScadaCanvasSchema>['helpers'],
          })}
        />
      </ScadaTestProviders>,
    );
    await waitFor(() => expect(readyCount()).toBe(3));

    // 宿主每渲染传同值新对象身份 → 空 diff → 0 额外触发
    view.rerender(
      <ScadaTestProviders environment={environment}>
        <ScadaCanvasRenderer
          {...makeScadaCanvasProps({ cid: 7,
            props: {
              config: configProp({
                version: 1,
                symbols: [{ id: 'import-1', type: 'scada-ellipse', x: 100, y: 100, width: 40, height: 40 }],
              }),
              events: { onReady: { action: 'noop' } },
            },
            node: { scope: environment.scope } as RendererComponentProps<ScadaCanvasSchema>['node'],
            helpers: { dispatch } as unknown as RendererComponentProps<ScadaCanvasSchema>['helpers'],
          })}
        />
      </ScadaTestProviders>,
    );
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(readyCount()).toBe(3);
  });

  // plan 2026-08-09-0121-2 Workstream A 本轮-10：config 身份未变时 effect 早退，消除 reloadBindings→
  // setRuntime 新身份→effect 再跑空 diff 的冗余第二轮（effect 单跑契约）。
  it('does NOT re-run the sync body when config identity is unchanged across re-renders (本轮-10)', async () => {
    const environment = createScadaTestEnvironment([]);
    const stableConfig = configProp(wiringConfig());
    const view = renderScadaCanvas(
      makeScadaCanvasProps({
        cid: 9,
        props: { config: stableConfig },
        node: { scope: environment.scope } as RendererComponentProps<ScadaCanvasSchema>['node'],
        helpers: { dispatch: vi.fn().mockResolvedValue({ ok: true }) } as unknown as RendererComponentProps<ScadaCanvasSchema>['helpers'],
      }),
      environment,
    );
    await waitFor(() => expect(scadaTestHandle(9)).toBeDefined());
    const engine = (scadaTestHandle(9) as unknown as { engine: ScadaCanvasEngine }).engine;
    const resetSpy = vi.spyOn(engine, 'reset');
    const applyDiffSpy = vi.spyOn(engine, 'applyDiff');

    // 同身份 config 多次 re-render：本轮-10 早退（config===prevRef）→ 不 reset、不 applyDiff。
    for (let i = 0; i < 3; i++) {
      view.rerender(
        <ScadaTestProviders environment={environment}>
          <ScadaCanvasRenderer
            {...makeScadaCanvasProps({
              cid: 9,
              props: { config: stableConfig },
              node: { scope: environment.scope } as RendererComponentProps<ScadaCanvasSchema>['node'],
              helpers: { dispatch: vi.fn().mockResolvedValue({ ok: true }) } as unknown as RendererComponentProps<ScadaCanvasSchema>['helpers'],
            })}
          />
        </ScadaTestProviders>,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(resetSpy).not.toHaveBeenCalled();
    expect(applyDiffSpy).not.toHaveBeenCalled();
    resetSpy.mockRestore();
    applyDiffSpy.mockRestore();
  });

  it('applies config.background.color to the ground layer and config.viewport as the initial viewport, re-applied on full resets (P1-A)', async () => {
    const environment = createScadaTestEnvironment([]);
    const view = renderScadaCanvas(
      makeScadaCanvasProps({ cid: 7,
        props: {
          config: configProp(
            wiringConfig({
              version: 1,
              background: { color: '#123456', grid: { size: 20, color: '#333333' } },
              viewport: { x: 100, y: 50, scale: 2 },
            }),
          ),
        },
      }),
      environment,
    );
    await waitFor(() => expect(scadaTestHandle(7)).toBeDefined());
    const engine = scadaTestHandle(7)?.engine as ScadaCanvasEngine;
    await waitFor(() =>
      expect((engine.ground as unknown as { fill?: string }).fill).toBe('#123456'),
    );
    expect(engine.getViewport()).toEqual({ x: 100, y: 50, scale: 2 });

    // importConfig（全量 reset 路径）：background 重应用（reset 覆盖构造值）、config.viewport 重应用
    const handle = environment.componentRegistry.resolve({ componentId: 'scada-1' }) as unknown as {
      capabilities: { invoke: (m: string, p: unknown) => Promise<{ ok: boolean }> };
    };
    const imported = {
      version: 1,
      background: { color: '#abcdef' },
      viewport: { x: -40, y: 10, scale: 1.5 },
      symbols: [{ id: 'import-1', type: 'scada-rect', x: 0, y: 0, width: 20, height: 20 }],
    };
    const importResult = await handle.capabilities.invoke('importConfig', { config: imported });
    expect(importResult.ok).toBe(true);
    await waitFor(() =>
      expect((engine.ground as unknown as { fill?: string }).fill).toBe('#abcdef'),
    );
    expect(engine.getViewport()).toEqual({ x: -40, y: 10, scale: 1.5 });
    expect(view.container.querySelector('[data-slot="scada-canvas"]')?.getAttribute('data-status')).toBe('ready');
  });

  it('lets the props viewport policy take precedence over config.viewport on full builds (P1-A priority)', async () => {
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(
      makeScadaCanvasProps({ cid: 7,
        props: {
          config: configProp(wiringConfig({ version: 1, viewport: { x: 100, y: 50, scale: 2 } })),
          width: 800,
          height: 600,
          viewport: { fit: 'fill', center: true },
        },
      }),
      environment,
    );
    await waitFor(() => expect(scadaTestHandle(7)).toBeDefined());
    const engine = scadaTestHandle(7)?.engine as ScadaCanvasEngine;
    await waitFor(() => expect(engine.getViewport().scale).not.toBe(1));
    // props policy（fit/center 公式产物）覆盖 config.viewport 显式值
    expect(engine.getViewport().scale).not.toBe(2);
  });

  it('restores the base style when exiting a state whose target state has no style patch (partial declaration, P1-B)', async () => {
    const partialStateConfig = wiringConfig({
      version: 1,
      variables: [{ id: 'level', source: 'static', value: 0 }],
      symbols: [
        {
          id: 'rect-1',
          type: 'scada-rect',
          x: 10,
          y: 20,
          width: 100,
          height: 50,
          fill: '#ff0000',
          bindings: { rotation: { point: 'level' } },
          states: {
            states: { run: {}, fault: { style: { fill: '#00ff00' } } },
            valueMap: { 0: 'run', 1: 'fault' },
          },
        },
      ],
    });
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(makeScadaCanvasProps({ cid: 7, props: { config: configProp(partialStateConfig) } }), environment);
    await waitFor(() => expect(scadaTestHandle(7)).toBeDefined());
    const engine = scadaTestHandle(7)?.engine as ScadaCanvasEngine;
    const node = engine.getSymbol('rect-1')?.node as unknown as { fill: string };
    const handle = environment.componentRegistry.resolve({ componentId: 'scada-1' }) as unknown as {
      capabilities: { invoke: (m: string, p: unknown) => Promise<{ ok: boolean }> };
    };

    // 值入故障区间 → fault 样式应用
    await handle.capabilities.invoke('setPointValue', { pointId: 'level', value: 1 });
    await waitFor(() => expect(node.fill).toBe('#00ff00'));

    // 值回正常区间 → 目标状态（run）无 style → 恢复 base fill
    await handle.capabilities.invoke('setPointValue', { pointId: 'level', value: 0 });
    await waitFor(() => expect(node.fill).toBe('#ff0000'));
  });

  it('degrades per-declaration on flux errors: canvas stays ready, failed point skipped, recovers on scope repair (P1-8)', async () => {
    const dispatch = vi.fn().mockResolvedValue({ ok: true });
    const environment = createScadaTestEnvironment([], { analog: { temp: null } });
    const fluxConfig = wiringConfig({
      version: 1,
      variables: [{ id: 'temp', source: 'flux', flux: '${analog.temp.value}' }],
      symbols: [
        {
          id: 'rect-1',
          type: 'scada-rect',
          x: 0,
          y: 0,
          width: 50,
          height: 50,
          text: 'init',
          bindings: { text: { point: 'temp' } },
        },
      ],
    });
    renderScadaCanvas(
      makeScadaCanvasProps({ cid: 7,
        props: { config: configProp(fluxConfig), events: { onError: { action: 'noop' } } },
        node: { scope: environment.scope } as RendererComponentProps<ScadaCanvasSchema>['node'],
        helpers: { dispatch } as unknown as RendererComponentProps<ScadaCanvasSchema>['helpers'],
      }),
      environment,
    );
    await waitFor(() => expect(scadaTestHandle(7)).toBeDefined());
    const engine = scadaTestHandle(7)?.engine as ScadaCanvasEngine;
    const node = engine.getSymbol('rect-1')?.node as unknown as { text: unknown };
    // 画布保持 ready，不升级为画布级 error
    await waitFor(() =>
      expect(document.querySelector('[data-slot="scada-canvas"]')?.getAttribute('data-status')).toBe('ready'),
    );
    expect(document.querySelector('[data-slot="scada-canvas-error"]')).toBeNull();
    // 失败声明被跳过：点值不更新
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(node.text).toBe('init');
    // 数据错误不派发画布级 scada:error（§8.1 契约：onError 仅 config 校验/构建失败）
    expect(
      dispatch.mock.calls.filter(
        ([, ctx]) => (ctx as { event?: { type?: string } } | undefined)?.event?.type === 'scada:error',
      ),
    ).toHaveLength(0);

    // scope 数据修复 → 求值成功 → 点值回流，画面恢复
    act(() => {
      environment.scope.update('analog.temp', { value: 42 });
    });
    await waitFor(() => expect(node.text).toBe(42));
  });
});
