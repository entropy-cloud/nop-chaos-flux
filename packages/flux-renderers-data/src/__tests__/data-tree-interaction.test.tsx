import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

describe('dataRendererDefinitions tree interaction', () => {
  afterEach(() => {
    cleanup();
  });

  it('collapses child nodes when the chevron trigger is clicked', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/tree-expand-collapse"
        schema={{
          type: 'page',
          body: [{ type: 'tree', data: '${nodes}', initiallyExpanded: true }],
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
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/tree-expand-collapse-2"
        schema={{
          type: 'page',
          body: [{ type: 'tree', data: '${nodes}', initiallyExpanded: false }],
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

  it('toggles expand and collapse on node label click when expandOnClickNode is true', async () => {
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

  it('keeps default-mode tree keyboard entry on the treeitem instead of the chevron button', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/tree-default-a11y"
        schema={{
          type: 'page',
          body: [{ type: 'tree', data: '${nodes}', initiallyExpanded: false }],
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
    const trigger = document.querySelector('[data-slot="tree-node"] [aria-label]');
    expect(parentNode.getAttribute('tabindex')).toBe('0');
    expect(parentNode.className).toContain('focus-visible:ring-2');
    expect(parentNode.className).toContain('focus-visible:ring-ring');
    expect(trigger?.getAttribute('tabindex')).toBe('-1');

    parentNode.focus();
    expect(document.activeElement).toBe(parentNode);

    fireEvent.keyDown(parentNode, { key: 'ArrowRight' });

    await waitFor(() => {
      expect(parentNode.getAttribute('aria-expanded')).toBe('true');
      expect(screen.getByText('Child')).toBeTruthy();
    });
  });

  it('supports tree roving-focus navigation in expandOnClickNode mode', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/tree-expand-on-click-keyboard-nav"
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
              children: [
                { id: 'child-a', label: 'Child A', children: [] },
                { id: 'child-b', label: 'Child B', children: [] },
              ],
            },
            {
              id: 'sibling',
              label: 'Sibling',
              children: [],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const parentNode = await screen.findByRole('treeitem', { name: 'Parent' });
    const childA = await screen.findByRole('treeitem', { name: 'Child A' });
    const childB = await screen.findByRole('treeitem', { name: 'Child B' });
    const sibling = await screen.findByRole('treeitem', { name: 'Sibling' });

    parentNode.focus();
    expect(document.activeElement).toBe(parentNode);

    fireEvent.keyDown(parentNode, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(childA);

    fireEvent.keyDown(childA, { key: 'End' });
    expect(document.activeElement).toBe(sibling);

    fireEvent.keyDown(sibling, { key: 'Home' });
    expect(document.activeElement).toBe(parentNode);

    fireEvent.keyDown(parentNode, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(childA);

    fireEvent.keyDown(childA, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(childB);

    fireEvent.keyDown(childB, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(parentNode);
  });

  it('falls back the tabbable treeitem to the first root node when the active node disappears', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    const view = render(
      <SchemaRenderer
        schemaUrl="test://data/tree-active-node-fallback"
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

    const childNode = await screen.findByRole('treeitem', { name: 'Child' });
    childNode.focus();
    expect(document.activeElement).toBe(childNode);

    view.rerender(
      <SchemaRenderer
        schemaUrl="test://data/tree-active-node-fallback"
        schema={{
          type: 'page',
          body: [{ type: 'tree', data: '${nodes}', initiallyExpanded: true }],
        }}
        data={{
          nodes: [{ id: 'root', label: 'Root', children: [] }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      const rootNode = screen.getByRole('treeitem', { name: 'Root' });
      expect(rootNode.getAttribute('tabindex')).toBe('0');
      expect(screen.queryByRole('treeitem', { name: 'Child' })).toBeNull();
    });
  });
});
