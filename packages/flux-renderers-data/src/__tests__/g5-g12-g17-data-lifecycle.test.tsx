import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { createDataSchemaRenderer, env, formulaCompiler, buttonRenderer } from '../test-support.js';

resetFluxI18n();
initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function triggerListIntersection(): boolean {
  const sentinel = document.querySelector('[data-slot="list-infinite-sentinel"]');
  const observer = (
    window as unknown as {
      __crudInfiniteObserver?: { __fireIntersection: (el: Element) => void };
    }
  ).__crudInfiniteObserver;
  if (!sentinel || !observer) {
    return false;
  }
  act(() => {
    observer.__fireIntersection(sentinel);
  });
  return true;
}

function infiniteStatusText(): string {
  return (
    document.querySelector('[data-slot="list-infinite-status"]')?.textContent?.trim() ?? ''
  );
}

const twelveItems = Array.from({ length: 12 }, (_, i) => ({
  id: `k${i + 1}`,
  label: `Item ${i + 1}`,
}));

// ============================================================
// G5 — infinite scroll: concurrent guard, loading/error, short-page fill
// ============================================================

describe('G5: infinite scroll concurrent-fetch guard', () => {
  it('does not trigger a second onLoadMore while one load is in-flight', async () => {
    const onLoadMore = vi.fn();
    let resolveLoad: (value: { ok: true }) => void = () => undefined;

    render(
      <SchemaRenderer
        schemaUrl="test://g5/concurrent"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              id: 'list-g5',
              items: twelveItems,
              pagination: { enabled: true, mode: 'infinite', pageSize: 3, total: 12 },
              onLoadMore: { action: 'probe:onLoadMore' },
              item: { type: 'text', text: '${$slot.item.label}' },
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={(actionScope) => {
          if (!actionScope) return;
          actionScope.registerNamespace('probe', {
            kind: 'host',
            invoke(method: string) {
              if (method === 'onLoadMore') {
                onLoadMore();
                return new Promise((resolve) => {
                  resolveLoad = resolve as typeof resolveLoad;
                });
              }
              return { ok: false, error: new Error(`Unsupported: ${method}`) };
            },
          });
        }}
      />,
    );

    await waitFor(() =>
      expect(document.querySelector('[data-slot="list-infinite-sentinel"]')).toBeTruthy(),
    );

    expect(triggerListIntersection()).toBe(true);
    await waitFor(() => expect(onLoadMore).toHaveBeenCalledTimes(1));
    // While the first load is still pending, repeated intersections must NOT load again.
    expect(triggerListIntersection()).toBe(true);
    expect(triggerListIntersection()).toBe(true);
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    // loading state reflects the in-flight fetch.
    await waitFor(() => expect(infiniteStatusText()).toContain('Loading more'));

    act(() => resolveLoad({ ok: true }));
    await waitFor(() => expect(infiniteStatusText()).not.toContain('Loading more'));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});

describe('G5: infinite scroll error state is observable', () => {
  it('surfaces a load-failed status when the load promise rejects', async () => {
    const onLoadMore = vi.fn();
    let rejectLoad: (err: Error) => void = () => undefined;

    render(
      <SchemaRenderer
        schemaUrl="test://g5/error"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              id: 'list-g5-err',
              items: twelveItems,
              pagination: { enabled: true, mode: 'infinite', pageSize: 3, total: 12 },
              onLoadMore: { action: 'probe:onLoadMore' },
              item: { type: 'text', text: '${$slot.item.label}' },
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={(actionScope) => {
          if (!actionScope) return;
          actionScope.registerNamespace('probe', {
            kind: 'host',
            invoke(method: string) {
              if (method === 'onLoadMore') {
                onLoadMore();
                return new Promise((_resolve, reject) => {
                  rejectLoad = reject;
                });
              }
              return { ok: false, error: new Error(`Unsupported: ${method}`) };
            },
          });
        }}
      />,
    );

    await waitFor(() =>
      expect(document.querySelector('[data-slot="list-infinite-sentinel"]')).toBeTruthy(),
    );

    expect(triggerListIntersection()).toBe(true);
    await waitFor(() => expect(onLoadMore).toHaveBeenCalledTimes(1));
    act(() => rejectLoad(new Error('boom')));
    await waitFor(() => expect(infiniteStatusText()).toContain('Load failed'));
  });
});

describe('G5: infinite scroll fills a short first page (continuation)', () => {
  it('keeps loading until there is no more data when the sentinel stays on screen', async () => {
    const onLoadMore = vi.fn();

    render(
      <SchemaRenderer
        schemaUrl="test://g5/short-page"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              id: 'list-g5-short',
              items: twelveItems,
              pagination: { enabled: true, mode: 'infinite', pageSize: 3, total: 12 },
              onLoadMore: { action: 'probe:onLoadMore' },
              item: { type: 'text', text: '${$slot.item.label}' },
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={(actionScope) => {
          if (!actionScope) return;
          actionScope.registerNamespace('probe', {
            kind: 'host',
            invoke(method: string) {
              if (method === 'onLoadMore') {
                onLoadMore();
                return { ok: true };
              }
              return { ok: false, error: new Error(`Unsupported: ${method}`) };
            },
          });
        }}
      />,
    );

    await waitFor(() =>
      expect(document.querySelector('[data-slot="list-infinite-sentinel"]')).toBeTruthy(),
    );

    // Simulate a real viewport where the sentinel remains on screen (short page):
    // give the sentinel an in-view bounding rect and a non-zero viewport height.
    const sentinel = document.querySelector('[data-slot="list-infinite-sentinel"]')!;
    sentinel.getBoundingClientRect = () =>
      ({ top: 100, bottom: 101, left: 0, right: 10, width: 10, height: 1 }) as DOMRect;
    window.innerHeight = 600;

    expect(triggerListIntersection()).toBe(true);
    // pageSize 3, total 12 -> 4 pages. A single intersection auto-continues through
    // pages 2..4 (3 extra loads) until hasMore becomes false and the sentinel leaves.
    await waitFor(() => expect(onLoadMore).toHaveBeenCalledTimes(3));
    await waitFor(() =>
      expect(document.querySelector('[data-slot="list-infinite-sentinel"]')).toBeNull(),
    );
  });
});

// ============================================================
// G12 — standalone list evicts stale selection keys on data change
// ============================================================

describe('G12: list evicts stale selection keys when the data set changes', () => {
  it('keeps the still-valid selection and drops the removed key', async () => {
    render(
      <SchemaRenderer
        schemaUrl="test://g12/stale-selection"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              id: 'list-g12',
              items: '${listData}',
              selectionMode: 'multiple',
              item: { type: 'text', text: '${$slot.item.label}' },
            },
            {
              type: 'button',
              label: 'remove-b',
              onClick: {
                action: 'setValue',
                args: {
                  path: 'listData',
                  value: [
                    { id: 'k1', label: 'A' },
                    { id: 'k3', label: 'C' },
                  ],
                },
              },
            },
          ],
        }}
        data={{
          listData: [
            { id: 'k1', label: 'A' },
            { id: 'k2', label: 'B' },
            { id: 'k3', label: 'C' },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('A')).toBeTruthy());

    function selectedItemTexts(): string[] {
      return Array.from(document.querySelectorAll('[data-slot="list-item"][data-selected]')).map(
        (node) => (node.textContent ?? '').trim(),
      );
    }

    // Select A and B.
    fireEvent.click(screen.getByText('A'));
    fireEvent.click(screen.getByText('B'));
    await waitFor(() => expect(selectedItemTexts().sort()).toEqual(['A', 'B']));

    // Remove B from the data set.
    fireEvent.click(screen.getByText('remove-b'));
    await waitFor(() => expect(screen.queryByText('B')).toBeNull());

    // The stale key (B) is evicted while the still-valid key (A) is retained.
    // (Without eviction, the selection would be silently retained as an orphan,
    // or — if it were a full clear — A would be lost too.)
    await waitFor(() => expect(selectedItemTexts()).toEqual(['A']));
  });
});

