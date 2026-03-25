import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const rendererSnapshots: Array<{ env: unknown; data: Record<string, unknown> | undefined }> = [];

vi.mock('@nop-chaos/flux-formula', () => ({
  createFormulaCompiler: () => ({})
}));

vi.mock('@nop-chaos/flux-renderers-basic', () => ({
  registerBasicRenderers: () => undefined
}));

vi.mock('@nop-chaos/flux-renderers-form', () => ({
  registerFormRenderers: () => undefined
}));

vi.mock('@nop-chaos/flux-renderers-data', () => ({
  registerDataRenderers: () => undefined
}));

vi.mock('@nop-chaos/flux-react', () => ({
  createDefaultRegistry: () => ({ register: () => undefined }),
  createSchemaRenderer: () => {
    return function MockSchemaRenderer(props: { env: any; data?: Record<string, unknown> }) {
      rendererSnapshots.push({ env: props.env, data: props.data });

      return (
        <div>
          <output data-testid="user-count">{String(((props.data?.users as unknown[]) ?? []).length)}</output>
          <output data-testid="search-count">{String(((props.data?.searchResults as unknown[]) ?? []).length)}</output>
          <button
            type="button"
            onClick={() =>
              void props.env.fetcher(
                {
                  method: 'post',
                  url: '/api/search',
                  data: { query: 'bob' }
                },
                {
                  env: props.env,
                  scope: {
                    readOwn: () => ({})
                  }
                }
              )
            }
          >
            Trigger search
          </button>
          <button
            type="button"
            onClick={() =>
              void props.env.fetcher(
                {
                  method: 'post',
                  url: '/api/users'
                },
                {
                  env: props.env,
                  scope: {
                    readOwn: () => ({
                      username: 'zoe',
                      email: 'zoe@example.com',
                      role: 'viewer'
                    })
                  }
                }
              )
            }
          >
            Trigger create user
          </button>
        </div>
      );
    };
  }
}));

vi.mock('@nop-chaos/nop-debugger', () => ({
  NopDebuggerPanel: () => null,
  createNopDebugger: () => ({
    id: 'test',
    getSnapshot: () => ({ enabled: true, panelOpen: false, paused: false, events: [], filters: [], activeTab: 'timeline', position: { x: 24, y: 24 } }),
    subscribe: () => () => undefined,
    decorateEnv: (env: unknown) => env,
    plugin: {},
    onActionError: () => undefined
  })
}));

vi.mock('@nop-chaos/flow-designer-renderers', () => ({
  registerFlowDesignerRenderers: () => undefined
}));

import { AmisBasicPage } from './pages/AmisBasicPage';

describe('AmisBasicPage', () => {
  beforeEach(() => {
    rendererSnapshots.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps env stable across search and directory updates', async () => {
    const mockDebuggerController = {
      id: 'test',
      getSnapshot: () => ({ enabled: true, panelOpen: false, paused: false, events: [], filters: [], activeTab: 'timeline' as const, position: { x: 24, y: 24 } }),
      subscribe: () => () => undefined,
      decorateEnv: (env: unknown) => env,
      plugin: {},
      onActionError: () => undefined
    };

    render(<AmisBasicPage debuggerController={mockDebuggerController as any} onBack={() => undefined} />);

    const initialSnapshot = rendererSnapshots.at(-1);
    expect(initialSnapshot).toBeTruthy();

    fireEvent.click(screen.getByText('Trigger search'));

    await waitFor(() => {
      expect(screen.getByTestId('search-count').textContent).toBe('1');
    }, { timeout: 3000 });

    expect(rendererSnapshots.at(-1)?.env).toBe(initialSnapshot?.env);

    fireEvent.click(screen.getByText('Trigger create user'));

    await waitFor(() => {
      expect(screen.getByTestId('user-count').textContent).toBe('4');
    }, { timeout: 3000 });

    expect(rendererSnapshots.at(-1)?.env).toBe(initialSnapshot?.env);
  }, 10000);
});

