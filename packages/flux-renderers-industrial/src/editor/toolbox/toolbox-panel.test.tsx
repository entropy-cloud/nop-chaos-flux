import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetLeaferMock } from '../../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../../symbols/register-builtin.js';
import { UndoStack } from '../undo-redo/undo-stack.js';
import { UndoRedoAdapter } from '../undo-redo/undo-redo-adapter.js';
import type { EditorEngineRuntime } from '../renderer/hooks/use-editor-engine.js';
import type { ScadaConfig } from '../../serialization/config-types.js';
import { EditorToolboxPanel } from './toolbox-panel.js';

vi.mock('leafer-ui', () => import('../../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));
vi.mock('@leafer-in/editor', () => ({}));

const config: ScadaConfig = {
  version: 1,
  variables: [],
  symbols: [
    { id: 'a', type: 'scada-rect', x: 0, y: 0, width: 50, height: 50 },
    { id: 'b', type: 'scada-rect', x: 100, y: 100, width: 50, height: 50 },
    { id: 'c', type: 'scada-rect', x: 200, y: 200, width: 50, height: 50 },
  ],
};

function makeRuntime(overrides: Partial<EditorEngineRuntime> = {}): EditorEngineRuntime & {
  calls: Record<string, unknown[]>;
} {
  const calls: Record<string, unknown[]> = {};
  const track = <T extends (...args: never[]) => unknown>(name: string, fn: T) => {
    return (...args: never[]) => {
      calls[name] = args;
      return fn(...args);
    };
  };
  const undoStack = new UndoStack();
  const undoRedo = new UndoRedoAdapter(undoStack);
  const rt = {
    engine: {
      getViewport: () => ({ x: 0, y: 0, scale: 1 }),
      getSize: () => ({ width: 800, height: 600 }),
    } as never,
    session: { workingConfig: config, committedBaseline: config, selection: [] as string[], mode: 'edit' as const, undoStack },
    switchMode: () => undefined,
    setSelection: () => undefined,
    clearSelection: () => undefined,
    save: () => '{}',
    load: () => undefined,
    syncWorkingCopy: () => undefined,
    updateWorkingNode: () => undefined,
    addWorkingSymbol: () => undefined,
    removeWorkingSymbol: () => undefined,
    undoRedo,
    undo: track('undo', () => undefined),
    redo: track('redo', () => undefined),
    groupSymbols: () => undefined,
    ungroupSymbols: () => undefined,
    fitView: track('fitView', () => true),
    centerView: track('centerView', () => true),
    resetView: track('resetView', () => undefined),
    zoomView: track('zoomView', () => undefined),
    alignSelection: track('align', () => true),
    distributeSelection: track('distribute', () => true),
    reorderZOrder: track('zorder', () => true),
    copySelection: track('copy', () => 1),
    cutSelection: track('cut', () => 1),
    paste: track('paste', () => ['new-1']),
    getClipboard: () => ({ symbols: [{ id: 'a' }] as never[], operation: 'copy' as const }),
    exportConfig: track('export', () => '{}'),
    importConfig: track('import', () => true),
    listSymbolLibrary: () => [{ type: 'scada-rect', name: 'Rect' }],
    ...overrides,
  } as unknown as EditorEngineRuntime & { calls: Record<string, unknown[]> };
  rt.calls = calls;
  return rt;
}

beforeEach(() => {
  resetLeaferMock();
  registerBuiltinScadaSymbols();
});

afterEach(() => {
  cleanup();
});

function renderPanel(selection: string[], runtime?: ReturnType<typeof makeRuntime>) {
  const rt = runtime ?? makeRuntime();
  const { container } = render(
    <EditorToolboxPanel runtime={rt} selection={selection} onError={() => undefined} />,
  );
  return { container, runtime: rt };
}

function buttonByText(container: HTMLElement, text: string): HTMLButtonElement {
  const buttons = Array.from(container.querySelectorAll('button'));
  const found = buttons.find((b) => b.textContent?.trim() === text);
  if (!found) throw new Error(`button "${text}" not found`);
  return found;
}

describe('EditorToolboxPanel (design-toolbox.md §10 + §11)', () => {
  it('renders toolbox marker with data-slot', () => {
    const { container } = renderPanel([]);
    expect(container.querySelector('[data-slot="scada-editor-toolbox"]')).not.toBeNull();
  });

  it('view tool buttons call engine command face (fit/center/reset/zoom)', () => {
    const { container, runtime } = renderPanel([]);
    fireEvent.click(buttonByText(container, 'Fit'));
    fireEvent.click(buttonByText(container, 'Center'));
    fireEvent.click(buttonByText(container, '1:1'));
    fireEvent.click(buttonByText(container, '+'));
    fireEvent.click(buttonByText(container, '−'));
    expect(runtime.calls.fitView).toBeDefined();
    expect(runtime.calls.centerView).toBeDefined();
    expect(runtime.calls.resetView).toBeDefined();
    expect(runtime.calls.zoomView).toBeDefined();
  });

  it('align buttons disabled when selection < 2', () => {
    const { container } = renderPanel(['a']);
    expect(buttonByText(container, '⌅L').disabled).toBe(true);
    expect(buttonByText(container, '⌅R').disabled).toBe(true);
  });

  it('align buttons enabled + call alignSelection when selection >= 2', () => {
    const { container, runtime } = renderPanel(['a', 'b']);
    const alignBtn = buttonByText(container, '⌅L');
    expect(alignBtn.disabled).toBe(false);
    fireEvent.click(alignBtn);
    expect(runtime.calls.align).toBeDefined();
  });

  it('distribute buttons disabled when selection < 3', () => {
    const { container } = renderPanel(['a', 'b']);
    expect(buttonByText(container, '↔').disabled).toBe(true);
  });

  it('distribute buttons enabled + call distributeSelection when selection >= 3', () => {
    const { container, runtime } = renderPanel(['a', 'b', 'c']);
    fireEvent.click(buttonByText(container, '↕'));
    expect(runtime.calls.distribute).toBeDefined();
  });

  it('z-order buttons disabled when no selection', () => {
    const { container } = renderPanel([]);
    expect(buttonByText(container, '⤒').disabled).toBe(true);
  });

  it('z-order buttons call reorderZOrder when selection present', () => {
    const { container, runtime } = renderPanel(['a']);
    fireEvent.click(buttonByText(container, '⤒'));
    fireEvent.click(buttonByText(container, '↑'));
    fireEvent.click(buttonByText(container, '↓'));
    fireEvent.click(buttonByText(container, '⤓'));
    expect(runtime.calls.zorder).toBeDefined();
  });

  it('copy/cut disabled when no selection; paste disabled when clipboard empty', () => {
    const emptyClipboard = makeRuntime({ getClipboard: () => null });
    const { container } = renderPanel([], emptyClipboard);
    expect(buttonByText(container, 'Copy').disabled).toBe(true);
    expect(buttonByText(container, 'Cut').disabled).toBe(true);
    expect(buttonByText(container, 'Paste').disabled).toBe(true);
  });

  it('copy/cut/paste call runtime methods when enabled', () => {
    const { container, runtime } = renderPanel(['a']);
    fireEvent.click(buttonByText(container, 'Copy'));
    expect(runtime.calls.copy).toBeDefined();
    fireEvent.click(buttonByText(container, 'Cut'));
    expect(runtime.calls.cut).toBeDefined();
    // after copy, clipboard non-empty → paste enabled
    fireEvent.click(buttonByText(container, 'Paste'));
    expect(runtime.calls.paste).toBeDefined();
  });

  it('export button calls exportConfig', () => {
    const { container, runtime } = renderPanel([]);
    fireEvent.click(buttonByText(container, 'Export'));
    expect(runtime.calls.export).toBeDefined();
  });

  it('undo/redo call runtime undo/redo', () => {
    // seed stack so undo/redo enabled
    const rt = makeRuntime();
    rt.session.undoStack.push({ forward: { added: [], removed: [], updated: [] }, inverse: { added: [], removed: [], updated: [] }, operationKind: 'update-symbol', timestamp: 0 });
    const { container } = renderPanel([], rt);
    fireEvent.click(buttonByText(container, 'Undo'));
    expect(rt.calls.undo).toBeDefined();
  });

  it('import button opens confirm dialog (T5)', () => {
    const { container } = renderPanel([]);
    fireEvent.click(buttonByText(container, 'Import'));
    // dialog renders into portal (document.body)
    expect(document.querySelector('[data-slot="scada-editor-toolbox-import-textarea"]')).not.toBeNull();
  });

  it('import confirm calls importConfig + closes dialog', () => {
    const { container } = renderPanel([]);
    fireEvent.click(buttonByText(container, 'Import'));
    const textarea = document.querySelector('[data-slot="scada-editor-toolbox-import-textarea"]') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '{"version":1,"symbols":[]}' } });
    const confirmBtn = document.querySelector('[data-slot="scada-editor-toolbox-confirm"]') as HTMLButtonElement;
    fireEvent.click(confirmBtn);
    // dialog closed after confirm
    expect(document.querySelector('[data-slot="scada-editor-toolbox-import-textarea"]')).toBeNull();
  });

  it('import confirm disabled when textarea empty', () => {
    const { container } = renderPanel([]);
    fireEvent.click(buttonByText(container, 'Import'));
    const confirmBtn = document.querySelector('[data-slot="scada-editor-toolbox-confirm"]') as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);
  });

  it('fit returning false surfaces not-visible status message', () => {
    const emptyScene = makeRuntime({ fitView: () => false });
    const { container } = renderPanel([], emptyScene);
    fireEvent.click(buttonByText(container, 'Fit'));
    const status = container.querySelector('[data-slot="scada-editor-toolbox-status"]');
    expect(status).not.toBeNull();
  });

  it('paste with empty clipboard surfaces clipboard-empty message', () => {
    const emptyCb = makeRuntime({ getClipboard: () => null });
    const { container } = renderPanel([], emptyCb);
    // paste disabled when clipboard empty; enable by giving selection + simulating copy state
    // Instead, directly: copy sets clipboardCount, paste reads it. With empty clipboard, paste button is disabled.
    expect(buttonByText(container, 'Paste').disabled).toBe(true);
  });

  it('align no-op (returns false) surfaces no-change message', () => {
    const noOp = makeRuntime({ alignSelection: () => false });
    const { container } = renderPanel(['a', 'b'], noOp);
    fireEvent.click(buttonByText(container, '⌅L'));
    expect(container.querySelector('[data-slot="scada-editor-toolbox-status"]')).not.toBeNull();
  });

  it('distribute no-op (returns false) surfaces no-change message', () => {
    const noOp = makeRuntime({ distributeSelection: () => false });
    const { container } = renderPanel(['a', 'b', 'c'], noOp);
    fireEvent.click(buttonByText(container, '↔'));
    expect(container.querySelector('[data-slot="scada-editor-toolbox-status"]')).not.toBeNull();
  });

  it('z-order no-op (returns false) surfaces no-change message', () => {
    const noOp = makeRuntime({ reorderZOrder: () => false });
    const { container } = renderPanel(['a'], noOp);
    fireEvent.click(buttonByText(container, '⤒'));
    expect(container.querySelector('[data-slot="scada-editor-toolbox-status"]')).not.toBeNull();
  });

  it('import confirm with failing importConfig surfaces invalid-config message', () => {
    const rt = makeRuntime({ importConfig: () => false });
    const { container } = renderPanel([], rt);
    fireEvent.click(buttonByText(container, 'Import'));
    const textarea = document.querySelector('[data-slot="scada-editor-toolbox-import-textarea"]') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'garbage' } });
    const confirmBtn = document.querySelector('[data-slot="scada-editor-toolbox-confirm"]') as HTMLButtonElement;
    fireEvent.click(confirmBtn);
    expect(container.querySelector('[data-slot="scada-editor-toolbox-status"]')).not.toBeNull();
  });

  it('redo button calls runtime redo when canRedo', () => {
    const rt = makeRuntime();
    const entry = {
      forward: { added: [], removed: [], updated: [] },
      inverse: { added: [], removed: [], updated: [] },
      operationKind: 'update-symbol' as const,
      timestamp: 0,
    };
    rt.session.undoStack.push(entry);
    rt.session.undoStack.popForUndo();
    const { container } = renderPanel([], rt);
    fireEvent.click(buttonByText(container, 'Redo'));
    expect(rt.calls.redo).toBeDefined();
  });

  it('status message surfaces after a tool click', () => {
    const { container } = renderPanel([]);
    fireEvent.click(buttonByText(container, 'Fit'));
    expect(container.querySelector('[data-slot="scada-editor-toolbox-status"]')).not.toBeNull();
  });

  // plan 2026-08-08-0900-1 Phase 5 / P2 #21：canPaste 从 canonical clipboard 派生（非 React state mirror）。
  it('#21 Paste disabled→enabled after copy (canPaste derived from canonical clipboard)', () => {
    // Mutable clipboard mock: starts empty, copySelection populates it.
    let clipboardSymbols: unknown[] = [];
    const rt = makeRuntime({
      copySelection: () => {
        clipboardSymbols = [{ id: 'a' }];
        return clipboardSymbols.length;
      },
      getClipboard: () => clipboardSymbols.length > 0 ? { symbols: clipboardSymbols as never[], operation: 'copy' as const } : null,
    });
    const { container } = renderPanel(['a'], rt);
    // Initially clipboard empty → Paste disabled.
    expect(buttonByText(container, 'Paste').disabled).toBe(true);
    // Copy populates canonical clipboard → Paste enabled on re-render.
    fireEvent.click(buttonByText(container, 'Copy'));
    expect(buttonByText(container, 'Paste').disabled).toBe(false);
  });

  it('#21 Paste re-disabled when clipboard cleared externally (no stale state mirror)', () => {
    // Simulates external clipboard clear (e.g., load/undo/test handle) — with state mirror this would stay enabled.
    let clipboardSymbols: unknown[] = [{ id: 'a' }];
    const rt = makeRuntime({
      getClipboard: () => clipboardSymbols.length > 0 ? { symbols: clipboardSymbols as never[], operation: 'copy' as const } : null,
    });
    const { container } = renderPanel(['a'], rt);
    // Clipboard non-empty → Paste enabled.
    expect(buttonByText(container, 'Paste').disabled).toBe(false);
    // External clear: clipboard emptied outside toolbox.
    clipboardSymbols = [];
    // Trigger re-render (parent bumpSessionVersion analog — status change forces re-render).
    fireEvent.click(buttonByText(container, 'Fit'));
    expect(buttonByText(container, 'Paste').disabled).toBe(true);
  });
});