// ============================================================
// G17 — tree keeps focus inside the tree when the active node disappears
// ============================================================

describe('G17: tree focus is preserved when the active node disappears', () => {
  it('does not leave keyboard focus on <body> after the active node is removed', async () => {
    render(
      <SchemaRenderer
        schemaUrl="test://g17/focus"
        schema={{
          type: 'page',
          body: [
            {
              type: 'tree',
              id: 'tree-g17',
              data: '${treeData}',
              keyField: 'id',
              labelField: 'label',
            },
            {
              type: 'button',
              label: 'remove-active',
              onClick: {
                action: 'setValue',
                args: {
                  path: 'treeData',
                  value: [
                    { id: 'n1', label: 'Node 1' },
                    { id: 'n3', label: 'Node 3' },
                  ],
                },
              },
            },
          ],
        }}
        data={{
          treeData: [
            { id: 'n1', label: 'Node 1' },
            { id: 'n2', label: 'Node 2' },
            { id: 'n3', label: 'Node 3' },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Node 2')).toBeTruthy());

    // Focus the middle node (the active node we will remove).
    const node2 = screen.getByText('Node 2').closest('[role="treeitem"]') as HTMLElement;
    act(() => node2.focus());
    await waitFor(() => expect(document.activeElement).toBe(node2));

    // Remove the focused/active node.
    fireEvent.click(screen.getByText('remove-active'));
    await waitFor(() => expect(screen.queryByText('Node 2')).toBeNull());

    // Focus must not strand on <body>; it should land on a tree item.
    await waitFor(() => expect(document.activeElement).not.toBe(document.body));
    expect(document.activeElement?.getAttribute('role')).toBe('treeitem');
  });
});

export {};
