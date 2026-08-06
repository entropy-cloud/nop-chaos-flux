import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { initFluxI18n, resetFluxI18n, t } from '@nop-chaos/flux-i18n';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { TreeRenderer } from '../tree-renderer.js';
import type { TreeSchema } from '../schemas.js';
import { createDataSchemaRenderer, env, formulaCompiler, iconRenderer } from '../test-support.js';

describe('dataRendererDefinitions tree rendering and status', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders visual tree nodes through the node region with inherited bindings', async () => {
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
    expect(treeRoot?.querySelector('[data-slot="tree-empty"]')?.textContent).toContain('No nodes yet');
  });

  it('adds an accessible name to the data tree root', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/tree-and-chart-a11y-name"
        schema={{
          type: 'page',
          body: [{ type: 'tree', title: 'Project tree', data: [{ id: '1', label: 'Node 1' }] }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('tree', { name: 'Project tree' })).toBeTruthy();
    });
  });

  it('falls back to flux.data.tree when no label/title/id provides the accessible name', () => {
    resetFluxI18n();
    initFluxI18n({ lng: 'zh-CN', fallbackLng: 'zh-CN' });
    try {
      const props = {
        props: { data: [], label: undefined, title: undefined },
        meta: { visible: true, className: '', testid: undefined, cid: undefined, disabled: false },
        id: '',
        node: { scope: {}, instancePath: undefined },
        helpers: {},
        events: {},
        regions: {},
      } as unknown as RendererComponentProps<TreeSchema>;
      const { container } = render(<TreeRenderer {...props} />);
      const tree = container.querySelector('[role="tree"]');
      expect(tree?.getAttribute('aria-label')).toBe(t('flux.data.tree'));
      expect(tree?.getAttribute('aria-label')).toBe('树');
      expect(tree?.getAttribute('aria-label')).not.toBe('Tree');
    } finally {
      resetFluxI18n();
      initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    }
  });

  it('publishes tree nodes through slot markers instead of internal nop region classes', async () => {
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
});
