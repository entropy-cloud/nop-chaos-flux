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
      schemaUrl="test://echarts/dataset"
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

const barOption = {
  xAxis: { type: 'category' },
  yAxis: { type: 'value' },
  series: [{ type: 'bar', encode: { x: 'month', y: 'revenue' } }],
};

beforeEach(() => {
  mockInit.mockClear();
  mockChart.setOption.mockClear();
  mockChart.on.mockClear();
  mockChart.off.mockClear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('echarts dataset binding (real compile chain)', () => {
  it('binds an object-array source expression into option.dataset with dimensions', async () => {
    const container = renderEcharts(
      {
        type: 'page',
        body: [
          {
            type: 'echarts',
            dataset: { source: '${rows}', dimensions: ['month', 'revenue'] },
            option: barOption,
          },
        ],
      },
      {
        rows: [
          { month: 'Jan', revenue: 4200 },
          { month: 'Feb', revenue: 5100 },
        ],
      },
    );

    await waitFor(() => expect(mockChart.setOption).toHaveBeenCalled());
    const option = lastOption();
    expect(option.dataset).toEqual({
      source: [
        { month: 'Jan', revenue: 4200 },
        { month: 'Feb', revenue: 5100 },
      ],
      dimensions: ['month', 'revenue'],
    });
    expect(container.querySelector('.nop-echarts')).toBeTruthy();
  });

  it('binds a columnar source object', async () => {
    renderEcharts(
      {
        type: 'page',
        body: [
          {
            type: 'echarts',
            dataset: { source: '${columns}' },
            option: barOption,
          },
        ],
      },
      { columns: { month: ['Jan', 'Feb'], revenue: [4200, 5100] } },
    );
    await waitFor(() => expect(mockChart.setOption).toHaveBeenCalled());
    expect(lastOption().dataset).toEqual({
      source: { month: ['Jan', 'Feb'], revenue: [4200, 5100] },
    });
  });

  it('binds a two-dimensional array source', async () => {
    renderEcharts(
      {
        type: 'page',
        body: [{ type: 'echarts', dataset: { source: '${grid}' }, option: barOption }],
      },
      { grid: [['month', 'revenue'], ['Jan', 4200], ['Feb', 5100]] },
    );
    await waitFor(() => expect(mockChart.setOption).toHaveBeenCalled());
    expect(lastOption().dataset).toEqual({
      source: [['month', 'revenue'], ['Jan', 4200], ['Feb', 5100]],
    });
  });

  it('lets the schema-level dataset override option.dataset', async () => {
    renderEcharts(
      {
        type: 'page',
        body: [
          {
            type: 'echarts',
            dataset: { source: '${rows}' },
            option: { ...barOption, dataset: { source: [['static', 0]] } },
          },
        ],
      },
      { rows: [{ month: 'Jan', revenue: 1 }] },
    );
    await waitFor(() => expect(mockChart.setOption).toHaveBeenCalled());
    expect(lastOption().dataset).toEqual({ source: [{ month: 'Jan', revenue: 1 }] });
  });

  it('renders the explicit empty state when the bound source resolves to an empty array', async () => {
    const container = renderEcharts(
      {
        type: 'page',
        body: [{ type: 'echarts', dataset: { source: '${rows}' }, option: barOption }],
      },
      { rows: [] },
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(container.querySelector('[data-slot="echarts-empty"]')).not.toBeNull();
    expect(mockInit).not.toHaveBeenCalled();
    expect(mockChart.setOption).not.toHaveBeenCalled();
  });

  it('renders the empty slot content when provided', async () => {
    const container = renderEcharts(
      {
        type: 'page',
        body: [
          {
            type: 'echarts',
            dataset: { source: '${rows}' },
            option: barOption,
            empty: 'no rows available',
          },
        ],
      },
      { rows: [] },
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    const emptySlot = container.querySelector('[data-slot="echarts-empty"]');
    expect(emptySlot).not.toBeNull();
    expect(emptySlot!.textContent).toContain('no rows available');
  });

  it('warns and renders without dataset injection when the source resolves to a non-dataset shape', async () => {
    renderEcharts(
      {
        type: 'page',
        body: [{ type: 'echarts', dataset: { source: '${notRows}' }, option: barOption }],
      },
      { notRows: 'a plain string' },
    );
    await waitFor(() => expect(mockChart.setOption).toHaveBeenCalled());
    expect(lastOption().dataset).toBeUndefined();
    expect(console.warn).toHaveBeenCalled();
  });

  it('warns when encode references an undeclared dimension', async () => {
    renderEcharts(
      {
        type: 'page',
        body: [
          {
            type: 'echarts',
            dataset: { source: '${rows}', dimensions: ['month'] },
            option: barOption,
          },
        ],
      },
      { rows: [{ month: 'Jan', revenue: 1 }] },
    );
    await waitFor(() => expect(mockChart.setOption).toHaveBeenCalled());
    expect(lastOption().dataset).toBeTruthy();
    expect(console.warn).toHaveBeenCalled();
  });

  it.each([
    [
      'bar',
      { type: 'bar', encode: { x: 'month', y: 'revenue' } },
    ],
    [
      'line',
      { type: 'line', smooth: true, encode: { x: 'month', y: 'revenue' } },
    ],
    [
      'pie',
      { type: 'pie', encode: { itemName: 'month', value: 'revenue' } },
    ],
    [
      'scatter',
      { type: 'scatter', encode: { x: 'month', y: 'revenue' } },
    ],
  ] as const)('composes a dataset-driven %s series (no inline data, encode only)', async (type, series) => {
    renderEcharts(
      {
        type: 'page',
        body: [
          {
            type: 'echarts',
            dataset: { source: '${rows}', dimensions: ['month', 'revenue'] },
            option: { series: [series] },
          },
        ],
      },
      { rows: [{ month: 'Jan', revenue: 4200 }, { month: 'Feb', revenue: 5100 }] },
    );
    await waitFor(() => expect(mockChart.setOption).toHaveBeenCalled());
    const option = lastOption();
    expect(option.dataset).toEqual({
      source: [{ month: 'Jan', revenue: 4200 }, { month: 'Feb', revenue: 5100 }],
      dimensions: ['month', 'revenue'],
    });
    expect((option.series as Array<Record<string, unknown>>)[0].type).toBe(type);
    expect((option.series as Array<Record<string, unknown>>)[0].data).toBeUndefined();
  });

  it('carries tooltip and legend configuration through to the composed option', async () => {
    renderEcharts(
      {
        type: 'page',
        body: [
          {
            type: 'echarts',
            dataset: { source: '${rows}', dimensions: ['month', 'revenue'] },
            option: {
              tooltip: { trigger: 'axis' },
              legend: { bottom: 0 },
              xAxis: { type: 'category' },
              yAxis: { type: 'value' },
              series: [{ type: 'bar', encode: { x: 'month', y: 'revenue' } }],
            },
          },
        ],
      },
      { rows: [{ month: 'Jan', revenue: 4200 }, { month: 'Feb', revenue: 5100 }] },
    );
    await waitFor(() => expect(mockChart.setOption).toHaveBeenCalled());
    const option = lastOption();
    expect(option.tooltip).toEqual({ trigger: 'axis' });
    expect(option.legend).toEqual({ bottom: 0 });
    expect(option.dataset).toBeTruthy();
  });
});
