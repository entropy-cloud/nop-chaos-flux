import React from 'react';
import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChartRenderer } from '../chart-renderer.js';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';

const mockState: {
  currentRegistry: { register: ReturnType<typeof vi.fn> } | undefined;
} = {
  currentRegistry: undefined,
};

function simplifyValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (
    value == null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (typeof value === 'function') {
    return '[function]';
  }

  if (Array.isArray(value)) {
    return value.map((item) => simplifyValue(item, seen));
  }

  if (typeof value === 'object') {
    if (seen.has(value)) {
      return '[circular]';
    }
    seen.add(value);

    if ('$$typeof' in (value as Record<string, unknown>)) {
      return '[react-element]';
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return '[object]';
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => key !== 'children')
        .map(([key, entry]) => [key, simplifyValue(entry, seen)]),
    );
  }

  return String(value);
}

function simplifyProps(props: Record<string, unknown>) {
  return simplifyValue(props) as Record<string, unknown>;
}

function createMockComponent(name: string) {
  return function MockComponent(props: Record<string, unknown>) {
    return React.createElement(
      'div',
      {
        'data-testid': name,
        'data-props': JSON.stringify(simplifyProps(props)),
      },
      props.children as ReactNode,
    );
  };
}

vi.mock('@nop-chaos/flux-react', () => ({
  useCurrentComponentRegistry: () => mockState.currentRegistry,
  hasRendererSlotContent: (content: unknown) => content !== null && content !== undefined && content !== false,
  resolveRendererSlotContent: (props: any, key: string, options: { fallback: string }) =>
    props.regions?.[key]?.render?.() ?? props.props[key] ?? options?.fallback,
}));

vi.mock('@nop-chaos/ui', () => ({
  cn: (...values: Array<string | undefined>) => values.filter(Boolean).join(' '),
  Spinner: (props: Record<string, unknown>) =>
    React.createElement('span', { 'data-testid': 'spinner', ...props }),
}));

vi.mock('@nop-chaos/ui/chart', () => ({
  ChartContainer: createMockComponent('ChartContainer'),
  ChartTooltip: createMockComponent('ChartTooltip'),
  ChartTooltipContent: createMockComponent('ChartTooltipContent'),
  ChartLegend: createMockComponent('ChartLegend'),
  ChartLegendContent: createMockComponent('ChartLegendContent'),
}));

vi.mock('recharts', () => ({
  AreaChart: createMockComponent('AreaChart'),
  Area: createMockComponent('Area'),
  BarChart: createMockComponent('BarChart'),
  Bar: createMockComponent('Bar'),
  LineChart: createMockComponent('LineChart'),
  Line: createMockComponent('Line'),
  PieChart: createMockComponent('PieChart'),
  Pie: createMockComponent('Pie'),
  Cell: createMockComponent('Cell'),
  ScatterChart: createMockComponent('ScatterChart'),
  Scatter: createMockComponent('Scatter'),
  XAxis: createMockComponent('XAxis'),
  YAxis: createMockComponent('YAxis'),
  CartesianGrid: createMockComponent('CartesianGrid'),
}));

function makeProps(overrides: Record<string, unknown> = {}) {
  return {
    id: 'chart-node',
    props: {},
    meta: { cid: 7, className: 'custom-chart', testid: 'chart-root' },
    events: { onClick: vi.fn(), onHover: vi.fn() },
    helpers: {},
    regions: {},
    node: {},
    ...overrides,
  } as any;
}

