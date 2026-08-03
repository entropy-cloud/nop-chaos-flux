import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, useCurrentFormState } from '@nop-chaos/flux-react';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { formAdvancedRendererDefinitions } from '../index.js';
import { env } from '../test-support.js';

const allFormDefs = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];

function ItemsProbe(props: { name: string; testid: string }) {
  const value = useCurrentFormState((state) => state.values[props.name], Object.is, {
    path: props.name,
  });
  return <span data-testid={props.testid}>{JSON.stringify(value)}</span>;
}

const itemsProbeRenderer: RendererDefinition = {
  type: 'array-items-probe',
  component: (props) => (
    <ItemsProbe
      name={String((props.props as Record<string, unknown>).name ?? '')}
      testid={String((props.props as Record<string, unknown>).testid ?? 'items-probe')}
    />
  ),
};

beforeEach(() => {
  cleanup();
});

function resolveItems(testId: string): Array<{ id?: string; value?: string }> {
  return JSON.parse(screen.getByTestId(testId).textContent ?? 'null') ?? [];
}

describe('array-editor row editing (dedicated coverage, P2-3)', () => {
  it('writes inline row edits back to the form value', async () => {
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, itemsProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://array-editor-row-edit"
        schema={{
          type: 'form',
          data: { reviewers: [{ id: 'item-1', value: 'alice' }] },
          body: [
            {
              type: 'array-editor',
              name: 'reviewers',
              label: 'Reviewers',
              itemLabel: 'Reviewer',
            },
            { type: 'array-items-probe', name: 'reviewers', testid: 'items-probe' },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const input = (await screen.findByPlaceholderText('Reviewer 1')) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'alice-x' } });

    await waitFor(() => {
      expect(resolveItems('items-probe')[0].value).toBe('alice-x');
    });
  });

  it('appending a row writes the new empty item to the form value', async () => {
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, itemsProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://array-editor-append"
        schema={{
          type: 'form',
          data: { reviewers: [{ id: 'item-1', value: 'alice' }] },
          body: [
            {
              type: 'array-editor',
              name: 'reviewers',
              label: 'Reviewers',
              itemLabel: 'Reviewer',
            },
            { type: 'array-items-probe', name: 'reviewers', testid: 'items-probe' },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    fireEvent.click(screen.getByText('Add item'));

    await waitFor(() => {
      const items = resolveItems('items-probe');
      expect(items).toHaveLength(2);
      expect(items[1].value).toBe('');
    });
  });

  it('freezes rows and chrome when readOnly', async () => {
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, itemsProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://array-editor-readonly"
        schema={{
          type: 'form',
          data: { reviewers: [{ id: 'item-1', value: 'alice' }] },
          body: [
            {
              type: 'array-editor',
              name: 'reviewers',
              label: 'Reviewers',
              itemLabel: 'Reviewer',
              readOnly: true,
            },
            { type: 'array-items-probe', name: 'reviewers', testid: 'items-probe' },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const input = (await screen.findByPlaceholderText('Reviewer 1')) as HTMLInputElement;
    expect(input.disabled).toBe(true);
    expect((screen.getByText('Add item') as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(input, { target: { value: 'hacked' } });

    await waitFor(() => {
      expect(resolveItems('items-probe')[0].value).toBe('alice');
    });
  });

  it('freezes rows and chrome when disabled', async () => {
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, itemsProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://array-editor-disabled"
        schema={{
          type: 'form',
          data: { reviewers: [{ id: 'item-1', value: 'alice' }] },
          body: [
            {
              type: 'array-editor',
              name: 'reviewers',
              label: 'Reviewers',
              itemLabel: 'Reviewer',
              disabled: true,
            },
            { type: 'array-items-probe', name: 'reviewers', testid: 'items-probe' },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const input = (await screen.findByPlaceholderText('Reviewer 1')) as HTMLInputElement;
    expect(input.disabled).toBe(true);
    expect((screen.getByText('Add item') as HTMLButtonElement).disabled).toBe(true);
  });

  it('restores focus to the input at the removed index after deletion', async () => {
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, itemsProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://array-editor-focus-restore"
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
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const removeButtons = await screen.findAllByRole('button', { name: /^Remove Reviewer \d+$/ });
    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      const inputs = screen.getAllByPlaceholderText(/^Reviewer \d+$/) as HTMLInputElement[];
      expect(inputs).toHaveLength(1);
      expect(document.activeElement).toBe(inputs[0]);
    });
  });

  it('moves focus to the newly appended input after adding a row', async () => {
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, itemsProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://array-editor-focus-add"
        schema={{
          type: 'form',
          data: { reviewers: [{ id: 'item-1', value: 'alice' }] },
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

    fireEvent.click(screen.getByText('Add item'));

    await waitFor(() => {
      const inputs = screen.getAllByPlaceholderText(/^Reviewer \d+$/) as HTMLInputElement[];
      expect(inputs).toHaveLength(2);
      expect(document.activeElement).toBe(inputs[1]);
    });
  });
});
