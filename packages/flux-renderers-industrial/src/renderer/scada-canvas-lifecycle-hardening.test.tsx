import React from 'react';
import { act, cleanup, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { RendererComponentProps, SchemaObject } from '@nop-chaos/flux-core';
import { ScadaCanvasEngine } from '../engine/scada-engine.js';
import { Animator } from '../binding/animator.js';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import {
  createScadaTestEnvironment,
  renderScadaCanvas,
  ScadaTestProviders,
} from '../test-support/renderer-test-support.js';
import { ScadaCanvasRenderer } from './scada-canvas.js';
import type { ScadaCanvasSchema } from '../schemas.js';
import type { ScadaConfig } from '../serialization/config-types.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));

type ROEntry = { target: Element; contentRect: { width: number; height: number } };

interface TrackedObserver {
  cb: (entries: ROEntry[]) => void;
  targets: Set<Element>;
  disconnect: Mock<() => void>;
}

function installResizeObserverSpy() {
  const observers: TrackedObserver[] = [];
  class MockResizeObserver {
    cb: (entries: ROEntry[]) => void;
    targets = new Set<Element>();
    disconnect = vi.fn(() => {
      this.targets.clear();
    });
    constructor(cb: (entries: ROEntry[]) => void) {
      this.cb = cb;
      observers.push(this as unknown as TrackedObserver);
    }
    observe(target: Element) {
      this.targets.add(target);
    }
    unobserve(target: Element) {
      this.targets.delete(target);
    }
  }
  const NativeRO = globalThis.ResizeObserver;
  globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  return {
    observers,
    restore() {
      globalThis.ResizeObserver = NativeRO;
    },
  };
}

const textConfig = (overrides: Record<string, unknown> = {}): ScadaConfig =>
  ({
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
        bindings: { text: { point: 'level' } },
      },
    ],
    ...overrides,
  }) as ScadaConfig;

const alwaysAnimConfig = (): ScadaConfig =>
  ({
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
        bindings: { rotation: { point: 'level' } },
        states: {
          states: { run: {}, fault: { style: { fill: '#ffff00' } } },
          valueMap: { 0: 'run', 1: 'fault' },
        },
        animations: [{ kind: 'rotate', when: 'always', period: 500 }],
      },
    ],
  }) as ScadaConfig;

function makeProps(
  overrides: Partial<RendererComponentProps<ScadaCanvasSchema>> & { props?: Record<string, unknown> } = {},
): RendererComponentProps<ScadaCanvasSchema> {
  return {
    id: 'scada-1',
    path: 'test.scada-1',
    schema: { type: 'scada-canvas' } as ScadaCanvasSchema,
    templateNode: {} as RendererComponentProps<ScadaCanvasSchema>['templateNode'],
    node: {} as RendererComponentProps<ScadaCanvasSchema>['node'],
    props: {} as RendererComponentProps<ScadaCanvasSchema>['props'],
    meta: {
      visible: true,
      hidden: false,
      disabled: false,
      changed: false,
      cid: 7,
    } as RendererComponentProps<ScadaCanvasSchema>['meta'],
    regions: {},
    events: {},
    reactions: {},
    helpers: {
      dispatch: vi.fn().mockResolvedValue({ ok: true }),
    } as unknown as RendererComponentProps<ScadaCanvasSchema>['helpers'],
    ...overrides,
  };
}

type ScadaCanvasConfigProp = string | (ScadaConfig & SchemaObject);

function configProp(config: ScadaConfig): ScadaCanvasConfigProp {
  return config as ScadaCanvasConfigProp;
}

const scadaTestHandle = (cid: number) =>
  (window as unknown as Record<string, unknown>)[`__flux_scada_${cid}`] as
    | {
        engine: ScadaCanvasEngine;
        getSymbol: (id: string) => unknown;
        setPointValues: (values: Record<string, unknown>) => void;
      }
    | undefined;

beforeEach(() => {
  resetLeaferMock();
  registerBuiltinScadaSymbols();
});

afterEach(() => {
  cleanup();
});