describe('ChartRenderer visual configuration (area/legend/stacked/grid/colors)', () => {
  beforeEach(() => {
    mockState.currentRegistry = undefined;
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  });

  afterEach(() => {
    mockState.currentRegistry = undefined;
    cleanup();
  });

  it('renders an area chart when chartType is "area"', () => {
    render(
      <ChartRenderer
        {...makeProps({
          props: {
            chartType: 'area',
            xAxis: { dataKey: 'month', label: 'Month' },
            source: [
              { month: 'Jan', revenue: 12 },
              { month: 'Feb', revenue: 15 },
            ],
            series: [{ name: 'Revenue', dataRegionKey: 'revenue' }],
          },
        })}
      />,
    );

    expect(screen.getByTestId('AreaChart')).toBeTruthy();
    const area = screen.getByTestId('Area');
    expect(area.getAttribute('data-props')).toContain('revenue');
    expect(area.getAttribute('data-props')).toContain('monotone');
  });

  it('hides the legend when legend:false even with multiple series', () => {
    render(
      <ChartRenderer
        {...makeProps({
          props: {
            chartType: 'bar',
            xAxis: { dataKey: 'month' },
            source: [
              { month: 'Jan', revenue: 12, expenses: 8 },
              { month: 'Feb', revenue: 15, expenses: 9 },
            ],
            series: [
              { name: 'Revenue', dataRegionKey: 'revenue' },
              { name: 'Expenses', dataRegionKey: 'expenses' },
            ],
            legend: false,
          },
        })}
      />,
    );

    expect(screen.getByTestId('BarChart')).toBeTruthy();
    expect(screen.queryByTestId('ChartLegend')).toBeNull();
  });

  it('shows the legend when legend:true even with a single series', () => {
    render(
      <ChartRenderer
        {...makeProps({
          props: {
            chartType: 'bar',
            source: [{ month: 'Jan', value: 12 }],
            series: [{ name: 'Revenue', dataRegionKey: 'value' }],
            legend: true,
          },
        })}
      />,
    );

    expect(screen.getByTestId('ChartLegend')).toBeTruthy();
  });

  it('adds stackId to bar series when stacked:true', () => {
    render(
      <ChartRenderer
        {...makeProps({
          props: {
            chartType: 'bar',
            xAxis: { dataKey: 'month' },
            source: [
              { month: 'Jan', revenue: 12, expenses: 8 },
              { month: 'Feb', revenue: 15, expenses: 9 },
            ],
            series: [
              { name: 'Revenue', dataRegionKey: 'revenue' },
              { name: 'Expenses', dataRegionKey: 'expenses' },
            ],
            stacked: true,
          },
        })}
      />,
    );

    const bars = screen.getAllByTestId('Bar');
    expect(bars).toHaveLength(2);
    expect(bars[0].getAttribute('data-props')).toContain('"stackId":"a"');
    expect(bars[1].getAttribute('data-props')).toContain('"stackId":"a"');
  });

  it('adds stackId to area series when stacked:true', () => {
    render(
      <ChartRenderer
        {...makeProps({
          props: {
            chartType: 'area',
            xAxis: { dataKey: 'month' },
            source: [
              { month: 'Jan', revenue: 12, expenses: 8 },
              { month: 'Feb', revenue: 15, expenses: 9 },
            ],
            series: [
              { name: 'Revenue', dataRegionKey: 'revenue' },
              { name: 'Expenses', dataRegionKey: 'expenses' },
            ],
            stacked: true,
          },
        })}
      />,
    );

    const areas = screen.getAllByTestId('Area');
    expect(areas).toHaveLength(2);
    expect(areas[0].getAttribute('data-props')).toContain('"stackId":"a"');
    expect(areas[1].getAttribute('data-props')).toContain('"stackId":"a"');
  });

  it('ignores stacked on pie (no stackId semantics)', () => {
    render(
      <ChartRenderer
        {...makeProps({
          props: {
            chartType: 'pie',
            xAxis: { dataKey: 'label' },
            source: [
              { label: 'Jan', value: 12 },
              { label: 'Feb', value: 8 },
            ],
            series: [{ name: 'Revenue', dataRegionKey: 'value' }],
            stacked: true,
          },
        })}
      />,
    );

    expect(screen.getByTestId('PieChart')).toBeTruthy();
    expect(screen.getByTestId('Pie').getAttribute('data-props')).not.toContain('stackId');
  });

  it('omits CartesianGrid when grid:false', () => {
    render(
      <ChartRenderer
        {...makeProps({
          props: {
            chartType: 'bar',
            source: [{ month: 'Jan', value: 12 }],
            series: [{ name: 'Revenue', dataRegionKey: 'value' }],
            grid: false,
          },
        })}
      />,
    );

    expect(screen.getByTestId('BarChart')).toBeTruthy();
    expect(screen.queryByTestId('CartesianGrid')).toBeNull();
  });

  it('renders CartesianGrid by default (grid not set)', () => {
    render(
      <ChartRenderer
        {...makeProps({
          props: {
            chartType: 'bar',
            source: [{ month: 'Jan', value: 12 }],
            series: [{ name: 'Revenue', dataRegionKey: 'value' }],
          },
        })}
      />,
    );

    expect(screen.getByTestId('CartesianGrid')).toBeTruthy();
  });

  it('uses custom colors palette when colors is a non-empty array', () => {
    render(
      <ChartRenderer
        {...makeProps({
          props: {
            chartType: 'bar',
            xAxis: { dataKey: 'month' },
            source: [
              { month: 'Jan', revenue: 12, expenses: 8 },
              { month: 'Feb', revenue: 15, expenses: 9 },
            ],
            series: [
              { name: 'Revenue', dataRegionKey: 'revenue' },
              { name: 'Expenses', dataRegionKey: 'expenses' },
            ],
            colors: ['#f00', '#0f0'],
          },
        })}
      />,
    );

    const bars = screen.getAllByTestId('Bar');
    expect(bars).toHaveLength(2);
    expect(bars[0].getAttribute('data-props')).toContain('#f00');
    expect(bars[1].getAttribute('data-props')).toContain('#0f0');
    expect(screen.getByTestId('ChartContainer').getAttribute('data-props')).not.toContain(
      'hsl(var(--chart-',
    );
  });

  it('falls back to default COLORS when colors is an empty array', () => {
    render(
      <ChartRenderer
        {...makeProps({
          props: {
            chartType: 'bar',
            source: [{ month: 'Jan', value: 12 }],
            series: [{ name: 'Revenue', dataRegionKey: 'value' }],
            colors: [],
          },
        })}
      />,
    );

    expect(screen.getByTestId('Bar').getAttribute('data-props')).toContain('hsl(var(--chart-1))');
  });
});

