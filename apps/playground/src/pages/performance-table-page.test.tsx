// @vitest-environment happy-dom
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());
import { PerformanceTablePage } from './performance-table-page';

function createMockDebuggerController() {
  return {
    id: 'test-debugger',
    automation: {
      inspectByElement: (element: HTMLElement) => ({
        cid: Number(element.getAttribute('data-cid') || '1'),
        rendererType: 'perf-render-probe',
        path: 'playground://pages/performance-table/table-only?diagnostics=1',
        instancePath: [{ repeatedTemplateId: 'probe', instanceKey: element.getAttribute('data-probe-key') }],
      }),
      queryEvents: () => [],
      getRecentFailures: () => [],
    },
    decorateEnv: (env: unknown) => env as any,
    plugin: {},
    setRuntime: () => undefined,
    setComponentRegistry: () => undefined,
    setActionScope: () => undefined,
    onActionError: () => undefined,
    getComponentTree: () => [{ path: 'playground://pages/performance-table/table-only?diagnostics=1' }],
    getSnapshot: () => ({ events: [] }),
  } as any;
}

describe('PerformanceTablePage', () => {
  it('writes ping actions back to page scope from row actions', async () => {
    render(<PerformanceTablePage onBack={() => undefined} />);

    fireEvent.click(screen.getByRole('button', { name: 'Full Stress' }));

    const pingButton = await screen.findAllByRole('button', { name: 'Ping' });
    fireEvent.click(pingButton[0]);

    await waitFor(() => {
      const text = screen.getByText(/^Last action:/).textContent ?? '';
      expect(text).not.toBe('Last action: none');
      expect(text.startsWith('Last action: ping:')).toBe(true);
    }, { timeout: 30000 });
  }, 35000);

  it('keeps full stress nested loops free of render errors after host mutations', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      render(
        <React.StrictMode>
          <PerformanceTablePage onBack={() => undefined} />
        </React.StrictMode>,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Full Stress' }));

      await waitFor(() => {
        expect(screen.getByText('Scenario B: Nested loop card list')).toBeTruthy();
        expect(screen.getAllByText('Primary: editor-offline').length).toBeGreaterThan(0);
      }, { timeout: 30000 });

      fireEvent.click(screen.getByRole('button', { name: 'Run 20 Host Mutations' }));

      await waitFor(() => {
        expect(screen.getByText('Last Measurement')).toBeTruthy();
      }, { timeout: 90000 });

      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  }, 95000);

  it('installs diagnostics window api and actions only when enabled', async () => {
    const { unmount } = render(
      <PerformanceTablePage
        diagnosticsEnabled
        debuggerController={createMockDebuggerController()}
        onBack={() => undefined}
      />,
    );

    await waitFor(() => {
      expect(window.__NOP_PERF_DIAGNOSTICS__).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Run Single Row Locality Diagnostic' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Run Array Item Locality Diagnostic' })).toBeTruthy();
    }, { timeout: 30000 });

    unmount();

    expect(window.__NOP_PERF_DIAGNOSTICS__).toBeUndefined();
  }, 35000);

  it('records a completed table single-row locality session', async () => {
    render(
      <PerformanceTablePage
        diagnosticsEnabled
        debuggerController={createMockDebuggerController()}
        onBack={() => undefined}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Run Single Row Locality Diagnostic' })).toBeTruthy();
    }, { timeout: 30000 });

    fireEvent.click(screen.getByRole('button', { name: 'Run Single Row Locality Diagnostic' }));

    await waitFor(() => {
      const session = window.__NOP_PERF_DIAGNOSTICS__?.getLatestSession();
      const sessionDebug = JSON.stringify(session, null, 2);
      expect(session?.scenario).toBe('table-single-row-locality');
      expect(session?.status, sessionDebug).toBe('completed');
      expect(session?.changedRowKeys).toEqual(['user-25']);
      expect(session?.targetProbeDelta?.render).toBeGreaterThan(0);
      expect(session?.siblingProbeDelta?.render).toBe(0);
      expect(session?.unchangedRowUnmountDelta).toBe(0);
      expect(session?.debuggerSummary.covered).toBe(true);
    }, { timeout: 30000 });
  }, 35000);

  it('records a completed array item locality session with index-addressed validation path', async () => {
    render(
      <PerformanceTablePage
        diagnosticsEnabled
        debuggerController={createMockDebuggerController()}
        onBack={() => undefined}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Run Array Item Locality Diagnostic' })).toBeTruthy();
    }, { timeout: 30000 });

    fireEvent.click(screen.getByRole('button', { name: 'Run Array Item Locality Diagnostic' }));

    await waitFor(() => {
      const session = window.__NOP_PERF_DIAGNOSTICS__?.getLatestSession();
      const sessionDebug = JSON.stringify(session, null, 2);
      expect(session?.scenario).toBe('array-item-locality');
      expect(session?.status, sessionDebug).toBe('completed');
      expect(session?.changedItemKeys).toEqual(['line-8']);
      expect(session?.targetItemProbeDelta?.render).toBeGreaterThan(0);
      expect(session?.siblingItemProbeDelta?.render).toBe(0);
      expect(session?.unchangedItemUnmountDelta).toBe(0);
      expect(session?.validationPathCheck?.expectedPath).toBe('lineItems.7.qty');
      expect(session?.validationPathCheck?.usedItemKeyPath).toBe(false);
      expect(session?.debuggerSummary.covered).toBe(true);
    }, { timeout: 30000 });
  }, 35000);
});
