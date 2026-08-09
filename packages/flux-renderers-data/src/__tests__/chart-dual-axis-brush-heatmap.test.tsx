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
  ReferenceLine: createMockComponent('ReferenceLine'),
  ReferenceArea: createMockComponent('ReferenceArea'),
  Brush: createMockComponent('Brush'),
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

describe('ChartRenderer dual axis (yAxis array + series.yAxisId)', () => {
  beforeEach(() => {
    mockState.currentRegistry = undefined;
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  });

  afterEach(() => {
    mockState.currentRegistry = undefined;
    cleanup();
  });

  it('renders one YAxis per array entry with yAxisId + orientation and maps series by yAxisId', () => {
    render(
      <ChartRenderer
        {...makeProps({
          props: {
            chartType: 'bar',
            xAxis: { dataKey: 'month' },
            yAxis: [
              { label: 'Revenue', position: 'left' },
              { label: 'Orders', position: 'right' },
            ],
            source: [
              { month: 'Jan', revenue: 12, orders: 8 },
              { month: 'Feb', revenue: 15, orders: 9 },
            ],
            series: [
              { name: 'Revenue', dataRegionKey: 'revenue', yAxisId: 0 },
              { name: 'Orders', dataRegionKey: 'orders', yAxisId: 1 },
            ],
          },
        })}
      />,
    );

    const axes = screen.getAllByTestId('YAxis');
    expect(axes).toHaveLength(2);
    expect(axes[0].getAttribute('data-props')).toContain('"yAxisId":0');
    expect(axes[0].getAttribute('data-props')).toContain('"orientation":"left"');
    expect(axes[0].getAttribute('data-props')).toContain('Revenue');
    expect(axes[1].getAttribute('data-props')).toContain('"yAxisId":1');
    expect(axes[1].getAttribute('data-props')).toContain('"orientation":"right"');
    expect(axes[1].getAttribute('data-props')).toContain('Orders');

    const bars = screen.getAllByTestId('Bar');
    expect(bars[0].getAttribute('data-props')).toContain('"yAxisId":0');
    expect(bars[1].getAttribute('data-props')).toContain('"yAxisId":1');
  });

  it('falls back to a single axis when the array form has no series yAxisId mapping (chart-dual-axis-invalid)', () => {
    render(
      <ChartRenderer
        {...makeProps({
          props: {
            chartType: 'line',
            xAxis: { dataKey: 'month' },
            yAxis: [
              { label: 'Revenue' },
              { label: 'Orders' },
            ],
            source: [
              { month: 'Jan', revenue: 12, orders: 8 },
              { month: 'Feb', revenue: 15, orders: 9 },
            ],
            series: [{ name: 'Revenue', dataRegionKey: 'revenue' }],
          },
        })}
      />,
    );

    const axes = screen.getAllByTestId('YAxis');
    expect(axes).toHaveLength(1);
    expect(axes[0].getAttribute('data-props')).toContain('"yAxisId":0');
    expect(screen.getByTestId('Line').getAttribute('data-props')).toContain('"yAxisId":0');
  });

  it('keeps the single-object yAxis form backward compatible (single left axis)', () => {
    render(
      <ChartRenderer
        {...makeProps({
          props: {
            chartType: 'bar',
            xAxis: { dataKey: 'month' },
            yAxis: { label: 'Revenue' },
            source: [{ month: 'Jan', revenue: 12 }],
            series: [{ name: 'Revenue', dataRegionKey: 'revenue' }],
          },
        })}
      />,
    );

    const axes = screen.getAllByTestId('YAxis');
    expect(axes).toHaveLength(1);
    expect(axes[0].getAttribute('data-props')).toContain('"orientation":"left"');
    expect(axes[0].getAttribute('data-props')).toContain('Revenue');
  });
});

