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
const mockRegisterMap = vi.fn();

vi.mock('../echarts-setup.js', () => ({
  getECharts: () => ({ init: mockInit, dispose: vi.fn(), registerMap: mockRegisterMap }),
}));

import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

function renderEcharts(schema: Record<string, unknown>, data?: Record<string, unknown>) {
  const SchemaRenderer = createDataSchemaRenderer();
  const { container } = render(
    <SchemaRenderer
      schemaUrl="test://echarts/full-features"
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
  mockRegisterMap.mockClear();
  mockChart.setOption.mockClear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const tinyGeoJson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Alpha' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      },
    },
  ],
};

describe('echarts full features (real compile chain)', () => {
  it('binds GeoJSON via expression, registers the map, and renders a map series', async () => {
    renderEcharts(
      {
        type: 'page',
        body: [
          {
            type: 'echarts',
            height: 360,
            map: { name: 'demo-geo', geoJson: '${worldGeo}' },
            option: {
              series: [{ type: 'map', map: 'demo-geo' }],
            },
          },
        ],
      },
      { worldGeo: tinyGeoJson },
    );
    await waitFor(() => expect(mockRegisterMap).toHaveBeenCalledWith('demo-geo', tinyGeoJson));
    await waitFor(() => expect(mockChart.setOption).toHaveBeenCalled());
    const series = (lastOption().series as Array<Record<string, unknown>>)[0];
    expect(series.type).toBe('map');
    expect(series.map).toBe('demo-geo');
  });

  it('binds OHLC rows through a 2D dataset for a candlestick series', async () => {
    renderEcharts(
      {
        type: 'page',
        body: [
          {
            type: 'echarts',
            height: 360,
            dataset: { source: '${ohlc}' },
            option: {
              xAxis: { type: 'category' },
              yAxis: { type: 'value' },
              series: [{ type: 'candlestick' }],
            },
          },
        ],
      },
      {
        ohlc: [
          ['2026-01-02', 20, 34, 10, 38],
          ['2026-01-03', 40, 15, 5, 42],
        ],
      },
    );
    await waitFor(() => expect(mockChart.setOption).toHaveBeenCalled());
    const option = lastOption();
    expect((option.series as Array<Record<string, unknown>>)[0].type).toBe('candlestick');
    expect(option.dataset).toEqual({
      source: [
        ['2026-01-02', 20, 34, 10, 38],
        ['2026-01-03', 40, 15, 5, 42],
      ],
    });
  });

  it('renders a graph series with nodes, links, and categories', async () => {
    renderEcharts({
      type: 'page',
      body: [
        {
          type: 'echarts',
          height: 360,
          option: {
            series: [
              {
                type: 'graph',
                layout: 'force',
                categories: [{ name: 'core' }, { name: 'edge' }],
                data: [
                  { name: 'a', category: 0 },
                  { name: 'b', category: 1 },
                ],
                links: [{ source: 'a', target: 'b' }],
              },
            ],
          },
        },
      ],
    });
    await waitFor(() => expect(mockChart.setOption).toHaveBeenCalled());
    const series = (lastOption().series as Array<Record<string, unknown>>)[0];
    expect(series.type).toBe('graph');
    expect(series.links).toHaveLength(1);
    expect(series.categories).toHaveLength(2);
  });

  it('renders a sunburst series with hierarchical data', async () => {
    renderEcharts({
      type: 'page',
      body: [
        {
          type: 'echarts',
          height: 360,
          option: {
            series: [
              {
                type: 'sunburst',
                data: [
                  {
                    name: 'root',
                    children: [{ name: 'child', value: 5 }],
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
    expect(series.type).toBe('sunburst');
    expect((series.data as Array<Record<string, unknown>>)[0].children).toBeTruthy();
  });

  it('renders a themeRiver series with a singleAxis coordinate', async () => {
    renderEcharts({
      type: 'page',
      body: [
        {
          type: 'echarts',
          height: 360,
          option: {
            singleAxis: {
              type: 'time',
            },
            series: [
              {
                type: 'themeRiver',
                data: [
                  ['2026-01-01', 10, 'alpha'],
                  ['2026-01-02', 20, 'alpha'],
                  ['2026-01-01', 5, 'beta'],
                ],
              },
            ],
          },
        },
      ],
    });
    await waitFor(() => expect(mockChart.setOption).toHaveBeenCalled());
    const option = lastOption();
    expect(option.singleAxis).toEqual({ type: 'time' });
    const series = (option.series as Array<Record<string, unknown>>)[0];
    expect(series.type).toBe('themeRiver');
    expect(series.data).toHaveLength(3);
  });

  it('binds a host-provided option object (with renderItem function) via expression for custom series', async () => {
    const renderItem = (params: unknown, api: unknown) => api;
    renderEcharts(
      {
        type: 'page',
        body: [
          {
            type: 'echarts',
            height: 360,
            option: '${customOption}',
          },
        ],
      },
      {
        customOption: {
          xAxis: { type: 'category', data: ['a', 'b'] },
          yAxis: {},
          series: [
            {
              type: 'custom',
              renderItem,
              data: [1, 2],
            },
          ],
        },
      },
    );
    await waitFor(() => expect(mockChart.setOption).toHaveBeenCalled());
    const option = lastOption();
    const series = (option.series as Array<Record<string, unknown>>)[0];
    expect(series.type).toBe('custom');
    expect(typeof series.renderItem).toBe('function');
  });
});
