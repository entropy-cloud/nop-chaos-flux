import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { DesignerContextMenu, type DesignerContextMenuItem } from './designer-context-menu.js';

// CX-16 plan 596 Phase 1 特征化钉：B（designer-context-menu）此前零单测覆盖。
// 模式迁移自 C 套件（flux-renderers-industrial/src/editor/context-menu.test.tsx 8 测试），
// 另承载选择器统一恒等钉（G3）：B 的构造面（designer-canvas contextMenuItems）与
// DOM 面均无 disabled menuitem → `[role="menuitem"]:not([disabled])` 对 B 恒等于
// 素 `[role="menuitem"]` → 统一选择器零行为变更。

const dir = path.dirname(fileURLToPath(import.meta.url));

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n();
});

afterEach(() => {
  resetFluxI18n();
  cleanup();
});

function buildNodeItems(): DesignerContextMenuItem[] {
  return [
    {
      key: 'select',
      label: 'Select node',
      icon: 'mouse-pointer-2',
      testid: 'designer-context-select-node',
      onSelect: vi.fn(),
    },
    {
      key: 'duplicate',
      label: 'Duplicate node',
      icon: 'copy',
      testid: 'designer-context-duplicate-node',
      onSelect: vi.fn(),
    },
    {
      key: 'delete',
      label: 'Delete node',
      icon: 'trash-2',
      destructive: true,
      testid: 'designer-context-delete-node',
      onSelect: vi.fn(),
    },
  ];
}

function buildBlankItems(): DesignerContextMenuItem[] {
  return [
    {
      key: 'select-all',
      label: 'Select all',
      icon: 'box-select',
      testid: 'designer-context-select-all',
      onSelect: vi.fn(),
    },
    {
      key: 'paste',
      label: 'Paste',
      icon: 'clipboard-paste',
      testid: 'designer-context-paste',
      onSelect: vi.fn(),
    },
    {
      key: 'fit-view',
      label: 'Fit view',
      icon: 'maximize',
      testid: 'designer-context-fit-view',
      onSelect: vi.fn(),
    },
  ];
}

function renderMenu(items: DesignerContextMenuItem[], position?: { x: number; y: number }) {
  const onClose = vi.fn();
  const view = render(
    <DesignerContextMenu
      menu={{ x: position?.x ?? 200, y: position?.y ?? 200, nodeId: 'node-1' }}
      items={items}
      onClose={onClose}
    />,
  );
  return { ...view, onClose };
}

describe('DesignerContextMenu (CX-16 plan 596 Phase 1 特征化钉)', () => {
  it('renders node-state items with role=menuitem, icon glyph, and label', () => {
    const items = buildNodeItems();
    const { getByTestId } = renderMenu(items);
    const duplicate = getByTestId('designer-context-duplicate-node');
    expect(duplicate.getAttribute('role')).toBe('menuitem');
    expect(duplicate.querySelector('[data-icon="copy"]')).not.toBeNull();
    expect(duplicate.textContent).toContain('Duplicate node');
  });

  it('renders blank-state items without node items', () => {
    const { getByTestId, queryByTestId } = renderMenu(buildBlankItems());
    expect(getByTestId('designer-context-select-all')).toBeDefined();
    expect(getByTestId('designer-context-paste')).toBeDefined();
    expect(getByTestId('designer-context-fit-view')).toBeDefined();
    expect(queryByTestId('designer-context-duplicate-node')).toBeNull();
  });

  it('dispatches onSelect then closes on item click', () => {
    const items = buildNodeItems();
    const { getByTestId, onClose } = renderMenu(items);
    fireEvent.click(getByTestId('designer-context-delete-node'));
    expect(items[2].onSelect).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape (window capture) and calls stopPropagation before close', () => {
    const stopPropagationSpy = vi.spyOn(Event.prototype, 'stopPropagation');
    const { onClose } = renderMenu(buildNodeItems());
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(stopPropagationSpy).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
    stopPropagationSpy.mockRestore();
  });

  it('closes on outside pointerdown (window capture)', () => {
    const { onClose } = renderMenu(buildNodeItems());
    const outside = document.createElement('div');
    document.body.appendChild(outside);
    fireEvent.pointerDown(outside);
    expect(onClose).toHaveBeenCalledTimes(1);
    outside.remove();
  });

  it('moves focus across items with arrow keys and wraps from the last item onto the first', () => {
    const { getByTestId } = renderMenu(buildNodeItems());
    const select = getByTestId('designer-context-select-node');
    const duplicate = getByTestId('designer-context-duplicate-node');
    const deleteItem = getByTestId('designer-context-delete-node');
    duplicate.focus();
    fireEvent.keyDown(duplicate, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(deleteItem);
    fireEvent.keyDown(deleteItem, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(duplicate);
    deleteItem.focus();
    fireEvent.keyDown(deleteItem, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(select);
  });

  it('clamps the menu position inside the viewport at the far edge (VIEWPORT_MARGIN 8)', () => {
    const { getByTestId } = renderMenu(buildNodeItems(), { x: 5000, y: 5000 });
    const menu = getByTestId('designer-context-menu') as HTMLElement;
    expect(menu.style.left).not.toBe('5000px');
    expect(Number.parseInt(menu.style.left, 10)).toBeLessThanOrEqual(window.innerWidth - 8);
    expect(Number.parseInt(menu.style.top, 10)).toBeLessThanOrEqual(window.innerHeight - 8);
  });

  it('clamps the menu position inside the viewport at the near edge (negative coordinates)', () => {
    const { getByTestId } = renderMenu(buildNodeItems(), { x: -5000, y: -5000 });
    const menu = getByTestId('designer-context-menu') as HTMLElement;
    expect(Number.parseInt(menu.style.left, 10)).toBeGreaterThanOrEqual(8);
    expect(Number.parseInt(menu.style.top, 10)).toBeGreaterThanOrEqual(8);
  });

  it('selector identity (DOM face): every rendered menuitem is enabled, so :not([disabled]) selects the identical set', () => {
    for (const items of [buildNodeItems(), buildBlankItems()]) {
      const view = render(
        <DesignerContextMenu
          menu={{ x: 200, y: 200, nodeId: 'node-1' }}
          items={items}
          onClose={vi.fn()}
        />,
      );
      const menu = view.getByTestId('designer-context-menu');
      const all = Array.from(menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
      const enabled = Array.from(
        menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])'),
      );
      expect(all.length).toBeGreaterThan(0);
      expect(all.every((el) => !el.disabled)).toBe(true);
      expect(enabled.length).toBe(all.length);
      expect(enabled).toEqual(all);
      view.unmount();
    }
  });

  it('selector identity (construction face): designer-canvas contextMenuItems never produces a disabled item', async () => {
    const source = await readFile(path.join(dir, '../designer-canvas.tsx'), 'utf8');
    const start = source.indexOf('const contextMenuItems');
    const end = source.indexOf('const handleDeleteEdge');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const constructionBlock = source.slice(start, end);
    expect(constructionBlock).not.toMatch(/\bdisabled\b/);
  });
});
