import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RendererComponentProps, RegisteredRendererDefinition, RendererRuntime, ScopeRef } from '@nop-chaos/flux-core';
import { useStructuralLoopContext } from '@nop-chaos/flux-react';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

// plan 588 CX-10 characterization (WA-basic-004 / WA-basic-005, draft review
// m2/m4/m5): pins the CURRENT loop scratch-scope shape (P14: one shared scratch
// per LoopRenderer instance, same-value merge skip, unmount dispose), the
// CURRENT recurse per-item one-shot scope counts (declared hotspot), the
// nested-recurse context inheritance surface with override priority, and the
// provider re-memo rhythm (context identity and evaluator closure identity
// churn on every commit). These pins must stay green across the plan-588
// consolidation; the recurse per-item counts are the red leg of the declared
// behavior enhancement and are rewritten to the shared contract by the fix.

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

interface ProbeSnapshot {
  depth: number | null;
  itemName: string | null;
  indexName: string | null;
  hasRenderBody: boolean | null;
  pathLength: number | null;
  lastKey: string | null;
}

interface ProbeRecorder {
  renderCount: number;
  contexts: unknown[];
  evaluators: unknown[];
  snapshots: ProbeSnapshot[];
}

function createProbeRecorder(): ProbeRecorder {
  return { renderCount: 0, contexts: [], evaluators: [], snapshots: [] };
}

let recorder = createProbeRecorder();

/* eslint-disable react-compiler/react-compiler, react-hooks/immutability -- render-time observation probe (plan 588 m4/m5): the pins being characterized are the per-commit re-memo rhythm, so recording MUST happen during render; the module recorder is reset per test via beforeEach and only read between renders */
function StructuralCtxProbeRenderer(_props: RendererComponentProps) {
  const ctx = useStructuralLoopContext();
  recorder.renderCount += 1;
  if (ctx) {
    if (recorder.contexts.length === 0 || recorder.contexts[recorder.contexts.length - 1] !== ctx) {
      recorder.contexts.push(ctx);
    }
    const evaluator = ctx.evaluateItemData;
    if (
      evaluator != null &&
      (recorder.evaluators.length === 0 || recorder.evaluators[recorder.evaluators.length - 1] !== evaluator)
    ) {
      recorder.evaluators.push(evaluator);
    }
    recorder.snapshots.push({
      depth: ctx.depth,
      itemName: ctx.bindings.itemName,
      indexName: ctx.bindings.indexName,
      hasRenderBody: typeof ctx.renderBody === 'function',
      pathLength: ctx.instancePath?.length ?? null,
      lastKey: ctx.instancePath?.length
        ? ctx.instancePath[ctx.instancePath.length - 1].instanceKey
        : null,
    });
  }
  return null;
}
/* eslint-enable react-compiler/react-compiler, react-hooks/immutability */

const ctxProbeRenderer: RegisteredRendererDefinition = {
  type: 'ctx-probe',
  component: StructuralCtxProbeRenderer,
  fields: [],
};

function renderWithProbe(schema: unknown, data: Record<string, unknown>) {
  const SchemaRenderer = createBasicSchemaRenderer([ctxProbeRenderer]);
  return {
    SchemaRenderer,
    view: render(
      <SchemaRenderer
        schemaUrl="test://loop-recurse-scratch-provider-contract"
        schema={schema as never}
        data={data}
        env={env}
        formulaCompiler={formulaCompiler}
        // plan 595 opt-out: recurse itemData scratch scope keys surface to sibling regions — statically opaque.
        strictValidation={false}
      />,
    ),
  };
}

function snapshotsAtDepth(depth: number): ProbeSnapshot[] {
  return recorder.snapshots.filter((entry) => entry.depth === depth);
}

interface CapturedScope {
  id: string;
  patch: Record<string, unknown>;
  scope: ScopeRef;
}

function installRuntimeScopeCapture(holder: { runtime: RendererRuntime | null }) {
  expect(holder.runtime).not.toBeNull();
  const runtime = holder.runtime!;
  const created: CapturedScope[] = [];
  const originalCreate = runtime.createChildScope.bind(runtime);
  const createSpy = vi
    .spyOn(runtime, 'createChildScope')
    .mockImplementation(((parent: never, patch: never, options: never) => {
      const scope = originalCreate(parent, patch, options);
      created.push({ id: scope.id, patch: patch as Record<string, unknown>, scope });
      return scope;
    }) as never);
  const disposeSpy = vi.spyOn(runtime, 'disposeScope');
  return { created, createSpy, disposeSpy };
}

