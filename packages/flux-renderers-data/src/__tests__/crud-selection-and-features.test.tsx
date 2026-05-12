import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from '@nop-chaos/ui';
import type { RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import { buttonRenderer, createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

afterEach(cleanup);

function DisabledAwareButtonRenderer(props: RendererComponentProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={props.meta.disabled}
      onClick={() => void props.events.onClick?.()}
    >
      {String(props.props.label ?? 'Button')}
    </Button>
  );
}

const disabledAwareButtonRenderer: RendererDefinition = {
  type: 'button',
  component: DisabledAwareButtonRenderer,
  fields: [{ key: 'onClick', kind: 'event' }],
};

describe('CRUD selection and features', () => {
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
              selection: {},
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
              footerToolbar: [{ type: 'text', text: 'Selected rows: ${$crud.selectionCount}' }],
              columns: [{ name: 'name', label: 'Name' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const bulkDeleteButton = screen.getByRole('button', { name: 'Bulk Delete' });
    expect(bulkDeleteButton.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText('Selected rows: 0')).toBeTruthy();

    const checkboxes = document.querySelectorAll('[data-slot="checkbox"]');
    fireEvent.click(checkboxes[1] as HTMLElement);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Bulk Delete' }).hasAttribute('disabled')).toBe(
        false,
      );
      expect(screen.getByText('Selected rows: 1')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Refresh current list' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Bulk Delete' }).hasAttribute('disabled')).toBe(
        true,
      );
      expect(screen.getByText('Selected rows: 0')).toBeTruthy();
    });
  });

  it('replaces CRUD selection in radio mode and keeps $crud summary single-valued', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([disabledAwareButtonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-radio-selection"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'radio-selection-crud',
              selection: { type: 'radio' },
              source: [
                { id: '1', name: 'Alice' },
                { id: '2', name: 'Bob' },
              ],
              listActions: [
                {
                  type: 'button',
                  label: 'Inspect Selected',
                  disabled: '${!$crud.hasSelection}',
                },
              ],
              footerToolbar: [
                {
                  type: 'text',
                  text: 'Selected rows: ${$crud.selectionCount}; Keys: ${$crud.selectedRowKeys}',
                },
              ],
              columns: [{ name: 'name', label: 'Name' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const inspectSelectedButton = screen.getByRole('button', { name: 'Inspect Selected' });
    expect(inspectSelectedButton.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(/Selected rows: 0; Keys:/)).toBeTruthy();

    const radios = document.querySelectorAll('[data-slot="checkbox"][data-shape="circle"]');
    expect(radios.length).toBe(2);

    fireEvent.click(radios[0] as HTMLElement);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Inspect Selected' }).hasAttribute('disabled'),
      ).toBe(false);
      expect(screen.getByText('Selected rows: 1; Keys: 1')).toBeTruthy();
    });

    fireEvent.click(radios[1] as HTMLElement);

    await waitFor(() => {
      expect(screen.getByText('Selected rows: 1; Keys: 2')).toBeTruthy();
      expect(screen.queryByText('Selected rows: 2; Keys: 1,2')).toBeNull();
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
              source: [{ id: '1', name: 'Alpha', owner: 'Alice', status: 'active' }],
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
      />,
    );

    await waitFor(() => {
      const headers = Array.from(document.querySelectorAll('[data-slot="table-head"]')).map(
        (node) => node.textContent?.replace(/\s+/g, ' ').trim(),
      );
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
              source: [
                { id: '1', name: 'Alice' },
                { id: '2', name: 'Bob' },
              ],
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
      />,
    );

    const inspectButtons = await screen.findAllByText('Inspect');
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
      />,
    );

    const registry = onComponentRegistryChange.mock.calls[0]?.[0];
    expect(registry).toBeTruthy();

    const handle = registry?.resolve?.({ componentId: 'handle-crud' });
    expect(handle?.type).toBe('crud');
    expect(handle?.capabilities?.hasMethod?.('refresh')).toBe(true);
    expect(handle?.capabilities?.hasMethod?.('getSelection')).toBe(true);
    expect(handle?.capabilities?.hasMethod?.('clearSelection')).toBe(true);
  });

  describe('CRUD table body rendering', () => {
    const records = [
      { id: 1, name: 'Alpha', status: 'active' },
      { id: 2, name: 'Beta', status: 'draft' },
      { id: 3, name: 'Gamma', status: 'archived' },
    ];

    it('renders table body rows with correct field values for basic CRUD', async () => {
      const SchemaRenderer = createDataSchemaRenderer();

      render(
        <SchemaRenderer
          schemaUrl="test://data/crud-basic"
          schema={{
            type: 'page',
            body: [
              {
                type: 'crud',
                source: records,
                rowKey: 'id',
                columns: [
                  { label: 'ID', name: 'id' },
                  { label: 'Name', name: 'name' },
                  { label: 'Status', name: 'status' },
                ],
              },
            ],
          }}
          env={env}
          formulaCompiler={formulaCompiler}
        />,
      );

      const bodyRowSelector = 'tbody [data-slot="table-row"]';
      await waitFor(() => {
        const allRows = document.querySelectorAll(bodyRowSelector);
        expect(allRows.length).toBe(3);
      });

      const rows = document.querySelectorAll(bodyRowSelector);
      const row0Cells = rows[0].querySelectorAll('td');
      expect(row0Cells.length).toBe(3);
      expect(row0Cells[0].textContent).toBe('1');
      expect(row0Cells[1].textContent).toBe('Alpha');
      expect(row0Cells[2].textContent).toBe('active');
    });

    it('renders table body rows via expression-bound source and page data', async () => {
      const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);

      render(
        <SchemaRenderer
          schemaUrl="test://data/crud-expr-source"
          schema={{
            type: 'page',
            body: [
              {
                type: 'crud',
                source: '${records}',
                rowKey: 'id',
                toolbar: [{ type: 'button', label: 'Create' }],
                columns: [
                  { label: 'ID', name: 'id' },
                  { label: 'Name', name: 'name' },
                  { label: 'Status', name: 'status' },
                ],
              },
            ],
          }}
          data={{ records }}
          env={env}
          formulaCompiler={formulaCompiler}
        />,
      );

      const bodyRowSelector = 'tbody [data-slot="table-row"]';
      await waitFor(() => {
        const _container = document.querySelector('[data-slot="crud-table"]');
        const allRows = document.querySelectorAll(bodyRowSelector);
        const _tableContainer = document.querySelector('[data-slot="table"]');
        if (allRows.length === 0) {
          console.log('DEBUG body.innerHTML:', document.body.innerHTML?.substring(0, 3000));
        }
        expect(allRows.length).toBe(3);
      });

      const rows = document.querySelectorAll(bodyRowSelector);
      const row0Cells = rows[0].querySelectorAll('td');
      expect(row0Cells.length).toBe(3);
      expect(row0Cells[0].textContent).toBe('1');
      expect(row0Cells[1].textContent).toBe('Alpha');
      expect(row0Cells[2].textContent).toBe('active');

      const row1Cells = rows[1].querySelectorAll('td');
      expect(row1Cells[0].textContent).toBe('2');
      expect(row1Cells[1].textContent).toBe('Beta');
      expect(row1Cells[2].textContent).toBe('draft');

      const row2Cells = rows[2].querySelectorAll('td');
      expect(row2Cells[0].textContent).toBe('3');
      expect(row2Cells[1].textContent).toBe('Gamma');
      expect(row2Cells[2].textContent).toBe('archived');
    });

    it('renders table header columns', async () => {
      const SchemaRenderer = createDataSchemaRenderer();

      render(
        <SchemaRenderer
          schemaUrl="test://data/crud-headers"
          schema={{
            type: 'page',
            body: [
              {
                type: 'crud',
                source: records,
                rowKey: 'id',
                columns: [
                  { label: 'ID', name: 'id' },
                  { label: 'Name', name: 'name' },
                  { label: 'Status', name: 'status' },
                ],
              },
            ],
          }}
          env={env}
          formulaCompiler={formulaCompiler}
        />,
      );

      await waitFor(() => {
        const headers = document.querySelectorAll('[data-slot="table-head"]');
        expect(headers.length).toBe(3);
      });

      const headers = document.querySelectorAll('[data-slot="table-head"]');
      expect(headers[0].textContent).toBe('ID');
      expect(headers[1].textContent).toBe('Name');
      expect(headers[2].textContent).toBe('Status');
    });

    it('renders table body with toolbar and pagination', async () => {
      const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);

      render(
        <SchemaRenderer
          schemaUrl="test://data/crud-with-toolbar"
          schema={{
            type: 'page',
            body: [
              {
                type: 'crud',
                source: records,
                rowKey: 'id',
                toolbar: [{ type: 'button', label: 'Create' }],
                toolbarLayout: {
                  header: ['listActions', 'pagination'],
                  footer: ['statistics', 'switch-per-page'],
                },
                columns: [
                  { label: 'ID', name: 'id' },
                  { label: 'Name', name: 'name' },
                ],
              },
            ],
          }}
          env={env}
          formulaCompiler={formulaCompiler}
        />,
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Create' })).toBeTruthy();
      });

      const bodyRows = document.querySelectorAll('tbody [data-slot="table-row"]');
      expect(bodyRows.length).toBe(3);
      expect(bodyRows[0].querySelectorAll('td')[0].textContent).toBe('1');
      expect(bodyRows[0].querySelectorAll('td')[1].textContent).toBe('Alpha');
      expect(bodyRows[1].querySelectorAll('td')[0].textContent).toBe('2');
      expect(bodyRows[1].querySelectorAll('td')[1].textContent).toBe('Beta');

      expect(document.querySelector('[data-slot="table-pagination"]')).toBeTruthy();
    });

    it('renders table body with checkbox selection and field values', async () => {
      const SchemaRenderer = createDataSchemaRenderer();

      render(
        <SchemaRenderer
          schemaUrl="test://data/crud-selection"
          schema={{
            type: 'page',
            body: [
              {
                type: 'crud',
                source: records,
                rowKey: 'id',
                selection: { type: 'checkbox' },
                columns: [
                  { label: 'ID', name: 'id' },
                  { label: 'Name', name: 'name' },
                  { label: 'Status', name: 'status' },
                ],
              },
            ],
          }}
          env={env}
          formulaCompiler={formulaCompiler}
        />,
      );

      await waitFor(() => {
        expect(document.querySelectorAll('tbody [data-slot="table-row"]').length).toBe(3);
      });

      const rows = document.querySelectorAll('tbody [data-slot="table-row"]');
      const row0Cells = rows[0].querySelectorAll('td');
      expect(row0Cells[0].getAttribute('data-slot')).toBe('table-select-cell');
      expect(row0Cells[1].textContent).toBe('1');
      expect(row0Cells[2].textContent).toBe('Alpha');
      expect(row0Cells[3].textContent).toBe('active');

      const allCheckboxes = document.querySelectorAll('[data-slot="checkbox"]');
      expect(allCheckboxes.length).toBe(4);

      const rowCheckboxes = Array.from(allCheckboxes).filter(
        (cb) => (cb.closest('td') || cb.closest('th'))?.closest('tbody'),
      );
      expect(rowCheckboxes.length).toBe(3);

      fireEvent.click(rowCheckboxes[0]);
      await waitFor(() => {
        expect(rowCheckboxes[0].getAttribute('aria-checked')).toBe('true');
      });
    });
  });
});
