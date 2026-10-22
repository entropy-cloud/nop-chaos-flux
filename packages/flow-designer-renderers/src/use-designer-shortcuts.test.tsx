import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { createDesignerCore } from '@nop-chaos/flow-designer-core';
import type { DesignerCommand } from './designer-command-types.js';
import { registerDesignerCanvasFocusHandler } from './designer-canvas-focus.js';
import { useDesignerShortcuts } from './use-designer-shortcuts.js';

type DesignerCoreLike = ReturnType<typeof createDesignerCore>;

function createMockCore(config: {
  shortcuts?: Record<string, string[]>;
  features?: Record<string, boolean>;
  documentMode?: 'graph' | 'tree';
  activeNodeId?: string;
}): DesignerCoreLike {
  return {
    getConfig: () => config,
    getSnapshot: () => ({
      activeNode: config.activeNodeId ? { id: config.activeNodeId } : null,
      selection: { selectedNodeIds: config.activeNodeId ? [config.activeNodeId] : [] },
    }),
  } as unknown as DesignerCoreLike;
}

function ShortcutHarness(props: {
  core: DesignerCoreLike;
  dispatch: (command: DesignerCommand) => unknown;
  readOnly?: boolean;
}) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  useDesignerShortcuts({
    core: props.core,
    rootRef,
    dispatch: props.dispatch,
    readOnly: props.readOnly,
  });
  return (
    <div ref={rootRef} data-testid="designer-root">
      <input data-testid="editable-input" />
    </div>
  );
}

function renderHarness(
  config: {
    shortcuts?: Record<string, string[]>;
    features?: Record<string, boolean>;
    readOnly?: boolean;
    documentMode?: 'graph' | 'tree';
    activeNodeId?: string;
  } = {},
) {
  const dispatch = vi.fn();
  const core = createMockCore(config);
  const view = render(
    <ShortcutHarness core={core} dispatch={dispatch} readOnly={config.readOnly} />,
  );
  const root = view.getByTestId('designer-root');
  return { core, dispatch, root, view };
}

afterEach(() => {
  cleanup();
});