describe('loop itemData scratch — P14 shared-scope shape (plan 588 characterization)', () => {
  it('skips the scratch-scope merge write when re-evaluated item values are Object.is-equal', async () => {
    const holder: { runtime: RendererRuntime | null } = { runtime: null };
    const SchemaRenderer = createBasicSchemaRenderer([]);
    const LOOP_SCHEMA = {
      type: 'page',
      body: [
        {
          type: 'loop',
          items: '${users}',
          itemData: { label: '${item + ":" + index}' },
          body: [{ type: 'text', text: '${$slot.label}' }],
        },
      ],
    } as never;

    // Start with zero items: the scratch scope is created lazily on the first
    // itemData evaluation, so it does not exist yet and the capture can grab it.
    // Single item on purpose: the scratch scope holds the LAST evaluated item's
    // values, so the Object.is merge skip fires when that same item is
    // re-evaluated consecutively (one item = every re-evaluation is consecutive).
    const view = render(
      <SchemaRenderer
        schemaUrl="test://basic/loop-scratch-merge-skip"
        schema={LOOP_SCHEMA}
        data={{ users: [] }}
        env={env}
        formulaCompiler={formulaCompiler}
        onRuntimeChange={(runtime) => {
          holder.runtime = runtime as RendererRuntime;
        }}
      />,
    );

    const { created, disposeSpy } = installRuntimeScopeCapture(holder);

    view.rerender(
      <SchemaRenderer
        schemaUrl="test://basic/loop-scratch-merge-skip"
        schema={LOOP_SCHEMA}
        data={{ users: ['Alice'] }}
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

    const scratchScopes = created.filter((entry) => Object.keys(entry.patch).length === 0);
    expect(scratchScopes.length).toBe(1);
    const scratch = scratchScopes[0];
    expect(scratch.scope.store).toBeTruthy();

    const changes: Array<{ kind: string | undefined; paths: readonly string[] }> = [];
    const unsubscribe = scratch.scope.store!.subscribe((change) => {
      changes.push({ kind: change.kind, paths: change.paths });
    });
    const mergeChanges = () => changes.filter((change) => change.kind === 'merge');

    // Same primitive value, new array identity: itemData is re-evaluated per
    // render, but the merge write is skipped entirely (Object.is per key).
    // (The page data sync independently notifies the store with kind=replace;
    // only merge-kind writes belong to the scratch evaluator contract.)
    view.rerender(
      <SchemaRenderer
        schemaUrl="test://basic/loop-scratch-merge-skip"
        schema={LOOP_SCHEMA}
        data={{ users: ['Alice'] }}
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
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(mergeChanges().length).toBe(0);
    expect(created.filter((entry) => Object.keys(entry.patch).length === 0).length).toBe(1);

    // A changed item value goes through the merge channel exactly once.
    view.rerender(
      <SchemaRenderer
        schemaUrl="test://basic/loop-scratch-merge-skip"
        schema={LOOP_SCHEMA}
        data={{ users: ['Bobby'] }}
        env={env}
        formulaCompiler={formulaCompiler}
        onRuntimeChange={(runtime) => {
          holder.runtime = runtime as RendererRuntime;
        }}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('Bobby:0')).toBeTruthy();
    });
    expect(mergeChanges().length).toBe(1);
    expect(mergeChanges()[0]?.paths).toEqual(['item', 'index']);

    unsubscribe();
    expect(() => view.unmount()).not.toThrow();
    expect(disposeSpy.mock.calls.map((call) => call[0])).toContain(scratch.id);
  });
});

describe('structural loop context — nested recurse inheritance surface (plan 588 characterization)', () => {
  beforeEach(() => {
    recorder = createProbeRecorder();
  });

  it('inherits bindings, depth, instancePath and renderBody across nested recurse levels', async () => {
    renderWithProbe(
      {
        type: 'page',
        body: [
          {
            type: 'loop',
            items: '${nodes}',
            itemName: 'node',
            indexName: 'idx',
            body: [
              { type: 'ctx-probe' },
              { type: 'recurse', items: '${$slot.node.children}' },
            ],
          },
        ],
      },
      {
        nodes: [
          {
            id: 'r',
            name: 'Root',
            children: [{ id: 'c', name: 'Child', children: [{ id: 'g', name: 'Grand', children: [] }] }],
          },
        ],
      },
    );

    await waitFor(() => {
      expect(recorder.snapshots.length).toBeGreaterThan(0);
    });

    const depth1 = snapshotsAtDepth(1);
    expect(depth1.length).toBeGreaterThan(0);
    expect(depth1[0]).toMatchObject({ itemName: 'node', indexName: 'idx', hasRenderBody: true, pathLength: 1, lastKey: 'r' });

    const depth2 = snapshotsAtDepth(2);
    expect(depth2.length).toBeGreaterThan(0);
    expect(depth2[0]).toMatchObject({ itemName: 'node', indexName: 'idx', hasRenderBody: true, pathLength: 2, lastKey: 'c' });

    const depth3 = snapshotsAtDepth(3);
    expect(depth3.length).toBeGreaterThan(0);
    expect(depth3[0]).toMatchObject({ itemName: 'node', indexName: 'idx', hasRenderBody: true, pathLength: 3, lastKey: 'g' });
  });

  it('gives explicit inner recurse props priority over the inherited context values', async () => {
    renderWithProbe(
      {
        type: 'page',
        body: [
          {
            type: 'loop',
            items: '${nodes}',
            itemName: 'node',
            indexName: 'idx',
            body: [
              { type: 'ctx-probe' },
              { type: 'text', text: '${$slot.tag ?? ""}' },
              {
                type: 'recurse',
                items: '${$slot.node.children}',
                itemName: 'leaf',
                itemData: { tag: '${leaf.name + ":" + idx}' },
              },
            ],
          },
        ],
      },
      { nodes: [{ id: 'r', name: 'Root', children: [{ id: 'c', name: 'Leaf' }] }] },
    );

    await waitFor(() => {
      // explicit itemName override: ${leaf.name} resolves inside the inner
      // itemData and lands in the slot bindings shared by the body template
      expect(screen.getByText('Leaf:0')).toBeTruthy();
    });

    const depth1 = snapshotsAtDepth(1);
    expect(depth1.length).toBeGreaterThan(0);
    expect(depth1[0]).toMatchObject({ itemName: 'node', indexName: 'idx', pathLength: 1 });

    const depth2 = snapshotsAtDepth(2);
    expect(depth2.length).toBeGreaterThan(0);
    expect(depth2[0]).toMatchObject({ itemName: 'leaf', indexName: 'idx', hasRenderBody: true, pathLength: 2, lastKey: 'c' });
  });
});

