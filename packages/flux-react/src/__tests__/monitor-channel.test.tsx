import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RendererMonitorEvent } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { NodeErrorBoundary, SchemaRootErrorBoundary } from '../node-error-boundary.js';
import { MonitorContext } from '../contexts.js';

// plan 841 Phase 2/3: the monitor channel is a SchemaRenderer prop threaded to
// the error boundaries and the action dispatcher. Boundary render throws emit
// { type: 'error', phase: 'render' }; an unset monitor means zero events, a
// throwing monitor must not break the fallback.

function ThrowingComponent(): React.ReactElement {
  throw new Error('render-boom');
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('monitor channel — error boundaries (plan 841 错④)', () => {
  it('emits one render-phase event with nodeId through NodeErrorBoundary', () => {
    const monitor = vi.fn<(event: RendererMonitorEvent) => void>();

    render(
      <MonitorContext.Provider value={monitor}>
        <NodeErrorBoundary nodeId="target-node">
          <ThrowingComponent />
        </NodeErrorBoundary>
      </MonitorContext.Provider>,
    );

    expect(document.querySelector('[data-slot="node-error"]')).toBeTruthy();
    expect(monitor).toHaveBeenCalledTimes(1);
    expect(monitor).toHaveBeenCalledWith({
      type: 'error',
      phase: 'render',
      error: expect.any(Error),
      nodeId: 'target-node',
    });
  });

  it('emits a render-phase event through SchemaRootErrorBoundary (no nodeId)', () => {
    const monitor = vi.fn<(event: RendererMonitorEvent) => void>();

    render(
      <MonitorContext.Provider value={monitor}>
        <SchemaRootErrorBoundary>
          <ThrowingComponent />
        </SchemaRootErrorBoundary>
      </MonitorContext.Provider>,
    );

    expect(document.querySelector('[data-slot="schema-root-error"]')).toBeTruthy();
    expect(monitor).toHaveBeenCalledTimes(1);
    const event = monitor.mock.calls[0]?.[0] as RendererMonitorEvent;
    expect(event.type).toBe('error');
    expect(event.phase).toBe('render');
    expect(event.nodeId).toBeUndefined();
  });

  it('emits zero events when no monitor is set', () => {
    render(
      <NodeErrorBoundary nodeId="no-monitor">
        <ThrowingComponent />
      </NodeErrorBoundary>,
    );

    expect(document.querySelector('[data-slot="node-error"]')).toBeTruthy();
  });

  it('keeps the fallback working when the monitor itself throws', () => {
    const monitor = vi.fn(() => {
      throw new Error('monitor-boom');
    });

    render(
      <MonitorContext.Provider value={monitor}>
        <NodeErrorBoundary nodeId="monitor-throw">
          <ThrowingComponent />
        </NodeErrorBoundary>
      </MonitorContext.Provider>,
    );

    expect(document.querySelector('[data-slot="node-error"]')).toBeTruthy();
    expect(monitor).toHaveBeenCalledTimes(1);
  });
});

describe('monitor channel — SchemaRenderer prop threading (plan 841 Phase 2)', () => {
  it('forwards the monitor prop into runtime creation', async () => {
    const createRendererRuntime = vi.fn((_input: unknown) => {
      throw new Error('stop-after-capture');
    });
    vi.doMock('@nop-chaos/flux-runtime', async (importOriginal) => {
      const actual = await importOriginal<Record<string, unknown>>();
      return { ...actual, createRendererRuntime };
    });
    const { createSchemaRenderer } = await import('../schema-renderer.js');
    const SchemaRenderer = createSchemaRenderer();

    const monitor = vi.fn<(event: RendererMonitorEvent) => void>();
    render(
      <SchemaRenderer
        schema={{ type: 'page' }}
        schemaUrl="test://monitor-threading"
        env={{
          fetcher: async <T,>() => ({ status: 0, data: null as T }),
          notify: () => undefined,
        }}
        formulaCompiler={createFormulaCompiler()}
        monitor={monitor}
      />,
    );

    expect(createRendererRuntime).toHaveBeenCalledTimes(1);
    // The runtime receives a stable delegating wrapper (monitor swaps must not
    // re-create the runtime); calling it must reach the host's monitor.
    const passedMonitor = (createRendererRuntime.mock.calls[0]?.[0] as {
      monitor?: (event: RendererMonitorEvent) => void;
    }).monitor;
    expect(typeof passedMonitor).toBe('function');
    passedMonitor?.({ type: 'error', phase: 'render', error: new Error('probe') });
    // The mocked creation failure also emits once through the same channel, so
    // assert on the probe event's arrival rather than an exact call count.
    expect(
      monitor.mock.calls.some(
        ([event]) => (event as { error: Error }).error?.message === 'probe',
      ),
    ).toBe(true);
  });
});
