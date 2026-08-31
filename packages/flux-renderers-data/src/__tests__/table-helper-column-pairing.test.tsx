import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

// [G3-视角5-01] / [G3-R3-视角8-01] / [G3-R4-视角8-01] (R2 consistency audit,
// P1): body-only helper columns (row save bar, row drag handle) had no paired
// header th / colgroup col, misaligning the whole table; and the column resize
// handle escaped its containing block because non-fixed header th elements had
// no positioning context.

function renderTable(schemaProps: Record<string, unknown>) {
  const SchemaRenderer = createDataSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://table-helper-column-pairing"
      schema={
        {
          type: 'page',
          body: [
            {
              type: 'table',
              testid: 'pairing-table',
              source: [
                { id: '1', name: 'Alice', age: 30 },
                { id: '2', name: 'Bob', age: 40 },
              ],
              rowKey: 'id',
              columns: [{ name: 'name', label: 'Name' }],
              ...schemaProps,
            },
          ],
        } as never
      }
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

afterEach(cleanup);

describe('[G3-视角5-01] row save-bar column has paired header + colgroup', () => {
  const quickEdit = {
    quickSaveItemAction: { action: 'ajax', args: { url: '/api/save', method: 'post' } },
    columns: [{ name: 'name', label: 'Name', quickEdit: true }],
  };

  it('body rows render the save-bar cell', () => {
    const { container } = renderTable(quickEdit);
    expect(container.querySelector('[data-slot="table-row-save-bar-cell"]')).toBeTruthy();
  });

  it('header th count equals body td count with the save-bar column', () => {
    const { container } = renderTable(quickEdit);
    const thCount = container.querySelectorAll('thead th').length;
    const tdCount = container.querySelectorAll('tbody tr:first-of-type td').length;
    expect(thCount).toBe(tdCount);
  });

  it('header and colgroup both carry the __row_save_bar__ pairing key', () => {
    const { container } = renderTable(quickEdit);
    expect(container.querySelector('thead [data-column-width-key="__row_save_bar__"]')).toBeTruthy();
    expect(container.querySelector('colgroup [data-column-width-col-key="__row_save_bar__"]')).toBeTruthy();
  });
});

describe('[G3-R3-视角8-01] drag handle column has paired header + colgroup', () => {
  it('header th count equals body td count with the leading drag column', () => {
    const { container } = renderTable({ draggable: true });
    const thCount = container.querySelectorAll('thead th').length;
    const tdCount = container.querySelectorAll('tbody tr:first-of-type td').length;
    expect(thCount).toBe(tdCount);
  });

  it('header and colgroup both carry the __drag__ pairing key', () => {
    const { container } = renderTable({ draggable: true });
    expect(container.querySelector('thead [data-column-width-key="__drag__"]')).toBeTruthy();
    expect(container.querySelector('colgroup [data-column-width-col-key="__drag__"]')).toBeTruthy();
  });

  it('non-draggable tables have no drag column (no regression)', () => {
    const { container } = renderTable({});
    expect(container.querySelector('[data-slot="table-drag-cell"]')).toBeNull();
    expect(container.querySelector('thead [data-column-width-key="__drag__"]')).toBeNull();
  });
});

describe('[G3-R4-视角8-01] resize handle anchors to its column header', () => {
  it('non-fixed resizable header cells are positioning contexts', () => {
    const { container } = renderTable({
      columns: [{ name: 'name', label: 'Name', width: 160 }],
    });
    const head = container.querySelector('thead [data-slot="table-head"]') as HTMLElement;
    expect(head.getAttribute('data-resizable')).toBe('true');
    expect(head.className).toContain('relative');
  });
});