describe('scada-canvas lifecycle hardening (plan 2026-08-04-1558-2 Phase 1)', () => {
  it('component:destroy disconnects the ResizeObserver and cancels the pending resize rAF (SL-2)', async () => {
    const ro = installResizeObserverSpy();
    try {
      const environment = createScadaTestEnvironment([]);
      renderScadaCanvas(makeProps({ props: { config: configProp(textConfig()) } }), environment);
      await waitFor(() => expect(scadaTestHandle(7)).toBeDefined());
      const observer = ro.observers[ro.observers.length - 1];
      // schedule a pending resize frame
      observer.cb([{ target: document.body, contentRect: { width: 320, height: 240 } }]);

      const handle = environment.componentRegistry.resolve({ componentId: 'scada-1' }) as unknown as {
        capabilities: { invoke: (m: string, p: unknown) => Promise<{ ok: boolean }> };
      };
      await handle.capabilities.invoke('destroy', undefined);

      // destroy 经 releaseRuntime → observer.disconnect 被调用（SL-2：destroy 后容器不再被观察）
      expect(observer.disconnect).toHaveBeenCalled();
    } finally {
      ro.restore();
    }
  });

  it('setPointValues injection writes to the latest pipeline after a config reload (SL-3)', async () => {
    const environment = createScadaTestEnvironment([]);
    const view = renderScadaCanvas(makeProps({ props: { config: configProp(textConfig()) } }), environment);
    await waitFor(() => expect(scadaTestHandle(7)?.getSymbol('rect-1')).toBeDefined());
    const engine = scadaTestHandle(7)?.engine as ScadaCanvasEngine;
    const node = () => engine.getSymbol('rect-1')?.node as unknown as { text: unknown };

    // 注入 live 值（经测试句柄注入通道 → pointStore + pipeline）
    act(() => scadaTestHandle(7)?.setPointValues({ level: 42 }));
    await waitFor(() => expect(node().text).toBe(42));

    // 触发 reload（非空 diff → reloadBindings 重建 pipeline/animator/collector）
    view.rerender(
      <ScadaTestProviders environment={environment}>
        <ScadaCanvasRenderer
          {...makeProps({
            props: { config: configProp(textConfig({ symbols: [{ id: 'rect-1', type: 'scada-rect', x: 99, y: 20, width: 100, height: 50, bindings: { text: { point: 'level' } } }] })) },
          })}
        />
      </ScadaTestProviders>,
    );

    // reload 后注入通道写向最新 pipeline：setPointValues 生效（SL-3 fix）
    act(() => scadaTestHandle(7)?.setPointValues({ level: 99 }));
    await waitFor(() => expect(node().text).toBe(99));
  });

  it('a failed full reset clears prevRef so the next same-version sync rebuilds fully (SL-4)', async () => {
    const environment = createScadaTestEnvironment([]);
    const dispatch = vi.fn().mockResolvedValue({ ok: true });
    const view = renderScadaCanvas(
      makeProps({
        props: { config: configProp(textConfig()) },
        helpers: { dispatch } as unknown as RendererComponentProps<ScadaCanvasSchema>['helpers'],
      }),
      environment,
    );
    await waitFor(() => expect(scadaTestHandle(7)?.getSymbol('rect-1')).toBeDefined());
    const engine = scadaTestHandle(7)?.engine as ScadaCanvasEngine;
    const applyDiffSpy = vi.spyOn(engine, 'applyDiff');

    // importConfig 全量构建抛错（config-build-failed）：prevRef 在 reset 前已被设为 imported，
    // SL-4 fix 在 catch 内将其置空，否则下次同版本 props 同步会基于损坏基线走 diff。
    const resetSpy = vi.spyOn(engine, 'reset').mockImplementationOnce(() => {
      throw new Error('build failed');
    });
    const handle = environment.componentRegistry.resolve({ componentId: 'scada-1' }) as unknown as {
      capabilities: { invoke: (m: string, p: unknown) => Promise<{ ok: boolean }> };
    };
    const failingImport = {
      version: 1,
      variables: [{ id: 'level', source: 'static', value: 0 }],
      symbols: [{ id: 'rect-2', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 }],
    };
    await handle.capabilities.invoke('importConfig', { config: failingImport });
    await waitFor(() => expect(resetSpy).toHaveBeenCalled());
    resetSpy.mockRestore();

    // 再次 props 同步（同版本）：SL-4 fix → prevRef=undefined → full（reset）。
    // 未 fix → prevRef=imported(同版本) → diff（applyDiff）基于未建成的损坏基线。
    const resetSpy2 = vi.spyOn(engine, 'reset');
    view.rerender(
      <ScadaTestProviders environment={environment}>
        <ScadaCanvasRenderer
          {...makeProps({ props: { config: configProp({ ...textConfig(), symbols: [{ id: 'rect-1', type: 'scada-rect', x: 22, y: 20, width: 100, height: 50, bindings: { text: { point: 'level' } } }] }) } })}
        />
      </ScadaTestProviders>,
    );
    await waitFor(() => expect(resetSpy2).toHaveBeenCalled());
    // 失败后再次同步走 full（reset），不基于损坏基线走 diff（applyDiff 无新增调用）
    expect(applyDiffSpy).not.toHaveBeenCalled();
    resetSpy2.mockRestore();
    applyDiffSpy.mockRestore();
  });

  it('reloadBindings preserves live point values by id (props full/diff path, OP-1)', async () => {
    const environment = createScadaTestEnvironment([]);
    const view = renderScadaCanvas(makeProps({ props: { config: configProp(textConfig()) } }), environment);
    await waitFor(() => expect(scadaTestHandle(7)?.getSymbol('rect-1')).toBeDefined());
    const engine = scadaTestHandle(7)?.engine as ScadaCanvasEngine;
    const node = () => engine.getSymbol('rect-1')?.node as unknown as { text: unknown };

    // 写入 live 值（非 init）
    act(() => scadaTestHandle(7)?.setPointValues({ level: 77 }));
    await waitFor(() => expect(node().text).toBe(77));

    // 触发 reload（非空 diff，保留同 id 点 'level'）
    view.rerender(
      <ScadaTestProviders environment={environment}>
        <ScadaCanvasRenderer
          {...makeProps({ props: { config: configProp(textConfig({ symbols: [{ id: 'rect-1', type: 'scada-rect', x: 5, y: 5, width: 100, height: 50, bindings: { text: { point: 'level' } } }] })) } })}
        />
      </ScadaTestProviders>,
    );

    // live 值保留：reload 后首同步渲染仍是 77，不回退 init 0
    await waitFor(() => expect(node().text).toBe(77));
  });

  it('component:destroy surfaces a destroyed status on the wrapper (OP-4)', async () => {
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(makeProps({ props: { config: configProp(textConfig()) } }), environment);
    await waitFor(() => expect(scadaTestHandle(7)?.getSymbol('rect-1')).toBeDefined());
    const handle = environment.componentRegistry.resolve({ componentId: 'scada-1' }) as unknown as {
      capabilities: { invoke: (m: string, p: unknown) => Promise<{ ok: boolean }> };
    };

    const wrapper = () => document.querySelector('[data-slot="scada-canvas"]');
    expect(wrapper()?.getAttribute('data-status')).toBe('ready');

    await handle.capabilities.invoke('destroy', undefined);
    // destroy 后 data-status 反映销毁态（OP-4：e2e/tooling 不再把已销毁画布报为 healthy）
    await waitFor(() => expect(wrapper()?.getAttribute('data-status')).toBe('destroyed'));

    // 已销毁画布的后续句柄命令返回 not-mounted（既有语义不回归）
    const getSymbols = await handle.capabilities.invoke('getSymbols', undefined);
    expect(getSymbols.ok).toBe(false);
  });

  it('reload-then-unmount stops the latest animator clock (M1: no leaked binding domain)', async () => {
    // 经 Animator.prototype.start spy 捕获每次创建并启动的 animator 实例（mount 域 + reload 域）。
    const animators: Animator[] = [];
    const realStart = Animator.prototype.start;
    Animator.prototype.start = function (this: Animator, ...args: Parameters<typeof realStart>) {
      if (!animators.includes(this)) animators.push(this);
      return realStart.apply(this, args);
    };
    try {
      const environment = createScadaTestEnvironment([]);
      const view = renderScadaCanvas(makeProps({ props: { config: configProp(alwaysAnimConfig()) } }), environment);
      await waitFor(() => expect(scadaTestHandle(7)?.getSymbol('rect-1')).toBeDefined());
      const engine = scadaTestHandle(7)?.engine as ScadaCanvasEngine;
      // mount 域 animator 启动（when:'always'）
      await waitFor(() =>
        expect((engine.getSymbol('rect-1')?.node as unknown as { rotation: number }).rotation).toBeGreaterThan(0),
      );

      // 触发 reload（非空 diff → 重建绑定域，新 animator 启动）
      view.rerender(
        <ScadaTestProviders environment={environment}>
          <ScadaCanvasRenderer
            {...makeProps({
              props: {
                config: configProp({
                  ...alwaysAnimConfig(),
                  symbols: [
                    {
                      id: 'rect-1',
                      type: 'scada-rect',
                      x: 40,
                      y: 20,
                      width: 100,
                      height: 50,
                      bindings: { rotation: { point: 'level' } },
                      states: {
                        states: { run: {}, fault: { style: { fill: '#ffff00' } } },
                        valueMap: { 0: 'run', 1: 'fault' },
                      },
                      animations: [{ kind: 'rotate', when: 'always', period: 500 }],
                    },
                  ],
                }),
              },
            })}
          />
        </ScadaTestProviders>,
      );
      // reload 域 animator 启动
      await waitFor(() => animators.length >= 2);
      const reloadAnimator = animators[animators.length - 1];
      expect(reloadAnimator.isPlaying('rect-1', 'rotate')).toBe(true);

      // unmount：mount cleanup 经 releaseRuntime 释放 runtimeRef.current 的最新域（M1 fix）
      view.unmount();

      // 最新（reload 域）animator 时钟停止：destroy 清空 playing map → isPlaying=false
      // 未 fix（mount cleanup 持旧域闭包）→ reload 域 animator 永久空转，isPlaying 仍 true
      await waitFor(() => expect(reloadAnimator.isPlaying('rect-1', 'rotate')).toBe(false));
    } finally {
      Animator.prototype.start = realStart;
    }
  });

  it('ResizeObserver callback dispatches setSize on the rAF (lifecycle wiring)', async () => {
    const ro = installResizeObserverSpy();
    try {
      const environment = createScadaTestEnvironment([]);
      renderScadaCanvas(makeProps({ props: { config: configProp(textConfig()) } }), environment);
      await waitFor(() => expect(scadaTestHandle(7)).toBeDefined());
      const engine = scadaTestHandle(7)?.engine as ScadaCanvasEngine;
      const spy = vi.spyOn(engine, 'setSize');
      const observer = ro.observers[ro.observers.length - 1];
      observer.cb([{ target: document.body, contentRect: { width: 320, height: 240 } }]);
      await waitFor(() => expect(spy).toHaveBeenCalledWith(320, 240));
      spy.mockRestore();
    } finally {
      ro.restore();
    }
  });

  it('width/height props drive engine.setSize on mount (lifecycle wiring baseline)', async () => {
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(
      makeProps({ props: { config: configProp(textConfig()), width: 640, height: 480 } }),
      environment,
    );
    await waitFor(() => expect(scadaTestHandle(7)?.getSymbol('rect-1')).toBeDefined());
    const engine = scadaTestHandle(7)?.engine as ScadaCanvasEngine;
    const size = engine.getSize();
    expect(size.width).toBe(640);
    expect(size.height).toBe(480);
  });

  it('width/height prop changes trigger engine.setSize (Phase 4 WD-1/m10: props reaction)', async () => {
    // plan 2026-08-04-1558-2 Phase 4 WD-1：补 width/height effect deps → props 变更触发 setSize
    // （design-renderer.md §8.3 声称「width/height 变化 → 引擎命令式 API」）。
    const environment = createScadaTestEnvironment([]);
    const view = renderScadaCanvas(
      makeProps({ props: { config: configProp(textConfig()), width: 320, height: 240 } }),
      environment,
    );
    await waitFor(() => expect(scadaTestHandle(7)?.getSymbol('rect-1')).toBeDefined());
    const engine = scadaTestHandle(7)?.engine as ScadaCanvasEngine;
    expect(engine.getSize()).toMatchObject({ width: 320, height: 240 });

    // props 变更 → effect 重跑 → setSize 调用
    view.rerender(
      <ScadaTestProviders environment={environment}>
        <ScadaCanvasRenderer
          {...makeProps({ props: { config: configProp(textConfig()), width: 800, height: 600 } })}
        />
      </ScadaTestProviders>,
    );
    await waitFor(() => {
      const size = engine.getSize();
      expect(size.width).toBe(800);
      expect(size.height).toBe(600);
    });
  });
});
