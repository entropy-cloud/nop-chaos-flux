import * as React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useContextMenuShell } from './use-context-menu-shell.js';

// CX-16 plan 596 Phase 2：壳单测落 ui，覆盖基线=C 的 8 测试（industrial editor
// context-menu.test.tsx）在 hook 层的迁移吸收。探针组件参数化菜单面（全启用/
// 含 disabled/全 disabled 三形），选择器 `[role="menuitem"]:not([disabled])`
// 硬编码于 hook 内的判别承载=尾项环回跳 disabled 钉 + stopPropagation 逐字钉。

interface ShellCapture {
  menuRef: React.RefObject<HTMLDivElement | null>;
  handleMenuKeyDown(event: React.KeyboardEvent): void;
}

const shells: ShellCapture[] = [];

function Probe(props: {
  position: { x: number; y: number };
  onClose: () => void;
  itemKeys: string[];
  disabledKeys?: string[];
}) {
  const shell = useContextMenuShell({ position: props.position, onClose: props.onClose });
  shells.push(shell);
  return React.createElement(
    'div',
    {
      ref: shell.menuRef,
      role: 'menu',
      'data-testid': 'shell-menu',
      onKeyDown: shell.handleMenuKeyDown,
    },
    props.itemKeys.map((key) =>
      React.createElement(
        'button',
        {
          key,
          type: 'button',
          role: 'menuitem',
          'data-testid': `shell-item-${key}`,
          disabled: props.disabledKeys?.includes(key) ?? false,
        },
        key,
      ),
    ),
  );
}

function renderShell(overrides?: {
  position?: { x: number; y: number };
  itemKeys?: string[];
  disabledKeys?: string[];
  onClose?: () => void;
}) {
  const onClose = overrides?.onClose ?? vi.fn();
  const view = render(
    React.createElement(Probe, {
      position: overrides?.position ?? { x: 200, y: 200 },
      onClose,
      itemKeys: overrides?.itemKeys ?? ['alpha', 'beta', 'gamma'],
      disabledKeys: overrides?.disabledKeys,
    }),
  );
  return { ...view, onClose };
}

function item(view: { getByTestId: (id: string) => HTMLElement }, key: string): HTMLButtonElement {
  return view.getByTestId(`shell-item-${key}`) as HTMLButtonElement;
}

afterEach(() => {
  cleanup();
  shells.length = 0;
});

describe('useContextMenuShell (CX-16 plan 596, C 8-test coverage absorbed at hook level)', () => {
  it('clamps the menu position inside the viewport at the far edge (VIEWPORT_MARGIN 8)', () => {
    const { getByTestId } = renderShell({ position: { x: 5000, y: 5000 } });
    const menu = getByTestId('shell-menu') as HTMLElement;
    expect(menu.style.left).not.toBe('5000px');
    expect(Number.parseInt(menu.style.left, 10)).toBeLessThanOrEqual(window.innerWidth - 8);
    expect(Number.parseInt(menu.style.top, 10)).toBeLessThanOrEqual(window.innerHeight - 8);
  });

  it('clamps the menu position inside the viewport at the near edge (negative coordinates)', () => {
    const { getByTestId } = renderShell({ position: { x: -5000, y: -5000 } });
    const menu = getByTestId('shell-menu') as HTMLElement;
    expect(Number.parseInt(menu.style.left, 10)).toBeGreaterThanOrEqual(8);
    expect(Number.parseInt(menu.style.top, 10)).toBeGreaterThanOrEqual(8);
  });

  it('re-clamps when the position changes (deps [position.x, position.y])', () => {
    const view = renderShell({ position: { x: 200, y: 200 } });
    view.rerender(
      React.createElement(Probe, {
        position: { x: 300, y: 400 },
        onClose: view.onClose,
        itemKeys: ['alpha', 'beta', 'gamma'],
      }),
    );
    const menu = view.getByTestId('shell-menu') as HTMLElement;
    expect(Number.parseInt(menu.style.left, 10)).toBeGreaterThanOrEqual(300);
    expect(Number.parseInt(menu.style.top, 10)).toBeGreaterThanOrEqual(400);
  });

  it('focuses the first enabled menuitem on mount (disabled items skipped)', () => {
    const view = renderShell({ disabledKeys: ['alpha'] });
    expect(document.activeElement).toBe(item(view, 'beta'));
  });

  it('closes on Escape (window capture) and calls stopPropagation before close', () => {
    const stopPropagationSpy = vi.spyOn(Event.prototype, 'stopPropagation');
    const { onClose } = renderShell({});
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(stopPropagationSpy).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
    stopPropagationSpy.mockRestore();
  });

  it('closes on outside pointerdown but not on inside pointerdown (window capture)', () => {
    const view = renderShell({});
    const inside = item(view, 'alpha');
    fireEvent.pointerDown(inside);
    expect(view.onClose).not.toHaveBeenCalled();
    const outside = document.createElement('div');
    document.body.appendChild(outside);
    fireEvent.pointerDown(outside);
    expect(view.onClose).toHaveBeenCalledTimes(1);
    outside.remove();
  });

  it('roves ArrowDown/ArrowUp across enabled items, skipping disabled and wrapping from the last enabled onto the first', () => {
    const view = renderShell({ disabledKeys: ['gamma'] });
    const alpha = item(view, 'alpha');
    const beta = item(view, 'beta');
    alpha.focus();
    fireEvent.keyDown(alpha, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(beta);
    fireEvent.keyDown(beta, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(alpha);
    // 判别承载：gamma disabled → beta（尾 enabled 项）ArrowDown 环回必须落在
    // alpha（首个 enabled）；素选择器变体在此场景即红（落回 disabled 的
    // gamma，focus() 无效）。
    beta.focus();
    fireEvent.keyDown(beta, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(alpha);
  });

  it('early-returns roving on a menu with zero enabled items (all disabled)', () => {
    const view = renderShell({ disabledKeys: ['alpha', 'beta', 'gamma'] });
    const menu = view.getByTestId('shell-menu') as HTMLElement;
    expect(() => fireEvent.keyDown(menu, { key: 'ArrowDown' })).not.toThrow();
    expect(document.activeElement).toBe(menu.ownerDocument.body);
  });

  it('ignores non-arrow keys on the menu (no preventDefault, no focus move)', () => {
    const view = renderShell({});
    const alpha = item(view, 'alpha');
    alpha.focus();
    const event = fireEvent.keyDown(alpha, { key: 'Enter' });
    expect(event).toBe(true);
    expect(document.activeElement).toBe(alpha);
  });

  it('keeps the latest onClose in sync (re-render replaces the close callback)', () => {
    const firstOnClose = vi.fn();
    const latestOnClose = vi.fn();
    const view = renderShell({ onClose: firstOnClose });
    view.rerender(
      React.createElement(Probe, {
        position: { x: 200, y: 200 },
        onClose: latestOnClose,
        itemKeys: ['alpha', 'beta', 'gamma'],
      }),
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(firstOnClose).not.toHaveBeenCalled();
    expect(latestOnClose).toHaveBeenCalledTimes(1);
  });
});
