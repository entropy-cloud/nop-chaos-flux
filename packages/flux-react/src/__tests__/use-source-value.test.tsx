import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import type { SourceObserverSnapshot } from '@nop-chaos/flux-core';
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

  it('drops stale source settlements after a newer source input wins', async () => {
    cleanup();
    const listeners = new Set<() => void>();
    let snapshot = { value: {} as Record<string, unknown> };
    let runId = 0;
    const settlements = new Map<number, () => void>();

    const runtime = {
      createSourceObserver: () => ({
        getSnapshot: () => snapshot,
        subscribe: (listener: () => void) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        run: (input: {
          entries: Array<{ key: string; stateKey?: string; source?: { id?: string } }>;
          baseValue?: Record<string, unknown>;
        }) => {
          const currentRunId = ++runId;
          const sourceId = input.entries[0]?.source?.id ?? 'plain';
          snapshot = {
            value: {
              ...(input.baseValue ?? {}),
              sourceState: { loading: true, error: undefined, status: 'loading' },
            },
          };
          for (const listener of listeners) {
            listener();
          }

          settlements.set(currentRunId, () => {
            if (currentRunId !== runId) {
              return;
            }

            snapshot = {
              value: {
                value: sourceId,
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

    function Probe({ source }: { source: unknown }) {
      const state = useSourceValue<string>(source);
      return <span data-testid="value">{`${state.loading}:${state.value ?? 'none'}`}</span>;
    }

    const { rerender } = render(
      <RuntimeContext.Provider value={runtime as any}>
        <ScopeContext.Provider value={makeScope()}>
          <Probe source={{ type: 'source', sourceType: 'api', id: 'first' }} />
        </ScopeContext.Provider>
      </RuntimeContext.Provider>,
    );

    await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('true:none'));

    rerender(
      <RuntimeContext.Provider value={runtime as any}>
        <ScopeContext.Provider value={makeScope()}>
          <Probe source={{ type: 'source', sourceType: 'api', id: 'second' }} />
        </ScopeContext.Provider>
      </RuntimeContext.Provider>,
    );

    settlements.get(1)?.();
    expect(screen.getByTestId('value').textContent).toBe('true:none');

    settlements.get(2)?.();
    await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('false:second'));
  });

  it('drops stale settlements across StrictMode remounts and after unmount', async () => {
    cleanup();
    const setStateCalls: string[] = [];
    const observerRecords: Array<{
      listeners: Set<() => void>;
      setResolved: (value: string) => void;
      dispose: ReturnType<typeof vi.fn>;
    }> = [];

    const runtime = {
      createSourceObserver: () => {
        let snapshot: SourceObserverSnapshot = {
          value: {
            sourceState: { loading: true, error: undefined, status: 'loading' as const },
          },
        };
        const listeners = new Set<() => void>();
        const dispose = vi.fn(() => {
          listeners.clear();
        });
        const record = {
          listeners,
          setResolved(value: string) {
            snapshot = {
              value: {
                value,
                sourceState: { loading: false, error: undefined, status: 'ready' as const },
              },
            };
            for (const listener of listeners) {
              listener();
            }
          },
          dispose,
        };
        observerRecords.push(record);

        return {
          getSnapshot: () => snapshot,
          subscribe: (listener: () => void) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
          },
          run: () => undefined,
          dispose,
        };
      },
    };

    function Probe() {
      const state = useSourceValue<string>({ type: 'source', sourceType: 'api', id: 'strict' });

      React.useEffect(() => {
        setStateCalls.push(`${state.loading}:${state.value ?? 'none'}`);
      }, [state.loading, state.value]);

      return <span data-testid="value">{`${state.loading}:${state.value ?? 'none'}`}</span>;
    }

    const rendered = render(
      <React.StrictMode>
        <RuntimeContext.Provider value={runtime as any}>
          <ScopeContext.Provider value={makeScope()}>
            <Probe />
          </ScopeContext.Provider>
        </RuntimeContext.Provider>
      </React.StrictMode>,
    );

    await waitFor(() => expect(observerRecords.length).toBeGreaterThanOrEqual(2));
    expect(screen.getByTestId('value').textContent).toBe('true:none');

    await waitFor(() => {
      expect(observerRecords.filter((record) => record.listeners.size > 0)).toHaveLength(1);
    });

    const liveObserver = observerRecords.find((record) => record.listeners.size > 0);
    const staleObservers = observerRecords.filter((record) => record !== liveObserver);
    expect(liveObserver).toBeTruthy();
    expect(staleObservers.length).toBeGreaterThan(0);

    for (const [index, observer] of staleObservers.entries()) {
      observer.setResolved(`stale-${index}`);
    }
    expect(screen.getByTestId('value').textContent).toBe('true:none');

    liveObserver?.setResolved('active-mount');
    await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('false:active-mount'));

    rendered.unmount();
    const callCountBeforeUnmountSettlement = setStateCalls.length;

    liveObserver?.setResolved('after-unmount');

    expect(setStateCalls).toHaveLength(callCountBeforeUnmountSettlement);
    expect(liveObserver?.dispose.mock.calls.length ?? 0).toBeGreaterThanOrEqual(1);
  });
});
