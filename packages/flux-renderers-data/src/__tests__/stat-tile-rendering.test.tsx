import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

describe('StatTileRenderer — KPI value rendering (formatting / placeholder / expression)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the nop-stat-tile root marker with the formatted KPI value', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/stat-tile-basic"
        schema={{
          type: 'page',
          body: [
            {
              type: 'stat-tile',
              testid: 'demo-stat-tile',
              value: 1234567.89,
              formatter: { thousands: true, decimals: 2 },
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const root = document.querySelector('.nop-stat-tile') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.getAttribute('data-slot')).toBe('stat-tile-root');
    expect(root.getAttribute('data-testid')).toBe('demo-stat-tile');
    expect(screen.getByText('1,234,567.89')).toBeTruthy();
  });

  it('follows a reactive value expression (${expr} resolves at runtime)', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    const schema = {
      type: 'page',
      body: [{ type: 'stat-tile', testid: 'kpi', value: '${kpi.revenue}' }],
    };

    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://data/stat-tile-reactive"
        schema={schema}
        data={{ kpi: { revenue: 1200 } }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(document.querySelector('[data-slot="stat-tile-value"]')?.textContent).toBe('1200');

    rerender(
      <SchemaRenderer
        schemaUrl="test://data/stat-tile-reactive"
        schema={schema}
        data={{ kpi: { revenue: 2500 } }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(document.querySelector('[data-slot="stat-tile-value"]')?.textContent).toBe('2500');  });

  it('renders the `--` placeholder when value is null/undefined/non-numeric (no crash)', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/stat-tile-null"
        schema={{
          type: 'page',
          body: [
            { type: 'stat-tile', testid: 'null-tile' },
            { type: 'stat-tile', testid: 'text-tile', value: 'not-a-number' },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const values = document.querySelectorAll('[data-slot="stat-tile-value"]');
    expect(values).toHaveLength(2);
    expect(values[0].textContent).toBe('--');
    expect(values[0].getAttribute('data-value')).toBe('null');
    expect(values[1].textContent).toBe('--');
  });

  it('renders prefix and suffix around the value', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/stat-tile-affix"
        schema={{
          type: 'page',
          body: [{ type: 'stat-tile', testid: 'affix', value: 42, prefix: '¥', suffix: '万' }],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.getByText('¥')).toBeTruthy();
    expect(screen.getByText('万')).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();
  });

  it('renders the label slot when a string label is authored', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/stat-tile-label"
        schema={{
          type: 'page',
          body: [{ type: 'stat-tile', testid: 'labeled', value: 42, label: '月活用户' }],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const label = document.querySelector('[data-slot="stat-tile-label"]');
    expect(label).toBeTruthy();
    expect(label?.textContent).toBe('月活用户');
  });
});

describe('StatTileRenderer — delta direction and status colors', () => {
  afterEach(() => {
    cleanup();
  });

  it('derives up direction and positive color from a positive delta number', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/stat-tile-delta-up"
        schema={{
          type: 'page',
          body: [{ type: 'stat-tile', testid: 'delta', value: 100, delta: 12.5 }],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const delta = document.querySelector('[data-slot="stat-tile-delta"]') as HTMLElement;
    expect(delta).toBeTruthy();
    expect(delta.getAttribute('data-direction')).toBe('up');
    expect(delta.textContent).toContain('+12.5%');
    expect(delta.className).toContain('text-emerald-600');
  });

  it('derives down direction and negative color from a negative delta number', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/stat-tile-delta-down"
        schema={{
          type: 'page',
          body: [{ type: 'stat-tile', testid: 'delta', value: 100, delta: -3 }],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const delta = document.querySelector('[data-slot="stat-tile-delta"]') as HTMLElement;
    expect(delta.getAttribute('data-direction')).toBe('down');
    expect(delta.textContent).toContain('-3%');
    expect(delta.className).toContain('text-red-600');
  });

  it('honors delta object label and explicit direction', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/stat-tile-delta-object"
        schema={{
          type: 'page',
          body: [
            {
              type: 'stat-tile',
              testid: 'delta',
              value: 100,
              delta: { value: 5, label: '环比 +5 个百分点', direction: 'down' },
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const delta = document.querySelector('[data-slot="stat-tile-delta"]') as HTMLElement;
    expect(delta.textContent).toContain('环比 +5 个百分点');
    expect(delta.getAttribute('data-direction')).toBe('down');
    expect(delta.className).toContain('text-red-600');
  });

  it('lets the explicit status override the delta sign', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/stat-tile-status-override"
        schema={{
          type: 'page',
          body: [{ type: 'stat-tile', testid: 'status', value: 100, delta: 8, status: 'down' }],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const delta = document.querySelector('[data-slot="stat-tile-delta"]') as HTMLElement;
    expect(delta.getAttribute('data-direction')).toBe('down');
    expect(delta.className).toContain('text-red-600');
  });

  it('omits the delta row when delta is absent', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/stat-tile-no-delta"
        schema={{
          type: 'page',
          body: [{ type: 'stat-tile', testid: 'plain', value: 42 }],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(document.querySelector('[data-slot="stat-tile-delta"]')).toBeNull();
  });
});

describe('StatTileRenderer — sparkline rendering and degradation', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders a sparkline svg with normalized polyline points for numeric data', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/stat-tile-spark"
        schema={{
          type: 'page',
          body: [{ type: 'stat-tile', testid: 'spark', value: 42, sparkline: [1, 2, 3, 4, 5] }],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const sparkline = document.querySelector('[data-slot="stat-tile-sparkline"]') as HTMLElement;
    expect(sparkline).toBeTruthy();
    expect(sparkline.getAttribute('data-points')).toBeTruthy();
    expect(document.querySelector('[data-slot="stat-tile-value"]')?.textContent).toBe('42');
  });

  it('renders a single-point sparkline as a dot (no polyline)', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/stat-tile-spark-one"
        schema={{
          type: 'page',
          body: [{ type: 'stat-tile', testid: 'spark', value: 42, sparkline: [7] }],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const sparkline = document.querySelector('[data-slot="stat-tile-sparkline"]') as HTMLElement;
    expect(sparkline).toBeTruthy();
    expect(sparkline.getAttribute('data-points')).toBeFalsy();
    expect(sparkline.querySelector('circle')).toBeTruthy();
    expect(sparkline.querySelector('polyline')).toBeNull();
  });

  it('resolves sparkline data through an expression (dataRegionKey form)', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/stat-tile-spark-expr"
        schema={{
          type: 'page',
          body: [{ type: 'stat-tile', testid: 'spark', value: '${kpi.revenue}', sparkline: '${kpi.trend}' }],
        }}
        data={{ kpi: { revenue: 42, trend: [10, 20, 15] } }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const sparkline = document.querySelector('[data-slot="stat-tile-sparkline"]') as HTMLElement;
    expect(sparkline).toBeTruthy();
    expect(sparkline.getAttribute('data-points')).toBeTruthy();
  });

  it('degrades to no sparkline when data is empty/invalid while the KPI stays visible', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/stat-tile-spark-empty"
        schema={{
          type: 'page',
          body: [
            { type: 'stat-tile', testid: 'empty', value: 42, sparkline: [] },
            { type: 'stat-tile', testid: 'invalid', value: 42, sparkline: [1, 'x', null, NaN] },
            { type: 'stat-tile', testid: 'nonarray', value: 42, sparkline: { not: 'array' } },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const sparklines = document.querySelectorAll('[data-slot="stat-tile-sparkline"]');
    expect(sparklines).toHaveLength(0);
    const values = document.querySelectorAll('[data-slot="stat-tile-value"]');
    expect(values).toHaveLength(3);
    expect(values[0].textContent).toBe('42');
  });

  it('emits meta testid and cid on the root', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/stat-tile-meta"
        schema={{
          type: 'page',
          body: [{ type: 'stat-tile', testid: 'demo-stat-tile', value: 7 }],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const root = document.querySelector('.nop-stat-tile') as HTMLElement;
    expect(root.getAttribute('data-testid')).toBe('demo-stat-tile');
    expect(root.getAttribute('data-cid')).toBeTruthy();
  });
});
