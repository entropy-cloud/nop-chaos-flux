import React from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ApiObject, ApiRequestContext } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '../index';
import { buttonRenderer, env, submitCalls } from './form-test-support';

describe('formRendererDefinitions - validation timing and visibility', () => {
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

    const input = screen.getByLabelText(/Email/);
    const field = input.closest('.nop-field');

    expect(screen.queryByText('Email is required')).toBeNull();

    fireEvent.focus(input);
    expect(field?.hasAttribute('data-field-visited')).toBe(true);

    fireEvent.change(input, { target: { value: 'foo' } });
    expect(field?.hasAttribute('data-field-dirty')).toBe(true);
    expect(screen.queryByText('Email is required')).toBeNull();

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);

    expect(await screen.findByText('Email is required')).toBeTruthy();
    expect(field?.hasAttribute('data-field-touched')).toBe(true);
    expect(field?.hasAttribute('data-field-invalid')).toBe(true);
  });

  it('keeps form semantic markers free of implicit layout classes', () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    const { container } = render(
      <SchemaRenderer
        schema={{
          type: 'form',
          body: [{ type: 'input-text', name: 'email', label: 'Email' }],
          actions: [{ type: 'button', label: 'Submit' }]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    const form = container.querySelector('section.nop-form');
    expect(form).toBeTruthy();
    expect(form?.className).toBe('nop-form');
    expect(form?.querySelector('[data-slot="form-body"]')).toBeTruthy();
    expect(form?.querySelector('[data-slot="form-actions"]')).toBeTruthy();
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

    fireEvent.focus(screen.getByLabelText(/Email/));

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

    const input = screen.getByLabelText(/Email/);
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

    const input = screen.getByLabelText(/Email/);
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

    const input = screen.getByLabelText(/Email/);
    fireEvent.blur(input);
    expect(screen.queryByText('Email is required')).toBeNull();

    fireEvent.change(input, { target: { value: 'a@example.com' } });

    await waitFor(() => {
      expect(screen.queryByText('Email is required')).toBeNull();
    });
  });
});
