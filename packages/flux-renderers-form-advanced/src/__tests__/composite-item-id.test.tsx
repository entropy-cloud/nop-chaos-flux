import React from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { formAdvancedRendererDefinitions } from '../index.js';
import { env, formStateProbeRenderer } from '@nop-chaos/flux-renderers-form/test-support';

const allFormDefs = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];

describe('composite editor hidden ids', () => {
  it('adds array-editor items with collision-free hidden ids after a remove', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, formStateProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/composite-item-id.test.tsx#1"
        schema={{
          type: 'form',
          data: {
            reviewers: [
              { id: 'item-1', value: 'alice' },
              { id: 'item-3', value: 'carol' },
            ],
          },
          body: [
            {
              type: 'array-editor',
              name: 'reviewers',
              label: 'Reviewers',
              itemLabel: 'Reviewer',
            },
            {
              type: 'form-state-probe',
              name: 'reviewers',
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    fireEvent.click(screen.getAllByText('Remove')[0]);
    fireEvent.click(screen.getByText('Add item'));

    await waitFor(() => {
      expect(
        JSON.parse(screen.getByTestId('form-state:reviewers').textContent ?? 'null'),
      ).toMatchObject([
        { id: 'item-1', value: 'alice' },
        { id: 'item-3', value: 'carol' },
        { id: 'item-4', value: '' },
      ]);
    });
  });

  it('adds key-value entries with collision-free hidden ids after a remove', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, formStateProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/composite-item-id.test.tsx#2"
        schema={{
          type: 'form',
          data: {
            metadata: [
              { id: 'pair-1', key: 'env', value: 'prod' },
              { id: 'pair-3', key: 'region', value: 'us-east' },
            ],
          },
          body: [
            {
              type: 'key-value',
              name: 'metadata',
              label: 'Metadata',
              addLabel: 'Add metadata entry',
            },
            {
              type: 'form-state-probe',
              name: 'metadata',
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    fireEvent.click(screen.getAllByText('Remove')[0]);
    fireEvent.click(screen.getByText('Add metadata entry'));

    await waitFor(() => {
      expect(
        JSON.parse(screen.getByTestId('form-state:metadata').textContent ?? 'null'),
      ).toMatchObject([
        { id: 'pair-3', key: 'region', value: 'us-east' },
        { id: 'pair-2', key: '', value: '' },
      ]);
    });
  });
});