// G8: pie/scatter build their data points by hand (unlike the cartesian
// charts which hand a dotted dataKey to recharts). Those hand-built lookups
// must resolve dotted paths through the nested record — same getIn contract
// as the table cell chrome (M-04). Previously they used raw record[key], so a
// dataRegionKey like "metrics.revenue" read undefined and the point vanished.
describe('dotted dataRegionKey / dataKey resolution for pie and scatter (G8)', () => {
  beforeEach(() => {
    mockState.currentRegistry = undefined;
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  });

  afterEach(() => {
    mockState.currentRegistry = undefined;
    cleanup();
  });

  it('resolves a dotted dataRegionKey for pie source data', () => {
    render(
      <ChartRenderer
        {...makeProps({
          props: {
            chartType: 'pie',
            xAxis: { dataKey: 'label' },
            source: [{ label: 'A', metrics: { revenue: 10 } }],
            series: [{ name: 'Revenue', dataRegionKey: 'metrics.revenue' }],
          },
        })}
      />,
    );

    expect(screen.getByTestId('PieChart')).toBeTruthy();
    const pieProps = screen.getByTestId('Pie').getAttribute('data-props') ?? '';
    expect(pieProps).toContain('"value":10');
    expect(pieProps).not.toContain('"value":0');
  });

  it('resolves dotted xAxis dataKey and dataRegionKey for scatter source data', () => {
    render(
      <ChartRenderer
        {...makeProps({
          props: {
            chartType: 'scatter',
            xAxis: { dataKey: 'pos.x' },
            source: [{ label: 'A', pos: { x: 1 }, metrics: { revenue: 5 } }],
            series: [{ name: 'Revenue', dataRegionKey: 'metrics.revenue' }],
          },
        })}
      />,
    );

    const scatterProps = screen.getAllByTestId('Scatter').map((node) =>
      node.getAttribute('data-props'),
    );
    const dataSeriesProps = scatterProps.find((props) => props?.includes('"x":1'));
    expect(dataSeriesProps).toBeTruthy();
    expect(dataSeriesProps).toContain('"y":5');
  });

  it('exposes dotted-path values in the textual data equivalent (sr-only summary)', () => {
    render(
      <ChartRenderer
        {...makeProps({
          props: {
            title: 'Revenue chart',
            xAxis: { dataKey: 'label' },
            source: [{ label: 'A', metrics: { revenue: 7 } }],
            series: [{ name: 'Revenue', dataRegionKey: 'metrics.revenue' }],
          },
        })}
      />,
    );

    const equivalent = document.querySelector('[data-slot="chart-data-equivalent"]');
    expect(equivalent?.textContent).toContain('Revenue: 7');
  });
});
