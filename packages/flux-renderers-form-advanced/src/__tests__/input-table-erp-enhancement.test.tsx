import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { formAdvancedRendererDefinitions } from '../index.js';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { env, formStateProbeRenderer, formulaCompiler } from '../test-support.js';
import { installFormAdvancedTestHooks } from '../test-support.js';

installFormAdvancedTestHooks();

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
      schemaUrl="test://input-table-erp"
      schema={schema as never}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function resolveFormState(testId: string): unknown {
  return JSON.parse(screen.getByTestId(testId).textContent ?? 'null') ?? null;
}

const itemRegion = [
  { type: 'input-text', name: 'sku', placeholder: 'SKU' },
  { type: 'input-number', name: 'amount', placeholder: 'Amount' },
];

describe('plan 785 — input-table summary row (aggregate)', () => {
  it('renders a tfoot summary row aligned with columns; sum/avg/count over column values', () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { rows: [{ sku: 'A', amount: 2 }, { sku: 'B', amount: 4 }] },
      body: [
        {
          type: 'input-table',
          id: 't',
          name: 'rows',
          columns: [
            { label: 'SKU', name: 'sku' },
            { label: 'Amount', name: 'amount', aggregate: 'sum' },
            { label: 'Avg', name: 'amount', aggregate: 'avg' },
            { label: 'Count', name: 'sku', aggregate: 'count' },
          ],
          item: itemRegion,
        },
      ],
    });

    const tfoot = document.querySelector('[data-slot="input-table-summary"]');
    expect(tfoot).toBeTruthy();
    const cells = Array.from(
      tfoot!.querySelectorAll('[data-slot="input-table-summary-cell"]'),
    ).map((cell) => cell.textContent);
    expect(cells).toEqual(['Total', '6', '3', '2']);
  });

  it('skips non-numeric cells and keeps editing unblocked', () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { rows: [{ sku: 'A', amount: 2 }, { sku: 'B', amount: 'N/A' }] },
      body: [
        {
          type: 'input-table',
          id: 't',
          name: 'rows',
          columns: [{ label: 'Amount', name: 'amount', aggregate: 'sum' }],
          item: itemRegion,
        },
      ],
    });

    const cell = document.querySelector('[data-slot="input-table-summary-cell"]');
    expect(cell!.textContent).toBe('2');
  });

  it('evaluates expr aggregates in the row-array scope', () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { rows: [{ sku: 'A', amount: 2 }, { sku: 'B', amount: 4 }] },
      body: [
        {
          type: 'input-table',
          id: 't',
          name: 'rows',
          columns: [
            { label: 'Amount', name: 'amount', aggregate: 'sum' },
            { label: 'RowTotal', aggregate: { expr: 'COUNT(rows)' } },
          ],
          item: itemRegion,
        },
      ],
    });

    const cells = Array.from(
      document.querySelectorAll('[data-slot="input-table-summary-cell"]'),
    ).map((cell) => cell.textContent);
    expect(cells).toEqual(['6', '2']);
  });

  it('refreshes the summary in the same tick after row add/remove', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { rows: [{ sku: 'A', amount: 2 }] },
      body: [
        {
          type: 'input-table',
          id: 't',
          name: 'rows',
          columns: [{ label: 'Amount', name: 'amount', aggregate: 'sum' }],
          item: itemRegion,
        },
        { type: 'button', label: 'AddRowBtn', onClick: { action: 'component:addItem', componentId: 't' } },
        { type: 'form-state-probe', name: 'rows' },
      ],
    });

    expect(document.querySelector('[data-slot="input-table-summary-cell"]')!.textContent).toBe('2');

    fireEvent.click(screen.getByText('AddRowBtn'));
    await waitFor(() => {
      expect(resolveFormState('form-state:rows')).toHaveLength(2);
    });
    expect(document.querySelector('[data-slot="input-table-summary-cell"]')!.textContent).toBe('2');

    const amountInputs = screen.getAllByPlaceholderText('Amount') as HTMLInputElement[];
    fireEvent.change(amountInputs[1], { target: { value: '9' } });
    await waitFor(() => {
      expect(document.querySelector('[data-slot="input-table-summary-cell"]')!.textContent).toBe('11');
    });
  });

  it('renders the empty summary row when summaryVisible is set without aggregate columns', () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { rows: [{ sku: 'A', amount: 2 }] },
      body: [
        {
          type: 'input-table',
          id: 't',
          name: 'rows',
          summaryVisible: true,
          columns: [{ label: 'SKU', name: 'sku' }],
          item: itemRegion,
        },
      ],
    });

    expect(document.querySelector('[data-slot="input-table-summary"]')).toBeTruthy();
  });
});

