import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockChart = {
  setOption: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
};
const mockInit = vi.fn((..._args: unknown[]) => mockChart);

// 跨包相对路径 mock：命中 flux-renderers-data 内部渲染器动态 import 的同一模块 id
vi.mock('../../flux-renderers-data/src/echarts-setup.js', () => ({
  getECharts: () => ({ init: mockInit, dispose: vi.fn(), registerMap: vi.fn() }),
}));

import { echartsRendererDefinition } from '@nop-chaos/flux-renderers-data';
import { createDashboardSchemaRenderer, env, formulaCompiler } from './test-support.js';

function renderDashboard(panels: Array<Record<string, unknown>>, data?: Record<string, unknown>) {
  const SchemaRenderer = createDashboardSchemaRenderer([echartsRendererDefinition]);
  return render(
    <SchemaRenderer
      schemaUrl="test://dashboard/echarts-panel"
      schema={
        {
          type: 'page',
          body: [{ type: 'dashboard', testid: 'echarts-dashboard', panels }],
        } as never
      }
      data={data as never}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

beforeEach(() => {
  mockInit.mockClear();
  mockChart.setOption.mockClear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('dashboard panel with type echarts (nop-datav integration mechanism)', () => {
  it('renders an echarts panel through the registry fragment path and reaches setOption', async () => {
    const option = {
      xAxis: { type: 'category', data: ['Jan', 'Feb'] },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: [1, 2] }],
    };
    renderDashboard([
      { id: 'chart-panel', type: 'echarts', x: 0, y: 0, w: 6, h: 4, props: { option, height: 200 } },
    ]);

    await vi.waitFor(() => {
      const calls = mockChart.setOption.mock.calls;
      if (calls.length === 0) {
        throw new Error('setOption not called yet');
      }
      expect(calls[calls.length - 1][0]).toEqual(option);
    });
    expect(document.querySelector('.nop-echarts')).toBeTruthy();
  });

  it('documents the panel.source boundary: panel.source data never reaches the echarts option', async () => {
    // panel.source 向 fragment 顶层注入的 data/source 键不是 echarts 定义字段
    // （closed prop model → unknown-property 诊断 + 键被跳过），因此 source 数据
    // 永远不会注入 echarts 的 option/dataset——不论编译期拒绝（零 init）还是
    // 跳过未知键（init 但 option 原样）。authoring 指引：echarts 面板经
    // props.option/dataset 表达式传数，不使用 panel.source。
    renderDashboard(
      [
        {
          id: 'source-bound-panel',
          type: 'echarts',
          x: 0,
          y: 0,
          w: 6,
          h: 4,
          props: { option: { series: [{ type: 'bar', data: [1] }] } },
          source: '${panelRows}',
        },
      ],
      { panelRows: [{ month: 'Jan', revenue: 1 }] },
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    for (const [opt] of mockChart.setOption.mock.calls) {
      expect(opt).toEqual({ series: [{ type: 'bar', data: [1] }] });
    }
  });

  it('evaluates panel props expressions before they reach the echarts renderer', async () => {
    const largeOption = { series: [{ type: 'gauge', data: [{ value: 90 }] }] };
    renderDashboard(
      [
        {
          id: 'gauge-panel',
          type: 'echarts',
          x: 0,
          y: 0,
          w: 6,
          h: 4,
          props: { option: '${panelOption}', height: 180 },
        },
      ],
      { panelOption: largeOption },
    );

    await vi.waitFor(() => {
      const calls = mockChart.setOption.mock.calls;
      if (calls.length === 0) {
        throw new Error('setOption not called yet');
      }
      expect(calls[calls.length - 1][0]).toEqual(largeOption);
    });
  });
});
