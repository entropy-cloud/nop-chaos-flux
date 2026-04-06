import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { dataRendererDefinitions } from './index';

const env: RendererEnv = {
  fetcher: async function <T>() {
    return { ok: true, status: 200, data: null as T };
  },
  notify: () => undefined
};

const pageRenderer: RendererDefinition = {
  type: 'page',
  component: (props) => <section>{props.regions.body?.render()}</section>,
  regions: ['body']
};

const textRenderer: RendererDefinition = {
  type: 'text',
  component: (props) => <span>{String(props.props.text ?? '')}</span>
};

const buttonRenderer: RendererDefinition = {
  type: 'button',
  component: (props) => (
    <button
      type="button"
      onClick={() => void props.events.onClick?.()}
    >
      {String(props.props.label ?? props.meta.label ?? 'Button')}
    </button>
  ),
  fields: [{ key: 'onClick', kind: 'event' }]
};

describe('dataRendererDefinitions', () => {
  it('renders row-scope actions that open dialogs with row data', async () => {
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      textRenderer,
      buttonRenderer,
      ...dataRendererDefinitions
    ]);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              source: [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' }
              ],
              columns: [
                {
                  label: 'Name',
                  name: 'name'
                },
                {
                  type: 'operation',
                  label: 'Actions',
                  buttons: [
                    {
                      type: 'button',
                      label: 'Inspect',
                      onClick: {
                        action: 'dialog',
                        dialog: {
                          title: 'Record details',
                          body: [{ type: 'text', text: 'User: ${record.name}' }]
                        }
                      }
                    }
                  ]
                }
              ]
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    const inspectButtons = screen.getAllByText('Inspect');
    expect(inspectButtons).toHaveLength(2);

    fireEvent.click(inspectButtons[1]);

    expect(await screen.findByText('Record details')).toBeTruthy();
    expect(screen.getByText('User: Bob')).toBeTruthy();
    expect(document.querySelector('[data-slot="dialog-close"]')).toBeTruthy();

    fireEvent.click(document.querySelector('[data-slot="dialog-close"]')!);

    await waitFor(() => {
      expect(screen.queryByText('Record details')).toBeNull();
    });
  });

  it('dispatches row click events against the row scope', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      textRenderer,
      buttonRenderer,
      ...dataRendererDefinitions
    ]);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              source: [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' }
              ],
              onRowClick: {
                action: 'dialog',
                dialog: {
                  title: 'Row click',
                  body: [{ type: 'text', text: 'Selected ${record.name}' }]
                }
              },
              columns: [
                {
                  label: 'Name',
                  name: 'name'
                }
              ]
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.click(screen.getByText('Bob'));

    expect(await screen.findByText('Row click')).toBeTruthy();
    expect(screen.getByText((content) => content.includes('Selected') && content.includes('Bob'))).toBeTruthy();
  });

  it('renders header, footer, and schema-based empty content through normalized regions', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      textRenderer,
      ...dataRendererDefinitions
    ]);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              header: [{ type: 'text', text: 'Table header' }],
              footer: [{ type: 'text', text: 'Table footer' }],
              empty: { type: 'text', text: 'No rows for ${team}' },
              columns: [
                {
                  label: 'Name',
                  name: 'name'
                }
              ],
              source: []
            }
          ]
        }}
        data={{ team: 'Ops' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    expect(await screen.findByText('Table header')).toBeTruthy();
    expect(screen.getByText('Table footer')).toBeTruthy();
    expect(screen.getByText('No rows for Ops')).toBeTruthy();
  });

  it('renders plain-value empty content through value-or-region fallback', () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      textRenderer,
      ...dataRendererDefinitions
    ]);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              empty: 'Nothing here',
              columns: [
                {
                  label: 'Name',
                  name: 'name'
                }
              ],
              source: []
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    expect(screen.getByText('Nothing here')).toBeTruthy();
  });

  it('renders schema-based column labels through compiled column regions', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      textRenderer,
      ...dataRendererDefinitions
    ]);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              columns: [
                {
                  label: { type: 'text', text: 'Member ${team}' },
                  name: 'name'
                }
              ],
              source: [{ id: 1, name: 'Alice' }]
            }
          ]
        }}
        data={{ team: 'Roster' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    expect(await screen.findByText('Member Roster')).toBeTruthy();
    expect(screen.getByText('Alice')).toBeTruthy();
  });

  it('uses local pagination state by default', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      textRenderer,
      ...dataRendererDefinitions
    ]);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              columns: [{ label: 'Name', name: 'name' }],
              source: [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
                { id: 3, name: 'Carol' }
              ],
              pagination: {
                currentPage: 1,
                pageSize: 1,
                pageSizeOptions: [1]
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.queryByText('Bob')).toBeNull();

    fireEvent.click(document.querySelector('[data-slot="table-pagination"] [aria-label="Go to next page"]')!);

    await waitFor(() => {
      expect(screen.getByText('Bob')).toBeTruthy();
    });
  });

  it('uses controlled pagination when configured and waits for external prop updates', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      textRenderer,
      ...dataRendererDefinitions
    ]);

    const controlledSchema = {
      type: 'page',
      body: [
        {
          type: 'table',
          paginationOwnership: 'controlled',
          onPageChange: {
            action: 'setValue',
            componentPath: 'pageState',
            value: '${page}'
          },
          columns: [{ label: 'Name', name: 'name' }],
          source: [
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' },
            { id: 3, name: 'Carol' }
          ],
          pagination: {
            currentPage: '${pageState || 1}',
            pageSize: 1,
            pageSizeOptions: [1]
          }
        }
      ]
    } as const;

    const { rerender } = render(
      <SchemaRenderer
        schema={controlledSchema}
        data={{ pageState: 1 }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.queryByText('Bob')).toBeNull();

    fireEvent.click(document.querySelector('[data-slot="table-pagination"] [aria-label="Go to next page"]')!);

    expect(screen.getByText('Alice')).toBeTruthy();

    rerender(
      <SchemaRenderer
        schema={controlledSchema}
        data={{ pageState: 2 }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Bob')).toBeTruthy();
    });
  });

  it('uses scope-backed pagination when configured and updates through scope state', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      textRenderer,
      ...dataRendererDefinitions
    ]);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              paginationOwnership: 'scope',
              paginationStatePath: 'tableState.pagination',
              columns: [{ label: 'Name', name: 'name' }],
              source: [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
                { id: 3, name: 'Carol' }
              ],
              pagination: {
                currentPage: 1,
                pageSize: 1,
                pageSizeOptions: [1]
              }
            },
            { type: 'text', text: 'Page state: ${tableState.pagination.currentPage}' }
          ]
        }}
        data={{ tableState: { pagination: { currentPage: 1, pageSize: 1 } } }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.queryByText('Bob')).toBeNull();

    fireEvent.click(document.querySelector('[data-slot="table-pagination"] [aria-label="Go to next page"]')!);

    await waitFor(() => {
      expect(screen.getByText('Bob')).toBeTruthy();
      expect(screen.getByText('Page state: 2')).toBeTruthy();
    });
  });

  it('uses local row selection state by default', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      textRenderer,
      ...dataRendererDefinitions
    ]);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              rowSelection: {
                type: 'checkbox',
                selectedRowKeys: []
              },
              columns: [{ label: 'Name', name: 'name' }],
              source: [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' }
              ]
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    const checkboxes = document.querySelectorAll('[data-slot="checkbox"]');
    fireEvent.click(checkboxes[1]!);

    await waitFor(() => {
      expect(checkboxes[1]?.getAttribute('aria-checked')).toBe('true');
    });
  });

  it('uses controlled row selection and waits for external prop updates', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      textRenderer,
      ...dataRendererDefinitions
    ]);

    const controlledSchema = {
      type: 'page',
      body: [
        {
          type: 'table',
          selectionOwnership: 'controlled',
          rowSelection: {
            type: 'checkbox',
            selectedRowKeys: '${selectedKeys || []}'
          },
          columns: [{ label: 'Name', name: 'name' }],
          source: [
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' }
          ]
        }
      ]
    } as const;

    const { rerender } = render(
      <SchemaRenderer
        schema={controlledSchema}
        data={{ selectedKeys: [] }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    const initialCheckboxes = document.querySelectorAll('[data-slot="checkbox"]');
    fireEvent.click(initialCheckboxes[1]!);

    expect(initialCheckboxes[1]?.getAttribute('aria-checked')).not.toBe('true');

    rerender(
      <SchemaRenderer
        schema={controlledSchema}
        data={{ selectedKeys: ['1'] }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    await waitFor(() => {
      const updatedCheckboxes = document.querySelectorAll('[data-slot="checkbox"]');
      expect(updatedCheckboxes[1]?.getAttribute('aria-checked')).toBe('true');
    });
  });

  it('uses scope-backed row selection when configured and updates through scope state', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      textRenderer,
      ...dataRendererDefinitions
    ]);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              selectionOwnership: 'scope',
              selectionStatePath: 'tableState.selectedKeys',
              rowSelection: {
                type: 'checkbox',
                selectedRowKeys: []
              },
              columns: [{ label: 'Name', name: 'name' }],
              source: [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' }
              ]
            },
            { type: 'text', text: 'Selected state: ${tableState.selectedKeys}' }
          ]
        }}
        data={{ tableState: { selectedKeys: [] } }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    const checkboxes = document.querySelectorAll('[data-slot="checkbox"]');
    fireEvent.click(checkboxes[1]!);

    await waitFor(() => {
      const updatedCheckboxes = document.querySelectorAll('[data-slot="checkbox"]');
      expect(updatedCheckboxes[1]?.getAttribute('aria-checked')).toBe('true');
      expect(screen.getByText('Selected state: 1')).toBeTruthy();
    });
  });

  it('exposes table selection through component handle actions', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      textRenderer,
      buttonRenderer,
      ...dataRendererDefinitions
    ]);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              id: 'users-table',
              rowSelection: {
                type: 'checkbox',
                selectedRowKeys: []
              },
              columns: [{ label: 'Name', name: 'name' }],
              source: [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' }
              ]
            },
            {
              type: 'button',
              label: 'Select Alice',
              onClick: {
                action: 'component:setSelection',
                componentId: 'users-table',
                args: {
                  selectedRowKeys: ['1']
                }
              }
            },
            {
              type: 'button',
              label: 'Read Selection',
              onClick: {
                action: 'component:getSelection',
                componentId: 'users-table',
                then: {
                  action: 'setValue',
                  componentPath: 'selectionResult',
                  value: '${prevResult.data}'
                }
              }
            },
            { type: 'text', text: '${selectionResult}' }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.click(screen.getByText('Select Alice'));

    await waitFor(() => {
      const checkboxes = document.querySelectorAll('[data-slot="checkbox"]');
      expect(checkboxes[1]?.getAttribute('aria-checked')).toBe('true');
    });

    fireEvent.click(screen.getByText('Read Selection'));

    await waitFor(() => {
      expect(screen.getByText('1')).toBeTruthy();
    });
  });

  it('exposes table refresh through component handle actions', async () => {
    cleanup();
    let responseCount = 0;
    const fetcherSpy = vi.fn(async (api: unknown, ctx: unknown) => {
      void api;
      void ctx;
      responseCount += 1;

      return {
        ok: true,
        status: 200,
        data: { value: `refreshed-${responseCount}` }
      };
    });
    const fetcher = ((...args: Parameters<RendererEnv['fetcher']>) => fetcherSpy(...args)) as RendererEnv['fetcher'];
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      textRenderer,
      buttonRenderer,
      ...dataRendererDefinitions
    ]);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'data-source',
              id: 'table-source',
              api: { url: '/api/table-refresh', cacheTTL: 0 },
              dataPath: 'tableData'
            },
            {
              type: 'table',
              id: 'refreshable-table',
              source: '${tableData ? [tableData] : []}',
              onRefresh: {
                action: 'refreshSource',
                componentId: 'table-source'
              },
              columns: [{ label: 'Value', name: 'value' }]
            },
            {
              type: 'button',
              label: 'Refresh Table',
              onClick: {
                action: 'component:refresh',
                componentId: 'refreshable-table'
              }
            }
          ]
        }}
        env={{ ...env, fetcher }}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    await waitFor(() => {
      expect(fetcherSpy).toHaveBeenCalled();
    });

    const initialCalls = fetcherSpy.mock.calls.length;
    fireEvent.click(screen.getByText('Refresh Table'));

    await waitFor(() => {
      expect(fetcherSpy.mock.calls.length).toBeGreaterThan(initialCalls);
      expect(screen.getByText(`refreshed-${fetcherSpy.mock.calls.length}`)).toBeTruthy();
    });
  });

  it('renders schema-based column cells through compiled cell regions with row scope', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      textRenderer,
      ...dataRendererDefinitions
    ]);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              columns: [
                {
                  label: 'Summary',
                  name: 'name',
                  cell: { type: 'text', text: 'Member ${record.name}' }
                }
              ],
              source: [{ id: 1, name: 'Alice' }]
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    expect(await screen.findByText('Member Alice')).toBeTruthy();
  });

  describe('data-source', () => {
    it('evaluates formula sources into explicit dataPath bindings', async () => {
      cleanup();

      const SchemaRenderer = createSchemaRenderer([
        pageRenderer,
        textRenderer,
        ...dataRendererDefinitions
      ]);

      render(
        <SchemaRenderer
          schema={{
            type: 'page',
            body: [
              {
                type: 'data-source',
                dataPath: 'total',
                formula: '${4 * 6}'
              },
              { type: 'text', text: 'Total: ${total}' }
            ]
          }}
          env={env}
          formulaCompiler={createFormulaCompiler()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Total: 24')).toBeTruthy();
      });
    });

    it('fetches data and injects into scope', async () => {
      cleanup();
      const fetcher = vi.fn(async () => ({
        ok: true,
        status: 200,
        data: { name: 'Alice' }
      })) as RendererEnv['fetcher'];

      const SchemaRenderer = createSchemaRenderer([
        pageRenderer,
        textRenderer,
        ...dataRendererDefinitions
      ]);

      render(
        <SchemaRenderer
          schema={{
            type: 'page',
            body: [
              {
                type: 'data-source',
                api: { url: '/api/user/1' },
                dataPath: 'user'
              },
              { type: 'text', text: 'Hello, ${user.name}' }
            ]
          }}
          env={{ ...env, fetcher }}
          formulaCompiler={createFormulaCompiler()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Hello, Alice')).toBeTruthy();
      });

      expect(fetcher).toHaveBeenCalled();
    });

    it('uses initialData before fetch completes', async () => {
      cleanup();
      const fetcher = vi.fn(async () => ({
        ok: true,
        status: 200,
        data: { name: 'Bob' }
      })) as RendererEnv['fetcher'];

      const SchemaRenderer = createSchemaRenderer([
        pageRenderer,
        textRenderer,
        ...dataRendererDefinitions
      ]);

      render(
        <SchemaRenderer
          schema={{
            type: 'page',
            body: [
              {
                type: 'data-source',
                api: { url: '/api/user/1' },
                dataPath: 'user',
                initialData: { name: 'Initial' }
              },
              { type: 'text', text: 'Hello, ${user.name}' }
            ]
          }}
          env={{ ...env, fetcher }}
          formulaCompiler={createFormulaCompiler()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Hello, Bob')).toBeTruthy();
      });
    });

    it('shows error message on fetch failure', async () => {
      cleanup();
      const fetcher = vi.fn(async () => {
        throw new Error('Network error');
      }) as RendererEnv['fetcher'];

      const notify = vi.fn();

      const SchemaRenderer = createSchemaRenderer([
        pageRenderer,
        textRenderer,
        ...dataRendererDefinitions
      ]);

      render(
        <SchemaRenderer
          schema={{
            type: 'page',
            body: [
              {
                type: 'data-source',
                api: { url: '/api/error' },
                dataPath: 'data'
              }
            ]
          }}
          env={{ ...env, fetcher, notify }}
          formulaCompiler={createFormulaCompiler()}
        />
      );

      await waitFor(() => {
        expect(notify).toHaveBeenCalledWith('error', expect.any(String));
      });
    });

    it('suppresses error notification when silent is true', async () => {
      cleanup();
      const fetcher = vi.fn(async () => {
        throw new Error('Server error');
      }) as RendererEnv['fetcher'];

      const notify = vi.fn();

      const SchemaRenderer = createSchemaRenderer([
        pageRenderer,
        textRenderer,
        ...dataRendererDefinitions
      ]);

      render(
        <SchemaRenderer
          schema={{
            type: 'page',
            body: [
              {
                type: 'data-source',
                api: { url: '/api/error' },
                dataPath: 'data',
                silent: true
              }
            ]
          }}
          env={{ ...env, fetcher, notify }}
          formulaCompiler={createFormulaCompiler()}
        />
      );

      await waitFor(() => {
        expect(fetcher).toHaveBeenCalled();
      });

      expect(notify).not.toHaveBeenCalled();
    });

    it('keeps cache isolated between independent renderer roots', async () => {
      cleanup();
      const fetcherSpy = vi.fn(async (_api: unknown, _ctx: unknown) => {
        void _api;
        void _ctx;

        return {
          ok: true,
          status: 200,
          data: { value: 'cached' }
        };
      });
      const fetcher = ((...args: Parameters<RendererEnv['fetcher']>) => fetcherSpy(...args)) as RendererEnv['fetcher'];

      const SchemaRenderer = createSchemaRenderer([
        pageRenderer,
        textRenderer,
        ...dataRendererDefinitions
      ]);

      const schema = {
        type: 'page',
        body: [
          {
            type: 'data-source',
            api: { url: '/api/data', cacheTTL: 60000, cacheKey: 'test-cache' },
            dataPath: 'data'
          },
          { type: 'text', text: 'Value: ${data.value}' }
        ]
      } as const;

      const { unmount } = render(
        <SchemaRenderer
          schema={schema}
          env={{ ...env, fetcher }}
          formulaCompiler={createFormulaCompiler()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Value: cached')).toBeTruthy();
      });

      const firstRenderCallCount = fetcherSpy.mock.calls.length;
      expect(firstRenderCallCount).toBeGreaterThanOrEqual(1);

      unmount();
      cleanup();

      render(
        <SchemaRenderer
          schema={schema}
          env={{ ...env, fetcher }}
          formulaCompiler={createFormulaCompiler()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Value: cached')).toBeTruthy();
      });

      expect(fetcherSpy.mock.calls.length).toBeGreaterThan(firstRenderCallCount);
    });
  });
});
