import React from 'react';
import { cleanup, waitFor } from '@testing-library/react';
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
import { decideSyncStrategy } from './hooks/use-scada-config-sync.js';
import type { ScadaCanvasSchema } from '../schemas.js';
import type { ScadaConfig } from '../serialization/config-types.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));

const lifecycleConfig = (overrides: Record<string, unknown> = {}): ScadaConfig =>
  validCanvasConfig({
    symbols: [
      { id: 'rect-1', type: 'scada-rect', x: 10, y: 20, width: 100, height: 50, fill: '#ff0000' },
      { id: 'rect-2', type: 'scada-rect', x: 200, y: 20, width: 100, height: 50, fill: '#00ff00' },
    ],
    ...overrides,
  });

function makeRegion(render: () => unknown) {
  return { render: vi.fn(render) } as unknown as RendererComponentProps<ScadaCanvasSchema>['regions'][string];
}

beforeEach(() => {
  resetLeaferMock();
  registerBuiltinScadaSymbols();
});

afterEach(() => {
  cleanup();
});

describe('scada-canvas lifecycle (I10.1)', () => {
  it('mounts and creates the engine with cid + exposeTestHandle passed through', async () => {
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(makeScadaCanvasProps({ cid: 7 }), environment);
    await waitFor(() => expect(scadaTestHandle(7)).toBeDefined());
    expect(scadaTestHandle(7)?.engine).toBeInstanceOf(ScadaCanvasEngine);
  });

  it('parses config and builds the scene (symbols resolvable via the test handle)', async () => {
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(makeScadaCanvasProps({ cid: 7, props: { config: configProp(lifecycleConfig()) } }), environment);
    await waitFor(() => expect(scadaTestHandle(7)?.getSymbol('rect-1')).toBeDefined());
    const engine = scadaTestHandle(7)?.engine as ScadaCanvasEngine;
    expect(engine?.getSymbols().map((leaf) => leaf.id)).toEqual(['rect-1', 'rect-2']);
    expect((scadaTestHandle(7)?.getSymbol('rect-1') as { fill: string })?.fill).toBe('#ff0000');
  });

  it('fires onReady by dispatching the onReady action with a normalized scada:ready event', async () => {
    const dispatch = vi.fn().mockResolvedValue({ ok: true });
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(
      makeScadaCanvasProps({ cid: 7,
        props: { config: configProp(lifecycleConfig()), events: { onReady: { action: 'noop' } } },
        node: { scope: environment.scope } as RendererComponentProps<ScadaCanvasSchema>['node'],
        helpers: { dispatch } as unknown as RendererComponentProps<ScadaCanvasSchema>['helpers'],
      }),
      environment,
    );
    await waitFor(() => expect(dispatch).toHaveBeenCalled());
    const [action, ctx] = dispatch.mock.calls[0] as [
      { action: string },
      { event: { type: string }; scope: unknown },
    ];
    expect(action).toMatchObject({ action: 'noop' });
    expect(ctx.event.type).toBe('scada:ready');
    expect(ctx.scope).toBe(environment.scope);
  });

  it('unmount destroys the engine idempotently and removes the test handle', async () => {
    const environment = createScadaTestEnvironment([]);
    const view = renderScadaCanvas(makeScadaCanvasProps({ cid: 7 }), environment);
    await waitFor(() => expect(scadaTestHandle(7)).toBeDefined());
    const app = (scadaTestHandle(7)?.engine as unknown as { app: { destroyed: boolean } }).app;
    view.unmount();
    await waitFor(() => expect(scadaTestHandle(7)).toBeUndefined());
    expect(app.destroyed).toBe(true);
  });

  it('debounces resize to a frame and calls engine.setSize via ResizeObserver', async () => {
    type ROEntry = { target: Element; contentRect: { width: number; height: number } };
    const observers: Array<{ cb: (entries: ROEntry[]) => void; targets: Set<Element> }> = [];
    class MockResizeObserver {
      cb: (entries: ROEntry[]) => void;
      targets = new Set<Element>();
      constructor(cb: (entries: ROEntry[]) => void) {
        this.cb = cb;
        observers.push(this);
      }
      observe(target: Element) {
        this.targets.add(target);
      }
      unobserve(target: Element) {
        this.targets.delete(target);
      }
      disconnect() {
        this.targets.clear();
      }
    }
    const NativeRO = globalThis.ResizeObserver;
    globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
    try {
      const environment = createScadaTestEnvironment([]);
      renderScadaCanvas(makeScadaCanvasProps({ cid: 7 }), environment);
      await waitFor(() => expect(scadaTestHandle(7)).toBeDefined());
      const app = (
        scadaTestHandle(7)?.engine as unknown as {
          app: { resizeCalls: Array<{ width: number; height: number }> };
        }
      ).app;
      for (const observer of observers) {
        observer.cb([{ target: document.body, contentRect: { width: 640, height: 480 } }]);
        observer.cb([{ target: document.body, contentRect: { width: 700, height: 500 } }]);
      }
      await waitFor(() => expect(app.resizeCalls).toContainEqual({ width: 700, height: 500 }));
    } finally {
      globalThis.ResizeObserver = NativeRO;
    }
  });

  it('applies config changes incrementally via applyDiff (node identity preserved, no full reset)', async () => {
    const environment = createScadaTestEnvironment([]);
    const view = renderScadaCanvas(makeScadaCanvasProps({ cid: 7, props: { config: configProp(lifecycleConfig()) } }), environment);
    await waitFor(() => expect(scadaTestHandle(7)?.getSymbol('rect-1')).toBeDefined());
    const engine = scadaTestHandle(7)?.engine as ScadaCanvasEngine;
    const originalInnerId = (
      engine.getSymbol('rect-1')?.node as unknown as { innerId: number }
    ).innerId;

    const next = lifecycleConfig({
      symbols: [
        { id: 'rect-1', type: 'scada-rect', x: 10, y: 20, width: 100, height: 50, fill: '#123456' },
        { id: 'rect-3', type: 'scada-rect', x: 300, y: 20, width: 60, height: 40, fill: '#0000ff' },
      ],
    });
    view.rerender(
      <ScadaTestProviders environment={environment}>
        <ScadaCanvasRenderer {...makeScadaCanvasProps({ cid: 7, props: { config: configProp(next) } })} />
      </ScadaTestProviders>,
    );
    await waitFor(() =>
      expect((scadaTestHandle(7)?.getSymbol('rect-1') as { fill: string })?.fill).toBe('#123456'),
    );
    const updatedEngine = scadaTestHandle(7)?.engine as ScadaCanvasEngine;
    expect(
      (updatedEngine.getSymbol('rect-1')?.node as unknown as { innerId: number }).innerId,
    ).toBe(originalInnerId);
    expect(updatedEngine.getSymbols().map((leaf) => leaf.id)).toEqual(['rect-1', 'rect-3']);
  });

  it('importConfig converges the props-sync baseline: import-then-edit builds no duplicate symbols (P1-5)', async () => {
    const environment = createScadaTestEnvironment([]);
    const view = renderScadaCanvas(makeScadaCanvasProps({ cid: 7, props: { config: configProp(lifecycleConfig()) } }), environment);
    await waitFor(() => expect(scadaTestHandle(7)?.getSymbol('rect-1')).toBeDefined());
    const handle = environment.componentRegistry.resolve({ componentId: 'scada-1' }) as unknown as {
      capabilities: { invoke: (m: string, p: unknown) => Promise<{ ok: boolean }> };
    };
    const engine = scadaTestHandle(7)?.engine as ScadaCanvasEngine;
    const treeRoot = () =>
      (engine.tree as unknown as { children: Array<{ children: Array<{ tag: string }> }> }).children[0];

    // importConfig 立即生效：场景树替换为 import config
    const imported = {
      version: 1,
      symbols: [{ id: 'import-1', type: 'scada-ellipse', x: 0, y: 0, width: 40, height: 40 }],
    };
    const importResult = await handle.capabilities.invoke('importConfig', { config: imported });
    expect(importResult.ok).toBe(true);
    await waitFor(() => expect(treeRoot().children).toHaveLength(1));
    expect(treeRoot().children[0]?.tag).toBe('Ellipse');
    expect(engine.getSymbols().map((leaf) => leaf.id)).toEqual(['import-1']);
    expect(
      document.querySelector('[data-slot="scada-canvas"]')?.getAttribute('data-status'),
    ).toBe('ready');

    // 编辑对象源自 import 场景（props config 含 import 引入的 id），移动该图元
    const edited = {
      version: 1,
      symbols: [{ id: 'import-1', type: 'scada-ellipse', x: 100, y: 100, width: 40, height: 40 }],
    };
    view.rerender(
      <ScadaTestProviders environment={environment}>
        <ScadaCanvasRenderer {...makeScadaCanvasProps({ cid: 7, props: { config: configProp(edited) } })} />
      </ScadaTestProviders>,
    );
    await waitFor(() => expect((scadaTestHandle(7)?.getSymbol('import-1') as { x: number })?.x).toBe(100));
    // 基线已同步：import 图元不被当作 added 重建，场景树无重复节点
    expect(treeRoot().children).toHaveLength(1);
    expect(engine.getSymbols().map((leaf) => leaf.id)).toEqual(['import-1']);
    expect(
      document.querySelector('[data-slot="scada-canvas"]')?.getAttribute('data-status'),
    ).toBe('ready');
  });

  it('renders ready (empty scene) when config is missing, and the empty region on invalid config (plan 2026-08-04-1558-1 Phase 3)', async () => {
    // P3 fix: 缺 config 不再永久 loading——parseAndValidateConfig 兜底返回最小合法空场景，
    // renderer 进入 ready 渲染 canvas 层（loading region 不再被调用）。
    const environment = createScadaTestEnvironment([]);
    const loadingRegion = makeRegion(() => <div data-testid="custom-loading" />);
    const emptyRegion = makeRegion(() => <div data-testid="custom-empty" />);
    const view = renderScadaCanvas(
      makeScadaCanvasProps({ cid: 7, regions: { loading: loadingRegion, empty: emptyRegion } }),
      environment,
    );
    // 缺 config → 空场景构建 → ready（loading region 不再渲染）
    // 注：status 初始为 'loading'（useState 初值），首帧 loading.render() 会被调用一次，
    // 随后空场景构建 onBuilt → setStatus('ready')，loading DOM 移除。本断言验证最终态。
    await waitFor(() =>
      expect(
        document.querySelector('[data-slot="scada-canvas"]')?.getAttribute('data-status'),
      ).toBe('ready'),
    );
    expect(document.querySelector('[data-testid="custom-loading"]')).toBeNull();
    expect(document.querySelector('[data-slot="scada-canvas-canvas"]')).toBeTruthy();

    view.rerender(
      <ScadaTestProviders environment={environment}>
        <ScadaCanvasRenderer
          {...makeScadaCanvasProps({ cid: 7,
            props: { config: configProp({ version: 2 }) },
            regions: { loading: loadingRegion, empty: emptyRegion },
          })}
        />
      </ScadaTestProviders>,
    );
    await waitFor(() => expect(emptyRegion.render).toHaveBeenCalled());
    expect(document.querySelector('[data-testid="custom-empty"]')).toBeTruthy();
  });

  it('applies the initial viewport policy (fit fill + center) with exact centering math (P1-6)', async () => {
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(
      makeScadaCanvasProps({ cid: 7,
        props: {
          config: configProp(lifecycleConfig()),
          width: 800,
          height: 600,
          viewport: { fit: 'fill', center: true },
        },
      }),
      environment,
    );
    await waitFor(() => expect(scadaTestHandle(7)).toBeDefined());
    const engine = scadaTestHandle(7)?.engine as ScadaCanvasEngine;
    // 非巧合几何精确断言：vx = cx - sw/(2s)（bounds cx=155, cy=45, fill scale=12, sw=800）
    await waitFor(() => expect(engine.getViewport().scale).toBeCloseTo(12, 6));
    const viewport = engine.getViewport();
    expect(viewport.scale).toBeCloseTo(12, 6);
    expect(viewport.x).toBeCloseTo(155 - 800 / (2 * 12), 6);
    expect(viewport.y).toBeCloseTo(45 - 600 / (2 * 12), 6);
  });

  it('applies the center policy at the current scale with exact math (P1-6)', async () => {
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(
      makeScadaCanvasProps({ cid: 7,
        props: {
          config: configProp(lifecycleConfig()),
          width: 800,
          height: 600,
          viewport: { center: true },
        },
      }),
      environment,
    );
    await waitFor(() => expect(scadaTestHandle(7)).toBeDefined());
    const engine = scadaTestHandle(7)?.engine as ScadaCanvasEngine;
    await waitFor(() => expect(engine.getViewport().scale).toBe(1));
    const viewport = engine.getViewport();
    expect(viewport.scale).toBe(1);
    expect(viewport.x).toBeCloseTo(155 - 800 / 2, 6);
    expect(viewport.y).toBeCloseTo(45 - 600 / 2, 6);
  });

  it('applies the contain fit with min-scale semantics and exact math (P1-6 regression)', async () => {
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(
      makeScadaCanvasProps({ cid: 7,
        props: {
          config: configProp(lifecycleConfig()),
          width: 800,
          height: 600,
          viewport: { fit: 'contain' },
        },
      }),
      environment,
    );
    await waitFor(() => expect(scadaTestHandle(7)).toBeDefined());
    const engine = scadaTestHandle(7)?.engine as ScadaCanvasEngine;
    await waitFor(() => expect(engine.getViewport().x).toBeCloseTo(10, 6));
    const viewport = engine.getViewport();
    expect(viewport.scale).toBeCloseTo(800 / 290, 6);
    expect(viewport.x).toBeCloseTo(155 - 800 / (2 * (800 / 290)), 6);
    expect(viewport.y).toBeCloseTo(45 - 600 / (2 * (800 / 290)), 6);
  });

  it('does not re-apply the initial viewport policy on diff updates, only on full resets (gate-4 m-B)', async () => {
    const environment = createScadaTestEnvironment([]);
    const view = renderScadaCanvas(
      makeScadaCanvasProps({ cid: 7,
        props: {
          config: configProp(lifecycleConfig()),
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
    const framed = engine.getViewport();
    expect(framed.scale).toBeGreaterThan(1);

    view.rerender(
      <ScadaTestProviders environment={environment}>
        <ScadaCanvasRenderer
          {...makeScadaCanvasProps({ cid: 7,
            props: {
              config: configProp(
                lifecycleConfig({
                  symbols: [
                    { id: 'rect-1', type: 'scada-rect', x: 10, y: 20, width: 100, height: 50, fill: '#123456' },
                    { id: 'rect-2', type: 'scada-rect', x: 200, y: 20, width: 100, height: 50, fill: '#00ff00' },
                  ],
                }),
              ),
              width: 800,
              height: 600,
              viewport: { fit: 'fill', center: true },
            },
          })}
        />
      </ScadaTestProviders>,
    );
    await waitFor(() =>
      expect((scadaTestHandle(7)?.getSymbol('rect-1') as { fill: string })?.fill).toBe('#123456'),
    );
    expect(engine.getViewport()).toEqual(framed);

    view.rerender(
      <ScadaTestProviders environment={environment}>
        <ScadaCanvasRenderer
          {...makeScadaCanvasProps({ cid: 7,
            props: {
              config: configProp(lifecycleConfig({ version: 2 })),
              width: 800,
              height: 600,
              viewport: { fit: 'fill', center: true },
            },
          })}
        />
      </ScadaTestProviders>,
    );
    await waitFor(() => expect(engine.getViewport().scale).toBeGreaterThan(1));
  });

  it('reports config-parse errors through the onError dispatch path', async () => {
    const dispatch = vi.fn().mockResolvedValue({ ok: true });
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(
      makeScadaCanvasProps({ cid: 7,
        props: { config: '{broken json', events: { onError: { action: 'noop' } } },
        helpers: { dispatch } as unknown as RendererComponentProps<ScadaCanvasSchema>['helpers'],
      }),
      environment,
    );
    await waitFor(() => expect(dispatch).toHaveBeenCalled());
    const ctx = dispatch.mock.calls[0][1] as { event: { type: string; code: string } };
    expect(ctx.event.type).toBe('scada:error');
    expect(ctx.event.code).toBe('config-parse');
    expect(document.querySelector('[data-slot="scada-canvas-error"]')).toBeTruthy();
  });

  it('applies state styles through the refresh pipeline (binding → state → applyAttrs)', async () => {
    const stateConfig = lifecycleConfig({
      variables: [{ id: 'level', source: 'static', value: 0 }],
      symbols: [
        {
          id: 'rect-1',
          type: 'scada-rect',
          x: 10,
          y: 20,
          width: 100,
          height: 50,
          bindings: { fill: { point: 'level' } },
          states: {
            states: {
              run: { style: { fill: '#00ff00' }, animations: [{ kind: 'blink', period: 50 }] },
              stop: { style: { fill: '#ff0000' } },
            },
            booleanMap: { true: 'run', false: 'stop' },
          },
        },
      ],
    });
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(makeScadaCanvasProps({ cid: 7, props: { config: configProp(stateConfig) } }), environment);
    await waitFor(() => expect(scadaTestHandle(7)?.getSymbol('rect-1')).toBeDefined());
    const handle = environment.componentRegistry.resolve({ componentId: 'scada-1' }) as unknown as {
      capabilities: { invoke: (m: string, p: unknown) => Promise<{ ok: boolean }> };
    };
    const write = await handle.capabilities.invoke('setPointValue', { pointId: 'level', value: 1 });
    expect(write.ok).toBe(true);
    const engine = scadaTestHandle(7)?.engine as ScadaCanvasEngine;
    const node = engine.getSymbol('rect-1')?.node as unknown as { fill: string };
    await waitFor(() => expect(node.fill).toBe('#00ff00'));
  });

  it('renders without a cid attribute when meta.cid is unset (engine auto-assigns)', async () => {
    const environment = createScadaTestEnvironment([]);
    const view = renderScadaCanvas(
      makeScadaCanvasProps({ cid: 7,
        meta: { visible: true, hidden: false, disabled: false, changed: false } as RendererComponentProps<ScadaCanvasSchema>['meta'],
      }),
      environment,
    );
    await waitFor(() =>
      expect(Object.keys(window).filter((key) => key.startsWith('__flux_scada_')).length).toBe(1),
    );
    expect(view.container.querySelector('[data-slot="scada-canvas"]')?.getAttribute('data-cid')).toBeNull();
  });

  it('falls back to the default error placeholder when the empty region renders nothing', async () => {
    const environment = createScadaTestEnvironment([]);
    const emptyRegion = makeRegion(() => undefined);
    renderScadaCanvas(
      makeScadaCanvasProps({ cid: 7,
        props: { config: configProp({ version: 2 }) },
        regions: { empty: emptyRegion },
      }),
      environment,
    );
    await waitFor(() => expect(emptyRegion.render).toHaveBeenCalled());
    const error = document.querySelector('[data-slot="scada-canvas-error"]');
    expect(error).toBeTruthy();
    expect(error?.getAttribute('data-code')).toBe('config-invalid');
  });

  it('fires onError by dispatching the onError action with a normalized scada:error event on invalid config', async () => {
    const dispatch = vi.fn().mockResolvedValue({ ok: true });
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(
      makeScadaCanvasProps({ cid: 7,
        props: { config: configProp({ version: 2 }), events: { onError: { action: 'noop' } } },
        helpers: { dispatch } as unknown as RendererComponentProps<ScadaCanvasSchema>['helpers'],
      }),
      environment,
    );
    await waitFor(() => expect(dispatch).toHaveBeenCalled());
    const [action, ctx] = dispatch.mock.calls[0] as [
      { action: string },
      { event: { type: string; code: string } },
    ];
    expect(action).toMatchObject({ action: 'noop' });
    expect(ctx.event.type).toBe('scada:error');
    expect(ctx.event.code).toBe('config-invalid');
  });

  it('falls back to the empty region + onError when engine creation fails', async () => {
    const dispatch = vi.fn().mockResolvedValue({ ok: true });
    const environment = createScadaTestEnvironment([]);
    const createSpy = vi
      .spyOn(ScadaCanvasEngine, 'create')
      .mockImplementationOnce(() => {
        throw new Error('canvas unavailable');
      });
    try {
      renderScadaCanvas(
        makeScadaCanvasProps({ cid: 7,
          props: { config: configProp(lifecycleConfig()), events: { onError: { action: 'noop' } } },
          helpers: { dispatch } as unknown as RendererComponentProps<ScadaCanvasSchema>['helpers'],
        }),
        environment,
      );
      await waitFor(() => expect(dispatch).toHaveBeenCalled());
      expect((dispatch.mock.calls[0][1] as { event: { code: string } }).event.code).toBe(
        'engine-create-failed',
      );
      expect(document.querySelector('[data-slot="scada-canvas-error"]')).toBeTruthy();
    } finally {
      createSpy.mockRestore();
    }
  });

  it('reports engine creation failures with non-Error throws and survives a missing ResizeObserver', async () => {
    const dispatch = vi.fn().mockResolvedValue({ ok: true });
    const environment = createScadaTestEnvironment([]);
    const createSpy = vi
      .spyOn(ScadaCanvasEngine, 'create')
      .mockImplementationOnce(() => {
        throw 'canvas-boom';
      });
    const nativeRO = globalThis.ResizeObserver;
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = undefined;
    try {
      renderScadaCanvas(
        makeScadaCanvasProps({ cid: 7,
          props: { config: configProp(lifecycleConfig()), events: { onError: { action: 'noop' } } },
          helpers: { dispatch } as unknown as RendererComponentProps<ScadaCanvasSchema>['helpers'],
        }),
        environment,
      );
      await waitFor(() => expect(dispatch).toHaveBeenCalled());
      expect((dispatch.mock.calls[0][1] as { event: { code: string; message: string } }).event.code).toBe(
        'engine-create-failed',
      );
      expect((dispatch.mock.calls[0][1] as { event: { message: string } }).event.message).toBe(
        'canvas-boom',
      );
    } finally {
      createSpy.mockRestore();
      (globalThis as { ResizeObserver?: unknown }).ResizeObserver = nativeRO;
    }
  });

  it('handles empty ResizeObserver entries without scheduling a resize', async () => {
    type ROEntry = { target: Element; contentRect: { width: number; height: number } };
    const observers: Array<{ cb: (entries: ROEntry[]) => void; targets: Set<Element> }> = [];
    class MockResizeObserver {
      cb: (entries: ROEntry[]) => void;
      targets = new Set<Element>();
      constructor(cb: (entries: ROEntry[]) => void) {
        this.cb = cb;
        observers.push(this);
      }
      observe(target: Element) {
        this.targets.add(target);
      }
      unobserve(target: Element) {
        this.targets.delete(target);
      }
      disconnect() {
        this.targets.clear();
      }
    }
    const NativeRO = globalThis.ResizeObserver;
    globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
    try {
      const environment = createScadaTestEnvironment([]);
      renderScadaCanvas(makeScadaCanvasProps({ cid: 7 }), environment);
      await waitFor(() => expect(scadaTestHandle(7)).toBeDefined());
      for (const observer of observers) {
        observer.cb([]);
      }
      const app = (
        scadaTestHandle(7)?.engine as unknown as {
          app: { resizeCalls: Array<{ width: number; height: number }> };
        }
      ).app;
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(app.resizeCalls).toEqual([]);
    } finally {
      globalThis.ResizeObserver = NativeRO;
    }
  });

  it('destroys idempotently through the component handle (double destroy)', async () => {
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(makeScadaCanvasProps({ cid: 7 }), environment);
    await waitFor(() => expect(scadaTestHandle(7)).toBeDefined());
    const handle = environment.componentRegistry.resolve({ componentId: 'scada-1' }) as unknown as {
      capabilities: { invoke: (m: string, p: unknown) => Promise<{ ok: boolean }> };
    };
    expect((await handle.capabilities.invoke('destroy', undefined)).ok).toBe(true);
    expect((await handle.capabilities.invoke('destroy', undefined)).ok).toBe(true);
    await waitFor(() => expect(scadaTestHandle(7)).toBeUndefined());
  });

  it('cancels a pending resize frame when unmounting before the rAF fires', async () => {
    type ROEntry = { target: Element; contentRect: { width: number; height: number } };
    const observers: Array<{ cb: (entries: ROEntry[]) => void; targets: Set<Element> }> = [];
    class MockResizeObserver {
      cb: (entries: ROEntry[]) => void;
      targets = new Set<Element>();
      constructor(cb: (entries: ROEntry[]) => void) {
        this.cb = cb;
        observers.push(this);
      }
      observe(target: Element) {
        this.targets.add(target);
      }
      unobserve(target: Element) {
        this.targets.delete(target);
      }
      disconnect() {
        this.targets.clear();
      }
    }
    const NativeRO = globalThis.ResizeObserver;
    globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
    try {
      const environment = createScadaTestEnvironment([]);
      const view = renderScadaCanvas(makeScadaCanvasProps({ cid: 7 }), environment);
      await waitFor(() => expect(scadaTestHandle(7)).toBeDefined());
      const app = (
        scadaTestHandle(7)?.engine as unknown as {
          app: { resizeCalls: Array<{ width: number; height: number }> };
        }
      ).app;
      for (const observer of observers) {
        observer.cb([{ target: document.body, contentRect: { width: 640, height: 480 } }]);
      }
      view.unmount();
      await new Promise((resolve) => setTimeout(resolve, 40));
      expect(app.resizeCalls).toEqual([]);
    } finally {
      globalThis.ResizeObserver = NativeRO;
    }
  });
});

describe('sync strategy decision (Failure Paths diff-sync-mismatch)', () => {
  it('first config and version changes resolve to full reset; same version resolves to diff', () => {
    const v1 = lifecycleConfig();
    const v1Next = lifecycleConfig({ symbols: [{ id: 'only', type: 'scada-rect', x: 0, y: 0 }] });
    const v2 = { ...lifecycleConfig(), version: 2 } as unknown as ScadaConfig;
    expect(decideSyncStrategy(undefined, v1)).toBe('full');
    expect(decideSyncStrategy(v1, v1Next)).toBe('diff');
    expect(decideSyncStrategy(v1, v2)).toBe('full');
  });
});
