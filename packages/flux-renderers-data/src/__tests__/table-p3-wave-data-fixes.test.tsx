import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';
import { computeCombinePlan, getCellRowSpan } from '../table-renderer/combine-cells.js';
import type { TableColumnSchema } from '../schemas.js';
import type { TableRowEntry } from '../table-renderer/types.js';

afterEach(cleanup);

/**
 * Plan 488 Phase 3 wave A — data package items, pinned by attribute/behavior
 * assertions:
 * - [G3-R3-视角4-02] tree-table header select-all checked state scopes to the
 *   flattened select-all rows, not the top-level row count.
 * - [G3-R2-视角4-01] maxSelectionLength cap surfaces count/reason feedback
 *   (container markers + header live-region hint) instead of silent graying.
 * - [G3-R6-视角8-01] combine plan closes spans at expanded-detail-row boundaries.
 * - [G3-R2-视角6-01] column-settings move items keep the menu open.
 */

describe('[G3-视角3-03] standalone pagination disabled consumption (verified live)', () => {
  it('prev/next carry aria-disabled at the boundaries — consumed by the ui primitive', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/pagination-disabled-consumption"
        schema={{
          type: 'page',
          body: [
            {
              type: 'pagination',
              total: 1,
              pageSize: 10,
              currentPage: 1,
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      const prev = document.querySelector('[data-testid="pagination-prev"]') as HTMLElement;
      const next = document.querySelector('[data-testid="pagination-next"]') as HTMLElement;
      expect(prev).toBeTruthy();
      expect(prev.getAttribute('aria-disabled')).toBe('true');
      expect(next.getAttribute('aria-disabled')).toBe('true');
      // the ui pagination primitive consumes aria-disabled via Tailwind variant
      expect(prev.className).toContain('aria-disabled:opacity-50');
    });
  });
});

describe('[G3-R3-视角4-02] tree-table header select-all checked state', () => {
  it('checks the header select-all when every flattened tree row is selected', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/table-tree-select-all"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              rowKey: 'id',
              rowChildrenField: 'children',
              rowSelection: { type: 'checkbox' },
              columns: [{ label: 'Name', name: 'name' }],
              source: [
                {
                  id: 'p1',
                  name: 'Parent',
                  children: [
                    { id: 'c1', name: 'Child-1' },
                    { id: 'c2', name: 'Child-2' },
                  ],
                },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Parent')).toBeTruthy());

    // Expand the root so the flattened select-all scope becomes p1/c1/c2.
    fireEvent.click(document.querySelector('[data-slot="table-tree-toggle"]')!);
    await waitFor(() => expect(screen.getByText('Child-1')).toBeTruthy());

    const headerCheckbox = document.querySelector(
      '[data-slot="table-select-column"] input[type="checkbox"]',
    ) as HTMLInputElement;
    expect(headerCheckbox).toBeTruthy();

    fireEvent.click(headerCheckbox);
    await waitFor(() => {
      // every visible tree row (parent + children) reports selected
      const rowChecks = Array.from(
        document.querySelectorAll('[data-slot="table-select-cell"] input[type="checkbox"]'),
      ) as HTMLInputElement[];
      expect(rowChecks.length).toBe(3);
      expect(rowChecks.every((c) => c.checked)).toBe(true);
      // [G3-R3-视角4-02] the header checkbox itself reflects checked=true — the
      // legacy cross-check (flattened selection count vs top-level row count)
      // pinned it to false here.
      expect(headerCheckbox.checked).toBe(true);
    });
  });
});

describe('[G3-R2-视角4-01] selection cap feedback', () => {
  it('marks the container and announces the cap when maxSelectionLength is reached', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/table-selection-cap"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              rowKey: 'id',
              rowSelection: { type: 'checkbox', maxSelectionLength: 1 },
              columns: [{ label: 'Name', name: 'name' }],
              source: [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Alice')).toBeTruthy());

    const rowChecks = Array.from(
      document.querySelectorAll('[data-slot="table-select-cell"] input[type="checkbox"]'),
    ) as HTMLInputElement[];
    expect(rowChecks.length).toBe(2);

    // No cap markers before the cap is hit.
    const container = document.querySelector('.nop-table') as HTMLElement;
    expect(container.getAttribute('data-selection-capped')).toBeNull();

    fireEvent.click(rowChecks[0]!);
    await waitFor(() => {
      expect(container.getAttribute('data-selection-capped')).toBe('true');
      expect(container.getAttribute('data-selection-count')).toBe('1');
      expect(container.getAttribute('data-selection-max')).toBe('1');
      // reason/count feedback exists (sr-only live region in the header)
      expect(document.querySelector('[data-slot="table-selection-cap"]')).toBeTruthy();
      // the other row's checkbox is disabled (existing behavior preserved)
      expect(rowChecks[1]!.disabled).toBe(true);
    });

    fireEvent.click(rowChecks[0]!);
    await waitFor(() => {
      expect(container.getAttribute('data-selection-capped')).toBeNull();
      expect(document.querySelector('[data-slot="table-selection-cap"]')).toBeNull();
    });
  });
});

describe('[G3-R6-视角8-01] combine plan breaks spans at expanded rows', () => {
  const rows: TableRowEntry[] = [
    { rowKey: '1', sourceIndex: 0, record: { a: 'x' } },
    { rowKey: '2', sourceIndex: 1, record: { a: 'x' } },
    { rowKey: '3', sourceIndex: 2, record: { a: 'x' } },
  ];
  const columns: TableColumnSchema[] = [{ type: 'column', name: 'a' }] as TableColumnSchema[];

  it('merges all three rows when nothing is expanded', () => {
    const plan = computeCombinePlan(rows, columns, 1, { virtualEnabled: false });
    expect(plan[0]!.a).toBe(3);
    expect(plan[1]!.a).toBe(0);
    expect(plan[2]!.a).toBe(0);
  });

  it('closes the span after a row rendering an inline expanded detail row', () => {
    const plan = computeCombinePlan(rows, columns, 1, {
      virtualEnabled: false,
      // row 1 ("2") renders an expanded detail row after it — a rowSpan may not
      // cross it, or the detail row is swallowed into the merged cell.
      isRowExpanded: (row) => row.rowKey === '2',
    });
    expect(plan[0]!.a).toBe(2);
    expect(plan[1]!.a).toBe(0);
    // row 3 starts a fresh span (of 1 — nothing to merge into), no zero marker.
    expect(plan[2]!.a).toBeUndefined();
    expect(getCellRowSpan(plan, 2, columns[0]!, 0)).toBeUndefined();
  });

  it('inverted expandAllByDefault semantics: collapsed overrides do not break spans', () => {
    // expandAllByDefault=true means expandedRowKeys holds COLLAPSED overrides;
    // the caller derives that per row, here expressed via the predicate.
    const plan = computeCombinePlan(rows, columns, 1, {
      virtualEnabled: false,
      isRowExpanded: (row) => !new Set(['2']).has(row.rowKey),
    });
    // rows 1 and 3 are expanded → span breaks after row 1 and after row 3:
    // row 1 alone, rows 2+3 merge (row 3's detail row renders after it, so the
    // span ending ON row 3 is still physical-row-safe).
    expect(plan[0]!.a).toBeUndefined();
    expect(plan[1]!.a).toBe(2);
    expect(plan[2]!.a).toBe(0);
  });
});

describe('[G3-R2-视角6-01] column-settings move keeps the menu open', () => {
  it('keeps the settings menu open across a move click (closeOnClick opt-out)', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/table-column-settings-close-on-click"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              rowKey: 'id',
              columnSettings: { enabled: true, overlay: true },
              columns: [
                { label: 'A', name: 'a' },
                { label: 'B', name: 'b' },
              ],
              source: [{ id: 1, a: 'a1', b: 'b1' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('a1')).toBeTruthy());

    fireEvent.click(screen.getByText('Columns'));
    await waitFor(() => {
      expect(document.querySelector('[data-slot="dropdown-menu-content"]')).toBeTruthy();
    });

    const moveItems = Array.from(
      document.querySelectorAll('[data-slot="dropdown-menu-item"]'),
    ) as HTMLElement[];
    const moveUp = moveItems.find(
      (el) => el.textContent === '上移' || el.textContent === 'Move Up',
    );
    expect(moveUp).toBeTruthy();

    // A move is one of several moves: the menu must survive the click.
    fireEvent.click(moveUp!);
    await waitFor(() => {
      expect(
        document.querySelector('[data-slot="dropdown-menu-content"]'),
      ).toBeTruthy();
    });
  });
});
