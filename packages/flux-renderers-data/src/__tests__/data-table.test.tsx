import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  buttonRenderer,
  createDataSchemaRenderer,
  env,
  formulaCompiler,
  resolvedNameProbeRenderer,
} from '../test-support.js';

describe('dataRendererDefinitions table behavior', () => {
  it('renders row-scope actions that open dialogs with row data', async () => {
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/table"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              source: [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
              ],
              columns: [
                { label: 'Name', name: 'name' },
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
                          title: 'Record details',
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
    expect(await screen.findByText('Record details')).toBeTruthy();
    expect(screen.getByText('User: Bob')).toBeTruthy();
    fireEvent.click(document.querySelector('[data-slot="dialog-close"]')!);
    await waitFor(() => expect(screen.queryByText('Record details')).toBeNull());
  });

  it('dispatches row click events against the row scope', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/table"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              source: [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
              ],
              onRowClick: {
                action: 'openDialog',
                args: {
                  title: 'Row click',
                  body: [{ type: 'text', text: 'Selected ${record.name}' }],
                },
              },
              columns: [{ label: 'Name', name: 'name' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    fireEvent.click(await screen.findByText('Bob'));
    expect(await screen.findByText('Row click')).toBeTruthy();
    expect(
      screen.getByText((content) => content.includes('Selected') && content.includes('Bob')),
    ).toBeTruthy();
  });

  it('renders header, footer, and schema-based empty content through normalized regions', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/table"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              header: [{ type: 'text', text: 'Table header' }],
              footer: [{ type: 'text', text: 'Table footer' }],
              empty: { type: 'text', text: 'No rows for ${team}' },
              columns: [{ label: 'Name', name: 'name' }],
              source: [],
            },
          ],
        }}
        data={{ team: 'Ops' }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(await screen.findByText('Table header')).toBeTruthy();
    expect(screen.getByText('Table footer')).toBeTruthy();
    expect(screen.getByText('No rows for Ops')).toBeTruthy();
    const tableRoot = document.querySelector('.nop-table');
    expect(tableRoot).toBeTruthy();
    expect(tableRoot?.querySelector('[data-slot="table-header-region"]')).toBeTruthy();
    expect(tableRoot?.querySelector('[data-slot="table-container"]')).toBeTruthy();
    expect(tableRoot?.querySelector('[data-slot="table-header"]')).toBeTruthy();
    expect(tableRoot?.querySelector('[data-slot="table-empty-row"]')).toBeTruthy();
    expect(tableRoot?.querySelector('[data-slot="table-empty-cell"]')?.textContent).toContain(
      'No rows for Ops',
    );
    expect(tableRoot?.querySelector('[data-slot="table-footer"]')).toBeTruthy();
  });

  it('renders plain-value empty content through value-or-region fallback', () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/table"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              empty: 'Nothing here',
              columns: [{ label: 'Name', name: 'name' }],
              source: [],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(screen.getByText('Nothing here')).toBeTruthy();
  });

  it('renders schema-based column labels through compiled column regions', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/table"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              columns: [{ label: { type: 'text', text: 'Member ${team}' }, name: 'name' }],
              source: [{ id: 1, name: 'Alice' }],
            },
          ],
        }}
        data={{ team: 'Roster' }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(await screen.findByText('Member Roster')).toBeTruthy();
    expect(screen.getByText('Alice')).toBeTruthy();
  });

  it('renders schema-based column cells through compiled cell regions with row scope', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/table"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              columns: [
                {
                  label: 'Summary',
                  name: 'name',
                  cell: { type: 'text', text: 'Member ${$slot.record.name}' },
                },
              ],
              source: [{ id: 1, name: 'Alice' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(await screen.findByText('Member Alice')).toBeTruthy();
  });

  it('renders schema-based column cells with slot bindings under StrictMode', async () => {
    cleanup();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const SchemaRenderer = createDataSchemaRenderer();

    try {
      render(
        <React.StrictMode>
          <SchemaRenderer
            schemaUrl="test://data/table-strict-cell-region"
            schema={{
              type: 'page',
              body: [
                {
                  type: 'table',
                  rowKey: 'id',
                  columns: [
                    {
                      label: 'Summary',
                      name: 'name',
                      cell: { type: 'text', text: 'Member ${$slot.record.name}' },
                    },
                  ],
                  source: [{ id: 'user-1', name: 'Alice' }],
                },
              ],
            }}
            env={env}
            formulaCompiler={formulaCompiler}
          />
        </React.StrictMode>,
      );

      await waitFor(() => expect(screen.getByText('Member Alice')).toBeTruthy());
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  it('keeps table root marker non-visual and merges schema className onto the root', () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/table"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              className: 'stack-sm border',
              columns: [{ label: 'Name', name: 'name' }],
              source: [],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const tableRoot = document.querySelector('.nop-table') as HTMLElement | null;
    expect(tableRoot?.className).toContain('nop-table');
    expect(tableRoot?.className).toContain('stack-sm');
    expect(tableRoot?.className).toContain('border');
    expect(tableRoot?.className).not.toContain('grid');
    expect(tableRoot?.className).not.toContain('gap-4');
  });

  it('publishes table row and pagination structure through data-slot markers', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/table"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              columns: [{ label: 'Name', name: 'name' }],
              source: [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
              ],
              pagination: { currentPage: 1, pageSize: 1, pageSizeOptions: [1] },
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => expect(screen.getByText('Alice')).toBeTruthy());
    const tableRoot = document.querySelector('.nop-table');
    expect(tableRoot?.querySelector('[data-slot="table-row"]')).toBeTruthy();
    expect(tableRoot?.querySelector('[data-slot="table-pagination"]')).toBeTruthy();
  });

  it('propagates repeated table row instancePath into row child nodes', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    const onComponentRegistryChange = vi.fn((registry) => registry?.setDebugEnabled?.(true));
    render(
      <SchemaRenderer
        schemaUrl="test://data/table"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              columns: [{ type: 'operation', buttons: [{ type: 'button', label: 'Row action' }] }],
              source: [{ id: 1, name: 'Alice' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onComponentRegistryChange={onComponentRegistryChange}
      />,
    );
    const rowButton = await screen.findByText('Row action');
    const cid = Number(rowButton.getAttribute('data-cid'));
    const registry = onComponentRegistryChange.mock.calls[0]?.[0];
    await waitFor(() => {
      expect(registry?.getHandleDebugData?.(cid)?.nodeInstance).toMatchObject({
        instancePath: [
          { repeatedTemplateId: expect.stringMatching(/^table-row:/), instanceKey: '1' },
        ],
      });
    });
  });

  it('keeps operation button slot scope isolated per row', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    const onComponentRegistryChange = vi.fn((registry) => registry?.setDebugEnabled?.(true));
    render(
      <SchemaRenderer
        schemaUrl="test://data/table"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              rowKey: 'id',
              columns: [{ type: 'operation', buttons: [{ type: 'button', label: 'Inspect' }] }],
              source: [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
                { id: 3, name: 'Carol' },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onComponentRegistryChange={onComponentRegistryChange}
      />,
    );

    const inspectButtons = await screen.findAllByText('Inspect');
    const registry = onComponentRegistryChange.mock.calls[0]?.[0];
    const cids = inspectButtons.map((button) => Number(button.getAttribute('data-cid')));

    await waitFor(() => {
      expect(
        cids.map(
          (cid) =>
            registry?.getHandleDebugData?.(cid)?.scope?.readOwn()?.$slot as
              | { record?: { name?: string } }
              | undefined,
        ),
      ).toEqual([
        expect.objectContaining({ record: expect.objectContaining({ name: 'Alice' }) }),
        expect.objectContaining({ record: expect.objectContaining({ name: 'Bob' }) }),
        expect.objectContaining({ record: expect.objectContaining({ name: 'Carol' }) }),
      ]);
    });
  });

  it('renders expanded row regions with the expanded row slot scope', async () => {
    cleanup();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const SchemaRenderer = createDataSchemaRenderer();

    try {
      render(
        <SchemaRenderer
          schemaUrl="test://data/table-expanded-row"
          schema={{
            type: 'page',
            body: [
              {
                type: 'table',
                rowKey: 'id',
                source: [
                  { id: 'user-1', name: 'Alice', children: [{ label: 'Primary', value: 'admin' }] },
                  { id: 'user-2', name: 'Bob', children: [{ label: 'Primary', value: 'editor' }] },
                ],
                expandable: {
                  expandedRowKeys: ['user-1', 'user-2'],
                  expandedRow: [
                    { type: 'text', text: 'Expanded ${$slot.record.name}' },
                    { type: 'text', text: 'Children: ${$slot.record.children.length}' },
                  ],
                },
                columns: [{ label: 'Name', name: 'name' }],
              },
            ],
          }}
          env={env}
          formulaCompiler={formulaCompiler}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Expanded Alice')).toBeTruthy();
        expect(screen.getAllByText('Children: 1')).toHaveLength(2);
        expect(screen.getByText('Expanded Bob')).toBeTruthy();
      });
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  it('binds form controls in cells via $slot.record.fieldName path', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/table-form-controls"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              columns: [
                {
                  label: 'Active',
                  name: 'active',
                  cell: {
                    type: 'switch',
                    name: '$slot.record.active',
                  },
                },
                {
                  label: 'Verified',
                  name: 'verified',
                  cell: {
                    type: 'checkbox',
                    name: '$slot.record.verified',
                    option: 'Verified',
                  },
                },
                {
                  label: 'Region',
                  name: 'region',
                  cell: {
                    type: 'select',
                    name: '$slot.record.region',
                    options: [
                      { label: 'APAC', value: 'apac' },
                      { label: 'EMEA', value: 'emea' },
                    ],
                  },
                },
                {
                  label: 'Score',
                  name: 'scoreBand',
                  cell: {
                    type: 'radio-group',
                    name: '$slot.record.scoreBand',
                    options: [
                      { label: 'Low', value: 'low' },
                      { label: 'High', value: 'high' },
                    ],
                  },
                },
              ],
              source: [
                { id: 1, active: true, verified: false, region: 'apac', scoreBand: 'low' },
                { id: 2, active: false, verified: true, region: 'emea', scoreBand: 'high' },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const switches = await screen.findAllByRole('switch');
    expect(switches[0].getAttribute('aria-checked')).toBe('true');
    expect(switches[1].getAttribute('aria-checked')).toBe('false');

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0].getAttribute('aria-checked')).toBe('false');
    expect(checkboxes[1].getAttribute('aria-checked')).toBe('true');

    const selects = screen.getAllByRole('combobox');
    expect(selects[0].textContent?.toLowerCase()).toContain('apac');
    expect(selects[1].textContent?.toLowerCase()).toContain('emea');
  });

  it('preserves raw slot field names for table cell render props', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([resolvedNameProbeRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/table-resolved-field-name"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              rowKey: 'id',
              columns: [
                {
                  label: 'Probe',
                  name: 'tags',
                  cell: {
                    type: 'resolved-name-probe',
                    name: '$slot.record.tags',
                  },
                },
              ],
              source: [{ id: 1, tags: ['alpha'] }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect((await screen.findByTestId('resolved-name-probe')).textContent).toBe('$slot.record.tags');
  });

  it('does not bind form controls in cells via bare fieldName (isolated scope)', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/table-form-controls-bare"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              columns: [
                {
                  label: 'Active',
                  name: 'active',
                  cell: {
                    type: 'switch',
                    name: 'active',
                  },
                },
              ],
              source: [{ id: 1, active: true }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const sw = await screen.findByRole('switch');
    expect(sw.getAttribute('aria-checked')).toBe('false');
  });
});
