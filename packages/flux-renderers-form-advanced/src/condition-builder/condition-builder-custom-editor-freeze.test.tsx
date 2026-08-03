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
 * C3.3 P1-2 regression: custom value editors (field.type === 'custom' with a
 * nested Flux schema) must freeze when the builder umbrella is disabled.
 * Before the fix CustomValueEditorHost injected Form/Scope/Validation contexts
 * but not FormLayoutContext, so the nested editor stayed interactive: form-mode
 * writes leaked into the store and scope-mode writes hit the readOnly
 * projected owner scope and threw (audit probe C red before fix).
 *
 * DOM contract per the composite-family precedent (C3.1 P1-2): the browser
 * blocks typing into a readonly input; jsdom's fireEvent bypasses the gate, so
 * the unit tests pin the readonly attribute and the no-event programmatic
 * value assignment, while the real-browser write-block is asserted by the
 * host scenario (c3-3-host-surfaces.spec.ts host-cb-custom).
 */
const allDefs = [
  ...basicRendererDefinitions,
  ...formRendererDefinitions,
  ...formAdvancedRendererDefinitions,
  formStateProbeRenderer,
  scopeStateProbeRenderer,
];

const customField = {
  name: 'note',
  label: 'Note',
  type: 'custom',
  operators: ['equal'],
  value: { type: 'input-text', name: 'value', placeholder: 'Custom note' },
};

describe('C3.3 condition-builder custom editor freeze (P1-2)', () => {
  it('renders a readonly custom editor input under disabled', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer(allDefs);
    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/condition-builder/custom-freeze#1"
        schema={
          {
            type: 'form',
            data: {
              filters: {
                id: 'root',
                conjunction: 'and',
                children: [{ id: 'i1', left: { type: 'field', field: 'note' }, op: 'equal', right: 'keep' }],
              },
            },
            body: [
              {
                type: 'condition-builder',
                name: 'filters',
                label: 'Filters',
                disabled: true,
                fields: [customField],
              },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const customInput = (await screen.findByPlaceholderText('Custom note')) as HTMLInputElement;
    expect(customInput.hasAttribute('readonly')).toBe(true);
  });

  it('renders a readonly custom editor input under readOnly (umbrella P1-1 fold-in)', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer(allDefs);
    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/condition-builder/custom-freeze#1r"
        schema={
          {
            type: 'form',
            data: {
              filters: {
                id: 'root',
                conjunction: 'and',
                children: [{ id: 'i1', left: { type: 'field', field: 'note' }, op: 'equal', right: 'keep' }],
              },
            },
            body: [
              {
                type: 'condition-builder',
                name: 'filters',
                label: 'Filters',
                readOnly: true,
                fields: [customField],
              },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const customInput = (await screen.findByPlaceholderText('Custom note')) as HTMLInputElement;
    expect(customInput.hasAttribute('readonly')).toBe(true);
  });

  it('programmatic value assignment without events does not land in form state under disabled', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer(allDefs);
    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/condition-builder/custom-freeze#2"
        schema={
          {
            type: 'form',
            data: {
              filters: {
                id: 'root',
                conjunction: 'and',
                children: [{ id: 'i1', left: { type: 'field', field: 'note' }, op: 'equal', right: 'keep' }],
              },
            },
            body: [
              {
                type: 'condition-builder',
                name: 'filters',
                label: 'Filters',
                disabled: true,
                fields: [customField],
              },
              { type: 'form-state-probe', name: 'filters' },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const customInput = (await screen.findByPlaceholderText('Custom note')) as HTMLInputElement;
    (customInput as { value: string }).value = 'HACKED';

    await waitFor(() => {
      const state = JSON.parse(screen.getByTestId('form-state:filters').textContent ?? 'null');
      expect(state.children[0].right).toBe('keep');
    });
  });

  it('control: custom editor is editable and writes back when enabled', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer(allDefs);
    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/condition-builder/custom-freeze#3"
        schema={
          {
            type: 'form',
            data: {
              filters: {
                id: 'root',
                conjunction: 'and',
                children: [{ id: 'i1', left: { type: 'field', field: 'note' }, op: 'equal', right: 'keep' }],
              },
            },
            body: [
              {
                type: 'condition-builder',
                name: 'filters',
                label: 'Filters',
                fields: [customField],
              },
              { type: 'form-state-probe', name: 'filters' },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const customInput = (await screen.findByPlaceholderText('Custom note')) as HTMLInputElement;
    expect(customInput.hasAttribute('readonly')).toBe(false);
    fireEvent.change(customInput, { target: { value: 'typed' } });

    await waitFor(() => {
      const state = JSON.parse(screen.getByTestId('form-state:filters').textContent ?? 'null');
      expect(state.children[0].right).toBe('typed');
    });
  });
});
