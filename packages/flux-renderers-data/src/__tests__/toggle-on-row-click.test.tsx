import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

afterEach(() => cleanup());

function renderTable(schemaProps: Record<string, unknown>) {
  const SchemaRenderer = createDataSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://table-toggle-row-click"
      schema={
        {
          type: 'page',
          body: [
            {
              type: 'table',
              testid: 'toggle-table',
              rowKey: 'id',
              source: [
                { id: '1', name: 'Alice' },
                { id: '2', name: 'Bob' },
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

/** Body row checkboxes (skip the header select-all checkbox). */
function bodyCheckboxes(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      '[data-slot="table-select-cell"] [role="checkbox"]',
    ),
  );
}

function checkedBodyCount(container: HTMLElement): number {
  return bodyCheckboxes(container).filter(
    (cb) => cb.getAttribute('aria-checked') === 'true' || cb.hasAttribute('data-checked'),
  ).length;
}

describe('Table rowSelection.toggleOnRowClick', () => {
  it('adds toggleable marker on body rows when toggleOnRowClick is true', () => {
    const { container } = renderTable({
      rowSelection: { type: 'checkbox', toggleOnRowClick: true },
    });
    const bodyRows = container.querySelectorAll('tbody [data-slot="table-row"]');
    expect(bodyRows.length).toBeGreaterThanOrEqual(1);
    expect(bodyRows[0].getAttribute('data-row-toggleable')).toBe('true');
  });

  it('does not add marker when toggleOnRowClick is absent', () => {
    const { container } = renderTable({
      rowSelection: { type: 'checkbox' },
    });
    const bodyRows = container.querySelectorAll('tbody [data-slot="table-row"]');
    expect(bodyRows[0].getAttribute('data-row-toggleable')).toBeNull();
  });

  it('clicking a body row toggles its checkbox selection', () => {
    const { container } = renderTable({
      rowSelection: { type: 'checkbox', toggleOnRowClick: true },
    });
    const bodyRows = container.querySelectorAll('tbody [data-slot="table-row"]');
    expect(checkedBodyCount(container)).toBe(0);

    fireEvent.click(bodyRows[0]);

    expect(checkedBodyCount(container)).toBe(1);
    // first row's checkbox is now checked
    expect(
      bodyCheckboxes(container)[0].getAttribute('aria-checked') === 'true' ||
        bodyCheckboxes(container)[0].hasAttribute('data-checked'),
    ).toBe(true);
  });

  it('clicking again deselects the row', () => {
    const { container } = renderTable({
      rowSelection: { type: 'checkbox', toggleOnRowClick: true },
    });
    const bodyRows = container.querySelectorAll('tbody [data-slot="table-row"]');
    fireEvent.click(bodyRows[0]);
    expect(checkedBodyCount(container)).toBe(1);
    fireEvent.click(bodyRows[0]);
    expect(checkedBodyCount(container)).toBe(0);
  });

  it('clicking an interactive control (anchor) inside the row does NOT toggle', () => {
    const { container } = renderTable({
      rowSelection: { type: 'checkbox', toggleOnRowClick: true },
    });
    const bodyRows = container.querySelectorAll('tbody [data-slot="table-row"]');
    // Inject an <a> into the first body row's first cell to simulate an interactive control.
    const firstCell = bodyRows[0].querySelector('[data-slot="table-cell"]');
    expect(firstCell).toBeTruthy();
    const anchor = document.createElement('a');
    anchor.textContent = 'link';
    anchor.href = '#';
    firstCell!.appendChild(anchor);
    fireEvent.click(anchor);
    expect(checkedBodyCount(container)).toBe(0);
  });

  it('clicking the checkbox itself does not double-toggle (row toggle skipped)', () => {
    const { container } = renderTable({
      rowSelection: { type: 'checkbox', toggleOnRowClick: true },
    });
    const firstCheckbox = bodyCheckboxes(container)[0];
    fireEvent.click(firstCheckbox);
    // Checkbox toggles to checked; row-level toggle did NOT fire to immediately deselect it.
    expect(checkedBodyCount(container)).toBe(1);
  });

  it('maxSelectionLength: clicking an unselected row when max reached does NOT toggle', () => {
    const { container } = renderTable({
      rowSelection: {
        type: 'checkbox',
        toggleOnRowClick: true,
        maxSelectionLength: 1,
        selectedRowKeys: ['1'],
      },
    });
    // Row 1 already selected (seeded); clicking row 2 must not exceed max.
    const bodyRows = container.querySelectorAll('tbody [data-slot="table-row"]');
    expect(bodyRows.length).toBeGreaterThanOrEqual(2);
    fireEvent.click(bodyRows[1]);
    expect(checkedBodyCount(container)).toBe(1);
  });

  it('coexists with custom onRowClick (selection still toggles)', () => {
    const { container } = renderTable({
      rowSelection: { type: 'checkbox', toggleOnRowClick: true },
      onRowClick: { action: 'setValue', args: { path: 'rowClicked', value: true } },
    });
    const bodyRows = container.querySelectorAll('tbody [data-slot="table-row"]');
    fireEvent.click(bodyRows[0]);
    // Selection toggled alongside the custom action.
    expect(checkedBodyCount(container)).toBe(1);
  });
});
