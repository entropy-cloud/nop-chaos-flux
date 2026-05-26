import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import {
  env,
  formStateProbeRenderer,
  scopeStateProbeRenderer,
} from '../test-support.js';
import { formAdvancedRendererDefinitions } from '../index.js';

const allDefs = [
  ...basicRendererDefinitions,
  ...formRendererDefinitions,
  ...formAdvancedRendererDefinitions,
  formStateProbeRenderer,
  scopeStateProbeRenderer,
];

describe('condition-builder renderer integration', () => {
  it('uses picker placeholder and selected condition count in picker mode', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer(allDefs);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/condition-builder/condition-builder-renderer.test.tsx#1"
        schema={
          {
            type: 'form',
            data: {
              filters: { id: 'root', conjunction: 'and', children: [] },
            },
            body: [
              {
                type: 'condition-builder',
                name: 'filters',
                label: 'Filters',
                embed: false,
                placeholder: 'Choose filters',
                fields: [{ name: 'status', label: 'Status', type: 'text' }],
              },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    expect(await screen.findByText('Choose filters')).toBeTruthy();

    cleanup();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/condition-builder/condition-builder-renderer.test.tsx#1b"
        schema={
          {
            type: 'form',
            data: {
              filters: {
                id: 'root',
                conjunction: 'and',
                children: [
                  {
                    id: 'item-1',
                    left: { type: 'field', field: 'status' },
                    op: 'equal',
                    right: 'active',
                  },
                ],
              },
            },
            body: [
              {
                type: 'condition-builder',
                name: 'filters',
                label: 'Filters',
                embed: false,
                placeholder: 'Choose filters',
                fields: [{ name: 'status', label: 'Status', type: 'text' }],
              },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    expect(await screen.findByText('1 conditions')).toBeTruthy();
  });

  it('updates form state when adding a condition in embedded mode', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer(allDefs);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/condition-builder/condition-builder-renderer.test.tsx#2"
        schema={
          {
            type: 'form',
            data: {
              filters: { id: 'root', conjunction: 'and', children: [] },
            },
            body: [
              {
                type: 'condition-builder',
                name: 'filters',
                label: 'Filters',
                fields: [{ name: 'status', label: 'Status', type: 'text' }],
              },
              {
                type: 'form-state-probe',
                name: 'filters',
              },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    fireEvent.click(await screen.findByText('Add condition'));

    await waitFor(() => {
      expect(
        JSON.parse(screen.getByTestId('form-state:filters').textContent ?? 'null'),
      ).toMatchObject({
        children: [
          {
            left: { field: 'status', type: 'field' },
            op: 'equal',
          },
        ],
      });
    });
  });

  it('updates page scope when used without a form owner', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer(allDefs);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/condition-builder/condition-builder-renderer.test.tsx#3"
        schema={
          {
            type: 'page',
            body: [
              {
                type: 'condition-builder',
                name: 'filters',
                label: 'Filters',
                fields: [{ name: 'status', label: 'Status', type: 'text' }],
              },
              {
                type: 'scope-state-probe',
                name: 'filters',
              },
            ],
          } as any
        }
        data={{
          filters: { id: 'root', conjunction: 'and', children: [] },
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    fireEvent.click(await screen.findByText('Add condition'));

    await waitFor(() => {
      expect(
        JSON.parse(screen.getByTestId('scope-state:filters').textContent ?? 'null'),
      ).toMatchObject({
        children: [
          {
            left: { field: 'status', type: 'field' },
            op: 'equal',
          },
        ],
      });
    });
  });

  it('disables picker trigger while the field is disabled', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer(allDefs);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/condition-builder/condition-builder-renderer.test.tsx#4"
        schema={
          {
            type: 'form',
            data: {
              filters: { id: 'root', conjunction: 'and', children: [] },
            },
            body: [
              {
                type: 'condition-builder',
                name: 'filters',
                label: 'Filters',
                embed: false,
                disabled: true,
                fields: [{ name: 'status', label: 'Status', type: 'text' }],
              },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const trigger = await screen.findByRole('button', { name: 'Click to configure conditions' });
    expect((trigger as HTMLButtonElement).disabled).toBe(true);
  });

  it('does not trigger internal add-condition action when the wrapped field shell is clicked', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer(allDefs);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/condition-builder/condition-builder-renderer.test.tsx#5"
        schema={
          {
            type: 'form',
            data: {
              filters: { id: 'root', conjunction: 'and', children: [] },
            },
            body: [
              {
                type: 'condition-builder',
                name: 'filters',
                label: 'Filters',
                fields: [{ name: 'status', label: 'Status', type: 'text' }],
              },
              {
                type: 'form-state-probe',
                name: 'filters',
              },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const field = (await screen.findByText('Add condition')).closest('.nop-field');
    expect(field).toBeTruthy();

    fireEvent.click(field!);

    expect(
      JSON.parse(screen.getByTestId('form-state:filters').textContent ?? 'null'),
    ).toMatchObject({
      children: [],
    });
  });

  it('applies root meta attributes in picker mode', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer(allDefs);

    const view = render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/condition-builder/condition-builder-renderer.test.tsx#6"
        schema={
          {
            type: 'form',
            data: {
              filters: { id: 'root', conjunction: 'and', children: [] },
            },
            body: [
              {
                type: 'condition-builder',
                name: 'filters',
                label: 'Filters',
                embed: false,
                className: 'custom-picker-root',
                testid: 'picker-root',
                fields: [{ name: 'status', label: 'Status', type: 'text' }],
              },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const fieldRoot = view.container.querySelector('.nop-field[data-testid="picker-root"]');
    expect(fieldRoot).toBeTruthy();
    expect(fieldRoot?.getAttribute('data-cid')).toBeTruthy();

    const pickerRoot = view.container.querySelector('.nop-condition-builder.custom-picker-root');
    expect(pickerRoot).toBeTruthy();
    expect(pickerRoot?.getAttribute('data-testid')).toBeNull();
    expect(pickerRoot?.getAttribute('data-cid')).toBeNull();
  });

  it('does not mutate form state when rendered readOnly', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer(allDefs);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/condition-builder/condition-builder-renderer.test.tsx#readonly"
        schema={
          {
            type: 'form',
            data: {
              filters: { id: 'root', conjunction: 'and', children: [] },
            },
            body: [
              {
                type: 'condition-builder',
                name: 'filters',
                label: 'Filters',
                readOnly: true,
                fields: [{ name: 'status', label: 'Status', type: 'text' }],
              },
              {
                type: 'form-state-probe',
                name: 'filters',
              },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    fireEvent.click(await screen.findByText('Add condition'));

    await waitFor(() => {
      expect(
        JSON.parse(screen.getByTestId('form-state:filters').textContent ?? 'null'),
      ).toMatchObject({
        children: [],
      });
    });
  });

  it('publishes pressed state for conjunction toggles and an accessible remove-group action', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer(allDefs);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/condition-builder/condition-builder-renderer.test.tsx#a11y"
        schema={
          {
            type: 'form',
            data: {
              filters: {
                id: 'root',
                conjunction: 'and',
                children: [{ id: 'group-1', conjunction: 'or', children: [] }],
              },
            },
            body: [
              {
                type: 'condition-builder',
                name: 'filters',
                label: 'Filters',
                fields: [{ name: 'status', label: 'Status', type: 'text' }],
              },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const andButtons = screen.getAllByRole('button', { name: 'AND' });
    const orButtons = screen.getAllByRole('button', { name: 'OR' });
    expect(andButtons[0].getAttribute('aria-pressed')).toBe('true');
    expect(orButtons[0].getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('button', { name: 'Remove group' })).toBeTruthy();
  });
});
