import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ActionContext } from '@nop-chaos/flux-core';
import { Button } from '@nop-chaos/ui';
import type { RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import {
  buttonRenderer,
  createDataSchemaRenderer,
  env,
  formulaCompiler,
} from '../test-support';

function DisabledAwareButtonRenderer(props: RendererComponentProps) {
  return (
    <Button variant="ghost" size="sm" disabled={props.meta.disabled} onClick={() => void props.events.onClick?.()}>
      {String(props.props.label ?? 'Button')}
    </Button>
  );
}

const disabledAwareButtonRenderer: RendererDefinition = {
  type: 'button',
  component: DisabledAwareButtonRenderer,
  fields: [{ key: 'onClick', kind: 'event' }],
};

describe('CRUD renderer', () => {
  it('exposes crud status summary through $crud binding', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/crud"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'status-crud',
              statusPath: 'crudStatus',
              source: [
                { id: '1', name: 'Alice' },
                { id: '2', name: 'Bob' },
              ],
              columns: [{ name: 'name', label: '姓名' }],
              listActions: [
                {
                  type: 'text',
                  text: 'Selection: ${$crud.hasSelection ? "yes" : "no"}',
                },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    expect(screen.getByText('Selection: no')).toBeTruthy();
  });

  it('keeps $crud selection summary aligned with scope-owned table selection', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/crud"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'selection-crud',
              selectionOwnership: 'scope',
              selectionStatePath: 'crudSelection.keys',
              source: [
                { id: '1', name: 'Alice' },
                { id: '2', name: 'Bob' },
              ],
              columns: [{ name: 'name', label: '姓名' }],
              listActions: [
                {
                  type: 'text',
                  text: 'Selected: ${$crud.selectionCount}',
                },
              ],
            },
          ],
        }}
        data={{ crudSelection: { keys: [] } }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    expect(screen.getByText('Selected: 0')).toBeTruthy();
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    fireEvent.click(checkboxes[1] as HTMLInputElement);
    await waitFor(() => expect(screen.getByText('Selected: 1')).toBeTruthy());
  });

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
      />
    );

    expect(screen.getByText('Query: none')).toBeTruthy();
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();

    const input = screen.getByLabelText('Keyword') as HTMLInputElement | null;
    expect(input).toBeTruthy();
    fireEvent.change(input!, { target: { value: 'Ali' } });

    const queryControls = document.querySelector('[data-slot="crud-query-controls"]');
    expect(queryControls).toBeTruthy();
    fireEvent.click(within(queryControls as HTMLElement).getByRole('button', { name: t('flux.common.search') }));
    await waitFor(() => {
      expect(screen.getByText('Query: Ali')).toBeTruthy();
      expect(screen.getByText('Alice')).toBeTruthy();
      expect(screen.queryByText('Bob')).toBeNull();
    });

    fireEvent.click(within(queryControls as HTMLElement).getByRole('button', { name: t('flux.common.reset') }));
    await waitFor(() => {
      expect(screen.getByText('Query: none')).toBeTruthy();
      expect(screen.getByText('Bob')).toBeTruthy();
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
              footerToolbar: [{ type: 'text', text: 'Active query: ${$crud.query.keyword || "none"}' }],
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
            invoke(method: string, payload: Record<string, unknown> | undefined, _ctx: ActionContext) {
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
      />
    );

    const input = screen.getByLabelText('Keyword') as HTMLInputElement;
    const queryControls = document.querySelector('[data-slot="crud-query-controls"]');
    expect(queryControls).toBeTruthy();

    fireEvent.change(input, { target: { value: 'Ali' } });
    fireEvent.click(within(queryControls as HTMLElement).getByRole('button', { name: t('flux.common.search') }));

    await waitFor(() => expect(screen.getByText('Active query: Ali')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Refresh now' }));

    await waitFor(() => {
      expect(observedRefreshPayloads).toHaveLength(1);
      expect(observedRefreshPayloads[0]).toEqual({
        query: { keyword: 'Ali' },
        params: { keyword: 'Ali', pageNo: 1, limit: 10 },
      });
    });

    fireEvent.click(within(queryControls as HTMLElement).getByRole('button', { name: t('flux.common.reset') }));

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

  it('updates selection-driven list action disabled state and clears it on refresh when configured', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([disabledAwareButtonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-selection-list-actions"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'selection-list-action-crud',
              autoClearSelectionOnRefresh: true,
              source: [
                { id: '1', name: 'Alice' },
                { id: '2', name: 'Bob' },
              ],
              toolbar: [
                {
                  type: 'button',
                  label: 'Refresh current list',
                  onClick: {
                    action: 'component:refresh',
                    componentId: 'selection-list-action-crud',
                  },
                },
              ],
              listActions: [
                {
                  type: 'button',
                  label: 'Bulk Delete',
                  disabled: '${!$crud.hasSelection}',
                },
              ],
              footerToolbar: [
                { type: 'text', text: 'Selected rows: ${$crud.selectionCount}' },
              ],
              columns: [{ name: 'name', label: 'Name' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    const bulkDeleteButton = screen.getByRole('button', { name: 'Bulk Delete' });
    expect(bulkDeleteButton.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText('Selected rows: 0')).toBeTruthy();

    const checkboxes = document.querySelectorAll('[data-slot="checkbox"]');
    fireEvent.click(checkboxes[1] as HTMLElement);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Bulk Delete' }).hasAttribute('disabled')).toBe(false);
      expect(screen.getByText('Selected rows: 1')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Refresh current list' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Bulk Delete' }).hasAttribute('disabled')).toBe(true);
      expect(screen.getByText('Selected rows: 0')).toBeTruthy();
    });
  });

  it('forwards responsive expand baseline through crud into the internal table', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-responsive-expand"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              rowKey: 'id',
              responsive: {
                mode: 'expand',
                breakpoint: 1400,
                expandTrigger: 'row',
              },
              source: [
                { id: '1', name: 'Alpha', owner: 'Alice', status: 'active' },
              ],
              columns: [
                { name: 'name', label: 'Name' },
                { name: 'owner', label: 'Owner' },
                { name: 'status', label: 'Status' },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => {
      const headers = Array.from(document.querySelectorAll('[data-slot="table-head"]')).map((node) => node.textContent?.replace(/\s+/g, ' ').trim());
      expect(headers).toEqual(['Name']);
      expect(screen.queryByText('Alice')).toBeNull();
    });

    fireEvent.click(screen.getByText('Alpha'));

    await waitFor(() => {
      expect(screen.getByText('Owner')).toBeTruthy();
      expect(screen.getByText('Alice')).toBeTruthy();
      expect(screen.getByText('Status')).toBeTruthy();
      expect(screen.getByText('active')).toBeTruthy();
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
                  text: 'Summary: page=${$crud.pagination.currentPage}/${$crud.pagination.pageSize}; sort=${$crud.sort.field || "none"}:${$crud.sort.order || "none"}; filter=${$crud.filters.status || "none"}',
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
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Summary: page=3/20; sort=name:asc; filter=active')).toBeTruthy();
    });
  });

  it('publishes visibleColumnNames through $crud using the same column-settings ownership paths as the internal table', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-visible-columns-summary"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'visible-columns-crud',
              columnSettings: {
                enabled: true,
                toggledColumnsStatePath: 'crudState.toggledColumns',
                orderedColumnsStatePath: 'crudState.orderedColumns',
              },
              source: [{ id: '1', name: 'Alice', email: 'alice@example.com', role: 'Admin' }],
              columns: [
                { name: 'name', label: 'Name' },
                { name: 'email', label: 'Email' },
                { name: 'role', label: 'Role' },
              ],
              footerToolbar: [{ type: 'text', text: 'Visible: ${$crud.visibleColumnNames}' }],
            },
          ],
        }}
        data={{ crudState: { toggledColumns: ['role', 'name'], orderedColumns: ['role', 'name', 'email'] } }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Visible: role,name')).toBeTruthy();
      const headers = Array.from(document.querySelectorAll('[data-slot="table-head"]')).map((node) => node.textContent?.replace(/\s+/g, ' ').trim());
      expect(headers).toEqual(['Role', 'Name']);
      expect(screen.queryByText('alice@example.com')).toBeNull();
    });
  });

  it('keeps operation column interactions working inside CRUD tables', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-operation-column"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              source: [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }],
              columns: [
                { name: 'name', label: 'Name' },
                {
                  type: 'operation',
                  label: 'Actions',
                  buttons: [
                    {
                      type: 'button',
                      label: 'Inspect',
                      onClick: {
                        action: 'openDialog',
                        args: {
                          title: 'Inspect record',
                          body: [{ type: 'text', text: 'User: ${$slot.record.name}' }],
                        },
                      },
                    },
                  ],
                },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    const inspectButtons = screen.getAllByText('Inspect');
    fireEvent.click(inspectButtons[1]);

    expect(await screen.findByText('Inspect record')).toBeTruthy();
  });

  it('registers component handles for refresh and selection', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    const onComponentRegistryChange = vi.fn((registry) => registry?.setDebugEnabled?.(true));

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'handle-crud',
              source: [{ id: '1', name: 'Alice' }],
              columns: [{ name: 'name', label: '姓名' }],
              toolbar: [
                {
                  type: 'button',
                  label: 'Refresh',
                  onClick: {
                    action: 'component:refresh',
                    componentId: 'handle-crud',
                  },
                },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onComponentRegistryChange={onComponentRegistryChange}
      />
    );

    const registry = onComponentRegistryChange.mock.calls[0]?.[0];
    expect(registry).toBeTruthy();

    const handle = registry?.resolve?.({ componentId: 'handle-crud' });
    expect(handle?.type).toBe('crud');
    expect(handle?.capabilities?.hasMethod?.('refresh')).toBe(true);
    expect(handle?.capabilities?.hasMethod?.('getSelection')).toBe(true);
    expect(handle?.capabilities?.hasMethod?.('clearSelection')).toBe(true);
  });
});
