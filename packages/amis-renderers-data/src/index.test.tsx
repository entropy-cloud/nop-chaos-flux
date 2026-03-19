import React from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { RendererDefinition, RendererEnv } from '@nop-chaos/amis-schema';
import { createFormulaCompiler } from '@nop-chaos/amis-formula';
import { createSchemaRenderer } from '@nop-chaos/amis-react';
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
    expect(screen.getByText('Close')).toBeTruthy();

    fireEvent.click(screen.getByText('Close'));

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
});
