import React from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { env } from '../test-support.js';
import { allFormDefs } from './tree-checkbox-fields-test-helpers.js';

describe('tree controls - UI markers, slots, and collapse/expand', () => {
  it('lets FieldFrame own tree control field chrome while tree controls publish control slots', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-tree-ui-markers.test.tsx#1"
        schema={
          {
            type: 'form',
            body: [
              {
                type: 'input-tree',
                name: 'categoryIds',
                label: 'Categories',
                treeMode: 'checkbox',
                options: [{ label: 'Runtime', value: 'runtime' }],
              },
              {
                type: 'tree-select',
                name: 'departmentId',
                label: 'Department',
                options: [{ label: 'Platform', value: 'platform' }],
              },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const inputTreeField = document
      .querySelector('[role="checkbox"][aria-label="Runtime"]')
      ?.closest('.nop-field');
    expect(inputTreeField).toBeTruthy();
    expect(inputTreeField?.querySelector('[data-slot="field-label"]')?.textContent).toContain(
      'Categories',
    );
    expect(inputTreeField?.querySelector('[data-slot="input-tree-control"]')?.className).toContain(
      'nop-input-tree',
    );
    expect(inputTreeField?.querySelector('[data-slot="input-tree-control"]')).toBeTruthy();
    expect(inputTreeField?.querySelector('[data-slot="input-tree-options"]')).toBeTruthy();
    expect(inputTreeField?.querySelector('[data-slot="tree-option-list"]')).toBeTruthy();
    expect(inputTreeField?.querySelector('[data-slot="tree-option-items"]')).toBeTruthy();

    const treeSelectField = screen
      .getByRole('button', { name: /Department/ })
      .closest('.nop-field');
    expect(treeSelectField).toBeTruthy();
    expect(treeSelectField?.querySelector('[data-slot="field-label"]')?.textContent).toContain(
      'Department',
    );
    expect(treeSelectField?.querySelector('[data-slot="tree-select-control"]')?.className).toContain(
      'nop-tree-select',
    );
    expect(treeSelectField?.querySelector('[data-slot="tree-select-control"]')).toBeTruthy();
    expect(treeSelectField?.querySelector('[data-slot="tree-select-value"]')).toBeTruthy();
    expect(treeSelectField?.querySelector('[data-slot="tree-select-icons"]')).toBeTruthy();
  });

  it('publishes tree search and popover option structure through data-slot markers', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-tree-ui-markers.test.tsx#2"
        schema={
          {
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
                    children: [{ label: 'Platform', value: 'platform' }],
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

    await waitFor(() => {
      expect(document.querySelector('[data-slot="tree-option-search"]')).toBeTruthy();
      expect(document.querySelector('[data-slot="tree-option-items"]')).toBeTruthy();
      expect(document.querySelector('[data-slot="tree-option-list"]')).toBeTruthy();
    });

    expect(screen.getByRole('textbox', { name: 'Search Department' })).toBeTruthy();
  });

  it('moves actual tree focus and aria-activedescendant during keyboard navigation', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-tree-ui-markers.test.tsx#focus"
        schema={
          {
            type: 'form',
            body: [
              {
                type: 'input-tree',
                name: 'category',
                label: 'Category',
                options: [
                  { label: 'Platform', value: 'platform' },
                  { label: 'Design', value: 'design' },
                ],
              },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const tree = document.querySelector('[data-slot="tree-option-items"]') as HTMLElement;
    const firstItem = screen.getByRole('treeitem', { name: /Platform/ });
    const secondItem = screen.getByRole('treeitem', { name: /Design/ });

    firstItem.focus();
    fireEvent.keyDown(firstItem, { key: 'ArrowDown' });

    await waitFor(() => {
      expect(document.activeElement).toBe(secondItem);
      expect(tree.getAttribute('aria-activedescendant')).toBe(secondItem.id);
    });
  });

  it('collapses and expands input-tree child nodes via the chevron toggle', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-tree-ui-markers.test.tsx#3"
        schema={
          {
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
                      { label: 'Compiler', value: 'compiler' },
                    ],
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

    await waitFor(() => {
      expect(screen.getByText('Platform')).toBeTruthy();
      expect(screen.getByText('Runtime')).toBeTruthy();
      expect(screen.getByText('Compiler')).toBeTruthy();
    });

    const collapseBtn = screen.getAllByLabelText('Collapse')[0];
    fireEvent.click(collapseBtn);

    await waitFor(() => {
      expect(screen.queryByText('Runtime')).toBeNull();
      expect(screen.queryByText('Compiler')).toBeNull();
    });
    expect(screen.getByText('Platform')).toBeTruthy();

    const expandBtn = screen.getAllByLabelText('Expand')[0];
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
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-tree-ui-markers.test.tsx#4"
        schema={
          {
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
                      { label: 'Backend', value: 'backend' },
                    ],
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

    await waitFor(() => {
      expect(screen.getByText('Engineering')).toBeTruthy();
      expect(screen.getByText('Frontend')).toBeTruthy();
      expect(screen.getByText('Backend')).toBeTruthy();
    });

    const collapseBtn = screen.getAllByLabelText('Collapse')[0];
    fireEvent.click(collapseBtn);

    await waitFor(() => {
      expect(screen.queryByText('Frontend')).toBeNull();
      expect(screen.queryByText('Backend')).toBeNull();
    });
    expect(screen.getByText('Engineering')).toBeTruthy();

    const expandBtn = screen.getAllByLabelText('Expand')[0];
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
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-tree-ui-markers.test.tsx#5"
        schema={
          {
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
                    children: [{ label: 'Frontend', value: 'frontend', children: [] }],
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
});
