import React from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { formAdvancedRendererDefinitions } from '../index';
import { buttonRenderer, env, formStateProbeRenderer, submitCalls } from '../../../flux-renderers-form/src/test-support';

const allFormDefs = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];

describe('formRendererDefinitions - array and key-value validation', () => {
  it('supports array-level minItems validation in the UI', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-array-validation.test.tsx#1"
        schema={{
          type: 'form',
          showErrorOn: ['touched', 'submit'],
          data: {
            reviewers: []
          },
          body: [
            {
              type: 'array-editor',
              name: 'reviewers',
              label: 'Reviewers',
              itemLabel: 'Reviewer',
              minItems: 1
            }
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit reviewers',
              onClick: {
                action: 'submitForm'
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.click(screen.getByText('Submit reviewers'));
    expect(await screen.findByText('Reviewers must contain at least 1 item(s)')).toBeTruthy();

    fireEvent.click(screen.getByText('Add item'));
    fireEvent.change(screen.getByPlaceholderText('Reviewer 1'), { target: { value: 'alice' } });

    await waitFor(() => {
      expect(screen.queryByText('Reviewers must contain at least 1 item(s)')).toBeNull();
    });
  });

  it('supports array-level maxItems validation in the UI', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-array-validation.test.tsx#2"
        schema={{
          type: 'form',
          showErrorOn: ['touched', 'submit'],
          data: {
            reviewers: [{ value: 'alice' }, { value: 'bob' }]
          },
          body: [
            {
              type: 'array-editor',
              name: 'reviewers',
              label: 'Reviewers',
              itemLabel: 'Reviewer',
              maxItems: 1
            }
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit limited reviewers',
              onClick: {
                action: 'submitForm'
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.click(screen.getByText('Submit limited reviewers'));
    expect(await screen.findByText('Reviewers must contain at most 1 item(s)')).toBeTruthy();

    fireEvent.click(screen.getAllByText('Remove')[1]);

    await waitFor(() => {
      expect(screen.queryByText('Reviewers must contain at most 1 item(s)')).toBeNull();
    });
  });

  it('preserves remaining array-editor values after removing a middle item', async () => {
    submitCalls.length = 0;
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer, formStateProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-array-validation.test.tsx#3"
        schema={{
          type: 'form',
          showErrorOn: ['touched', 'submit'],
          data: {
            reviewers: [{ value: 'alice' }, { value: 'bob' }, { value: 'carol' }]
          },
          submitAction: {
            action: 'ajax',
            args: {
              url: '/api/reviewers/reordered',
              method: 'post'
            }
          },
          body: [
            {
              type: 'array-editor',
              name: 'reviewers',
              label: 'Reviewers',
              itemLabel: 'Reviewer'
            },
            {
              type: 'form-state-probe',
              name: 'reviewers'
            }
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit reordered reviewers',
              onClick: {
                action: 'submitForm'
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.click(screen.getAllByText('Remove')[1]);

    await waitFor(() => {
      expect(JSON.parse(screen.getByTestId('form-state:reviewers').textContent ?? 'null')).toMatchObject([
        { value: 'alice' },
        { value: 'bob' },
        { value: 'carol' }
      ]);
    });

    fireEvent.click(screen.getByText('Submit reordered reviewers'));

    await waitFor(() => {
      expect(submitCalls).toHaveLength(1);
    });

    expect(screen.queryByText('Reviewers requires at least one item')).toBeNull();
    expect(submitCalls[0].reviewers).toHaveLength(3);
    expect(submitCalls[0]).toMatchObject({
      reviewers: [{ value: 'alice' }, { value: 'bob' }, { value: 'carol' }]
    });
  });

  it('supports aggregate atLeastOneFilled validation in the UI', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-array-validation.test.tsx#4"
        schema={{
          type: 'form',
          showErrorOn: ['touched', 'submit'],
          data: {
            reviewers: [{ value: '' }, { value: '' }]
          },
          body: [
            {
              type: 'array-editor',
              name: 'reviewers',
              label: 'Reviewers',
              itemLabel: 'Reviewer',
              atLeastOneFilled: {
                itemPath: 'value',
                message: 'Add at least one reviewer value'
              }
            }
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit aggregate reviewers',
              onClick: {
                action: 'submitForm'
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.click(screen.getByText('Submit aggregate reviewers'));
    expect(await screen.findByText('Add at least one reviewer value')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('Reviewer 2'), { target: { value: 'bob' } });

    await waitFor(() => {
      expect(screen.queryByText('Add at least one reviewer value')).toBeNull();
    });
  });

  it('supports aggregate allOrNone validation in the UI', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-array-validation.test.tsx#5"
        schema={{
          type: 'form',
          showErrorOn: ['touched', 'submit'],
          data: {
            metadata: [{ key: 'env', value: '' }]
          },
          body: [
            {
              type: 'key-value',
              name: 'metadata',
              label: 'Metadata',
              allOrNone: {
                itemPaths: ['key', 'value'],
                message: 'Metadata entries must fill both key and value or leave both empty'
              }
            }
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit aggregate metadata',
              onClick: {
                action: 'submitForm'
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.click(screen.getByText('Submit aggregate metadata'));
    expect(await screen.findByText('Metadata entries must fill both key and value or leave both empty')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('Value'), { target: { value: 'prod' } });

    await waitFor(() => {
      expect(screen.queryByText('Metadata entries must fill both key and value or leave both empty')).toBeNull();
    });
  });

  it('clears stale child errors after removing a composite array row', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-array-validation.test.tsx#6"
        schema={{
          type: 'form',
          showErrorOn: ['touched', 'submit'],
          data: {
            reviewers: [{ value: 'alice' }, { value: '' }]
          },
          body: [
            {
              type: 'array-editor',
              name: 'reviewers',
              label: 'Reviewers',
              itemLabel: 'Reviewer'
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.focus(screen.getByPlaceholderText('Reviewer 2'));
    fireEvent.blur(screen.getByPlaceholderText('Reviewer 2'));

    expect(await screen.findByText('Reviewer 2 is required')).toBeTruthy();

    fireEvent.click(screen.getAllByText('Remove')[0]);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Reviewer 1')).toBeTruthy();
      expect(screen.getByPlaceholderText('Reviewer 2')).toBeTruthy();
    });
  });

  it('supports aggregate uniqueBy validation in the UI', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-array-validation.test.tsx#7"
        schema={{
          type: 'form',
          showErrorOn: ['touched', 'submit'],
          data: {
            metadata: [
              { key: 'env', value: 'prod' },
              { key: 'env', value: 'stage' }
            ]
          },
          body: [
            {
              type: 'key-value',
              name: 'metadata',
              label: 'Metadata',
              uniqueBy: {
                itemPath: 'key',
                message: 'Metadata keys must be unique'
              }
            }
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit unique metadata',
              onClick: {
                action: 'submitForm'
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.click(screen.getByText('Submit unique metadata'));
    expect(await screen.findByText('Metadata keys must be unique')).toBeTruthy();

    fireEvent.change(screen.getAllByPlaceholderText('Key')[1], { target: { value: 'tier' } });

    await waitFor(() => {
      expect(screen.queryByText('Metadata keys must be unique')).toBeNull();
    });
  });

  it('preserves remaining key-value entries after removing a middle row', async () => {
    submitCalls.length = 0;
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer, formStateProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-array-validation.test.tsx#8"
        schema={{
          type: 'form',
          showErrorOn: ['touched', 'submit'],
          data: {
            metadata: [
              { key: 'env', value: 'prod' },
              { key: 'tier', value: 'gold' },
              { key: 'region', value: 'us-east' }
            ]
          },
          submitAction: {
            action: 'ajax',
            args: {
              url: '/api/metadata/reordered',
              method: 'post'
            }
          },
          body: [
            {
              type: 'key-value',
              name: 'metadata',
              label: 'Metadata',
              addLabel: 'Add metadata entry'
            },
            {
              type: 'form-state-probe',
              name: 'metadata'
            }
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit reordered metadata',
              onClick: {
                action: 'submitForm'
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.click(screen.getAllByText('Remove')[1]);

    await waitFor(() => {
      expect(JSON.parse(screen.getByTestId('form-state:metadata').textContent ?? 'null')).toMatchObject([
        { key: 'env', value: 'prod' },
        { key: 'tier', value: 'gold' },
        { key: 'region', value: 'us-east' }
      ]);
    });

    fireEvent.click(screen.getByText('Submit reordered metadata'));

    await waitFor(() => {
      expect(submitCalls).toHaveLength(1);
    });

    expect(screen.queryByText('Metadata requires at least one entry')).toBeNull();
    expect(submitCalls[0].metadata).toHaveLength(3);
    expect(submitCalls[0]).toMatchObject({
      metadata: [
        { key: 'env', value: 'prod' },
        { key: 'tier', value: 'gold' },
        { key: 'region', value: 'us-east' }
      ]
    });
  });

  it('supports key-value uniqueKeys shorthand through compiled validation', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/form-array-validation.test.tsx#9"
        schema={{
          type: 'form',
          showErrorOn: ['touched', 'submit'],
          data: {
            metadata: [
              { key: 'env', value: 'prod' },
              { key: 'env', value: 'stage' }
            ]
          },
          body: [
            {
              type: 'key-value',
              name: 'metadata',
              label: 'Metadata',
              uniqueKeys: true
            }
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit shorthand metadata',
              onClick: {
                action: 'submitForm'
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.click(screen.getByText('Submit shorthand metadata'));
    expect(await screen.findByText('Metadata keys must be unique')).toBeTruthy();

    fireEvent.change(screen.getAllByPlaceholderText('Key')[1], { target: { value: 'tier' } });

    await waitFor(() => {
      expect(screen.queryByText('Metadata keys must be unique')).toBeNull();
    });
  });

});
