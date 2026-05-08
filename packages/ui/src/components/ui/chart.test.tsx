import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChartContainer, ChartStyle } from './chart.js';

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
