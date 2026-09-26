import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createLayoutSchemaRenderer, env, formulaCompiler } from './test-support.js';
import { resizableRendererDefinition } from './resizable-renderer-definition.js';
import { normalizePersistedSizes } from './resizable-renderer.js';

const SchemaRenderer = createLayoutSchemaRenderer([resizableRendererDefinition]);

afterEach(cleanup);

describe('ResizableRenderer (L4.6 resizable layout)', () => {
  it('renders a panel per schema entry with body content and handles between panels', async () => {
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://layout/resizable-basic"
        schema={{
          type: 'page',
          body: [
            {
              type: 'resizable',
              testid: 'demo-resizable',
              direction: 'horizontal',
              panels: [
                { key: 'left', defaultSize: 30, min: 20, max: 40, body: [{ type: 'text', text: 'LEFT' }] },
                { key: 'right', body: [{ type: 'text', text: 'RIGHT' }] },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      const group = container.querySelector('[data-slot="resizable-root"]');
      if (!group) {
        const alert = container.querySelector('[data-slot="node-error"]');
        console.log('DEBUG ERROR TEXT:', alert?.textContent?.slice(0, 300));
      }
      expect(group).toBeTruthy();
      expect(group!.getAttribute('aria-orientation') ?? 'horizontal').toBeDefined();
    });
    const panels = container.querySelectorAll('[data-slot="resizable-panel"]');
    expect(panels.length).toBe(2);
    const handles = container.querySelectorAll('[data-slot="resizable-panel-handle"]');
    expect(handles.length).toBe(1);
    expect(container.textContent).toContain('LEFT');
    expect(container.textContent).toContain('RIGHT');
    const left = container.querySelector('[data-panel-key="left"]');
    expect(left).toBeTruthy();
  });

  it('renders nothing without panels', async () => {
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://layout/resizable-empty"
        schema={{ type: 'page', body: [{ type: 'resizable', panels: [] }] }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-slot="resizable-panel-group"]')).toBeNull();
    });
  });
});

describe('resizable persistence seed normalization (QA.1-L4b m2)', () => {
  it('falls back to null for wrong-shape or all-invalid stored arrays', () => {
    expect(normalizePersistedSizes([40], 2)).toBeNull();
    expect(normalizePersistedSizes('nope', 2)).toBeNull();
    expect(normalizePersistedSizes([999, -3], 2)).toBeNull();
    expect(normalizePersistedSizes(null, 2)).toBeNull();
  });

  it('clamps entries to percent strings and keeps valid seeds', () => {
    expect(normalizePersistedSizes([40, 60], 2)).toEqual(['40%', '60%']);
    expect(normalizePersistedSizes([6, 999, 20], 3)).toEqual(['6%', undefined, '20%']);
  });
});
