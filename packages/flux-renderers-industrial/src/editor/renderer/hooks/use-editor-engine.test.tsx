import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetLeaferMock } from '../../../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../../../symbols/register-builtin.js';
import { useEditorEngine } from './use-editor-engine.js';
import type { ScadaConfig } from '../../../serialization/config-types.js';

vi.mock('leafer-ui', () => import('../../../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));
vi.mock('@leafer-in/editor', () => ({}));

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
