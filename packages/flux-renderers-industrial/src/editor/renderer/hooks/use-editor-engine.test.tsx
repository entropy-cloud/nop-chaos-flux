import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetLeaferMock } from '../../../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../../../symbols/register-builtin.js';
import { useEditorEngine } from './use-editor-engine.js';
import type { ScadaConfig } from '../../../serialization/config-types.js';

vi.mock('leafer-ui', () => import('../../../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));
vi.mock('@leafer-in/editor', () => ({}));

// P2 #18 防御路径：createRuntimeCore 装配失败返回 null（经旗标单次触发，默认透传 actual）。
let failCreateRuntimeCoreOnce = false;
vi.mock('../../runtime-factories.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../runtime-factories.js')>();
  return {
    ...actual,
    createRuntimeCore: (...args: Parameters<typeof actual.createRuntimeCore>) => {
      if (failCreateRuntimeCoreOnce) {
        failCreateRuntimeCoreOnce = false;
        return null;
      }
      return actual.createRuntimeCore(...args);
    },
  };
});

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const baseConfig: ScadaConfig = {
  version: 1,
  variables: [],
  symbols: [{ id: 'a', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 }],
};

function makeContainer(width: number, height: number): HTMLDivElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  // jsdom 无布局——直接 mock clientWidth/clientHeight 使 container-first 路径可观测。
  Object.defineProperty(container, 'clientWidth', { configurable: true, get: () => width });
  Object.defineProperty(container, 'clientHeight', { configurable: true, get: () => height });
  return container;
}

// plan 2026-08-09-1300-1 Phase 1 / 1931-P2-2：editor 容器驱动 DOM 尺寸 effect 对齐 runtime
// （container-first + setSize 后 refitViewportOnResize）。runtime use-scada-engine 已于 plan
// 2026-08-09-0121-1 修正对称缺陷；本测试锁定 editor 同型修复，防回归（args-first 复辟 / 漏 refit）。
//
// 关键纪律：containerRef 必须在 renderHook 外构造为稳定对象——若 inline `{ current: container }` 每渲染
// 新对象，useEditorEngine 的 mount effect（dep 含 containerRef）会 cleanup+re-setup 循环 → setRuntime
// 循环挂死。组件真实用法经 useRef 持稳定身份，此处对齐。
describe('P2-2 — useEditorEngine width/height effect (container-driven sizing + refit parity with runtime)', () => {
  let container: HTMLDivElement;
  let containerRef: { current: HTMLDivElement | null };

  beforeEach(() => {
    resetLeaferMock();
    registerBuiltinScadaSymbols();
    container = makeContainer(400, 300);
    containerRef = { current: container };
  });

  afterEach(() => {
    container.remove();
    vi.restoreAllMocks();
  });

  it('container clientWidth takes priority over args.width, and refitViewportOnResize fires after setSize', async () => {
    const refitSpy = vi.fn();
    // args.width=960 / args.height=520（schema world space），container=400x300（真实 DOM）。
    // 旧实现 args-first → setSize(960,520)（错配）；container-first → setSize(400,300)。
    const { result, rerender, unmount } = renderHook(
      ({ width, height }) =>
        useEditorEngine({
          containerRef,
          initialConfig: baseConfig,
          width,
          height,
        }),
      { initialProps: { width: 960, height: 520 } },
    );

    await waitFor(() => {
      expect(result.current.runtime).toBeTruthy();
    });

    // 注册 refit 闭包（与 scada-editor-canvas setResizeRefit 同入口），使 refitViewportOnResize 可观测。
    act(() => {
      result.current.setResizeRefit(refitSpy);
    });

    const engine = result.current.runtime!.engine;
    const setSizeSpy = vi.spyOn(engine, 'setSize');
    refitSpy.mockClear();

    // 改 args.width 触发 width/height effect 重跑（containerRef/engine/container 不变，仅 width dep 变）。
    rerender({ width: 1000, height: 520 });

    await waitFor(() => {
      expect(setSizeSpy).toHaveBeenCalled();
    });
    unmount();

    // container-first：setSize 收到 container 真实尺寸（400x300），而非 args.width（1000）。
    const lastCall = setSizeSpy.mock.calls[setSizeSpy.mock.calls.length - 1];
    expect(lastCall[0]).toBe(400);
    expect(lastCall[1]).toBe(300);
    // refit 在 setSize 后被调用（与 ResizeObserver handler 对称）。
    expect(refitSpy).toHaveBeenCalled();
  });

  it('args.width fallback when container clientWidth is 0 (jsdom / unmounted path coverage)', async () => {
    // 独立 container：clientWidth=0（模拟未布局 / jsdom），fallback 到 args.width。
    const zeroContainer = document.createElement('div');
    document.body.appendChild(zeroContainer);
    Object.defineProperty(zeroContainer, 'clientWidth', { configurable: true, get: () => 0 });
    Object.defineProperty(zeroContainer, 'clientHeight', { configurable: true, get: () => 0 });
    const zeroRef = { current: zeroContainer };
    try {
      const { result, unmount } = renderHook(() =>
        useEditorEngine({
          containerRef: zeroRef,
          initialConfig: baseConfig,
          width: 800,
          height: 600,
        }),
      );

      await waitFor(() => {
        expect(result.current.runtime).toBeTruthy();
      });
      // runtime 成功装配即证明 fallback 路径未阻塞 mount（container=0 时 args.width 接管 setSize）。
      expect(result.current.runtime).toBeDefined();
      unmount();
    } finally {
      zeroContainer.remove();
    }
  });
});

