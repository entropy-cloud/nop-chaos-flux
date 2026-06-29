import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ApiRequestContext, RendererEnv } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { allFormDefs } from './form-tree-checkbox-fields.shared.js';
import { env as defaultEnv } from '../test-support.js';

void defaultEnv;

function searchEnv(respond: (q: string) => unknown[]): RendererEnv {
  return {
    fetcher: async function <T>(_api: unknown, ctx: ApiRequestContext) {
      const scopeData = ctx.scope.readVisible() as { searchQuery?: string };
      const query = String(scopeData?.searchQuery ?? '');
      return { ok: true, status: 200, data: respond(query) as T };
    },
    notify: () => undefined,
  };
}

function lazyEnv(
  respond: (parentValue: unknown) => unknown[],
): { env: RendererEnv; calls: Array<{ expandedNodeValue: unknown; signal?: AbortSignal }> } {
  const calls: Array<{ expandedNodeValue: unknown; signal?: AbortSignal }> = [];
  const env: RendererEnv = {
    fetcher: async function <T>(_api: unknown, ctx: ApiRequestContext) {
      const scopeData = ctx.scope.readVisible() as { expandedNodeValue?: unknown };
      calls.push({ expandedNodeValue: scopeData?.expandedNodeValue, signal: ctx.signal });
      return { ok: true, status: 200, data: respond(scopeData?.expandedNodeValue) as T };
    },
    notify: () => undefined,
  };
  return { env, calls };
}

function tree(schemaBody: Record<string, unknown>[], env: RendererEnv, suffix: string) {
  cleanup();
  const SchemaRenderer = createSchemaRenderer([...allFormDefs]);
  return render(
    <SchemaRenderer
      schemaUrl={`test://flux-renderers-form-advanced/__tests__/tree-async-lifecycle.test.tsx#${suffix}`}
      schema={{ type: 'form', body: schemaBody } as any}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

const fruits = ['Apple', 'Apricot', 'Banana'];

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('tree remote search debounce survives re-render churn (H8)', () => {
  it('fires the search after the debounce even when the tree re-renders mid-window', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const env = searchEnv((q) =>
      fruits.filter((f) => f.toLowerCase().includes(q.toLowerCase())).map((label) => ({ label, value: label })),
    );

    const SchemaRenderer = createSchemaRenderer([...allFormDefs]);
    const schemaUrl = 'test://flux-renderers-form-advanced/__tests__/tree-async-lifecycle.test.tsx#h8';
    const schema = {
      type: 'form',
      body: [
        {
          type: 'input-tree',
          name: 'fruits',
          label: 'Fruits',
          searchable: true,
          searchSource: { action: 'ajax', args: { url: '/api/f', method: 'get' } },
          options: [{ label: 'Static', value: 'static' }],
        },
      ],
    } as any;

    const view = render(
      <SchemaRenderer schemaUrl={schemaUrl} schema={schema} env={env} formulaCompiler={createFormulaCompiler()} />,
    );

    const search = screen.getByPlaceholderText('Search Fruits');
    fireEvent.change(search, { target: { value: 'ap' } });

    // Re-render with the SAME schema object partway through the debounce window
    // (no remount — InputTreeRenderer just re-renders). With the old churny
    // treeConfig this reset the 300ms timer each render so the search never
    // fired; the memoized treeConfig keeps the debounce stable.
    await vi.advanceTimersByTimeAsync(200);
    view.rerender(
      <SchemaRenderer schemaUrl={schemaUrl} schema={schema} env={env} formulaCompiler={createFormulaCompiler()} />,
    );
    await vi.advanceTimersByTimeAsync(250);

    await waitFor(() => {
      expect(screen.getByRole('treeitem', { name: 'Apple' })).toBeTruthy();
    });
    view.unmount();
  });
});

describe('tree expanded-state preserves user collapse on options change (H15)', () => {
  it('keeps a manually collapsed node collapsed after a lazy-load changes options identity', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { env } = lazyEnv((parentValue) =>
      parentValue === 'parent-b' ? [{ label: 'Child B1', value: 'child-b1' }] : [],
    );

    const view = tree(
      [
        {
          type: 'input-tree',
          name: 'tree',
          label: 'Tree',
          treeMode: 'checkbox',
          childrenSource: { action: 'ajax', args: { url: '/api/c', method: 'get' } },
          options: [
            { label: 'Parent A', value: 'parent-a', children: [{ label: 'Child A1', value: 'child-a1' }] },
            { label: 'Parent B', value: 'parent-b', deferChildren: true },
          ],
        },
      ],
      env,
      'h15',
    );

    // Parent A defaults expanded → Child A1 visible.
    expect(await screen.findByRole('treeitem', { name: 'Child A1' })).toBeTruthy();

    // Collapse Parent A.
    const collapseButton = screen.getByRole('button', { name: /collapse/i });
    fireEvent.click(collapseButton);
    await waitFor(() => {
      expect(screen.queryByRole('treeitem', { name: 'Child A1' })).toBeNull();
    });

    // Expand Parent B → lazy load → merged options change identity. The old
    // behavior rebuilt expandedKeys from "all parents" and re-expanded Parent A;
    // the merge strategy preserves the user's collapse.
    const parentB = screen.getByRole('treeitem', { name: 'Parent B' });
    const expandButton = within(parentB).getByRole('button', { name: /expand/i });
    fireEvent.click(expandButton);
    await waitFor(() => {
      expect(screen.getByRole('treeitem', { name: 'Child B1' })).toBeTruthy();
    });

    // Parent A must still be collapsed (Child A1 still hidden).
    expect(screen.queryByRole('treeitem', { name: 'Child A1' })).toBeNull();
    view.unmount();
  });
});

