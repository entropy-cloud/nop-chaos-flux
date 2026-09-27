import React from 'react';
import { cleanup, render, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { EditorStationDialog } from './station-dialog.js';
import { createInMemoryStationStorage, EMPTY_SCREEN_DOCUMENT, type ScadaStationStorage } from './station-model.js';
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

const SYMBOLS: ScadaSymbolNode[] = [
  { id: 'rect', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 },
];

function makeRuntime(serialized = '{"version":1,"variables":[],"symbols":[]}'): EditorEngineRuntime {
  const workingConfig: ScadaConfig = { version: 1, variables: [], symbols: SYMBOLS };
  const runtime: EditorEngineRuntime = {
    engine: {} as never,
    session: { workingConfig, committedBaseline: workingConfig, selection: [], mode: 'edit', undoStack: new UndoStack() },
    switchMode: () => undefined,
    setSelection: () => undefined,
    clearSelection: () => undefined,
    save: () => serialized,
    load: vi.fn(),
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
    exportConfig: () => serialized,
    importConfig: () => false,
    listSymbolLibrary: () => [],
    listConnections: () => [],
    disconnectConnection: () => false,
    injectPreviewValues: () => 0,
    clearPreviewValues: () => undefined,
  };
  return runtime;
}

function renderDialog(overrides: {
  storage?: ScadaStationStorage;
  runtime?: EditorEngineRuntime;
  onError?: (code: string, message: string) => void;
}) {
  const runtime = overrides.runtime ?? makeRuntime();
  const props = {
    runtime,
    storage: overrides.storage,
    open: true,
    onOpenChange: () => undefined,
    onError: overrides.onError,
  };
  return render(<EditorStationDialog {...props} />);
}

describe('EditorStationDialog (design-template-station.md §4.2)', () => {
  it('shows unwired hint when storage is not injected', () => {
    const { getByTestId } = renderDialog({});
    expect(getByTestId('toolbox-station-unwired').textContent).toContain('未接入');
  });

  it('guides station creation when no station exists', async () => {
    const storage = createInMemoryStationStorage();
    const { getByTestId } = renderDialog({ storage });
    await waitFor(() => expect(getByTestId('toolbox-station-create')).toBeTruthy());
    fireEvent.change(getByTestId('toolbox-station-name'), { target: { value: 'plant-1' } });
    fireEvent.click(getByTestId('toolbox-station-create'));
    await waitFor(() => expect(getByTestId('toolbox-station-empty')).toBeTruthy());
    expect((await storage.loadStation())?.name).toBe('plant-1');
  });

  it('creates screens; new screen becomes current', async () => {
    const storage = createInMemoryStationStorage();
    await storage.saveStation({ id: 'st', name: 'plant', screens: [] });
    const { getByTestId } = renderDialog({ storage });
    void getByTestId;
    await waitFor(() => expect(document.querySelector('[data-testid="toolbox-station-add-screen"]')).toBeTruthy());
    fireEvent.change(getByTestId('toolbox-station-screen-name'), { target: { value: 'overview' } });
    fireEvent.click(getByTestId('toolbox-station-add-screen'));
    await waitFor(() => expect(getByTestId('toolbox-station-row')).toBeTruthy());
    expect(getByTestId('toolbox-station-row').getAttribute('data-current')).toBe('true');
    expect(getByTestId('toolbox-station-current').textContent).toContain('overview');
  });

  it('switch saves the current screen first then loads the target document via runtime.load', async () => {
    const storage = createInMemoryStationStorage();
    await storage.saveStation({
      id: 'st',
      name: 'plant',
      screens: [
        { id: 's1', name: 'one', updatedAt: 1 },
        { id: 's2', name: 'two', updatedAt: 2 },
      ],
    });
    await storage.saveScreen('s2', '{"version":1,"variables":[],"symbols":[{"id":"x","type":"scada-rect"}]}');
    const runtime = makeRuntime('{"version":1,"variables":[],"symbols":[{"id":"cur","type":"scada-rect"}]}');
    const { getByTestId, getAllByTestId } = renderDialog({ storage, runtime });
    await waitFor(() => expect(getAllByTestId('toolbox-station-row')).toHaveLength(2));
    // Switch from s1 (current by default = first screen) to s2.
    fireEvent.click(getAllByTestId('toolbox-station-switch')[1]);
    await waitFor(() => expect(runtime.load).toHaveBeenCalled());
    // Load received the target document (s2 body), not an empty config.
    expect(vi.mocked(runtime.load).mock.calls[0][0]).toContain('"x"');
    // Current screen was auto-saved first.
    expect(await storage.loadScreen('s1')).toContain('"cur"');
    expect(getByTestId('toolbox-station-status').textContent).toContain('已切换');
  });

  it('save persists the working copy serialization for the current screen', async () => {
    const storage = createInMemoryStationStorage();
    await storage.saveStation({
      id: 'st',
      name: 'plant',
      screens: [{ id: 's1', name: 'one', updatedAt: 1 }],
    });
    const runtime = makeRuntime('{"version":1,"symbols":[{"id":"live"}]}');
    const { getByTestId } = renderDialog({ storage, runtime });
    await waitFor(() => expect(getByTestId('toolbox-station-save')).toBeTruthy());
    fireEvent.click(getByTestId('toolbox-station-save'));
    await waitFor(() => expect(getByTestId('toolbox-station-status').textContent).toContain('已保存'));
    expect(await storage.loadScreen('s1')).toContain('"live"');
  });

  it('deleting the current screen falls back to the first remaining screen', async () => {
    const storage = createInMemoryStationStorage();
    await storage.saveStation({
      id: 'st',
      name: 'plant',
      screens: [
        { id: 's1', name: 'one', updatedAt: 1 },
        { id: 's2', name: 'two', updatedAt: 2 },
      ],
    });
    const { getAllByTestId } = renderDialog({ storage });
    await waitFor(() => expect(getAllByTestId('toolbox-station-row')).toHaveLength(2));
    fireEvent.click(getAllByTestId('toolbox-station-delete')[0]);
    await waitFor(() => expect(getAllByTestId('toolbox-station-row')).toHaveLength(1));
    // Current switched to the remaining s2 row.
    expect(getAllByTestId('toolbox-station-row')[0].getAttribute('data-current')).toBe('true');
  });

  it('storage failures surface via onError with code storage-error', async () => {
    const onError = vi.fn();
    const storage = {
      loadStation: () => Promise.reject(new Error('boom')),
      saveStation: () => Promise.resolve(),
      loadScreen: () => Promise.resolve(null),
      saveScreen: () => Promise.resolve(),
      deleteScreen: () => Promise.resolve(),
    };
    renderDialog({ storage, onError });
    await waitFor(() => expect(onError).toHaveBeenCalledWith('storage-error', expect.stringContaining('boom')));
  });

  it('switch falls back to the empty document when the target screen was never saved (loadScreen → null)', async () => {
    const storage = createInMemoryStationStorage();
    await storage.saveStation({
      id: 'st',
      name: 'plant',
      screens: [
        { id: 's1', name: 'one', updatedAt: 1 },
        { id: 's2', name: 'unsaved', updatedAt: 2 },
      ],
    });
    // s2 从未 saveScreen → loadScreen 返回 null → runtime.load 兜底装入空文档。
    const runtime = makeRuntime();
    const { getAllByTestId } = renderDialog({ storage, runtime });
    await waitFor(() => expect(getAllByTestId('toolbox-station-row')).toHaveLength(2));
    fireEvent.click(getAllByTestId('toolbox-station-switch')[1]);
    await waitFor(() => expect(runtime.load).toHaveBeenCalled());
    expect(vi.mocked(runtime.load).mock.calls[0][0]).toBe(EMPTY_SCREEN_DOCUMENT);
  });

  it('deleting a non-current screen keeps the current screen selected', async () => {
    const storage = createInMemoryStationStorage();
    await storage.saveStation({
      id: 'st',
      name: 'plant',
      screens: [
        { id: 's1', name: 'one', updatedAt: 1 },
        { id: 's2', name: 'two', updatedAt: 2 },
      ],
    });
    const { getAllByTestId } = renderDialog({ storage });
    await waitFor(() => expect(getAllByTestId('toolbox-station-row')).toHaveLength(2));
    // 当前画面默认 s1；删除 s2（非当前）→ 当前保持 s1。
    fireEvent.click(getAllByTestId('toolbox-station-delete')[1]);
    await waitFor(() => expect(getAllByTestId('toolbox-station-row')).toHaveLength(1));
    expect(getAllByTestId('toolbox-station-row')[0].getAttribute('data-current')).toBe('true');
    expect(getAllByTestId('toolbox-station-row')[0].textContent).toContain('one');
  });

  it('surfaces saveStation failure when creating a station via onError', async () => {
    const onError = vi.fn();
    const storage = {
      loadStation: () => Promise.resolve(null),
      saveStation: () => Promise.reject(new Error('disk full')),
      loadScreen: () => Promise.resolve(null),
      saveScreen: () => Promise.resolve(),
      deleteScreen: () => Promise.resolve(),
    };
    const { getByTestId } = renderDialog({ storage, onError });
    await waitFor(() => expect(getByTestId('toolbox-station-create')).toBeTruthy());
    fireEvent.change(getByTestId('toolbox-station-name'), { target: { value: 'plant-x' } });
    fireEvent.click(getByTestId('toolbox-station-create'));
    await waitFor(() => expect(onError).toHaveBeenCalledWith('storage-error', expect.stringContaining('disk full')));
  });

  it('surfaces saveScreen failure when creating a screen via onError', async () => {
    const onError = vi.fn();
    const storage = {
      loadStation: () =>
        Promise.resolve({ id: 'st', name: 'plant', screens: [{ id: 's1', name: 'one', updatedAt: 1 }] }),
      saveStation: () => Promise.resolve(),
      loadScreen: () => Promise.resolve(null),
      saveScreen: () => Promise.reject(new Error('read-only')),
      deleteScreen: () => Promise.resolve(),
    };
    const { getByTestId } = renderDialog({ storage, onError });
    await waitFor(() => expect(getByTestId('toolbox-station-add-screen')).toBeTruthy());
    fireEvent.change(getByTestId('toolbox-station-screen-name'), { target: { value: 'extra' } });
    fireEvent.click(getByTestId('toolbox-station-add-screen'));
    await waitFor(() => expect(onError).toHaveBeenCalledWith('storage-error', expect.stringContaining('read-only')));
  });

  it('surfaces deleteScreen failure via onError', async () => {
    const onError = vi.fn();
    const storage = {
      loadStation: () =>
        Promise.resolve({ id: 'st', name: 'plant', screens: [{ id: 's1', name: 'one', updatedAt: 1 }] }),
      saveStation: () => Promise.resolve(),
      loadScreen: () => Promise.resolve(null),
      saveScreen: () => Promise.resolve(),
      deleteScreen: () => Promise.reject(new Error('locked')),
    };
    const { getByTestId } = renderDialog({ storage, onError });
    await waitFor(() => expect(getByTestId('toolbox-station-delete')).toBeTruthy());
    fireEvent.click(getByTestId('toolbox-station-delete'));
    await waitFor(() => expect(onError).toHaveBeenCalledWith('storage-error', expect.stringContaining('locked')));
  });

  it('surfaces switch-chain failures (auto-save of the current screen) via onError', async () => {
    const onError = vi.fn();
    let saveScreenCalls = 0;
    const storage = {
      loadStation: () =>
        Promise.resolve({
          id: 'st',
          name: 'plant',
          screens: [
            { id: 's1', name: 'one', updatedAt: 1 },
            { id: 's2', name: 'two', updatedAt: 2 },
          ],
        }),
      saveStation: () => Promise.resolve(),
      loadScreen: () => Promise.resolve('{"version":1,"variables":[],"symbols":[]}'),
      saveScreen: () => {
        saveScreenCalls += 1;
        return saveScreenCalls === 1 ? Promise.reject(new Error('io error')) : Promise.resolve();
      },
      deleteScreen: () => Promise.resolve(),
    };
    const { getAllByTestId } = renderDialog({ storage, onError });
    await waitFor(() => expect(getAllByTestId('toolbox-station-row')).toHaveLength(2));
    fireEvent.click(getAllByTestId('toolbox-station-switch')[1]);
    await waitFor(() => expect(onError).toHaveBeenCalledWith('storage-error', expect.stringContaining('io error')));
  });
});
