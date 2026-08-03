import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';
import { dataRendererDefinitions } from '../index.js';
import { t } from '@nop-chaos/flux-i18n';

/**
 * C4.1 Phase 2 regression suite — schema contract honesty for `table`.
 *
 * 1. showHeader: false hides the header row (P1-1 phantom claim now real).
 * 2. headerAlign applies an alignment class on the header cell (P1-1).
 * 3. vAlign applies a vertical alignment class on body cells (P1-1).
 * 4. classNameExpr evaluates per-row against the row scope and appends the
 *    class; a failing expression degrades to no class + dev warn (P1-1).
 * 5. combineFromIndex starts cell merging at the given column index (P1-1).
 * 6. responsive.defaultExpanded expands all detail rows when the expand mode
 *    is active (P1-2).
 * 7. Standalone table with searchable as SchemaInput renders the region-ized
 *    search UI through searchableRegionKey (P1-5).
 * 8. Controlled sort/filter input props are declared + registered (P1-6).
 */

function renderTable(schema: Record<string, unknown>, envOverride = env) {
  const SchemaRenderer = createDataSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://table/c4-1-contract"
      schema={{ type: 'table', ...schema } as any}
      env={envOverride}
      formulaCompiler={formulaCompiler}
    />,
  );
}

afterEach(() => cleanup());

