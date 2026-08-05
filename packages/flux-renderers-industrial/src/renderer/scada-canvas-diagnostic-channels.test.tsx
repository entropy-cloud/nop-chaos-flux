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
  scadaTestHandle,
  validCanvasConfig,
} from '../test-support/renderer-test-support.js';
import type { ScadaCanvasSchema } from '../schemas.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));

/** 断言 console.warn spy 收到 `[scada-canvas]', <code>[, <message>]` 诊断调用。 */
const warnReported = (
  spy: ReturnType<typeof vi.spyOn>,
  code: string,
  message?: string,
): boolean =>
  spy.mock.calls.some((call: unknown[]) => {
    const [tag, callCode, callMsg] = call as [unknown, unknown, unknown];
    return (
      tag === '[scada-canvas]' &&
      callCode === code &&
      (message === undefined || callMsg === message)
    );
  });

/** 统计 console.warn spy 收到的指定 code 诊断调用次数（去重断言用）。 */
const warnReportCount = (spy: ReturnType<typeof vi.spyOn>, code: string): number =>
  spy.mock.calls.filter((call: unknown[]) => {
    const [tag, callCode] = call as [unknown, unknown];
    return tag === '[scada-canvas]' && callCode === code;
  }).length;

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  resetLeaferMock();
  registerBuiltinScadaSymbols();
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  warnSpy.mockRestore();
  cleanup();
});

/**
 * plan 2026-08-04-2242-1 诊断通道接通回归（P1-1 onError + P1-2 onHandlerError）。
 * 关键：经**生产 renderer 装配路径**触发（mount `scada-canvas`，非 `renderHook` 直注 callback），
 * 断言两类错误经选定非升级诊断出口（console.warn + env.monitor）可见，画布保持 `ready`（§8.1 降级契约）。
 */
