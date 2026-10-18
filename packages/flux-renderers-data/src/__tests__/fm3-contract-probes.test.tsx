import React from 'react';
import { act, cleanup, fireEvent, render, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RendererHelpers } from '@nop-chaos/flux-core';
import { useTableLazyChildren } from '../table-renderer/use-table-lazy-children.js';
import { splitResponsiveColumns } from '../table-renderer/responsive.js';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

// FM-3 Phase 2 exploratory contract probes (shard C gaps C-01 / C-03 / C-04).
// Each describe pins one gap reported in _tmp/fm3-gap-shard-c.md.

afterEach(cleanup);

// Base UI Radio.Root re-dispatches a PointerEvent click onto its hidden input;
function deferred<T = unknown>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createLazyHelpers() {
  const createdScopes: string[] = [];
  const dispatch = vi.fn();
  const helpers = {
    createScope: vi.fn((patch: Record<string, unknown>) => {
      const id = `lazy-scope-${createdScopes.length}`;
      createdScopes.push(id);
      return { id, ...patch };
    }),
    dispatch,
    disposeScope: vi.fn(),
  };
  return { helpers: helpers as unknown as RendererHelpers, rawHelpers: helpers, dispatch, createdScopes };
}

describe('FM-3 C-01 lazy-children in-flight dedup and unmount guard', () => {
  const childrenSource = { action: 'ajax', args: { url: '/api/children' } } as never;

  function setupHook(dispatchImpl: () => Promise<unknown>) {
    const { helpers, rawHelpers, dispatch, createdScopes } = createLazyHelpers();
    dispatch.mockImplementationOnce(dispatchImpl);
    const rendered = renderHook(() => useTableLazyChildren({ childrenSource, helpers }));
    return { ...rendered, dispatch, createdScopes, disposeScope: rawHelpers.disposeScope };
  }

  it('dedups a duplicate trigger for the same rowKey while in flight (single dispatch, single scope)', async () => {
    const first = deferred();
    const { result, dispatch, createdScopes } = setupHook(() => first.promise as Promise<never>);

    act(() => {
      result.current.loadChildren('r1', { id: 'r1' });
      result.current.loadChildren('r1', { id: 'r1' });
    });

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(createdScopes).toHaveLength(1);
    expect(result.current.lazyChildrenMap.get('r1')).toMatchObject({ loading: true });

    await act(async () => {
      first.resolve({ ok: true, data: [{ id: 'c1' }] });
    });

    expect(result.current.lazyChildrenMap.get('r1')).toMatchObject({
      loading: false,
      children: [{ id: 'c1' }],
    });
  });

  it('re-arms after settle — the dedup window is per-flight, not a permanent block', async () => {
    const first = deferred();
    const second = deferred();
    const { helpers, dispatch } = createLazyHelpers();
    dispatch
      .mockImplementationOnce(() => first.promise as Promise<never>)
      .mockImplementationOnce(() => second.promise as Promise<never>);
    const { result } = renderHook(() => useTableLazyChildren({ childrenSource, helpers }));

    act(() => {
      result.current.loadChildren('r1', { id: 'r1' });
    });
    await act(async () => {
      first.resolve({ ok: true, data: [] });
    });
    expect(dispatch).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.loadChildren('r1', { id: 'r1' });
    });
    expect(dispatch).toHaveBeenCalledTimes(2);

    await act(async () => {
      second.resolve({ ok: true, data: [] });
    });
  });

  it('resolve after unmount is safe: scope disposed exactly once, no error/warning escapes', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const late = deferred();
    const { result, unmount, createdScopes, disposeScope } = setupHook(() => late.promise as Promise<never>);

    act(() => {
      result.current.loadChildren('r1', { id: 'r1' });
    });
    const scopeId = createdScopes[0];
    unmount();

    await act(async () => {
      late.resolve({ ok: true, data: [{ id: 'c1' }] });
    });

    expect(disposeScope).toHaveBeenCalledTimes(1);
    expect(disposeScope).toHaveBeenCalledWith(scopeId);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('reject after unmount is safe: rejection swallowed, scope disposed exactly once', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const late = deferred();
    const { result, unmount, createdScopes, disposeScope } = setupHook(() => late.promise as Promise<never>);

    act(() => {
      result.current.loadChildren('r1', { id: 'r1' });
    });
    const scopeId = createdScopes[0];
    unmount();

    // If the hook's .catch were dropped, this rejection would surface as an
    // unhandled rejection and fail the suite.
    await act(async () => {
      late.reject(new Error('boom'));
    });

    expect(disposeScope).toHaveBeenCalledTimes(1);
    expect(disposeScope).toHaveBeenCalledWith(scopeId);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });
});

