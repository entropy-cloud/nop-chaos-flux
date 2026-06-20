import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { buttonRenderer, createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

afterEach(cleanup);

describe('CRUD selection drift — renderer-level DOM verification', () => {
  it('maxSelectionLength: 1 — non-selected checkbox becomes disabled after limit reached', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-max-selection-renderer"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'max-selection-renderer-crud',
              rowKey: 'id',
              selection: { type: 'checkbox', maxSelectionLength: 1 },
              source: [
                { id: '1', name: 'Alice' },
                { id: '2', name: 'Bob' },
              ],
              columns: [{ name: 'name', label: 'Name' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(document.querySelectorAll('tbody [data-slot="table-row"]').length).toBe(2);
    });

    const rowCheckboxes = Array.from(
      document.querySelectorAll('tbody [data-slot="checkbox"]'),
    );
    expect(rowCheckboxes[0].hasAttribute('disabled')).toBe(false);
    expect(rowCheckboxes[0].hasAttribute('data-disabled')).toBe(false);
    expect(rowCheckboxes[1].hasAttribute('disabled')).toBe(false);
    expect(rowCheckboxes[1].hasAttribute('data-disabled')).toBe(false);

    fireEvent.click(rowCheckboxes[0] as HTMLElement);

    await waitFor(() => {
      expect(
        rowCheckboxes[1].hasAttribute('disabled') ||
          rowCheckboxes[1].hasAttribute('data-disabled'),
      ).toBe(true);
    });
  });

  it('checkableWhen: expression — falsy rows render with disabled checkbox', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-checkable-when-renderer"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'checkable-when-renderer-crud',
              rowKey: 'id',
              selection: {
                type: 'checkbox',
                checkableWhen: "record.status === 'active'",
              },
              source: [
                { id: '1', name: 'Alice', status: 'active' },
                { id: '2', name: 'Bob', status: 'draft' },
              ],
              columns: [{ name: 'name', label: 'Name' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(document.querySelectorAll('tbody [data-slot="table-row"]').length).toBe(2);
    });

    const rowCheckboxes = Array.from(
      document.querySelectorAll('tbody [data-slot="checkbox"]'),
    );

    await waitFor(() => {
      expect(
        rowCheckboxes[0].hasAttribute('disabled') ||
          rowCheckboxes[0].hasAttribute('data-disabled'),
      ).toBe(false);
      expect(
        rowCheckboxes[1].hasAttribute('disabled') ||
          rowCheckboxes[1].hasAttribute('data-disabled'),
      ).toBe(true);
    });
  });

  it('selection without drift fields — all checkboxes enabled (negative baseline)', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-no-drift-renderer"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'no-drift-renderer-crud',
              rowKey: 'id',
              selection: { type: 'checkbox' },
              source: [
                { id: '1', name: 'Alice' },
                { id: '2', name: 'Bob' },
              ],
              columns: [{ name: 'name', label: 'Name' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(document.querySelectorAll('tbody [data-slot="table-row"]').length).toBe(2);
    });

    const rowCheckboxes = Array.from(
      document.querySelectorAll('tbody [data-slot="checkbox"]'),
    );
    expect(
      rowCheckboxes[0].hasAttribute('disabled') ||
        rowCheckboxes[0].hasAttribute('data-disabled'),
    ).toBe(false);
    expect(
      rowCheckboxes[1].hasAttribute('disabled') ||
        rowCheckboxes[1].hasAttribute('data-disabled'),
    ).toBe(false);
  });

  it('maxKeepSelectionLength in schema has no observable effect on selection count', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-max-keep-ignored"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'max-keep-ignored-crud',
              rowKey: 'id',
              selection: {
                type: 'checkbox',
                maxKeepSelectionLength: 999,
              } as any,
              source: [
                { id: '1', name: 'Alice' },
                { id: '2', name: 'Bob' },
              ],
              footerToolbar: [{ type: 'text', text: 'Count: ${$crud.selectionCount}' }],
              columns: [{ name: 'name', label: 'Name' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Count: 0')).toBeTruthy();
    });

    const rowCheckboxes = Array.from(
      document.querySelectorAll('tbody [data-slot="checkbox"]'),
    );
    expect(rowCheckboxes.length).toBe(2);

    fireEvent.click(rowCheckboxes[0] as HTMLElement);
    fireEvent.click(rowCheckboxes[1] as HTMLElement);

    await waitFor(() => {
      expect(screen.getByText('Count: 2')).toBeTruthy();
    });
  });
});