describe('scada-canvas diagnostic channel wiring (plan 2026-08-04-2242-1)', () => {
  it('surfaces flux evaluate failures through the renderer-level diagnostic outlet while the canvas stays ready (P1-1)', async () => {
    const monitorSpy = vi.fn();
    const dispatch = vi.fn().mockResolvedValue({ ok: true });
    const environment = createScadaTestEnvironment([], { analog: { temp: null } });
    // 复用既有 host telemetry 钩子（ExpressionExecutionEnv.monitor，phase:'expression'）
    environment.runtime.env.monitor = { onError: monitorSpy };
    const fluxConfig = validCanvasConfig({
      version: 1,
      variables: [{ id: 'temp', source: 'flux', flux: '$analog.temp.value' }],
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
      makeScadaCanvasProps({ cid: 19,
        props: { config: configProp(fluxConfig) },
        node: { scope: environment.scope } as RendererComponentProps<ScadaCanvasSchema>['node'],
        helpers: { dispatch } as unknown as RendererComponentProps<ScadaCanvasSchema>['helpers'],
      }),
      environment,
    );
    await waitFor(() => expect(scadaTestHandle(19)).toBeDefined());

    // 选定诊断出口被调用：console.warn 保底 + env.monitor host telemetry（phase:'expression'）
    await waitFor(() => expect(warnReported(warnSpy, 'flux-evaluate-failed')).toBe(true));
    await waitFor(() => expect(monitorSpy).toHaveBeenCalled());
    const monitorPayload = monitorSpy.mock.calls[0][0] as { phase: string; details?: { code?: string } };
    expect(monitorPayload.phase).toBe('expression');
    expect(monitorPayload.details?.code).toBe('flux-evaluate-failed');

    // 画布保持 ready（诊断 ≠ status 升级，§8.1）
    expect(document.querySelector('[data-slot="scada-canvas"]')?.getAttribute('data-status')).toBe('ready');
    expect(document.querySelector('[data-slot="scada-canvas-error"]')).toBeNull();
    // 数据错误不派发画布级 scada:error（§8.1 onError 仅 config 校验/构建失败）
    expect(
      dispatch.mock.calls.filter(
        ([, ctx]) => (ctx as { event?: { type?: string } } | undefined)?.event?.type === 'scada:error',
      ),
    ).toHaveLength(0);
  });

  it('dedupes flux error reports: repeated failing scope updates do not grow the diagnostic outlet call count', async () => {
    const dispatch = vi.fn().mockResolvedValue({ ok: true });
    const environment = createScadaTestEnvironment([], { analog: { temp: null } });
    const fluxConfig = validCanvasConfig({
      version: 1,
      variables: [{ id: 'temp', source: 'flux', flux: '$analog.temp.value' }],
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
      makeScadaCanvasProps({ cid: 19,
        props: { config: configProp(fluxConfig) },
        node: { scope: environment.scope } as RendererComponentProps<ScadaCanvasSchema>['node'],
        helpers: { dispatch } as unknown as RendererComponentProps<ScadaCanvasSchema>['helpers'],
      }),
      environment,
    );
    await waitFor(() => expect(scadaTestHandle(19)).toBeDefined());
    await waitFor(() => expect(warnReported(warnSpy, 'flux-evaluate-failed')).toBe(true));
    const callsAfterFirst = warnReportCount(warnSpy, 'flux-evaluate-failed');

    // 多次同表达式同错误码失败触发（scope 更新引起桥接 effect 重跑）→ 去重，上报计数不增长
    environment.scope.update('analog', { temp: null, other: 1 });
    environment.scope.update('analog', { temp: null, other: 2 });
    await new Promise((resolve) => setTimeout(resolve, 40));

    const callsAfterRepeat = warnReportCount(warnSpy, 'flux-evaluate-failed');
    expect(callsAfterRepeat).toBe(callsAfterFirst);
    expect(document.querySelector('[data-slot="scada-canvas"]')?.getAttribute('data-status')).toBe('ready');
  });

  it('surfaces a thrown user-side action through the diagnostic outlet, canvas stays ready, and subsequent clicks still reach the handler (P1-2)', async () => {
    // 用户侧 action 处理器故意同步 throw（坏 ActionSchema / typo 表达式类），模拟 onSymbolClick 内 throw
    const dispatch = vi.fn(() => {
      throw new Error('handler boom');
    });
    const environment = createScadaTestEnvironment([]);
    const clickConfig = validCanvasConfig({
      version: 1,
      symbols: [
        { id: 'rect-1', type: 'scada-rect', x: 10, y: 20, width: 100, height: 50, fill: '#ff0000' },
      ],
    });
    renderScadaCanvas(
      makeScadaCanvasProps({ cid: 19,
        props: { config: configProp(clickConfig), width: 800, height: 600, events: { onSymbolClick: { action: 'noop' } } },
        node: { scope: environment.scope } as RendererComponentProps<ScadaCanvasSchema>['node'],
        helpers: { dispatch } as unknown as RendererComponentProps<ScadaCanvasSchema>['helpers'],
      }),
      environment,
    );
    await waitFor(() => expect(scadaTestHandle(19)).toBeDefined());
    const engine = scadaTestHandle(19)?.engine as ScadaCanvasEngine;
    const leaf = engine.getSymbol('rect-1')?.node;
    (engine.tree as unknown as { selector: { getByPoint: (p: unknown) => unknown } }).selector.getByPoint = () =>
      ({ target: leaf, path: [leaf] });

    // 首次点击 → 处理器 throw → safeRun 隔离 + reportHandlerError 去重上报 → 诊断出口
    engine.tree.emit('tap', { x: 20, y: 25 });
    await waitFor(() => expect(warnReported(warnSpy, 'handler-error', 'handler boom')).toBe(true));

    // 画布保持 ready（异常隔离不升级画布 status）
    expect(document.querySelector('[data-slot="scada-canvas"]')?.getAttribute('data-status')).toBe('ready');
    expect(dispatch).toHaveBeenCalledTimes(1);

    // 异常隔离不杀死交互管线：后续点击仍可达处理器（dispatch 再次被调）
    engine.tree.emit('tap', { x: 20, y: 25 });
    await new Promise((resolve) => setTimeout(resolve, 160));
    expect(dispatch).toHaveBeenCalledTimes(2);

    // 去重：同消息 throw 仅上报一次（handler-error console.warn 计数仍为 1）
    expect(warnReportCount(warnSpy, 'handler-error')).toBe(1);
  });

  it('self-isolates when the diagnostic outlet itself throws (channel-outlet-throws does not reflux)', async () => {
    // env.monitor.onError 故意 throw → 诊断出口 try/catch 自保护，不得回流 engine/hook
    const throwingMonitor = vi.fn(() => {
      throw new Error('monitor dead');
    });
    const environment = createScadaTestEnvironment([], { analog: { temp: null } });
    environment.runtime.env.monitor = { onError: throwingMonitor };
    const fluxConfig = validCanvasConfig({
      version: 1,
      variables: [{ id: 'temp', source: 'flux', flux: '$analog.temp.value' }],
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
    // 渲染不应抛——通道自身 throw 被出口 try/catch 吞掉
    expect(() =>
      renderScadaCanvas(
        makeScadaCanvasProps({ cid: 19,
          props: { config: configProp(fluxConfig) },
          node: { scope: environment.scope } as RendererComponentProps<ScadaCanvasSchema>['node'],
        }),
        environment,
      ),
    ).not.toThrow();
    await waitFor(() => expect(scadaTestHandle(19)).toBeDefined());
    await waitFor(() => expect(throwingMonitor).toHaveBeenCalled());
    // console.warn 保底仍先于 monitor 执行（即使 monitor throw，warn 已发生）
    expect(warnReported(warnSpy, 'flux-evaluate-failed')).toBe(true);
    // 画布仍 ready（出口 throw 未升级 status、未回流 engine）
    await waitFor(() =>
      expect(document.querySelector('[data-slot="scada-canvas"]')?.getAttribute('data-status')).toBe('ready'),
    );
  });

  // plan 2026-08-05-0325-1（W1 successor）：复杂表达式 probe 返空 deps → flux-deps-empty 经
  // reportDiagnostic 的 monitor.onError（phase 'expression'）分支上报，画布保持 ready（非升级）。
  it('surfaces flux-deps-empty through monitor.onError (expression phase) when a complex expression reads scope but the probe returns no deps', async () => {
    const monitorSpy = vi.fn();
    const dispatch = vi.fn().mockResolvedValue({ ok: true });
    const environment = createScadaTestEnvironment([], { analog: { temp: 25 } });
    environment.runtime.env.monitor = { onError: monitorSpy };
    // stub compiler：createState 返 root 无 dependencies → extractExpressionDepsViaProbe 返 []
    // （复杂表达式读取 scope 但平台 collector 失败）。evaluateValue 返值（主 effect 不报 flux-evaluate-failed）。
    environment.runtime.expressionCompiler = {
      compileValue: () => ({ kind: 'dynamic' }),
      createState: () => ({ root: { kind: 'leaf-state', dependencies: undefined } }),
      evaluateWithState: () => ({ value: 1, changed: false, reusedReference: false }),
      evaluateValue: () => 1,
    } as unknown as typeof environment.runtime.expressionCompiler;
    const fluxConfig = validCanvasConfig({
      version: 1,
      variables: [{ id: 'computed', source: 'flux', flux: '${analog.temp + 1}' }],
      symbols: [
        {
          id: 'rect-1',
          type: 'scada-rect',
          x: 0,
          y: 0,
          width: 50,
          height: 50,
          text: 'init',
          bindings: { text: { point: 'computed' } },
        },
      ],
    });
    renderScadaCanvas(
      makeScadaCanvasProps({ cid: 19,
        props: { config: configProp(fluxConfig) },
        node: { scope: environment.scope } as RendererComponentProps<ScadaCanvasSchema>['node'],
        helpers: { dispatch } as unknown as RendererComponentProps<ScadaCanvasSchema>['helpers'],
      }),
      environment,
    );
    await waitFor(() => expect(scadaTestHandle(19)).toBeDefined());

    // reportDiagnostic 把 flux-deps-empty 纳入 monitor.onError expression-phase 分支
    await waitFor(() => expect(warnReported(warnSpy, 'flux-deps-empty')).toBe(true));
    await waitFor(() => expect(monitorSpy).toHaveBeenCalled());
    const fluxDepsCall = monitorSpy.mock.calls.find((call) => {
      const payload = call[0] as { phase: string; details?: { code?: string } };
      return payload.details?.code === 'flux-deps-empty';
    });
    expect(fluxDepsCall).toBeDefined();
    expect((fluxDepsCall![0] as { phase: string }).phase).toBe('expression');

    // 画布保持 ready（诊断 ≠ status 升级，§8.1）；不派发 scada:error
    expect(document.querySelector('[data-slot="scada-canvas"]')?.getAttribute('data-status')).toBe('ready');
    expect(document.querySelector('[data-slot="scada-canvas-error"]')).toBeNull();
    expect(
      dispatch.mock.calls.filter(
        ([, ctx]) => (ctx as { event?: { type?: string } } | undefined)?.event?.type === 'scada:error',
      ),
    ).toHaveLength(0);
  });
});