describe('structural loop context — provider re-memo rhythm (plan 588 characterization m4/m5)', () => {
  beforeEach(() => {
    recorder = createProbeRecorder();
  });

  it('re-memos the loop provider context and re-creates the evaluator closure on every commit', async () => {
    const { SchemaRenderer, view } = renderWithProbe(
      {
        type: 'page',
        body: [
          {
            type: 'loop',
            items: '${users}',
            itemData: { label: '${item + ":" + index}' },
            body: [{ type: 'ctx-probe' }, { type: 'text', text: '${$slot.label}' }],
          },
        ],
      },
      { users: ['Alice'] },
    );

    await waitFor(() => {
      expect(screen.getByText('Alice:0')).toBeTruthy();
      expect(recorder.renderCount).toBeGreaterThan(0);
    });

    const rendersBefore = recorder.renderCount;
    expect(recorder.contexts.length).toBe(rendersBefore);
    expect(recorder.evaluators.length).toBe(rendersBefore);

    view.rerender(
      <SchemaRenderer
        schemaUrl="test://loop-recurse-scratch-provider-contract"
        schema={
          {
            type: 'page',
            body: [
              {
                type: 'loop',
                items: '${users}',
                itemData: { label: '${item + ":" + index}' },
                body: [{ type: 'ctx-probe' }, { type: 'text', text: '${$slot.label}' }],
              },
            ],
          } as never
        }
        data={{ users: ['Bob'] }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Bob:0')).toBeTruthy();
    });

    const rendersAfter = recorder.renderCount;
    expect(rendersAfter).toBeGreaterThan(rendersBefore);
    expect(recorder.contexts.length).toBe(rendersAfter);
    expect(recorder.evaluators.length).toBe(rendersAfter);
  });

  it('re-memos the recurse provider context and re-creates the evaluator closure on every commit', async () => {
    const { SchemaRenderer, view } = renderWithProbe(
      {
        type: 'page',
        body: [
          {
            type: 'loop',
            items: '${nodes}',
            body: [
              {
                type: 'recurse',
                items: '${$slot.item.children}',
                itemData: { childLabel: '${item.name + ":" + index}' },
              },
              { type: 'ctx-probe' },
              { type: 'text', text: '${$slot.childLabel ?? ""}' },
            ],
          },
        ],
      },
      { nodes: [{ id: 'root', name: 'Root', children: [{ id: 'c1', name: 'Kid1' }] }] },
    );

    await waitFor(() => {
      expect(screen.getByText('Kid1:0')).toBeTruthy();
      expect(recorder.renderCount).toBeGreaterThan(0);
    });

    const rendersBefore = recorder.renderCount;
    expect(recorder.contexts.length).toBe(rendersBefore);
    expect(recorder.evaluators.length).toBe(rendersBefore);

    view.rerender(
      <SchemaRenderer
        schemaUrl="test://loop-recurse-scratch-provider-contract"
        schema={
          {
            type: 'page',
            body: [
              {
                type: 'loop',
                items: '${nodes}',
                body: [
                  {
                    type: 'recurse',
                    items: '${$slot.item.children}',
                    itemData: { childLabel: '${item.name + ":" + index}' },
                  },
                  { type: 'ctx-probe' },
                  { type: 'text', text: '${$slot.childLabel ?? ""}' },
                ],
              },
            ],
          } as never
        }
        data={{ nodes: [{ id: 'root', name: 'Root', children: [{ id: 'c1', name: 'Kid1-renamed' }] }] }}
        env={env}
        formulaCompiler={formulaCompiler}
        // plan 595 opt-out: keep rerender semantics identical to the mount.
        strictValidation={false}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Kid1-renamed:0')).toBeTruthy();
    });

    const rendersAfter = recorder.renderCount;
    expect(rendersAfter).toBeGreaterThan(rendersBefore);
    expect(recorder.contexts.length).toBe(rendersAfter);
    expect(recorder.evaluators.length).toBe(rendersAfter);
  });
});
