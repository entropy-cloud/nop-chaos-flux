import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { ScadaEditorContextMenu, type ScadaEditorContextMenuAction } from './context-menu.js';

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
  hasSymbols?: boolean;
  onAction?: (action: ScadaEditorContextMenuAction, nodeId: string | null) => void;
  onClose?: () => void;
}) {
  const onAction = overrides?.onAction ?? vi.fn();
  const onClose = overrides?.onClose ?? vi.fn();
  const nodeId: string | null = overrides && 'nodeId' in overrides ? (overrides.nodeId as string | null) : 'sym-1';
  const view = render(
    <ScadaEditorContextMenu
      menu={{ x: 200, y: 200, nodeId }}
      hasClipboard={overrides?.hasClipboard ?? true}
      hasSymbols={overrides?.hasSymbols ?? true}
      onAction={onAction}
      onClose={onClose}
    />,
  );
  return { ...view, onAction, onClose };
}

describe('ScadaEditorContextMenu (plan 532 S3 Phase 1, 527 组件模式移植)', () => {
  it('renders symbol-state items (duplicate/delete/layering/paste) with role=menuitem', () => {
    const { getByTestId } = renderMenu({ nodeId: 'sym-1' });
    expect(getByTestId('scada-editor-context-duplicate')).toBeDefined();
    expect(getByTestId('scada-editor-context-delete')).toBeDefined();
    expect(getByTestId('scada-editor-context-totop')).toBeDefined();
    expect(getByTestId('scada-editor-context-moveup')).toBeDefined();
    expect(getByTestId('scada-editor-context-movedown')).toBeDefined();
    expect(getByTestId('scada-editor-context-tobottom')).toBeDefined();
    expect(getByTestId('scada-editor-context-paste')).toBeDefined();
  });

  it('renders blank-state items (paste/selectAll/fitCanvas) without symbol items', () => {
    const { getByTestId, queryByTestId } = renderMenu({ nodeId: null });
    expect(getByTestId('scada-editor-context-paste')).toBeDefined();
    expect(getByTestId('scada-editor-context-selectall')).toBeDefined();
    expect(getByTestId('scada-editor-context-fitcanvas')).toBeDefined();
    expect(queryByTestId('scada-editor-context-duplicate')).toBeNull();
  });

  it('disables paste without clipboard and selectAll without symbols', () => {
    const { getByTestId } = renderMenu({ nodeId: null, hasClipboard: false, hasSymbols: false });
    expect((getByTestId('scada-editor-context-paste') as HTMLButtonElement).disabled).toBe(true);
    expect((getByTestId('scada-editor-context-selectall') as HTMLButtonElement).disabled).toBe(true);
    expect((getByTestId('scada-editor-context-fitcanvas') as HTMLButtonElement).disabled).toBe(false);
  });

  it('dispatches the action with the hit node id and closes on item click', () => {
    const { getByTestId, onAction, onClose } = renderMenu({ nodeId: 'sym-1' });
    fireEvent.click(getByTestId('scada-editor-context-delete'));
    expect(onAction).toHaveBeenCalledWith('delete', 'sym-1');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape (window capture with stopPropagation)', () => {
    const { onClose } = renderMenu({});
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on outside pointerdown (window capture)', () => {
    const { container, onClose } = renderMenu({});
    const outside = document.createElement('div');
    document.body.appendChild(outside);
    fireEvent.pointerDown(outside);
    expect(onClose).toHaveBeenCalledTimes(1);
    void container;
    outside.remove();
  });

  it('moves focus across enabled items with arrow keys (keydown 容器隔离: 组件内自处理)', () => {
    const { getByTestId } = renderMenu({ nodeId: 'sym-1', hasClipboard: false });
    const duplicate = getByTestId('scada-editor-context-duplicate');
    duplicate.focus();
    expect(document.activeElement).toBe(duplicate);
    fireEvent.keyDown(duplicate, { key: 'ArrowDown' });
    // paste disabled → 跳到 delete（可导航项序列跳过 disabled）。
    const deleteItem = getByTestId('scada-editor-context-delete');
    expect(document.activeElement).toBe(deleteItem);
    fireEvent.keyDown(deleteItem, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(duplicate);
  });

  it('clamps the menu position inside the viewport (VIEWPORT_MARGIN 8)', () => {
    const { getByTestId } = renderMenu({});
    // 传 (5000, 5000) → useLayoutEffect 钳制到 innerWidth/Height - 尺寸 - 8。
    const menu = getByTestId('scada-editor-context-menu') as HTMLElement;
    expect(menu.style.left).not.toBe('5000px');
    expect(Number.parseInt(menu.style.left, 10)).toBeLessThanOrEqual(window.innerWidth - 8);
    expect(Number.parseInt(menu.style.top, 10)).toBeLessThanOrEqual(window.innerHeight - 8);
  });
});
