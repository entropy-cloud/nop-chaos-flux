import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { formAdvancedRendererDefinitions } from '../index.js';
import {
  buttonRenderer,
  env,
  formStateProbeRenderer,
  submitCalls,
} from '../test-support.js';

const allFormDefs = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];

beforeEach(() => {
  cleanup();
});

function resolveArrayValues(testId: string): Array<{ id?: string; value?: string; key?: string }> {
  return JSON.parse(screen.getByTestId(testId).textContent ?? 'null') ?? [];
}

describe('array-editor minItems / maxItems / reorder', () => {
  it('disables remove buttons when at minItems (minitems-remove)', () => {
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://array-editor-minitems-remove"
        schema={{
          type: 'form',
          data: {
            reviewers: [
              { id: 'item-1', value: 'alice' },
              { id: 'item-2', value: 'bob' },
            ],
          },
          body: [
            {
              type: 'array-editor',
              name: 'reviewers',
              label: 'Reviewers',
              itemLabel: 'Reviewer',
              minItems: 2,
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const removeButtons = screen.getAllByRole('button', { name: /^Remove Reviewer \d+$/ });
    expect(removeButtons).toHaveLength(2);
    for (const button of removeButtons) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it('disables add button when at maxItems (maxitems-reached)', () => {
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://array-editor-maxitems-reached"
        schema={{
          type: 'form',
          data: {
            reviewers: [
              { id: 'item-1', value: 'alice' },
              { id: 'item-2', value: 'bob' },
              { id: 'item-3', value: 'carol' },
            ],
          },
          body: [
            {
              type: 'array-editor',
              name: 'reviewers',
              label: 'Reviewers',
              itemLabel: 'Reviewer',
              maxItems: 3,
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const addButton = screen.getByText('Add item') as HTMLButtonElement;
    expect(addButton.disabled).toBe(true);
  });

  it('falls back to minItems=1 and no maxItems by default (no regression)', () => {
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://array-editor-default"
        schema={{
          type: 'form',
          data: {
            reviewers: [{ id: 'item-1', value: 'alice' }],
          },
          body: [
            {
              type: 'array-editor',
              name: 'reviewers',
              label: 'Reviewers',
              itemLabel: 'Reviewer',
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const removeButtons = screen.getAllByRole('button', { name: /^Remove Reviewer \d+$/ });
    expect(removeButtons).toHaveLength(1);
    expect((removeButtons[0] as HTMLButtonElement).disabled).toBe(true);

    const addButton = screen.getByText('Add item') as HTMLButtonElement;
    expect(addButton.disabled).toBe(false);
  });

  it('moves an item up via moveValue (reorder) and disables move-up on the first row (move-first-row)', async () => {
    const SchemaRenderer = createSchemaRenderer([
      ...allFormDefs,
      buttonRenderer,
      formStateProbeRenderer,
    ]);
    render(
      <SchemaRenderer
        schemaUrl="test://array-editor-move-up"
        schema={{
          type: 'form',
          data: {
            reviewers: [
              { id: 'item-1', value: 'alice' },
              { id: 'item-2', value: 'bob' },
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
            { type: 'form-state-probe', name: 'reviewers' },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const moveUpButtons = screen.getAllByRole('button', { name: /^Move up Reviewer \d+$/ });
    expect(moveUpButtons).toHaveLength(3);
    expect((moveUpButtons[0] as HTMLButtonElement).disabled).toBe(true);
    expect((moveUpButtons[1] as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(moveUpButtons[1]);

    await waitFor(() => {
      expect(resolveArrayValues('form-state:reviewers').map((item) => item.value)).toEqual([
        'bob',
        'alice',
        'carol',
      ]);
    });
  });

  it('moves an item down via moveValue and disables move-down on the last row', async () => {
    const SchemaRenderer = createSchemaRenderer([
      ...allFormDefs,
      buttonRenderer,
      formStateProbeRenderer,
    ]);
    render(
      <SchemaRenderer
        schemaUrl="test://array-editor-move-down"
        schema={{
          type: 'form',
          data: {
            reviewers: [
              { id: 'item-1', value: 'alice' },
              { id: 'item-2', value: 'bob' },
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
            { type: 'form-state-probe', name: 'reviewers' },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const moveDownButtons = screen.getAllByRole('button', { name: /^Move down Reviewer \d+$/ });
    expect(moveDownButtons).toHaveLength(3);
    expect((moveDownButtons[2] as HTMLButtonElement).disabled).toBe(true);
    expect((moveDownButtons[1] as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(moveDownButtons[1]);

    await waitFor(() => {
      expect(resolveArrayValues('form-state:reviewers').map((item) => item.value)).toEqual([
        'alice',
        'carol',
        'bob',
      ]);
    });
  });

  it('reorders via scope.update when no form runtime is present (movevalue-scope-fallback)', async () => {
    const PlainScopeSchemaRenderer = createSchemaRenderer(allFormDefs);

    render(
      <PlainScopeSchemaRenderer
        schemaUrl="test://array-editor-scope-fallback"
        schema={{
          type: 'array-editor',
          name: 'reviewers',
          label: 'Reviewers',
          itemLabel: 'Reviewer',
        }}
        data={{
          reviewers: [
            { id: 'item-1', value: 'alice' },
            { id: 'item-2', value: 'bob' },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const moveUpButtons = screen.getAllByRole('button', { name: /^Move up Reviewer \d+$/ });
    expect((moveUpButtons[0] as HTMLButtonElement).disabled).toBe(true);
    expect((moveUpButtons[1] as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(moveUpButtons[1]);

    await waitFor(() => {
      const inputs = screen.getAllByPlaceholderText(/^Reviewer \d+$/) as HTMLInputElement[];
      expect(inputs.map((input) => input.value)).toEqual(['bob', 'alice']);
    });
  });
});

describe('key-value minItems / maxItems / reorder', () => {
  it('disables remove buttons when at minItems (minitems-remove)', () => {
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://key-value-minitems-remove"
        schema={{
          type: 'form',
          data: {
            metadata: [
              { id: 'pair-1', key: 'env', value: 'prod' },
              { id: 'pair-2', key: 'region', value: 'us' },
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

    const removeButtons = screen.getAllByRole('button', { name: /^Remove entry \d+$/ });
    expect(removeButtons).toHaveLength(2);
    for (const button of removeButtons) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it('disables add button when at maxItems (maxitems-reached)', () => {
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://key-value-maxitems-reached"
        schema={{
          type: 'form',
          data: {
            metadata: [
              { id: 'pair-1', key: 'env', value: 'prod' },
              { id: 'pair-2', key: 'region', value: 'us' },
              { id: 'pair-3', key: 'tier', value: 'gold' },
            ],
          },
          body: [
            {
              type: 'key-value',
              name: 'metadata',
              label: 'Metadata',
              maxItems: 3,
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const addButton = screen.getByText('Add entry') as HTMLButtonElement;
    expect(addButton.disabled).toBe(true);
  });

  it('moves an entry up via moveValue and disables move-up on the first row', async () => {
    const SchemaRenderer = createSchemaRenderer([
      ...allFormDefs,
      buttonRenderer,
      formStateProbeRenderer,
    ]);
    render(
      <SchemaRenderer
        schemaUrl="test://key-value-move-up"
        schema={{
          type: 'form',
          data: {
            metadata: [
              { id: 'pair-1', key: 'env', value: 'prod' },
              { id: 'pair-2', key: 'region', value: 'us' },
              { id: 'pair-3', key: 'tier', value: 'gold' },
            ],
          },
          body: [
            {
              type: 'key-value',
              name: 'metadata',
              label: 'Metadata',
            },
            { type: 'form-state-probe', name: 'metadata' },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const moveUpButtons = screen.getAllByRole('button', { name: /^Move up entry \d+$/ });
    expect(moveUpButtons).toHaveLength(3);
    expect((moveUpButtons[0] as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(moveUpButtons[1]);

    await waitFor(() => {
      expect(resolveArrayValues('form-state:metadata').map((item) => item.key)).toEqual([
        'region',
        'env',
        'tier',
      ]);
    });
  });

  it('moves an entry down via moveValue and disables move-down on the last row', async () => {
    const SchemaRenderer = createSchemaRenderer([
      ...allFormDefs,
      buttonRenderer,
      formStateProbeRenderer,
    ]);
    render(
      <SchemaRenderer
        schemaUrl="test://key-value-move-down"
        schema={{
          type: 'form',
          data: {
            metadata: [
              { id: 'pair-1', key: 'env', value: 'prod' },
              { id: 'pair-2', key: 'region', value: 'us' },
              { id: 'pair-3', key: 'tier', value: 'gold' },
            ],
          },
          body: [
            {
              type: 'key-value',
              name: 'metadata',
              label: 'Metadata',
            },
            { type: 'form-state-probe', name: 'metadata' },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const moveDownButtons = screen.getAllByRole('button', { name: /^Move down entry \d+$/ });
    expect(moveDownButtons).toHaveLength(3);
    expect((moveDownButtons[2] as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(moveDownButtons[1]);

    await waitFor(() => {
      expect(resolveArrayValues('form-state:metadata').map((item) => item.key)).toEqual([
        'env',
        'tier',
        'region',
      ]);
    });
  });

  it('submit still captures reordered values', async () => {
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://key-value-submit-reordered"
        schema={{
          type: 'form',
          data: {
            metadata: [
              { id: 'pair-1', key: 'env', value: 'prod' },
              { id: 'pair-2', key: 'region', value: 'us' },
            ],
          },
          submitAction: {
            action: 'ajax',
            args: { url: '/api/metadata/reordered', method: 'post' },
          },
          body: [
            {
              type: 'key-value',
              name: 'metadata',
              label: 'Metadata',
            },
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit reordered metadata',
              onClick: { action: 'submitForm' },
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const moveUpButtons = screen.getAllByRole('button', { name: /^Move up entry \d+$/ });
    fireEvent.click(moveUpButtons[1]);

    fireEvent.click(screen.getByText('Submit reordered metadata'));

    await waitFor(() => {
      expect(submitCalls).toHaveLength(1);
    });

    expect(submitCalls[0].metadata.map((entry: { key: string }) => entry.key)).toEqual([
      'region',
      'env',
    ]);
  });

  it('reorders via scope.update when no form runtime is present (movevalue-scope-fallback)', async () => {
    const PlainScopeSchemaRenderer = createSchemaRenderer(allFormDefs);

    render(
      <PlainScopeSchemaRenderer
        schemaUrl="test://key-value-scope-fallback"
        schema={{
          type: 'key-value',
          name: 'metadata',
          label: 'Metadata',
        }}
        data={{
          metadata: [
            { id: 'pair-1', key: 'env', value: 'prod' },
            { id: 'pair-2', key: 'region', value: 'us' },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const moveUpButtons = screen.getAllByRole('button', { name: /^Move up entry \d+$/ });
    expect((moveUpButtons[0] as HTMLButtonElement).disabled).toBe(true);
    expect((moveUpButtons[1] as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(moveUpButtons[1]);

    await waitFor(() => {
      const keyInputs = screen.getAllByPlaceholderText('Key') as HTMLInputElement[];
      expect(keyInputs.map((input) => input.value)).toEqual(['region', 'env']);
    });
  });
});

export {};

