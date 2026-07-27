import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createDataSchemaRenderer, formulaCompiler } from '../test-support.js';

/**
 * 复现 nop-chaos-next 集成场景：crud 的 loadAction 是 ajax action，
 * env.fetcher 返回 ApiResponse（{ok, status, data}，data 是业务数据 {items,total}）。
 * 现有 crud-loadaction.test.tsx 用 probe:load（绕过 fetcher），这里专测 ajax 路径。
 */
describe('CRUD loadAction via ajax + env.fetcher', () => {
  it('renders rows when ajax loadAction fetcher resolves with {items,total}', async () => {
    cleanup();
    const fetcher = vi.fn(async () => ({
      ok: true,
      status: 0,
      data: {
        items: [
          { id: '1', name: 'AjaxItem1' },
          { id: '2', name: 'AjaxItem2' },
        ],
        total: 2,
      },
    })) as never;

    const SchemaRenderer = createDataSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-loadaction-ajax"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'load-crud',
              loadAction: { action: 'ajax', args: { url: '/r/Test__findPage' } },
              columns: [{ name: 'name', label: 'Name' }],
              rowKey: 'id',
            },
          ],
        }}
        env={{ notify: () => undefined, fetcher }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('AjaxItem1')).toBeTruthy();
      expect(screen.getByText('AjaxItem2')).toBeTruthy();
    });
  });

  it('renders rows even without explicit rowKey (nop-entropy grid_crud scenario)', async () => {
    cleanup();
    const fetcher = vi.fn(async () => ({
      ok: true,
      status: 0,
      data: {
        // nop PageBean 含大量额外字段
        extData: null,
        hasNext: false,
        hasPrev: false,
        items: [{ id: '1', userName: 'NoKeyUser' }],
        limit: 10,
        nextCursor: null,
        offset: 0,
        page: 1,
        pageCount: 1,
        prevCursor: null,
        total: 1,
      },
    })) as never;

    const SchemaRenderer = createDataSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-loadaction-no-rowkey"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'load-crud',
              loadAction: { action: 'ajax', args: { url: '/r/NopAuthUser__findPage' } },
              columns: [{ name: 'userName', label: 'User Name' }],
              // 故意不配 rowKey，复现 nop-entropy grid_crud.xpl 的输出
            },
          ],
        }}
        env={{ notify: () => undefined, fetcher }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('NoKeyUser')).toBeTruthy();
    });
  });

  it('triggers ajax loadAction on mount WITHOUT dependsOn (nop-entropy grid_crud has none)', async () => {
    cleanup();
    const fetcher = vi.fn(async () => ({
      ok: true,
      status: 0,
      data: { items: [{ id: '1', name: 'NoDepItem' }], total: 1 },
    })) as never;

    const SchemaRenderer = createDataSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-loadaction-no-dependsson"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'load-crud',
              // 故意不写 dependsOn，复现 nop-entropy grid_crud.xpl 的 loadAction 输出
              loadAction: { action: 'ajax', args: { url: '/r/NopAuthUser__findPage' } },
              columns: [{ name: 'name', label: 'Name' }],
              rowKey: 'id',
            },
          ],
        }}
        env={{ notify: () => undefined, fetcher }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(
      () => {
        expect(screen.getByText('NoDepItem')).toBeTruthy();
      },
      { timeout: 3000 },
    );
  });

  it('renders rows with full env (loadDict/loadPage/navigate/confirm/locale) like nop-chaos-next', async () => {
    cleanup();
    const fetcher = vi.fn(async () => ({
      ok: true,
      status: 0,
      data: {
        items: [
          { id: '1', userName: 'FullEnvUser', status: 1 },
        ],
        total: 1,
      },
    })) as never;

    const SchemaRenderer = createDataSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-loadaction-full-env"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'crud-grid',
              name: 'crud-grid',
              loadAction: { action: 'ajax', args: { url: '@query:NopAuthUser__findPage' } },
              footerToolbar: [{ type: 'statistics' }, { type: 'pagination' }],
              columns: [
                { name: 'userName', label: '用户名' },
                { name: 'status', label: '状态', type: 'mapping', map: { 1: '启用', 0: '禁用' } },
              ],
            },
          ],
        }}
        env={{
          fetcher,
          notify: () => undefined,
          navigate: () => undefined,
          confirm: async () => true,
          locale: 'zh-CN',
          loadPage: async () => ({ type: 'page', body: [] }) as never,
          loadDict: async () => ({ name: 'status', options: [] }) as never,
        }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(
      () => {
        expect(screen.getByText('FullEnvUser')).toBeTruthy();
      },
      { timeout: 3000 },
    );
  });

  it('renders rows even when operation column has buttons with AMIS visibleOn (regression)', async () => {
    cleanup();
    const fetcher = vi.fn(async () => ({
      ok: true,
      status: 0,
      data: {
        items: [
          { id: '1', name: 'VisOnUser', status: 1 },
          { id: '2', name: 'VisOffUser', status: 0 },
        ],
        total: 2,
      },
    })) as never;

    const SchemaRenderer = createDataSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-loadaction-visibleon"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'crud-grid',
              loadAction: { action: 'ajax', args: { url: '/r/Test__findPage' } },
              columns: [
                { name: 'name', label: 'Name', type: 'text' },
                {
                  type: 'column',
                  label: '操作',
                  buttons: [
                    { type: 'button', id: 'edit', label: '编辑', onClick: { action: 'noop' } },
                    {
                      type: 'button',
                      id: 'disable',
                      label: '禁用',
                      onClick: { action: 'noop' },
                      // AMIS 残留：flux 应使用 visible，但 NormalizeAction 未转换
                      visibleOn: '${status == 1}',
                    },
                  ],
                },
              ],
            },
          ],
        }}
        env={{ notify: () => undefined, fetcher }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(
      () => {
        expect(screen.getByText('VisOnUser')).toBeTruthy();
        expect(screen.getByText('VisOffUser')).toBeTruthy();
      },
      { timeout: 3000 },
    );
  });
});
