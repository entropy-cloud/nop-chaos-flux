import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import {
  buttonRenderer,
  env,
} from '../test-support.js';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { formAdvancedRendererDefinitions } from '../index.js';

const allFormDefs = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];

describe('key-value composite-editor validation parity (H25/H27)', () => {
  it('shows an inline per-row duplicate-key error on the offending rows (H25)', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-array-validation-h25-h27.test.tsx#h25-inline"
        schema={{
          type: 'form',
          showErrorOn: ['touched', 'submit'],
          data: {
            metadata: [
              { key: 'env', value: 'prod' },
              { key: 'env', value: 'stage' },
            ],
          },
          body: [
            {
              type: 'key-value',
              name: 'metadata',
              label: 'Metadata',
              uniqueKeys: true,
            },
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit inline',
              onClick: { action: 'submitForm' },
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    fireEvent.click(screen.getByText('Submit inline'));
    // The offending rows each get an inline key error (not only the aggregate).
    expect(await screen.findAllByText('Entry 1 key must be unique')).toBeTruthy();
    expect(screen.getByText('Entry 2 key must be unique')).toBeTruthy();
  });

  it('does not publish key-value validation on remove when validateOn is submit (H27)', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-array-validation-h25-h27.test.tsx#h27-validateon"
        schema={{
          type: 'form',
          showErrorOn: ['touched', 'submit'],
          validateOn: ['submit'],
          data: {
            metadata: [
              { key: 'env', value: 'prod' },
              { key: 'region', value: 'us-east' },
            ],
          },
          body: [
            {
              type: 'key-value',
              name: 'metadata',
              label: 'Metadata',
              minItems: 2,
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    // Removing a row drops below minItems=2. With validateOn:['submit'] the
    // removal must NOT immediately revalidate (parity with array-editor); the
    // minItems error appears only on submit.
    fireEvent.click(screen.getAllByRole('button', { name: /Remove entry/ })[0]);

    await waitFor(() => {
      expect(screen.queryByText('Metadata requires at least 2 entries')).toBeNull();
    });
  });
});
