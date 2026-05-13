import React from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ApiSchema, ApiRequestContext } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { formAdvancedRendererDefinitions } from '../index.js';
import {
  buttonRenderer,
  env,
  selectOption,
  submitCalls,
} from '../test-support.js';

const allFormDefs = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];

describe('formRendererDefinitions - source-backed options', () => {
  it('resolves source-backed select options before interaction', async () => {
    submitCalls.length = 0;
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-source-options.test.tsx#1"
        schema={{
          type: 'form',
          data: {
            role: 'admin',
          },
          submitAction: {
            action: 'ajax',
            args: {
              url: '/api/dynamic-role',
              method: 'post',
            },
          },
          body: [
            {
              type: 'select',
              name: 'role',
              label: 'Role',
              options: {
                type: 'source',
                formula: [
                  { label: 'Admin', value: 'admin' },
                  { label: 'Editor', value: 'editor' },
                ],
              },
            },
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit dynamic role',
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

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Role' })).toBeTruthy();
    });

    await selectOption('Role', 'Editor');
    fireEvent.click(screen.getByText('Submit dynamic role'));

    await waitFor(() => {
      expect(submitCalls).toHaveLength(1);
    });

    expect(submitCalls[0]).toMatchObject({ role: 'editor' });
  });

  it('shows loading state while source-backed select options are resolving', async () => {
    submitCalls.length = 0;
    cleanup();
    let resolveOptions:
      | ((value: {
          ok: true;
          status: number;
          data: Array<{ label: string; value: string }>;
        }) => void)
      | undefined;
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-source-options.test.tsx#2"
        schema={{
          type: 'form',
          data: {
            role: 'admin',
          },
          body: [
            {
              type: 'select',
              name: 'role',
              label: 'Role',
              options: {
                type: 'source',
                action: 'ajax',
                args: {
                  url: '/api/roles',
                },
              },
            },
          ],
        }}
        env={{
          ...env,
          fetcher: async function <T>(api: ApiSchema, ctx: ApiRequestContext) {
            if (api.url === '/api/roles') {
              return await new Promise((resolve) => {
                resolveOptions = resolve as typeof resolveOptions;
              });
            }

            submitCalls.push(ctx.scope.readOwn());
            return {
              ok: true,
              status: 200,
              data: ctx.scope.readOwn() as T,
            };
          },
        }}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Role' }).hasAttribute('disabled')).toBe(true);
      expect(document.querySelector('[role="status"]')).toBeTruthy();
    });

    resolveOptions?.({
      ok: true,
      status: 200,
      data: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
      ],
    });

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Role' }).hasAttribute('disabled')).toBe(false);
    });
  });

  it('shows loading state while source-backed radio-group options are resolving', async () => {
    submitCalls.length = 0;
    cleanup();
    let resolveOptions:
      | ((value: {
          ok: true;
          status: number;
          data: Array<{ label: string; value: string }>;
        }) => void)
      | undefined;
    const SchemaRenderer = createSchemaRenderer([...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-source-options.test.tsx#3"
        schema={{
          type: 'form',
          data: {
            status: 'draft',
          },
          body: [
            {
              type: 'radio-group',
              name: 'status',
              label: 'Status',
              options: {
                type: 'source',
                action: 'ajax',
                args: {
                  url: '/api/status-options',
                },
              },
            },
          ],
        }}
        env={{
          ...env,
          fetcher: async function <T>(api: ApiSchema) {
            if (api.url === '/api/status-options') {
              return await new Promise((resolve) => {
                resolveOptions = resolve as typeof resolveOptions;
              });
            }

            return {
              ok: true,
              status: 200,
              data: {} as T,
            };
          },
        }}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeTruthy();
      expect(document.querySelector('[role="status"]')).toBeTruthy();
    });

    resolveOptions?.({
      ok: true,
      status: 200,
      data: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
    });

    expect(await screen.findByRole('radio', { name: /Published/ })).toBeTruthy();
  });

  it('shows loading state while source-backed checkbox-group options are resolving', async () => {
    submitCalls.length = 0;
    cleanup();
    let resolveOptions:
      | ((value: {
          ok: true;
          status: number;
          data: Array<{ label: string; value: string }>;
        }) => void)
      | undefined;
    const SchemaRenderer = createSchemaRenderer([...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-source-options.test.tsx#4"
        schema={{
          type: 'form',
          data: {
            tags: ['stable'],
          },
          body: [
            {
              type: 'checkbox-group',
              name: 'tags',
              label: 'Tags',
              options: {
                type: 'source',
                action: 'ajax',
                args: {
                  url: '/api/tag-options',
                },
              },
            },
          ],
        }}
        env={{
          ...env,
          fetcher: async function <T>(api: ApiSchema) {
            if (api.url === '/api/tag-options') {
              return await new Promise((resolve) => {
                resolveOptions = resolve as typeof resolveOptions;
              });
            }

            return {
              ok: true,
              status: 200,
              data: {} as T,
            };
          },
        }}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeTruthy();
      expect(document.querySelector('[role="status"]')).toBeTruthy();
    });

    resolveOptions?.({
      ok: true,
      status: 200,
      data: [
        { label: 'Stable', value: 'stable' },
        { label: 'Beta', value: 'beta' },
      ],
    });

    expect(await screen.findByRole('checkbox', { name: /Beta/ })).toBeTruthy();
  });

  it('shows inline error text when source-backed select options fail to load', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-source-options.test.tsx#5"
        schema={{
          type: 'form',
          body: [
            {
              type: 'select',
              name: 'role',
              label: 'Role',
              options: {
                type: 'source',
                action: 'ajax',
                args: {
                  url: '/api/select-error',
                },
              },
            },
          ],
        }}
        env={{
          ...env,
          fetcher: async function <T>(api: ApiSchema) {
            if (api.url === '/api/select-error') {
              throw new Error('Select options failed');
            }

            return {
              ok: true,
              status: 200,
              data: {} as T,
            };
          },
        }}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    expect(await screen.findByText('Select options failed')).toBeTruthy();
  });

  it('shows inline error text when source-backed radio-group options fail to load', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-source-options.test.tsx#6"
        schema={{
          type: 'form',
          body: [
            {
              type: 'radio-group',
              name: 'status',
              label: 'Status',
              options: {
                type: 'source',
                action: 'ajax',
                args: {
                  url: '/api/radio-error',
                },
              },
            },
          ],
        }}
        env={{
          ...env,
          fetcher: async function <T>(api: ApiSchema) {
            if (api.url === '/api/radio-error') {
              throw new Error('Radio options failed');
            }

            return {
              ok: true,
              status: 200,
              data: {} as T,
            };
          },
        }}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    expect(await screen.findByText('Radio options failed')).toBeTruthy();
  });

  it('shows inline error text when source-backed checkbox-group options fail to load', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-source-options.test.tsx#7"
        schema={{
          type: 'form',
          body: [
            {
              type: 'checkbox-group',
              name: 'tags',
              label: 'Tags',
              options: {
                type: 'source',
                action: 'ajax',
                args: {
                  url: '/api/checkbox-error',
                },
              },
            },
          ],
        }}
        env={{
          ...env,
          fetcher: async function <T>(api: ApiSchema) {
            if (api.url === '/api/checkbox-error') {
              throw new Error('Checkbox options failed');
            }

            return {
              ok: true,
              status: 200,
              data: {} as T,
            };
          },
        }}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    expect(await screen.findByText('Checkbox options failed')).toBeTruthy();
  });
});
