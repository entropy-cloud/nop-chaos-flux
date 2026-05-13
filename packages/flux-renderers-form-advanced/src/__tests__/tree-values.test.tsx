import React from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ApiSchema } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { allFormDefs } from './form-tree-checkbox-fields.shared.js';
import {
  buttonRenderer,
  env,
  formStateProbeRenderer,
  submitCalls,
} from '@nop-chaos/flux-renderers-form/test-support';

describe('tree controls - value handling and form integration', () => {
  it('submits input-tree values through the shared form field path', async () => {
    submitCalls.length = 0;
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/tree-values.test.tsx#1"
        schema={
          {
            type: 'form',
            data: {
              categoryIds: [],
            },
            submitAction: {
              action: 'ajax',
              args: {
                url: '/api/categories',
                method: 'post',
              },
            },
            body: [
              {
                type: 'input-tree',
                name: 'categoryIds',
                label: 'Categories',
                treeMode: 'checkbox',
                options: [
                  {
                    label: 'Platform',
                    value: 'platform',
                    children: [{ label: 'Runtime', value: 'runtime' }],
                  },
                ],
              },
            ],
            actions: [
              {
                type: 'button',
                label: 'Submit categories',
                onClick: {
                  action: 'submitForm',
                },
              },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    fireEvent.click(screen.getByRole('treeitem', { name: 'Runtime' }));
    fireEvent.click(screen.getByText('Submit categories'));

    await waitFor(() => {
      expect(submitCalls).toHaveLength(1);
    });

    expect(submitCalls[0]).toMatchObject({ categoryIds: ['runtime'] });
  });

  it('updates tree-select value through the shared form field path', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, formStateProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/tree-values.test.tsx#2"
        schema={
          {
            type: 'form',
            data: {
              departmentId: '',
            },
            body: [
              {
                type: 'tree-select',
                name: 'departmentId',
                label: 'Department',
                options: [
                  {
                    label: 'Engineering',
                    value: 'eng',
                    children: [{ label: 'Platform', value: 'platform' }],
                  },
                ],
              },
              {
                type: 'form-state-probe',
                name: 'departmentId',
              },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Department/ }));
    fireEvent.click(await screen.findByText('Platform'));

    await waitFor(() => {
      expect(JSON.parse(screen.getByTestId('form-state:departmentId').textContent ?? 'null')).toBe(
        'platform',
      );
    });
  });

  it('shows inline error text when source-backed tree-select options fail to load', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/tree-values.test.tsx#3"
        schema={
          {
            type: 'form',
            body: [
              {
                type: 'tree-select',
                name: 'departmentId',
                label: 'Department',
                options: {
                  type: 'source',
                  action: 'ajax',
                  args: {
                    url: '/api/tree-select-error',
                  },
                },
              },
            ],
          } as any
        }
        env={{
          ...env,
          fetcher: async function <T>(api: ApiSchema) {
            if (api.url === '/api/tree-select-error') {
              throw new Error('Tree select options failed');
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

    expect(await screen.findByText('Tree select options failed')).toBeTruthy();
  });

  it('selects a value in input-tree radio mode after expanding a collapsed parent', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, formStateProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/tree-values.test.tsx#4"
        schema={
          {
            type: 'form',
            data: { dept: '' },
            body: [
              {
                type: 'input-tree',
                name: 'dept',
                label: 'Dept',
                treeMode: 'radio',
                options: [
                  {
                    label: 'Engineering',
                    value: 'eng',
                    children: [{ label: 'Frontend', value: 'frontend', children: [] }],
                  },
                ],
              },
              {
                type: 'form-state-probe',
                name: 'dept',
              },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Engineering')).toBeTruthy();
      expect(screen.getByText('Frontend')).toBeTruthy();
    });

    const collapseBtn = screen.getAllByLabelText('Collapse')[0];
    fireEvent.click(collapseBtn);

    await waitFor(() => {
      expect(screen.queryByText('Frontend')).toBeNull();
    });

    const expandBtn = screen.getAllByLabelText('Expand')[0];
    fireEvent.click(expandBtn);

    await waitFor(() => {
      expect(screen.getByText('Frontend')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Frontend'));

    await waitFor(() => {
      expect(JSON.parse(screen.getByTestId('form-state:dept').textContent ?? 'null')).toBe(
        'frontend',
      );
    });
  });

  it('does not mutate tree-select value when rendered readOnly', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, formStateProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/tree-values.test.tsx#readonly"
        schema={
          {
            type: 'form',
            data: {
              departmentId: 'eng',
            },
            body: [
              {
                type: 'tree-select',
                name: 'departmentId',
                label: 'Department',
                readOnly: true,
                options: [
                  {
                    label: 'Engineering',
                    value: 'eng',
                    children: [{ label: 'Platform', value: 'platform' }],
                  },
                ],
              },
              {
                type: 'form-state-probe',
                name: 'departmentId',
              },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const trigger = screen.getByRole('button', { name: /Department/ });
    expect(trigger.getAttribute('disabled')).not.toBeNull();
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(JSON.parse(screen.getByTestId('form-state:departmentId').textContent ?? 'null')).toBe(
        'eng',
      );
    });
    expect(screen.queryByText('Platform')).toBeNull();
  });
});
