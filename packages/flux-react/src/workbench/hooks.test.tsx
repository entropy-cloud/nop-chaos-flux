// @vitest-environment jsdom
import React, { useLayoutEffect } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { ScopeRef } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRegistry, createRendererRuntime } from '@nop-chaos/flux-runtime';
import { RuntimeContext, ScopeContext } from '../contexts';
import { useHostScope } from './hooks';

const env = {
  fetcher: async <T,>() => ({ ok: true, status: 200, data: null as T }),
  notify: () => undefined,
};

afterEach(() => {
  capturedScope = undefined;
  cleanup();
});

function ScopeCapture(props: { scope: ScopeRef; onCapture: (scope: ScopeRef) => void }) {
  useLayoutEffect(() => {
    props.onCapture(props.scope);
  }, [props]);

  return null;
}

function HostScopeProbe(props: { scopeData: Record<string, unknown>; onCapture: (scope: ScopeRef) => void }) {
  const scope = useHostScope(props.scopeData, '$.body[0]', 'host');
  return <ScopeCapture scope={scope} onCapture={props.onCapture} />;
}

let capturedScope: ScopeRef | undefined;

function renderProbe(scopeData: Record<string, unknown>) {
  const runtime = createRendererRuntime({
    registry: createRendererRegistry([]),
    env,
    expressionCompiler: createExpressionCompiler(createFormulaCompiler())
  });
  const page = runtime.createPageRuntime({ pageValue: 'root' });

  const view = render(
      <RuntimeContext.Provider value={runtime}>
        <ScopeContext.Provider value={page.scope}>
          <HostScopeProbe scopeData={scopeData} onCapture={(scope) => { capturedScope = scope; }} />
        </ScopeContext.Provider>
      </RuntimeContext.Provider>
  );

  return {
    ...view,
    runtime,
    page
  };
}

describe('useHostScope', () => {
  it('replaces host snapshots instead of merging stale keys', () => {
    const view = renderProbe({
      host: { status: 'ready' },
      stale: 'remove-me'
    });

    expect(capturedScope?.readOwn()).toEqual({
      host: { status: 'ready' },
      stale: 'remove-me'
    });

    view.rerender(
      <RuntimeContext.Provider value={view.runtime}>
        <ScopeContext.Provider value={view.page.scope}>
          <HostScopeProbe scopeData={{ host: { status: 'updated' } }} onCapture={(scope) => { capturedScope = scope; }} />
        </ScopeContext.Provider>
      </RuntimeContext.Provider>
    );

    expect(capturedScope?.readOwn()).toEqual({
      host: { status: 'updated' }
    });
    expect(JSON.stringify(capturedScope?.read())).not.toContain('remove-me');
  });

  it('rejects writes to projected host fields', () => {
    renderProbe({
      host: { status: 'ready' }
    });

    expect(() => capturedScope?.update('host.status', 'mutated')).toThrow('Cannot write projected host field: host.status');
  });

  it('allows writes to non-projected local fields within the host boundary', () => {
    renderProbe({
      host: { status: 'ready' }
    });

    capturedScope?.update('local.note', 'ok');

    expect(capturedScope?.read()).toMatchObject({
      pageValue: 'root',
      host: { status: 'ready' },
      local: { note: 'ok' }
    });
  });
});
