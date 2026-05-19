// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
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
import { WordEditorPage } from '../word-editor-page.js';
import { RuntimeContext, ScopeContext } from '../../../flux-react/src/contexts.js';

describe('WordEditorPage actions and events', () => {
  afterEach(() => {
    cleanup();
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
    const providerSpy = vi
      .spyOn(wordEditorActionProvider, 'createWordEditorActionProvider')
      .mockReturnValue({
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

    providerSpy.mockRestore();
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
    const providerSpy = vi
      .spyOn(wordEditorActionProvider, 'createWordEditorActionProvider')
      .mockReturnValue({
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
      expect(screen.getByText('已保存')).toBeTruthy();
    });
    providerSpy.mockRestore();
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
    confirmSpy.mockRestore();
  });

  it('forwards the click event through onBack', async () => {
    resetWordEditorActionMocks();
    const useHostScopeSpy = vi.spyOn(FluxReact, 'useHostScope').mockReturnValue({} as any);
    const useCurrentActionScopeSpy = vi
      .spyOn(FluxReact, 'useCurrentActionScope')
      .mockReturnValue(undefined as any);
    const useNamespaceRegistrationSpy = vi
      .spyOn(FluxReact, 'useNamespaceRegistration')
      .mockImplementation(() => undefined);
    const useRendererEnvSpy = vi
      .spyOn(FluxReact, 'useRendererEnv')
      .mockReturnValue({ notify: vi.fn() } as any);
    const useStatusPathPublicationSpy = vi
      .spyOn(FluxReact, 'useStatusPathPublication')
      .mockImplementation(() => undefined);
    const hasRendererSlotContentSpy = vi
      .spyOn(FluxReact, 'hasRendererSlotContent')
      .mockReturnValue(false);
    const resolveRendererSlotContentSpy = vi
      .spyOn(FluxReact, 'resolveRendererSlotContent')
      .mockReturnValue(undefined);
    const onBack = vi.fn(async () => ({ ok: true }));

    render(
      <RuntimeContext.Provider value={{ env: { notify: vi.fn() } } as any}>
        <ScopeContext.Provider
          value={{
            id: 'word-editor-scope',
            path: '$.body[0]',
            value: {},
            get: () => undefined,
            has: () => false,
            readOwn: () => ({}),
            readVisible: () => ({}),
            materializeVisible: () => ({}),
            update: () => undefined,
            merge: () => undefined,
          } as any}
        >
          <WordEditorPage
            id="word-editor"
            path="$.body[0]"
            schema={{ type: 'word-editor-page' } as any}
            templateNode={{ validationOwnerPlan: undefined } as any}
            node={{ scope: { parent: null } } as any}
            props={{} as any}
            meta={{} as any}
            regions={{} as any}
            events={{ onBack }}
            helpers={{
              render: vi.fn(),
              evaluate: vi.fn(),
              createScope: vi.fn(),
              dispatch: vi.fn(),
              executeSource: vi.fn(),
            } as any}
          />
        </ScopeContext.Provider>
      </RuntimeContext.Provider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '返回' }));

    expect(onBack).toHaveBeenCalledTimes(1);
    const firstCall = onBack.mock.calls[0] as unknown[] | undefined;
    const forwardedEvent = firstCall?.[0];
    expect(forwardedEvent).toBeTruthy();
    expect((forwardedEvent as MouseEvent).type).toBe('click');

    useHostScopeSpy.mockRestore();
    useCurrentActionScopeSpy.mockRestore();
    useNamespaceRegistrationSpy.mockRestore();
    useRendererEnvSpy.mockRestore();
    useStatusPathPublicationSpy.mockRestore();
    hasRendererSlotContentSpy.mockRestore();
    resolveRendererSlotContentSpy.mockRestore();
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
    const providerSpy = vi
      .spyOn(wordEditorActionProvider, 'createWordEditorActionProvider')
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

    providerSpy.mockRestore();
  });

  it('notifies when save throws', async () => {
    resetWordEditorActionMocks();

    const notify = vi.fn();
    const invoke = vi.fn(async () => {
      throw new Error('Save crashed');
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

    renderWordEditor({ env: createEnv(notify) });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(notify).toHaveBeenCalledWith('warning', 'Save crashed');
    });

    providerSpy.mockRestore();
  });

  it('does not notify when save aborts with AbortError', async () => {
    resetWordEditorActionMocks();

    const notify = vi.fn();
    const invoke = vi.fn(async () => {
      throw new DOMException('aborted', 'AbortError');
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

    renderWordEditor({ env: createEnv(notify) });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledTimes(1);
    });
    expect(notify).not.toHaveBeenCalled();

    providerSpy.mockRestore();
  });

  it('publishes busy status while a save is in flight', async () => {
    resetWordEditorActionMocks();

    let resolveSave: ((value: ActionResult) => void) | undefined;
    const statusCalls: Array<{ busy: boolean; dirty: boolean }> = [];
    const useHostScopeSpy = vi.spyOn(FluxReact, 'useHostScope').mockReturnValue({} as any);
    const useCurrentActionScopeSpy = vi
      .spyOn(FluxReact, 'useCurrentActionScope')
      .mockReturnValue(undefined as any);
    const useNamespaceRegistrationSpy = vi
      .spyOn(FluxReact, 'useNamespaceRegistration')
      .mockImplementation(() => undefined);
    const useRendererEnvSpy = vi
      .spyOn(FluxReact, 'useRendererEnv')
      .mockReturnValue({ notify: vi.fn() } as any);
    const useStatusPathPublicationSpy = vi
      .spyOn(FluxReact, 'useStatusPathPublication')
      .mockImplementation((_scope, _statusPath, summary: any) => {
        statusCalls.push({ busy: Boolean(summary?.busy), dirty: Boolean(summary?.dirty) });
      });
    const hasRendererSlotContentSpy = vi
      .spyOn(FluxReact, 'hasRendererSlotContent')
      .mockReturnValue(false);
    const resolveRendererSlotContentSpy = vi
      .spyOn(FluxReact, 'resolveRendererSlotContent')
      .mockReturnValue(undefined);
    const onSave = vi.fn(
      () =>
        new Promise<ActionResult>((resolve) => {
          resolveSave = resolve;
        }),
    );

    render(
      <RuntimeContext.Provider value={{ env: { notify: vi.fn() } } as any}>
        <ScopeContext.Provider
          value={{
            id: 'word-editor-scope',
            path: '$.body[0]',
            value: {},
            get: () => undefined,
            has: () => false,
            readOwn: () => ({}),
            readVisible: () => ({}),
            materializeVisible: () => ({}),
            update: () => undefined,
            merge: () => undefined,
          } as any}
        >
          <WordEditorPage
            id="word-editor"
            path="$.body[0]"
            schema={{ type: 'word-editor-page' } as any}
            templateNode={{ validationOwnerPlan: undefined } as any}
            node={{ scope: { parent: {} } } as any}
            props={{ statusPath: 'wordEditorStatus' } as any}
            meta={{} as any}
            regions={{} as any}
            events={{ onSave }}
            helpers={{
              render: vi.fn(),
              evaluate: vi.fn(),
              createScope: vi.fn(),
              dispatch: vi.fn(),
              executeSource: vi.fn(),
            } as any}
          />
        </ScopeContext.Provider>
      </RuntimeContext.Provider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(statusCalls.some((call) => call.busy)).toBe(true);
    });

    resolveSave?.({ ok: true });

    await waitFor(() => {
      expect(statusCalls.at(-1)).toEqual({ busy: false, dirty: false });
    });

    useHostScopeSpy.mockRestore();
    useCurrentActionScopeSpy.mockRestore();
    useNamespaceRegistrationSpy.mockRestore();
    useRendererEnvSpy.mockRestore();
    useStatusPathPublicationSpy.mockRestore();
    hasRendererSlotContentSpy.mockRestore();
    resolveRendererSlotContentSpy.mockRestore();
  });

});
