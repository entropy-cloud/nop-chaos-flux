// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import * as FluxReact from '@nop-chaos/flux-react';
import type { ActionResult } from '@nop-chaos/flux-core';
import {
  createEnv,
  datasetStore,
  editorStore,
  mockState,
  mockedCore,
  originalWindowConfirm,
  renderWordEditor,
  resetWordEditorActionMocks,
} from './word-editor-page-actions.test-support.js';
import * as wordEditorActionProvider from '../word-editor-action-provider.js';

describe('WordEditorPage actions and events', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    if (originalWindowConfirm.hasOwn) {
      window.confirm = originalWindowConfirm.value;
    } else {
      Reflect.deleteProperty(window, 'confirm');
    }
    vi.useRealTimers();
  });

  it('saves through the word-editor action provider and forwards onSave', async () => {
    resetWordEditorActionMocks();
    const notify = vi.fn();

    renderWordEditor({
      schema: {
        type: 'word-editor-page',
        onSave: { action: 'showToast', args: { message: 'save event fired' } },
      },
      env: createEnv(notify),
    });

    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(mockedCore.captureDocumentSnapshotMock).toHaveBeenCalledTimes(1);
      expect(mockedCore.persistSavedDocumentMock).toHaveBeenCalledTimes(1);
      expect(mockedCore.saveDatasetsMock).toHaveBeenCalledTimes(1);
      expect(editorStore.setDirty).toHaveBeenCalledWith(false);
      expect(notify).toHaveBeenCalledWith('info', 'save event fired');
    });
  });

  it('wires shortcut save through the same save handler', async () => {
    resetWordEditorActionMocks();

    renderWordEditor();
    mockState.shortcutOptions?.onSave?.();

    await waitFor(() => {
      expect(mockedCore.captureDocumentSnapshotMock).toHaveBeenCalledTimes(1);
      expect(mockedCore.persistSavedDocumentMock).toHaveBeenCalledTimes(1);
      expect(mockedCore.saveDatasetsMock).toHaveBeenCalledTimes(1);
      expect(editorStore.setDirty).toHaveBeenCalledWith(false);
    });
  });

  it('keeps dataset dialog edits in memory until explicit save succeeds', async () => {
    resetWordEditorActionMocks();

    renderWordEditor();

    expect(screen.getByTestId('dataset-dialog')).toBeTruthy();
    expect(mockState.lastDatasetDialogProps).toBeTruthy();

    mockState.lastDatasetDialogProps.onSave({
      name: 'Orders',
      description: 'Order dataset',
      type: 'static',
      columns: [],
    });

    await waitFor(() => {
      expect(datasetStore.add).toHaveBeenCalledTimes(1);
      expect(editorStore.setDirty).toHaveBeenCalledWith(true);
    });

    expect(mockedCore.saveDatasetsMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(mockedCore.saveDatasetsMock).toHaveBeenCalledTimes(1);
      expect(mockedCore.saveDatasetsMock).toHaveBeenCalledWith([
        expect.objectContaining({ name: 'Orders', description: 'Order dataset', type: 'static' }),
      ]);
    });
  });

  it('passes an AbortSignal into word-editor save actions', async () => {
    resetWordEditorActionMocks();

    const invoke = vi.fn(async () => ({ ok: true }));
    vi.spyOn(wordEditorActionProvider, 'createWordEditorActionProvider').mockReturnValue({
        kind: 'host',
        listMethods() {
          return ['save'];
        },
        invoke,
      } as any);

    renderWordEditor();
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledTimes(1);
      const invokeCall = invoke.mock.calls[0] as unknown[] | undefined;
      const invokeCtx = invokeCall?.[2] as { signal?: AbortSignal } | undefined;
      expect(invokeCtx?.signal).toBeInstanceOf(AbortSignal);
    });

  });

  it('ignores concurrent save triggers while a save is already running', async () => {
    resetWordEditorActionMocks();

    let resolveSave: ((value: { ok: boolean }) => void) | undefined;
    const saveProviderResult = new Promise<{ ok: boolean }>((resolve) => {
      resolveSave = resolve;
    });
    const invoke = vi.fn(async (method: string) => {
      if (method !== 'save') {
        return { ok: false, error: new Error('unexpected method') };
      }
      await saveProviderResult;
      return { ok: true };
    });
    vi.spyOn(wordEditorActionProvider, 'createWordEditorActionProvider').mockReturnValue({
        kind: 'host',
        listMethods() {
          return ['save'];
        },
        invoke,
      } as any);

    renderWordEditor();

    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    expect(invoke).toHaveBeenCalledTimes(1);
    resolveSave?.({ ok: true });
    await waitFor(() => {
      expect(screen.getByTestId('word-editor-save-status').textContent).toBe('已保存');
    });
  });

  it('invokes onBack directly without local confirm handling', async () => {
    resetWordEditorActionMocks();
    const notify = vi.fn();
    if (!window.confirm) window.confirm = vi.fn(() => true);
    const confirmSpy = vi.spyOn(window, 'confirm');

    renderWordEditor({
      schema: {
        type: 'word-editor-page',
        onBack: { action: 'showToast', args: { message: 'back event fired' } },
      },
      env: createEnv(notify),
    });

    fireEvent.click(screen.getByRole('button', { name: '返回' }));

    await waitFor(() => {
      expect(notify).toHaveBeenCalledWith('info', 'back event fired');
    });
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('forwards the click event through the public onBack renderer event entry', async () => {
    resetWordEditorActionMocks();
    const notify = vi.fn();

    renderWordEditor({
      schema: {
        type: 'word-editor-page',
        onBack: { action: 'showToast', args: { message: 'public back event fired' } },
      },
      env: createEnv(notify),
    });

    fireEvent.click(screen.getByRole('button', { name: '返回' }));

    await waitFor(() => {
      expect(notify).toHaveBeenCalledWith('info', 'public back event fired');
    });
  });

  it('does not publish save message updates after unmount', async () => {
    resetWordEditorActionMocks();
    vi.useFakeTimers();

    let resolveSave: ((value: { ok: boolean }) => void) | undefined;
    const saveProviderResult = new Promise<{ ok: boolean }>((resolve) => {
      resolveSave = resolve;
    });
    const invoke = vi.fn(async (method: string) => {
      if (method !== 'save') {
        return { ok: false, error: new Error('unexpected method') };
      }

      await saveProviderResult;
      return { ok: true };
    });
    const providerSpy = vi
      .spyOn(wordEditorActionProvider, 'createWordEditorActionProvider')
      .mockReturnValue({
        kind: 'host',
        listMethods() {
          return ['save'];
        },
        invoke,
      } as any);

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      renderWordEditor();

      fireEvent.click(screen.getByRole('button', { name: '保存' }));
      expect(invoke).toHaveBeenCalledTimes(1);

      cleanup();
      resolveSave?.({ ok: true });
      await Promise.resolve();
      await vi.runAllTimersAsync();

      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
      providerSpy.mockRestore();
    }
  });

  it('notifies when save resolves ok:false', async () => {
    resetWordEditorActionMocks();

    const notify = vi.fn();
    const invoke = vi.fn(async () => ({ ok: false, error: new Error('Save rejected') }));
    vi.spyOn(wordEditorActionProvider, 'createWordEditorActionProvider')
      .mockReturnValue({
        kind: 'host',
        listMethods() {
          return ['save'];
        },
        invoke,
      } as any);

    renderWordEditor({ env: createEnv(notify) });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(notify).toHaveBeenCalledWith('warning', 'Save rejected');
    });
  });

  it('notifies when save throws', async () => {
    resetWordEditorActionMocks();

    const notify = vi.fn();
    const invoke = vi.fn(async () => {
      throw new Error('Save crashed');
    });
    vi.spyOn(wordEditorActionProvider, 'createWordEditorActionProvider')
      .mockReturnValue({
        kind: 'host',
        listMethods() {
          return ['save'];
        },
        invoke,
      } as any);

    renderWordEditor({ env: createEnv(notify) });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(notify).toHaveBeenCalledWith('warning', 'Save crashed');
    });
  });

  it('does not notify when save aborts with AbortError', async () => {
    resetWordEditorActionMocks();

    const notify = vi.fn();
    const invoke = vi.fn(async () => {
      throw new DOMException('aborted', 'AbortError');
    });
    vi.spyOn(wordEditorActionProvider, 'createWordEditorActionProvider')
      .mockReturnValue({
        kind: 'host',
        listMethods() {
          return ['save'];
        },
        invoke,
      } as any);

    renderWordEditor({ env: createEnv(notify) });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledTimes(1);
    });
    expect(notify).not.toHaveBeenCalled();
  });

  it('publishes busy status while a save is in flight', async () => {
    resetWordEditorActionMocks();

    let resolveSave: ((value: ActionResult) => void) | undefined;
    const statusCalls: Array<{ busy: boolean; dirty: boolean }> = [];
    vi.spyOn(FluxReact, 'useStatusPathPublication')
      .mockImplementation((_scope, _statusPath, summary: any) => {
        statusCalls.push({ busy: Boolean(summary?.busy), dirty: Boolean(summary?.dirty) });
      });
    const invoke = vi.fn(
      () =>
        new Promise<ActionResult>((resolve) => {
          resolveSave = resolve;
        }),
    );
    vi.spyOn(wordEditorActionProvider, 'createWordEditorActionProvider').mockReturnValue({
      kind: 'host',
      listMethods() {
        return ['save'];
      },
      invoke,
    } as any);

    renderWordEditor({
      schema: {
        type: 'word-editor-page',
        statusPath: 'wordEditorStatus',
      },
    });

    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(statusCalls.some((call) => call.busy)).toBe(true);
    });

    resolveSave?.({ ok: true });

    await waitFor(() => {
      expect(statusCalls.at(-1)).toEqual({ busy: false, dirty: false });
    });
  });

});
