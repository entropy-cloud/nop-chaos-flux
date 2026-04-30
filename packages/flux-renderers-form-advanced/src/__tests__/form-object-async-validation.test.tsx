import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { formAdvancedRendererDefinitions } from '../index';
import {
  buttonRenderer,
  contactGroupRenderer,
  env,
} from '../../../flux-renderers-form/src/test-support';

const allFormDefs = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];

describe('formRendererDefinitions - object validation, async validation, and field metadata', () => {
  it('supports object-level atLeastOneOf validation in the UI', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([
      ...allFormDefs,
      contactGroupRenderer,
      buttonRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-object-async-validation.test.tsx#1"
        schema={{
          type: 'form',
          showErrorOn: ['touched', 'submit'],
          data: {
            contact: {
              email: '',
              phone: '',
            },
          },
          body: [
            {
              type: 'contact-group',
              name: 'contact',
              label: 'Contact',
              atLeastOneOf: {
                paths: ['email', 'phone'],
                message: 'Provide at least an email or phone number',
              },
            },
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit contact',
              onClick: {
                action: 'submitForm',
              },
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    fireEvent.click(screen.getByText('Submit contact'));
    await waitFor(() => {
      expect(screen.getByText('Provide at least an email or phone number')).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText('Contact Email'), {
      target: { value: 'a@example.com' },
    });

    await waitFor(() => {
      expect(screen.queryByText('Provide at least an email or phone number')).toBeNull();
    });
  });

  it('supports object-level allOrNone validation in the UI', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([
      ...allFormDefs,
      contactGroupRenderer,
      buttonRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-object-async-validation.test.tsx#2"
        schema={{
          type: 'form',
          showErrorOn: ['touched', 'submit'],
          data: {
            contact: {
              email: 'alice@example.com',
              phone: '',
            },
          },
          body: [
            {
              type: 'contact-group',
              name: 'contact',
              label: 'Contact',
              allOrNone: {
                itemPaths: ['email', 'phone'],
                message: 'Provide both contact methods or leave both empty',
              },
            },
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit contact pair',
              onClick: {
                action: 'submitForm',
              },
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
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
        message: 'Username is available',
      },
    }));
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-object-async-validation.test.tsx#3"
        schema={{
          type: 'form',
          data: {
            username: 'alice',
          },
          body: [
            {
              type: 'input-text',
              name: 'username',
              label: 'Username',
              validate: {
                debounce: 80,
                action: {
                  action: 'ajax',
                  args: {
                    url: '/api/validate-username',
                    method: 'post',
                  },
                },
                message: 'Username is already taken',
              },
            },
          ],
        }}
        env={{
          ...env,
          fetcher: fetcherMock as RendererEnv['fetcher'],
        }}
        formulaCompiler={createFormulaCompiler()}
      />,
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
    const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-object-async-validation.test.tsx#4"
        schema={{
          type: 'form',
          data: {
            username: 'Alice',
          },
          body: [
            {
              type: 'input-text',
              name: 'username',
              label: { type: 'text', text: 'User ${user.name}' },
            },
          ],
        }}
        data={{ user: { name: 'Label' } }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    expect(await screen.findByText('User Label')).toBeTruthy();
    expect(screen.getByDisplayValue('Alice')).toBeTruthy();
  });

  it('renders composite field labels from schema fragments through field metadata', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-object-async-validation.test.tsx#5"
        schema={{
          type: 'form',
          data: {
            metadata: [],
          },
          body: [
            {
              type: 'key-value',
              name: 'metadata',
              label: { type: 'text', text: 'Meta ${user.name}' },
            },
          ],
        }}
        data={{ user: { name: 'Fields' } }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    expect(await screen.findByText('Meta Fields')).toBeTruthy();
  });

  it('renders form body and actions through shared slot helpers', () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-object-async-validation.test.tsx#6"
        schema={{
          type: 'form',
          body: [
            {
              type: 'text',
              text: 'Form body content',
            },
          ],
          actions: [
            {
              type: 'button',
              label: 'Form action button',
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    expect(screen.getByText('Form body content')).toBeTruthy();
    expect(screen.getByText('Form action button')).toBeTruthy();
  });
});
