import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChartRenderer } from '../chart-renderer.js';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';

const roState = vi.hoisted(() => ({ width: 1024 as number | null, available: true }));

function simplifyValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (
    value == null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  if (typeof value === 'function') return '[function]';
  if (Array.isArray(value)) return value.map((item) => simplifyValue(item, seen));
  if (typeof value === 'object') {
    if (seen.has(value)) return '[circular]';
    seen.add(value);
    if ('$$typeof' in (value as Record<string, unknown>)) return '[react-element]';
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return '[object]';
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => key !== 'children')
        .map(([key, entry]) => [key, simplifyValue(entry, seen)]),
    );
  }
  return String(value);
}

function createMockComponent(name: string, renderContent = false) {
  return function MockComponent(props: Record<string, unknown>) {
    return React.createElement(
      'div',
      {
        'data-testid': name,
        'data-props': JSON.stringify(simplifyValue(props)),
      },
      props.children as React.ReactNode,
      renderContent ? (props.content as React.ReactNode) : null,
    );
  };
}

vi.mock('@nop-chaos/flux-react', () => ({
  useCurrentComponentRegistry: () => undefined,
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
  ChartLegend: createMockComponent('ChartLegend', true),
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

class FakeResizeObserver {
  callback: (entries: Array<{ contentRect: { width: number } }>) => void;
  constructor(callback: (entries: Array<{ contentRect: { width: number } }>) => void) {
    this.callback = callback;
  }
  observe() {
    if (roState.width !== null) {
      this.callback([{ contentRect: { width: roState.width } }]);
    }
  }
  disconnect() {}
  unobserve() {}
}

function makeProps(overrides: Record<string, unknown> = {}) {
  return {
    id: 'chart-node',
    props: {},
    meta: { cid: 7, className: 'custom-chart', testid: 'chart-root' },
    events: {},
    helpers: {},
    regions: {},
    node: {},
    ...overrides,
  } as any;
}

function chartRoot() {
  return document.querySelector('.nop-chart') as HTMLElement;
}

describe('ChartRenderer — responsive (M4c)', () => {
  beforeEach(() => {
    roState.width = 1024;
    roState.available = true;
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
  });

  it('uses authored height and no narrow marker on a wide container (no regression)', () => {
    roState.width = 1024;
    render(
      <ChartRenderer
        {...makeProps({
          props: {
            height: 400,
            chartType: 'bar',
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

    const root = chartRoot();
    expect(root.style.height).toBe('400px');
    expect(root.getAttribute('data-responsive')).toBeNull();
    expect(root.getAttribute('data-responsive-supported')).toBe('true');
    const legendContent = document.querySelector('[data-testid="ChartLegendContent"]') as HTMLElement;
    expect(legendContent.getAttribute('data-props')).not.toContain('flex-wrap');
  });

  it('clamps height and applies a compact wrapping legend on a narrow container', () => {
    roState.width = 320;
    render(
      <ChartRenderer
        {...makeProps({
          props: {
            height: 400,
            chartType: 'bar',
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

    const root = chartRoot();
    expect(root.style.height).toBe('300px');
    expect(root.getAttribute('data-responsive')).toBe('narrow');
    const legendContent = document.querySelector('[data-testid="ChartLegendContent"]') as HTMLElement;
    expect(legendContent.getAttribute('data-props')).toContain('flex-wrap');
    expect(legendContent.getAttribute('data-props')).toContain('gap-x-3');
  });

  it('keeps authored height when narrow but authored height is already small', () => {
    roState.width = 320;
    render(
      <ChartRenderer
        {...makeProps({
          props: {
            height: 220,
            chartType: 'bar',
            source: [{ month: 'Jan', value: 12 }],
            series: [{ name: 'Revenue', dataRegionKey: 'value' }],
          },
        })}
      />,
    );

    expect(chartRoot().style.height).toBe('220px');
  });

  it('falls back to fixed authored height without throwing when ResizeObserver is unavailable', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    render(
      <ChartRenderer
        {...makeProps({
          props: {
            height: 400,
            chartType: 'bar',
            source: [{ month: 'Jan', value: 12 }],
            series: [{ name: 'Revenue', dataRegionKey: 'value' }],
          },
        })}
      />,
    );

    const root = chartRoot();
    expect(root.style.height).toBe('400px');
    expect(root.getAttribute('data-responsive')).toBeNull();
    expect(root.getAttribute('data-responsive-supported')).toBeNull();
  });

  it('does not adapt height for string-based height (passes through)', () => {
    roState.width = 320;
    render(
      <ChartRenderer
        {...makeProps({
          props: {
            height: '50vh',
            chartType: 'bar',
            source: [{ month: 'Jan', value: 12 }],
            series: [{ name: 'Revenue', dataRegionKey: 'value' }],
          },
        })}
      />,
    );

    expect(chartRoot().style.height).toBe('50vh');
  });
});
