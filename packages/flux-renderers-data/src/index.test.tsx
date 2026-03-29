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
    it('fetches data and renders body', async () => {
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
                dataPath: 'user',
                body: { type: 'text', text: 'Hello, ${user.name}' }
              }
            ]
          }}
          env={{ ...env, fetcher }}
          formulaCompiler={createFormulaCompiler()}
        />
      );

      expect(document.querySelector('[data-slot="skeleton"]')).toBeTruthy();

      await waitFor(() => {
        expect(screen.getByText('Hello, Alice')).toBeTruthy();
      });

      expect(fetcher).toHaveBeenCalledTimes(1);
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
                initialData: { name: 'Initial' },
                body: { type: 'text', text: 'Hello, ${user.name}' }
              }
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
      const fetcher = vi.fn(async () => ({
        ok: false,
        status: 500,
        data: { message: 'Server error' }
      })) as RendererEnv['fetcher'];

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

    it('uses cache when cacheTTL is set', async () => {
      cleanup();
      const fetcher = vi.fn(async () => ({
        ok: true,
        status: 200,
        data: { value: 'cached' }
      })) as RendererEnv['fetcher'];

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
            dataPath: 'data',
            body: { type: 'text', text: 'Value: ${data.value}' }
          }
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

      expect(fetcher).toHaveBeenCalledTimes(1);

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

      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });
});

