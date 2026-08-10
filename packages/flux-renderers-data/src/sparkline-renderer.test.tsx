import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDataSchemaRenderer, env, formulaCompiler } from './test-support.js';
import { buildSparklineGeometry, normalizeYDomain } from './sparkline-path.js';

describe('SparklineRenderer — SVG 渲染与纯函数输出一致', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the nop-sparkline root marker with an svg whose path.d matches the pure-function output', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    const data = [0, 10, 5, 20];
    render(
      <SchemaRenderer
        schemaUrl="test://data/sparkline-basic"
        schema={{ type: 'page', body: [{ type: 'sparkline', testid: 'demo-spark', data }] }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const root = document.querySelector('.nop-sparkline') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.getAttribute('data-slot')).toBe('sparkline-root');
    expect(root.getAttribute('data-testid')).toBe('demo-spark');

    const svg = root.querySelector('[data-slot="sparkline-canvas"]');
    const geometry = buildSparklineGeometry(data, { width: 120, height: 32, smooth: false, fill: false });
    expect(svg?.getAttribute('data-points')).toBe(geometry.points);
    expect(svg?.querySelector('path')?.getAttribute('d')).toBe(geometry.path);
  });

  it('resolves data through an expression (${expr} form)', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/sparkline-expr"
        schema={{ type: 'page', body: [{ type: 'sparkline', testid: 'expr', data: '${trend}' }] }}
        data={{ trend: [1, 2, 3, 4] }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const svg = document.querySelector('[data-slot="sparkline-canvas"]');
    expect(svg?.getAttribute('data-points')).toBe('0,32 40,21.3 80,10.7 120,0');
  });

  it('honors explicit width/height and min/max domain', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    const data = [2, 8];
    render(
      <SchemaRenderer
        schemaUrl="test://data/sparkline-size"
        schema={{
          type: 'page',
          body: [{ type: 'sparkline', testid: 'sized', data, width: 200, height: 100, min: 0, max: 10 }],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const svg = document.querySelector('[data-slot="sparkline-canvas"]');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 200 100');
    expect(svg?.getAttribute('width')).toBe('200');
    expect(svg?.getAttribute('height')).toBe('100');
    expect(svg?.querySelector('path')?.getAttribute('d')).toBe('M 0,80 L 200,20');
  });

  it('derives up status from rising data and applies the success CSS variable', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/sparkline-status-up"
        schema={{ type: 'page', body: [{ type: 'sparkline', testid: 'up', data: [1, 2, 3] }] }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const root = document.querySelector('.nop-sparkline') as HTMLElement;
    expect(root.getAttribute('data-status')).toBe('up');
    expect(root.querySelector('path')?.getAttribute('stroke')).toBe('hsl(var(--success))');
  });

  it('lets color.status override the derived direction', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/sparkline-color-status"
        schema={{
          type: 'page',
          body: [{ type: 'sparkline', testid: 'override', data: [1, 2, 3], color: { status: 'down' } }],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const root = document.querySelector('.nop-sparkline') as HTMLElement;
    expect(root.getAttribute('data-status')).toBe('down');
    expect(root.querySelector('path')?.getAttribute('stroke')).toBe('hsl(var(--destructive))');
  });

  it('uses a static string color verbatim', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/sparkline-static-color"
        schema={{
          type: 'page',
          body: [{ type: 'sparkline', testid: 'static', data: [1, 2, 3], color: 'hsl(var(--chart-2))' }],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const root = document.querySelector('.nop-sparkline') as HTMLElement;
    expect(root.querySelector('path')?.getAttribute('stroke')).toBe('hsl(var(--chart-2))');
    expect(root.getAttribute('data-status')).toBe('up');
  });

  it('renders smooth curves and gradient fill defs when enabled', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/sparkline-smooth-fill"
        schema={{
          type: 'page',
          body: [{ type: 'sparkline', testid: 'sf', data: [1, 3, 2, 4], fill: true, smooth: true }],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const root = document.querySelector('.nop-sparkline') as HTMLElement;
    expect(root.getAttribute('data-smooth')).toBe('true');
    expect(root.getAttribute('data-fill')).toBe('true');
    expect(root.querySelector('defs linearGradient')).toBeTruthy();
    const geometry = buildSparklineGeometry([1, 3, 2, 4], { width: 120, height: 32, smooth: true, fill: true });
    const line = root.querySelector('path[fill="none"]');
    expect(line?.getAttribute('d')).toBe(geometry.path);
    expect(root.querySelector('path')?.getAttribute('fill')).toContain('url(#sparkline-gradient-');
  });
});

describe('SparklineRenderer — Failure Paths 降级', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders an empty placeholder for empty/non-array/all-invalid data without throwing (sparkline-empty)', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/sparkline-empty"
        schema={{
          type: 'page',
          body: [
            { type: 'sparkline', testid: 'empty-arr', data: [] },
            { type: 'sparkline', testid: 'non-arr', data: { not: 'array' } },
            { type: 'sparkline', testid: 'invalid', data: [1, 'x', null, NaN] },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const empties = document.querySelectorAll('[data-slot="sparkline-empty"]');
    expect(empties).toHaveLength(3);
    expect(empties[0].querySelector('path')).toBeNull();
    expect(empties[0].querySelector('circle')).toBeNull();
  });

  it('renders a centered dot marker for a single point (sparkline-single-point)', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/sparkline-single"
        schema={{ type: 'page', body: [{ type: 'sparkline', testid: 'one', data: [7] }] }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const svg = document.querySelector('[data-slot="sparkline-canvas"]');
    const circle = svg?.querySelector('circle');
    expect(circle).toBeTruthy();
    expect(circle?.getAttribute('cx')).toBe('60');
    expect(circle?.getAttribute('cy')).toBe('16');
    expect(svg?.querySelector('path')).toBeNull();
  });

  it('renders a mid-line for flat data via the zero-span domain fallback (sparkline-flat)', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/sparkline-flat"
        schema={{ type: 'page', body: [{ type: 'sparkline', testid: 'flat', data: [5, 5, 5] }] }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const svg = document.querySelector('[data-slot="sparkline-canvas"]');
    expect(svg?.querySelector('path')?.getAttribute('d')).toBe('M 0,16 L 60,16 L 120,16');
    expect(normalizeYDomain([5, 5, 5])).toEqual({ min: 4, max: 6 });
  });

  it('filters invalid points and renders the remaining trend (sparkline-invalid-point)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/sparkline-partial-invalid"
        schema={{ type: 'page', body: [{ type: 'sparkline', testid: 'partial', data: [0, NaN, 10] }] }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const svg = document.querySelector('[data-slot="sparkline-canvas"]');
    expect(svg?.getAttribute('data-points')).toBe('0,32 120,0');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('emits meta testid and cid on the root', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/sparkline-meta"
        schema={{ type: 'page', body: [{ type: 'sparkline', testid: 'meta', data: [1, 2] }] }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const root = document.querySelector('.nop-sparkline') as HTMLElement;
    expect(root.getAttribute('data-testid')).toBe('meta');
    expect(root.getAttribute('data-cid')).toBeTruthy();
  });
});
