import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import {
  createHelpers,
  SortProbe,
  renderScopeUpdate,
  resetTableControlTestState,
  mockScopeState,
} from './use-table-controls.test-support.js';
import { processTableData } from '../table-renderer/table-data.js';

afterEach(cleanup);

describe('useTableSort multi-column (multiSort: true)', () => {
  beforeEach(() => {
    resetTableControlTestState();
  });

  it('accumulates multiple sort entries in click order with badges', () => {
    const helpers = createHelpers();
    const onSortChange = vi.fn();
    let api: any;

    render(
      <SortProbe
        schemaProps={{ multiSort: true }}
        onSortChange={onSortChange}
        columns={[
          { name: 'a', sortable: true },
          { name: 'b', sortable: true },
        ]}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    act(() => {
      api.handleSort('a');
    });
    expect(api.sortEntries).toEqual([{ column: 'a', direction: 'asc' }]);

    act(() => {
      api.handleSort('b');
    });
    expect(api.sortEntries).toEqual([
      { column: 'a', direction: 'asc' },
      { column: 'b', direction: 'asc' },
    ]);

    act(() => {
      api.handleSort('b');
    });
    expect(api.sortEntries).toEqual([
      { column: 'a', direction: 'asc' },
      { column: 'b', direction: 'desc' },
    ]);
  });

  it('removes entry when toggled past desc (asc -> desc -> null)', () => {
    const onSortChange = vi.fn();
    let api: any;

    render(
      <SortProbe
        schemaProps={{ multiSort: true }}
        onSortChange={onSortChange}
        columns={[
          { name: 'a', sortable: true },
          { name: 'b', sortable: true },
        ]}
        helpers={createHelpers()}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    act(() => api.handleSort('a'));
    act(() => api.handleSort('b'));
    act(() => api.handleSort('a'));
    act(() => api.handleSort('a'));

    expect(api.sortEntries).toEqual([{ column: 'b', direction: 'asc' }]);
  });

  it('publishes sort as array payload in multiSort mode', () => {
    const onSortChange = vi.fn();
    let api: any;

    render(
      <SortProbe
        schemaProps={{ multiSort: true }}
        onSortChange={onSortChange}
        columns={[{ name: 'a', sortable: true }, { name: 'b', sortable: true }]}
        helpers={createHelpers()}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    act(() => api.handleSort('a'));
    act(() => api.handleSort('b'));

    const lastCall = onSortChange.mock.calls.at(-1)!;
    const payload = lastCall[1].event;
    expect(payload.type).toBe('table:sort-change');
    expect(payload.sort).toEqual([
      { column: 'a', direction: 'asc' },
      { column: 'b', direction: 'asc' },
    ]);
    expect(payload.sortEntries).toEqual([
      { column: 'a', direction: 'asc' },
      { column: 'b', direction: 'asc' },
    ]);
  });

  it('shift-click accumulates even when multiSort is not enabled', () => {
    const onSortChange = vi.fn();
    let api: any;

    render(
      <SortProbe
        schemaProps={{}}
        onSortChange={onSortChange}
        columns={[{ name: 'a', sortable: true }, { name: 'b', sortable: true }]}
        helpers={createHelpers()}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    act(() => api.handleSort('a'));
    act(() => api.handleSort('b', true));

    expect(api.sortEntries).toEqual([
      { column: 'a', direction: 'asc' },
      { column: 'b', direction: 'asc' },
    ]);
  });

  it('writes array to scope when sortOwnership:scope and multiSort:true (accumulate from initial scope state)', () => {
    mockScopeState.data = {
      tableState: {
        sort: [{ column: 'a', direction: 'asc' }],
      },
    };
    let api: any;

    render(
      <SortProbe
        schemaProps={{ multiSort: true, sortOwnership: 'scope', sortStatePath: 'tableState.sort' }}
        onSortChange={vi.fn()}
        columns={[{ name: 'a', sortable: true }, { name: 'b', sortable: true }]}
        helpers={createHelpers()}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    expect(api.sortEntries).toEqual([{ column: 'a', direction: 'asc' }]);

    act(() => api.handleSort('b'));
    expect(renderScopeUpdate).toHaveBeenLastCalledWith(
      'tableState.sort',
      [
        { column: 'a', direction: 'asc' },
        { column: 'b', direction: 'asc' },
      ],
    );
  });

  it('reads multi-sort state from scope', () => {
    mockScopeState.data = {
      tableState: {
        sort: [
          { column: 'a', direction: 'asc' },
          { column: 'b', direction: 'desc' },
        ],
      },
    };
    let api: any;

    render(
      <SortProbe
        schemaProps={{ multiSort: true, sortOwnership: 'scope', sortStatePath: 'tableState.sort' }}
        onSortChange={vi.fn()}
        columns={[{ name: 'a', sortable: true }, { name: 'b', sortable: true }]}
        helpers={createHelpers()}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    expect(api.sortEntries).toEqual([
      { column: 'a', direction: 'asc' },
      { column: 'b', direction: 'desc' },
    ]);
    expect(api.sortState).toEqual({ column: 'a', direction: 'asc' });
  });

  it('controlled multiSort reads array from sort prop', () => {
    let api: any;

    render(
      <SortProbe
        schemaProps={{
          multiSort: true,
          sortOwnership: 'controlled',
          sort: [
            { column: 'a', direction: 'asc' },
            { column: 'b', direction: 'desc' },
          ],
        }}
        onSortChange={vi.fn()}
        columns={[{ name: 'a', sortable: true }, { name: 'b', sortable: true }]}
        helpers={createHelpers()}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    expect(api.sortEntries).toEqual([
      { column: 'a', direction: 'asc' },
      { column: 'b', direction: 'desc' },
    ]);
  });
});

describe('processTableData multi-column sort', () => {
  it('applies multiple sort entries in priority order', () => {
    const rows = [
      { id: '1', a: 'x', b: 2 },
      { id: '2', a: 'x', b: 1 },
      { id: '3', a: 'y', b: 1 },
      { id: '4', a: 'y', b: 2 },
    ];

    const result = processTableData(rows, 'id', [
      { column: 'a', direction: 'asc' },
      { column: 'b', direction: 'asc' },
    ], {});

    expect(result.map((r) => r.rowKey)).toEqual(['2', '1', '3', '4']);
  });

  it('keeps legacy single-sort shape working', () => {
    const rows = [
      { id: '1', a: 3 },
      { id: '2', a: 1 },
      { id: '3', a: 2 },
    ];

    const result = processTableData(rows, 'id', { column: 'a', direction: 'asc' }, {});
    expect(result.map((r) => r.rowKey)).toEqual(['2', '3', '1']);
  });
});

describe('useTableSort single-column baseline regression', () => {
  beforeEach(() => {
    resetTableControlTestState();
  });

  it('single-sort payload keeps sort as single object (no sortEntries key)', () => {
    const onSortChange = vi.fn();
    let api: any;

    render(
      <SortProbe
        schemaProps={{}}
        onSortChange={onSortChange}
        columns={[{ name: 'name', sortable: true }]}
        helpers={createHelpers()}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    act(() => api.handleSort('name'));

    const lastCall = onSortChange.mock.calls.at(-1)!;
    const payload = lastCall[1].event;
    expect(payload.sort).toEqual({ column: 'name', direction: 'asc' });
    expect(payload.sortEntries).toBeUndefined();
  });
});