describe('plan 785 — input-table computed columns + onRowChange + summaryBinding', () => {
  it('derives computed column values from the row scope and recomputes on dependency change', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { rows: [{ sku: 'A', qty: 2, price: 3 }] },
      body: [
        {
          type: 'input-table',
          id: 't',
          name: 'rows',
          columns: [
            { label: 'Qty', name: 'qty' },
            { label: 'Price', name: 'price' },
            { label: 'Subtotal', computed: 'qty * price' },
          ],
          item: [
            { type: 'input-number', name: 'qty', placeholder: 'Qty' },
            { type: 'input-number', name: 'price', placeholder: 'Price' },
          ],
        },
        { type: 'form-state-probe', name: 'rows' },
      ],
    });

    const computedCells = document.querySelectorAll('[data-slot="input-table-computed-cell"]');
    expect(computedCells).toHaveLength(1);
    expect(computedCells[0].textContent).toBe('6');

    const qtyInput = screen.getByPlaceholderText('Qty') as HTMLInputElement;
    fireEvent.change(qtyInput, { target: { value: '5' } });
    await waitFor(() => {
      expect(document.querySelector('[data-slot="input-table-computed-cell"]')!.textContent).toBe('15');
    });
  });

  it('dispatches onRowChange with record/index/name/value after a row field edit', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { rows: [{ sku: 'A', amount: 1 }, { sku: 'B', amount: 2 }], lastName: '' },
      body: [
        {
          type: 'input-table',
          id: 't',
          name: 'rows',
          columns: tableTwoColumns(),
          item: itemRegion,
          onRowChange: {
            action: 'setValue',
            args: { path: 'lastName', value: '${name}@${index}:${value}' },
          },
        },
        { type: 'form-state-probe', name: 'lastName' },
        { type: 'form-state-probe', name: 'rows' },
      ],
    });

    const amountInputs = screen.getAllByPlaceholderText('Amount') as HTMLInputElement[];
    fireEvent.change(amountInputs[1], { target: { value: '7' } });

    await waitFor(() => {
      expect(resolveFormState('form-state:lastName')).toBe('amount@1:7');
    });
  });

  it('does not dispatch onRowChange for a pure row reorder (onReorder owns it)', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { rows: [{ sku: 'A', amount: 1 }, { sku: 'B', amount: 2 }], lastName: 'none', reorders: 0 },
      body: [
        {
          type: 'input-table',
          id: 't',
          name: 'rows',
          columns: tableTwoColumns(),
          item: itemRegion,
          onRowChange: {
            action: 'setValue',
            args: { path: 'lastName', value: '${name}@${index}:${value}' },
          },
          onReorder: {
            action: 'setValue',
            args: { path: 'reorders', value: 1 },
          },
        },
        { type: 'form-state-probe', name: 'lastName' },
        { type: 'form-state-probe', name: 'reorders' },
        { type: 'form-state-probe', name: 'rows' },
      ],
    });

    const moveDownButtons = document.querySelectorAll<HTMLButtonElement>('button[aria-label*="moveDown"], button[aria-label*="Move down"], button[aria-label*="Move Down"]');
    expect(moveDownButtons.length).toBeGreaterThan(0);
    fireEvent.click(moveDownButtons[0]);

    await waitFor(() => {
      expect(resolveFormState('form-state:reorders')).toBe(1);
    });
    expect((resolveFormState('form-state:rows') as Array<{ sku: string }>).map((row) => row.sku)).toEqual(['B', 'A']);
    expect(resolveFormState('form-state:lastName')).toBe('none');

    const amountInputs = screen.getAllByPlaceholderText('Amount') as HTMLInputElement[];
    fireEvent.change(amountInputs[0], { target: { value: '9' } });
    await waitFor(() => {
      expect(resolveFormState('form-state:lastName')).toBe('amount@0:9');
    });
  });

  it('writes summaryBinding aggregates into the parent form field on row changes', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { rows: [{ sku: 'A', amount: 2 }, { sku: 'B', amount: 3 }], totalAmount: 0 },
      body: [
        {
          type: 'input-table',
          id: 't',
          name: 'rows',
          columns: tableTwoColumns(),
          item: itemRegion,
          summaryBinding: { field: 'totalAmount', column: 'amount', agg: 'sum' },
        },
        { type: 'form-state-probe', name: 'totalAmount' },
        { type: 'form-state-probe', name: 'rows' },
      ],
    });

    await waitFor(() => {
      expect(resolveFormState('form-state:totalAmount')).toBe(5);
    });

    const amountInputs = screen.getAllByPlaceholderText('Amount') as HTMLInputElement[];
    fireEvent.change(amountInputs[0], { target: { value: '10' } });
    await waitFor(() => {
      expect(resolveFormState('form-state:totalAmount')).toBe(13);
    });
  });

  it('summaryBinding keeps writing the partial sum when some cells are non-numeric (summary-row parity)', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { rows: [{ sku: 'A', amount: 2 }, { sku: 'B', amount: '' }], totalAmount: 0 },
      body: [
        {
          type: 'input-table',
          id: 't',
          name: 'rows',
          columns: tableTwoColumns(),
          item: itemRegion,
          summaryBinding: { field: 'totalAmount', column: 'amount', agg: 'sum' },
        },
        { type: 'form-state-probe', name: 'totalAmount' },
      ],
    });

    await waitFor(() => {
      expect(resolveFormState('form-state:totalAmount')).toBe(2);
    });
  });

  it('does not dispatch onRowChange when the handler is missing (silent skip)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderSchema({
      type: 'form',
      id: 'f',
      data: { rows: [{ sku: 'A', amount: 1 }] },
      body: [
        { type: 'input-table', id: 't', name: 'rows', columns: tableTwoColumns(), item: itemRegion },
        { type: 'form-state-probe', name: 'rows' },
      ],
    });

    const amountInputs = screen.getAllByPlaceholderText('Amount') as HTMLInputElement[];
    fireEvent.change(amountInputs[0], { target: { value: '4' } });
    await waitFor(() => {
      expect(resolveFormState('form-state:rows')).toEqual([{ sku: 'A', amount: 4 }]);
    });
    warnSpy.mockRestore();
  });
});

function tableTwoColumns() {
  return [
    { label: 'SKU', name: 'sku' },
    { label: 'Amount', name: 'amount' },
  ];
}

export {};
