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
    expect(onPageChange).toHaveBeenLastCalledWith(undefined, {
      event: undefined,
      scope: {
        value: {
          type: 'table:page-change',
          page: 1,
          pageSize: 20,
          pagination: { currentPage: 1, pageSize: 20 },
        },
        options: { scopeKey: 'pagination', pathSuffix: 'pagination' },
      },
      evaluationBindings: {
        type: 'table:page-change',
        page: 1,
        pageSize: 20,
        pagination: { currentPage: 1, pageSize: 20 },
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

  it('clamps local pagination when filtered rows shrink to one page', () => {
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

    act(() => {
      api.handlePageChange(3);
    });
    expect(api.currentPage).toBe(3);

    act(() => {
      api.clampPage(1, 1);
    });

    expect(api.currentPage).toBe(1);
    expect(onPageChange).toHaveBeenLastCalledWith(undefined, {
      event: undefined,
      scope: {
        value: {
          type: 'table:page-change',
          page: 1,
          pageSize: 5,
          pagination: { currentPage: 1, pageSize: 5 },
        },
        options: { scopeKey: 'pagination', pathSuffix: 'pagination' },
      },
      evaluationBindings: {
        type: 'table:page-change',
        page: 1,
        pageSize: 5,
        pagination: { currentPage: 1, pageSize: 5 },
      },
    });
  });

  it('uses explicit scope-owned pagination state without treating empty objects as missing', () => {
    let api: any;
    const helpers = createHelpers();

    mockScopeState.data = { tableState: { pagination: { currentPage: 2, pageSize: 0 } } };

    render(
      <PaginationProbe
        schemaProps={{
          paginationOwnership: 'scope',
          paginationStatePath: 'tableState.pagination',
          pagination: { currentPage: 9, pageSize: 10 },
        }}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    expect(api.currentPage).toBe(2);
    expect(api.pageSize).toBe(10);
  });

  it('preserves the current pageSize when changing page (B3.1 / T3)', () => {
    const helpers = createHelpers();
    let api: any;

    mockScopeState.data = { tableState: { pagination: { currentPage: 1, pageSize: 20 } } };

    render(
      <PaginationProbe
        schemaProps={{
          paginationOwnership: 'scope',
          paginationStatePath: 'tableState.pagination',
          pagination: { currentPage: 1, pageSize: 20 },
        }}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    expect(api.pageSize).toBe(20);

    act(() => {
      api.handlePageChange(2);
    });

    // page change must not collapse pageSize back to the default (10): the scope write-back
    // carries the current pageSize alongside the new page.
    expect(api.pageSize).toBe(20);
    expect(renderScopeUpdate).toHaveBeenCalledWith('tableState.pagination', {
      currentPage: 2,
      pageSize: 20,
    });
  });
});
