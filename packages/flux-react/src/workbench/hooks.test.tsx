import React, { useLayoutEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { createRendererRegistry, type ScopeRef } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { isHostProjectionScope, createRendererRuntime } from '@nop-chaos/flux-runtime';
import { RuntimeContext, ScopeContext } from '../contexts.js';
import { useHostScope } from './hooks.js';

const env = {
  fetcher: async <T,>() => ({ status: 0, data: null as T }),
  notify: () => undefined,
};

const testState: { capturedScope: ScopeRef | undefined } = {
  capturedScope: undefined,
};

afterEach(() => {
  testState.capturedScope = undefined;
  cleanup();
});

function ScopeCapture(props: { scope: ScopeRef; onCapture: (scope: ScopeRef) => void }) {
  useLayoutEffect(() => {
    props.onCapture(props.scope);
  }, [props]);

  return null;
}

function HostScopeProbe(props: {
  scopeData: Record<string, unknown>;
  onCapture: (scope: ScopeRef) => void;
}) {
  const scope = useHostScope(props.scopeData, '$.body[0]', 'host');
  return <ScopeCapture scope={scope} onCapture={props.onCapture} />;
}

function renderProbe(scopeData: Record<string, unknown>) {
  const runtime = createRendererRuntime({
    registry: createRendererRegistry([]),
    env,
    expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
  });
  const page = runtime.createPageRuntime({ pageValue: 'root' });

  const view = render(
    <RuntimeContext.Provider value={runtime}>
      <ScopeContext.Provider value={page.scope}>
        <HostScopeProbe
          scopeData={scopeData}
          onCapture={(scope) => {
            testState.capturedScope = scope;
          }}
        />
      </ScopeContext.Provider>
    </RuntimeContext.Provider>,
  );

  return {
    ...view,
    runtime,
    page,
  };
}

describe('useHostScope', () => {
  it('replaces host snapshots instead of merging stale keys', () => {
    const view = renderProbe({
      host: { status: 'ready' },
      stale: 'remove-me',
    });

    expect(testState.capturedScope?.readOwn()).toEqual({
      host: { status: 'ready' },
      stale: 'remove-me',
    });

    view.rerender(
      <RuntimeContext.Provider value={view.runtime}>
        <ScopeContext.Provider value={view.page.scope}>
          <HostScopeProbe
            scopeData={{ host: { status: 'updated' } }}
            onCapture={(scope) => {
              testState.capturedScope = scope;
            }}
          />
        </ScopeContext.Provider>
      </RuntimeContext.Provider>,
    );

    expect(testState.capturedScope?.readOwn()).toEqual({
      host: { status: 'updated' },
    });
    expect(JSON.stringify(testState.capturedScope?.materializeVisible())).not.toContain(
      'remove-me',
    );
  });

  it('rejects writes to projected host fields', () => {
    renderProbe({
      host: { status: 'ready' },
    });

    expect(() => testState.capturedScope?.update('host.status', 'mutated')).toThrow(
      'Cannot write projected host field: host.status',
    );
  });

  it('allows writes to non-projected local fields within the host boundary', () => {
    renderProbe({
      host: { status: 'ready' },
    });

    testState.capturedScope?.update('local.note', 'ok');

    expect(testState.capturedScope?.materializeVisible()).toMatchObject({
      pageValue: 'root',
      host: { status: 'ready' },
      local: { note: 'ok' },
    });
  });

  it('publishes nested changed paths when host projection data changes', () => {
    const view = renderProbe({
      host: {
        selection: { kind: 'node', id: 'n1' },
        status: 'ready',
      },
    });
    const listener = vi.fn<(change: any) => void>();
    testState.capturedScope?.store?.subscribe(listener);
    listener.mockClear();

    view.rerender(
      <RuntimeContext.Provider value={view.runtime}>
        <ScopeContext.Provider value={view.page.scope}>
          <HostScopeProbe
            scopeData={{
              host: {
                selection: { kind: 'edge', id: 'e1' },
                status: 'ready',
              },
            }}
            onCapture={(scope) => {
              testState.capturedScope = scope;
            }}
          />
        </ScopeContext.Provider>
      </RuntimeContext.Provider>,
    );

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'replace',
        paths: ['host.selection.id', 'host.selection.kind'],
      }),
    );
  });

  it('preserves the same host snapshot when projection data is structurally unchanged', () => {
    const view = renderProbe({
      host: {
        selection: {
          selectedNodeIds: ['n1'],
          selectedEdgeIds: [],
        },
      },
    });
    const listener = vi.fn<(change: any) => void>();
    const initialOwn = testState.capturedScope?.readOwn();
    testState.capturedScope?.store?.subscribe(listener);

    view.rerender(
      <RuntimeContext.Provider value={view.runtime}>
        <ScopeContext.Provider value={view.page.scope}>
          <HostScopeProbe
            scopeData={{
              host: {
                selection: {
                  selectedNodeIds: ['n1'],
                  selectedEdgeIds: [],
                },
              },
            }}
            onCapture={(scope) => {
              testState.capturedScope = scope;
            }}
          />
        </ScopeContext.Provider>
      </RuntimeContext.Provider>,
    );

    expect(testState.capturedScope?.readOwn()).toEqual(initialOwn);
  });

  it('recreates the host scope after it was disposed (StrictMode remount guard)', () => {
    const view = renderProbe({
      host: { status: 'ready' },
    });

    const original = testState.capturedScope as ScopeRef & {
      dispose?: () => void;
    };
    expect(original.readOwn()).toEqual({ host: { status: 'ready' } });

    original.dispose?.();
    expect(original.readOwn()).toEqual({});
    const disposedHostScope = isHostProjectionScope(original, {
      path: '$.body[0]',
      scopeLabel: 'host',
    })
      ? original
      : undefined;
    expect(disposedHostScope?.disposed).toBe(true);

    view.rerender(
      <RuntimeContext.Provider value={view.runtime}>
        <ScopeContext.Provider value={view.page.scope}>
          <HostScopeProbe
            scopeData={{ host: { status: 'ready' } }}
            onCapture={(scope) => {
              testState.capturedScope = scope;
            }}
          />
        </ScopeContext.Provider>
      </RuntimeContext.Provider>,
    );

    expect(testState.capturedScope?.readOwn()).toEqual({ host: { status: 'ready' } });
  });
});

