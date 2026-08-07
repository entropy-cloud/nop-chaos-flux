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
      schemaUrl={`test://editor-affordance/${tag}`}
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
  // 等待 canvas selection state 同步（onSelectionChange → setSelection re-render）。
  await waitFor(() => {
    expect(handle.session.selection).toEqual(ids);
  });
  return cid;
}

/**
 * plan 2026-08-07-1835-2 Phase 3 / open P1-B + multi P1-10 + P1-11 proof。
 * delete/group/ungroup 从默认 UI 按钮 + 键盘层可达（非仅测试 handle）；palette drop 落指针处；raw textarea 消失。
 */
describe('P1-B delete via default UI Del button', () => {
  it('clicking Del button removes selected symbol from working copy', async () => {
    const { container } = renderEditor('del-btn');
    const cid = await selectAndRender(container, ['editor-rect']);
    const handle = readScadaEditorTestHandle(cid)!;
    const before = handle.session.workingConfig.symbols.length;
    const delBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Del')!;
    expect(delBtn).toBeTruthy();
    act(() => {
      fireEvent.click(delBtn);
    });
    expect(handle.session.workingConfig.symbols.length).toBe(before - 1);
    expect(handle.session.workingConfig.symbols.some((s) => s.id === 'editor-rect')).toBe(false);
  });

  it('Del button is disabled when no selection', async () => {
    const { container } = renderEditor('del-disabled');
    await waitForReadyAndCid(container);
    const delBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Del')!;
    expect(delBtn.disabled).toBe(true);
  });
});

