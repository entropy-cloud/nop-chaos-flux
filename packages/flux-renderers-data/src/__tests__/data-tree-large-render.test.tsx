import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

describe('dataRendererDefinitions large tree rendering', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('bounds the initial expanded subtree render for large child lists', () => {
    vi.useFakeTimers();
    const SchemaRenderer = createDataSchemaRenderer();
    const children = Array.from({ length: 120 }, (_, index) => ({
      id: `child-${index + 1}`,
      label: `Child ${index + 1}`,
      children: [],
    }));

    render(
      <SchemaRenderer
        schemaUrl="test://data/tree-large-expanded-bounded"
        schema={{
          type: 'page',
          body: [{ type: 'tree', data: '${nodes}', initiallyExpanded: true }],
        }}
        data={{
          nodes: [{ id: 'root', label: 'Root', children }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.getByText('Root')).toBeTruthy();
    expect(screen.getByText('Child 1')).toBeTruthy();
    expect(screen.getByText('Child 50')).toBeTruthy();
    expect(screen.queryByText('Child 120')).toBeNull();
    expect(document.querySelector('[data-slot="tree-children-more"]')).toBeTruthy();
  });

  it('eventually renders the full expanded subtree after the deferred fill completes', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    const children = Array.from({ length: 120 }, (_, index) => ({
      id: `child-${index + 1}`,
      label: `Child ${index + 1}`,
      children: [],
    }));

    render(
      <SchemaRenderer
        schemaUrl="test://data/tree-large-expanded-complete"
        schema={{
          type: 'page',
          body: [{ type: 'tree', data: '${nodes}', initiallyExpanded: true }],
        }}
        data={{
          nodes: [{ id: 'root', label: 'Root', children }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.getByText('Child 50')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('Child 120')).toBeTruthy();
      expect(document.querySelector('[data-slot="tree-children-more"]')).toBeNull();
    }, { timeout: 3000 });
  });
});
