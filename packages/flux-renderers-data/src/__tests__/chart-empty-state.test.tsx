import React from 'react';
import type { ReactNode } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChartRenderer } from '../chart-renderer.js';
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
    id: 'chart-empty-node',
    props: {},
    meta: { cid: 7, className: 'custom-chart', testid: 'chart-root' },
    events: {},
    helpers: {},
    regions: {},
    node: {},
    ...overrides,
  } as any;
}

describe('ChartRenderer empty state (G3-视角5-04, plan 486 Phase 1 proof)', () => {
  beforeEach(() => {
    mockState.currentRegistry = undefined;
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  });

  afterEach(() => {
    mockState.currentRegistry = undefined;
    cleanup();
    resetFluxI18n();
  });

  it('renders the chart-empty face muted-styled with i18n default text (no bare div)', () => {
    const { container } = render(
      <ChartRenderer
        {...makeProps({
          props: { chartType: 'bar', xAxis: { dataKey: 'name' }, source: [], series: [] },
        })}
      />,
    );

    const empty = container.querySelector('[data-slot="chart-empty"]');
    expect(empty).not.toBeNull();
    expect(empty!.className).toContain('text-muted-foreground');
    expect((empty!.textContent ?? '').length).toBeGreaterThan(0);
  });

  it('keeps the schema empty slot content inside the styled empty face', () => {
    const { container } = render(
      <ChartRenderer
        {...makeProps({
          props: { chartType: 'bar', xAxis: { dataKey: 'name' }, source: [], series: [] },
          regions: {
            empty: {
              type: 'region',
              render: () => React.createElement('span', null, 'custom empty slot'),
            },
          },
        })}
      />,
    );

    const empty = container.querySelector('[data-slot="chart-empty"]');
    expect(empty?.textContent).toContain('custom empty slot');
    expect(empty!.className).toContain('text-muted-foreground');
  });
});
