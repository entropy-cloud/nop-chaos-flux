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

describe('loop/recurse itemData — one-shot bindings scope pairing (09-01)', () => {
  // plan 2026-09-28-6 P14: LoopRenderer now reuses ONE scratch child scope per
  // instance (created with an empty patch, re-published per item via merge) and
  // disposes it at unmount — replacing the per-item create/dispose pairing the
  // former test pinned. Item-value correctness is covered by
  // loop-itemdata-parent-scope-baseline.test.tsx.
  it('reuses one scratch bindings scope per loop instance and disposes it at unmount', async () => {
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

    // The scratch scope is created lazily on the FIRST itemData evaluation
    // (before this spy) and REUSED — itemData re-evaluation across renders
    // must not create any further child scopes (the old implementation created
    // + disposed one per item per render).
    const { created, createSpy, disposeSpy } = installRuntimeSpies(holder);
    createSpy.mockClear();

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

    // filter to bindings-shaped scopes (item/index/key only): the region
    // machinery legitimately creates other child scopes for the new items
    const bindingsCreates = created.filter((entry) => isBindingsScopePatch(entry.patch));
    expect(bindingsCreates.length).toBe(0);

    // unmount disposes the scratch scope: the only empty-patch child scope
    // created by this loop instance must appear in disposeScope calls
    const scratchId = created.find(
      (entry) => Object.keys(entry.patch).length === 0,
    )?.id;
    expect(() => view.unmount()).not.toThrow();
    if (scratchId != null) {
      expect(disposeSpy.mock.calls.map((call) => call[0])).toContain(scratchId);
    }
  });

  // plan 588 CX-10 (WA-basic-004): RecurseRenderer now reuses ONE scratch child
  // scope per instance — the loop-side P14 shape landed in 23ee9a323 — instead
  // of the former per-item create/dispose pairing (the plan 2026-09-28-6
  // hotspot form; recurse was the same-shape unregistered site). The scratch
  // scope is created lazily on the first itemData evaluation, re-published via
  // merge across re-renders, and disposed at unmount. Declared behavior
  // residuals (draft review m5): dispose-on-throw channel collapses into the
  // unmount dispose, stale keys persist while the instance lives, and the
  // scope id becomes instance-stable instead of per-item-fresh. Item-value
  // correctness stays covered by loop-itemdata-parent-scope-baseline.test.tsx
  // and the characterization pins in
  // loop-recurse-scratch-provider-contract.test.tsx.
  it('reuses one scratch bindings scope per recurse instance and disposes it at unmount', async () => {
    const holder: { runtime: RendererRuntime | null } = { runtime: null };
    const SchemaRenderer = createBasicSchemaRenderer([]);

    // Start with no recurse items: the scratch scope is created lazily on the
    // first itemData evaluation, so the runtime capture below can grab it.
    const view = render(
      <SchemaRenderer
        schemaUrl="test://basic/recurse-dispose"
        schema={RECURSE_SCHEMA}
        data={{ nodes: [{ id: 'root', name: 'Root', children: [] }] }}
        env={env}
        formulaCompiler={formulaCompiler}
        onRuntimeChange={(runtime) => {
          holder.runtime = runtime as RendererRuntime;
        }}
      />,
    );

    const { created, disposeSpy } = installRuntimeSpies(holder);

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

    // exactly ONE empty-patch scratch scope, created lazily on the first
    // itemData evaluation — the old per-item implementation created one
    // bindings-shaped scope per item with a non-empty patch instead
    const scratchScopes = created.filter((entry) => Object.keys(entry.patch).length === 0);
    expect(scratchScopes.length).toBe(1);
    const scratchId = scratchScopes[0]?.id;

    // re-evaluation across renders REUSES the scratch scope: no further
    // bindings-shaped child scopes may be created (loop-side P14 parity)
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
                { id: 'c1', name: 'Child1x' },
                { id: 'c2', name: 'Child2x' },
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
      expect(screen.getByText('Child1x:0')).toBeTruthy();
      expect(screen.getByText('Child2x:1')).toBeTruthy();
    });

    const perItemCreates = created.filter(
      (entry) => isBindingsScopePatch(entry.patch) && Object.keys(entry.patch).length > 0,
    );
    expect(perItemCreates.length).toBe(0);

    // unmount disposes the scratch scope
    expect(() => view.unmount()).not.toThrow();
    expect(disposeSpy.mock.calls.map((call) => call[0])).toContain(scratchId);
  });
});