describe('useHostScope guard clauses characterization (CX-7 WA-react-004)', () => {
  function probeElement(harness: {
    runtime: ReturnType<typeof createRendererRuntime>;
    page: ReturnType<ReturnType<typeof createRendererRuntime>['createPageRuntime']>;
  }, opts: { scopeData: Record<string, unknown>; parentScope?: ScopeRef }) {
    return (
      <RuntimeContext.Provider value={harness.runtime}>
        <ScopeContext.Provider value={opts.parentScope ?? harness.page.scope}>
          <HostScopeProbe
            scopeData={opts.scopeData}
            onCapture={(scope) => {
              testState.capturedScope = scope;
            }}
          />
        </ScopeContext.Provider>
      </RuntimeContext.Provider>
    );
  }

  function renderGuardProbe(initialData: Record<string, unknown>) {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({ pageValue: 'root' });
    const createSpy = vi.spyOn(runtime, 'createHostProjectionScope');
    const harness = { runtime, page };
    const view = render(probeElement(harness, { scopeData: initialData }));

    return {
      harness,
      view,
      createSpy,
      rerender(opts: { scopeData: Record<string, unknown>; parentScope?: ScopeRef }) {
        view.rerender(probeElement(harness, opts));
      },
    };
  }

  it('keeps the created host scope when origin, liveness, and parent all match (positive clause)', () => {
    const probe = renderGuardProbe({ host: { status: 'ready' } });
    const initial = testState.capturedScope;
    expect(initial).toBeDefined();
    expect(probe.createSpy).toHaveBeenCalledTimes(1);

    probe.rerender({ scopeData: { host: { status: 'ready' } } });

    expect(testState.capturedScope).toBe(initial);
    expect(probe.createSpy).toHaveBeenCalledTimes(1);
    probe.view.unmount();
  });

  it('recreates the host scope when the current one was disposed (disposed clause)', () => {
    const probe = renderGuardProbe({ host: { status: 'ready' } });
    const initial = testState.capturedScope as ScopeRef & { dispose?: () => void };
    initial.dispose?.();

    probe.rerender({ scopeData: { host: { status: 'ready' } } });

    expect(testState.capturedScope).not.toBe(initial);
    expect(probe.createSpy).toHaveBeenCalledTimes(2);
    probe.view.unmount();
  });

  it('recreates the host scope when the parent scope changed (parent clause)', () => {
    const probe = renderGuardProbe({ host: { status: 'ready' } });
    const initial = testState.capturedScope;
    const other = probe.harness.runtime.createPageRuntime({ pageValue: 'other' });

    probe.rerender({ scopeData: { host: { status: 'ready' } }, parentScope: other.scope });

    expect(testState.capturedScope).not.toBe(initial);
    expect(testState.capturedScope?.parent).toBe(other.scope);
    probe.view.unmount();
  });

  it('recreates the host scope when its host identity no longer matches (origin/prefix clause)', () => {
    const probe = renderGuardProbe({ host: { status: 'ready' } });
    const initial = testState.capturedScope as ScopeRef & {
      dispose?: () => void;
      id: string;
      origin?: unknown;
    };
    // Refactor-neutral seam: the pre-contract guard reads the id prefix, the
    // contract guard reads `origin`. Mutate both so this pin survives the swap.
    initial.id = '$.elsewhere:stranger-host:foreign';
    initial.origin = { path: '$.elsewhere', scopeLabel: 'stranger' };

    probe.rerender({ scopeData: { host: { status: 'ready' } } });

    expect(testState.capturedScope).not.toBe(initial);
    expect(probe.createSpy).toHaveBeenCalledTimes(2);
    probe.view.unmount();
  });
});
