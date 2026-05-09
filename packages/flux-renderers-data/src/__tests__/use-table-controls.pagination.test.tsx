import React from 'react';
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createHelpers,
  PaginationProbe,
  renderScopeUpdate,
  resetTableControlTestState,
  mockScopeState,
} from './use-table-controls.test-support.js';

describe('useTablePagination', () => {
  beforeEach(() => {
    resetTableControlTestState();
  });

  it('uses local pagination state and emits page scopes', () => {
    const helpers = createHelpers();
    const onPageChange = vi.fn();
    let api: any;

    render(
      <PaginationProbe
        schemaProps={{ pagination: { enabled: true, pageSize: 5 } }}
        onPageChange={onPageChange}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    expect(api.paginationEnabled).toBe(true);
    expect(api.currentPage).toBe(1);
    expect(api.pageSize).toBe(5);

    act(() => {
      api.handlePageChange(3);
    });
    expect(api.currentPage).toBe(3);

    act(() => {
      api.handlePageSizeChange(20);
    });
    expect(api.currentPage).toBe(1);
    expect(api.pageSize).toBe(20);
    expect(renderScopeUpdate).not.toHaveBeenCalled();
    expect(onPageChange).toHaveBeenLastCalledWith(null, {
      scope: {
        value: { page: 1, pageSize: 20 },
        options: { scopeKey: 'pagination', pathSuffix: 'pagination' },
      },
    });
  });

  it('reads controlled and scope-backed pagination state', () => {
    let api: any;
    const onPageChange = vi.fn();
    const helpers = createHelpers();

    const { rerender } = render(
      <PaginationProbe
        schemaProps={{
          paginationOwnership: 'controlled',
          pagination: { currentPage: 4, pageSize: 25, enabled: false },
        }}
        onPageChange={onPageChange}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    expect(api.paginationEnabled).toBe(false);
    expect(api.currentPage).toBe(4);
    expect(api.pageSize).toBe(25);

    act(() => {
      api.handlePageChange(2);
    });
    expect(renderScopeUpdate).not.toHaveBeenCalled();

    mockScopeState.data = { tableState: { pagination: { currentPage: 7, pageSize: 15 } } };
    rerender(
      <PaginationProbe
        schemaProps={{
          paginationOwnership: 'scope',
          paginationStatePath: 'tableState.pagination',
          pagination: { currentPage: 1, pageSize: 10 },
        }}
        onPageChange={onPageChange}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    expect(api.currentPage).toBe(7);
    expect(api.pageSize).toBe(15);

    act(() => {
      api.handlePageSizeChange(30);
    });
    expect(renderScopeUpdate).toHaveBeenCalledWith('tableState.pagination', {
      currentPage: 1,
      pageSize: 30,
    });
  });
});
