import { cleanup, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScadaCanvasEngine } from '../engine/scada-engine.js';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import {
  configProp,
  createScadaTestEnvironment,
  makeScadaCanvasProps,
  renderScadaCanvas,
  scadaTestHandle,
} from '../test-support/renderer-test-support.js';
import type { ScadaConfig } from '../serialization/config-types.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));

// plan 2026-08-08-1809-3 Phase 3 / P1-5：响应式容器下 viewport.fit 在 mount 与 resize 后都成立。
// schema width:960 + viewport:{fit:'contain'} 渲染进窄容器（~302px）→ ResizeObserver 把 DOM 缩到 302 后
// 必须重算 fit（旧实现 setSize 仅 resize 不 refit → scale 停在 mount 期值 → getViewportPoint 落画布外）。
function wideConfig(): ScadaConfig {
  return {
    version: 1,
    variables: [],
    symbols: [
      // 960×520 design-space content（对齐 scada-demo schema 尺寸）。
      { id: 'bg', type: 'scada-rect', x: 0, y: 0, width: 960, height: 520, fill: '#eef2f6' },
      { id: 'mid', type: 'scada-rect', x: 350, y: 200, width: 80, height: 80, fill: '#ff0000' },
    ],
  };
}

type ROEntry = { target: Element; contentRect: { width: number; height: number } };

beforeEach(() => {
  resetLeaferMock();
  registerBuiltinScadaSymbols();
});

afterEach(() => {
  cleanup();
});

describe('scada-canvas responsive viewport refit on resize (P1-5, CV-fit-resize)', () => {
  it('schema width:960 + fit:contain → resize to narrow container refits so world points land in canvas', async () => {
    const observers: Array<{ cb: (entries: ROEntry[]) => void; observe: (t: Element) => void }> = [];
    class MockResizeObserver {
      cb: (entries: ROEntry[]) => void;
      constructor(cb: (entries: ROEntry[]) => void) {
        this.cb = cb;
        observers.push(this);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    const NativeRO = globalThis.ResizeObserver;
    globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
    try {
      const environment = createScadaTestEnvironment([]);
      renderScadaCanvas(
        makeScadaCanvasProps({
          cid: 51,
          props: {
            config: configProp(wideConfig()),
            // schema width/height 表达 design space（author 用 960×520 坐标系布局）。
            width: 960,
            height: 520,
            viewport: { fit: 'contain' },
          },
        }),
        environment,
      );
      await waitFor(() => expect(scadaTestHandle(51)).toBeDefined());
      const engine = scadaTestHandle(51)?.engine as ScadaCanvasEngine;

      // mount 期：engine 用 schema 960 算 fit → scale≈1（容器窄于 960 时 world 坐标会落画布外）。
      // 触发 ResizeObserver 把 DOM 缩到 ~302×200（模拟窄响应式容器）。
      for (const observer of observers) {
        observer.cb([{ target: document.body, contentRect: { width: 302, height: 200 } }]);
      }
      // 等待 rAF 防抖的 setSize + refit 生效。
      await waitFor(() => expect(engine.getSize()).toEqual({ width: 302, height: 200 }));

      // resize 后 fit policy 重算 → 内容居中缩放到 302×200 内。
      const vp = engine.getViewport();
      expect(vp.scale).toBeLessThan(1);
      // CV-fit-resize 核心断言：world 坐标 (350, 278)（内容中部）映射后落在画布内（≤302×200）。
      const screen = engine.getViewportPoint({ x: 350, y: 278 });
      expect(screen.x).toBeGreaterThanOrEqual(0);
      expect(screen.x).toBeLessThanOrEqual(302);
      expect(screen.y).toBeGreaterThanOrEqual(0);
      expect(screen.y).toBeLessThanOrEqual(200);
    } finally {
      globalThis.ResizeObserver = NativeRO;
    }
  });

  it('scenes without a declared viewport policy preserve user viewport on resize (no spurious refit)', async () => {
    const observers: Array<{ cb: (entries: ROEntry[]) => void }> = [];
    class MockResizeObserver {
      cb: (entries: ROEntry[]) => void;
      constructor(cb: (entries: ROEntry[]) => void) {
        this.cb = cb;
        observers.push(this);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    const NativeRO = globalThis.ResizeObserver;
    globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
    try {
      const environment = createScadaTestEnvironment([]);
      renderScadaCanvas(
        makeScadaCanvasProps({
          cid: 52,
          props: {
            config: configProp(wideConfig()),
            width: 960,
            height: 520,
            // no viewport policy → resize should NOT refit (preserve current viewport).
          },
        }),
        environment,
      );
      await waitFor(() => expect(scadaTestHandle(52)).toBeDefined());
      const engine = scadaTestHandle(52)?.engine as ScadaCanvasEngine;
      // user manually sets a viewport (simulates pan/zoom).
      engine.setViewport({ x: 100, y: 50, scale: 2 });
      const userViewport = engine.getViewport();

      for (const observer of observers) {
        observer.cb([{ target: document.body, contentRect: { width: 400, height: 300 } }]);
      }
      await waitFor(() => expect(engine.getSize()).toEqual({ width: 400, height: 300 }));

      // no declared policy → resize does NOT override user viewport.
      const after = engine.getViewport();
      expect(after.scale).toBe(userViewport.scale);
      expect(after.x).toBe(userViewport.x);
      expect(after.y).toBe(userViewport.y);
    } finally {
      globalThis.ResizeObserver = NativeRO;
    }
  });
});