describe('useDesignerShortcuts', () => {
  const baseConfig = {
    features: { shortcuts: true, clipboard: true, undo: true, redo: true },
    shortcuts: {
      undo: ['Ctrl+Z'],
      redo: ['Ctrl+Shift+Z'],
      copy: ['Ctrl+C'],
      paste: ['Ctrl+V'],
      delete: ['Delete'],
      save: ['Ctrl+S'],
    },
  };

  it('dispatches undo/redo/copy/paste/delete/save for matching shortcuts', () => {
    const { dispatch, root } = renderHarness(baseConfig);

    fireEvent.keyDown(root, { key: 'z', ctrlKey: true });
    fireEvent.keyDown(root, { key: 'z', ctrlKey: true, shiftKey: true });
    fireEvent.keyDown(root, { key: 'c', ctrlKey: true });
    fireEvent.keyDown(root, { key: 'v', ctrlKey: true });
    fireEvent.keyDown(root, { key: 'Delete' });
    fireEvent.keyDown(root, { key: 's', ctrlKey: true });

    expect(dispatch.mock.calls.map((call) => call[0])).toEqual([
      { type: 'undo' },
      { type: 'redo' },
      { type: 'copySelection' },
      { type: 'pasteClipboard' },
      { type: 'deleteSelection' },
      { type: 'save' },
    ]);
  });

  it('does not dispatch for Escape (no escape branch in the hook)', () => {
    const { dispatch, root } = renderHarness(baseConfig);

    fireEvent.keyDown(root, { key: 'Escape' });

    expect(dispatch).not.toHaveBeenCalled();
  });

  it('does not dispatch when the event target is an editable element', () => {
    const { dispatch, view } = renderHarness(baseConfig);
    const input = view.getByTestId('editable-input');

    fireEvent.keyDown(input, { key: 'z', ctrlKey: true });

    expect(dispatch).not.toHaveBeenCalled();
  });

  it('does not dispatch when the event target is inside a contentEditable element', () => {
    const { dispatch, view } = renderHarness(baseConfig);
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    view.container.appendChild(editable);
    const text = document.createElement('span');
    editable.appendChild(text);

    fireEvent.keyDown(text, { key: 'z', ctrlKey: true });

    expect(dispatch).not.toHaveBeenCalled();
  });

  it('does not dispatch when the event target is outside the designer root', () => {
    const { dispatch } = renderHarness(baseConfig);

    fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true });

    expect(dispatch).not.toHaveBeenCalled();
  });

  // P0-MA5.1-002：Delete 会卸载持有焦点的节点卡片，浏览器把焦点回落到 <body>，
  // 紧随的 undo 键会被 isInsideDesigner 拦掉。hook 必须在 deleteSelection 后把
  // 焦点交还画布表面（与 x-button 删除路径同一机制）。
  it('restores canvas surface focus after deleteSelection', () => {
    const { core, dispatch, root } = renderHarness(baseConfig);
    const focusSurface = vi.fn();
    registerDesignerCanvasFocusHandler(core, focusSurface);

    fireEvent.keyDown(root, { key: 'Delete' });

    expect(dispatch).toHaveBeenCalledWith({ type: 'deleteSelection' });
    expect(focusSurface).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(root, { key: 'z', ctrlKey: true });
    expect(dispatch).toHaveBeenCalledWith({ type: 'undo' });
    expect(focusSurface).toHaveBeenCalledTimes(1);
  });

  it('does not dispatch when readOnly is set', () => {
    const { dispatch, root } = renderHarness({ ...baseConfig, readOnly: true });

    fireEvent.keyDown(root, { key: 'z', ctrlKey: true });
    fireEvent.keyDown(root, { key: 'Delete' });

    expect(dispatch).not.toHaveBeenCalled();
  });

  it('does not dispatch when the shortcuts feature is disabled', () => {
    const { dispatch, root } = renderHarness({
      ...baseConfig,
      features: { ...baseConfig.features, shortcuts: false },
    });

    fireEvent.keyDown(root, { key: 'z', ctrlKey: true });
    fireEvent.keyDown(root, { key: 'Delete' });

    expect(dispatch).not.toHaveBeenCalled();
  });

  it('skips clipboard commands when the clipboard feature is disabled', () => {
    const { dispatch, root } = renderHarness({
      ...baseConfig,
      features: { ...baseConfig.features, clipboard: false },
    });

    fireEvent.keyDown(root, { key: 'c', ctrlKey: true });
    fireEvent.keyDown(root, { key: 'v', ctrlKey: true });

    expect(dispatch).not.toHaveBeenCalled();
  });

  it('removes the keydown listener on unmount', () => {
    const { dispatch, root, view } = renderHarness(baseConfig);

    view.unmount();
    fireEvent.keyDown(root, { key: 'z', ctrlKey: true });

    expect(dispatch).not.toHaveBeenCalled();
  });

  it('dispatches selectAll for Ctrl+A and duplicateNode for Ctrl+D', () => {
    const { dispatch, root } = renderHarness({
      ...baseConfig,
      documentMode: 'graph',
      activeNodeId: 'task-1',
      shortcuts: { ...baseConfig.shortcuts, selectAll: ['Ctrl+A'], duplicate: ['Ctrl+D'] },
    });

    fireEvent.keyDown(root, { key: 'a', ctrlKey: true });
    fireEvent.keyDown(root, { key: 'd', ctrlKey: true });

    expect(dispatch.mock.calls.map((call) => call[0])).toEqual([
      { type: 'selectAll' },
      { type: 'duplicateNode', nodeId: 'task-1' },
    ]);
  });

  it('guards selectAll/duplicate behind the editable-target check and skips duplicate in tree mode', () => {
    const { dispatch, root, view } = renderHarness({
      ...baseConfig,
      documentMode: 'tree',
      activeNodeId: 'task-1',
      shortcuts: { ...baseConfig.shortcuts, selectAll: ['Ctrl+A'], duplicate: ['Ctrl+D'] },
    });

    fireEvent.keyDown(view.getByTestId('editable-input'), { key: 'a', ctrlKey: true });
    expect(dispatch).not.toHaveBeenCalled();

    fireEvent.keyDown(root, { key: 'a', ctrlKey: true });
    expect(dispatch).toHaveBeenCalledWith({ type: 'selectAll' });
    fireEvent.keyDown(root, { key: 'd', ctrlKey: true });
    expect(dispatch.mock.calls.map((call) => call[0].type)).toEqual(['selectAll']);
  });
});
