import React from 'react';
import { cleanup, render, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { EditorTemplateDialog } from './template-dialog.js';
import { createInMemoryTemplateStorage, type ScadaTemplateStorage } from './template-model.js';
import type { EditorEngineRuntime } from '../renderer/hooks/use-editor-engine.js';
import type { ScadaConfig, ScadaSymbolNode } from '../../serialization/config-types.js';
import { UndoStack } from '../undo-redo/undo-stack.js';
import { UndoRedoAdapter } from '../undo-redo/undo-redo-adapter.js';

vi.mock('leafer-ui', () => import('../../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));
vi.mock('@leafer-in/editor', () => ({}));

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n();
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

function makeRuntime(symbols: ScadaSymbolNode[]): EditorEngineRuntime {
  const workingConfig: ScadaConfig = { version: 1, variables: [], symbols };
  return {
    engine: {} as never,
    session: { workingConfig, committedBaseline: workingConfig, selection: [], mode: 'edit', undoStack: new UndoStack() },
    switchMode: () => undefined,
    setSelection: () => undefined,
    clearSelection: () => undefined,
    save: () => '{}',
    load: () => undefined,
    syncWorkingCopy: () => undefined,
    updateWorkingNode: () => undefined,
    addWorkingSymbol: () => undefined,
    removeWorkingSymbol: () => undefined,
    undoRedo: new UndoRedoAdapter(new UndoStack()),
    undo: () => undefined,
    redo: () => undefined,
    groupSymbols: () => undefined,
    ungroupSymbols: () => undefined,
    fitView: () => false,
    centerView: () => false,
    resetView: () => undefined,
    zoomView: () => undefined,
    alignSelection: () => false,
    distributeSelection: () => false,
    reorderZOrder: () => false,
    copySelection: () => 0,
    cutSelection: () => 0,
    paste: () => [],
    getClipboard: () => null,
    exportConfig: () => '{}',
    importConfig: () => false,
    listSymbolLibrary: () => [],
    listConnections: () => [],
    disconnectConnection: () => false,
    injectPreviewValues: () => 0,
    clearPreviewValues: () => undefined,
  };
}

const SYMBOLS: ScadaSymbolNode[] = [
  { id: 'pump', type: 'scada-device-pump', x: 10, y: 20, width: 100, height: 100 },
];

function renderDialog(overrides: {
  storage?: ScadaTemplateStorage;
  selection?: string[];
  runtime?: EditorEngineRuntime;
  onError?: (code: string, message: string) => void;
}) {
  const runtime = overrides.runtime ?? makeRuntime(SYMBOLS);
  const props = {
    runtime,
    storage: overrides.storage,
    selection: overrides.selection ?? ['pump'],
    open: true,
    onOpenChange: () => undefined,
    onError: overrides.onError,
  };
  return render(<EditorTemplateDialog {...props} />);
}

describe('EditorTemplateDialog (design-template-station.md §4.1)', () => {
  it('shows unwired hint when storage is not injected', () => {
    const { getByTestId } = renderDialog({});
    expect(getByTestId('toolbox-template-unwired').textContent).toContain('未接入');
  });

  it('saves the selection subtree as a template and lists it', async () => {
    const storage = createInMemoryTemplateStorage();
    const { getByTestId } = renderDialog({ storage });
    await waitFor(() => expect(getByTestId('toolbox-template-empty')).toBeTruthy());
    fireEvent.change(getByTestId('toolbox-template-name'), { target: { value: 'pump unit' } });
    fireEvent.click(getByTestId('toolbox-template-save'));
    await waitFor(() => expect(getByTestId('toolbox-template-row')).toBeTruthy());
    expect(getByTestId('toolbox-template-row').textContent).toContain('pump unit');
    expect(getByTestId('toolbox-template-row').textContent).toContain('1');
  });

  it('insert instantiates the template with a fresh id via runtime.addWorkingSymbol', async () => {
    const storage = createInMemoryTemplateStorage();
    await storage.saveTemplate({
      id: 't1',
      name: 'pump',
      createdAt: 1,
      symbols: [{ id: 'pump', type: 'scada-device-pump', x: 0, y: 0, width: 10, height: 10 }],
    });
    const runtime = makeRuntime(SYMBOLS);
    const added: ScadaSymbolNode[] = [];
    runtime.addWorkingSymbol = (node) => {
      added.push(node);
    };
    const { getByTestId } = renderDialog({ storage, runtime });
    await waitFor(() => expect(getByTestId('toolbox-template-row')).toBeTruthy());
    fireEvent.click(getByTestId('toolbox-template-insert'));
    expect(added).toHaveLength(1);
    expect(added[0].id).not.toBe('pump');
    expect(getByTestId('toolbox-template-status').textContent).toContain('1');
  });

  it('delete removes the template from the list', async () => {
    const storage = createInMemoryTemplateStorage();
    await storage.saveTemplate({ id: 't1', name: 'pump', createdAt: 1, symbols: [] });
    const { getByTestId } = renderDialog({ storage });
    await waitFor(() => expect(getByTestId('toolbox-template-row')).toBeTruthy());
    fireEvent.click(getByTestId('toolbox-template-delete'));
    await waitFor(() => expect(getByTestId('toolbox-template-empty')).toBeTruthy());
  });

  it('storage failures surface via onError with code storage-error', async () => {
    const onError = vi.fn();
    const storage = {
      listTemplates: () => Promise.reject(new Error('disk full')),
      saveTemplate: () => Promise.resolve(),
      deleteTemplate: () => Promise.resolve(),
    };
    const { container } = renderDialog({ storage, onError });
    await waitFor(() => expect(onError).toHaveBeenCalledWith('storage-error', expect.stringContaining('disk full')));
    // 弹层处于已接线态（storage 已注入）——失败只上报，不落入未接入提示分支。
    expect(container.querySelector('[data-testid="toolbox-template-unwired"]')).toBeNull();
  });

  it('shows the no-selection hint next to the save action when selection is empty', async () => {
    const storage = createInMemoryTemplateStorage();
    const { getByTestId } = renderDialog({ storage, selection: [] });
    await waitFor(() => expect(getByTestId('toolbox-template-empty')).toBeTruthy());
    // Dialog 经 portal 挂载到 document.body——从 body 断言提示文本。
    expect(document.body.textContent).toContain('先选中图元再保存模板');
  });

  it('rejects saving when the selection matches no working-copy nodes (status hint, nothing persisted)', async () => {
    const storage = createInMemoryTemplateStorage();
    const { getByTestId } = renderDialog({ storage, selection: ['ghost'] });
    await waitFor(() => expect(getByTestId('toolbox-template-empty')).toBeTruthy());
    fireEvent.change(getByTestId('toolbox-template-name'), { target: { value: 'ghost unit' } });
    fireEvent.click(getByTestId('toolbox-template-save'));
    await waitFor(() => expect(getByTestId('toolbox-template-status').textContent).toContain('先选中图元再保存模板'));
    expect(await storage.listTemplates()).toHaveLength(0);
  });

  it('surfaces saveTemplate failures via onError without clearing the draft', async () => {
    const onError = vi.fn();
    const storage: ScadaTemplateStorage = {
      listTemplates: () => Promise.resolve([]),
      saveTemplate: () => Promise.reject(new Error('quota exceeded')),
      deleteTemplate: () => Promise.resolve(),
    };
    const { getByTestId } = renderDialog({ storage, onError });
    await waitFor(() => expect(getByTestId('toolbox-template-empty')).toBeTruthy());
    fireEvent.change(getByTestId('toolbox-template-name'), { target: { value: 'doomed' } });
    fireEvent.click(getByTestId('toolbox-template-save'));
    await waitFor(() => expect(onError).toHaveBeenCalledWith('storage-error', expect.stringContaining('quota exceeded')));
    // 保存失败不清空名称草稿（用户可重试）。
    expect((getByTestId('toolbox-template-name') as HTMLInputElement).value).toBe('doomed');
  });

  it('surfaces deleteTemplate failures via onError', async () => {
    const onError = vi.fn();
    const storage: ScadaTemplateStorage = {
      listTemplates: async () => [{ id: 't1', name: 'kept', createdAt: 1, symbols: [] }],
      saveTemplate: () => Promise.resolve(),
      deleteTemplate: () => Promise.reject(new Error('locked')),
    };
    const { getByTestId } = renderDialog({ storage, onError });
    await waitFor(() => expect(getByTestId('toolbox-template-row')).toBeTruthy());
    fireEvent.click(getByTestId('toolbox-template-delete'));
    await waitFor(() => expect(onError).toHaveBeenCalledWith('storage-error', expect.stringContaining('locked')));
    // 删除失败 → 列表保持（refresh 被 catch 中断前 listTemplates 仍返回原数据）。
    expect(getByTestId('toolbox-template-row')).toBeTruthy();
  });

  it('close button requests closing via onOpenChange(false)', async () => {
    const onOpenChange = vi.fn();
    const props = {
      runtime: makeRuntime(SYMBOLS),
      storage: createInMemoryTemplateStorage(),
      selection: ['pump'],
      open: true,
      onOpenChange,
    };
    const { getByTestId } = render(<EditorTemplateDialog {...props} />);
    await waitFor(() => expect(getByTestId('toolbox-template-empty')).toBeTruthy());
    fireEvent.click(getByTestId('toolbox-template-close'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
