import { cleanup, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { buttonRenderer, createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

/**
 * dashboard-filter 编排约定走查（plan `2026-08-09-bi-kpi-filter-chart-enhance-plan.md`
 * Phase 3 Proof）。约定文档：`docs/components/dashboard-filter/design.md`。
 *
 * 链路：筛选表单 `valuesPath: 'filter'` → 表单值持续发布进共享 page scope
 * `filter.*` → 消费端 data-source 的 action args 引用 `${filter?.xxx}`（null-safe）
 * → 依赖收集（根级 `filter`）命中 → 自动重载（无需手动 refresh）。
 */
describe('dashboard-filter 编排约定 — scope 联动走查', () => {
  afterEach(() => {
    cleanup();
  });

  it('valuesPath 把筛选表单值发布到共享 filter.* 作用域（初始值即被消费端使用）', async () => {
    const fetcher = vi.fn(async <T,>(_api: { url: string }) => ({ status: 0,
      data: { region: _api.url.includes('region=east') ? 'east' : 'none' } as T,
    }));
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/dashboard-filter"
        schema={{
          type: 'page',
          body: [
            {
              type: 'data-source',
              action: 'ajax',
              args: { url: '/api/sales', params: { region: '${filter?.region}' } },
              name: 'sales',
            },
            {
              type: 'text',
              text: 'Filter: ${filter?.region ?? "unset"} / Region: ${sales?.region ?? "none"}',
            },
            {
              type: 'form',
              id: 'filter-form',
              valuesPath: 'filter',
              data: { region: 'east', period: '2026-01-01,2026-03-31' },
              body: [],
            },
          ],
        }}
        env={{ ...env, fetcher: fetcher as unknown as RendererEnv['fetcher'] }}
        formulaCompiler={formulaCompiler}
      />,
    );

    // valuesPath 发布：兄弟节点直接读到 filter.region。
    await waitFor(() => expect(screen.getByText(/Filter: east/)).toBeTruthy());
    // 初始请求已携带初始筛选值（发布先于/并行于 data-source 注册；请求构造器把
    // 非空 params 内联进 query string）。
    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(String(fetcher.mock.calls[0][0].url)).toContain('region=east');
    await waitFor(() => expect(screen.getByText(/Region: east/)).toBeTruthy());
  });

  it('共享 scope 写入 → data-source 自动重载（不依赖手动 refresh）', async () => {
    const fetcher = vi.fn(async <T,>(_api: { url: string }) => ({ status: 0,
      data: {} as T,
    }));
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/dashboard-filter"
        schema={{
          type: 'page',
          body: [
            {
              type: 'data-source',
              action: 'ajax',
              args: { url: '/api/sales', params: { region: '${filter?.region}' } },
              name: 'sales',
            },
            {
              type: 'button',
              label: '切换华东',
              onClick: {
                action: 'setValues',
                args: { path: 'filter', values: { region: 'east' } },
              },
            },
          ],
        }}
        env={{ ...env, fetcher: fetcher as unknown as RendererEnv['fetcher'] }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    expect(fetcher.mock.calls[0][0].url).not.toContain('region=');

    fetcher.mockClear();
    screen.getByText('切换华东').click();

    // 关键断言：没有任何 refresh 调用，仅凭 scope 写入自动重载。
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1), { timeout: 5000 });
    expect(fetcher.mock.calls[0][0].url).toContain('region=east');
  });

  it('key 失配时发出 dashboard-filter-no-link dev warn（report-once），正常链接不告警', async () => {
    // ── 失配场景：消费端引用 filter.product，表单写入 filter.region。──
    const mismatchFetcher = vi.fn(async <T,>(_api: { url: string }) => ({ status: 0,
      data: {} as T,
    }));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/dashboard-filter-mismatch"
        schema={{
          type: 'page',
          body: [
            {
              type: 'data-source',
              action: 'ajax',
              args: { url: '/api/sales', params: { product: '${filter?.product}' } },
              name: 'sales',
            },
            {
              type: 'button',
              label: '提交筛选',
              onClick: {
                action: 'setValues',
                args: { path: 'filter', values: { region: 'east' } },
              },
            },
            {
              type: 'button',
              label: '提交筛选2',
              onClick: {
                action: 'setValues',
                args: { path: 'filter', values: { region: 'west' } },
              },
            },
          ],
        }}
        env={{ ...env, fetcher: mismatchFetcher as unknown as RendererEnv['fetcher'] }}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => expect(mismatchFetcher).toHaveBeenCalledTimes(1));
    warnSpy.mockClear();
    screen.getByText('提交筛选').click();
    await waitFor(() => expect(mismatchFetcher).toHaveBeenCalledTimes(2), { timeout: 3000 });

    const mismatchWarns = warnSpy.mock.calls.filter((call) =>
      String(call[0]).includes('dashboard-filter-no-link'),
    );
    expect(mismatchWarns).toHaveLength(1);
    expect(String(mismatchWarns[0][0])).toContain('filter.product');

    // 再次写入（不同值）不重复告警（report-once）。
    screen.getByText('提交筛选2').click();
    await waitFor(() => expect(mismatchFetcher).toHaveBeenCalledTimes(3), { timeout: 3000 });
    const afterSecond = warnSpy.mock.calls.filter((call) =>
      String(call[0]).includes('dashboard-filter-no-link'),
    );
    expect(afterSecond).toHaveLength(1);
    warnSpy.mockRestore();
    cleanup();

    // ── 正常链接场景：消费端引用 filter.region，表单写入 filter.region → 零告警。──
    const linkedFetcher = vi.fn(async <T,>(_api: { url: string }) => ({ status: 0,
      data: {} as T,
    }));
    const warnSpy2 = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const SchemaRenderer2 = createDataSchemaRenderer([buttonRenderer]);
    render(
      <SchemaRenderer2
        schemaUrl="test://data/dashboard-filter-linked"
        schema={{
          type: 'page',
          body: [
            {
              type: 'data-source',
              action: 'ajax',
              args: { url: '/api/sales', params: { region: '${filter?.region}' } },
              name: 'sales',
            },
            {
              type: 'button',
              label: '提交筛选',
              onClick: {
                action: 'setValues',
                args: { path: 'filter', values: { region: 'east' } },
              },
            },
          ],
        }}
        env={{ ...env, fetcher: linkedFetcher as unknown as RendererEnv['fetcher'] }}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => expect(linkedFetcher).toHaveBeenCalledTimes(1));
    warnSpy2.mockClear();
    screen.getByText('提交筛选').click();
    await waitFor(() => expect(linkedFetcher).toHaveBeenCalledTimes(2), { timeout: 5000 });
    const linkedWarns = warnSpy2.mock.calls.filter((call) =>
      String(call[0]).includes('dashboard-filter-no-link'),
    );
    expect(linkedWarns).toHaveLength(0);
    warnSpy2.mockRestore();
  });

  it('未发布任何筛选时消费端按空筛选渲染（等价未筛，无告警无报错）', async () => {
    const fetcher = vi.fn(async <T,>(_api: { url: string }) => ({ status: 0,
      data: { region: _api.url.includes('region=') ? 'filtered' : 'all' } as T,
    }));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/dashboard-filter-empty"
        schema={{
          type: 'page',
          body: [
            {
              type: 'data-source',
              action: 'ajax',
              args: { url: '/api/sales', params: { region: '${filter?.region}' } },
              name: 'sales',
            },
            { type: 'text', text: 'Region: ${sales?.region ?? "none"}' },
          ],
        }}
        env={{ ...env, fetcher: fetcher as unknown as RendererEnv['fetcher'] }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Region: all')).toBeTruthy());
    const mismatchWarns = warnSpy.mock.calls.filter((call) =>
      String(call[0]).includes('dashboard-filter-no-link'),
    );
    expect(mismatchWarns).toHaveLength(0);
    warnSpy.mockRestore();
  });
});
