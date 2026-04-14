import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createDataSchemaRenderer, env, formulaCompiler, iconRenderer, nodeInstanceProbeRenderer } from '../test-support';

vi.mock('echarts/core', async () => {
  const chartInstance = {
    setOption: vi.fn(),
    resize: vi.fn(),
    getDataURL: vi.fn(() => 'data:image/png;base64,mock'),
    dispose: vi.fn(),
    showLoading: vi.fn(),
    hideLoading: vi.fn()
  };

  return {
    use: vi.fn(),
    init: vi.fn(() => chartInstance)
  };
});

describe('dataRendererDefinitions tree and chart behavior', () => {
  it('renders visual tree nodes through the node region with inherited bindings', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([iconRenderer]);
    render(<SchemaRenderer schema={{ type: 'page', body: [{ type: 'tree', data: '${nodes}', initiallyExpanded: true, node: [{ type: 'icon', icon: '${$slot.depth}' }, { type: 'text', text: '${$slot.node.label}:${$slot.depth}:${$slot.parentNode ? $slot.parentNode.label : "root"}' }] }] }} data={{ nodes: [{ id: 'root', label: 'Root', children: [{ id: 'child', label: 'Child', children: [] }] }] }} env={env} formulaCompiler={formulaCompiler} />);
    await waitFor(() => {
      expect(screen.getByText('Root:0:root')).toBeTruthy();
      expect(screen.getByText('Child:1:Root')).toBeTruthy();
    });
  });

  it('renders tree empty content when data is empty', () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(<SchemaRenderer schema={{ type: 'page', body: [{ type: 'tree', data: '${nodes}', empty: { type: 'text', text: 'No nodes yet' } }] }} data={{ nodes: [] }} env={env} formulaCompiler={formulaCompiler} />);
    expect(screen.getByText('No nodes yet')).toBeTruthy();
    const treeRoot = document.querySelector('.nop-tree');
    expect(treeRoot?.querySelector('[data-slot="tree-empty"]')?.textContent).toContain('No nodes yet');
  });

  it('publishes tree nodes through slot markers instead of internal nop region classes', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(<SchemaRenderer schema={{ type: 'page', body: [{ type: 'tree', data: '${nodes}', initiallyExpanded: true }] }} data={{ nodes: [{ id: 'root', label: 'Root', children: [{ id: 'child', label: 'Child', children: [] }] }] }} env={env} formulaCompiler={formulaCompiler} />);
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
    render(<SchemaRenderer schema={{ type: 'page', body: [{ type: 'tree', data: '${nodes}', statusPath: 'treeStatus' }, { type: 'text', text: '${treeStatus?.kind}:${treeStatus?.nodeCount}:${treeStatus?.childrenKey}' }] }} data={{ nodes: [{ id: 'root', label: 'Root', children: [] }] }} env={env} formulaCompiler={formulaCompiler} />);
    await waitFor(() => expect(screen.getByText('tree:1:children')).toBeTruthy());
  });

  it('registers chart handles with DOM refs and imperative methods', async () => {
    cleanup();
    const registrySnapshots: any[] = [];
    const SchemaRenderer = createDataSchemaRenderer();
    render(<SchemaRenderer schema={{ type: 'page', body: [{ type: 'chart', componentId: 'sales-chart', chartType: 'pie', source: [{ label: 'Jan', value: 12 }], series: [{ name: 'Revenue', dataRegionKey: 'value' }] }] }} env={env} formulaCompiler={formulaCompiler} onComponentRegistryChange={(registry) => registry && registrySnapshots.push(registry)} />);
    await waitFor(() => {
      const registry = registrySnapshots.at(-1);
      const handle = registry?.resolve({ componentId: 'sales-chart' });
      expect(handle?.type).toBe('chart');
      expect(handle?.ref).toBeTruthy();
      expect(handle?.capabilities.hasMethod?.('resize')).toBe(true);
      expect(handle?.capabilities.hasMethod?.('setOption')).toBe(true);
      expect(handle?.capabilities.hasMethod?.('getDataURL')).toBe(true);
    });
  });

  it('exposes repeated instancePath through nodeInstance for row child renderers', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([nodeInstanceProbeRenderer]);
    render(<SchemaRenderer schema={{ type: 'page', body: [{ type: 'table', columns: [{ label: 'Probe', cell: { type: 'node-instance-probe' } }], source: [{ id: 1, name: 'Alice' }] }] }} env={env} formulaCompiler={formulaCompiler} />);
    expect((await screen.findByTestId('node-instance-probe')).textContent ?? '').toMatch(/^\[\{"repeatedTemplateId":"table-row:/);
  });
});
