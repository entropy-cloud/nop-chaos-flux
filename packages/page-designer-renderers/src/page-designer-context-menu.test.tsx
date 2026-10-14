import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import {
  PageDesignerContextMenu,
  type PageDesignerContextMenuAction,
} from './page-designer-context-menu.js';

// CX-16 plan 596 Phase 1 特征化钉：A（page-designer-context-menu）此前零单测覆盖。
// 模式迁移自 C 套件（flux-renderers-industrial/src/editor/context-menu.test.tsx 8 测试），
// 补强两处判别面：Escape stopPropagation 逐字断言（画布屏蔽不变式）+ roving 尾项
// 环回跳过 disabled 钉（选择器统一恒等的判别承载，C 既有 traverse 不覆盖该向）。

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n();
});

afterEach(() => {
  resetFluxI18n();
  cleanup();
});

function renderMenu(overrides?: {
  nodeId?: string | null;
  hasClipboard?: boolean;
  x?: number;
  y?: number;
  onAction?: (action: PageDesignerContextMenuAction, nodeId: string | null) => void;
  onClose?: () => void;
}) {
  const onAction = overrides?.onAction ?? vi.fn();
  const onClose = overrides?.onClose ?? vi.fn();
  const nodeId: string | null =
    overrides && 'nodeId' in overrides ? (overrides.nodeId as string | null) : 'node-1';
  const view = render(
    <PageDesignerContextMenu
      menu={{ x: overrides?.x ?? 200, y: overrides?.y ?? 200, nodeId }}
      hasClipboard={overrides?.hasClipboard ?? true}
      onAction={onAction}
      onClose={onClose}
    />,
  );
  return { ...view, onAction, onClose };
}

describe('PageDesignerContextMenu (CX-16 plan 596 Phase 1 特征化钉)', () => {
  it('renders node-state items (paste/duplicate/delete) with role=menuitem', () => {
    const { getByTestId } = renderMenu({ nodeId: 'node-1' });
    expect(getByTestId('page-designer-context-paste')).toBeDefined();
    expect(getByTestId('page-designer-context-duplicate')).toBeDefined();
    expect(getByTestId('page-designer-context-delete')).toBeDefined();
  });

  it('renders blank-state item (paste only) without node items', () => {
    const { getByTestId, queryByTestId } = renderMenu({ nodeId: null });
    expect(getByTestId('page-designer-context-paste')).toBeDefined();
    expect(queryByTestId('page-designer-context-duplicate')).toBeNull();
    expect(queryByTestId('page-designer-context-delete')).toBeNull();
  });

  it('disables paste without clipboard and keeps it enabled with clipboard', () => {
    const withoutClipboard = renderMenu({ nodeId: null, hasClipboard: false });
    expect(
      (withoutClipboard.getByTestId('page-designer-context-paste') as HTMLButtonElement).disabled,
    ).toBe(true);
    withoutClipboard.unmount();

    const withClipboard = renderMenu({ nodeId: null, hasClipboard: true });
    expect(
      (withClipboard.getByTestId('page-designer-context-paste') as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it('dispatches the action with the hit node id and closes on item click', () => {
    const { getByTestId, onAction, onClose } = renderMenu({ nodeId: 'node-1' });
    fireEvent.click(getByTestId('page-designer-context-delete'));
    expect(onAction).toHaveBeenCalledWith('delete', 'node-1');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape (window capture) and calls stopPropagation before close', () => {
    const stopPropagationSpy = vi.spyOn(Event.prototype, 'stopPropagation');
    const { onClose } = renderMenu({});
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(stopPropagationSpy).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
    stopPropagationSpy.mockRestore();
  });

  it('closes on outside pointerdown (window capture)', () => {
    const { onClose } = renderMenu({});
    const outside = document.createElement('div');
    document.body.appendChild(outside);
    fireEvent.pointerDown(outside);
    expect(onClose).toHaveBeenCalledTimes(1);
    outside.remove();
  });

  it('moves focus across enabled items with arrow keys, skipping disabled paste', () => {
    const { getByTestId } = renderMenu({ nodeId: 'node-1', hasClipboard: false });
    const duplicate = getByTestId('page-designer-context-duplicate');
    duplicate.focus();
    expect(document.activeElement).toBe(duplicate);
    fireEvent.keyDown(duplicate, { key: 'ArrowDown' });
    // paste disabled → 跳到 delete（可导航项序列跳过 disabled）。
    const deleteItem = getByTestId('page-designer-context-delete');
    expect(document.activeElement).toBe(deleteItem);
    fireEvent.keyDown(deleteItem, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(duplicate);
  });

  it('wraps ArrowDown from the last enabled item onto the first enabled item (skips trailing disabled)', () => {
    // 判别承载：delete（尾项）ArrowDown 环回必须落在 duplicate（首个 enabled），
    // 而非 disabled 的 paste。素选择器变体在尾部 disabled 项场景下即红。
    const { getByTestId } = renderMenu({ nodeId: 'node-1', hasClipboard: false });
    const duplicate = getByTestId('page-designer-context-duplicate');
    const deleteItem = getByTestId('page-designer-context-delete');
    deleteItem.focus();
    expect(document.activeElement).toBe(deleteItem);
    fireEvent.keyDown(deleteItem, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(duplicate);
  });

  it('focuses the first enabled item on mount (disabled paste is skipped)', () => {
    const { getByTestId } = renderMenu({ nodeId: 'node-1', hasClipboard: false });
    expect(document.activeElement).toBe(getByTestId('page-designer-context-duplicate'));
  });

  it('clamps the menu position inside the viewport at the far edge (VIEWPORT_MARGIN 8)', () => {
    const { getByTestId } = renderMenu({});
    // 传 (5000, 5000) → useLayoutEffect 钳制到 innerWidth/Height - 尺寸 - 8。
    const menu = getByTestId('page-designer-context-menu') as HTMLElement;
    expect(menu.style.left).not.toBe('5000px');
    expect(Number.parseInt(menu.style.left, 10)).toBeLessThanOrEqual(window.innerWidth - 8);
    expect(Number.parseInt(menu.style.top, 10)).toBeLessThanOrEqual(window.innerHeight - 8);
  });

  it('clamps the menu position inside the viewport at the near edge (negative coordinates)', () => {
    const { getByTestId } = renderMenu({ x: -5000, y: -5000 });
    const menu = getByTestId('page-designer-context-menu') as HTMLElement;
    expect(Number.parseInt(menu.style.left, 10)).toBeGreaterThanOrEqual(8);
    expect(Number.parseInt(menu.style.top, 10)).toBeGreaterThanOrEqual(8);
  });
});