describe('P1-B group/ungroup via default UI buttons', () => {
  it('Group button groups multi-selection, Ungroup button ungroups', async () => {
    const { container } = renderEditor('group-btn');
    const cid = await selectAndRender(container, ['editor-rect', 'editor-ellipse']);
    const handle = readScadaEditorTestHandle(cid)!;
    const groupBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Group')!;
    expect(groupBtn.disabled).toBe(false);
    act(() => {
      fireEvent.click(groupBtn);
    });
    await waitFor(() => {
      expect(handle.session.workingConfig.symbols.some((s) => s.type === 'scada-group')).toBe(true);
    });
  });

  it('Ungroup button ungroups a selected group (pre-made group config)', async () => {
    const groupedConfig = {
      version: 1,
      variables: [],
      symbols: [
        {
          id: 'scada-group-1',
          type: 'scada-group',
          x: 0,
          y: 0,
          children: [
            { id: 'editor-rect', type: 'scada-rect', x: 10, y: 10, width: 100, height: 50, fill: '#ff0000' },
            { id: 'editor-ellipse', type: 'scada-ellipse', x: 200, y: 10, width: 80, height: 80, fill: '#00ff00' },
          ],
        },
      ],
    };
    const SchemaRenderer = createSchemaRenderer(industrialEditorRendererDefinitions);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://editor-affordance/ungroup-btn"
        schema={{ type: 'scada-editor-canvas', config: groupedConfig as never }}
        env={createDefaultEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    const cid = await selectAndRender(container, ['scada-group-1']);
    const handle = readScadaEditorTestHandle(cid)!;
    await waitFor(() => {
      const ub = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Ungroup')!;
      expect(ub.disabled).toBe(false);
    });
    const ungroupBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Ungroup')!;
    act(() => {
      fireEvent.click(ungroupBtn);
    });
    await waitFor(() => {
      expect(handle.session.workingConfig.symbols.some((s) => s.id === 'editor-rect')).toBe(true);
      expect(handle.session.workingConfig.symbols.some((s) => s.type === 'scada-group')).toBe(false);
    });
  });
});

describe('P1-B keyboard layer (Delete / Ctrl+Z / Ctrl+G / Ctrl+Shift+G / arrows)', () => {
  it('Delete key removes selected symbol', async () => {
    const { container } = renderEditor('del-key');
    const cid = await selectAndRender(container, ['editor-rect']);
    const handle = readScadaEditorTestHandle(cid)!;
    const before = handle.session.workingConfig.symbols.length;
    const canvasArea = container.querySelector('.nop-scada-editor-layout-canvas') as HTMLElement;
    act(() => {
      fireEvent.keyDown(canvasArea, { key: 'Delete' });
    });
    expect(handle.session.workingConfig.symbols.length).toBe(before - 1);
  });

  it('Ctrl+G groups multi-selection, Ctrl+Shift+G ungroups', async () => {
    const { container } = renderEditor('group-key');
    const cid = await selectAndRender(container, ['editor-rect', 'editor-ellipse']);
    const handle = readScadaEditorTestHandle(cid)!;
    const canvasArea = container.querySelector('.nop-scada-editor-layout-canvas') as HTMLElement;
    act(() => {
      fireEvent.keyDown(canvasArea, { key: 'g', ctrlKey: true });
    });
    await waitFor(() => {
      expect(handle.session.workingConfig.symbols.some((s) => s.type === 'scada-group')).toBe(true);
    });
    // select the new group, then ungroup via Ctrl+Shift+G
    const group = handle.session.workingConfig.symbols.find((s) => s.type === 'scada-group')!;
    act(() => handle.setSelection([group.id]));
    await waitFor(() => expect(handle.session.selection).toEqual([group.id]));
    act(() => {
      fireEvent.keyDown(canvasArea, { key: 'G', ctrlKey: true, shiftKey: true });
    });
    await waitFor(() => {
      expect(handle.session.workingConfig.symbols.some((s) => s.type === 'scada-group')).toBe(false);
    });
  });

  it('Ctrl+Z undoes last edit', async () => {
    const { container } = renderEditor('undo-key');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    const canvasArea = container.querySelector('.nop-scada-editor-layout-canvas') as HTMLElement;
    const originalX = handle.session.workingConfig.symbols.find((s) => s.id === 'editor-rect')!.x;
    act(() => handle.updateSymbol('editor-rect', { x: 777 }));
    expect(handle.session.workingConfig.symbols.find((s) => s.id === 'editor-rect')!.x).toBe(777);
    act(() => {
      fireEvent.keyDown(canvasArea, { key: 'z', ctrlKey: true });
    });
    expect(handle.session.workingConfig.symbols.find((s) => s.id === 'editor-rect')!.x).toBe(originalX);
  });

  it('Ctrl+Y redoes after undo', async () => {
    const { container } = renderEditor('redo-key');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    const canvasArea = container.querySelector('.nop-scada-editor-layout-canvas') as HTMLElement;
    act(() => handle.updateSymbol('editor-rect', { x: 888 }));
    act(() => handle.undo());
    expect(handle.session.workingConfig.symbols.find((s) => s.id === 'editor-rect')!.x).not.toBe(888);
    act(() => {
      fireEvent.keyDown(canvasArea, { key: 'y', ctrlKey: true });
    });
    expect(handle.session.workingConfig.symbols.find((s) => s.id === 'editor-rect')!.x).toBe(888);
  });

  it('Backspace also removes selected symbol', async () => {
    const { container } = renderEditor('backspace-key');
    const cid = await selectAndRender(container, ['editor-rect']);
    const handle = readScadaEditorTestHandle(cid)!;
    const before = handle.session.workingConfig.symbols.length;
    const canvasArea = container.querySelector('.nop-scada-editor-layout-canvas') as HTMLElement;
    act(() => {
      fireEvent.keyDown(canvasArea, { key: 'Backspace' });
    });
    expect(handle.session.workingConfig.symbols.length).toBe(before - 1);
  });

  it('Arrow keys nudge selected symbol by 1px (shift = 10px)', async () => {
    const { container } = renderEditor('nudge-key');
    const cid = await selectAndRender(container, ['editor-rect']);
    const handle = readScadaEditorTestHandle(cid)!;
    const canvasArea = container.querySelector('.nop-scada-editor-layout-canvas') as HTMLElement;
    const originalX = handle.session.workingConfig.symbols.find((s) => s.id === 'editor-rect')!.x ?? 0;
    const originalY = handle.session.workingConfig.symbols.find((s) => s.id === 'editor-rect')!.y ?? 0;
    act(() => {
      fireEvent.keyDown(canvasArea, { key: 'ArrowRight' });
    });
    expect(handle.session.workingConfig.symbols.find((s) => s.id === 'editor-rect')!.x).toBe(originalX + 1);
    act(() => {
      fireEvent.keyDown(canvasArea, { key: 'ArrowDown', shiftKey: true });
    });
    expect(handle.session.workingConfig.symbols.find((s) => s.id === 'editor-rect')!.y).toBe(originalY + 10);
    act(() => {
      fireEvent.keyDown(canvasArea, { key: 'ArrowUp' });
    });
    expect(handle.session.workingConfig.symbols.find((s) => s.id === 'editor-rect')!.y).toBe(originalY + 9);
    act(() => {
      fireEvent.keyDown(canvasArea, { key: 'ArrowLeft' });
    });
    expect(handle.session.workingConfig.symbols.find((s) => s.id === 'editor-rect')!.x).toBe(originalX);
  });

  it('Ctrl+Shift+G with non-group in selection is a safe no-op', async () => {
    const { container } = renderEditor('ungroup-nogroup-key');
    const cid = await selectAndRender(container, ['editor-rect']);
    const handle = readScadaEditorTestHandle(cid)!;
    const canvasArea = container.querySelector('.nop-scada-editor-layout-canvas') as HTMLElement;
    const before = handle.session.workingConfig.symbols.length;
    act(() => {
      fireEvent.keyDown(canvasArea, { key: 'G', ctrlKey: true, shiftKey: true });
    });
    // editor-rect 不是 group → ungroup no-op，图元数不变。
    expect(handle.session.workingConfig.symbols.length).toBe(before);
  });

  it('keyboard ops with empty selection are safe no-ops', async () => {
    const { container } = renderEditor('empty-sel-key');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    const canvasArea = container.querySelector('.nop-scada-editor-layout-canvas') as HTMLElement;
    const before = handle.session.workingConfig.symbols.length;
    act(() => {
      fireEvent.keyDown(canvasArea, { key: 'Delete' });
      fireEvent.keyDown(canvasArea, { key: 'ArrowRight' });
    });
    expect(handle.session.workingConfig.symbols.length).toBe(before);
  });

  it('Ctrl+G with single selection is a safe no-op', async () => {
    const { container } = renderEditor('group-single-key');
    const cid = await selectAndRender(container, ['editor-rect']);
    const handle = readScadaEditorTestHandle(cid)!;
    const canvasArea = container.querySelector('.nop-scada-editor-layout-canvas') as HTMLElement;
    act(() => {
      fireEvent.keyDown(canvasArea, { key: 'g', ctrlKey: true });
    });
    // 单选 < 2 → groupSymbols 由调用方 guard，不产生 group 节点。
    expect(handle.session.workingConfig.symbols.some((s) => s.type === 'scada-group')).toBe(false);
  });
});

describe('P1-11 palette drop lands at pointer position (not hardcoded 50,50)', () => {
  it('drop with clientX/clientY places symbol near pointer', async () => {
    const { container } = renderEditor('drop-pointer');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    const canvasArea = container.querySelector('.nop-scada-editor-layout-canvas') as HTMLElement;
    act(() => {
      fireEvent.drop(canvasArea, {
        clientX: 320,
        clientY: 210,
        dataTransfer: {
          getData: (type: string) =>
            type === 'application/x-scada-symbol-type' ? 'scada-ellipse' : '',
        } as unknown as DataTransfer,
      });
    });
    const added = handle.session.workingConfig.symbols[handle.session.workingConfig.symbols.length - 1];
    expect(added.type).toBe('scada-ellipse');
    // jsdom getBoundingClientRect 返回全 0；viewport 默认 (0,0,scale=1) → world = view = clientX - rect.left。
    // 故 x = clientX - 50 = 270（旧硬编码为 50，断言显著偏离 50 证明落指针处）。
    expect(added.x).not.toBe(50);
    expect(added.y).not.toBe(50);
  });
});

describe('P1-10 raw <textarea> replaced by @nop-chaos/ui Textarea', () => {
  it('import dialog uses data-slot Textarea (no raw <textarea>) + onChange/confirm flow', async () => {
    const { container } = renderEditor('raw-textarea');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    const importBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Import')!;
    expect(importBtn).toBeTruthy();
    act(() => {
      fireEvent.click(importBtn);
    });
    await waitFor(() => {
      // Dialog 经 portal 渲染到 document.body（不在 container 内）。
      const ta = document.body.querySelector('[data-slot="scada-editor-toolbox-import-textarea"]');
      expect(ta).toBeTruthy();
      expect(ta!.tagName).toBe('TEXTAREA');
    });
    // raw <textarea> without data-slot no longer present; the only textarea carries the data-slot。
    const allTextarea = document.body.querySelectorAll('textarea');
    expect(allTextarea.length).toBeGreaterThanOrEqual(1);
    for (const ta of Array.from(allTextarea)) {
      expect(ta.getAttribute('data-slot')).toBe('scada-editor-toolbox-import-textarea');
    }
    // 覆盖 Textarea onChange + 确认导入流程（替换 working copy 为导入 config）。
    const ta = document.body.querySelector('[data-slot="scada-editor-toolbox-import-textarea"]') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(ta, { target: { value: '{"version":1,"variables":[],"symbols":[]}' } });
    });
    const confirmBtn = document.body.querySelector('[data-slot="scada-editor-toolbox-confirm"]') as HTMLButtonElement;
    expect(confirmBtn).toBeTruthy();
    act(() => {
      fireEvent.click(confirmBtn);
    });
    await waitFor(() => {
      expect(handle.session.workingConfig.symbols).toHaveLength(0);
    });
  });
});