describe('tree lazy-children async lifecycle (H14)', () => {
  it('does not setState after unmount when a lazy load is in flight', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let resolveLoad: ((data: unknown[]) => void) | undefined;
    const { env } = lazyEnv(() => {
      return new Promise((resolve) => {
        resolveLoad = (data) => resolve(data);
      }) as Promise<unknown[]> as unknown as unknown[];
    });

    const view = tree(
      [
        {
          type: 'input-tree',
          name: 'tree',
          label: 'Tree',
          treeMode: 'checkbox',
          childrenSource: { action: 'ajax', args: { url: '/api/c', method: 'get' } },
          options: [{ label: 'Parent A', value: 'parent-a', deferChildren: true }],
        },
      ],
      env,
      'h14-unmount',
    );

    const parent = await screen.findByRole('treeitem', { name: 'Parent A' });
    fireEvent.click(parent);
    // Unmount while the load is still pending.
    view.unmount();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    // Resolve the in-flight load after unmount; the mounted guard must swallow it.
    resolveLoad?.([{ label: 'Child A1', value: 'child-a1' }]);
    await Promise.resolve();
    await Promise.resolve();
    // No "state update on unmounted component" / React act errors leaked.
    const leaked = errorSpy.mock.calls.find((c) =>
      /unmounted|Cannot update|act\(/i.test(String(c[0])),
    );
    errorSpy.mockRestore();
    expect(leaked).toBeUndefined();
  });

  it('discards a stale lazy load when baseOptions changes mid-flight (no stale-merge)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let resolveLoad: ((data: unknown[]) => void) | undefined;
    const { env } = lazyEnv(() => {
      return new Promise((resolve) => {
        resolveLoad = (data) => resolve(data);
      }) as Promise<unknown[]> as unknown as unknown[];
    });

    const optionsA = [{ label: 'Parent A', value: 'parent-a', deferChildren: true }];
    const view = tree(
      [
        {
          type: 'input-tree',
          name: 'tree',
          label: 'Tree',
          treeMode: 'checkbox',
          childrenSource: { action: 'ajax', args: { url: '/api/c', method: 'get' } },
          options: optionsA,
        },
      ],
      env,
      'h14-stale',
    );

    const parent = await screen.findByRole('treeitem', { name: 'Parent A' });
    fireEvent.click(parent);

    // Swap to a different options identity (e.g. a refresh) while the load is
    // pending. The generation guard must invalidate the in-flight load so it
    // does not stale-merge children into the old base.
    const SchemaRenderer = createSchemaRenderer([...allFormDefs]);
    view.rerender(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/tree-async-lifecycle.test.tsx#h14-stale"
        schema={
          {
            type: 'form',
            body: [
              {
                type: 'input-tree',
                name: 'tree',
                label: 'Tree',
                treeMode: 'checkbox',
                childrenSource: { action: 'ajax', args: { url: '/api/c', method: 'get' } },
                options: [{ label: 'Parent B', value: 'parent-b', deferChildren: true }],
              },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    resolveLoad?.([{ label: 'Child A1', value: 'child-a1' }]);
    await Promise.resolve();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(0);

    // The stale load (Parent A's children) must not bleed into the refreshed
    // tree: Parent B is present, Parent A's stale child is not.
    expect(screen.getByRole('treeitem', { name: 'Parent B' })).toBeTruthy();
    expect(screen.queryByRole('treeitem', { name: 'Child A1' })).toBeNull();
    view.unmount();
  });
});

describe('tree remote search aborts the in-flight request on cleanup (AUDIT-12)', () => {
  it('passes an AbortSignal to the fetcher and aborts it when the query changes', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const seenSignals: AbortSignal[] = [];
    const env: RendererEnv = {
      fetcher: async function <T>(_api: unknown, ctx: ApiRequestContext) {
        seenSignals.push(ctx.signal as AbortSignal);
        return new Promise<T>(() => undefined);
      },
      notify: () => undefined,
    };

    const view = tree(
      [
        {
          type: 'input-tree',
          name: 'fruits',
          label: 'Fruits',
          searchable: true,
          searchSource: { action: 'ajax', args: { url: '/api/f', method: 'get' } },
          options: [{ label: 'Static', value: 'static' }],
        },
      ],
      env,
      'audit12',
    );

    const search = screen.getByPlaceholderText('Search Fruits');
    fireEvent.change(search, { target: { value: 'ap' } });
    await vi.advanceTimersByTimeAsync(350);
    expect(seenSignals.length).toBe(1);
    expect(seenSignals[0].aborted).toBe(false);

    // A new query must abort the previous in-flight request.
    fireEvent.change(search, { target: { value: 'apr' } });
    await vi.advanceTimersByTimeAsync(350);

    expect(seenSignals.length).toBe(2);
    expect(seenSignals[0].aborted).toBe(true);
    view.unmount();
  });
});
