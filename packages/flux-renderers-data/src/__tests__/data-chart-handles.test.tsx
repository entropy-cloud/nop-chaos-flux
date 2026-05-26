import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

describe('dataRendererDefinitions chart handles', () => {
  afterEach(() => {
    cleanup();
  });

  it('registers chart handles with DOM refs and imperative methods', async () => {
    const registrySnapshots: any[] = [];
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/tree-and-chart"
        schema={{
          type: 'page',
          body: [
            {
              type: 'chart',
              componentId: 'sales-chart',
              chartType: 'pie',
              source: [{ label: 'Jan', value: 12 }],
              series: [{ name: 'Revenue', dataRegionKey: 'value' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onComponentRegistryChange={(registry) => registry && registrySnapshots.push(registry)}
      />,
    );
    await waitFor(() => {
      const registry = registrySnapshots.at(-1);
      const handle = registry?.resolve({ componentId: 'sales-chart' });
      expect(handle?.type).toBe('chart');
      expect(handle?.ref).toBeTruthy();
      expect(handle?.capabilities.hasMethod?.('resize')).toBe(true);
    });
    const chartRoot = document.querySelector('.nop-chart');
    expect(chartRoot).toBeTruthy();
    expect(chartRoot?.querySelector('[data-slot="chart-canvas"]')).toBeTruthy();
    expect(chartRoot?.querySelector('[data-slot="chart-empty"]')).toBeNull();
  });

  it('publishes empty chart content through a data-slot marker under the semantic chart root', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/tree-and-chart"
        schema={{
          type: 'page',
          body: [
            {
              type: 'chart',
              empty: { type: 'text', text: 'No chart data' },
              source: [],
              series: [],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const chartRoot = document.querySelector('.nop-chart');
    expect(chartRoot).toBeTruthy();
    expect(chartRoot?.querySelector('[data-slot="chart-empty"]')?.textContent).toContain('No chart data');
    expect(chartRoot?.querySelector('[data-slot="chart-canvas"]')).toBeNull();
  });
});
