import React from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { allFormDefs } from './form-tree-checkbox-fields.shared.js';
import {
  buttonRenderer,
  env,
  formStateProbeRenderer,
  scopeStateProbeRenderer,
  submitCalls,
} from '../test-support.js';

describe('checkbox-group values and scope-debug', () => {
  it('preserves non-string checkbox-group values in form state and submit payloads', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([
      ...formRendererDefinitions,
      buttonRenderer,
      formStateProbeRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/checkbox-groups-scope-debug.test.tsx#1"
        schema={
          {
            type: 'form',
            data: {
              flags: [0],
            },
            submitAction: {
              action: 'ajax',
              args: {
                url: '/api/flags',
                method: 'post',
              },
            },
            body: [
              {
                type: 'checkbox-group',
                name: 'flags',
                label: 'Flags',
                options: [
                  { label: 'Zero', value: 0 },
                  { label: 'False', value: false },
                ] as any,
              },
              {
                type: 'form-state-probe',
                name: 'flags',
              },
            ],
            actions: [
              {
                type: 'button',
                label: 'Submit flags',
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

    const zeroCheckbox = screen.getByRole('checkbox', { name: /Zero/ });
    const falseCheckbox = screen.getByRole('checkbox', { name: /False/ });

    expect(zeroCheckbox.hasAttribute('data-checked')).toBe(true);
    expect(falseCheckbox.hasAttribute('data-unchecked')).toBe(true);

    fireEvent.click(falseCheckbox);
    expect(JSON.parse(screen.getByTestId('form-state:flags').textContent ?? 'null')).toEqual([
      0,
      false,
    ]);

    fireEvent.click(screen.getByText('Submit flags'));

    await waitFor(() => {
      expect(submitCalls).toHaveLength(1);
    });

    expect(submitCalls[0]?.flags).toEqual([0, false]);

    fireEvent.click(zeroCheckbox);
    expect(JSON.parse(screen.getByTestId('form-state:flags').textContent ?? 'null')).toEqual([
      false,
    ]);
  });

  it('preserves checkbox-group values when updating plain scope data', () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, scopeStateProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/checkbox-groups-scope-debug.test.tsx#2"
        schema={
          [
            {
              type: 'checkbox-group',
              name: 'flags',
              label: 'Flags',
              options: [
                { label: 'Zero', value: 0 },
                { label: 'False', value: false },
              ],
            },
            {
              type: 'scope-state-probe',
              name: 'flags',
            },
          ] as any
        }
        data={{
          flags: [0],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const zeroCheckbox = screen.getByRole('checkbox', { name: /Zero/ });
    const falseCheckbox = screen.getByRole('checkbox', { name: /False/ });

    expect(zeroCheckbox.hasAttribute('data-checked')).toBe(true);
    expect(falseCheckbox.hasAttribute('data-unchecked')).toBe(true);

    fireEvent.click(falseCheckbox);
    expect(JSON.parse(screen.getByTestId('scope-state:flags').textContent ?? 'null')).toEqual([
      0,
      false,
    ]);

    fireEvent.click(zeroCheckbox);
    expect(JSON.parse(screen.getByTestId('scope-state:flags').textContent ?? 'null')).toEqual([
      false,
    ]);
  });

  it('lets scope-debug see full form data and rerender when form values change', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/checkbox-groups-scope-debug.test.tsx#3"
        schema={{
          type: 'form',
          data: {
            summary: {
              title: 'Annual Report 2025',
              pages: 48,
            },
          },
          body: [
            {
              type: 'input-text',
              name: 'summary.title',
              label: 'Title',
            },
            {
              type: 'scope-debug',
              title: 'Form Scope',
              defaultExpand: true,
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
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
});
