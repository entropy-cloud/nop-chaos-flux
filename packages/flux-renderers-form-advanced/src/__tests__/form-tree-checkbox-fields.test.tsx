import React from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ApiSchema } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { formAdvancedRendererDefinitions } from '../index';
import {
  buttonRenderer,
  env,
  formStateProbeRenderer,
  scopeStateProbeRenderer,
  submitCalls
} from '../../../flux-renderers-form/src/test-support';

const allFormDefs = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];

describe('formRendererDefinitions - tree controls, checkbox values, and scope debug', () => {
  it('submits input-tree values through the shared form field path', async () => {
    submitCalls.length = 0;
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-tree-checkbox-fields.test.tsx#1"
        schema={{
          type: 'form',
          data: {
            categoryIds: []
          },
          submitAction: {
            action: 'ajax',
            args: {
              url: '/api/categories',
              method: 'post'
            }
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
                  children: [{ label: 'Runtime', value: 'runtime' }]
                }
              ]
            }
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit categories',
              onClick: {
                action: 'submitForm'
              }
            }
          ]
        } as any}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'Runtime' }));
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
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-tree-checkbox-fields.test.tsx#2"
        schema={{
          type: 'form',
          data: {
            departmentId: ''
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
                  children: [{ label: 'Platform', value: 'platform' }]
                }
              ]
            },
            {
              type: 'form-state-probe',
              name: 'departmentId'
            }
          ]
        } as any}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Department/ }));
    fireEvent.click(await screen.findByText('Platform'));

    await waitFor(() => {
      expect(JSON.parse(screen.getByTestId('form-state:departmentId').textContent ?? 'null')).toBe('platform');
    });
  });

  it('shows inline error text when source-backed tree-select options fail to load', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-tree-checkbox-fields.test.tsx#3"
        schema={{
          type: 'form',
          body: [
            {
              type: 'tree-select',
              name: 'departmentId',
              label: 'Department',
              options: {
                type: 'source',
                action: 'ajax',
                api: {
                  url: '/api/tree-select-error'
                }
              }
            }
          ]
        } as any}
        env={{
          ...env,
          fetcher: async function <T>(api: ApiSchema) {
            if (api.url === '/api/tree-select-error') {
              throw new Error('Tree select options failed');
            }

            return {
              ok: true,
              status: 200,
              data: {} as T
            };
          }
        }}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    expect(await screen.findByText('Tree select options failed')).toBeTruthy();
  });

  it('lets FieldFrame own tree control field chrome while tree controls publish control slots', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-tree-checkbox-fields.test.tsx#4"
        schema={{
          type: 'form',
          body: [
            {
              type: 'input-tree',
              name: 'categoryIds',
              label: 'Categories',
              treeMode: 'checkbox',
              options: [{ label: 'Runtime', value: 'runtime' }]
            },
            {
              type: 'tree-select',
              name: 'departmentId',
              label: 'Department',
              options: [{ label: 'Platform', value: 'platform' }]
            }
          ]
        } as any}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    const inputTreeField = screen.getByRole('checkbox', { name: 'Runtime' }).closest('.nop-field');
    expect(inputTreeField).toBeTruthy();
    expect(inputTreeField?.querySelector('[data-slot="field-label"]')?.textContent).toContain('Categories');
    expect(inputTreeField?.querySelector('[data-slot="input-tree-control"]')).toBeTruthy();
    expect(inputTreeField?.querySelector('[data-slot="input-tree-options"]')).toBeTruthy();
    expect(inputTreeField?.querySelector('[data-slot="tree-option-list"]')).toBeTruthy();
    expect(inputTreeField?.querySelector('[data-slot="tree-option-items"]')).toBeTruthy();

    const treeSelectField = screen.getByRole('button', { name: /Department/ }).closest('.nop-field');
    expect(treeSelectField).toBeTruthy();
    expect(treeSelectField?.querySelector('[data-slot="field-label"]')?.textContent).toContain('Department');
    expect(treeSelectField?.querySelector('[data-slot="tree-select-control"]')).toBeTruthy();
    expect(treeSelectField?.querySelector('[data-slot="tree-select-value"]')).toBeTruthy();
    expect(treeSelectField?.querySelector('[data-slot="tree-select-icons"]')).toBeTruthy();
  });

  it('publishes tree search and popover option structure through data-slot markers', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-tree-checkbox-fields.test.tsx#5"
        schema={{
          type: 'form',
          body: [
            {
              type: 'tree-select',
              name: 'departmentId',
              label: 'Department',
              searchable: true,
              options: [
                {
                  label: 'Engineering',
                  value: 'eng',
                  children: [{ label: 'Platform', value: 'platform' }]
                }
              ]
            }
          ]
        } as any}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Department/ }));

    await waitFor(() => {
      expect(document.querySelector('[data-slot="tree-option-search"]')).toBeTruthy();
      expect(document.querySelector('[data-slot="tree-option-items"]')).toBeTruthy();
      expect(document.querySelector('[data-slot="tree-option-list"]')).toBeTruthy();
    });
  });

  it('preserves non-string checkbox-group values in form state and submit payloads', async () => {
    submitCalls.length = 0;
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer, formStateProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-tree-checkbox-fields.test.tsx#6"
        schema={{
          type: 'form',
          data: {
            flags: [0]
          },
          submitAction: {
            action: 'ajax',
            args: {
              url: '/api/flags',
              method: 'post'
            }
          },
          body: [
            {
              type: 'checkbox-group',
              name: 'flags',
              label: 'Flags',
              options: [
                { label: 'Zero', value: 0 },
                { label: 'False', value: false }
              ] as any
            },
            {
              type: 'form-state-probe',
              name: 'flags'
            }
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit flags',
              onClick: {
                action: 'submitForm'
              }
            }
          ]
        } as any}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    const zeroCheckbox = screen.getByRole('checkbox', { name: /Zero/ });
    const falseCheckbox = screen.getByRole('checkbox', { name: /False/ });

    expect(zeroCheckbox.hasAttribute('data-checked')).toBe(true);
    expect(falseCheckbox.hasAttribute('data-unchecked')).toBe(true);

    fireEvent.click(falseCheckbox);
    expect(JSON.parse(screen.getByTestId('form-state:flags').textContent ?? 'null')).toEqual([0, false]);

    fireEvent.click(screen.getByText('Submit flags'));

    await waitFor(() => {
      expect(submitCalls).toHaveLength(1);
    });

    expect(submitCalls[0]?.flags).toEqual([0, false]);

    fireEvent.click(zeroCheckbox);
    expect(JSON.parse(screen.getByTestId('form-state:flags').textContent ?? 'null')).toEqual([false]);
  });

  it('preserves checkbox-group values when updating plain scope data', () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, scopeStateProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-tree-checkbox-fields.test.tsx#7"
        schema={[
          {
            type: 'checkbox-group',
            name: 'flags',
            label: 'Flags',
            options: [
              { label: 'Zero', value: 0 },
              { label: 'False', value: false }
            ]
          },
          {
            type: 'scope-state-probe',
            name: 'flags'
          }
        ] as any}
        data={{
          flags: [0]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    const zeroCheckbox = screen.getByRole('checkbox', { name: /Zero/ });
    const falseCheckbox = screen.getByRole('checkbox', { name: /False/ });

    expect(zeroCheckbox.hasAttribute('data-checked')).toBe(true);
    expect(falseCheckbox.hasAttribute('data-unchecked')).toBe(true);

    fireEvent.click(falseCheckbox);
    expect(JSON.parse(screen.getByTestId('scope-state:flags').textContent ?? 'null')).toEqual([0, false]);

    fireEvent.click(zeroCheckbox);
    expect(JSON.parse(screen.getByTestId('scope-state:flags').textContent ?? 'null')).toEqual([false]);
  });

  it('lets scope-debug see full form data and rerender when form values change', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-tree-checkbox-fields.test.tsx#8"
        schema={{
          type: 'form',
          data: {
            summary: {
              title: 'Annual Report 2025',
              pages: 48
            }
          },
          body: [
            {
              type: 'input-text',
              name: 'summary.title',
              label: 'Title'
            },
            {
              type: 'scope-debug',
              title: 'Form Scope'
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    const debugJson = document.querySelector('[data-slot="scope-debug-json"]');
    expect(debugJson?.textContent).toContain('"summary"');
    expect(debugJson?.textContent).toContain('"title": "Annual Report 2025"');
    expect(debugJson?.textContent).toContain('"pages": 48');

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Annual Report 2026' } });

    await waitFor(() => {
      expect(debugJson?.textContent).toContain('"title": "Annual Report 2026"');
      expect(debugJson?.textContent).toContain('"pages": 48');
    });
  });

  it('collapses and expands input-tree child nodes via the chevron toggle', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-tree-checkbox-fields.test.tsx#9"
        schema={{
          type: 'form',
          body: [
            {
              type: 'input-tree',
              name: 'category',
              label: 'Category',
              treeMode: 'radio',
              options: [
                {
                  label: 'Platform',
                  value: 'platform',
                  children: [
                    { label: 'Runtime', value: 'runtime' },
                    { label: 'Compiler', value: 'compiler' }
                  ]
                }
              ]
            }
          ]
        } as any}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Platform')).toBeTruthy();
      expect(screen.getByText('Runtime')).toBeTruthy();
      expect(screen.getByText('Compiler')).toBeTruthy();
    });

    const collapseBtn = screen.getAllByLabelText('Collapse node')[0];
    fireEvent.click(collapseBtn);

    await waitFor(() => {
      expect(screen.queryByText('Runtime')).toBeNull();
      expect(screen.queryByText('Compiler')).toBeNull();
    });
    expect(screen.getByText('Platform')).toBeTruthy();

    const expandBtn = screen.getAllByLabelText('Expand node')[0];
    fireEvent.click(expandBtn);

    await waitFor(() => {
      expect(screen.getByText('Runtime')).toBeTruthy();
      expect(screen.getByText('Compiler')).toBeTruthy();
    });
  });

  it('collapses and expands tree-select child nodes via the chevron toggle', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-tree-checkbox-fields.test.tsx#10"
        schema={{
          type: 'form',
          body: [
            {
              type: 'tree-select',
              name: 'department',
              label: 'Department',
              options: [
                {
                  label: 'Engineering',
                  value: 'eng',
                  children: [
                    { label: 'Frontend', value: 'frontend' },
                    { label: 'Backend', value: 'backend' }
                  ]
                }
              ]
            }
          ]
        } as any}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Department/ }));

    await waitFor(() => {
      expect(screen.getByText('Engineering')).toBeTruthy();
      expect(screen.getByText('Frontend')).toBeTruthy();
      expect(screen.getByText('Backend')).toBeTruthy();
    });

    const collapseBtn = screen.getAllByLabelText('Collapse node')[0];
    fireEvent.click(collapseBtn);

    await waitFor(() => {
      expect(screen.queryByText('Frontend')).toBeNull();
      expect(screen.queryByText('Backend')).toBeNull();
    });
    expect(screen.getByText('Engineering')).toBeTruthy();

    const expandBtn = screen.getAllByLabelText('Expand node')[0];
    fireEvent.click(expandBtn);

    await waitFor(() => {
      expect(screen.getByText('Frontend')).toBeTruthy();
      expect(screen.getByText('Backend')).toBeTruthy();
    });
  });

  it('renders input-tree with correct data-depth and data-slot markers on option nodes', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-tree-checkbox-fields.test.tsx#11"
        schema={{
          type: 'form',
          body: [
            {
              type: 'input-tree',
              name: 'teams',
              label: 'Teams',
              treeMode: 'checkbox',
              options: [
                {
                  label: 'Engineering',
                  value: 'eng',
                  children: [
                    { label: 'Frontend', value: 'frontend', children: [] }
                  ]
                }
              ]
            }
          ]
        } as any}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Engineering')).toBeTruthy();
      expect(screen.getByText('Frontend')).toBeTruthy();
    });

    const optionNodes = document.querySelectorAll('[data-slot="tree-option-node"]');
    expect(optionNodes.length).toBeGreaterThanOrEqual(2);

    const depthValues = Array.from(optionNodes).map((el) => el.getAttribute('data-depth'));
    expect(depthValues).toContain('0');
    expect(depthValues).toContain('1');
  });

  it('selects a value in input-tree radio mode after expanding a collapsed parent', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, formStateProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-tree-checkbox-fields.test.tsx#12"
        schema={{
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
                  children: [
                    { label: 'Frontend', value: 'frontend', children: [] }
                  ]
                }
              ]
            },
            {
              type: 'form-state-probe',
              name: 'dept'
            }
          ]
        } as any}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Engineering')).toBeTruthy();
      expect(screen.getByText('Frontend')).toBeTruthy();
    });

    const collapseBtn = screen.getAllByLabelText('Collapse node')[0];
    fireEvent.click(collapseBtn);

    await waitFor(() => {
      expect(screen.queryByText('Frontend')).toBeNull();
    });

    const expandBtn = screen.getAllByLabelText('Expand node')[0];
    fireEvent.click(expandBtn);

    await waitFor(() => {
      expect(screen.getByText('Frontend')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Frontend'));

    await waitFor(() => {
      expect(JSON.parse(screen.getByTestId('form-state:dept').textContent ?? 'null')).toBe('frontend');
    });
  });

});
