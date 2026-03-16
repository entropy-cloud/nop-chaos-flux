import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  it('submits checkbox values through shared field handlers', async () => {
    submitCalls.length = 0;
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          data: {
            approved: false
          },
          body: [
            {
              type: 'checkbox',
              name: 'approved',
              label: 'Approval',
              option: {
                label: 'Approved'
              }
            }
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit approval',
              onClick: {
                action: 'submitForm',
                api: {
                  url: '/api/approval',
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

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByText('Submit approval'));

    await waitFor(() => {
      expect(submitCalls).toHaveLength(1);
    });

    expect(submitCalls[0]).toMatchObject({ approved: true });
  });

  it('submits textarea and radio-group values through shared field helpers', async () => {
    submitCalls.length = 0;
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          data: {
            notes: 'Initial note',
            status: 'draft'
          },
          body: [
            {
              type: 'textarea',
              name: 'notes',
              label: 'Notes',
              rows: 5
            },
            {
              type: 'radio-group',
              name: 'status',
              label: 'Status',
              options: [
                { label: 'Draft', value: 'draft' },
                { label: 'Published', value: 'published' }
              ]
            }
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit article',
              onClick: {
                action: 'submitForm',
                api: {
                  url: '/api/article',
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

    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Updated note' } });
    fireEvent.click(screen.getByDisplayValue('published'));
    fireEvent.click(screen.getByText('Submit article'));

    await waitFor(() => {
      expect(submitCalls).toHaveLength(1);
    });

    expect(submitCalls[0]).toMatchObject({
      notes: 'Updated note',
      status: 'published'
    });
  });

  it('blocks submit when compiled validation rules fail', async () => {
    submitCalls.length = 0;
    cleanup();
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

    expect(submitCalls).toHaveLength(0);
    expect(await screen.findByText('Email is required')).toBeTruthy();
  });

  it('validates fields on blur and renders async validating feedback', async () => {
    submitCalls.length = 0;
    cleanup();
    let resolveValidation: ((value: { ok: boolean; status: number; data: { valid: boolean; message?: string } }) => void) | undefined;
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          data: {
            username: 'alice'
          },
          body: [
            {
              type: 'input-text',
              name: 'username',
              label: 'Username',
              validate: {
                api: {
                  url: '/api/validate-username',
                  method: 'post'
                },
                message: 'Username already exists'
              }
            }
          ]
        }}
        env={{
          ...env,
          fetcher: async function <T>(api: ApiObject, ctx: ApiRequestContext) {
            if (api.url === '/api/validate-username') {
              return await new Promise((resolve) => {
                resolveValidation = resolve as typeof resolveValidation;
              });
            }

            submitCalls.push(ctx.scope.readOwn());
            return {
              ok: true,
              status: 200,
              data: ctx.scope.readOwn() as T
            };
          }
        }}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    const usernameInput = screen.getByDisplayValue('alice');
    fireEvent.blur(usernameInput);

    expect(await screen.findByText('Validating...')).toBeTruthy();

    resolveValidation?.({
      ok: true,
      status: 200,
      data: {
        valid: false,
        message: 'Username already exists'
      }
    });

    await waitFor(() => {
      expect(screen.getByText('Username already exists')).toBeTruthy();
    });
  });

  it('only shows field errors after touch and marks field state classes', async () => {
    cleanup();
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
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    const input = screen.getByLabelText('Email');
    const field = input.closest('.na-field');

    expect(screen.queryByText('Email is required')).toBeNull();

    fireEvent.focus(input);
    expect(field?.className).toContain('na-field--visited');

    fireEvent.change(input, { target: { value: 'foo' } });
    expect(field?.className).toContain('na-field--dirty');
    expect(screen.queryByText('Email is required')).toBeNull();

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);

    expect(await screen.findByText('Email is required')).toBeTruthy();
    expect(field?.className).toContain('na-field--touched');
    expect(field?.className).toContain('na-field--invalid');
  });

  it('supports visited-only error visibility without changing validation timing', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          validateOn: 'submit',
          showErrorOn: 'visited',
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

    expect(screen.queryByText('Email is required')).toBeNull();

    fireEvent.click(screen.getByText('Submit email'));
    expect(screen.queryByText('Email is required')).toBeNull();

    fireEvent.focus(screen.getByLabelText('Email'));

    expect(await screen.findByText('Email is required')).toBeTruthy();
    expect(submitCalls).toHaveLength(0);
  });

  it('supports dirty-based field visibility override', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          validateOn: ['blur', 'change', 'submit'],
          showErrorOn: 'submit',
          data: {
            email: ''
          },
          body: [
            {
              type: 'input-email',
              name: 'email',
              label: 'Email',
              minLength: 5,
              showErrorOn: 'dirty'
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    const input = screen.getByLabelText('Email');
    fireEvent.blur(input);
    expect(screen.queryByText('Email must be at least 5 characters')).toBeNull();

    fireEvent.change(input, { target: { value: 'a' } });

    expect(await screen.findByText('Email must be at least 5 characters')).toBeTruthy();
  });

  it('respects submit-only validation policy until form submission', async () => {
    cleanup();
    submitCalls.length = 0;
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          validateOn: 'submit',
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

    const input = screen.getByLabelText('Email');
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.queryByText('Email is required')).toBeNull();
    });

    fireEvent.click(screen.getByText('Submit email'));

    expect(await screen.findByText('Email is required')).toBeTruthy();
    expect(submitCalls).toHaveLength(0);
  });

  it('respects field-level change validation override', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          validateOn: 'submit',
          data: {
            email: ''
          },
          body: [
            {
              type: 'input-email',
              name: 'email',
              label: 'Email',
              required: true,
              validateOn: ['change', 'submit']
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    const input = screen.getByLabelText('Email');
    fireEvent.blur(input);
    expect(screen.queryByText('Email is required')).toBeNull();

    fireEvent.change(input, { target: { value: 'a@example.com' } });

    await waitFor(() => {
      expect(screen.queryByText('Email is required')).toBeNull();
    });
  });

  it('waits for async validation debounce before calling the validator API', async () => {
    cleanup();
    const fetcherMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      data: {
        valid: true,
        message: 'Username is available'
      }
    }));
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          data: {
            username: 'alice'
          },
          body: [
            {
              type: 'input-text',
              name: 'username',
              label: 'Username',
              validate: {
                debounce: 80,
                api: {
                  url: '/api/validate-username',
                  method: 'post'
                },
                message: 'Username is already taken'
              }
            }
          ]
        }}
        env={{
          ...env,
          fetcher: fetcherMock as RendererEnv['fetcher']
        }}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.blur(screen.getByDisplayValue('alice'));

    expect(fetcherMock).not.toHaveBeenCalled();
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(fetcherMock).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(fetcherMock).toHaveBeenCalledTimes(1);
    });
  });
});
