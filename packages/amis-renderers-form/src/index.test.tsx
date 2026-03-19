import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ApiObject, ApiRequestContext, RendererComponentProps, RendererDefinition, RendererEnv } from '@nop-chaos/amis-schema';
import { createFormulaCompiler } from '@nop-chaos/amis-formula';
import { createSchemaRenderer } from '@nop-chaos/amis-react';
import { useAggregateError, useCurrentForm, useRenderScope } from '@nop-chaos/amis-react';
import { basicRendererDefinitions } from '@nop-chaos/amis-renderers-basic';
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
      onClick={() => void props.events.onClick?.()}
    >
      {String(props.props.label ?? props.meta.label ?? 'Button')}
    </button>
  ),
  fields: [{ key: 'onClick', kind: 'event' }]
};

function ContactGroupRenderer(props: RendererComponentProps) {
  const scope = useRenderScope();
  const form = useCurrentForm();
  const name = String(props.props.name ?? props.schema.name ?? '');
  const value = (scope.get(name) as Record<string, string> | undefined) ?? {};
  const error = useAggregateError(name)?.message;

  return (
    <label className="na-field">
      <span className="na-field__label">{String(props.meta.label ?? 'Contact')}</span>
      <input
        aria-label="Contact Email"
        className="na-input"
        value={value.email ?? ''}
        onFocus={() => {
          form?.visitField(name);
        }}
        onChange={(event) => {
          form?.setValue(name, { ...value, email: event.target.value });
        }}
        onBlur={() => {
          form?.touchField(name);
        }}
      />
      <input
        aria-label="Contact Phone"
        className="na-input"
        value={value.phone ?? ''}
        onFocus={() => {
          form?.visitField(name);
        }}
        onChange={(event) => {
          form?.setValue(name, { ...value, phone: event.target.value });
        }}
        onBlur={() => {
          form?.touchField(name);
        }}
      />
      {error ? <span className="na-field__error">{error}</span> : null}
    </label>
  );
}

