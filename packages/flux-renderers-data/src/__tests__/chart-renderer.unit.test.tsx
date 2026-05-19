import React from 'react';
import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
  resolveRendererSlotContent: (props: any, key: string, options: { fallback: string }) =>
    props.props[key] ?? options.fallback,
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

describe('ChartRenderer', () => {
  beforeEach(() => {
    mockState.currentRegistry = undefined;
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  });

  afterEach(() => {
    mockState.currentRegistry = undefined;
    cleanup();
  });

  it('renders empty content when no series data exists', () => {
    render(<ChartRenderer {...makeProps({ props: { empty: 'Nothing to show' } })} />);

    expect(screen.getByText('Nothing to show')).toBeTruthy();
    expect(document.querySelector('[data-slot="chart-empty"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="chart-canvas"]')).toBeNull();
  });

  it('renders loading state and forwards click and hover events', () => {
    const onClick = vi.fn();
    const onHover = vi.fn();

    render(
      <ChartRenderer
        {...makeProps({
          props: {
            chartType: 'bar',
            source: [{ label: 'Jan', value: 3 }],
            loading: true,
          },
          events: { onClick, onHover },
        })}
      />,
    );

    const canvas = document.querySelector('[data-slot="chart-canvas"]') as HTMLElement;
    expect(canvas).toBeTruthy();
    expect(screen.getByText(/Loading|加载中/)).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Chart' })).toBeTruthy();

    fireEvent.click(canvas);
    fireEvent.keyDown(canvas, { key: 'Enter' });
    fireEvent.keyDown(canvas, { key: ' ' });
    fireEvent.mouseEnter(canvas);
    expect(onClick).toHaveBeenCalledTimes(3);
    expect(onHover).toHaveBeenCalled();
  });

  it('uses the chart title as the canvas accessible name when present', () => {
    render(
      <ChartRenderer
        {...makeProps({
          props: {
            title: 'Revenue chart',
            source: [{ label: 'Jan', value: 3 }],
          },
        })}
      />,
    );

    expect(screen.getByLabelText('Revenue chart')).toBeTruthy();
  });

  it('renders a textual data equivalent for assistive technologies', () => {
    render(
      <ChartRenderer
        {...makeProps({
          props: {
            title: 'Revenue chart',
            xAxis: { dataKey: 'month' },
            source: [
              { month: 'Jan', value: 3 },
              { month: 'Feb', value: 5 },
            ],
            series: [{ name: 'Revenue', dataRegionKey: 'value' }],
          },
        })}
      />,
    );

    const equivalent = document.querySelector('[data-slot="chart-data-equivalent"]');
    expect(equivalent?.textContent).toContain('Revenue chart');
    expect(equivalent?.textContent).toContain('Jan: Revenue: 3');
    expect(equivalent?.textContent).toContain('Feb: Revenue: 5');
  });

  it('registers a chart handle and supports the resize capability', () => {
    const dispose = vi.fn();
    const register = vi.fn(() => dispose);
    mockState.currentRegistry = { register };

    const { unmount } = render(
      <ChartRenderer
        {...makeProps({
          props: {
            componentId: 'sales-chart',
            source: [{ label: 'Jan', value: 3 }],
            series: [{ name: 'Revenue', dataRegionKey: 'value' }],
          },
        })}
      />,
    );

    const handle = (register.mock.lastCall as unknown[] | undefined)?.[0] as any;
    expect(handle).toBeTruthy();
    expect(register).toHaveBeenCalledWith(expect.any(Object), { cid: 7 });
    expect(handle.id).toBe('sales-chart');
    expect(handle.capabilities.hasMethod('resize')).toBe(true);
    expect(handle.capabilities.listMethods()).toEqual(['resize']);
    expect(handle.capabilities.invoke('resize')).toEqual({ ok: true });
    expect(handle.capabilities.invoke('unknown').ok).toBe(false);

    unmount();
    expect(dispose).toHaveBeenCalled();
  });

  it('renders a pie chart from source data and shows legend for multiple series', () => {
    render(
      <ChartRenderer
        {...makeProps({
          props: {
            chartType: 'pie',
            title: 'Sales',
            xAxis: { dataKey: 'label' },
            source: [
              { label: 'Jan', value: 12 },
              { label: 'Feb', value: 8 },
            ],
            series: [
              { name: 'Revenue', dataRegionKey: 'value' },
              { name: 'Costs', dataRegionKey: 'value' },
            ],
          },
        })}
      />,
    );

    expect(screen.getByTestId('PieChart')).toBeTruthy();
    expect(screen.getByTestId('Pie')).toBeTruthy();
    expect(screen.getByTestId('ChartLegend')).toBeTruthy();
    expect(screen.getAllByTestId('Cell')).toHaveLength(2);
    expect(screen.getByTestId('ChartContainer').getAttribute('data-props')).toContain('Revenue');
  });

  it('renders scatter data mappings, line fallback series, and bar fallback config branches', () => {
    const { rerender } = render(
      <ChartRenderer
        {...makeProps({
          props: {
            chartType: 'scatter',
            xAxis: { dataKey: 'label', label: 'Month' },
            yAxis: { label: 'Value' },
            source: [{ label: 'Jan', value: 9 }],
            series: [
              { name: 'Revenue', dataRegionKey: 'value' },
              { name: 'Costs', dataRegionKey: 'value' },
            ],
          },
        })}
      />,
    );

    expect(screen.getByTestId('ScatterChart')).toBeTruthy();
    expect(screen.getByTestId('XAxis').getAttribute('data-props')).toContain('Month');
    expect(screen.getAllByTestId('Scatter')).toHaveLength(2);

    const scatterProps = screen.getAllByTestId('Scatter').map((node) =>
      node.getAttribute('data-props'),
    );
    expect(scatterProps[0]).toContain('Revenue');

    rerender(
      <ChartRenderer
        {...makeProps({
          props: {
            chartType: 'line',
            series: [{ data: [1, 2, 3] }],
          },
        })}
      />,
    );

    expect(screen.getByTestId('LineChart')).toBeTruthy();
    expect(screen.getByTestId('Line').getAttribute('data-props')).toContain('value');
    expect(screen.getByTestId('Line').getAttribute('data-props')).toContain('hsl(var(--chart-1))');
    expect(screen.getByTestId('ChartContainer').getAttribute('data-props')).toContain('Value');

    rerender(
      <ChartRenderer
        {...makeProps({
          props: {
            source: [{ value: 5 }],
            series: [],
          },
        })}
      />,
    );

    expect(screen.getByTestId('BarChart')).toBeTruthy();
    expect(screen.getByTestId('Bar').getAttribute('data-props')).toContain('value');
    expect(screen.getByTestId('Bar').getAttribute('data-props')).toContain('hsl(var(--chart-1))');
  });

  it('uses visible theme colors for named cartesian series', () => {
    render(
      <ChartRenderer
        {...makeProps({
          props: {
            chartType: 'line',
            xAxis: { dataKey: 'month', label: 'Month' },
            source: [
              { month: 'Jan', revenue: 12, expenses: 8 },
              { month: 'Feb', revenue: 15, expenses: 9 },
            ],
            series: [
              { name: 'Revenue', dataRegionKey: 'revenue' },
              { name: 'Expenses', dataRegionKey: 'expenses' },
            ],
          },
        })}
      />,
    );

    const lines = screen.getAllByTestId('Line');
    expect(lines).toHaveLength(2);
    expect(lines[0].getAttribute('data-props')).toContain('hsl(var(--chart-1))');
    expect(lines[1].getAttribute('data-props')).toContain('hsl(var(--chart-2))');
    expect(screen.getByTestId('ChartContainer').getAttribute('data-props')).toContain('Revenue');
    expect(screen.getByTestId('ChartContainer').getAttribute('data-props')).toContain('Expenses');
  });
});