// ---------------------------------------------------------------------------
// 生命周期防御分支 + plan 522 / L5.5 preview 注入通道接线（focused 补充）。
// ---------------------------------------------------------------------------
describe('useEditorEngine — mount guards and preview injection wiring', () => {
  let container: HTMLDivElement;
  let containerRef: { current: HTMLDivElement | null };

  const boundConfig: ScadaConfig = {
    version: 1,
    variables: [{ id: 'temp', source: 'static' as const, init: 50 }],
    symbols: [
      {
        id: 's1',
        type: 'scada-rect',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        opacity: 1,
        bindings: { opacity: { point: 'temp' } },
      },
    ],
  };

  beforeEach(() => {
    resetLeaferMock();
    registerBuiltinScadaSymbols();
    container = makeContainer(400, 300);
    containerRef = { current: container };
  });

  afterEach(() => {
    container.remove();
    vi.restoreAllMocks();
  });

  it('stays unmounted (runtime null) when the container ref is empty at mount', async () => {
    const emptyRef: { current: HTMLDivElement | null } = { current: null };
    const { result } = renderHook(() =>
      useEditorEngine({ containerRef: emptyRef, initialConfig: baseConfig }),
    );
    // 让 effect 链充分刷新：无容器 → 不装配 engine，也不抛错。
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.runtime).toBeNull();
  });

  it('assembles the runtime without a ResizeObserver when the global is unavailable', async () => {
    const originalRO = globalThis.ResizeObserver;
    // @ts-expect-error 测试专用：模拟无 ResizeObserver 环境（SSR / 老宿主）。
    globalThis.ResizeObserver = undefined;
    try {
      const { result, unmount } = renderHook(() =>
        useEditorEngine({ containerRef, initialConfig: baseConfig }),
      );
      await waitFor(() => expect(result.current.runtime).toBeTruthy());
      unmount();
    } finally {
      globalThis.ResizeObserver = originalRO;
    }
  });

  it('exits mount cleanly when createRuntimeCore fails (engine destroyed, runtime stays null)', async () => {
    failCreateRuntimeCoreOnce = true;
    const { result } = renderHook(() =>
      useEditorEngine({ containerRef, initialConfig: baseConfig }),
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.runtime).toBeNull();
    // 失败不残留半初始化 runtime；后续正常渲染可恢复装配。
    const { result: retry, unmount } = renderHook(() =>
      useEditorEngine({ containerRef, initialConfig: baseConfig }),
    );
    await waitFor(() => expect(retry.current.runtime).toBeTruthy());
    unmount();
  });

  it('auto-starts the preview mock on mount when initialMode=preview and previewMock is on', async () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() =>
        useEditorEngine({
          containerRef,
          initialConfig: boundConfig,
          initialMode: 'preview',
          previewMock: true,
        }),
      );
      await act(async () => {
        await Promise.resolve();
      });
      expect(result.current.runtime).toBeTruthy();
      const before = result.current.runtime!.engine.getSymbolProps('s1')?.opacity;
      act(() => {
        vi.advanceTimersByTime(1100);
      });
      const after = result.current.runtime!.engine.getSymbolProps('s1')?.opacity;
      // 模拟源 tick 已把绑定属性推进（确定性正弦随机游走，≠ init 值）。
      expect(after).not.toBe(before);
    } finally {
      vi.useRealTimers();
    }
  });

  it('honors previewMock.intervalMs for the mock tick period (invalid values fall back to 1000ms)', async () => {
    vi.useFakeTimers();
    try {
      // intervalMs: 500 → 600ms 内即有 tick。
      const fast = renderHook(() =>
        useEditorEngine({
          containerRef,
          initialConfig: boundConfig,
          initialMode: 'preview',
          previewMock: { intervalMs: 500 },
        }),
      );
      await act(async () => {
        await Promise.resolve();
      });
      expect(fast.result.current.runtime).toBeTruthy();
      const before = fast.result.current.runtime!.engine.getSymbolProps('s1')?.opacity;
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(fast.result.current.runtime!.engine.getSymbolProps('s1')?.opacity).not.toBe(before);
      fast.unmount();

      // intervalMs: 0（非法）→ 回落 1000ms → 600ms 内无 tick。
      resetLeaferMock();
      registerBuiltinScadaSymbols();
      const slow = renderHook(() =>
        useEditorEngine({
          containerRef,
          initialConfig: boundConfig,
          initialMode: 'preview',
          previewMock: { intervalMs: 0 },
        }),
      );
      await act(async () => {
        await Promise.resolve();
      });
      expect(slow.result.current.runtime).toBeTruthy();
      const slowBefore = slow.result.current.runtime!.engine.getSymbolProps('s1')?.opacity;
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(slow.result.current.runtime!.engine.getSymbolProps('s1')?.opacity).toBe(slowBefore);
      slow.unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not auto-start the mock in edit mode or when previewMock is explicitly false', async () => {
    vi.useFakeTimers();
    try {
      const edit = renderHook(() =>
        useEditorEngine({ containerRef, initialConfig: boundConfig, previewMock: true }),
      );
      await act(async () => {
        await Promise.resolve();
      });
      expect(edit.result.current.runtime).toBeTruthy();
      const editBefore = edit.result.current.runtime!.engine.getSymbolProps('s1')?.opacity;
      act(() => {
        vi.advanceTimersByTime(1100);
      });
      expect(edit.result.current.runtime!.engine.getSymbolProps('s1')?.opacity).toBe(editBefore);
      edit.unmount();

      resetLeaferMock();
      registerBuiltinScadaSymbols();
      const disabled = renderHook(() =>
        useEditorEngine({
          containerRef,
          initialConfig: boundConfig,
          initialMode: 'preview',
          previewMock: false,
        }),
      );
      await act(async () => {
        await Promise.resolve();
      });
      expect(disabled.result.current.runtime).toBeTruthy();
      const disabledBefore = disabled.result.current.runtime!.engine.getSymbolProps('s1')?.opacity;
      act(() => {
        vi.advanceTimersByTime(1100);
      });
      expect(disabled.result.current.runtime!.engine.getSymbolProps('s1')?.opacity).toBe(disabledBefore);
      disabled.unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it('syncs a later previewMock declaration change into the injector (edit mount → preview switch starts mock)', async () => {
    vi.useFakeTimers();
    try {
      const { result, rerender } = renderHook(
        (props: { previewMock: boolean | { intervalMs?: number } | undefined }) =>
          useEditorEngine({ containerRef, initialConfig: boundConfig, previewMock: props.previewMock }),
        { initialProps: { previewMock: undefined as boolean | { intervalMs?: number } | undefined } },
      );
      await act(async () => {
        await Promise.resolve();
      });
      expect(result.current.runtime).toBeTruthy();
      // host 翻转 previewMock 声明 → 注入通道自启开关同步。
      rerender({ previewMock: { intervalMs: 500 } });
      act(() => {
        result.current.runtime!.switchMode('preview');
      });
      const before = result.current.runtime!.engine.getSymbolProps('s1')?.opacity;
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(result.current.runtime!.engine.getSymbolProps('s1')?.opacity).not.toBe(before);
    } finally {
      vi.useRealTimers();
    }
  });

  it('injectPreviewValues applies through the injector and reads 0 after unmount', async () => {
    const { result, unmount } = renderHook(() =>
      useEditorEngine({ containerRef, initialConfig: boundConfig }),
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.runtime).toBeTruthy();
    act(() => {
      result.current.runtime!.switchMode('preview');
    });
    let applied = 0;
    act(() => {
      applied = result.current.runtime!.injectPreviewValues({ temp: 10 });
    });
    // opacity 绑定按 point 解析：10 ≠ 1 → 1 个属性被应用。
    expect(applied).toBe(1);
    expect(result.current.runtime!.engine.getSymbolProps('s1')?.opacity).toBe(10);
    act(() => {
      result.current.runtime!.clearPreviewValues();
    });
    expect(result.current.runtime!.engine.getSymbolProps('s1')?.opacity).toBe(1);

    unmount();
    // unmount 后注入通道已销毁 → 可选链兜底返回 0（不抛错）。
    expect(result.current.runtime!.injectPreviewValues({ temp: 20 })).toBe(0);
  });

  it('ResizeObserver handler skips empty batches, defers setSize to rAF, and cancels pending frames on unmount', async () => {
    const roCallbacks: Array<(entries: unknown[]) => void> = [];
    const originalRO = globalThis.ResizeObserver;
    // @ts-expect-error 测试专用桩：捕获观察回调。
    globalThis.ResizeObserver = class {
      constructor(cb: (entries: unknown[]) => void) {
        roCallbacks.push(cb);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    const originalRaf = globalThis.requestAnimationFrame;
    const originalCaf = globalThis.cancelAnimationFrame;
    let rafCallback: (() => void) | undefined;
    globalThis.requestAnimationFrame = (cb: (time: number) => void) => {
      rafCallback = () => cb(16);
      return 4321;
    };
    globalThis.cancelAnimationFrame = () => undefined;
    try {
      const { result, unmount } = renderHook(() =>
        useEditorEngine({ containerRef, initialConfig: baseConfig }),
      );
      await act(async () => {
        await Promise.resolve();
      });
      expect(result.current.runtime).toBeTruthy();
      const engine = result.current.runtime!.engine;
      const setSizeSpy = vi.spyOn(engine, 'setSize');

      // 空批次：无 entry → 直接返回（不调度 rAF、不 setSize）。
      expect(roCallbacks.length).toBeGreaterThan(0);
      act(() => {
        roCallbacks[roCallbacks.length - 1]([]);
      });
      expect(rafCallback).toBeUndefined();

      // 正常批次：setSize 防抖到 rAF。
      act(() => {
        roCallbacks[roCallbacks.length - 1]([{ contentRect: { width: 640, height: 480 } }]);
      });
      expect(rafCallback).toBeDefined();
      expect(setSizeSpy).not.toHaveBeenCalled();

      // rAF 待执行期间 unmount → 挂起的帧被取消；迟到帧不再驱动已销毁的 runtime。
      unmount();
      act(() => {
        rafCallback?.();
      });
      const calls = setSizeSpy.mock.calls;
      expect(calls.every(([w, h]) => !(w === 640 && h === 480))).toBe(true);
    } finally {
      globalThis.ResizeObserver = originalRO;
      globalThis.requestAnimationFrame = originalRaf;
      globalThis.cancelAnimationFrame = originalCaf;
    }
  });
});
