import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDataSchemaRenderer, buttonRenderer, env, formulaCompiler } from '../test-support.js';
import { validateTableSchema } from '../data-schema-validation.js';
import type { RendererSchemaValidationContext } from '@nop-chaos/flux-core';

afterEach(cleanup);

const GRID_ROWS = [
  { id: '1', category: 'A', amount: 10 },
  { id: '2', category: 'B', amount: 5 },
  { id: '3', category: 'A', amount: 15 },
  { id: '4', category: 'A', amount: 5 },
];

function renderGroupTable(options: {
  group?: Record<string, unknown>;
  rows?: Array<Record<string, unknown>>;
  rowSelection?: Record<string, unknown>;
  pagination?: Record<string, unknown>;
  draggable?: boolean;
  rowChildrenField?: string;
}) {
  const SchemaRenderer = createDataSchemaRenderer([]);

  render(
    <SchemaRenderer
      schemaUrl="test://data/table-group-render"
      schema={{
        type: 'page',
        body: [
          {
            type: 'table',
            id: 'group-table',
            rowKey: 'id',
            source: (options.rows ?? GRID_ROWS) as never,
            group: options.group as never,
            rowSelection: options.rowSelection as never,
            pagination: options.pagination as never,
            draggable: options.draggable,
            rowChildrenField: options.rowChildrenField,
            columns: [
              { name: 'category', label: 'Category' },
              { name: 'amount', label: 'Amount' },
            ],
          },
        ],
      }}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function groupHeaders(): HTMLElement[] {
  return Array.from(document.querySelectorAll('[data-slot="table-group-header"]'));
}

function bodyRows(): HTMLElement[] {
  return Array.from(document.querySelectorAll('[data-slot="table-body"] tr'));
}

describe('table group — zero regression & declaration gate', () => {
  it('renders no group headers and identical rows when group is absent', () => {
    renderGroupTable({});

    expect(groupHeaders()).toHaveLength(0);
    expect(bodyRows()).toHaveLength(4);
    expect(screen.getByText('10')).toBeTruthy();
  });

  it('renders group header rows with label, member count and aggregate text', () => {
    renderGroupTable({
      group: {
        field: 'category',
        aggregates: [{ fn: 'sum', field: 'amount' }, { fn: 'count' }],
      },
    });

    const headers = groupHeaders();
    expect(headers).toHaveLength(2);
    expect(headers[0].getAttribute('data-group-key')).toBe('A');

    const firstHeader = headers[0];
    expect(firstHeader.querySelector('[data-slot="table-group-label"]')!.textContent).toBe('A');
    expect(firstHeader.querySelector('[data-slot="table-group-count"]')!.textContent).toBe('(3)');
    expect(firstHeader.querySelector('[data-slot="table-group-aggregate"]')!.textContent).toBe(
      'sum: 30 · count: 3',
    );
    expect(
      firstHeader.querySelector('[data-slot="table-group-toggle"]')!.getAttribute('aria-expanded'),
    ).toBe('true');
  });
});

describe('table group — collapse semantics (gd-group-collapse-persist)', () => {
  it('toggle collapses member rows and keeps the header', () => {
    renderGroupTable({ group: { field: 'category' } });

    expect(bodyRows()).toHaveLength(6);

    const toggle = groupHeaders()[0].querySelector('[data-slot="table-group-toggle"]')!;
    fireEvent.click(toggle as HTMLElement);

    return waitFor(() => {
      expect(groupHeaders()[0].getAttribute('data-collapsed')).toBe('true');
      expect(groupHeaders()[0].getAttribute('data-group-key')).toBe('A');
      // Collapsed A hides its 3 members; headers A + B and member row 2 remain.
      expect(bodyRows()).toHaveLength(3);
      expect(
        Array.from(document.querySelectorAll('[data-slot="table-group-header"]')).map((node) =>
          node.getAttribute('data-group-key'),
        ),
      ).toEqual(['A', 'B']);
    });
  });

  it('keeps the collapsed state across a data refresh when the group key survives', async () => {
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://data/table-group-refresh"
        data={{ gridRows: GRID_ROWS }}
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Shuffle',
              onClick: {
                action: 'setValue',
                args: {
                  path: 'gridRows',
                  value: [
                    { id: '9', category: 'C', amount: 1 },
                    { id: '3', category: 'A', amount: 15 },
                    { id: '1', category: 'A', amount: 10 },
                    { id: '2', category: 'B', amount: 5 },
                  ],
                },
              },
            },
            {
              type: 'table',
              id: 'group-table',
              rowKey: 'id',
              source: '${gridRows}',
              group: { field: 'category' },
              columns: [{ name: 'category', label: 'Category' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const toggle = () =>
      container.querySelector(
        '[data-group-key="A"] [data-slot="table-group-toggle"]',
      ) as HTMLElement;

    await waitFor(() => {
      expect(toggle()).toBeTruthy();
    });
    fireEvent.click(toggle());
    await waitFor(() => {
      expect(container.querySelector('[data-group-key="A"]')!.getAttribute('data-collapsed')).toBe(
        'true',
      );
    });

    fireEvent.click(screen.getByText('Shuffle'));
    await waitFor(() => {
      expect(container.querySelector('[data-group-key="C"]')).toBeTruthy();
    });

    expect(container.querySelector('[data-group-key="A"]')!.getAttribute('data-collapsed')).toBe(
      'true',
    );
    const collapsedGroupRows = container.querySelectorAll(
      '[data-slot="table-row"][data-row-group="A"]',
    );
    expect(collapsedGroupRows).toHaveLength(0);
  });
});

describe('table group — fallback group (gd-group-missing-field)', () => {
  it('routes missing/null/empty field values into the missingLabel group with a dev warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderGroupTable({
      group: { field: 'category', missingLabel: 'N/A' },
      rows: [
        { id: '1', category: 'A' },
        { id: '2' },
        { id: '3', category: null },
        { id: '4', category: '' },
      ],
    });

    const headers = groupHeaders();
    expect(headers).toHaveLength(2);
    expect(headers[1].getAttribute('data-group-key')).toBe('__missing__');
    expect(headers[1].querySelector('[data-slot="table-group-label"]')!.textContent).toBe('N/A');
    expect(headers[1].querySelector('[data-slot="table-group-count"]')!.textContent).toBe('(3)');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('gd-group-missing-field'));
    warn.mockRestore();
  });
});

