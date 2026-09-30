import React, { type ReactNode } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChartRenderer } from '../chart-renderer.js';
import {
  buildHeatmapGrid,
  HeatmapGrid,
  MAX_HEATMAP_CELLS,
  sanitizeHeatmapRows,
} from '../chart-heatmap.js';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';

const mockState: { currentRegistry: { register: ReturnType<typeof vi.fn> } | undefined } = {
  currentRegistry: undefined,
};

function createMockComponent(name: string) {
  return function MockComponent(props: Record<string, unknown>) {
    return React.createElement('div', { 'data-testid': name }, props.children as ReactNode);
  };
}

vi.mock('@nop-chaos/flux-react', () => ({
  useCurrentComponentRegistry: () => mockState.currentRegistry,
  hasRendererSlotContent: (content: unknown) =>
    content !== null && content !== undefined && content !== false,
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
    id: 'chart-cap-node',
    props: {},
    meta: { cid: 7, className: 'custom-chart', testid: 'chart-root' },
    events: {},
    helpers: {},
    regions: {},
    node: {},
    ...overrides,
  } as any;
}

describe('chart sr-only summary cap (R3-P27)', () => {
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

  it('caps the pie summary at 20 entries and notes the remainder', () => {
    const source = Array.from({ length: 30 }, (_, index) => ({
      name: `item-${index + 1}`,
      value: index + 1,
    }));
    render(
      <ChartRenderer
        {...makeProps({
          props: {
            title: 'Pie chart',
            chartType: 'pie',
            xAxis: { dataKey: 'name' },
            source,
            series: [{ name: 'value', dataRegionKey: 'value' }],
          },
        })}
      />,
    );

    const equivalent = document.querySelector('[data-slot="chart-data-equivalent"]');
    expect(equivalent).toBeTruthy();
    const lines = Array.from(equivalent?.querySelectorAll('li') ?? []).map((li) => li.textContent);
    const itemLines = lines.filter((line) => line?.startsWith('item-'));
    expect(itemLines).toHaveLength(20);
    expect(itemLines[0]).toContain('item-1');
    expect(itemLines[19]).toContain('item-20');
    expect(lines.some((line) => line?.includes('and 10 more items not listed'))).toBe(true);
  });

  it('omits the truncation note within the limit', () => {
    render(
      <ChartRenderer
        {...makeProps({
          props: {
            title: 'Small pie',
            chartType: 'pie',
            source: [
              { name: 'a', value: 1 },
              { name: 'b', value: 2 },
            ],
            series: [{ name: 'value', dataRegionKey: 'value' }],
          },
        })}
      />,
    );

    const lines = Array.from(
      document.querySelectorAll('[data-slot="chart-data-equivalent"] li'),
    ).map((li) => li.textContent);
    expect(lines.some((line) => line?.includes('not listed'))).toBe(false);
  });
});

describe('heatmap cell cap (R3-P28)', () => {
  beforeEach(() => {
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  });

  it('renders at most MAX_HEATMAP_CELLS rects and appends a truncation note', () => {
    const rows = sanitizeHeatmapRows(
      Array.from({ length: 100 }, (_, x) =>
        Array.from({ length: 100 }, (_, y) => ({ x: `x${x}`, y: `y${y}`, value: x + y })),
      ).flat(),
    );
    expect(rows).toHaveLength(10000);
    const grid = buildHeatmapGrid(rows);

    const { container } = render(<HeatmapGrid grid={grid} ariaLabel="big heatmap" />);

    expect(container.querySelectorAll('rect')).toHaveLength(MAX_HEATMAP_CELLS);
    const note = container.querySelector('[data-slot="chart-heatmap-truncated"]');
    expect(note?.textContent).toBe(`Showing first ${MAX_HEATMAP_CELLS} of 10000 cells`);
  });

  it('keeps every cell and no note below the cap', () => {
    const rows = sanitizeHeatmapRows([
      { x: 'a', y: 'p', value: 1 },
      { x: 'b', y: 'q', value: 5 },
    ]);
    const grid = buildHeatmapGrid(rows);

    const { container } = render(<HeatmapGrid grid={grid} ariaLabel="small heatmap" />);

    expect(container.querySelectorAll('rect')).toHaveLength(2);
    expect(container.querySelector('[data-slot="chart-heatmap-truncated"]')).toBeNull();
  });
});
