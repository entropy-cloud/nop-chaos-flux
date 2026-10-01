/**
 * launcher 底部停靠测试（ux-r6 G-1）：
 * - 全新会话（无持久化位置）+ dock=bottom-left → launcher 停靠视口左下角（不压页面 header）；
 * - 显式 position 配置 / 拖拽持久化 → floating 绝对坐标渲染（既有行为回归钉）；
 * - store.setPosition（拖拽落点）将 dock 翻转为 floating。
 */

import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createNopDebugger } from './controller.js';
import { createDebuggerStore } from './store.js';
import { NopDebuggerPanel } from './panel.js';

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  delete window.__NOP_DEBUGGER__;
});

function launcherStyle(): CSSStyleDeclaration | null {
  const launcher = document.querySelector<HTMLElement>('.nop-debugger-launcher');
  return launcher?.style ?? null;
}

describe('launcher 底部停靠（ux-r6 G-1）', () => {
  it('dock=bottom-left 且无持久化位置时停靠左下角（不与 header 重叠）', () => {
    window.__NOP_DEBUGGER__ = { enabled: true, defaultOpen: false, dock: 'bottom-left' };
    const controller = createNopDebugger({ id: 'dock-default-test' });
    render(<NopDebuggerPanel controller={controller} />);

    const style = launcherStyle();
    expect(style).toBeTruthy();
    expect(style!.left).toBe('24px');
    expect(style!.bottom).toBe('24px');
    expect(style!.top).toBe('');
  });

  it('显式 position 配置保持 floating 绝对坐标渲染（回归钉）', () => {
    window.__NOP_DEBUGGER__ = { enabled: true, defaultOpen: false, position: { x: 24, y: 24 } };
    const controller = createNopDebugger({ id: 'dock-floating-test' });
    render(<NopDebuggerPanel controller={controller} />);

    const style = launcherStyle();
    expect(style).toBeTruthy();
    expect(style!.left).toBe('24px');
    expect(style!.top).toBe('24px');
    expect(style!.bottom).toBe('');
  });

  it('持久化位置存在时重载即 floating（g1-launcher-drag-persists 重载分支）', () => {
    window.localStorage.setItem('nop-debugger:dock-persisted-test:position', JSON.stringify({ x: 300, y: 260 }));
    window.__NOP_DEBUGGER__ = { enabled: true, defaultOpen: false, dock: 'bottom-left' };
    const controller = createNopDebugger({ id: 'dock-persisted-test' });
    expect(controller.getSnapshot().dock).toBe('floating');

    render(<NopDebuggerPanel controller={controller} />);
    const style = launcherStyle();
    expect(style!.left).toBe('300px');
    expect(style!.top).toBe('260px');
    expect(style!.bottom).toBe('');
  });

  it('docked 打开态面板首拖按当前盒换算基准（不瞬移回 {24,24} header 区）', async () => {
    window.__NOP_DEBUGGER__ = { enabled: true, defaultOpen: false, dock: 'bottom-left' };
    const controller = createNopDebugger({ id: 'dock-panel-drag-test' });
    const { container } = render(<NopDebuggerPanel controller={controller} />);

    // 点 launcher（无拖拽）打开面板
    const launcher = document.querySelector<HTMLElement>('.nop-debugger-launcher')!;
    fireEvent.pointerDown(launcher, { button: 0, pointerId: 1, clientX: 40, clientY: 860 });
    fireEvent.click(launcher);
    await waitFor(() => expect(container.querySelector('.ndbg-drag-handle')).toBeTruthy());

    const dragHandle = container.querySelector<HTMLElement>('.ndbg-drag-handle')!;

    // stub 面板当前盒（docked 渲染在左下角）
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({
        left: 100, top: 500, right: 520, bottom: 860, width: 420, height: 360,
        x: 100, y: 500, toJSON: () => ({}),
      } as DOMRect);
    try {
      fireEvent.pointerDown(dragHandle!, { button: 0, pointerId: 2, clientX: 120, clientY: 520 });
      fireEvent.pointerMove(window, { pointerId: 2, buttons: 1, clientX: 160, clientY: 540 });
      fireEvent.pointerUp(window, { pointerId: 2, clientX: 160, clientY: 540 });
    } finally {
      rectSpy.mockRestore();
    }

    const snap = controller.getSnapshot();
    // 基准 {100,500} + delta(40,20) → {140,520}；缺陷基准 {24,24} 会得到 {64,44}
    expect(snap.dock).toBe('floating');
    expect(snap.position).toEqual({ x: 140, y: 520 });
  });

  it('store.setPosition（拖拽落点）把 dock 翻转为 floating', () => {
    const store = createDebuggerStore({
      enabled: true,
      sessionId: 's1',
      maxEvents: 50,
      defaultOpen: false,
      defaultTab: 'timeline',
      position: { x: 24, y: 24 },
      dock: 'bottom-left',
      errorBufferKeepEarliest: 3,
      errorBufferKeepLatest: 5,
    });

    expect(store.getSnapshot().dock).toBe('bottom-left');
    store.setPosition({ x: 120, y: 200 });
    expect(store.getSnapshot().dock).toBe('floating');
    expect(store.getSnapshot().position).toEqual({ x: 120, y: 200 });
  });
});
