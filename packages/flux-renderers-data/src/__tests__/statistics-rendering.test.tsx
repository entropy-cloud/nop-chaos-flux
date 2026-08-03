import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

describe('StatisticsRenderer (W2a — standalone numeric summary)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the nop-statistics root marker with total text', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/statistics-basic"
        schema={{
          type: 'page',
          body: [
            {
              type: 'statistics',
              testid: 'demo-statistics',
              total: 60,
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const root = document.querySelector('.nop-statistics') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.getAttribute('data-slot')).toBe('statistics-root');
    expect(root.getAttribute('data-total')).toBe('60');
    expect(screen.getByText('Total 60')).toBeTruthy();
  });

  it('follows a reactive total prop (server refresh updates the summary)', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    const schema = {
      type: 'page',
      body: [
        {
          type: 'statistics',
          testid: 'h2-statistics',
          total: '${count}',
        },
      ],
    };

    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://data/statistics-reactive"
        schema={schema}
        data={{ count: 25 }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(document.querySelector('.nop-statistics')?.getAttribute('data-total')).toBe('25');
    expect(screen.getByText('Total 25')).toBeTruthy();

    rerender(
      <SchemaRenderer
        schemaUrl="test://data/statistics-reactive"
        schema={schema}
        data={{ count: 100 }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(document.querySelector('.nop-statistics')?.getAttribute('data-total')).toBe('100');
    expect(screen.getByText('Total 100')).toBeTruthy();
  });

  it('falls back to 0 when total is missing or null (no crash)', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/statistics-missing"
        schema={{
          type: 'page',
          body: [{ type: 'statistics', testid: 'demo-statistics' }],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(document.querySelector('.nop-statistics')?.getAttribute('data-total')).toBe('0');
    expect(screen.getByText('Total 0')).toBeTruthy();
  });

  it('emits meta testid and cid on the root', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/statistics-meta"
        schema={{
          type: 'page',
          body: [{ type: 'statistics', testid: 'demo-statistics', total: 7 }],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const root = document.querySelector('.nop-statistics') as HTMLElement;
    expect(root.getAttribute('data-testid')).toBe('demo-statistics');
    expect(root.getAttribute('data-cid')).toBeTruthy();
  });
});
