import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { buttonRenderer, createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

afterEach(cleanup);

describe('batch-bar crud host (P2b antdpro-list hand-assembled envelope equivalence)', () => {
  it('expresses the alert envelope: count text + empty-hidden envelope + built-in clear via $crud scope contract', async () => {
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://data/batch-bar-host-crud"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'host-crud',
              selection: {},
              source: [
                { id: '1', name: 'Alice' },
                { id: '2', name: 'Bob' },
                { id: '3', name: 'Carol' },
              ],
              toolbar: [
                {
                  type: 'batch-bar',
                  testid: 'host-bar',
                  selectionPath: '$crud.selectedRowKeys',
                  countTemplate: '已选择 ${count} 项',
                  clearTarget: 'host-crud',
                },
              ],
              footerToolbar: [
                { type: 'text', text: 'Selected rows: ${$crud.selectionCount}' },
              ],
              columns: [{ name: 'name', label: 'Name' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.queryByTestId('host-bar')).toBeNull();
    expect(screen.getByText('Selected rows: 0')).toBeTruthy();

    const checkboxes = document.querySelectorAll('[data-slot="checkbox"]');
    // [0] = header select-all; rows follow.
    fireEvent.click(checkboxes[1] as HTMLElement);
    fireEvent.click(checkboxes[3] as HTMLElement);

    await waitFor(() => {
      expect(screen.getByTestId('host-bar')).toBeTruthy();
      expect(screen.getByText('已选择 2 项')).toBeTruthy();
      expect(screen.getByText('Selected rows: 2')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('host-bar-clear'));

    await waitFor(() => {
      expect(screen.queryByTestId('host-bar')).toBeNull();
      expect(screen.getByText('Selected rows: 0')).toBeTruthy();
    });
  });
});

describe('batch-bar table host (P4b linear bulk bar equivalence)', () => {
  it('binds the page-scope selectionStatePath and clears through the table setSelection handle', async () => {
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://data/batch-bar-host-table"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              id: 'host-table',
              rowKey: 'id',
              source: [
                { id: 'a', name: 'Issue A' },
                { id: 'b', name: 'Issue B' },
                { id: 'c', name: 'Issue C' },
              ],
              rowSelection: { type: 'checkbox' },
              selectionOwnership: 'scope',
              selectionStatePath: 'issueSelection',
              columns: [{ name: 'name', label: 'Name' }],
            },
            {
              type: 'batch-bar',
              testid: 'host-bar',
              selectionPath: 'issueSelection',
              countTemplate: '已选 ${count} 项',
              clearTarget: 'host-table',
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.queryByTestId('host-bar')).toBeNull();

    const checkboxes = document.querySelectorAll('[data-slot="checkbox"]');
    expect(checkboxes.length).toBeGreaterThan(0);
    // [0] = header select-all; rows follow.
    fireEvent.click(checkboxes[1] as HTMLElement);

    await waitFor(() => {
      expect(screen.getByTestId('host-bar')).toBeTruthy();
      expect(screen.getByText('已选 1 项')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('host-bar-clear'));

    await waitFor(() => {
      expect(screen.queryByTestId('host-bar')).toBeNull();
    });

    const checkboxesAfter = document.querySelectorAll('[data-slot="checkbox"]');
    for (const checkbox of checkboxesAfter) {
      expect((checkbox as HTMLElement).getAttribute('data-state') ?? '').not.toContain('checked');
    }
  });
});
