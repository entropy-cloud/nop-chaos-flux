import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { env, formStateProbeRenderer, scopeStateProbeRenderer } from '../test-support.js';
import { formAdvancedRendererDefinitions } from '../index.js';

/**
 * C3.3 P1-1 regression: the `disabled` umbrella must fold in `readOnly`
 * (component-level schema prop AND form-level `static:true` via
 * FormLayoutContext.staticReadOnly). Before the fix the whole builder chrome
 * stayed interactive under readOnly: form-mode writes were silently dropped by
 * the controller and scope-mode custom-editor writes could throw on the
 * readOnly projected owner scope — a four-state contract violation
 * (audit probes A/B red before fix).
 */
const allDefs = [
  ...basicRendererDefinitions,
  ...formRendererDefinitions,
  ...formAdvancedRendererDefinitions,
  formStateProbeRenderer,
  scopeStateProbeRenderer,
];

describe('C3.3 condition-builder readOnly umbrella (P1-1)', () => {
  it('disables every mutation affordance when schema readOnly is set', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer(allDefs);
    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/condition-builder/readonly-umbrella#1"
        schema={
          {
            type: 'form',
            data: { filters: { id: 'root', conjunction: 'and', children: [] } },
            body: [
              {
                type: 'condition-builder',
                name: 'filters',
                label: 'Filters',
                readOnly: true,
                fields: [{ name: 'status', label: 'Status', type: 'text' }],
              },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const addBtn = await screen.findByRole('button', { name: 'Add condition' });
    expect(addBtn.hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Add group' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'AND' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'OR' }).hasAttribute('disabled')).toBe(true);
  });

  it('folds form-level static readOnly into the umbrella', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer(allDefs);
    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/condition-builder/readonly-umbrella#2"
        schema={
          {
            type: 'form',
            static: true,
            data: { filters: { id: 'root', conjunction: 'and', children: [] } },
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

    const addBtn = await screen.findByRole('button', { name: 'Add condition' });
    expect(addBtn.hasAttribute('disabled')).toBe(true);
  });

  it('disables value inputs under readOnly', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer(allDefs);
    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/condition-builder/readonly-umbrella#3"
        schema={
          {
            type: 'form',
            data: {
              filters: {
                id: 'root',
                conjunction: 'and',
                children: [{ id: 'i1', left: { type: 'field', field: 'status' }, op: 'equal', right: 'a' }],
              },
            },
            body: [
              {
                type: 'condition-builder',
                name: 'filters',
                label: 'Filters',
                readOnly: true,
                fields: [{ name: 'status', label: 'Status', type: 'text' }],
              },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const valueInput = await screen.findByLabelText('Condition value');
    expect((valueInput as HTMLInputElement).hasAttribute('disabled')).toBe(true);
  });

  it('does not mutate form state when readOnly chrome is clicked', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer(allDefs);
    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/condition-builder/readonly-umbrella#4"
        schema={
          {
            type: 'form',
            data: { filters: { id: 'root', conjunction: 'and', children: [] } },
            body: [
              {
                type: 'condition-builder',
                name: 'filters',
                label: 'Filters',
                readOnly: true,
                fields: [{ name: 'status', label: 'Status', type: 'text' }],
              },
              { type: 'form-state-probe', name: 'filters' },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const addBtn = await screen.findByRole('button', { name: 'Add condition' });
    fireEvent.click(addBtn);
    fireEvent.click(screen.getByRole('button', { name: 'Add group' }));

    await waitFor(() => {
      expect(
        JSON.parse(screen.getByTestId('form-state:filters').textContent ?? 'null'),
      ).toMatchObject({ children: [] });
    });
  });

  it('control: the same affordances are enabled when readOnly is absent', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer(allDefs);
    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/condition-builder/readonly-umbrella#5"
        schema={
          {
            type: 'form',
            data: { filters: { id: 'root', conjunction: 'and', children: [] } },
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

    const addBtn = await screen.findByRole('button', { name: 'Add condition' });
    expect(addBtn.hasAttribute('disabled')).toBe(false);
  });
});
