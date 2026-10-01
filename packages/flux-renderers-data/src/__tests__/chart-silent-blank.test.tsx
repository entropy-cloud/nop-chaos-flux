import React from 'react';
import type { ReactNode } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChartRenderer } from '../chart-renderer.js';
import { resetChartDiagnosticsForTests } from '../chart-diagnostics.js';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';

const mockState: { currentRegistry: { register: ReturnType<typeof vi.fn> } | undefined } = {
  currentRegistry: undefined,
};

function createMockComponent(name: string) {
  return function MockComponent(props: Record<string, unknown>) {
    return React.createElement(
      'div',
      { 'data-testid': name },
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
    id: 'chart-blank-node',
    props: {},
    meta: { cid: 7, className: '', testid: 'chart-root' },
    events: {},
    helpers: {},
    regions: {},
    node: {},
    ...overrides,
  } as any;
}

const MONTHLY_SOURCE = [
  { month: 'Jan', sales: 320 },
  { month: 'Feb', sales: 410 },
];

describe('ChartRenderer silent-blank failure paths (ux-r1)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockState.currentRegistry = undefined;
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    resetChartDiagnosticsForTests();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    mockState.currentRegistry = undefined;
    cleanup();
    resetFluxI18n();
  });

  it('renders the empty face + dev warn when series keys resolve to nothing on non-empty source', () => {
    const { container } = render(
      <ChartRenderer
        {...makeProps({
          props: {
            chartType: 'line',
            xAxis: { dataKey: 'month' },
            source: MONTHLY_SOURCE,
            series: [{ name: 'Revenue' }],
          },
        })}
      />,
    );

    expect(container.querySelector('[data-slot="chart-empty"]')).not.toBeNull();
    expect(
      warnSpy.mock.calls.some((call: unknown[]) => String(call[0]).includes('Revenue')),
    ).toBe(true);
  });

  it('conflict path: declared series data + non-empty source keeps the chart face (no empty slot), warn only', () => {
    const { container } = render(
      <ChartRenderer
        {...makeProps({
          props: {
            chartType: 'line',
            xAxis: { dataKey: 'month' },
            source: MONTHLY_SOURCE,
            series: [{ name: 'Revenue', data: [1, 2] }],
          },
        })}
      />,
    );

    expect(container.querySelector('[data-slot="chart-empty"]')).toBeNull();
    expect(container.querySelector('[data-slot="chart-canvas"]')).not.toBeNull();
    expect(
      warnSpy.mock.calls.some(
        (call: unknown[]) => String(call[0]).includes('Revenue') && String(call[0]).includes('data'),
      ),
    ).toBe(true);
  });

  it('healthy dataRegionKey config renders without empty face or warn', () => {
    const { container } = render(
      <ChartRenderer
        {...makeProps({
          props: {
            chartType: 'line',
            xAxis: { dataKey: 'month' },
            source: MONTHLY_SOURCE,
            series: [{ name: 'Sales', dataRegionKey: 'sales' }],
          },
        })}
      />,
    );

    expect(container.querySelector('[data-slot="chart-empty"]')).toBeNull();
    expect(container.querySelector('[data-slot="chart-canvas"]')).not.toBeNull();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('warns once per signature across re-renders (dedup)', () => {
    const props = makeProps({
      props: {
        chartType: 'line',
        xAxis: { dataKey: 'month' },
        source: MONTHLY_SOURCE,
        series: [{ name: 'Revenue' }],
      },
    });
    const { rerender } = render(<ChartRenderer {...props} />);
    rerender(<ChartRenderer {...props} />);
    rerender(<ChartRenderer {...props} />);

    const matching = warnSpy.mock.calls.filter((call: unknown[]) =>
      String(call[0]).includes('Revenue'),
    );
    expect(matching.length).toBe(1);
  });
});
