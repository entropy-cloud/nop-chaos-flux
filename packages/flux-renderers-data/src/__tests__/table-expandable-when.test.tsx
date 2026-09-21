import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

afterEach(() => cleanup());

function renderTable(schemaProps: Record<string, unknown>) {
  const SchemaRenderer = createDataSchemaRenderer();
  const { expandable, ...rest } = schemaProps;
  return render(
    <SchemaRenderer
      schemaUrl="test://table-expandable-when"
      schema={
        {
          type: 'page',
          body: [
            {
              type: 'table',
              testid: 'expand-table',
              rowKey: 'id',
              source: [
                { id: '1', name: 'Alice', expandable: true },
                { id: '2', name: 'Bob', expandable: false },
              ],
              columns: [{ name: 'name', label: 'Name' }],
              expandable: {
                expandedRowRegionKey: 'expandedRow',
                expandedRow: { type: 'text', text: 'detail' },
                ...(expandable as Record<string, unknown>),
              },
              ...rest,
            },
          ],
        } as never
      }
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

describe('Table expandable.expandableWhen', () => {
  it('hides the expand toggle for rows where expandableWhen evaluates falsy', () => {
    const { container } = renderTable({
      expandable: { expandableWhen: 'expandable === true' },
    });
    const expandCells = container.querySelectorAll('[data-slot="table-expand-cell"]');
    expect(expandCells.length).toBe(2);
    // Row 1 (expandable: true) → toggle button present.
    expect(expandCells[0].querySelector('button')).toBeTruthy();
    // Row 2 (expandable: false) → no toggle button.
    expect(expandCells[1].querySelector('button')).toBeNull();
  });

  it('shows toggle for all rows when expandableWhen is absent', () => {
    const { container } = renderTable({ expandable: {} });
    const expandCells = container.querySelectorAll('[data-slot="table-expand-cell"]');
    expect(expandCells[0].querySelector('button')).toBeTruthy();
    expect(expandCells[1].querySelector('button')).toBeTruthy();
  });

  // 14-02 (plan 483 Phase 7 batch b): the catch branch in
  // table-row-leading-cells degrades to expandable on evaluation errors
  // (expr-eval-error Failure Path) — pin it so a refactor cannot flip the
  // degradation direction.
  it('degrades to expandable (toggle shown) when expandableWhen throws at evaluation', () => {
    const { container } = renderTable({
      expandable: { expandableWhen: 'nonexistent.function(unknownRef' },
    });
    const expandCells = container.querySelectorAll('[data-slot="table-expand-cell"]');
    expect(expandCells.length).toBe(2);
    expect(expandCells[0].querySelector('button')).toBeTruthy();
    expect(expandCells[1].querySelector('button')).toBeTruthy();
  });
});
