import { cleanup, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import { buttonRenderer, createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

// 最小 card 定义（避免测试引入跨包依赖；与 flux-renderers-content card 的
// title/header/body regions 契约一致）。
const cardDefinition: RendererDefinition = {
  type: 'card',
  component: (props) => {
    const titleNode = props.regions.title?.render() as React.ReactNode | undefined;
    const headerNode = props.regions.header?.render() as React.ReactNode | undefined;
    const bodyNode = props.regions.body?.render() as React.ReactNode | undefined;
    return (
      <div className="nop-card">
        {titleNode !== undefined ? titleNode : String(props.props.title ?? '')}
        {headerNode}
        {bodyNode}
      </div>
    );
  },
  fields: [
    { key: 'title', kind: 'value-or-region', regionKey: 'title' },
    { key: 'header', kind: 'region', regionKey: 'header' },
    { key: 'body', kind: 'region', regionKey: 'body' },
  ],
};

const EXTRA = [buttonRenderer, cardDefinition];

/**
 * 图表面板刷新约定走查（plan `2026-08-09-bi-kpi-filter-chart-enhance-plan.md`
 * Phase 4 Proof）。裁定：**纯组合，不新增 card 字段**——header region 放 Button +
 * `refreshSource` action（按 data-source name 寻址），复用既有 action 机制。
 */
describe('card 刷新约定（panel-chrome 组合支撑）— refreshSource 组合走查', () => {
  afterEach(() => {
    cleanup();
  });

  it('card header 内刷新按钮经 refreshSource 触发 data-source 重载', async () => {
    let callCount = 0;
    const fetcher = vi.fn(async <T,>(_api: { url: string }): Promise<{ status: number; data: T | null }> => {
      callCount += 1;
      return { status: 0, data: { fetched: String(callCount) } as T };
    });
    const SchemaRenderer = createDataSchemaRenderer(EXTRA);
    render(
      <SchemaRenderer
        schemaUrl="test://data/card-refresh"
        schema={{
          type: 'page',
          body: [
            {
              type: 'data-source',
              action: 'ajax',
              args: { url: '/api/sales' },
              name: 'sales',
              initialData: [],
            },
            {
              type: 'card',
              title: '营收走势',
              header: [
                {
                  type: 'button',
                  label: '刷新',
                  onClick: { action: 'refreshSource', targetId: 'sales' },
                },
              ],
              body: [
                { type: 'chart', chartType: 'bar', source: '${sales}', height: 200 },
              ],
            },
          ],
        }}
        env={{ ...env, fetcher: fetcher as unknown as RendererEnv['fetcher'] }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    expect(screen.getByText('营收走势')).toBeTruthy();

    screen.getByText('刷新').click();

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2), { timeout: 5000 });
  });

  it('刷新按钮与 dashboard-filter 联动示例可运行（筛选 → 卡片刷新 → 数据带筛选参数）', async () => {
    const fetcher = vi.fn(async <T,>(_api: { url: string }) => ({ status: 0,
      data: {} as T,
    }));
    const SchemaRenderer = createDataSchemaRenderer(EXTRA);
    render(
      <SchemaRenderer
        schemaUrl="test://data/card-refresh-filter"
        schema={{
          type: 'page',
          body: [
            {
              type: 'form',
              id: 'filter-form',
              valuesPath: 'filter',
              data: { region: 'east' },
              body: [],
            },
            {
              type: 'data-source',
              action: 'ajax',
              args: { url: '/api/sales', params: { region: '${filter?.region}' } },
              name: 'sales',
              initialData: [],
            },
            {
              type: 'card',
              title: '营收走势',
              header: [
                {
                  type: 'button',
                  label: '刷新',
                  onClick: { action: 'refreshSource', targetId: 'sales' },
                },
              ],
              body: [{ type: 'chart', chartType: 'bar', source: '${sales}', height: 200 }],
            },
          ],
        }}
        env={{ ...env, fetcher: fetcher as unknown as RendererEnv['fetcher'] }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    fetcher.mockClear();

    screen.getByText('刷新').click();

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1), { timeout: 5000 });
    expect(String(fetcher.mock.calls[0][0].url)).toContain('region=east');
  });
});