describe('ChartRenderer brush (recharts Brush, index-based selection)', () => {
  beforeEach(() => {
    mockState.currentRegistry = undefined;
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  });

  afterEach(() => {
    mockState.currentRegistry = undefined;
    cleanup();
  });

  it('renders a Brush with the x dataKey when brush:true', () => {
    render(
      <ChartRenderer
        {...makeProps({
          props: {
            chartType: 'bar',
            xAxis: { dataKey: 'month' },
            source: [{ month: 'Jan', revenue: 12 }],
            series: [{ name: 'Revenue', dataRegionKey: 'revenue' }],
            brush: true,
          },
        })}
      />,
    );

    const brush = screen.getByTestId('Brush');
    expect(brush).toBeTruthy();
    expect(brush.getAttribute('data-props')).toContain('month');
  });

  it('omits the Brush when brush is absent or false', () => {
    render(
      <ChartRenderer
        {...makeProps({
          props: {
            chartType: 'bar',
            xAxis: { dataKey: 'month' },
            source: [{ month: 'Jan', revenue: 12 }],
            series: [{ name: 'Revenue', dataRegionKey: 'revenue' }],
          },
        })}
      />,
    );

    expect(screen.queryByTestId('Brush')).toBeNull();
  });

  it('keeps the Brush host node identity stable across in-place data updates (DD2 in-place contract)', () => {
    const props = {
      chartType: 'bar' as const,
      xAxis: { dataKey: 'month' },
      source: [{ month: 'Jan', revenue: 12 }],
      series: [{ name: 'Revenue', dataRegionKey: 'revenue' }],
      brush: true,
    };
    const { rerender } = render(<ChartRenderer {...makeProps({ props })} />);
    const before = document.querySelector('[data-testid="Brush"]');

    rerender(
      <ChartRenderer
        {...makeProps({
          props: {
            ...props,
            source: [
              { month: 'Jan', revenue: 12 },
              { month: 'Feb', revenue: 15 },
            ],
          },
        })}
      />,
    );

    const after = document.querySelector('[data-testid="Brush"]');
    expect(after).toBeTruthy();
    expect(after).toBe(before);
  });
});

describe('ChartRenderer heatmap (self-drawn SVG grid)', () => {
  beforeEach(() => {
    mockState.currentRegistry = undefined;
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  });

  afterEach(() => {
    mockState.currentRegistry = undefined;
    cleanup();
  });

  it('renders a heatmap grid from {x, y, value} source rows with normalized opacity cells', () => {
    render(
      <ChartRenderer
        {...makeProps({
          props: {
            chartType: 'heatmap',
            source: [
              { x: 'Mon', y: 'A', value: 10 },
              { x: 'Tue', y: 'A', value: 30 },
              { x: 'Mon', y: 'B', value: 20 },
              { x: 'Tue', y: 'B', value: 40 },
            ],
          },
        })}
      />,
    );

    const heatmap = document.querySelector('[data-slot="chart-heatmap"]') as HTMLElement;
    expect(heatmap).toBeTruthy();
    expect(heatmap.getAttribute('data-x-labels')).toBe('Mon,Tue');
    expect(heatmap.getAttribute('data-y-labels')).toBe('A,B');

    const cells = heatmap.querySelectorAll('rect[data-cell-value]');
    expect(cells).toHaveLength(4);
    const values = Array.from(cells).map((cell) => Number(cell.getAttribute('data-cell-value')));
    expect(values).toEqual(expect.arrayContaining([10, 30, 20, 40]));
    // 色阶不透明度：最大值不透明度更高（0.15 + 0.85 * 归一化）。
    const maxCell = Array.from(cells).find(
      (cell) => cell.getAttribute('data-cell-value') === '40',
    );
    const minCell = Array.from(cells).find(
      (cell) => cell.getAttribute('data-cell-value') === '10',
    );
    expect(Number(maxCell?.getAttribute('fill-opacity'))).toBeGreaterThan(
      Number(minCell?.getAttribute('fill-opacity')),
    );
  });

  it('degrades to the empty slot for empty/malformed heatmap data (DD1 contract, no crash)', () => {
    render(
      <ChartRenderer
        {...makeProps({
          props: {
            chartType: 'heatmap',
            source: [
              { x: 'Mon', y: 'A' },
              { x: 'Mon', value: 5 },
              { value: 5 },
              'garbage',
              null,
            ],
          },
        })}
      />,
    );

    expect(document.querySelector('[data-slot="chart-heatmap"]')).toBeNull();
    expect(document.querySelector('[data-slot="chart-empty"]')).toBeTruthy();
  });

  it('exposes heatmap rows in the sr-only textual equivalent', () => {
    render(
      <ChartRenderer
        {...makeProps({
          props: {
            title: 'Heat',
            chartType: 'heatmap',
            source: [{ x: 'Mon', y: 'A', value: 10 }],
          },
        })}
      />,
    );

    const equivalent = document.querySelector('[data-slot="chart-data-equivalent"]');
    expect(equivalent?.textContent).toContain('Mon/A: 10');
  });
});
