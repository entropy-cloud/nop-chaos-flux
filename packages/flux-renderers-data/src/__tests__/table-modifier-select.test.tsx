import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

afterEach(() => cleanup());

function renderTable(schemaProps: Record<string, unknown>, rows?: Array<Record<string, unknown>>) {
  const SchemaRenderer = createDataSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://table-modifier-select"
      schema={
        {
          type: 'page',
          body: [
            {
              type: 'table',
              testid: 'modifier-table',
              rowKey: 'id',
              source: rows ?? [
                { id: '1', name: 'One' },
                { id: '2', name: 'Two' },
                { id: '3', name: 'Three' },
                { id: '4', name: 'Four' },
              ],
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

function bodyRows(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll('tbody [data-slot="table-row"]'));
}

function bodyCheckboxes(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll('[data-slot="table-select-cell"] [role="checkbox"]'),
  );
}

/** Row keys derived from the fixed fixture order (ids '1'..'N' in view order). */
function checkedKeys(container: HTMLElement): string[] {
  const rows = bodyRows(container);
  const checkboxes = bodyCheckboxes(container);
  return rows
    .map((_, index) => index)
    .filter((index) => {
      const checkbox = checkboxes[index];
      return checkbox?.getAttribute('aria-checked') === 'true' || checkbox?.hasAttribute('data-checked');
    })
    .map((index) => String(index + 1));
}

/** Shift-click a row checkbox: mousedown captures the modifier, click toggles. */
function shiftClickRow(container: HTMLElement, rowIndex: number) {
  const cell = bodyRows(container)[rowIndex].querySelector('[data-slot="table-select-cell"]');
  const checkbox = bodyCheckboxes(container)[rowIndex];
  fireEvent.mouseDown(cell!, { shiftKey: true, metaKey: false, ctrlKey: false });
  fireEvent.click(checkbox, { shiftKey: true, metaKey: false, ctrlKey: false });
}

function plainClickRow(container: HTMLElement, rowIndex: number) {
  fireEvent.click(bodyCheckboxes(container)[rowIndex]);
}

describe('table modifierSelect — checkbox gestures', () => {
  it('shift-click unions the range from the last acted row (additive, view order)', () => {
    const { container } = renderTable({
      rowSelection: { type: 'checkbox', modifierSelect: true },
    });
    plainClickRow(container, 0);
    expect(checkedKeys(container)).toEqual(['1']);

    shiftClickRow(container, 2);
    expect(checkedKeys(container)).toEqual(['1', '2', '3']);
  });

  it('plain click after a shift range moves the anchor for the next range', () => {
    const { container } = renderTable({
      rowSelection: { type: 'checkbox', modifierSelect: true },
    });
    plainClickRow(container, 0);
    shiftClickRow(container, 2);
    expect(checkedKeys(container)).toEqual(['1', '2', '3']);

    plainClickRow(container, 3);
    expect(checkedKeys(container)).toEqual(['1', '2', '3', '4']);
  });

  it('cmd/ctrl+A inside the table selects all checkable rows of the current view', () => {
    const { container } = renderTable({
      rowSelection: { type: 'checkbox', modifierSelect: true },
    });
    const table = container.querySelector('.nop-table') as HTMLElement;
    fireEvent.keyDown(table, { key: 'a', metaKey: true, ctrlKey: false });
    expect(checkedKeys(container)).toEqual(['1', '2', '3', '4']);

    fireEvent.keyDown(table, { key: 'a', metaKey: false, ctrlKey: true });
    expect(checkedKeys(container)).toEqual(['1', '2', '3', '4']);
  });

  it('ignores cmd/ctrl+A when the event target is an editable element inside the table', () => {
    const { container } = renderTable({
      rowSelection: { type: 'checkbox', modifierSelect: true },
    });
    const table = container.querySelector('.nop-table') as HTMLElement;
    const injected = document.createElement('input');
    injected.setAttribute('data-slot', 'injected-input');
    table.appendChild(injected);

    fireEvent.keyDown(injected, { key: 'a', metaKey: true });
    expect(checkedKeys(container)).toEqual([]);
  });
});

describe('table modifierSelect — toggleOnRowClick gestures', () => {
  it('shift-click on a toggleable row extends the selection from the anchor', () => {
    const { container } = renderTable({
      rowSelection: { type: 'checkbox', modifierSelect: true, toggleOnRowClick: true },
    });
    const rows = bodyRows(container);

    fireEvent.click(rows[0]);
    expect(checkedKeys(container)).toEqual(['1']);

    fireEvent.click(rows[2], { shiftKey: true, metaKey: false, ctrlKey: false });
    expect(checkedKeys(container)).toEqual(['1', '2', '3']);
  });
});

describe('table modifierSelect — compat parity', () => {
  it('without modifierSelect a shift-click stays a plain toggle (single row)', () => {
    const { container } = renderTable({
      rowSelection: { type: 'checkbox' },
    });
    plainClickRow(container, 0);
    expect(checkedKeys(container)).toEqual(['1']);

    shiftClickRow(container, 2);
    // plain toggle of row 3 only — no range union
    expect(checkedKeys(container)).toEqual(['1', '3']);
  });
});

describe('table modifierSelect — radio inertia', () => {
  it('shift-click on a radio selection selects that single row only', () => {
    const { container } = renderTable({
      rowSelection: { type: 'radio', modifierSelect: true },
    });
    const radios = () =>
      Array.from(container.querySelectorAll('[data-slot="table-select-cell"] [role="radio"]'));
    fireEvent.click(radios()[2]!);
    const checkedRadios = () =>
      radios()
        .map((radio, index) => (radio.getAttribute('aria-checked') === 'true' ? index : -1))
        .filter((index) => index >= 0);
    expect(checkedRadios()).toEqual([2]);

    fireEvent.click(radios()[0]!, { shiftKey: true });
    expect(checkedRadios()).toEqual([0]);
  });
});
