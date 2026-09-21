import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';
import { ChartRenderer } from '../chart-renderer.js';

/**
 * Plan 489 V12c Phase 1 — data package consistency items, pinned by
 * attribute/option-object assertions:
 * - [G3-视角3-01] column-resize handle is keyboard-focusable and carries the
 *   package focus-visible ring.
 * - [G3-视角3-02] row drag handle is keyboard-focusable and carries the same
 *   focus-visible ring.
 * - [G3-R2-视角10-02] tree-table lazy-load spinner consumes the ui Spinner
 *   baseline instead of the handwritten ring span.
 * - [G3-视角7-02] chart marker default color resolves from the destructive
 *   token (same `hsl(var(--token))` convention as every other chart color),
 *   not the hardcoded '#ef4444'.
 */

// [G3-视角7-02] capture the live Line props so the produced marker dot option
// object can be invoked and its fill inspected (same recharts-mock pattern as
// chart-renderer-config.unit.test.tsx).
const chartMock = vi.hoisted(() => ({ lineProps: [] as Array<Record<string, unknown>> }));

vi.mock('recharts', () => {
  const passthrough = (name: string) => (props: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': name }, props.children as React.ReactNode);
  return {
    AreaChart: passthrough('AreaChart'),
    Area: passthrough('Area'),
    BarChart: passthrough('BarChart'),
    Bar: passthrough('Bar'),
    LineChart: passthrough('LineChart'),
    Line: (props: Record<string, unknown>) => {
      chartMock.lineProps.push(props);
      return React.createElement('div', { 'data-testid': 'Line' }, props.children as React.ReactNode);
    },
    PieChart: passthrough('PieChart'),
    Pie: passthrough('Pie'),
    Cell: passthrough('Cell'),
    ScatterChart: passthrough('ScatterChart'),
    Scatter: passthrough('Scatter'),
    XAxis: passthrough('XAxis'),
    YAxis: passthrough('YAxis'),
    CartesianGrid: passthrough('CartesianGrid'),
    ReferenceLine: passthrough('ReferenceLine'),
    ReferenceArea: passthrough('ReferenceArea'),
    Brush: passthrough('Brush'),
    ResponsiveContainer: passthrough('ResponsiveContainer'),
  };
});

vi.mock('@nop-chaos/ui/chart', () => ({
  ChartContainer: (props: Record<string, unknown>) =>
    React.createElement('div', {}, props.children as React.ReactNode),
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
  ChartLegend: () => null,
  ChartLegendContent: () => null,
}));

function renderSchema(body: Record<string, unknown>, envOverride?: typeof env) {
  const SchemaRenderer = createDataSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://data/v12c-p1-data-consistency"
      schema={{ type: 'page', body: [body] } as any}
      env={envOverride ?? env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

const FOCUS_RING_CLASSES = [
  'focus-visible:ring-2',
  'focus-visible:ring-ring',
  'focus-visible:outline-none',
] as const;

describe('[G3-视角3-01] column-resize handle focus-visible ring', () => {
  it('keeps the keyboard tab stop and adds the focus-visible ring classes', () => {
    renderSchema({
      type: 'table',
      rowKey: 'id',
      columnResize: true,
      columns: [{ label: 'Name', name: 'name', width: 120 }],
      source: [{ id: 1, name: 'Alice' }],
    });

    const handle = document.querySelector(
      '[data-slot="table-column-resize-handle"]',
    ) as HTMLElement;
    expect(handle).toBeTruthy();
    // keyboard-focusable premise (WCAG 2.1.1 separator)
    expect(handle.getAttribute('tabindex')).toBe('0');
    for (const ringClass of FOCUS_RING_CLASSES) {
      expect(handle.className).toContain(ringClass);
    }
  });
});

describe('[G3-视角3-02] row drag handle focus-visible ring', () => {
  it('keeps the keyboard tab stop and adds the focus-visible ring classes', () => {
    renderSchema({
      type: 'table',
      rowKey: 'id',
      draggable: true,
      orderField: 'order',
      columns: [{ label: 'Name', name: 'name' }],
      source: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ],
    });

    const handle = document.querySelector('[data-slot="table-row-drag-handle"]') as HTMLElement;
    expect(handle).toBeTruthy();
    // keyboard-focusable premise (role=button separator with a tab stop)
    expect(handle.getAttribute('role')).toBe('button');
    expect(handle.getAttribute('tabindex')).toBe('0');
    for (const ringClass of FOCUS_RING_CLASSES) {
      expect(handle.className).toContain(ringClass);
    }
  });
});

describe('[G3-R2-视角10-02] tree-table lazy-load spinner uses the ui Spinner baseline', () => {
  it('renders the ui Spinner in the lazy toggle while loading (no handwritten ring)', async () => {
    let resolveChildren: (value: unknown) => void;
    const fetcher = vi.fn(async () => {
      await new Promise((resolve) => {
        resolveChildren = resolve;
      });
      return { status: 0, data: [] };
    });
    const lazyEnv = { ...env, fetcher } as typeof env;

    try {
      renderSchema(
        {
          type: 'table',
          rowKey: 'id',
          rowChildrenField: 'items',
          childrenSource: { action: 'ajax', args: { url: '/api/children' } },
          columns: [{ label: 'Name', name: 'name' }],
          source: [{ id: '1', name: 'Parent' }],
        },
        lazyEnv,
      );

      const toggle = document.querySelector(
        '[data-slot="table-tree-toggle"]',
      ) as HTMLElement;
      expect(toggle).toBeTruthy();

      fireEvent.click(toggle);

      await waitFor(() => {
        // ui Spinner baseline: role=status svg carrying the nop-spinner hook class
        const spinner = toggle.querySelector('.nop-spinner');
        expect(spinner).not.toBeNull();
        expect(spinner!.getAttribute('role')).toBe('status');
        // the package-unique handwritten ring implementation is gone
        expect(toggle.querySelector('.border-t-transparent')).toBeNull();
        expect(toggle.querySelector('.rounded-full.border-2')).toBeNull();
      });
    } finally {
      resolveChildren!({ status: 0, data: [] });
    }
  });
});

describe('[G3-视角7-02] chart marker default color from the destructive token', () => {
  beforeEach(() => {
    chartMock.lineProps = [];
  });

  function markerDot(): (dotProps: {
    cx?: number;
    cy?: number;
    index?: number;
    payload?: Record<string, unknown>;
  }) => React.ReactElement | null {
    expect(chartMock.lineProps.length).toBeGreaterThan(0);
    const dot = chartMock.lineProps[chartMock.lineProps.length - 1]!.dot as unknown as (
      dotProps: {
        cx?: number;
        cy?: number;
        index?: number;
        payload?: Record<string, unknown>;
      },
    ) => React.ReactElement | null;
    expect(typeof dot).toBe('function');
    return dot;
  }

  it('resolves the default marker fill through hsl(var(--destructive)), not #ef4444', () => {
    render(
      <ChartRenderer
        {...({
          id: 'chart-node',
          props: {
            chartType: 'line',
            xAxis: { dataKey: 'subgroup' },
            source: [
              { subgroup: 1, value: 10 },
              { subgroup: 2, value: 14 },
            ],
            series: [{ name: 'Mean', dataRegionKey: 'value' }],
            markers: { indices: [0] },
          },
          meta: { cid: 7 },
          events: {},
          helpers: {},
          regions: {},
          node: {},
        } as any)}
      />,
    );

    const dot = markerDot();
    const marked = dot({ cx: 4, cy: 6, index: 0 });
    expect(marked).toBeTruthy();
    expect((marked!.props as { fill?: string }).fill).toBe('hsl(var(--destructive))');
    expect((marked!.props as { fill?: string }).fill).not.toBe('#ef4444');
    // unmarked points keep the clean dot=false look
    expect(dot({ cx: 8, cy: 9, index: 1 })).toBeNull();
  });

  it('still honors an explicit markers.color override', () => {
    render(
      <ChartRenderer
        {...({
          id: 'chart-node',
          props: {
            chartType: 'line',
            xAxis: { dataKey: 'subgroup' },
            source: [{ subgroup: 1, value: 10 }],
            series: [{ name: 'Mean', dataRegionKey: 'value' }],
            markers: { indices: [0], color: '#0ea5e9' },
          },
          meta: { cid: 7 },
          events: {},
          helpers: {},
          regions: {},
          node: {},
        } as any)}
      />,
    );

    const marked = markerDot()({ cx: 4, cy: 6, index: 0 });
    expect((marked!.props as { fill?: string }).fill).toBe('#0ea5e9');
  });
});
