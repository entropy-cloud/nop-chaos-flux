import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import { buttonRenderer, createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

describe('CRUD renderer request-owned baseline', () => {
  it('consumes upstream data-source results and refreshes them through crud onRefresh', async () => {
    cleanup();
    let responseCount = 0;
    const fetcherSpy = vi.fn(async () => {
      responseCount += 1;
      return {
        ok: true,
        status: 200,
        data: {
          items: [{ id: String(responseCount), name: `User-${responseCount}` }],
          total: 40 + responseCount,
        },
      };
    });
    const fetcher = fetcherSpy as RendererEnv['fetcher'];

    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-request-owned-source"
        schema={{
          type: 'page',
          body: [
            {
              type: 'data-source',
              id: 'crud-users-source',
              name: 'pagedUsers',
              action: 'ajax',
              args: { url: '/api/crud-users', cacheTTL: 0 },
            },
            {
              type: 'crud',
              id: 'request-owned-crud',
              source: '${pagedUsers}',
              onRefresh: {
                action: 'refreshSource',
                targetId: 'pagedUsers',
              },
              footerToolbar: [{ type: 'text', text: 'Rows: ${$crud.itemCount}/${$crud.total}' }],
              columns: [{ name: 'name', label: 'Name' }],
            },
            {
              type: 'button',
              label: 'Refresh CRUD',
              onClick: {
                action: 'component:refresh',
                componentId: 'request-owned-crud',
              },
            },
          ],
        }}
        env={{ ...env, fetcher }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('User-1')).toBeTruthy();
      expect(screen.getByText('Rows: 1/41')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Refresh CRUD' }));

    await waitFor(() => {
      expect(fetcherSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('User-2')).toBeTruthy();
      expect(screen.getByText('Rows: 1/42')).toBeTruthy();
    });
  });

  it('keeps query submit local when clientMode.loadDataOnce is enabled', async () => {
    cleanup();
    const fetcherSpy = vi.fn(async () => {
      return {
        ok: true,
        status: 200,
        data: {
          items: [
            { id: '1', name: 'Alice' },
            { id: '2', name: 'Bob' },
          ],
          total: 2,
        },
      };
    });
    const fetcher = fetcherSpy as RendererEnv['fetcher'];

    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-load-data-once"
        schema={{
          type: 'page',
          body: [
            {
              type: 'data-source',
              id: 'crud-users-source',
              name: 'pagedUsers',
              action: 'ajax',
              args: { url: '/api/crud-users', cacheTTL: 0 },
            },
            {
              type: 'crud',
              id: 'load-data-once-crud',
              source: '${pagedUsers}',
              clientMode: { loadDataOnce: true },
              queryForm: {
                body: [{ type: 'input-text', name: 'keyword', label: 'Keyword' }],
              },
              onQuerySubmit: {
                action: 'refreshSource',
                targetId: 'pagedUsers',
              },
              columns: [{ name: 'name', label: 'Name' }],
            },
          ],
        }}
        env={{ ...env, fetcher }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeTruthy();
      expect(screen.getByText('Bob')).toBeTruthy();
      expect(fetcherSpy).toHaveBeenCalledTimes(1);
    });

    fireEvent.change(screen.getByLabelText('Keyword'), { target: { value: 'Ali' } });
    fireEvent.click(screen.getByRole('button', { name: t('flux.common.search') }));

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeTruthy();
      expect(screen.queryByText('Bob')).toBeNull();
    });

    expect(fetcherSpy).toHaveBeenCalledTimes(1);
  });

  it('re-enables query fetch when clientMode.fetchOnFilter is true', async () => {
    cleanup();
    let responseCount = 0;
    const fetcherSpy = vi.fn(async () => {
      responseCount += 1;
      return {
        ok: true,
        status: 200,
        data: {
          items: [{ id: String(responseCount), name: `User-${responseCount}` }],
          total: responseCount,
        },
      };
    });
    const fetcher = fetcherSpy as RendererEnv['fetcher'];

    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-load-data-once-fetch-on-filter"
        schema={{
          type: 'page',
          body: [
            {
              type: 'data-source',
              id: 'crud-users-source',
              name: 'pagedUsers',
              action: 'ajax',
              args: { url: '/api/crud-users', cacheTTL: 0 },
            },
            {
              type: 'crud',
              id: 'load-data-once-fetch-crud',
              source: '${pagedUsers}',
              clientMode: { loadDataOnce: true, fetchOnFilter: true },
              queryForm: {
                body: [{ type: 'input-text', name: 'keyword', label: 'Keyword' }],
              },
              onQuerySubmit: {
                action: 'refreshSource',
                targetId: 'pagedUsers',
              },
              footerToolbar: [
                {
                  type: 'text',
                  text: 'Rows: ${$crud.itemCount}/${$crud.total}; Query: ${$crud.query.keyword || "none"}',
                },
              ],
              columns: [{ name: 'name', label: 'Name' }],
            },
          ],
        }}
        env={{ ...env, fetcher }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('User-1')).toBeTruthy();
      expect(fetcherSpy).toHaveBeenCalledTimes(1);
    });

    fireEvent.change(screen.getByLabelText('Keyword'), { target: { value: 'Ali' } });
    fireEvent.click(screen.getByRole('button', { name: t('flux.common.search') }));

    await waitFor(() => {
      expect(fetcherSpy).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Rows: 0/2; Query: Ali')).toBeTruthy();
    });
  });
});
