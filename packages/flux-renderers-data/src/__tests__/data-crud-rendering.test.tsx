import { cleanup, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@nop-chaos/flux-i18n';
import { buttonRenderer, createDataSchemaRenderer, env, formulaCompiler } from '../test-support';

describe('CRUD renderer', () => {
  it('renders crud shell with toolbar and list action regions', async () => {
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
              listActions: [
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
      />,
    );

    const crudRoot = document.querySelector('.nop-crud');
    expect(crudRoot).toBeTruthy();
    expect(document.querySelector('[data-slot="crud-toolbar"]')).toBeTruthy();
    expect(screen.getByText('新增')).toBeTruthy();
    expect(screen.getByText('批量删除')).toBeTruthy();
  });

  it('renders empty state when source is empty', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/crud"
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
      />,
    );

    expect(screen.getByText('暂无用户数据')).toBeTruthy();
  });

  it('uses localized default empty text when empty is omitted', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-default-empty"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              source: [],
              columns: [{ name: 'name', label: 'Name' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.getByText(t('flux.common.noData'))).toBeTruthy();
  });

  it('renders queryForm through an internal form schema', async () => {
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
      />,
    );

    expect(screen.getByText('Query filters')).toBeTruthy();
    expect(document.querySelector('[data-slot="form-actions"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="crud-query-controls"]')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: t('flux.common.search') })).toHaveLength(1);
  });

  it('renders footer toolbar and toolbar layout blocks', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-toolbar-layout"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'toolbar-crud',
              source: [{ id: '1', name: 'Alice' }],
              listActions: [{ type: 'button', label: 'Bulk Delete' }],
              toolbarLayout: {
                header: ['listActions', 'pagination'],
                footer: ['statistics', 'switch-per-page'],
              },
              footerToolbar: [{ type: 'text', text: 'Footer region' }],
              columns: [{ name: 'name', label: 'Name' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(document.querySelector('[data-slot="crud-list-actions"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="header-toolbar-list-actions"]')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Bulk Delete' })).toHaveLength(2);
    expect(screen.getByText('Footer region')).toBeTruthy();
    expect(document.querySelector('[data-slot="header-toolbar-pagination"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="footer-toolbar-statistics"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="footer-toolbar-page-size"]')).toBeTruthy();
  });

  it('maintains stable DOM markers for styling', async () => {
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
              className: 'custom-crud',
              source: [{ id: '1', name: 'Alice' }],
              columns: [{ name: 'name', label: '姓名' }],
              toolbar: [{ type: 'button', label: 'Add' }],
              listActions: [{ type: 'button', label: 'Delete' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const crudRoot = document.querySelector('.nop-crud');
    expect(crudRoot).toBeTruthy();
    expect(crudRoot?.classList.contains('custom-crud')).toBe(true);
    expect(document.querySelector('[data-slot="crud-toolbar"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="crud-toolbar-main"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="crud-list-actions"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="crud-table"]')).toBeTruthy();
  });
});
