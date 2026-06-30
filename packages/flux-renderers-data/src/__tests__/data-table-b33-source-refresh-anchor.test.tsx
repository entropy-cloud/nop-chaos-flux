import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { buttonRenderer, createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

// T23 confirmation anchor: upstream `source` bound to a data-source + `refreshSource`
// propagates the refresh to the table rows. Replicates the upstream-refresh contract
// assertion (see data-table-pagination-selection.test.tsx "exposes table refresh")
// as an isolated regression anchor for the B3.3 boundary.

describe('B3.3 T23 — table source bound to data-source refreshes rows via refreshSource', () => {
  it('onRefresh -> refreshSource re-runs the upstream data-source and the table re-renders with new rows', async () => {
    cleanup();
    let responseCount = 0;
    const fetcherSpy = vi.fn(async () => {
      responseCount += 1;
      return { ok: true, status: 200, data: { value: `refreshed-${responseCount}` } };
    });
    const fetcher = (async () => fetcherSpy()) as typeof env.fetcher;
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://data/table-source-refresh-anchor"
        schema={{
          type: 'page',
          body: [
            {
              type: 'data-source',
              id: 'table-source',
              action: 'ajax',
              args: { url: '/api/table-source-refresh', cacheTTL: 0 },
              name: 'tableData',
            },
            {
              type: 'table',
              id: 'refreshable-table',
              source: '${tableData ? [tableData] : []}',
              onRefresh: { action: 'refreshSource', targetId: 'tableData' },
              columns: [{ label: 'Value', name: 'value' }],
            },
            {
              type: 'button',
              label: 'Refresh Table',
              onClick: { action: 'component:refresh', componentId: 'refreshable-table' },
            },
          ],
        }}
        env={{ ...env, fetcher }}
        formulaCompiler={formulaCompiler}
      />,
    );

    // Initial fetch resolves and the first row renders.
    await waitFor(() => expect(fetcherSpy).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('refreshed-1')).toBeTruthy());

    const initialCalls = fetcherSpy.mock.calls.length;
    fireEvent.click(screen.getByText('Refresh Table'));

    // component:refresh -> onRefresh -> refreshSource re-runs the upstream source,
    // and the table row updates to the freshly fetched value.
    await waitFor(() => {
      expect(fetcherSpy.mock.calls.length).toBeGreaterThan(initialCalls);
      expect(screen.getByText(`refreshed-${fetcherSpy.mock.calls.length}`)).toBeTruthy();
    });
  });
});
