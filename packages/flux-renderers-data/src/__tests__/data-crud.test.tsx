import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import {
  buttonRenderer,
  createDataSchemaRenderer,
  env,
  formulaCompiler,
} from '../test-support';

const formRenderer: RendererDefinition = {
  type: 'form',
  component: (props) => (
    <form data-testid="query-form-renderer">
      {props.regions.body?.render()}
      {props.regions.actions?.render()}
    </form>
  ),
  regions: ['body', 'actions'],
};

describe('CRUD renderer', () => {
  it('renders crud shell with toolbar and table regions', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'users-crud',
              name: 'usersCrud',
              statusPath: 'crudStatus',
              rowKey: 'id',
              source: [
                { id: '1', name: 'Alice' },
                { id: '2', name: 'Bob' },
              ],
              toolbar: [
                {
                  type: 'button',
                  label: '新增',
                },
              ],
              bulkActions: [
                {
                  type: 'button',
                  label: '批量删除',
                  disabled: '${!$crud.hasSelection}',
                },
              ],
              columns: [
                { name: 'name', label: '姓名' },
                {
                  type: 'operation',
                  label: '操作',
                  buttons: [
                    {
                      type: 'button',
                      label: '查看',
                    },
                    {
                      type: 'button',
                      label: '修改',
                    },
                  ],
                },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    const crudRoot = document.querySelector('.nop-crud');
    expect(crudRoot).toBeTruthy();
    expect(document.querySelector('[data-slot="crud-toolbar"]')).toBeTruthy();
    expect(screen.getByText('新增')).toBeTruthy();
    expect(screen.getByText('批量删除')).toBeTruthy();
  });

  it('exposes crud status summary through $crud binding', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    render(
      <SchemaRenderer
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
              bulkActions: [
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
      />
    );

    expect(screen.getByText('Selection: no')).toBeTruthy();
  });

  it('keeps $crud selection summary aligned with scope-owned table selection', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'selection-crud',
              selectionOwnership: 'scope',
              selectionStatePath: 'crudSelection.keys',
              source: [
                { id: '1', name: 'Alice' },
                { id: '2', name: 'Bob' },
              ],
              columns: [{ name: 'name', label: '姓名' }],
              bulkActions: [
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
      />
    );

    expect(screen.getByText('Selected: 0')).toBeTruthy();
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    fireEvent.click(checkboxes[1] as HTMLInputElement);
    await waitFor(() => expect(screen.getByText('Selected: 1')).toBeTruthy());
  });

  it('renders empty state when source is empty', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              source: [],
              columns: [{ name: 'name', label: '姓名' }],
              empty: '暂无用户数据',
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    expect(screen.getByText('暂无用户数据')).toBeTruthy();
  });

  it('renders queryForm through an internal form schema', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer, formRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'users-crud',
              queryForm: {
                body: [{ type: 'text', text: 'Query filters' }],
                actions: [{ type: 'button', label: 'Search' }],
              },
              source: [],
              columns: [{ name: 'name', label: '姓名' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    expect(await screen.findByTestId('query-form-renderer')).toBeTruthy();
    expect(screen.getByText('Query filters')).toBeTruthy();
    expect(screen.getByText('Search')).toBeTruthy();
  });

  it('registers component handles for refresh and selection', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    const onComponentRegistryChange = vi.fn((registry) => registry?.setDebugEnabled?.(true));

    render(
      <SchemaRenderer
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
      />
    );

    const registry = onComponentRegistryChange.mock.calls[0]?.[0];
    expect(registry).toBeTruthy();

    const handle = registry?.resolve?.({ componentId: 'handle-crud' });
    expect(handle?.type).toBe('crud');
    expect(handle?.capabilities?.hasMethod?.('refresh')).toBe(true);
    expect(handle?.capabilities?.hasMethod?.('getSelection')).toBe(true);
    expect(handle?.capabilities?.hasMethod?.('clearSelection')).toBe(true);
  });

  it('maintains stable DOM markers for styling', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              className: 'custom-crud',
              source: [{ id: '1', name: 'Alice' }],
              columns: [{ name: 'name', label: '姓名' }],
              toolbar: [{ type: 'button', label: 'Add' }],
              bulkActions: [{ type: 'button', label: 'Delete' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    const crudRoot = document.querySelector('.nop-crud');
    expect(crudRoot).toBeTruthy();
    expect(crudRoot?.classList.contains('custom-crud')).toBe(true);
    expect(document.querySelector('[data-slot="crud-toolbar"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="crud-toolbar-main"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="crud-bulk-actions"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="crud-table"]')).toBeTruthy();
  });
});
