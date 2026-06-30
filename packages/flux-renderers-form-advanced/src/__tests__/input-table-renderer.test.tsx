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
      schemaUrl="test://input-table-handles"
      schema={schema as never}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function resolveFormState(testId: string): unknown {
  return JSON.parse(screen.getByTestId(testId).textContent ?? 'null') ?? null;
}

const tableItemRegion = [
  { type: 'input-text', name: 'sku', placeholder: 'SKU' },
  { type: 'input-number', name: 'amount', placeholder: 'Amount' },
];

const tableColumns = [{ label: 'SKU' }, { label: 'Amount' }];

describe('input-table: row editing + composite handle addRow/removeRow/moveRow', () => {
  it('renders initial rows and writes cell edits back to the row object', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { rows: [{ sku: 'A1', amount: 3 }] },
      body: [
        {
          type: 'input-table',
          id: 't',
          name: 'rows',
          label: 'Rows',
          columns: tableColumns,
          item: tableItemRegion,
        },
        { type: 'form-state-probe', name: 'rows' },
      ],
    });

    const amountInput = screen.getByPlaceholderText('Amount') as HTMLInputElement;
    fireEvent.change(amountInput, { target: { value: '7' } });

    await waitFor(() => {
      expect(resolveFormState('form-state:rows')).toEqual([{ sku: 'A1', amount: 7 }]);
    });
  });

  it('add row button appends an empty row', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { rows: [{ sku: 'A1', amount: 3 }] },
      body: [
        {
          type: 'input-table',
          id: 't',
          name: 'rows',
          label: 'Rows',
          columns: tableColumns,
          item: tableItemRegion,
        },
        { type: 'form-state-probe', name: 'rows' },
      ],
    });

    fireEvent.click(document.querySelector('[data-slot="input-table-add"]')!);

    await waitFor(() => {
      expect(resolveFormState('form-state:rows')).toHaveLength(2);
    });
    expect((resolveFormState('form-state:rows') as unknown[])[1]).toEqual({});
  });

  it('component:addItem (canonical addRow alias) appends a row', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { rows: [{ sku: 'A1', amount: 1 }] },
      body: [
        { type: 'input-table', id: 't', name: 'rows', label: 'Rows', columns: tableColumns, item: tableItemRegion },
        { type: 'button', label: 'AddRowBtn', onClick: { action: 'component:addItem', componentId: 't' } },
        { type: 'form-state-probe', name: 'rows' },
      ],
    });

    fireEvent.click(screen.getByText('AddRowBtn'));
    await waitFor(() => {
      expect(resolveFormState('form-state:rows')).toHaveLength(2);
    });
  });

  it('component:removeItem removes a row at the given index', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { rows: [{ sku: 'A1', amount: 1 }, { sku: 'B2', amount: 2 }] },
      body: [
        { type: 'input-table', id: 't', name: 'rows', label: 'Rows', columns: tableColumns, item: tableItemRegion },
        {
          type: 'button',
          label: 'RemoveRowBtn',
          onClick: { action: 'component:removeItem', componentId: 't', args: { index: 0 } },
        },
        { type: 'form-state-probe', name: 'rows' },
      ],
    });

    fireEvent.click(screen.getByText('RemoveRowBtn'));
    await waitFor(() => {
      expect(resolveFormState('form-state:rows')).toEqual([{ sku: 'B2', amount: 2 }]);
    });
  });

  it('component:moveItem reorders rows', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { rows: [{ sku: 'A', amount: 1 }, { sku: 'B', amount: 2 }, { sku: 'C', amount: 3 }] },
      body: [
        { type: 'input-table', id: 't', name: 'rows', label: 'Rows', columns: tableColumns, item: tableItemRegion },
        {
          type: 'button',
          label: 'MoveRowBtn',
          onClick: { action: 'component:moveItem', componentId: 't', args: { from: 2, to: 0 } },
        },
        { type: 'form-state-probe', name: 'rows' },
      ],
    });

    fireEvent.click(screen.getByText('MoveRowBtn'));
    await waitFor(() => {
      expect(
        (resolveFormState('form-state:rows') as Array<{ sku: string }>).map((r) => r.sku),
      ).toEqual(['C', 'A', 'B']);
    });
  });

  it('remove is rejected when minItems floor is reached (skipped, no writeback)', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { rows: [{ sku: 'A', amount: 1 }] },
      body: [
        { type: 'input-table', id: 't', name: 'rows', label: 'Rows', columns: tableColumns, item: tableItemRegion, minItems: 1 },
        {
          type: 'button',
          label: 'RemoveRowBtn',
          onClick: { action: 'component:removeItem', componentId: 't', args: { index: 0 } },
        },
        { type: 'form-state-probe', name: 'rows' },
      ],
    });

    fireEvent.click(screen.getByText('RemoveRowBtn'));
    await waitFor(() => {
      expect(resolveFormState('form-state:rows')).toHaveLength(1);
    });
  });

  it('emits nop-input-table marker and renders column headers', () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { rows: [{ sku: 'A', amount: 1 }] },
      body: [
        { type: 'input-table', id: 't', name: 'rows', label: 'Rows', columns: tableColumns, item: tableItemRegion },
      ],
    });

    expect(document.querySelector('.nop-input-table')).toBeTruthy();
    expect(document.querySelector('[data-slot="input-table-header"]')).toBeTruthy();
    expect(document.querySelectorAll('[data-slot="input-table-row"]')).toHaveLength(1);
  });
});

export {};
