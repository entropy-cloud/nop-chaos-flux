import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';
import { validateCrudSchema, validateTableSchema } from '../data-schema-validation.js';
import type { RendererSchemaValidationContext } from '@nop-chaos/flux-core';

afterEach(cleanup);

const FIVE_ROWS = [1, 2, 3, 4, 5].map((index) => ({ id: String(index), name: `Row ${index}` }));
const TWELVE_ROWS = Array.from({ length: 12 }, (_, index) => ({
  id: String(index + 1),
  name: `Row ${index + 1}`,
}));

function renderSelectAllTable(rowSelection: Record<string, unknown> = {}) {
  const SchemaRenderer = createDataSchemaRenderer([]);

  render(
    <SchemaRenderer
      schemaUrl="test://data/table-select-all-mode"
      schema={{
        type: 'page',
        body: [
          {
            type: 'table',
            id: 'mode-table',
            rowKey: 'id',
            source: FIVE_ROWS,
            rowSelection: { type: 'checkbox', ...rowSelection },
            selectionOwnership: 'scope',
            selectionStatePath: 'selection',
            pagination: { enabled: true, pageSize: 2, pageSizeOptions: [2] },
            columns: [{ name: 'name', label: 'Name' }],
          },
          { type: 'text', text: 'SEL:${selection}' },
        ],
      }}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function headerCheckbox(): HTMLElement {
  return document.querySelectorAll('[data-slot="checkbox"]')[0] as HTMLElement;
}

async function gotoNextPage() {
  const next = document.querySelector('[data-slot="table-pagination"] [aria-label="Next page"]')!;
  fireEvent.click(next as HTMLElement);
  await waitFor(() => {
    expect(document.querySelector('[data-slot="table-pagination"] [aria-label="Previous page"]')).toBeTruthy();
  });
}

function selectionText(): string {
  return screen.getByText(/^SEL:/).textContent ?? '';
}

describe('table rowSelection.selectAllMode — default (absent) zero regression', () => {
  it('header select-all selects the full row set, not the page slice', async () => {
    renderSelectAllTable();

    fireEvent.click(headerCheckbox());

    await waitFor(() => {
      expect(selectionText()).toBe('SEL:1,2,3,4,5');
    });
  });

  it('header select-all deselect clears the entire selection', async () => {
    renderSelectAllTable();

    fireEvent.click(headerCheckbox());
    await waitFor(() => expect(selectionText()).toBe('SEL:1,2,3,4,5'));

    fireEvent.click(headerCheckbox());
    await waitFor(() => expect(selectionText()).toBe('SEL:'));
  });
});

describe('table rowSelection.selectAllMode: "page"', () => {
  it('header select-all selects only the current page rows', async () => {
    renderSelectAllTable({ selectAllMode: 'page' });

    fireEvent.click(headerCheckbox());

    await waitFor(() => {
      expect(selectionText()).toBe('SEL:1,2');
    });
  });

  it('mirrors manual row-check semantics: union across pages, header state follows the page', async () => {
    renderSelectAllTable({ selectAllMode: 'page' });

    fireEvent.click(headerCheckbox());
    await waitFor(() => expect(selectionText()).toBe('SEL:1,2'));

    await gotoNextPage();
    await waitFor(() => {
      expect(headerCheckbox().getAttribute('aria-checked')).not.toBe('true');
    });

    fireEvent.click(headerCheckbox());
    await waitFor(() => {
      expect(selectionText()).toBe('SEL:1,2,3,4');
    });
  });

  it('header deselect removes only the current page rows and keeps the rest', async () => {
    renderSelectAllTable({ selectAllMode: 'page' });

    fireEvent.click(headerCheckbox());
    await waitFor(() => expect(selectionText()).toBe('SEL:1,2'));

    await gotoNextPage();
    await waitFor(() => {
      expect(headerCheckbox().getAttribute('aria-checked')).not.toBe('true');
    });

    fireEvent.click(headerCheckbox());
    await waitFor(() => expect(selectionText()).toBe('SEL:1,2,3,4'));

    fireEvent.click(headerCheckbox());
    await waitFor(() => expect(selectionText()).toBe('SEL:1,2'));
  });

  it('server-paged tables keep the flowed-in row set as the select-all scope', async () => {
    const SchemaRenderer = createDataSchemaRenderer([]);

    render(
      <SchemaRenderer
        schemaUrl="test://data/table-select-all-server"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              id: 'mode-server-table',
              rowKey: 'id',
              source: FIVE_ROWS,
              rowSelection: { type: 'checkbox', selectAllMode: 'page' },
              selectionOwnership: 'scope',
              selectionStatePath: 'selection',
              pagination: { enabled: true, serverPaged: true, pageSize: 2, total: 5 },
              columns: [{ name: 'name', label: 'Name' }],
            },
            { type: 'text', text: 'SEL:${selection}' },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(headerCheckbox());
    await waitFor(() => {
      expect(selectionText()).toBe('SEL:1,2,3,4,5');
    });
  });

  it('coexists with maxSelectionLength truncation along the page row order', async () => {
    renderSelectAllTable({ selectAllMode: 'page', maxSelectionLength: 1 });

    fireEvent.click(headerCheckbox());

    await waitFor(() => {
      expect(selectionText()).toBe('SEL:1');
    });
  });

  it('coexists with checkableWhen: select-all covers only the checkable rows of the page', async () => {
    const rows = [
      { id: '1', name: 'Row 1', enabled: true },
      { id: '2', name: 'Row 2', enabled: false },
      { id: '3', name: 'Row 3', enabled: true },
      { id: '4', name: 'Row 4', enabled: true },
    ];
    const SchemaRenderer = createDataSchemaRenderer([]);

    render(
      <SchemaRenderer
        schemaUrl="test://data/table-select-all-checkable"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              id: 'mode-checkable-table',
              rowKey: 'id',
              source: rows,
              rowSelection: {
                type: 'checkbox',
                selectAllMode: 'page',
                checkableWhen: 'enabled',
              },
              selectionOwnership: 'scope',
              selectionStatePath: 'selection',
              pagination: { enabled: true, pageSize: 2 },
              columns: [{ name: 'name', label: 'Name' }],
            },
            { type: 'text', text: 'SEL:${selection}' },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(headerCheckbox());
    await waitFor(() => {
      expect(selectionText()).toBe('SEL:1');
    });
  });
});

describe('crud selection.selectAllMode pass-through', () => {
  it('crud header select-all in page mode selects only the current page', async () => {
    const SchemaRenderer = createDataSchemaRenderer([]);

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-select-all-mode"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'mode-crud',
              selection: { selectAllMode: 'page' },
              source: TWELVE_ROWS,
              footerToolbar: [
                { type: 'text', text: 'SEL:${$crud.selectedRowKeys.join(",")}' },
              ],
              columns: [{ name: 'name', label: 'Name' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const checkboxes = document.querySelectorAll('[data-slot="checkbox"]');
    fireEvent.click(checkboxes[0] as HTMLElement);

    await waitFor(() => {
      expect(screen.getByText('SEL:1,2,3,4,5,6,7,8,9,10')).toBeTruthy();
    });
  });
});

describe('selectAllMode schema validation', () => {
  it('rejects invalid table selectAllMode values', () => {
    const emitted: unknown[] = [];
    validateTableSchema({
      schema: { type: 'table', rowSelection: { selectAllMode: 'everything' } },
      path: 'body[0]',
      emit: (d: unknown) => emitted.push(d),
    } as unknown as RendererSchemaValidationContext<any>);

    expect(emitted).toEqual([
      expect.objectContaining({
        code: 'invalid-property-shape',
        path: '/body/0/rowSelection/selectAllMode',
      }),
    ]);
  });

  it('rejects invalid crud selectAllMode values', () => {
    const emitted: unknown[] = [];
    validateCrudSchema({
      schema: { type: 'crud', selection: { selectAllMode: 'everything' } },
      path: 'body[0]',
      emit: (d: unknown) => emitted.push(d),
    } as unknown as RendererSchemaValidationContext<any>);

    expect(emitted).toEqual([
      expect.objectContaining({
        code: 'invalid-property-shape',
        path: '/body/0/selection/selectAllMode',
      }),
    ]);
  });
});
