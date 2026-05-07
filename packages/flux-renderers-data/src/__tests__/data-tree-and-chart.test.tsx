import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  createDataSchemaRenderer,
  env,
  formulaCompiler,
  iconRenderer,
  nodeInstanceProbeRenderer,
} from '../test-support.js';

describe('dataRendererDefinitions tree and chart behavior', () => {
  it('renders visual tree nodes through the node region with inherited bindings', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([iconRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/tree-and-chart"
        schema={{
          type: 'page',
          body: [
            {
              type: 'tree',
              data: '${nodes}',
              initiallyExpanded: true,
              node: [
                { type: 'icon', icon: '${$slot.depth}' },
                {
                  type: 'text',
                  text: '${$slot.node.label}:${$slot.depth}:${$slot.parentNode ? $slot.parentNode.label : "root"}',
                },
              ],
            },
          ],
        }}
        data={{
          nodes: [
            {
              id: 'root',
              label: 'Root',
              children: [{ id: 'child', label: 'Child', children: [] }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('Root:0:root')).toBeTruthy();
      expect(screen.getByText('Child:1:Root')).toBeTruthy();
    });
  });

  it('renders tree empty content when data is empty', () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/tree-and-chart"
        schema={{
          type: 'page',
          body: [{ type: 'tree', data: '${nodes}', empty: { type: 'text', text: 'No nodes yet' } }],
        }}
        data={{ nodes: [] }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(screen.getByText('No nodes yet')).toBeTruthy();
    const treeRoot = document.querySelector('.nop-tree');
    expect(treeRoot?.querySelector('[data-slot="tree-empty"]')?.textContent).toContain(
      'No nodes yet',
    );
  });

  it('publishes tree nodes through slot markers instead of internal nop region classes', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/tree-and-chart"
        schema={{
          type: 'page',
          body: [{ type: 'tree', data: '${nodes}', initiallyExpanded: true }],
        }}
        data={{
          nodes: [
            {
              id: 'root',
              label: 'Root',
              children: [{ id: 'child', label: 'Child', children: [] }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('Root')).toBeTruthy();
      expect(document.querySelectorAll('[data-slot="tree-node"]').length).toBeGreaterThan(0);
    });
    const treeRoot = document.querySelector('.nop-tree');
    expect(treeRoot).toBeTruthy();
    expect(treeRoot?.querySelector('[data-slot="tree-node"]')).toBeTruthy();
    expect(treeRoot?.querySelector('[data-slot="tree-children"]')).toBeTruthy();
  });

  it('publishes tree status summary through statusPath', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/tree-and-chart"
        schema={{
          type: 'page',
          body: [
            { type: 'tree', data: '${nodes}', statusPath: 'treeStatus' },
            {
              type: 'text',
              text: '${treeStatus?.kind}:${treeStatus?.nodeCount}:${treeStatus?.childrenKey}',
            },
          ],
        }}
        data={{ nodes: [{ id: 'root', label: 'Root', children: [] }] }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => expect(screen.getByText('tree:1:children')).toBeTruthy());
  });

  it('clears tree statusPath publication on unmount', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    const view = render(
      <SchemaRenderer
        schemaUrl="test://data/tree-and-chart-unmount"
        schema={{
          type: 'page',
          body: [{ type: 'tree', data: '${nodes}', statusPath: 'treeStatus' }],
        }}
        data={{ nodes: [{ id: 'root', label: 'Root', children: [] }], treeStatus: 'stale' }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(document.body.textContent).toContain('Root'));
    view.unmount();

    expect(document.body.textContent ?? '').not.toContain('stale');
  });

  it('registers chart handles with DOM refs and imperative methods', async () => {
    cleanup();
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
    cleanup();
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
    expect(chartRoot?.querySelector('[data-slot="chart-empty"]')?.textContent).toContain(
      'No chart data',
    );
    expect(chartRoot?.querySelector('[data-slot="chart-canvas"]')).toBeNull();
  });

  it('exposes repeated instancePath through nodeInstance for row child renderers', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([nodeInstanceProbeRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/tree-and-chart"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              columns: [{ label: 'Probe', cell: { type: 'node-instance-probe' } }],
              source: [{ id: 1, name: 'Alice' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect((await screen.findByTestId('node-instance-probe')).textContent ?? '').toMatch(
      /^\[\{"repeatedTemplateId":"table-row:/,
    );
  });

  it('collapses child nodes when the chevron trigger is clicked', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/tree-expand-collapse"
        schema={{
          type: 'page',
          body: [
            {
              type: 'tree',
              data: '${nodes}',
              initiallyExpanded: true,
            },
          ],
        }}
        data={{
          nodes: [
            {
              id: 'root',
              label: 'Root',
              children: [
                { id: 'child-a', label: 'Child A', children: [] },
                { id: 'child-b', label: 'Child B', children: [] },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Root')).toBeTruthy();
      expect(screen.getByText('Child A')).toBeTruthy();
      expect(screen.getByText('Child B')).toBeTruthy();
    });

    const rootTrigger = document.querySelector('[data-slot="tree-node"] [aria-label]');
    expect(rootTrigger).toBeTruthy();
    fireEvent.click(rootTrigger as Element);

    await waitFor(() => {
      expect(screen.queryByText('Child A')).toBeNull();
      expect(screen.queryByText('Child B')).toBeNull();
    });
  });

  it('expands child nodes when the collapsed chevron trigger is clicked', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/tree-expand-collapse-2"
        schema={{
          type: 'page',
          body: [
            {
              type: 'tree',
              data: '${nodes}',
              initiallyExpanded: false,
            },
          ],
        }}
        data={{
          nodes: [
            {
              id: 'root',
              label: 'Root',
              children: [{ id: 'child', label: 'Child', children: [] }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Root')).toBeTruthy();
    });

    expect(screen.queryByText('Child')).toBeNull();

    const expandTrigger = document.querySelector('[data-slot="tree-node"] [aria-label]');
    expect(expandTrigger).toBeTruthy();
    fireEvent.click(expandTrigger as Element);

    await waitFor(() => {
      expect(screen.getByText('Child')).toBeTruthy();
    });
  });

  it('toggles expand/collapse on node label click when expandOnClickNode is true', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/tree-expand-on-click"
        schema={{
          type: 'page',
          body: [
            {
              type: 'tree',
              data: '${nodes}',
              initiallyExpanded: true,
              expandOnClickNode: true,
            },
          ],
        }}
        data={{
          nodes: [
            {
              id: 'parent',
              label: 'Parent',
              children: [{ id: 'child', label: 'Child', children: [] }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Parent')).toBeTruthy();
      expect(screen.getByText('Child')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Parent'));

    await waitFor(() => {
      expect(screen.queryByText('Child')).toBeNull();
    });

    fireEvent.click(screen.getByText('Parent'));

    await waitFor(() => {
      expect(screen.getByText('Child')).toBeTruthy();
    });
  });

  it('publishes aria-expanded on the actual focus target in expandOnClickNode mode', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/tree-expand-on-click-a11y"
        schema={{
          type: 'page',
          body: [
            {
              type: 'tree',
              data: '${nodes}',
              initiallyExpanded: false,
              expandOnClickNode: true,
            },
          ],
        }}
        data={{
          nodes: [
            {
              id: 'parent',
              label: 'Parent',
              children: [{ id: 'child', label: 'Child', children: [] }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const parentNode = await screen.findByRole('treeitem', { name: 'Parent' });
    expect(parentNode.getAttribute('aria-expanded')).toBe('false');

    parentNode.focus();
    expect(document.activeElement).toBe(parentNode);

    fireEvent.keyDown(parentNode, { key: 'Enter' });

    await waitFor(() => {
      expect(parentNode.getAttribute('aria-expanded')).toBe('true');
      expect(screen.getByText('Child')).toBeTruthy();
    });
  });
});