describe('table C4.1 schema contract (P1-1 phantom cluster)', () => {
  it('showHeader: false removes the header row but keeps body rows', async () => {
    renderTable({
      showHeader: false,
      source: [{ id: 1, name: 'Alice' }],
      columns: [{ name: 'name', label: 'Name' }],
    });

    await waitFor(() => {
      expect(document.querySelectorAll('[data-slot="table-head"]')).toHaveLength(0);
    });
    expect(document.querySelectorAll('[data-slot="table-body"] [data-slot="table-row"]')).toHaveLength(1);
    expect(screen.getByText('Alice')).toBeTruthy();
  });

  it('headerAlign applies text-left/center/right on the header cell', async () => {
    renderTable({
      source: [{ id: 1, name: 'Alice' }],
      columns: [
        { name: 'a', label: 'Left', headerAlign: 'left' },
        { name: 'b', label: 'Center', headerAlign: 'center' },
        { name: 'c', label: 'Right', headerAlign: 'right' },
      ],
    });

    await waitFor(() => {
      const heads = Array.from(document.querySelectorAll('[data-slot="table-head"]'));
      expect(heads).toHaveLength(3);
      expect(heads[0]!.className).toContain('text-left');
      expect(heads[1]!.className).toContain('text-center');
      expect(heads[2]!.className).toContain('text-right');
    });
  });

  it('vAlign applies vertical alignment class on body cells', async () => {
    renderTable({
      source: [{ id: 1, name: 'Alice' }],
      columns: [
        { name: 'a', label: 'A', vAlign: 'top' },
        { name: 'b', label: 'B', vAlign: 'middle' },
        { name: 'c', label: 'C', vAlign: 'bottom' },
      ],
    });

    await waitFor(() => {
      const row = document.querySelector(
        '[data-slot="table-body"] [data-slot="table-row"]',
      ) as HTMLElement | null;
      expect(row).not.toBeNull();
      const cells = Array.from(row!.querySelectorAll('td'));
      expect(cells).toHaveLength(3);
      expect(cells[0]!.className).toContain('align-top');
      expect(cells[1]!.className).toContain('align-middle');
      expect(cells[2]!.className).toContain('align-bottom');
    });
  });

  it('classNameExpr evaluates per-row and appends the class', async () => {
    renderTable({
      source: [
        { id: 1, name: 'Alice', hot: true },
        { id: 2, name: 'Bob', hot: false },
      ],
      columns: [{ name: 'name', label: 'Name', classNameExpr: 'hot ? "row-hot" : ""' }],
    });

    await waitFor(() => {
      const rows = Array.from(
        document.querySelectorAll('[data-slot="table-body"] [data-slot="table-row"]'),
      );
      expect(rows).toHaveLength(2);
      const cells = rows.map((row) => Array.from(row.querySelectorAll('td'))[0]);
      expect(cells[0]!.className).toContain('row-hot');
      expect(cells[1]!.className).not.toContain('row-hot');
    });
  });

  it('classNameExpr failing expression degrades to no class (dev warn) without crashing', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      renderTable({
        source: [{ id: 1, name: 'Alice' }],
        columns: [{ name: 'name', label: 'Name', classNameExpr: 'undefinedExpr.boom()' }],
      });

      await waitFor(() => {
        expect(
          document.querySelectorAll('[data-slot="table-body"] [data-slot="table-row"]'),
        ).toHaveLength(1);
      });
      const cell = document.querySelector(
        '[data-slot="table-body"] [data-slot="table-row"] td',
      ) as HTMLElement | null;
      expect(cell?.className).not.toContain('boom');
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('combineFromIndex starts cell merging at the given column index', async () => {
    renderTable({
      combineNum: 2,
      combineFromIndex: 1,
      source: [
        { id: 1, group: 'g1', value: 'shared' },
        { id: 2, group: 'g1', value: 'shared' },
        { id: 3, group: 'g1', value: 'shared' },
      ],
      columns: [
        { name: 'group', label: 'Group' },
        { name: 'value', label: 'Value' },
      ],
    });

    await waitFor(() => {
      const rows = Array.from(
        document.querySelectorAll('[data-slot="table-body"] [data-slot="table-row"]'),
      );
      expect(rows).toHaveLength(3);
      // Column 0 (group) is NOT merged (combineFromIndex: 1) → every row renders it.
      const groupCells = rows.map((row) => Array.from(row.querySelectorAll('td'))[0]);
      expect(groupCells.every((cell) => cell!.getAttribute('rowspan') === null)).toBe(true);
      // Column 1 (value) IS merged: first row carries rowspan=3; later rows
      // skip the cell entirely (rowSpan 0 → not rendered).
      const valueCells = rows.map((row) => Array.from(row.querySelectorAll('td'))[1]);
      expect(valueCells[0]!.getAttribute('rowspan')).toBe('3');
      expect(valueCells[1]).toBeUndefined();
      expect(valueCells[2]).toBeUndefined();
    });
  });
});

describe('table C4.1 responsive defaultExpanded (P1-2)', () => {
  it('expands all detail rows when responsive.mode expand + defaultExpanded active', async () => {
    (window as { innerWidth: number }).innerWidth = 500;
    window.dispatchEvent(new Event('resize'));
    try {
      renderTable({
        source: [{ id: 1, name: 'Alice', email: 'a@x.com', extra: 'e1' }],
        responsive: { mode: 'expand', breakpoint: 9999, defaultExpanded: true },
        columns: [
          { name: 'name', label: 'Name' },
          { name: 'email', label: 'Email' },
          { name: 'extra', label: 'Extra' },
        ],
      });

      // Breakpoint 9999 > viewport → expand mode active; defaultExpanded true
      // → the detail row (hidden column content) is rendered without interaction.
      await waitFor(() => {
        const expanded = document.querySelector('[data-slot="table-expanded-row"]');
        expect(expanded).not.toBeNull();
      });
      expect(
        document.querySelector('[data-slot="table-responsive-expanded-item"]'),
      ).not.toBeNull();
    } finally {
      (window as { innerWidth: number }).innerWidth = 1280;
      window.dispatchEvent(new Event('resize'));
    }
  });
});

describe('table C4.1 standalone searchable region (P1-5)', () => {
  it('renders SchemaInput searchable through searchableRegionKey on a standalone table', async () => {
    renderTable({
      source: [{ id: 1, name: 'Alpha' }],
      columns: [
        {
          name: 'name',
          label: 'Name',
          searchable: { type: 'text', text: 'table-region-search-ui' },
        } as never,
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: t('flux.table.filter') }));

    const searchPopup = document.querySelector(
      '[data-slot="dropdown-menu-content"]',
    ) as HTMLElement | null;
    expect(searchPopup).not.toBeNull();

    await waitFor(() => {
      expect(within(searchPopup!).getByText('table-region-search-ui')).toBeTruthy();
    });
  });
});

describe('table C4.1 controlled sort/filter input props (P1-6)', () => {
  it('declares controlled sort + filters inputs in the definition fields', () => {
    const definition = dataRendererDefinitions.find((d) => d.type === 'table');
    expect(definition).toBeTruthy();
    const keys = definition!.fields?.map((f) => f.key) ?? [];
    for (const key of ['sort', 'sortEntries', 'sortColumn', 'sortDirection', 'filters']) {
      expect(keys).toContain(key);
    }
  });
});
