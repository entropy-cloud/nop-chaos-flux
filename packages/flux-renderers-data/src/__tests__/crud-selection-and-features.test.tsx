import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '@nop-chaos/ui';
import type { RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import { buttonRenderer, createDataSchemaRenderer, env, formulaCompiler } from '../test-support';

function DisabledAwareButtonRenderer(props: RendererComponentProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={props.meta.disabled}
      onClick={() => void props.events.onClick?.()}
    >
      {String(props.props.label ?? 'Button')}
    </Button>
  );
}

const disabledAwareButtonRenderer: RendererDefinition = {
  type: 'button',
  component: DisabledAwareButtonRenderer,
  fields: [{ key: 'onClick', kind: 'event' }],
};

describe('CRUD selection and features', () => {
  it('updates selection-driven list action disabled state and clears it on refresh when configured', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([disabledAwareButtonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-selection-list-actions"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'selection-list-action-crud',
              autoClearSelectionOnRefresh: true,
              source: [
                { id: '1', name: 'Alice' },
                { id: '2', name: 'Bob' },
              ],
              toolbar: [
                {
                  type: 'button',
                  label: 'Refresh current list',
                  onClick: {
                    action: 'component:refresh',
                    componentId: 'selection-list-action-crud',
                  },
                },
              ],
              listActions: [
                {
                  type: 'button',
                  label: 'Bulk Delete',
                  disabled: '${!$crud.hasSelection}',
                },
              ],
              footerToolbar: [{ type: 'text', text: 'Selected rows: ${$crud.selectionCount}' }],
              columns: [{ name: 'name', label: 'Name' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const bulkDeleteButton = screen.getByRole('button', { name: 'Bulk Delete' });
    expect(bulkDeleteButton.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText('Selected rows: 0')).toBeTruthy();

    const checkboxes = document.querySelectorAll('[data-slot="checkbox"]');
    fireEvent.click(checkboxes[1] as HTMLElement);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Bulk Delete' }).hasAttribute('disabled')).toBe(
        false,
      );
      expect(screen.getByText('Selected rows: 1')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Refresh current list' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Bulk Delete' }).hasAttribute('disabled')).toBe(
        true,
      );
      expect(screen.getByText('Selected rows: 0')).toBeTruthy();
    });
  });

  it('forwards responsive expand baseline through crud into the internal table', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-responsive-expand"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              rowKey: 'id',
              responsive: {
                mode: 'expand',
                breakpoint: 1400,
                expandTrigger: 'row',
              },
              source: [{ id: '1', name: 'Alpha', owner: 'Alice', status: 'active' }],
              columns: [
                { name: 'name', label: 'Name' },
                { name: 'owner', label: 'Owner' },
                { name: 'status', label: 'Status' },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      const headers = Array.from(document.querySelectorAll('[data-slot="table-head"]')).map(
        (node) => node.textContent?.replace(/\s+/g, ' ').trim(),
      );
      expect(headers).toEqual(['Name']);
      expect(screen.queryByText('Alice')).toBeNull();
    });

    fireEvent.click(screen.getByText('Alpha'));

    await waitFor(() => {
      expect(screen.getByText('Owner')).toBeTruthy();
      expect(screen.getByText('Alice')).toBeTruthy();
      expect(screen.getByText('Status')).toBeTruthy();
      expect(screen.getByText('active')).toBeTruthy();
    });
  });

  it('keeps operation column interactions working inside CRUD tables', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-operation-column"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              source: [
                { id: '1', name: 'Alice' },
                { id: '2', name: 'Bob' },
              ],
              columns: [
                { name: 'name', label: 'Name' },
                {
                  type: 'operation',
                  label: 'Actions',
                  buttons: [
                    {
                      type: 'button',
                      label: 'Inspect',
                      onClick: {
                        action: 'openDialog',
                        args: {
                          title: 'Inspect record',
                          body: [{ type: 'text', text: 'User: ${$slot.record.name}' }],
                        },
                      },
                    },
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

    const inspectButtons = screen.getAllByText('Inspect');
    fireEvent.click(inspectButtons[1]);

    expect(await screen.findByText('Inspect record')).toBeTruthy();
  });

  it('registers component handles for refresh and selection', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    const onComponentRegistryChange = vi.fn((registry) => registry?.setDebugEnabled?.(true));

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'handle-crud',
              source: [{ id: '1', name: 'Alice' }],
              columns: [{ name: 'name', label: '姓名' }],
              toolbar: [
                {
                  type: 'button',
                  label: 'Refresh',
                  onClick: {
                    action: 'component:refresh',
                    componentId: 'handle-crud',
                  },
                },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onComponentRegistryChange={onComponentRegistryChange}
      />,
    );

    const registry = onComponentRegistryChange.mock.calls[0]?.[0];
    expect(registry).toBeTruthy();

    const handle = registry?.resolve?.({ componentId: 'handle-crud' });
    expect(handle?.type).toBe('crud');
    expect(handle?.capabilities?.hasMethod?.('refresh')).toBe(true);
    expect(handle?.capabilities?.hasMethod?.('getSelection')).toBe(true);
    expect(handle?.capabilities?.hasMethod?.('clearSelection')).toBe(true);
  });
});