const contactGroupRenderer: RendererDefinition = {
  type: 'contact-group',
  validation: {
    kind: 'field',
    valueKind: 'object',
    getFieldPath(schema) {
      return typeof schema.name === 'string' ? schema.name : undefined;
    },
    collectRules() {
      return [];
    }
  },
  component: ContactGroupRenderer
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

  it('submits switch and checkbox-group values through shared field helpers', async () => {
    submitCalls.length = 0;
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          data: {
            featured: false,
            tags: ['stable']
          },
          body: [
            {
              type: 'switch',
              name: 'featured',
              label: 'Featured',
              option: {
                onLabel: 'Live',
                offLabel: 'Hidden'
              }
            },
            {
              type: 'checkbox-group',
              name: 'tags',
              label: 'Tags',
              options: [
                { label: 'Stable', value: 'stable' },
                { label: 'Beta', value: 'beta' }
              ]
            }
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit release',
              onClick: {
                action: 'submitForm',
                api: {
                  url: '/api/release',
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

    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByDisplayValue('beta'));
    fireEvent.click(screen.getByText('Submit release'));

    await waitFor(() => {
      expect(submitCalls).toHaveLength(1);
    });

    expect(submitCalls[0]).toMatchObject({
      featured: true,
      tags: ['stable', 'beta']
    });
  });

  it('validates a runtime-registered complex field and blocks submit', async () => {
    submitCalls.length = 0;
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          showErrorOn: 'submit',
          data: {
            tags: []
          },
          body: [
            {
              type: 'tag-list',
              name: 'tags',
              label: 'Tag List',
              tags: ['alpha', 'beta']
            }
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit tags',
              onClick: {
                action: 'submitForm',
                api: {
                  url: '/api/tags',
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

    fireEvent.click(screen.getByText('Submit tags'));

    await waitFor(() => {
      expect(submitCalls).toHaveLength(0);
    });
    expect(screen.getByText('Tag List requires at least one tag')).toBeTruthy();
    expect(submitCalls).toHaveLength(0);

    fireEvent.click(screen.getByText('alpha'));

    await waitFor(() => {
      expect(screen.queryByText('Tag List requires at least one tag')).toBeNull();
    });

    fireEvent.click(screen.getByText('Submit tags'));

    await waitFor(() => {
      expect(submitCalls).toHaveLength(1);
    });

    expect(submitCalls[0]).toMatchObject({ tags: ['alpha'] });
  });

  it('submits and validates a runtime-registered key-value editor', async () => {
    submitCalls.length = 0;
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          showErrorOn: 'submit',
          data: {
            metadata: []
          },
          body: [
            {
              type: 'key-value',
              name: 'metadata',
              label: 'Metadata',
              addLabel: 'Add metadata entry'
            }
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit metadata',
              onClick: {
                action: 'submitForm',
                api: {
                  url: '/api/metadata',
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

    fireEvent.click(screen.getByText('Submit metadata'));

    expect(await screen.findByText('Metadata requires at least one entry')).toBeTruthy();
    expect(submitCalls).toHaveLength(0);

    const firstMetadataCall = submitCalls.length;

    fireEvent.click(screen.getByText('Add metadata entry'));
    fireEvent.change(screen.getByPlaceholderText('Key'), { target: { value: 'env' } });
    fireEvent.click(screen.getByText('Submit metadata'));

    expect(await screen.findByText('Entry 1 value is required')).toBeTruthy();
    expect(submitCalls).toHaveLength(firstMetadataCall);

    fireEvent.change(screen.getByPlaceholderText('Value'), { target: { value: 'prod' } });
    fireEvent.click(screen.getByText('Submit metadata'));

    await waitFor(() => {
      expect(submitCalls).toHaveLength(1);
    });

    expect(submitCalls[0]).toMatchObject({
      metadata: [{ key: 'env', value: 'prod' }]
    });
  });

  it('renders child validation state for runtime-registered key-value cells', async () => {
    submitCalls.length = 0;
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          showErrorOn: ['touched', 'dirty', 'submit'],
          data: {
            metadata: [{ key: '', value: '' }]
          },
          body: [
            {
              type: 'key-value',
              name: 'metadata',
              label: 'Metadata'
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    const keyInput = screen.getByPlaceholderText('Key');
    const valueInput = screen.getByPlaceholderText('Value');
    const keyField = keyInput.closest('.na-child-field');
    const valueField = valueInput.closest('.na-child-field');

    fireEvent.change(valueInput, { target: { value: 'prod' } });
    fireEvent.focus(keyInput);
    fireEvent.blur(keyInput);

    expect(await screen.findByText('Entry 1 key is required')).toBeTruthy();
    expect(keyField?.className).toContain('na-child-field--visited');
    expect(keyField?.className).toContain('na-child-field--touched');
    expect(keyField?.className).toContain('na-child-field--invalid');
    expect(valueField?.className ?? '').not.toContain('na-child-field--invalid');

    fireEvent.change(keyInput, { target: { value: 'env' } });

    await waitFor(() => {
      expect(screen.queryByText('Entry 1 key is required')).toBeNull();
    });

    await waitFor(() => {
      expect((keyInput as HTMLInputElement).value).toBe('env');
    });
    expect(valueField?.className).toContain('na-child-field--dirty');
  });

  it('submits and validates a runtime-registered array editor', async () => {
    submitCalls.length = 0;
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          showErrorOn: 'submit',
          data: {
            reviewers: []
          },
          body: [
            {
              type: 'array-editor',
              name: 'reviewers',
              label: 'Reviewers',
              itemLabel: 'Reviewer'
            }
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit reviewers',
              onClick: {
                action: 'submitForm',
                api: {
                  url: '/api/reviewers',
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

    fireEvent.click(screen.getByText('Submit reviewers'));

    expect(await screen.findByText('Reviewers requires at least one item')).toBeTruthy();
    expect(submitCalls).toHaveLength(0);

    const firstReviewerCall = submitCalls.length;

    fireEvent.click(screen.getByText('Add item'));
    fireEvent.change(screen.getByPlaceholderText('Reviewer 1'), { target: { value: 'alice' } });
    fireEvent.click(screen.getByText('Submit reviewers'));

    await waitFor(() => {
      expect(submitCalls).toHaveLength(firstReviewerCall + 1);
    });

    expect(Array.isArray(submitCalls[0].reviewers)).toBe(true);
    expect(submitCalls[0].reviewers[0]).toMatchObject({ value: 'alice' });
  });

  it('tracks runtime-registered array editor child interaction state', async () => {
    submitCalls.length = 0;
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          showErrorOn: ['touched', 'submit'],
          data: {
            reviewers: [{ value: '' }]
          },
          body: [
            {
              type: 'array-editor',
              name: 'reviewers',
              label: 'Reviewers',
              itemLabel: 'Reviewer'
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.focus(screen.getByPlaceholderText('Reviewer 1'));
    fireEvent.blur(screen.getByPlaceholderText('Reviewer 1'));
    fireEvent.change(screen.getByPlaceholderText('Reviewer 1'), { target: { value: 'alice' } });
    fireEvent.change(screen.getByPlaceholderText('Reviewer 1'), { target: { value: '' } });

    expect(await screen.findByText('Reviewer 1 is required')).toBeTruthy();
    const childField = screen.getByPlaceholderText('Reviewer 1').closest('.na-child-field');
    expect(childField?.className).toContain('na-child-field--visited');
    expect(childField?.className).toContain('na-child-field--touched');
    expect(childField?.className).toContain('na-child-field--dirty');
    expect(childField?.className).toContain('na-child-field--invalid');
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

  it('supports relational field validation with dependent revalidation in the UI', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          showErrorOn: ['touched', 'submit'],
          data: {
            password: 'alpha',
            confirmPassword: 'alpha',
            role: 'viewer',
            adminCode: ''
          },
          body: [
            {
              type: 'input-password',
              name: 'password',
              label: 'Password'
            },
            {
              type: 'input-password',
              name: 'confirmPassword',
              label: 'Confirm Password',
              equalsField: 'password'
            },
            {
              type: 'select',
              name: 'role',
              label: 'Role',
              options: [
                { label: 'Viewer', value: 'viewer' },
                { label: 'Admin', value: 'admin' }
              ]
            },
            {
              type: 'input-text',
              name: 'adminCode',
              label: 'Admin Code',
              requiredWhen: {
                path: 'role',
                equals: 'admin',
                message: 'Admin code is required for admins'
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    const confirmInput = screen.getByLabelText('Confirm Password');
    const passwordInput = screen.getAllByDisplayValue('alpha')[0];
    const roleSelect = screen.getByLabelText('Role');
    const adminCodeInput = screen.getByLabelText('Admin Code');

    fireEvent.focus(confirmInput);
    fireEvent.blur(confirmInput);
    expect(screen.queryByText('Confirm Password must match password')).toBeNull();

    fireEvent.change(passwordInput, { target: { value: 'beta' } });

    expect(await screen.findByText('Confirm Password must match password')).toBeTruthy();

    fireEvent.focus(adminCodeInput);
    fireEvent.blur(adminCodeInput);
    expect(screen.queryByText('Admin code is required for admins')).toBeNull();

    fireEvent.change(roleSelect, { target: { value: 'admin' } });

    expect(await screen.findByText('Admin code is required for admins')).toBeTruthy();

    fireEvent.change(roleSelect, { target: { value: 'viewer' } });

    await waitFor(() => {
      expect(screen.queryByText('Admin code is required for admins')).toBeNull();
    });
  });

  it('supports not-equals and required-unless relational validation in the UI', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          showErrorOn: ['touched', 'submit'],
          data: {
            username: 'alice',
            backupUsername: 'bob',
            status: 'draft',
            publishReason: ''
          },
          body: [
            {
              type: 'input-text',
              name: 'username',
              label: 'Username'
            },
            {
              type: 'input-text',
              name: 'backupUsername',
              label: 'Backup Username',
              notEqualsField: 'username'
            },
            {
              type: 'select',
              name: 'status',
              label: 'Status',
              options: [
                { label: 'Draft', value: 'draft' },
                { label: 'Review', value: 'review' },
                { label: 'Published', value: 'published' }
              ]
            },
            {
              type: 'input-text',
              name: 'publishReason',
              label: 'Publish Reason',
              requiredUnless: {
                path: 'status',
                equals: 'published',
                message: 'Publish reason is required before publishing'
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    const usernameInput = screen.getByLabelText('Username');
    const backupInput = screen.getByLabelText('Backup Username');
    const statusSelect = screen.getByLabelText('Status');
    const publishReasonInput = screen.getByLabelText('Publish Reason');

    fireEvent.focus(backupInput);
    fireEvent.blur(backupInput);
    fireEvent.change(usernameInput, { target: { value: 'bob' } });

    expect(await screen.findByText('Backup Username must not match username')).toBeTruthy();

    fireEvent.change(usernameInput, { target: { value: 'carol' } });

    await waitFor(() => {
      expect(screen.queryByText('Backup Username must not match username')).toBeNull();
    });

    fireEvent.focus(publishReasonInput);
    fireEvent.blur(publishReasonInput);
    fireEvent.change(statusSelect, { target: { value: 'review' } });

    expect(await screen.findByText('Publish reason is required before publishing')).toBeTruthy();

    fireEvent.change(statusSelect, { target: { value: 'published' } });

    await waitFor(() => {
      expect(screen.queryByText('Publish reason is required before publishing')).toBeNull();
    });
  });

  it('supports array-level minItems validation in the UI', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          showErrorOn: ['touched', 'submit'],
          data: {
            reviewers: []
          },
          body: [
            {
              type: 'array-editor',
              name: 'reviewers',
              label: 'Reviewers',
              itemLabel: 'Reviewer',
              minItems: 1
            }
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit reviewers',
              onClick: {
                action: 'submitForm'
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.click(screen.getByText('Submit reviewers'));
    expect(await screen.findByText('Reviewers must contain at least 1 item')).toBeTruthy();

    fireEvent.click(screen.getByText('Add item'));
    fireEvent.change(screen.getByPlaceholderText('Reviewer 1'), { target: { value: 'alice' } });

    await waitFor(() => {
      expect(screen.queryByText('Reviewers must contain at least 1 item')).toBeNull();
    });
  });

  it('supports array-level maxItems validation in the UI', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          showErrorOn: ['touched', 'submit'],
          data: {
            reviewers: [{ value: 'alice' }, { value: 'bob' }]
          },
          body: [
            {
              type: 'array-editor',
              name: 'reviewers',
              label: 'Reviewers',
              itemLabel: 'Reviewer',
              maxItems: 1
            }
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit limited reviewers',
              onClick: {
                action: 'submitForm'
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.click(screen.getByText('Submit limited reviewers'));
    expect(await screen.findByText('Reviewers must contain at most 1 item')).toBeTruthy();

    fireEvent.click(screen.getAllByText('Remove')[1]);

    await waitFor(() => {
      expect(screen.queryByText('Reviewers must contain at most 1 item')).toBeNull();
    });
  });

  it('supports aggregate atLeastOneFilled validation in the UI', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          showErrorOn: ['touched', 'submit'],
          data: {
            reviewers: [{ value: '' }, { value: '' }]
          },
          body: [
            {
              type: 'array-editor',
              name: 'reviewers',
              label: 'Reviewers',
              itemLabel: 'Reviewer',
              atLeastOneFilled: {
                itemPath: 'value',
                message: 'Add at least one reviewer value'
              }
            }
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit aggregate reviewers',
              onClick: {
                action: 'submitForm'
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.click(screen.getByText('Submit aggregate reviewers'));
    expect(await screen.findByText('Add at least one reviewer value')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('Reviewer 2'), { target: { value: 'bob' } });

    await waitFor(() => {
      expect(screen.queryByText('Add at least one reviewer value')).toBeNull();
    });
  });

  it('supports aggregate allOrNone validation in the UI', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          showErrorOn: ['touched', 'submit'],
          data: {
            metadata: [{ key: 'env', value: '' }]
          },
          body: [
            {
              type: 'key-value',
              name: 'metadata',
              label: 'Metadata',
              allOrNone: {
                itemPaths: ['key', 'value'],
                message: 'Metadata entries must fill both key and value or leave both empty'
              }
            }
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit aggregate metadata',
              onClick: {
                action: 'submitForm'
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.click(screen.getByText('Submit aggregate metadata'));
    expect(await screen.findByText('Metadata entries must fill both key and value or leave both empty')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('Value'), { target: { value: 'prod' } });

    await waitFor(() => {
      expect(screen.queryByText('Metadata entries must fill both key and value or leave both empty')).toBeNull();
    });
  });

  it('clears stale child errors after removing a composite array row', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          showErrorOn: ['touched', 'submit'],
          data: {
            reviewers: [{ value: 'alice' }, { value: '' }]
          },
          body: [
            {
              type: 'array-editor',
              name: 'reviewers',
              label: 'Reviewers',
              itemLabel: 'Reviewer'
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.focus(screen.getByPlaceholderText('Reviewer 2'));
    fireEvent.blur(screen.getByPlaceholderText('Reviewer 2'));

    expect(await screen.findByText('Reviewer 2 is required')).toBeTruthy();

    fireEvent.click(screen.getAllByText('Remove')[0]);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Reviewer 1')).toBeTruthy();
      expect(screen.queryByPlaceholderText('Reviewer 2')).toBeNull();
    });
  });

  it('supports aggregate uniqueBy validation in the UI', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          showErrorOn: ['touched', 'submit'],
          data: {
            metadata: [
              { key: 'env', value: 'prod' },
              { key: 'env', value: 'stage' }
            ]
          },
          body: [
            {
              type: 'key-value',
              name: 'metadata',
              label: 'Metadata',
              uniqueBy: {
                itemPath: 'key',
                message: 'Metadata keys must be unique'
              }
            }
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit unique metadata',
              onClick: {
                action: 'submitForm'
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.click(screen.getByText('Submit unique metadata'));
    expect(await screen.findByText('Metadata keys must be unique')).toBeTruthy();

    fireEvent.change(screen.getAllByPlaceholderText('Key')[1], { target: { value: 'tier' } });

    await waitFor(() => {
      expect(screen.queryByText('Metadata keys must be unique')).toBeNull();
    });
  });

  it('supports object-level atLeastOneOf validation in the UI', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, contactGroupRenderer, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          showErrorOn: ['touched', 'submit'],
          data: {
            contact: {
              email: '',
              phone: ''
            }
          },
          body: [
            {
              type: 'contact-group',
              name: 'contact',
              label: 'Contact',
              atLeastOneOf: {
                paths: ['email', 'phone'],
                message: 'Provide at least an email or phone number'
              }
            }
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit contact',
              onClick: {
                action: 'submitForm'
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.click(screen.getByText('Submit contact'));
    await waitFor(() => {
      expect(screen.getByText('Provide at least an email or phone number')).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText('Contact Email'), { target: { value: 'a@example.com' } });

    await waitFor(() => {
      expect(screen.queryByText('Provide at least an email or phone number')).toBeNull();
    });
  });

  it('supports object-level allOrNone validation in the UI', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, contactGroupRenderer, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          showErrorOn: ['touched', 'submit'],
          data: {
            contact: {
              email: 'alice@example.com',
              phone: ''
            }
          },
          body: [
            {
              type: 'contact-group',
              name: 'contact',
              label: 'Contact',
              allOrNone: {
                itemPaths: ['email', 'phone'],
                message: 'Provide both contact methods or leave both empty'
              }
            }
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit contact pair',
              onClick: {
                action: 'submitForm'
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.click(screen.getByText('Submit contact pair'));

    await waitFor(() => {
      expect(screen.getByText('Provide both contact methods or leave both empty')).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText('Contact Phone'), { target: { value: '123456' } });

    await waitFor(() => {
      expect(screen.queryByText('Provide both contact methods or leave both empty')).toBeNull();
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

  it('renders input labels from schema fragments through field metadata', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          data: {
            username: 'Alice'
          },
          body: [
            {
              type: 'input-text',
              name: 'username',
              label: { type: 'tpl', tpl: 'User ${user.name}' }
            }
          ]
        }}
        data={{ user: { name: 'Label' } }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    expect(await screen.findByText('User Label')).toBeTruthy();
    expect(screen.getByDisplayValue('Alice')).toBeTruthy();
  });

  it('renders composite field labels from schema fragments through field metadata', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          data: {
            metadata: []
          },
          body: [
            {
              type: 'key-value',
              name: 'metadata',
              label: { type: 'tpl', tpl: 'Meta ${user.name}' }
            }
          ]
        }}
        data={{ user: { name: 'Fields' } }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    expect(await screen.findByText('Meta Fields')).toBeTruthy();
  });

  it('renders form body and actions through shared slot helpers', () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          body: [
            {
              type: 'text',
              text: 'Form body content'
            }
          ],
          actions: [
            {
              type: 'button',
              label: 'Form action button'
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    expect(screen.getByText('Form body content')).toBeTruthy();
    expect(screen.getByText('Form action button')).toBeTruthy();
  });
});
