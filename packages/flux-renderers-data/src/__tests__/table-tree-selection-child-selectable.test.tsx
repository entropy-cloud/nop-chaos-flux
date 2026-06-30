import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

// G2: a nested tree child (only reachable via flattenTreeRows, NOT a top-level
// source row) must be selectable and STAY selected. Previously the table fed
// top-level rows to selection, so currentRowKeySet lacked child keys and the
// render-time prune snapped the just-checked child back to unchecked on the
// very next render. This anchor locks the wiring fix (selection consumes the
// flattened row set).
describe('table tree selection — nested child is selectable and persists (G2)', () => {
  afterEach(() => {
    cleanup();
  });

  function renderTreeTable() {
    const SchemaRenderer = createDataSchemaRenderer();
    return render(
      <SchemaRenderer
        schemaUrl="test://data/tree-child-select"
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
                    { id: 'c1', name: 'Child1' },
                    { id: 'c2', name: 'Child2' },
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
  }

  function getChildRow(container: HTMLElement, text: string): HTMLElement {
    const childRows = Array.from(
      container.querySelectorAll('tbody [data-slot="table-row"][data-level="1"]'),
    );
    const row = childRows.find((r) => r.textContent?.includes(text));
    if (!row) {
      throw new Error(`Could not find child row containing "${text}"`);
    }
    return row as HTMLElement;
  }

  it('selecting an expanded nested child keeps it selected (no phantom prune of child keys)', () => {
    const { container } = renderTreeTable();

    // Initially only the collapsed parent is rendered (body rows only — the
    // header <tr> also carries the table-row slot, so scope under tbody).
    expect(container.querySelectorAll('tbody [data-slot="table-row"]')).toHaveLength(1);

    // Expand the parent so nested children flatten into the rendered row set.
    const treeToggle = container.querySelector(
      '[data-slot="table-tree-toggle"]',
    ) as HTMLElement;
    expect(treeToggle).toBeTruthy();
    fireEvent.click(treeToggle);

    // Parent + two nested children.
    expect(container.querySelectorAll('tbody [data-slot="table-row"]')).toHaveLength(3);

    const c1Row = getChildRow(container, 'Child1');
    const c1Checkbox = within(c1Row).getByRole('checkbox') as HTMLElement;
    expect(c1Checkbox.hasAttribute('data-checked')).toBe(false);

    // Select the nested child c1.
    fireEvent.click(c1Checkbox);

    // G2: the child MUST stay selected — currentRowKeySet now includes the
    // flattened child key, so the render-time prune can no longer drop it.
    const c1CheckboxAfter = within(getChildRow(container, 'Child1')).getByRole(
      'checkbox',
    ) as HTMLElement;
    expect(c1CheckboxAfter.hasAttribute('data-checked')).toBe(true);

    // Selecting c2 as well: both children remain selected together.
    const c2Checkbox = within(getChildRow(container, 'Child2')).getByRole(
      'checkbox',
    ) as HTMLElement;
    fireEvent.click(c2Checkbox);
    expect(
      within(getChildRow(container, 'Child1')).getByRole('checkbox').hasAttribute('data-checked'),
    ).toBe(true);
    expect(
      within(getChildRow(container, 'Child2')).getByRole('checkbox').hasAttribute('data-checked'),
    ).toBe(true);
  });

  it('select-all covers the flattened visible rows including expanded children', () => {
    const { container } = renderTreeTable();

    // Expand parent.
    fireEvent.click(
      container.querySelector('[data-slot="table-tree-toggle"]') as HTMLElement,
    );

    // Click the header select-all checkbox (lives in the header row).
    const headerCheckbox = container.querySelector(
      'thead [role="checkbox"]',
    ) as HTMLElement;
    expect(headerCheckbox).toBeTruthy();
    fireEvent.click(headerCheckbox);

    // Every flattened row (parent + both children) is selected.
    expect(
      within(getChildRow(container, 'Child1')).getByRole('checkbox').hasAttribute('data-checked'),
    ).toBe(true);
    expect(
      within(getChildRow(container, 'Child2')).getByRole('checkbox').hasAttribute('data-checked'),
    ).toBe(true);
  });
});
