import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ApiRequestContext, RendererEnv } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { allFormDefs } from './form-tree-checkbox-fields.shared.js';
import { env as defaultEnv } from '../test-support.js';

void defaultEnv;

function makeLazyChildrenEnv(
  respond: (expandedNodeValue: unknown) => unknown[],
): { env: RendererEnv; calls: Array<{ expandedNodeValue: unknown }> } {
  const calls: Array<{ expandedNodeValue: unknown }> = [];
  const env: RendererEnv = {
    fetcher: async function <T>(_api: unknown, ctx: ApiRequestContext) {
      const scopeData = ctx.scope.readVisible() as { expandedNodeValue?: unknown };
      const parentValue = scopeData?.expandedNodeValue;
      calls.push({ expandedNodeValue: parentValue });
      return { ok: true, status: 200, data: respond(parentValue) as T };
    },
    notify: () => undefined,
  };
  return { env, calls };
}

function renderTree(
  schemaBody: Record<string, unknown>[],
  env: RendererEnv,
  suffix = 'a',
) {
  cleanup();
  const SchemaRenderer = createSchemaRenderer([...allFormDefs]);
  return render(
    <SchemaRenderer
      schemaUrl={`test://flux-renderers-form-advanced/__tests__/tree-lazy-children.test.tsx#${suffix}`}
      schema={{ type: 'form', body: schemaBody } as any}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

describe('tree controls - async lazy loading (E2d childrenSource)', () => {
  it('loads children on expand of a deferChildren node and merges into option tree', async () => {
    const { env, calls } = makeLazyChildrenEnv((parentValue) => {
      if (parentValue === 'parent-a') {
        return [
          { label: 'Child A1', value: 'child-a1' },
          { label: 'Child A2', value: 'child-a2' },
        ];
      }
      return [];
    });

    renderTree(
      [
        {
          type: 'input-tree',
          name: 'tree',
          label: 'Tree',
          treeMode: 'checkbox',
          childrenSource: {
            action: 'ajax',
            args: { url: '/api/children', method: 'get' },
          },
          options: [
            { label: 'Parent A', value: 'parent-a', deferChildren: true },
            { label: 'Static B', value: 'static-b' },
          ],
        },
      ],
      env,
      'lazy-expand',
    );

    expect(screen.getByRole('treeitem', { name: 'Parent A' })).toBeTruthy();
    expect(screen.getByRole('treeitem', { name: 'Static B' })).toBeTruthy();

    const expandBtn = screen.getAllByLabelText('Expand')[0];
    fireEvent.click(expandBtn);

    await waitFor(() => {
      expect(screen.getByRole('treeitem', { name: 'Child A1' })).toBeTruthy();
      expect(screen.getByRole('treeitem', { name: 'Child A2' })).toBeTruthy();
    });

    expect(calls.length).toBeGreaterThanOrEqual(1);
    expect(calls.some((c) => c.expandedNodeValue === 'parent-a')).toBe(true);
  });

  it('shows inline error + retry when childrenSource fails, keeps existing field value', async () => {
    const failingEnv: RendererEnv = {
      fetcher: async () => ({ ok: false, status: 500, data: null as never }),
      notify: () => undefined,
    };

    renderTree(
      [
        {
          type: 'input-tree',
          name: 'tree',
          label: 'Tree',
          treeMode: 'checkbox',
          childrenSource: {
            action: 'ajax',
            args: { url: '/api/children', method: 'get' },
          },
          options: [
            { label: 'Parent A', value: 'parent-a', deferChildren: true },
          ],
        },
      ],
      failingEnv,
      'lazy-error',
    );

    const expandBtn = screen.getAllByLabelText('Expand')[0];
    fireEvent.click(expandBtn);

    await waitFor(() => {
      const errorEl = document.querySelector('[data-slot="tree-option-lazy-error"]');
      expect(errorEl).toBeTruthy();
    });

    const retryBtn = document.querySelector(
      '[data-slot="tree-option-lazy-retry"]',
    ) as HTMLButtonElement | null;
    expect(retryBtn).toBeTruthy();

    expect(screen.getByRole('treeitem', { name: /Parent A/ })).toBeTruthy();
  });

  it('supports retry after error', async () => {
    let shouldFail = true;
    const env: RendererEnv = {
      fetcher: async function <T>() {
        if (shouldFail) {
          return { ok: false, status: 500, data: null as never };
        }
        return { ok: true, status: 200, data: [{ label: 'Loaded Child', value: 'loaded' }] as T };
      },
      notify: () => undefined,
    };

    renderTree(
      [
        {
          type: 'input-tree',
          name: 'tree',
          label: 'Tree',
          treeMode: 'checkbox',
          childrenSource: {
            action: 'ajax',
            args: { url: '/api/children', method: 'get' },
          },
          options: [
            { label: 'Parent A', value: 'parent-a', deferChildren: true },
          ],
        },
      ],
      env,
      'lazy-retry',
    );

    const expandBtn = screen.getAllByLabelText('Expand')[0];
    fireEvent.click(expandBtn);

    await waitFor(() => {
      expect(document.querySelector('[data-slot="tree-option-lazy-error"]')).toBeTruthy();
    });

    shouldFail = false;
    const retryBtn = document.querySelector(
      '[data-slot="tree-option-lazy-retry"]',
    ) as HTMLButtonElement;
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByRole('treeitem', { name: 'Loaded Child' })).toBeTruthy();
    });
  });

  it('recalculates cascade indeterminate after lazy children arrive', async () => {
    const { env } = makeLazyChildrenEnv(() => [
      { label: 'Leaf One', value: 'leaf-1' },
      { label: 'Leaf Two', value: 'leaf-2' },
    ]);

    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs]);
    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/tree-lazy-children.test.tsx#lazy-cascade"
        schema={
          {
            type: 'form',
            data: { tree: ['leaf-1'] },
            body: [
              {
                type: 'input-tree',
                name: 'tree',
                label: 'Tree',
                treeMode: 'checkbox',
                cascade: true,
                childrenSource: {
                  action: 'ajax',
                  args: { url: '/api/children', method: 'get' },
                },
                options: [
                  { label: 'Root', value: 'root', deferChildren: true },
                ],
              },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const expandBtn = screen.getAllByLabelText('Expand')[0];
    fireEvent.click(expandBtn);

    await waitFor(() => {
      expect(screen.getByRole('treeitem', { name: 'Leaf One' })).toBeTruthy();
    });

    const rootCheckbox = screen
      .getByRole('treeitem', { name: /Root/ })
      .querySelector('[role="checkbox"]') as HTMLElement;
    await waitFor(() => {
      expect(rootCheckbox.getAttribute('aria-checked')).toBe('mixed');
    });
  });

  it('TR4: an initial value referencing a deferred child resolves to checked once children load', async () => {
    const { env } = makeLazyChildrenEnv(() => [
      { label: 'Leaf One', value: 'leaf-1' },
      { label: 'Leaf Two', value: 'leaf-2' },
    ]);

    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs]);
    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/tree-lazy-children.test.tsx#lazy-echo"
        schema={
          {
            type: 'form',
            // Initial value references a deferred (not-yet-loaded) child.
            data: { tree: ['leaf-1'] },
            body: [
              {
                type: 'input-tree',
                name: 'tree',
                label: 'Tree',
                treeMode: 'checkbox',
                childrenSource: {
                  action: 'ajax',
                  args: { url: '/api/children', method: 'get' },
                },
                options: [{ label: 'Root', value: 'root', deferChildren: true }],
              },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    // Expand the deferred root so its children load.
    fireEvent.click(screen.getAllByLabelText('Expand')[0]!);

    // After children arrive, the deferred child referenced by the initial value
    // must render as checked (echo resolves deterministically via re-render).
    await waitFor(() => {
      expect(screen.getByRole('treeitem', { name: 'Leaf One' })).toBeTruthy();
    });
    const leafCheckbox = screen
      .getByRole('treeitem', { name: 'Leaf One' })
      .querySelector('[role="checkbox"]') as HTMLElement;
    await waitFor(() => {
      expect(leafCheckbox.getAttribute('aria-checked')).toBe('true');
    });
  });

  it('degrades to no children and warns when deferChildren set but no childrenSource declared', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    renderTree(
      [
        {
          type: 'input-tree',
          name: 'tree',
          label: 'Tree',
          treeMode: 'checkbox',
          options: [
            { label: 'Lonely', value: 'lonely', deferChildren: true },
          ],
        },
      ],
      makeLazyChildrenEnv(() => []).env,
      'lazy-source-undefined',
    );

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('deferChildren=true but no childrenSource'),
    );

    const lonelyItem = screen.getByRole('treeitem', { name: 'Lonely' });
    expect(lonelyItem.getAttribute('aria-expanded')).toBe('false');

    expect(document.querySelector('[data-slot="tree-option-group"]')).toBeNull();

    warnSpy.mockRestore();
  });

  it('loads children on expand inside a tree-select popover (childrenSource)', async () => {
    const { env, calls } = makeLazyChildrenEnv((parentValue) => {
      if (parentValue === 'parent-a') {
        return [
          { label: 'Child A1', value: 'child-a1' },
          { label: 'Child A2', value: 'child-a2' },
        ];
      }
      return [];
    });

    renderTree(
      [
        {
          type: 'tree-select',
          name: 'tree',
          label: 'Tree',
          treeMode: 'checkbox',
          childrenSource: {
            action: 'ajax',
            args: { url: '/api/children', method: 'get' },
          },
          options: [
            { label: 'Parent A', value: 'parent-a', deferChildren: true },
            { label: 'Static B', value: 'static-b' },
          ],
        },
      ],
      env,
      'lazy-tree-select',
    );

    fireEvent.click(screen.getByRole('button', { name: /Tree/ }));

    await waitFor(() => {
      expect(screen.getByRole('treeitem', { name: 'Parent A' })).toBeTruthy();
      expect(screen.getByRole('treeitem', { name: 'Static B' })).toBeTruthy();
    });

    const expandBtn = screen.getAllByLabelText('Expand')[0];
    fireEvent.click(expandBtn);

    await waitFor(() => {
      expect(screen.getByRole('treeitem', { name: 'Child A1' })).toBeTruthy();
      expect(screen.getByRole('treeitem', { name: 'Child A2' })).toBeTruthy();
    });

    expect(calls.some((c) => c.expandedNodeValue === 'parent-a')).toBe(true);
  });
});
