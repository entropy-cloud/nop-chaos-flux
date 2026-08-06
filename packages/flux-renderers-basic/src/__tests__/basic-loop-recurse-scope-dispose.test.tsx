import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RendererRuntime } from '@nop-chaos/flux-core';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const LOOP_SCHEMA = {
  type: 'page',
  body: [
    {
      type: 'loop',
      items: '${users}',
      itemData: { label: '${item.name + ":" + index}' },
      body: [{ type: 'text', text: '${$slot.label}' }],
    },
  ],
} as never;

const RECURSE_SCHEMA = {
  type: 'page',
  body: [
    {
      type: 'loop',
      items: '${nodes}',
      body: [
        { type: 'text', text: '${$slot.childLabel ?? ""}' },
        {
          type: 'recurse',
          items: '${$slot.item.children}',
          itemData: { childLabel: '${item.name + ":" + index}' },
        },
      ],
    },
  ],
} as never;

// The evaluateItemData one-shot bindings scope carries ONLY the loop bindings
// (item/index/key). Region-render scopes additionally carry itemData keys and
// are runtime-owned by the region machinery, so they are out of scope here.
function isBindingsScopePatch(patch: Record<string, unknown>): boolean {
  const keys = Object.keys(patch);
  return keys.every((key) => key === 'item' || key === 'index' || key === 'key');
}

function installRuntimeSpies(holder: { runtime: RendererRuntime | null }) {
  expect(holder.runtime).not.toBeNull();
  const runtime = holder.runtime!;
  const created: Array<{ id: string; patch: Record<string, unknown> }> = [];
  const originalCreate = runtime.createChildScope.bind(runtime);
  const createSpy = vi
    .spyOn(runtime, 'createChildScope')
    .mockImplementation(((parent: never, patch: never, options: never) => {
      const scope = originalCreate(parent, patch, options);
      created.push({ id: scope.id, patch: patch as Record<string, unknown> });
      return scope;
    }) as never);
  const disposeSpy = vi.spyOn(runtime, 'disposeScope');
  return { runtime, created, createSpy, disposeSpy };
}

function assertBindingsScopesDisposed(
  created: Array<{ id: string; patch: Record<string, unknown> }>,
  disposeSpy: ReturnType<typeof vi.fn>,
) {
  const bindingsScopes = created.filter((entry) => isBindingsScopePatch(entry.patch));
  expect(bindingsScopes.length).toBeGreaterThan(0);
  const disposedIds = disposeSpy.mock.calls.map((call) => call[0]);
  for (const entry of bindingsScopes) {
    expect(disposedIds).toContain(entry.id);
  }
}

describe('loop/recurse itemData — one-shot bindings scope pairing (09-01)', () => {
  it('disposes every bindingsScope created for loop itemData evaluation', async () => {
    const holder: { runtime: RendererRuntime | null } = { runtime: null };
    const SchemaRenderer = createBasicSchemaRenderer([]);

    const view = render(
      <SchemaRenderer
        schemaUrl="test://basic/loop-dispose"
        schema={LOOP_SCHEMA}
        data={{ users: [{ name: 'Alice' }] }}
        env={env}
        formulaCompiler={formulaCompiler}
        onRuntimeChange={(runtime) => {
          holder.runtime = runtime as RendererRuntime;
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Alice:0')).toBeTruthy();
    });

    const { created, createSpy, disposeSpy } = installRuntimeSpies(holder);

    view.rerender(
      <SchemaRenderer
        schemaUrl="test://basic/loop-dispose"
        schema={LOOP_SCHEMA}
        data={{ users: [{ name: 'Bob' }, { name: 'Cindy' }] }}
        env={env}
        formulaCompiler={formulaCompiler}
        onRuntimeChange={(runtime) => {
          holder.runtime = runtime as RendererRuntime;
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Bob:0')).toBeTruthy();
      expect(screen.getByText('Cindy:1')).toBeTruthy();
    });

    expect(createSpy.mock.calls.length).toBeGreaterThan(0);
    assertBindingsScopesDisposed(created, disposeSpy);
  });

  it('disposes every bindingsScope created for recurse itemData evaluation', async () => {
    const holder: { runtime: RendererRuntime | null } = { runtime: null };
    const SchemaRenderer = createBasicSchemaRenderer([]);

    const view = render(
      <SchemaRenderer
        schemaUrl="test://basic/recurse-dispose"
        schema={RECURSE_SCHEMA}
        data={{
          nodes: [{ id: 'root', name: 'Root', children: [{ id: 'c1', name: 'Child1' }] }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onRuntimeChange={(runtime) => {
          holder.runtime = runtime as RendererRuntime;
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Child1:0')).toBeTruthy();
    });

    const { created, createSpy, disposeSpy } = installRuntimeSpies(holder);

    view.rerender(
      <SchemaRenderer
        schemaUrl="test://basic/recurse-dispose"
        schema={RECURSE_SCHEMA}
        data={{
          nodes: [
            {
              id: 'root',
              name: 'Root',
              children: [
                { id: 'c1', name: 'Child1' },
                { id: 'c2', name: 'Child2' },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onRuntimeChange={(runtime) => {
          holder.runtime = runtime as RendererRuntime;
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Child1:0')).toBeTruthy();
      expect(screen.getByText('Child2:1')).toBeTruthy();
    });

    expect(createSpy.mock.calls.length).toBeGreaterThan(0);
    assertBindingsScopesDisposed(created, disposeSpy);
  });
});
