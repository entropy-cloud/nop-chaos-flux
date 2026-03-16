import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ApiObject, ApiRequestContext, RendererDefinition, RendererEnv } from '@nop-chaos/amis-schema';
import { createFormulaCompiler } from '@nop-chaos/amis-formula';
import { createSchemaRenderer } from '@nop-chaos/amis-react';
import { formRendererDefinitions } from './index';

const submitCalls: Array<Record<string, any>> = [];

const env: RendererEnv = {
  fetcher: async function <T>(_api: ApiObject, ctx: ApiRequestContext) {
    submitCalls.push(ctx.scope.readOwn());
    return {
      ok: true,
      status: 200,
      data: ctx.scope.readOwn() as T
    };
  },
  notify: () => undefined
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

describe('formRendererDefinitions', () => {
  it('submits updated form values from input and select renderers', async () => {
    submitCalls.length = 0;
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          data: {
            username: 'Alice',
            role: 'admin'
          },
          body: [
            {
              type: 'input-text',
              name: 'username',
              label: 'Username'
            },
            {
              type: 'select',
              name: 'role',
              label: 'Role',
              options: [
                { label: 'Admin', value: 'admin' },
                { label: 'Editor', value: 'editor' }
              ]
            }
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit profile',
              onClick: {
                action: 'submitForm',
                api: {
                  url: '/api/profile',
                  method: 'post'
                }
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    const usernameInput = screen.getByDisplayValue('Alice');
    const roleSelect = screen.getByRole('combobox');

    fireEvent.change(usernameInput, { target: { value: 'Bob' } });
    fireEvent.change(roleSelect, { target: { value: 'editor' } });
    fireEvent.click(screen.getByText('Submit profile'));

    await waitFor(() => {
      expect(submitCalls).toHaveLength(1);
    });

    expect(submitCalls[0]).toMatchObject({
      username: 'Bob',
      role: 'editor'
    });
  });

  it('blocks submit when compiled validation rules fail', async () => {
    submitCalls.length = 0;
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          data: {
            email: ''
          },
          body: [
            {
              type: 'input-email',
              name: 'email',
              label: 'Email',
              required: true
            }
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit email',
              onClick: {
                action: 'submitForm',
                api: {
                  url: '/api/email',
                  method: 'post'
                }
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.click(screen.getByText('Submit email'));

    await waitFor(() => {
      expect(submitCalls).toHaveLength(0);
    });
  });
});
