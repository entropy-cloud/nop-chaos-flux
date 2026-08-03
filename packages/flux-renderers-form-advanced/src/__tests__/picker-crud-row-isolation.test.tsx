import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { formAdvancedRendererDefinitions } from '../index.js';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { dataRendererDefinitions } from '@nop-chaos/flux-renderers-data';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formStateProbeRenderer, formulaCompiler } from '../test-support.js';

const allFormDefs = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];

const OWNER_ROWS = [
  { id: 'a0', title: 'Alpha' },
  { id: 'b1', title: 'Beta' },
  { id: 'c2', title: 'Gamma' },
];

const pickerEnv: RendererEnv = {
  fetcher: async function <T>() {
    return { ok: true, status: 200, data: { items: OWNER_ROWS, total: OWNER_ROWS.length } as T };
  },
  notify: () => undefined,
};

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
    ...dataRendererDefinitions,
    formStateProbeRenderer,
  ]);
  return render(
    <SchemaRenderer
      schemaUrl="test://picker-crud-row-isolation"
      schema={schema as never}
      env={pickerEnv}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function resolveFormState(testId: string): unknown {
  return JSON.parse(screen.getByTestId(testId).textContent ?? 'null') ?? null;
}

const crudPickerItem = [
  { type: 'input-text', name: 'name', placeholder: 'RowName' },
  {
    type: 'picker',
    name: 'owner',
    label: 'Owner',
    pickerDialog: { title: 'Pick owner', size: 'lg' },
    loadAction: { action: 'ajax', args: { url: '/api/owners' } },
    valueKey: 'id',
    labelKey: 'title',
  },
];

describe('picker: CRUD-mode selection state is isolated per repeated-row instance (C3.1 P1-1, bug 73 pattern)', () => {
  it('row 0 confirm is not clobbered by row 1 opening its own dialog', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: {
        rows: [
          { name: 'R0', owner: undefined },
          { name: 'R1', owner: undefined },
        ],
      },
      body: [
        {
          type: 'combo',
          id: 'rows',
          name: 'rows',
          label: 'Rows',
          items: crudPickerItem,
        },
        { type: 'form-state-probe', name: 'rows' },
      ],
    });

    await waitFor(() => {
      expect(resolveFormState('form-state:rows')).toHaveLength(2);
    });

    const triggers = document.querySelectorAll<HTMLButtonElement>('[data-slot="picker-trigger"]');
    expect(triggers).toHaveLength(2);

    // Open row 0's picker dialog (CRUD mode) and select Alpha in it.
    fireEvent.click(triggers[0]);
    await screen.findByText('Pick owner');
    await waitFor(() => {
      expect(
        document.querySelectorAll('[data-slot="picker-dialog-content"] [aria-label="Select Row"]'),
      ).toHaveLength(3);
    });
    const row0DialogRadios = document.querySelectorAll<HTMLInputElement>(
      '[data-slot="picker-dialog-content"] [aria-label="Select Row"]',
    );
    fireEvent.click(row0DialogRadios[0]);

    // Open row 1's picker dialog while row 0's is still open. Before the fix,
    // this re-seeds the shared `$_picker.<id>.selection` path with row 1's
    // (empty) value, clobbering row 0's pending selection.
    fireEvent.click(triggers[1]);
    await waitFor(() => {
      expect(
        document.querySelectorAll('[data-slot="picker-dialog-content"] [aria-label="Select Row"]'),
      ).toHaveLength(6);
    });

    // Confirm row 0's dialog (the first confirm button in DOM order).
    const confirms = document.querySelectorAll<HTMLButtonElement>('[data-slot="picker-confirm"]');
    fireEvent.click(confirms[0]);

    await waitFor(() => {
      const rows = resolveFormState('form-state:rows') as Array<{ name: string; owner: unknown }>;
      expect(rows[0].owner).toBe('a0');
    });

    // Row 1 must be untouched.
    const rows = resolveFormState('form-state:rows') as Array<{ name: string; owner: unknown }>;
    expect(rows[1].owner).toBeUndefined();
  });

  it('single row CRUD-mode picker still writes back the selected row key', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { rows: [{ name: 'R0', owner: undefined }] },
      body: [
        {
          type: 'combo',
          id: 'rows',
          name: 'rows',
          label: 'Rows',
          items: crudPickerItem,
        },
        { type: 'form-state-probe', name: 'rows' },
      ],
    });

    await waitFor(() => {
      expect(resolveFormState('form-state:rows')).toHaveLength(1);
    });

    fireEvent.click(document.querySelector('[data-slot="picker-trigger"]')!);
    await screen.findByText('Pick owner');
    await waitFor(() => {
      expect(
        document.querySelectorAll('[data-slot="picker-dialog-content"] [aria-label="Select Row"]'),
      ).toHaveLength(3);
    });

    fireEvent.click(
      document.querySelectorAll<HTMLInputElement>(
        '[data-slot="picker-dialog-content"] [aria-label="Select Row"]',
      )[1],
    );
    fireEvent.click(document.querySelector('[data-slot="picker-confirm"]')!);

    await waitFor(() => {
      const rows = resolveFormState('form-state:rows') as Array<{ owner: unknown }>;
      expect(rows[0].owner).toBe('b1');
    });
  });
});

export {};
