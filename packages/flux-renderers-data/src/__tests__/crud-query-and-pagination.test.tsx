import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ActionContext } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import { buttonRenderer, createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

describe('CRUD query and pagination', () => {
  it('updates $crud query and visible rows after search and reset actions', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-query-flow"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'query-crud',
              source: [
                { id: '1', name: 'Alice', status: 'active' },
                { id: '2', name: 'Bob', status: 'draft' },
              ],
              queryForm: {
                body: [{ type: 'input-text', name: 'keyword', label: 'Keyword' }],
              },
              columns: [{ name: 'name', label: 'Name' }],
              footerToolbar: [{ type: 'text', text: 'Query: ${$crud.query.keyword || "none"}' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.getByText('Query: none')).toBeTruthy();
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();

    const input = screen.getByLabelText('Keyword') as HTMLInputElement | null;
    expect(input).toBeTruthy();
    fireEvent.change(input!, { target: { value: 'Ali' } });

    const queryControls = document.querySelector('[data-slot="crud-query-controls"]');
    expect(queryControls).toBeTruthy();
    fireEvent.click(
      within(queryControls as HTMLElement).getByRole('button', { name: t('flux.common.search') }),
    );
    await waitFor(() => {
      expect(screen.getByText('Query: Ali')).toBeTruthy();
      expect(screen.getByText('Alice')).toBeTruthy();
      expect(screen.queryByText('Bob')).toBeNull();
    });

    fireEvent.click(
      within(queryControls as HTMLElement).getByRole('button', { name: t('flux.common.reset') }),
    );
    await waitFor(() => {
      expect(screen.getByText('Query: none')).toBeTruthy();
      expect(screen.getByText('Bob')).toBeTruthy();
    });
  });

  it('keeps the active CRUD query when query-form validation blocks submit', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-query-validation"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'query-validation-crud',
              source: [
                { id: '1', name: 'Alice', status: 'active' },
                { id: '2', name: 'Bob', status: 'draft' },
              ],
              queryForm: {
                body: [{ type: 'input-text', name: 'keyword', label: 'Keyword', required: true }],
              },
              columns: [{ name: 'name', label: 'Name' }],
              footerToolbar: [{ type: 'text', text: 'Query: ${$crud.query.keyword || "none"}' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const input = screen.getByLabelText('Keyword') as HTMLInputElement;
    const queryControls = document.querySelector('[data-slot="crud-query-controls"]');
    expect(queryControls).toBeTruthy();

    fireEvent.change(input, { target: { value: 'Ali' } });
    fireEvent.click(
      within(queryControls as HTMLElement).getByRole('button', { name: t('flux.common.search') }),
    );

    await waitFor(() => {
      expect(screen.getByText('Query: Ali')).toBeTruthy();
      expect(screen.getByText('Alice')).toBeTruthy();
      expect(screen.queryByText('Bob')).toBeNull();
    });

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(
      within(queryControls as HTMLElement).getByRole('button', { name: t('flux.common.search') }),
    );

    await waitFor(() => {
      expect(screen.getByText('Query: Ali')).toBeTruthy();
      expect(screen.getByText('Alice')).toBeTruthy();
      expect(screen.queryByText('Bob')).toBeNull();
    });
  });

  it('uses query submit and reset values as the next refresh input', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    const observedRefreshPayloads: Array<Record<string, unknown>> = [];

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-query-refresh-params"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'refresh-params-crud',
              source: [
                { id: '1', name: 'Alice' },
                { id: '2', name: 'Bob' },
              ],
              pageField: 'pageNo',
              pageSizeField: 'limit',
              queryForm: {
                body: [{ type: 'input-text', name: 'keyword', label: 'Keyword' }],
              },
              toolbar: [
                {
                  type: 'button',
                  label: 'Refresh now',
                  onClick: {
                    action: 'component:refresh',
                    componentId: 'refresh-params-crud',
                  },
                },
              ],
              onRefresh: {
                action: 'probe:recordRefresh',
                args: {
                  query: '${$crud.query}',
                  pageNo: '${$crud.pagination.currentPage}',
                  limit: '${$crud.pagination.pageSize}',
                },
              },
              footerToolbar: [
                { type: 'text', text: 'Active query: ${$crud.query.keyword || "none"}' },
              ],
              columns: [{ name: 'name', label: 'Name' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={(actionScope) => {
          if (!actionScope) {
            return;
          }

          actionScope.registerNamespace('probe', {
            kind: 'host',
            invoke(
              method: string,
              payload: Record<string, unknown> | undefined,
              _ctx: ActionContext,
            ) {
              if (method === 'recordRefresh') {
                const query = (payload?.query ?? {}) as Record<string, unknown>;
                const pageNo = payload?.pageNo;
                const limit = payload?.limit;
                const params: Record<string, unknown> = { ...query, pageNo, limit };
                observedRefreshPayloads.push({ query, params });
                return { ok: true, data: payload };
              }

              return { ok: false, error: new Error(`Unsupported method: ${method}`) };
            },
          });
        }}
      />,
    );

    const input = screen.getByLabelText('Keyword') as HTMLInputElement;
    const queryControls = document.querySelector('[data-slot="crud-query-controls"]');
    expect(queryControls).toBeTruthy();

    fireEvent.change(input, { target: { value: 'Ali' } });
    fireEvent.click(
      within(queryControls as HTMLElement).getByRole('button', { name: t('flux.common.search') }),
    );

    await waitFor(() => expect(screen.getByText('Active query: Ali')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Refresh now' }));

    await waitFor(() => {
      expect(observedRefreshPayloads).toHaveLength(1);
      expect(observedRefreshPayloads[0]).toEqual({
        query: { keyword: 'Ali' },
        params: { keyword: 'Ali', pageNo: 1, limit: 10 },
      });
    });

    fireEvent.click(
      within(queryControls as HTMLElement).getByRole('button', { name: t('flux.common.reset') }),
    );

    await waitFor(() => expect(screen.getByText('Active query: none')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Refresh now' }));

    await waitFor(() => {
      expect(observedRefreshPayloads).toHaveLength(2);
      expect(observedRefreshPayloads[1]).toEqual({
        query: {},
        params: { pageNo: 1, limit: 10 },
      });
    });
  });

  it('notifies when query submit capability rejects', async () => {
    cleanup();
    const notify = vi.fn();
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-query-submit-reject"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'query-submit-reject-crud',
              source: [{ id: '1', name: 'Alice' }],
              queryForm: {
                body: [{ type: 'input-text', name: 'keyword', label: 'Keyword' }],
              },
              columns: [{ name: 'name', label: 'Name' }],
            },
          ],
        }}
        env={{ ...env, notify }}
        formulaCompiler={formulaCompiler}
        onComponentRegistryChange={(registry) => {
          if (!registry) {
            return;
          }

          const queryHandle = registry.resolve({ componentId: 'query-submit-reject-crud-query-form' });
          if (!queryHandle?.capabilities) {
            return;
          }

          vi.spyOn(queryHandle.capabilities, 'invoke').mockImplementation((method) => {
            if (method === 'validate') {
              return Promise.resolve({ ok: true }) as never;
            }
            if (method === 'getValues') {
              return Promise.reject(new Error('Query submit failed')) as never;
            }
            return Promise.resolve({ ok: true }) as never;
          });
        }}
      />,
    );

    const queryControls = document.querySelector('[data-slot="crud-query-controls"]');
    expect(queryControls).toBeTruthy();

    fireEvent.click(
      within(queryControls as HTMLElement).getByRole('button', { name: t('flux.common.search') }),
    );

    await waitFor(() => {
      expect(notify).toHaveBeenCalledWith('warning', 'Query submit failed');
    });
  });

  it('publishes pagination, sort, and filter summary through $crud', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-summary-publication"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              source: [{ id: '1', name: 'Alice', status: 'active' }],
              paginationOwnership: 'scope',
              paginationStatePath: 'crudState.pagination',
              sortOwnership: 'scope',
              sortStatePath: 'crudState.sort',
              filterOwnership: 'scope',
              filterStatePath: 'crudState.filters',
              footerToolbar: [
                {
                  type: 'text',
                  text: 'Summary: page=${$crud.pagination.currentPage}/${$crud.pagination.pageSize}; sort=${$crud.sort.column || "none"}:${$crud.sort.direction || "none"}; filter=${$crud.filters.status || "none"}',
                },
              ],
              columns: [{ name: 'name', label: 'Name' }],
            },
          ],
        }}
        data={{
          crudState: {
            pagination: { currentPage: 3, pageSize: 20 },
            sort: { field: 'name', order: 'asc' },
            filters: { status: 'active' },
          },
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Summary: page=3/20; sort=name:asc; filter=active')).toBeTruthy();
    });
  });

  it('updates $crud.sort using the canonical table sort shape after header clicks', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-sort-shape"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              source: [
                { id: '1', name: 'Bob' },
                { id: '2', name: 'Alice' },
              ],
              sortOwnership: 'scope',
              sortStatePath: 'crudState.sort',
              footerToolbar: [
                {
                  type: 'text',
                  text: 'Sort=${$crud.sort.column || "none"}:${$crud.sort.direction || "none"}',
                },
              ],
              columns: [{ name: 'name', label: 'Name', sortable: true }],
            },
          ],
        }}
        data={{ crudState: { sort: {} } }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.getByText('Sort=none:none')).toBeTruthy();
    fireEvent.click(screen.getByText('Name'));

    await waitFor(() => {
      expect(screen.getByText('Sort=name:asc')).toBeTruthy();
    });
  });
});
