import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

describe('tree display UX enhancements (E3: search/icon/guide-line)', () => {
  afterEach(() => {
    cleanup();
  });

  const searchTreeData = [
    {
      id: 'root',
      label: 'Root',
      icon: 'home',
      children: [
        {
          id: 'child-a',
          label: 'Alpha',
          icon: 'folder',
          children: [
            { id: 'leaf-a1', label: 'Alpha Leaf', icon: 'file', children: [] },
          ],
        },
        {
          id: 'child-b',
          label: 'Beta',
          icon: 'folder',
          children: [
            { id: 'leaf-b1', label: 'Beta Leaf', icon: 'file', children: [] },
          ],
        },
      ],
    },
  ];

  describe('searchable (search/filter + auto-expand + highlight)', () => {
    it('renders a search input when searchable is true', async () => {
      const SchemaRenderer = createDataSchemaRenderer();
      render(
        <SchemaRenderer
          schemaUrl="test://data/tree-search-input"
          schema={{
            type: 'page',
            body: [{ type: 'tree', data: '${nodes}', searchable: true }],
          }}
          data={{ nodes: searchTreeData }}
          env={env}
          formulaCompiler={formulaCompiler}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Root')).toBeTruthy();
      });

      const searchInput = document.querySelector('[data-slot="tree-search-input"]');
      expect(searchInput).toBeTruthy();
    });

    it('does not render a search input when searchable is absent (no regression)', async () => {
      const SchemaRenderer = createDataSchemaRenderer();
      render(
        <SchemaRenderer
          schemaUrl="test://data/tree-search-absent"
          schema={{
            type: 'page',
            body: [{ type: 'tree', data: '${nodes}' }],
          }}
          data={{ nodes: searchTreeData }}
          env={env}
          formulaCompiler={formulaCompiler}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Root')).toBeTruthy();
      });

      expect(document.querySelector('[data-slot="tree-search-input"]')).toBeNull();
    });

    it('filters to matching nodes, auto-expands ancestor chain, and hides non-matching branches', async () => {
      const SchemaRenderer = createDataSchemaRenderer();
      render(
        <SchemaRenderer
          schemaUrl="test://data/tree-search-deep"
          schema={{
            type: 'page',
            body: [
              {
                type: 'tree',
                data: '${nodes}',
                searchable: true,
                initiallyExpanded: false,
              },
            ],
          }}
          data={{ nodes: searchTreeData }}
          env={env}
          formulaCompiler={formulaCompiler}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Root')).toBeTruthy();
      });

      // Initially collapsed — deep leaf not visible.
      expect(screen.queryByText('Alpha Leaf')).toBeNull();
      expect(screen.queryByText('Beta Leaf')).toBeNull();

      const searchInput = document.querySelector(
        '[data-slot="tree-search-input"]',
      ) as HTMLInputElement;
      expect(searchInput).toBeTruthy();

      // Deep match: only the Alpha branch should match "Alpha Leaf".
      fireEvent.change(searchInput, { target: { value: 'Alpha Leaf' } });

      await waitFor(() => {
        expect(screen.getByText('Alpha Leaf')).toBeTruthy();
      });

      // Ancestor chain auto-expanded (Root, Alpha visible).
      expect(screen.getByText('Root')).toBeTruthy();
      expect(screen.getByText('Alpha')).toBeTruthy();

      // Non-matching branch hidden (Beta + Beta Leaf filtered out).
      expect(screen.queryByText('Beta')).toBeNull();
      expect(screen.queryByText('Beta Leaf')).toBeNull();
    });

    it('highlights the matched substring inside matching node labels', async () => {
      const SchemaRenderer = createDataSchemaRenderer();
      render(
        <SchemaRenderer
          schemaUrl="test://data/tree-search-highlight"
          schema={{
            type: 'page',
            body: [
              {
                type: 'tree',
                data: '${nodes}',
                searchable: true,
                initiallyExpanded: false,
              },
            ],
          }}
          data={{ nodes: searchTreeData }}
          env={env}
          formulaCompiler={formulaCompiler}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Root')).toBeTruthy();
      });

      const searchInput = document.querySelector(
        '[data-slot="tree-search-input"]',
      ) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: 'Leaf' } });

      // Both leaves match "Leaf" → both branches auto-expanded, both highlighted.
      await waitFor(() => {
        const highlights = document.querySelectorAll('[data-slot="tree-search-highlight"]');
        expect(highlights.length).toBeGreaterThanOrEqual(2);
      });

      const highlights = document.querySelectorAll('[data-slot="tree-search-highlight"]');
      Array.from(highlights).forEach((node) => {
        expect(node.textContent?.toLowerCase()).toContain('leaf');
      });

      // Both matching leaves remain in the DOM (ancestor chain auto-expanded).
      expect(document.querySelectorAll('[data-node-key="leaf-a1"]').length).toBe(1);
      expect(document.querySelectorAll('[data-node-key="leaf-b1"]').length).toBe(1);
    });

    it('shows the empty hint when the query matches nothing (search-no-match)', async () => {
      const SchemaRenderer = createDataSchemaRenderer();
      render(
        <SchemaRenderer
          schemaUrl="test://data/tree-search-no-match"
          schema={{
            type: 'page',
            body: [
              {
                type: 'tree',
                data: '${nodes}',
                searchable: true,
                empty: { type: 'text', text: 'No match found' },
              },
            ],
          }}
          data={{ nodes: searchTreeData }}
          env={env}
          formulaCompiler={formulaCompiler}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Root')).toBeTruthy();
      });

      const searchInput = document.querySelector(
        '[data-slot="tree-search-input"]',
      ) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: 'zzz-no-such-node' } });

      await waitFor(() => {
        expect(screen.getByText('No match found')).toBeTruthy();
      });

      // No tree node labels rendered.
      expect(screen.queryByText('Root')).toBeNull();
      expect(screen.queryByText('Alpha')).toBeNull();
    });

    it('clears the search and restores the pre-search expand/collapse snapshot (search-clear)', async () => {
      const SchemaRenderer = createDataSchemaRenderer();
      render(
        <SchemaRenderer
          schemaUrl="test://data/tree-search-clear"
          schema={{
            type: 'page',
            body: [
              {
                type: 'tree',
                data: '${nodes}',
                searchable: true,
                initiallyExpanded: true,
              },
            ],
          }}
          data={{ nodes: searchTreeData }}
          env={env}
          formulaCompiler={formulaCompiler}
        />,
      );

      // Pre-search snapshot: initiallyExpanded → leaves visible.
      await waitFor(() => {
        expect(screen.getByText('Alpha Leaf')).toBeTruthy();
        expect(screen.getByText('Beta Leaf')).toBeTruthy();
      });

      const searchInput = document.querySelector(
        '[data-slot="tree-search-input"]',
      ) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: 'Alpha Leaf' } });

      // During search: only Alpha branch.
      await waitFor(() => {
        expect(screen.queryByText('Beta Leaf')).toBeNull();
      });

      // Clear the search → snapshot restored, both leaves visible again.
      fireEvent.change(searchInput, { target: { value: '' } });

      await waitFor(() => {
        expect(screen.getByText('Alpha Leaf')).toBeTruthy();
        expect(screen.getByText('Beta Leaf')).toBeTruthy();
      });
    });
  });

  describe('showIcon / iconField (node icons)', () => {
    it('renders a per-node icon from iconField when showIcon is true', async () => {
      const SchemaRenderer = createDataSchemaRenderer();
      render(
        <SchemaRenderer
          schemaUrl="test://data/tree-icon-render"
          schema={{
            type: 'page',
            body: [
              {
                type: 'tree',
                data: '${nodes}',
                showIcon: true,
                iconField: 'icon',
                initiallyExpanded: true,
              },
            ],
          }}
          data={{ nodes: searchTreeData }}
          env={env}
          formulaCompiler={formulaCompiler}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Root')).toBeTruthy();
      });

      const icons = document.querySelectorAll('[data-slot="tree-node-icon"]');
      expect(icons.length).toBeGreaterThanOrEqual(1);
    });

    it('does not render an icon for nodes missing the iconField (iconfield-missing)', async () => {
      const mixedData = [
        {
          id: 'root',
          label: 'Root',
          icon: 'home',
          children: [
            { id: 'no-icon', label: 'No Icon Node', children: [] },
            { id: 'with-icon', label: 'With Icon Node', icon: 'file', children: [] },
          ],
        },
      ];
      const SchemaRenderer = createDataSchemaRenderer();
      render(
        <SchemaRenderer
          schemaUrl="test://data/tree-icon-missing"
          schema={{
            type: 'page',
            body: [
              {
                type: 'tree',
                data: '${nodes}',
                showIcon: true,
                iconField: 'icon',
                initiallyExpanded: true,
              },
            ],
          }}
          data={{ nodes: mixedData }}
          env={env}
          formulaCompiler={formulaCompiler}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Root')).toBeTruthy();
        expect(screen.getByText('No Icon Node')).toBeTruthy();
        expect(screen.getByText('With Icon Node')).toBeTruthy();
      });

      // Each tree-node row carries its own icon slot only when the field resolves.
      const noIconNode = document
        .querySelector('[data-node-key="no-icon"]')
        ?.querySelector('[data-slot="tree-node-icon"]');
      const withIconNode = document
        .querySelector('[data-node-key="with-icon"]')
        ?.querySelector('[data-slot="tree-node-icon"]');

      expect(noIconNode).toBeNull();
      expect(withIconNode).toBeTruthy();
    });

    it('does not render icons when showIcon is absent (no regression, only chevron)', async () => {
      const SchemaRenderer = createDataSchemaRenderer();
      render(
        <SchemaRenderer
          schemaUrl="test://data/tree-icon-absent"
          schema={{
            type: 'page',
            body: [{ type: 'tree', data: '${nodes}', initiallyExpanded: true }],
          }}
          data={{ nodes: searchTreeData }}
          env={env}
          formulaCompiler={formulaCompiler}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Root')).toBeTruthy();
      });

      expect(document.querySelector('[data-slot="tree-node-icon"]')).toBeNull();
    });
  });

  describe('showGuideLine (indentation guide-line)', () => {
    it('renders guide-line markers that scale with depth when showGuideLine is true', async () => {
      const SchemaRenderer = createDataSchemaRenderer();
      render(
        <SchemaRenderer
          schemaUrl="test://data/tree-guide-line"
          schema={{
            type: 'page',
            body: [
              {
                type: 'tree',
                data: '${nodes}',
                showGuideLine: true,
                initiallyExpanded: true,
              },
            ],
          }}
          data={{ nodes: searchTreeData }}
          env={env}
          formulaCompiler={formulaCompiler}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Alpha Leaf')).toBeTruthy();
      });

      const depth1Guides = document
        .querySelector('[data-slot="tree-node-row"][data-tree-node-id="root/child-a"]')
        ?.querySelectorAll('[data-slot="tree-guide-line"]');
      const depth2Guides = document
        .querySelector('[data-slot="tree-node-row"][data-tree-node-id="root/child-a/leaf-a1"]')
        ?.querySelectorAll('[data-slot="tree-guide-line"]');

      expect(depth1Guides?.length).toBe(1);
      expect(depth2Guides?.length).toBe(2);
    });

    it('does not render guide-line markers when showGuideLine is absent (no regression)', async () => {
      const SchemaRenderer = createDataSchemaRenderer();
      render(
        <SchemaRenderer
          schemaUrl="test://data/tree-guide-line-absent"
          schema={{
            type: 'page',
            body: [{ type: 'tree', data: '${nodes}', initiallyExpanded: true }],
          }}
          data={{ nodes: searchTreeData }}
          env={env}
          formulaCompiler={formulaCompiler}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Alpha Leaf')).toBeTruthy();
      });

      expect(document.querySelectorAll('[data-slot="tree-guide-line"]').length).toBe(0);
    });
  });
});
