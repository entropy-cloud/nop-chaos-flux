import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockChart = {
  setOption: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
};
const mockInit = vi.fn((..._args: unknown[]) => mockChart);

vi.mock('../echarts-setup.js', () => ({
  getECharts: () => ({ init: mockInit, dispose: vi.fn() }),
}));

import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

function renderEcharts(schema: Record<string, unknown>, data?: Record<string, unknown>) {
  const SchemaRenderer = createDataSchemaRenderer();
  const { container } = render(
    <SchemaRenderer
      schemaUrl="test://echarts/advanced"
      schema={schema as never}
      data={data as never}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
  return container;
}

function lastOption(): Record<string, unknown> {
  const calls = mockChart.setOption.mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  return calls[calls.length - 1][0] as Record<string, unknown>;
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

describe('echarts advanced chart types (real compile chain)', () => {
  it('renders a sankey series with nodes and links passed through', async () => {
    renderEcharts({
      type: 'page',
      body: [
        {
          type: 'echarts',
          height: 360,
          option: {
            series: [
              {
                type: 'sankey',
                data: [
                  { name: 'Source' },
                  { name: 'Middle' },
                  { name: 'Target' },
                ],
                links: [
                  { source: 'Source', target: 'Middle', value: 10 },
                  { source: 'Middle', target: 'Target', value: 6 },
                ],
              },
            ],
          },
        },
      ],
    });
    await waitFor(() => expect(mockChart.setOption).toHaveBeenCalled());
    const series = (lastOption().series as Array<Record<string, unknown>>)[0];
    expect(series.type).toBe('sankey');
    expect(series.links).toHaveLength(2);
  });

  it('renders a treemap series with hierarchical data', async () => {
    renderEcharts({
      type: 'page',
      body: [
        {
          type: 'echarts',
          height: 360,
          option: {
            series: [
              {
                type: 'treemap',
                data: [
                  {
                    name: 'groupA',
                    value: 20,
                    children: [{ name: 'a1', value: 12 }],
                  },
                  { name: 'leaf', value: 8 },
                ],
              },
            ],
          },
        },
      ],
    });
    await waitFor(() => expect(mockChart.setOption).toHaveBeenCalled());
    const series = (lastOption().series as Array<Record<string, unknown>>)[0];
    expect(series.type).toBe('treemap');
    expect((series.data as Array<Record<string, unknown>>)[0].children).toBeTruthy();
  });

  it('renders a tree series with children hierarchy', async () => {
    renderEcharts({
      type: 'page',
      body: [
        {
          type: 'echarts',
          height: 360,
          option: {
            series: [
              {
                type: 'tree',
                data: [
                  {
                    name: 'root',
                    children: [{ name: 'left' }, { name: 'right' }],
                  },
                ],
              },
            ],
          },
        },
      ],
    });
    await waitFor(() => expect(mockChart.setOption).toHaveBeenCalled());
    const series = (lastOption().series as Array<Record<string, unknown>>)[0];
    expect(series.type).toBe('tree');
    expect((series.data as Array<Record<string, unknown>>)[0].children).toHaveLength(2);
  });

  it('binds a boxplot series to a 2D dataset of precomputed five-number summaries', async () => {
    renderEcharts(
      {
        type: 'page',
        body: [
          {
            type: 'echarts',
            height: 360,
            dataset: {
              source: '${boxStats}',
              dimensions: ['min', 'q1', 'median', 'q3', 'max'],
            },
            option: {
              xAxis: { type: 'category' },
              yAxis: { type: 'value' },
              series: [{ type: 'boxplot' }],
            },
          },
        ],
      },
      {
        boxStats: [
          [620, 680, 694, 712, 760],
          [650, 700, 718, 736, 790],
        ],
      },
    );
    await waitFor(() => expect(mockChart.setOption).toHaveBeenCalled());
    const option = lastOption();
    const series = (option.series as Array<Record<string, unknown>>)[0];
    expect(series.type).toBe('boxplot');
    expect(option.dataset).toEqual({
      source: [
        [620, 680, 694, 712, 760],
        [650, 700, 718, 736, 790],
      ],
      dimensions: ['min', 'q1', 'median', 'q3', 'max'],
    });
  });

  it('renders a gauge series with a scalar value', async () => {
    renderEcharts({
      type: 'page',
      body: [
        {
          type: 'echarts',
          height: 320,
          option: {
            series: [
              {
                type: 'gauge',
                data: [{ value: 68, name: 'cpu' }],
              },
            ],
          },
        },
      ],
    });
    await waitFor(() => expect(mockChart.setOption).toHaveBeenCalled());
    const series = (lastOption().series as Array<Record<string, unknown>>)[0];
    expect(series.type).toBe('gauge');
    expect(series.data).toEqual([{ value: 68, name: 'cpu' }]);
  });

  it('renders a funnel series with labeled values', async () => {
    renderEcharts({
      type: 'page',
      body: [
        {
          type: 'echarts',
          height: 320,
          option: {
            series: [
              {
                type: 'funnel',
                data: [
                  { name: 'visit', value: 100 },
                  { name: 'signup', value: 60 },
                  { name: 'paid', value: 25 },
                ],
              },
            ],
          },
        },
      ],
    });
    await waitFor(() => expect(mockChart.setOption).toHaveBeenCalled());
    const series = (lastOption().series as Array<Record<string, unknown>>)[0];
    expect(series.type).toBe('funnel');
    expect(series.data).toHaveLength(3);
  });

  it('renders a radar series with the option-level radar coordinate and indicators', async () => {
    renderEcharts({
      type: 'page',
      body: [
        {
          type: 'echarts',
          height: 360,
          option: {
            radar: {
              indicator: [
                { name: 'sales', max: 100 },
                { name: 'cost', max: 100 },
                { name: 'quality', max: 100 },
              ],
            },
            series: [
              {
                type: 'radar',
                data: [{ value: [85, 40, 90], name: 'product A' }],
              },
            ],
          },
        },
      ],
    });
    await waitFor(() => expect(mockChart.setOption).toHaveBeenCalled());
    const option = lastOption();
    const radar = option.radar as Record<string, unknown>;
    expect((radar.indicator as Array<Record<string, unknown>>)).toHaveLength(3);
    const series = (option.series as Array<Record<string, unknown>>)[0];
    expect(series.type).toBe('radar');
  });
});