describe('FM-3 C-03 radio × checkableWhen orthogonal composition', () => {
  function selectionText(): string {
    return (
      Array.from(document.querySelectorAll('span'))
        .find((el) => /^SEL:/.test(el.textContent ?? ''))
        ?.textContent ?? ''
    );
  }

  function renderRadioCheckableTable() {
    const SchemaRenderer = createDataSchemaRenderer([]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/fm3-radio-checkable-when"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              id: 'fm3-radio-table',
              itemKey: 'id',
              source: [
                { id: '1', name: 'Active Row', status: 'active' },
                { id: '2', name: 'Draft Row', status: 'draft' },
              ],
              rowSelection: { type: 'radio', checkableWhen: "status === 'active'" },
              selectionOwnership: 'scope',
              selectionStatePath: 'selection',
              columns: [{ name: 'name', label: 'Name' }],
            },
            { type: 'text', text: 'SEL:${selection}' },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
  }

  function rowRadios(): HTMLElement[] {
    return Array.from(
      document.querySelectorAll('tbody [data-slot="table-select-cell"] [data-slot="radio-group-item"]'),
    ) as HTMLElement[];
  }

  it('rows failing checkableWhen render a disabled radio whose click cannot select', async () => {
    renderRadioCheckableTable();

    await waitFor(() => {
      expect(document.querySelectorAll('tbody [data-slot="table-row"]').length).toBe(2);
    });

    const radios = rowRadios();
    expect(radios.length).toBe(2);
    // Base UI Radio renders as a span here: the disabled state is conveyed via
    // data-disabled / aria-disabled (no native disabled attribute).
    const isDisabled = (el: HTMLElement) =>
      el.hasAttribute('disabled') || el.hasAttribute('data-disabled');
    // checkableWhen-satisfying row: radio enabled; failing row: radio disabled.
    expect(isDisabled(radios[0]!)).toBe(false);
    expect(isDisabled(radios[1]!)).toBe(true);

    // Positive control: the enabled row still selects through the radio pipeline.
    fireEvent.click(radios[0]!);
    await waitFor(() => {
      expect(selectionText()).toBe('SEL:1');
    });

    // The disabled row's radio must not steal the selection.
    fireEvent.click(radios[1]!);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(selectionText()).toBe('SEL:1');
  });
});

describe('FM-3 C-04 splitResponsiveColumns fixed-column invariant', () => {
  it('named fixed left/right columns always stay in primary; remaining non-fixed columns collapse into hidden', () => {
    const columns = [
      { name: 'ops', label: 'Ops', fixed: 'left' },
      { name: 'a', label: 'A' },
      { name: 'b', label: 'B' },
      { name: 'c', label: 'C' },
      { name: 'act', label: 'Act', fixed: 'right' },
    ] as never[];

    const { primaryColumns, hiddenColumns } = splitResponsiveColumns(columns);

    expect(primaryColumns.map((column) => column.name)).toEqual(['ops', 'a', 'act']);
    expect(hiddenColumns.map((column) => column.name)).toEqual(['b', 'c']);
    // Invariant: no fixed column may ever land in hiddenColumns.
    expect(hiddenColumns.some((column) => column.fixed === 'left' || column.fixed === 'right')).toBe(false);
  });

  it('unnamed fixed columns keep their fallback identity when the full-array index aligns with the fixed-side index', () => {
    const columns = [
      { label: 'L1', fixed: 'left' },
      { label: 'L2', fixed: 'left' },
      { name: 'a', label: 'A' },
      { name: 'b', label: 'B' },
    ] as never[];

    const { primaryColumns, hiddenColumns } = splitResponsiveColumns(columns);

    expect(primaryColumns.map((column) => column.label)).toEqual(['L1', 'L2', 'A']);
    expect(hiddenColumns.map((column) => column.label)).toEqual(['B']);
    expect(hiddenColumns.some((column) => column.fixed === 'left' || column.fixed === 'right')).toBe(false);
  });

  // FM-3 探洞立案 → FM-6 修复翻绿（plan 649）：双索引空间已合一
  // （responsive.ts 单趟 key 推导），无名 fixed 列不再错位折叠。
  it('an unnamed fixed column NOT aligned with its fixed-side index must still stay in primary', () => {
    // Left variant: fixed-left preceded by a non-fixed column.
    const leftVariant = [
      { name: 'a', label: 'A' },
      { label: 'Ops', fixed: 'left' },
      { name: 'b', label: 'B' },
    ] as never[];
    const leftSplit = splitResponsiveColumns(leftVariant);
    expect(leftSplit.primaryColumns.map((column) => column.label)).toContain('Ops');
    expect(leftSplit.hiddenColumns.some((column) => column.fixed === 'left')).toBe(false);

    // Right variant: unnamed action column at the tail (the realistic mobile layout).
    const rightVariant = [
      { name: 'a', label: 'A' },
      { name: 'b', label: 'B' },
      { label: 'Act', fixed: 'right' },
    ] as never[];
    const rightSplit = splitResponsiveColumns(rightVariant);
    expect(rightSplit.primaryColumns.map((column) => column.label)).toContain('Act');
    expect(rightSplit.hiddenColumns.some((column) => column.fixed === 'right')).toBe(false);
  });
});
