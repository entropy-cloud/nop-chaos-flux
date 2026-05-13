import React from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { formAdvancedRendererDefinitions } from '../index.js';
import { env, formStateProbeRenderer } from '@nop-chaos/flux-renderers-form/test-support';

const allFormDefs = [
  ...basicRendererDefinitions,
  ...formRendererDefinitions,
  ...formAdvancedRendererDefinitions,
];

describe('tree controls source state and picker branches', () => {
  it('shows loading state and disables input-tree controls while options are loading', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer(allFormDefs);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-tree-control-source-states.test.tsx#1"
        schema={
          {
            type: 'form',
            body: [
              {
                type: 'input-tree',
                name: 'categoryIds',
                label: 'Categories',
                searchable: true,
                options: [{ label: 'Runtime', value: 'runtime' }],
                optionsSourceState: { loading: true },
              },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    expect(await screen.findByText('Loading...')).toBeTruthy();
    expect((screen.getByPlaceholderText('Search Categories') as HTMLInputElement).disabled).toBe(
      true,
    );
    expect(screen.getByRole('treeitem', { name: 'Runtime' }).tabIndex).toBe(-1);
  });

  it('renders object and fallback source errors for input-tree and tree-select', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer(allFormDefs);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-tree-control-source-states.test.tsx#2"
        schema={
          {
            type: 'form',
            body: [
              {
                type: 'input-tree',
                name: 'categoryIds',
                label: 'Categories',
                options: [{ label: 'Runtime', value: 'runtime' }],
                optionsSourceState: { status: 'error', error: { message: 'Input tree failed' } },
              },
              {
                type: 'tree-select',
                name: 'departmentId',
                label: 'Department',
                options: [{ label: 'Platform', value: 'platform' }],
                optionsSourceState: { status: 'error', error: { code: 500 } },
              },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const inputTreeError = await screen.findByText('Input tree failed');
    const treeSelectError = screen.getByText('Failed to load tree options.');
    expect(inputTreeError).toBeTruthy();
    expect(treeSelectError).toBeTruthy();
    expect(inputTreeError.getAttribute('id')).toBe('categoryIds-source-error');
    expect(treeSelectError.getAttribute('id')).toBe('departmentId-source-error');
    expect(screen.getByRole('button', { name: /Department/ }).getAttribute('aria-describedby')).toBe(
      'departmentId-source-error',
    );
    expect(
      screen.getByRole('button', { name: /Department/ }).getAttribute('aria-errormessage'),
    ).toBe('departmentId-source-error');
  });

  it('filters searchable tree options by child path labels and keeps matching parents visible', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer(allFormDefs);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-tree-control-source-states.test.tsx#3"
        schema={
          {
            type: 'form',
            body: [
              {
                type: 'tree-select',
                name: 'departmentId',
                label: 'Department',
                searchable: true,
                showPathLabel: true,
                options: [
                  {
                    label: 'Engineering',
                    value: 'eng',
                    children: [{ label: 'Platform', value: 'platform' }],
                  },
                  {
                    label: 'Design',
                    value: 'design',
                  },
                ],
              },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Department/ }));
    const search = await screen.findByPlaceholderText('Search Department');
    fireEvent.change(search, { target: { value: 'platform' } });

    await waitFor(() => {
      expect(screen.getByText('Engineering')).toBeTruthy();
      expect(screen.getByText('Engineering / Platform')).toBeTruthy();
      expect(screen.queryByText('Design')).toBeNull();
    });
  });

  it('supports clearable tree-select in checkbox mode and renders joined selected labels', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, formStateProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-tree-control-source-states.test.tsx#4"
        schema={
          {
            type: 'form',
            data: { departmentIds: [] },
            body: [
              {
                type: 'tree-select',
                name: 'departmentIds',
                label: 'Departments',
                treeMode: 'checkbox',
                clearable: true,
                options: [
                  { label: 'Platform', value: 'platform' },
                  { label: 'Design', value: 'design' },
                ],
              },
              {
                type: 'form-state-probe',
                name: 'departmentIds',
              },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Departments/ }));
    fireEvent.click(await screen.findByRole('treeitem', { name: 'Platform' }));
    fireEvent.click(screen.getByRole('treeitem', { name: 'Design' }));

    await waitFor(() => {
      expect(screen.getByText('Platform, Design')).toBeTruthy();
      expect(
        JSON.parse(screen.getByTestId('form-state:departmentIds').textContent ?? 'null'),
      ).toEqual(['platform', 'design']);
    });

    const checkboxes = document.querySelectorAll('[data-slot="tree-option-node"] [role="checkbox"]');
    expect(Array.from(checkboxes).every((checkbox) => checkbox.getAttribute('tabindex') === '-1')).toBe(true);
    expect(Array.from(checkboxes).every((checkbox) => checkbox.getAttribute('aria-hidden') === 'true')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    await waitFor(() => {
      expect(
        JSON.parse(screen.getByTestId('form-state:departmentIds').textContent ?? 'null'),
      ).toEqual([]);
    });
  });

  it('uses the placeholder when tree-select has no selection', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer(allFormDefs);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-tree-control-source-states.test.tsx#5"
        schema={
          {
            type: 'form',
            body: [
              {
                type: 'tree-select',
                name: 'departmentId',
                label: 'Department',
                placeholder: 'Choose department',
                options: [{ label: 'Platform', value: 'platform' }],
              },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    expect(await screen.findByText('Choose department')).toBeTruthy();
  });
});
