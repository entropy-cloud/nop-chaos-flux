import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createDataSchemaRenderer, formulaCompiler } from '../test-support.js';

/**
 * C4.2 crud audit — dimension 7 (事件与 action 契约) + CONTEXT.md includeScope 契约复验。
 *
 * CONTEXT.md: includeScope 声明需要自动包含的 CRUD scope 变量；
 *   `includeScope: "*"` 包含所有 CRUD scope 变量（pagination/query/sort/filters/selection），
 *   取值 string[] 时精确指定要包含的路径；范围仅限 CRUD scope，不包含父 render scope。
 *
 * 本文件先写失败断言（test-first），验证 loadAction 的 args.includeScope 注入语义。
 */
type Fetcher = (api: {
  url?: string;
  data?: Record<string, unknown>;
  params?: Record<string, unknown>;
}) => Promise<{ ok: boolean; status: number; data: unknown }>;

describe('CRUD loadAction includeScope contract', () => {
  function renderCrudWithIncludeScope(includeScope: unknown, fetcher: ReturnType<typeof vi.fn<Fetcher>>) {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-loadaction-includescope"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'include-crud',
              loadAction: {
                action: 'ajax',
                args: { url: '/r/Test__findPage', includeScope } as never,
              },
              columns: [{ name: 'name', label: 'Name' }],
              rowKey: 'id',
            },
          ],
        }}
        env={{ notify: () => undefined, fetcher } as never}
        formulaCompiler={formulaCompiler}
      />,
    );
  }

  it('extracts CRUD scope variables when includeScope is "*"', async () => {
    const fetcher = vi.fn<Fetcher>(async () => ({
      ok: true,
      status: 0,
      data: { items: [{ id: '1', name: 'WildcardItem' }], total: 1 },
    }));

    renderCrudWithIncludeScope('*', fetcher);

    await waitFor(() => {
      expect(screen.getByText('WildcardItem')).toBeTruthy();
    });

    const request = fetcher.mock.calls[0]?.[0];
    expect(request).toBeTruthy();
    // CONTEXT.md: "*" 包含所有 CRUD scope 变量（扁平暴露，无 $_crud 包装，无内部实现细节）
    expect(request?.data).toMatchObject({
      pagination: { currentPage: 1, pageSize: 10 },
      query: {},
      sort: {},
      filters: {},
      selection: [],
    });
    // 内部实现细节（load revision 计数器）不得泄漏进请求 payload
    expect(JSON.stringify(request?.data)).not.toContain('__crudLoadRevision');
  });

  it('extracts only the declared CRUD scope paths when includeScope is string[]', async () => {
    const fetcher = vi.fn<Fetcher>(async () => ({
      ok: true,
      status: 0,
      data: { items: [{ id: '1', name: 'ScopedItem' }], total: 1 },
    }));

    renderCrudWithIncludeScope(['pagination', 'query'], fetcher);

    await waitFor(() => {
      expect(screen.getByText('ScopedItem')).toBeTruthy();
    });

    const request = fetcher.mock.calls[0]?.[0];
    expect(request).toBeTruthy();
    // 精确声明：仅包含 pagination/query，不包含 sort/filters/selection，也无隐式注入
    expect(request?.data).toEqual({
      pagination: { currentPage: 1, pageSize: 10 },
      query: {},
    });
  });
});
