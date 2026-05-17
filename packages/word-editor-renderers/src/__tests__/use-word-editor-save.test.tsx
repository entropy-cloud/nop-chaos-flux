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
}) {
  const mountedRef = React.useRef(true);
  const { handleSave, saveMessage } = useWordEditorSave({
    actionProvider: props.actionProvider,
    env: {
      fetcher: vi.fn(),
      notify: vi.fn(),
    } satisfies RendererEnv,
    mountedRef,
  });

  return (
    <button type="button" onClick={() => void handleSave()}>
      {saveMessage ?? 'save'}
    </button>
  );
}

describe('useWordEditorSave', () => {
  it('passes a real action context to the save provider', async () => {
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
});
