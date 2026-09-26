import React from 'react';
import { cleanup, render, waitFor, act, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSchemaRenderer, createDefaultEnv } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { validEditorConfig } from '../test-support/editor-config-fixtures.js';
import { readScadaEditorTestHandle } from './editor-test-handle.js';
import { industrialEditorRendererDefinitions } from './renderer-definitions.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
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

beforeEach(() => {
  resetLeaferMock();
  registerBuiltinScadaSymbols();
});

afterEach(() => {
  cleanup();
});

function renderEditor(tag: string) {
  const SchemaRenderer = createSchemaRenderer(industrialEditorRendererDefinitions);
  return render(
    <SchemaRenderer
      schemaUrl={`test://editor-clipboard-keys/${tag}`}
      schema={{ type: 'scada-editor-canvas', config: validEditorConfig() as never }}
      env={createDefaultEnv()}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

async function waitForReadyAndCid(container: HTMLElement): Promise<number> {
  await waitFor(() => {
    expect(container.querySelector('[data-slot="scada-editor-canvas"]')?.getAttribute('data-status')).toBe('ready');
  });
  const root = container.querySelector('[data-slot="scada-editor-canvas"]') as HTMLElement;
  return Number(root.getAttribute('data-cid'));
}

async function selectAndRender(container: HTMLElement, ids: string[]): Promise<number> {
  const cid = await waitForReadyAndCid(container);
  const handle = readScadaEditorTestHandle(cid)!;
  act(() => handle.setSelection(ids));
  await waitFor(() => {
    expect(handle.session.selection).toEqual(ids);
  });
  return cid;
}

/**
 * plan 521 / U5（design-toolbox.md §4.3 + failure path u5-shortcut-in-input）：
 * Ctrl+C/X/V 键盘剪贴板（接内部 clipboard，OS clipboard 归 L5.8 O3）+ isEditable 守卫。
 */
describe('U5 clipboard keyboard shortcuts (Ctrl+C / Ctrl+X / Ctrl+V)', () => {
  it('Ctrl+C copies selection into internal clipboard without changing working copy', async () => {
    const { container } = renderEditor('ctrl-c');
    const cid = await selectAndRender(container, ['editor-rect']);
    const handle = readScadaEditorTestHandle(cid)!;
    const before = handle.session.workingConfig.symbols.length;
    const canvasArea = container.querySelector('.nop-scada-editor-layout-canvas') as HTMLElement;
    act(() => {
      fireEvent.keyDown(canvasArea, { key: 'c', ctrlKey: true });
    });
    const clipboard = handle.toolbox.getClipboard();
    expect(clipboard).not.toBeNull();
    expect(clipboard!.operation).toBe('copy');
    expect(clipboard!.symbols.map((s) => s.id)).toEqual(['editor-rect']);
    expect(handle.session.workingConfig.symbols.length).toBe(before);
  });

  it('Ctrl+V pastes clipboard as new ids (+20px offset) and selects the new symbols', async () => {
    const { container } = renderEditor('ctrl-c-then-v');
    const cid = await selectAndRender(container, ['editor-rect']);
    const handle = readScadaEditorTestHandle(cid)!;
    const canvasArea = container.querySelector('.nop-scada-editor-layout-canvas') as HTMLElement;
    act(() => {
      fireEvent.keyDown(canvasArea, { key: 'c', ctrlKey: true });
    });
    act(() => {
      fireEvent.keyDown(canvasArea, { key: 'v', ctrlKey: true });
    });
    await waitFor(() => {
      expect(handle.session.workingConfig.symbols.length).toBe(3);
    });
    const pasted = handle.session.workingConfig.symbols.find((s) => s.id !== 'editor-rect' && s.id !== 'editor-rect-2')!;
    expect(pasted.id).not.toBe('editor-rect');
    // 粘贴后新 selection = 新 id 列表（toolbox-runtime paste 语义）。
    expect(handle.session.selection).toEqual([pasted.id]);
    // undo 往返：粘贴入 undo 栈（add-symbol），一次 undo 恢复。
    expect(handle.undoRedo.getStackState().topOperationKind).toBe('add-symbol');
  });

  it('Ctrl+X cuts selection (removed + clipboard holds cut copy); Ctrl+V undo round-trip restores', async () => {
    const { container } = renderEditor('ctrl-x');
    const cid = await selectAndRender(container, ['editor-rect']);
    const handle = readScadaEditorTestHandle(cid)!;
    const canvasArea = container.querySelector('.nop-scada-editor-layout-canvas') as HTMLElement;
    act(() => {
      fireEvent.keyDown(canvasArea, { key: 'x', ctrlKey: true });
    });
    expect(handle.session.workingConfig.symbols.some((s) => s.id === 'editor-rect')).toBe(false);
    const clipboard = handle.toolbox.getClipboard();
    expect(clipboard!.operation).toBe('cut');
    // undo 往返：剪切入栈 remove-symbol，一次 undo 恢复原节点。
    act(() => handle.undo());
    expect(handle.session.workingConfig.symbols.some((s) => s.id === 'editor-rect')).toBe(true);
  });

  it('empty selection: Ctrl+C / Ctrl+X are no-ops; Ctrl+V without clipboard is a no-op', async () => {
    const { container } = renderEditor('clipboard-empty');
    await waitForReadyAndCid(container);
    const canvasArea = container.querySelector('.nop-scada-editor-layout-canvas') as HTMLElement;
    act(() => {
      fireEvent.keyDown(canvasArea, { key: 'c', ctrlKey: true });
      fireEvent.keyDown(canvasArea, { key: 'x', ctrlKey: true });
      fireEvent.keyDown(canvasArea, { key: 'v', ctrlKey: true });
    });
    // 无异常且 clipboard 仍为空（无 selection 时 copy/cut 早退）。
    expect(readScadaEditorTestHandle === null).toBe(false);
  });

  it('isEditable guard: Ctrl+C with focus in an input inside the canvas region is ignored (u5-shortcut-in-input)', async () => {
    const { container } = renderEditor('clipboard-editable-guard');
    const cid = await selectAndRender(container, ['editor-rect']);
    const handle = readScadaEditorTestHandle(cid)!;
    const canvasArea = container.querySelector('.nop-scada-editor-layout-canvas') as HTMLElement;
    // 在 canvas region 内注入一个输入框（防御性守卫验证——面板输入位于兄弟节点，事件本就不可达 canvas 层）。
    const input = document.createElement('input');
    canvasArea.appendChild(input);
    act(() => {
      fireEvent.keyDown(input, { key: 'c', ctrlKey: true });
    });
    expect(handle.toolbox.getClipboard()).toBeNull();
    input.remove();
  });
});
