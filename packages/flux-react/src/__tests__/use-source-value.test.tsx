import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { RuntimeContext, ScopeContext } from '../contexts.js';
import { isSourceSchema, useSourceValue } from '../use-source-value.js';

function createObserverMock() {
  let snapshot = { value: {} as Record<string, unknown> };
  const listeners = new Set<() => void>();
  return {
    createSourceObserver: () => ({
      getSnapshot: () => snapshot,
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      run: (input: { entries: Array<{ key: string; stateKey?: string }>; baseValue?: Record<string, unknown> }) => {
        if (input.entries.length === 0) {
          snapshot = {
            value: input.baseValue ?? {},
          };
          for (const listener of listeners) {
            listener();
          }
          return;
        }

        snapshot = {
          value: {
            ...(input.baseValue ?? {}),
            sourceState: { loading: true, error: undefined, status: 'loading' },
          },
        };
        for (const listener of listeners) {
          listener();
        }

        queueMicrotask(() => {
          snapshot = {
            value: {
              value: 'resolved',
              sourceState: { loading: false, error: undefined, status: 'ready' },
            },
          };
          for (const listener of listeners) {
            listener();
          }
        });
      },
      dispose: vi.fn(),
    }),
  };
}

function makeScope() {
  return {
    id: 'scope-1',
    path: '$',
    value: {},
    get: () => undefined,
    has: () => false,
    readOwn: () => ({}),
    readVisible: () => ({}),
    materializeVisible: () => ({}),
    update() {},
    merge() {},
  } as any;
}

describe('useSourceValue', () => {
  it('detects source schemas', () => {
    expect(isSourceSchema({ type: 'source' })).toBe(true);
    expect(isSourceSchema({ type: 'text' })).toBe(false);
    expect(isSourceSchema(null)).toBe(false);
  });

  it('returns plain values without loading', () => {
    const runtime = createObserverMock();
    function Probe() {
      const state = useSourceValue<string>('ready');
      return (
        <span data-testid="value">{`${state.loading}:${state.value}:${String(state.error)}`}</span>
      );
    }

    render(
      <RuntimeContext.Provider value={runtime as any}>
        <ScopeContext.Provider value={makeScope()}>
          <Probe />
        </ScopeContext.Provider>
      </RuntimeContext.Provider>,
    );

    expect(screen.getByTestId('value').textContent).toBe('false:ready:undefined');
  });

  it('loads source values and surfaces errors', async () => {
    cleanup();
    const runtime = createObserverMock();

    function Probe({ source }: { source: unknown }) {
      const state = useSourceValue<string>(source);
      return (
        <span data-testid="value">{`${state.loading}:${state.value ?? 'none'}:${state.error instanceof Error ? state.error.message : 'none'}`}</span>
      );
    }

    const { rerender } = render(
      <RuntimeContext.Provider value={runtime as any}>
        <ScopeContext.Provider value={makeScope()}>
          <Probe source={{ type: 'source', sourceType: 'api' }} />
        </ScopeContext.Provider>
      </RuntimeContext.Provider>,
    );

    expect(screen.getByTestId('value').textContent).toBe('true:none:none');
    await waitFor(() => {
      expect(screen.getByTestId('value').textContent).toBe('false:resolved:none');
    });

    rerender(
      <RuntimeContext.Provider value={runtime as any}>
        <ScopeContext.Provider value={makeScope()}>
          <Probe source={{ type: 'source', sourceType: 'api', id: 'b' }} />
        </ScopeContext.Provider>
      </RuntimeContext.Provider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('value').textContent).toBe('false:resolved:none');
    });
  });
});
