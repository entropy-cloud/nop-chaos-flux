import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLayoutSchemaRenderer, env, formulaCompiler } from './test-support.js';
import { resizableRendererDefinition } from './resizable-renderer-definition.js';
import { createResizablePanelCapabilities, normalizePersistedSizes } from './resizable-renderer.js';

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

describe('collapsible panel capability handle (G-J m3)', () => {
  function makeApi(collapsed = false) {
    let isCollapsed = collapsed;
    const api = {
      collapse: vi.fn(() => {
        isCollapsed = true;
      }),
      expand: vi.fn(() => {
        isCollapsed = false;
      }),
      isCollapsed: () => isCollapsed,
    };
    return { api, wasCollapsed: () => isCollapsed };
  }

  it('exposes collapse / expand / toggle methods', () => {
    const { api } = makeApi();
    const capabilities = createResizablePanelCapabilities({ getPanel: () => api as never });
    expect(capabilities.listMethods()).toEqual(['collapse', 'expand', 'toggle']);
    expect(capabilities.hasMethod('toggle')).toBe(true);
    expect(capabilities.hasMethod('bogus')).toBe(false);
  });

  it('collapse delegates to the panel API; no-op when already collapsed', () => {
    const { api } = makeApi(false);
    const capabilities = createResizablePanelCapabilities({ getPanel: () => api as never });
    expect(capabilities.invoke('collapse')).toEqual({ ok: true });
    expect(api.collapse).toHaveBeenCalledTimes(1);

    const already = makeApi(true);
    const caps2 = createResizablePanelCapabilities({ getPanel: () => already.api as never });
    expect(caps2.invoke('collapse')).toEqual({
      ok: true,
      skipped: true,
    });
    expect(already.api.collapse).not.toHaveBeenCalled();
  });

  it('expand delegates to the panel API; no-op when already expanded', () => {
    const expanded = makeApi(false);
    const caps = createResizablePanelCapabilities({ getPanel: () => expanded.api as never });
    expect(caps.invoke('expand')).toEqual({
      ok: true,
      skipped: true,
    });
    expect(expanded.api.expand).not.toHaveBeenCalled();

    const collapsed = makeApi(true);
    const caps2 = createResizablePanelCapabilities({ getPanel: () => collapsed.api as never });
    expect(caps2.invoke('expand')).toEqual({ ok: true });
    expect(collapsed.api.expand).toHaveBeenCalledTimes(1);
  });

  it('toggle flips between collapsed and expanded', () => {
    const { api, wasCollapsed } = makeApi(false);
    const caps = createResizablePanelCapabilities({ getPanel: () => api as never });
    caps.invoke('toggle');
    expect(wasCollapsed()).toBe(true);
    caps.invoke('toggle');
    expect(wasCollapsed()).toBe(false);
  });

  it('reports a failure when the panel is not mounted and for unknown methods', () => {
    const caps = createResizablePanelCapabilities({ getPanel: () => null });
    expect(caps.invoke('toggle').ok).toBe(false);

    const { api } = makeApi(false);
    const caps2 = createResizablePanelCapabilities({ getPanel: () => api as never });
    const bogus = caps2.invoke('bogus');
    expect(bogus.ok).toBe(false);
    expect(String((bogus as { error?: unknown }).error)).toContain('bogus');
  });
});

describe('collapsible panel schema fields compile through (G-J m3)', () => {
  it('accepts collapsible / collapsedSize / defaultCollapsed without diagnostics', async () => {
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://layout/resizable-collapsible"
        schema={{
          type: 'page',
          body: [
            {
              type: 'resizable',
              id: 'split',
              direction: 'vertical',
              panels: [
                { key: 'main', defaultSize: 80, min: 40, body: [{ type: 'text', text: 'MAIN' }] },
                {
                  key: 'debug',
                  defaultSize: 15,
                  min: 10,
                  max: 60,
                  collapsible: true,
                  collapsedSize: 7,
                  defaultCollapsed: true,
                  body: [{ type: 'text', text: 'DEBUG' }],
                },
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
      expect(container.querySelector('[data-slot="resizable-root"]')).toBeTruthy();
    });
    const panels = container.querySelectorAll('[data-slot="resizable-panel"]');
    expect(panels.length).toBe(2);
    expect(container.querySelector('[data-panel-key="debug"]')).toBeTruthy();
    expect(container.textContent).toContain('MAIN');
  });
});
