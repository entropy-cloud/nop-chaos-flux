import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { buttonRenderer, createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

describe('CRUD binding and status', () => {
  it('exposes crud status summary through $crud binding', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/crud"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'status-crud',
              statusPath: 'crudStatus',
              source: [
                { id: '1', name: 'Alice' },
                { id: '2', name: 'Bob' },
              ],
              columns: [{ name: 'name', label: '姓名' }],
              listActions: [
                {
                  type: 'text',
                  text: 'Selection: ${$crud.hasSelection ? "yes" : "no"}',
                },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.getByText('Selection: no')).toBeTruthy();
  });

  it('keeps $crud selection summary aligned with scope-owned table selection', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/crud"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'selection-crud',
              selection: {},
              selectionOwnership: 'scope',
              selectionStatePath: 'crudSelection.keys',
              source: [
                { id: '1', name: 'Alice' },
                { id: '2', name: 'Bob' },
              ],
              columns: [{ name: 'name', label: '姓名' }],
              listActions: [
                {
                  type: 'text',
                  text: 'Selected: ${$crud.selectionCount}',
                },
              ],
            },
          ],
        }}
        data={{ crudSelection: { keys: [] } }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.getByText('Selected: 0')).toBeTruthy();
    const checkboxes = document.querySelectorAll('[data-slot="checkbox"]');
    fireEvent.click(checkboxes[1] as HTMLElement);
    await waitFor(() => expect(screen.getByText('Selected: 1')).toBeTruthy());
  });

  it('publishes visibleColumnNames through $crud using the same column-settings ownership paths as the internal table', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-visible-columns-summary"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'visible-columns-crud',
              columnSettings: {
                enabled: true,
                toggledColumnsStatePath: 'crudState.toggledColumns',
                orderedColumnsStatePath: 'crudState.orderedColumns',
              },
              source: [{ id: '1', name: 'Alice', email: 'alice@example.com', role: 'Admin' }],
              columns: [
                { name: 'name', label: 'Name' },
                { name: 'email', label: 'Email' },
                { name: 'role', label: 'Role' },
              ],
              footerToolbar: [{ type: 'text', text: 'Visible: ${$crud.visibleColumnNames}' }],
            },
          ],
        }}
        data={{
          crudState: {
            toggledColumns: ['role', 'name'],
            orderedColumns: ['role', 'name', 'email'],
          },
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Visible: role,name')).toBeTruthy();
      const headers = Array.from(document.querySelectorAll('[data-slot="table-head"]')).map(
        (node) => node.textContent?.replace(/\s+/g, ' ').trim(),
      );
      expect(headers).toEqual(['Role', 'Name']);
      expect(screen.queryByText('alice@example.com')).toBeNull();
    });
  });

});
