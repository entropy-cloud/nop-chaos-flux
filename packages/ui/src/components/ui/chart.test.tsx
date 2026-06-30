import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChartContainer, ChartLegendContent, ChartStyle } from './chart.js';

// happy-dom has no layout, so recharts ResponsiveContainer measures 0x0 and
// renders nothing. Stub it to render its children directly so chart content
// components (which only need the ChartContext, not real measurements) mount.
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  Tooltip: () => null,
  Legend: () => null,
}));

describe('ChartStyle', () => {
  it('drops unsafe css keys and color payloads from generated styles', () => {
    const { container } = render(
      <ChartStyle
        id={'chart-1"] body { color:red; } /*'}
        config={{
          revenue: { label: 'Revenue', color: 'hsl(var(--chart-1))' },
          'bad;key': { label: 'Bad', color: 'red; background:url(javascript:alert(1))' },
        }}
      />,
    );

    const style = container.querySelector('style');
    expect(style?.innerHTML).toContain('[data-chart="chart-1bodycolorred"]');
    expect(style?.innerHTML).toContain('--color-revenue: hsl(var(--chart-1));');
    expect(style?.innerHTML).not.toContain('bad;key');
    expect(style?.innerHTML).not.toContain('javascript:alert');
    expect(style?.innerHTML).not.toContain('body { color:red; }');
  });

  it('renders container with sanitized chart id attribute', () => {
    const { container } = render(
      <ChartContainer id={'demo:1'} config={{ value: { color: 'hsl(var(--chart-1))' } }}>
        <div />
      </ChartContainer>,
    );

    expect(container.querySelector('[data-chart="chart-demo1"]')).toBeTruthy();
  });
});

describe('ChartLegendContent keys (S-6)', () => {
  it('renders every legend row even when payload values collide', () => {
    const config = {
      a: { label: 'Alpha', color: 'hsl(var(--chart-1))' },
      b: { label: 'Beta', color: 'hsl(var(--chart-2))' },
    };
    // Both items share value 5 — a bare key={item.value} would collide and drop a row.
    const payload = [
      { type: 'rect', value: 5, color: 'hsl(var(--chart-1))', dataKey: 'a', name: 'a' },
      { type: 'rect', value: 5, color: 'hsl(var(--chart-2))', dataKey: 'b', name: 'b' },
    ] as never;

    const { container } = render(
      <ChartContainer id="legend-collision" config={config}>
        <ChartLegendContent payload={payload} />
      </ChartContainer>,
    );

    // Two legend rows => two colored indicator squares must render.
    expect(container.querySelectorAll('[class~="shrink-0"]')).toHaveLength(2);
  });
});