describe('table group — aggregate fallback matrix', () => {
  it('renders "-" for aggregates over no valid numeric values (gd-aggregate-no-valid-values)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderGroupTable({
      group: { field: 'category', aggregates: [{ fn: 'sum', field: 'amount' }] },
      rows: [
        { id: '1', category: 'A', amount: 'nope' },
        { id: '2', category: 'A' },
      ],
    });

    const header = groupHeaders()[0];
    expect(header.querySelector('[data-slot="table-group-aggregate"]')!.textContent).toBe('sum: -');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('gd-aggregate-no-valid-values'));
    warn.mockRestore();
  });
});

describe('table group — coexistence matrix', () => {
  it('page select-all under grouping scopes to the current page member rows (headers consume page slots)', async () => {
    const SchemaRenderer = createDataSchemaRenderer([]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/table-group-select-all"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              id: 'group-table',
              rowKey: 'id',
              source: GRID_ROWS,
              group: { field: 'category' },
              rowSelection: { type: 'checkbox', selectAllMode: 'page' },
              selectionOwnership: 'scope',
              selectionStatePath: 'selection',
              pagination: { enabled: true, pageSize: 2, pageSizeOptions: [2] },
              columns: [{ name: 'category', label: 'Category' }],
            },
            { type: 'text', text: 'SEL:${selection}' },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    // Display-sequence slicing: page 1 = [group A header, member row 1].
    const pageRows = bodyRows();
    expect(pageRows).toHaveLength(2);
    expect(pageRows[0].getAttribute('data-slot')).toBe('table-group-header');
    expect(pageRows[0].getAttribute('data-group-key')).toBe('A');
    expect(pageRows[1].getAttribute('data-slot')).toBe('table-row');
    expect(pageRows[1].getAttribute('data-row-group')).toBe('A');
    expect(groupHeaders().map((node) => node.getAttribute('data-group-key'))).toEqual(['A']);

    const headerCheckbox = () =>
      document.querySelectorAll('[data-slot="checkbox"]')[0] as HTMLElement;

    fireEvent.click(headerCheckbox());
    await waitFor(() => {
      expect(screen.getByText(/^SEL:/).textContent).toBe('SEL:1');
    });
  });

  it('group is inert under tree mode with a one-time dev warn (gd-group-tree-clash)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderGroupTable({
      group: { field: 'category' },
      rowChildrenField: 'children',
      rows: [
        { id: '1', category: 'A', children: [{ id: '1-1', category: 'A' }] },
        { id: '2', category: 'B' },
      ],
    });

    expect(groupHeaders()).toHaveLength(0);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('gd-group-tree-clash'));
    const calls = warn.mock.calls.filter(([message]) =>
      String(message).includes('gd-group-tree-clash'),
    );
    expect(calls).toHaveLength(1);
    warn.mockRestore();
  });

  it('group takes precedence over drag sort with a one-time dev warn (gd-group-drag-clash)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderGroupTable({ group: { field: 'category' }, draggable: true });

    expect(groupHeaders().length).toBe(2);
    expect(document.querySelector('[data-slot="table-group-header"]')).toBeTruthy();
    expect(
      document.querySelectorAll(
        '[data-slot="table-drag-cell"], [data-draggable] .lucide-grip-vertical',
      ),
    ).toHaveLength(0);
    const calls = warn.mock.calls.filter(([message]) =>
      String(message).includes('gd-group-drag-clash'),
    );
    expect(calls).toHaveLength(1);
    warn.mockRestore();
  });

  it('grouping applies to the sorted row set: group order follows first appearance, members follow sort order', async () => {
    const SchemaRenderer = createDataSchemaRenderer([]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/table-group-sort"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              id: 'group-table',
              rowKey: 'id',
              source: [
                { id: '1', category: 'A', amount: 30 },
                { id: '2', category: 'B', amount: 10 },
                { id: '3', category: 'A', amount: 20 },
              ],
              group: { field: 'category' },
              columns: [
                { name: 'category', label: 'Category' },
                { name: 'amount', label: 'Amount', sortable: true },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(groupHeaders().map((node) => node.getAttribute('data-group-key'))).toEqual(['A', 'B']);

    fireEvent.click(screen.getByText('Amount'));

    await waitFor(() => {
      // amount asc → B(10) appears first, so first-appearance group order flips.
      expect(groupHeaders().map((node) => node.getAttribute('data-group-key'))).toEqual(['B', 'A']);
    });
    const memberIds = bodyRows()
      .filter((node) => node.getAttribute('data-slot') === 'table-row')
      .map((node) => node.getAttribute('data-row-group'));
    expect(memberIds).toEqual(['B', 'A', 'A']);
  });

  it('optionRow state markers keep working on member rows under grouping', async () => {
    const SchemaRenderer = createDataSchemaRenderer([]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/table-group-option-row"
        data={{ activeId: '2' }}
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              id: 'group-table',
              rowKey: 'id',
              source: GRID_ROWS,
              group: { field: 'category' },
              optionRow: { value: '${activeId}' },
              columns: [{ name: 'category', label: 'Category' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(bodyRows().some((node) => node.getAttribute('aria-selected') === 'true')).toBe(true);
    });
    const memberRows = bodyRows().filter((node) => node.getAttribute('data-slot') === 'table-row');
    expect(memberRows).toHaveLength(4);
    // data-option-row="true" is the channel marker (all rows); the binding match
    // is carried by data-selected/aria-selected.
    for (const row of memberRows) {
      expect(row.getAttribute('data-option-row')).toBe('true');
    }
    const marked = memberRows.filter((node) => node.getAttribute('aria-selected') === 'true');
    expect(marked).toHaveLength(1);
    expect(marked[0].getAttribute('data-selected')).toBe('true');
  });
});

describe('table group — schema validation', () => {
  function validate(schema: Record<string, unknown>) {
    const diagnostics: Array<{ code: string; path: string; message: string }> = [];
    const context = {
      schema: { type: 'table', ...schema } as never,
      path: 'body[0]',
      emit: (diagnostic: never) => diagnostics.push(diagnostic as never),
    } as unknown as RendererSchemaValidationContext<never>;
    validateTableSchema(context as never);
    return diagnostics;
  }

  it('requires group.field when group is declared', () => {
    const diagnostics = validate({ group: {} });
    expect(
      diagnostics.some(
        (d) => d.code === 'missing-required-field' && d.path.endsWith('group/field'),
      ),
    ).toBe(true);
  });

  it('rejects invalid aggregate fn and non-count aggregates without a field', () => {
    const diagnostics = validate({
      group: {
        field: 'category',
        aggregates: [{ fn: 'median', field: 'a' }, { fn: 'sum' }],
      },
    });
    expect(diagnostics.filter((d) => d.code === 'invalid-property-shape')).toHaveLength(2);
  });
});
