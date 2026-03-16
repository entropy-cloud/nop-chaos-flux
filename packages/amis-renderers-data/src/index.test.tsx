import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
      onClick={() => {
        const onClick = props.props.onClick;
        if (onClick && typeof onClick === 'object' && 'action' in (onClick as Record<string, unknown>)) {
          void props.helpers.dispatch(onClick as any);
        }
      }}
    >
      {String(props.props.label ?? props.meta.label ?? 'Button')}
    </button>
  )
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
    expect(screen.getByText('Close')).toBeTruthy();

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByText('Record details')).toBeNull();
    });
  });
});
