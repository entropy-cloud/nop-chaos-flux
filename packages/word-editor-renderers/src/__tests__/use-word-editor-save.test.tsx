// @vitest-environment happy-dom

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type {
  ActionContext,
  ActionNamespaceProvider,
  ActionScope,
  ComponentHandleRegistry,
  PageRuntime,
  RendererEnv,
  RendererRuntime,
  ScopeRef,
  SurfaceRuntime,
} from '@nop-chaos/flux-core';
import { useWordEditorSave } from '../hooks/use-word-editor-save.js';
import {
  ActionScopeContext,
  ComponentRegistryContext,
  PageContext,
  RuntimeContext,
  ScopeContext,
  SurfaceContext,
} from '../../../flux-react/src/contexts.js';

function SaveProbe(props: {
  actionProvider: ActionNamespaceProvider;
  setSaving?: (saving: boolean) => void;
}) {
  const mountedRef = React.useRef(true);
  const { handleSave, saveMessage } = useWordEditorSave({
    actionProvider: props.actionProvider,
    env: {
      fetcher: vi.fn(),
      notify: vi.fn(),
    } satisfies RendererEnv,
    mountedRef,
    setSaving: props.setSaving,
  });

  return (
    <button type="button" onClick={() => void handleSave()}>
      {saveMessage ?? 'save'}
    </button>
  );
}

describe('useWordEditorSave', () => {
  function createRuntimeContexts() {
    const runtime = { env: {} } as RendererRuntime;
    const scope = {
      id: 'word-editor-scope',
      path: '$wordEditor',
      value: {},
      get: () => undefined,
      has: () => false,
      readOwn: () => ({}),
      readVisible: () => ({}),
      materializeVisible: () => ({}),
      update: () => undefined,
      merge: () => undefined,
    } as ScopeRef;
    const actionScope = { id: 'word-editor-action-scope' } as ActionScope;
    const componentRegistry = { id: 'word-editor-registry' } as ComponentHandleRegistry;
    const page = {
      store: {} as PageRuntime['store'],
      scope,
      refresh: vi.fn(),
    } as unknown as PageRuntime;
    const surfaceRuntime = {
      store: {} as SurfaceRuntime['store'],
      open: vi.fn(),
      upsert: vi.fn(),
      publishStatus: vi.fn(),
      publishClosed: vi.fn(),
      close: vi.fn(),
      closeTop: vi.fn(),
      dispose: vi.fn(),
    } as unknown as SurfaceRuntime;

    return { runtime, scope, actionScope, componentRegistry, page, surfaceRuntime };
  }

  it('passes a real action context to the save provider', async () => {
    const { runtime, scope, actionScope, componentRegistry, page, surfaceRuntime } =
      createRuntimeContexts();
    const invoke = vi.fn(async (_method: string, _payload: undefined, ctx: ActionContext) => ({
      ok: true as const,
      data: ctx,
    }));
    const actionProvider: ActionNamespaceProvider = { invoke };

    render(
      <RuntimeContext.Provider value={runtime}>
        <ScopeContext.Provider value={scope}>
          <ActionScopeContext.Provider value={actionScope}>
            <ComponentRegistryContext.Provider value={componentRegistry}>
              <PageContext.Provider value={page}>
                <SurfaceContext.Provider value={surfaceRuntime}>
                  <SaveProbe actionProvider={actionProvider} />
                </SurfaceContext.Provider>
              </PageContext.Provider>
            </ComponentRegistryContext.Provider>
          </ActionScopeContext.Provider>
        </ScopeContext.Provider>
      </RuntimeContext.Provider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    expect(invoke.mock.calls[0][2]).toMatchObject({
      runtime,
      scope,
      actionScope,
      componentRegistry,
      page,
      surfaceRuntime,
    });
    expect(invoke.mock.calls[0][2].signal).toBeInstanceOf(AbortSignal);
  });

  it('toggles saving state around the async save lifecycle', async () => {
    const { runtime, scope, actionScope, componentRegistry, page, surfaceRuntime } =
      createRuntimeContexts();
    let resolveSave: ((value: { ok: true }) => void) | undefined;
    const setSaving = vi.fn();
    const invoke = vi.fn(
      () =>
        new Promise<{ ok: true }>((resolve) => {
          resolveSave = resolve;
        }),
    );
    const actionProvider: ActionNamespaceProvider = { invoke };

    render(
      <RuntimeContext.Provider value={runtime}>
        <ScopeContext.Provider value={scope}>
          <ActionScopeContext.Provider value={actionScope}>
            <ComponentRegistryContext.Provider value={componentRegistry}>
              <PageContext.Provider value={page}>
                <SurfaceContext.Provider value={surfaceRuntime}>
                  <SaveProbe actionProvider={actionProvider} setSaving={setSaving} />
                </SurfaceContext.Provider>
              </PageContext.Provider>
            </ComponentRegistryContext.Provider>
          </ActionScopeContext.Provider>
        </ScopeContext.Provider>
      </RuntimeContext.Provider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    expect(setSaving).toHaveBeenCalledWith(true);

    resolveSave?.({ ok: true });

    await waitFor(() => {
      expect(setSaving).toHaveBeenLastCalledWith(false);
    });
  });
});
