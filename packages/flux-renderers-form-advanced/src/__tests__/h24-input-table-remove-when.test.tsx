import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { formAdvancedRendererDefinitions } from '../index.js';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { env, formStateProbeRenderer, formulaCompiler } from '../test-support.js';

const allFormDefs = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
});

function renderSchema(schema: object) {
  const SchemaRenderer = createSchemaRenderer([
    ...basicRendererDefinitions,
    ...allFormDefs,
    formStateProbeRenderer,
  ]);
  return render(
    <SchemaRenderer
      schemaUrl="test://h24-input-table-remove-when"
      schema={schema as never}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function resolveFormState(testId: string): unknown {
  return JSON.parse(screen.getByTestId(testId).textContent ?? 'null') ?? null;
}

function getRemoveButtons(): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('[data-slot="input-table-remove"]'));
}

const tableItemRegion = [
  { type: 'input-text', name: 'sku', placeholder: 'SKU' },
  { type: 'input-text', name: 'locked', placeholder: 'Locked' },
];

const tableColumns = [{ label: 'SKU' }, { label: 'Locked' }];

describe('input-table: per-row delete gating via removeWhen (H24 symmetry)', () => {
  it('disables remove for rows where removeWhen is falsy and allows remove where truthy', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: {
        rows: [
          { sku: 'persisted', locked: 'true' },
          { sku: 'new', locked: '' },
        ],
      },
      body: [
        {
          type: 'input-table',
          id: 't',
          name: 'rows',
          label: 'Rows',
          columns: tableColumns,
          item: tableItemRegion,
          removeWhen: '${value.locked !== "true"}',
        },
        { type: 'form-state-probe', name: 'rows' },
      ],
    });

    await waitFor(() => {
      expect(resolveFormState('form-state:rows')).toHaveLength(2);
    });

    const removeButtons = getRemoveButtons();
    expect(removeButtons).toHaveLength(2);
    // Row 0 (locked) -> removeWhen falsy -> disabled; Row 1 -> truthy -> enabled.
    expect(removeButtons[0].disabled).toBe(true);
    expect(removeButtons[1].disabled).toBe(false);

    fireEvent.click(removeButtons[1]);

    await waitFor(() => {
      expect(resolveFormState('form-state:rows')).toEqual([{ sku: 'persisted', locked: 'true' }]);
    });
  });

  it('keeps the minItems floor when removeWhen is not configured', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { rows: [{ sku: 'a', locked: '' }, { sku: 'b', locked: '' }] },
      body: [
        {
          type: 'input-table',
          id: 't',
          name: 'rows',
          label: 'Rows',
          columns: tableColumns,
          item: tableItemRegion,
          minItems: 1,
        },
        { type: 'form-state-probe', name: 'rows' },
      ],
    });

    await waitFor(() => {
      expect(resolveFormState('form-state:rows')).toHaveLength(2);
    });

    const removeButtons = getRemoveButtons();
    expect(removeButtons[0].disabled).toBe(false);
    expect(removeButtons[1].disabled).toBe(false);

    fireEvent.click(removeButtons[1]);

    await waitFor(() => {
      expect(resolveFormState('form-state:rows')).toEqual([{ sku: 'a', locked: '' }]);
    });

    // minItems floor still applies after removal.
    expect(getRemoveButtons()[0].disabled).toBe(true);
  });
});
