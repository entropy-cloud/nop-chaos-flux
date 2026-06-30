import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ComponentCapabilityActionContext, ComponentHandleRegistry } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';
import { dataRendererDefinitions } from '../index.js';

const SchemaRenderer = createDataSchemaRenderer();

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function listRoot() {
  return document.querySelector('.nop-list');
}

function itemLabels(): string[] {
  return Array.from(document.querySelectorAll('[data-slot="list-item"]')).map((node) =>
    node.textContent ? node.textContent.trim() : '',
  );
}

const twelveItems = Array.from({ length: 12 }, (_, i) => ({
  id: `k${i + 1}`,
  label: `Item ${i + 1}`,
}));

describe('list pagination integration', () => {
  it('slices items by page in local ownership (pageSize=3)', async () => {
    render(
      <SchemaRenderer
        schemaUrl="test://list/page-local"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              testid: 'page-list',
              items: twelveItems,
              pagination: { enabled: true, pageSize: 3, total: 12 },
              item: { type: 'text', text: '${$slot.item.label}' },
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(itemLabels()).toEqual(['Item 1', 'Item 2', 'Item 3']));
    const root = listRoot();
    expect(root?.getAttribute('data-current-page')).toBe('1');
    expect(root?.getAttribute('data-total-pages')).toBe('4');
  });

  it('clamps out-of-range currentPage to [1, totalPages]', async () => {
    render(
      <SchemaRenderer
        schemaUrl="test://list/page-clamp-high"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              items: twelveItems,
              pagination: { enabled: true, pageSize: 3, total: 12, currentPage: 99 },
              item: { type: 'text', text: '${$slot.item.label}' },
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(itemLabels()).toEqual(['Item 10', 'Item 11', 'Item 12']));
    expect(listRoot()?.getAttribute('data-current-page')).toBe('4');

    // currentPage below 1 clamps to first page
    cleanup();
    render(
      <SchemaRenderer
        schemaUrl="test://list/page-clamp-low"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              items: twelveItems,
              pagination: { enabled: true, pageSize: 3, total: 12, currentPage: -5 },
              item: { type: 'text', text: '${$slot.item.label}' },
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(itemLabels()).toEqual(['Item 1', 'Item 2', 'Item 3']));
    expect(listRoot()?.getAttribute('data-current-page')).toBe('1');
  });

  it('reads currentPage from paginationStatePath in scope ownership and slices', async () => {
    render(
      <SchemaRenderer
        schemaUrl="test://list/page-scope"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              items: twelveItems,
              pagination: { enabled: true, pageSize: 3, total: 12 },
              paginationOwnership: 'scope',
              paginationStatePath: 'pageInfo',
              item: { type: 'text', text: '${$slot.item.label}' },
            },
          ],
        }}
        data={{ pageInfo: { currentPage: 3, pageSize: 3 } }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(itemLabels()).toEqual(['Item 7', 'Item 8', 'Item 9']));
    expect(listRoot()?.getAttribute('data-current-page')).toBe('3');
  });

  it('degrades with a dev warning (no crash) when scope path is missing', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    render(
      <SchemaRenderer
        schemaUrl="test://list/page-scope-missing"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              items: twelveItems,
              pagination: { enabled: true, pageSize: 3, total: 12, currentPage: 2 },
              paginationOwnership: 'scope',
              paginationStatePath: 'missing.page',
              item: { type: 'text', text: '${$slot.item.label}' },
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(itemLabels().length).toBe(3));
    // Degrades to seed page (currentPage:2) without crashing.
    expect(itemLabels()).toEqual(['Item 4', 'Item 5', 'Item 6']);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('dispatches onPageChange and re-slices when gotoPage capability is invoked (local)', async () => {
    const registryRef: { current: ComponentHandleRegistry | undefined } = { current: undefined };

    render(
      <SchemaRenderer
        schemaUrl="test://list/gotoPage"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              id: 'list-cap',
              items: twelveItems,
              pagination: { enabled: true, pageSize: 3, total: 12 },
              onPageChange: {
                action: 'setValue',
                args: { path: 'reportedPage', value: true },
              },
              item: { type: 'text', text: '${$slot.item.label}' },
            },
            { type: 'text', text: 'reported:${reportedPage ? "yes" : "no"}' },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onComponentRegistryChange={(registry) => {
          registryRef.current = registry ?? undefined;
        }}
      />,
    );

    await waitFor(() => expect(itemLabels()).toEqual(['Item 1', 'Item 2', 'Item 3']));
    expect(screen.getByText('reported:no')).toBeTruthy();

    await waitFor(() => {
      expect(registryRef.current?.resolve({ componentId: 'list-cap' })?.capabilities).toBeTruthy();
    });

    const handle = registryRef.current!.resolve({ componentId: 'list-cap' })!;

    const result = await act(async () => {
      return (await handle.capabilities.invoke(
        'gotoPage',
        { page: 3 },
        {} as ComponentCapabilityActionContext,
      )) as {
        ok: boolean;
        data?: { currentPage: number };
      };
    });

    expect(result.ok).toBe(true);
    expect(result.data?.currentPage).toBe(3);
    await waitFor(() => expect(itemLabels()).toEqual(['Item 7', 'Item 8', 'Item 9']));
    await waitFor(() => expect(screen.getByText('reported:yes')).toBeTruthy());
  });

  it('list has zero component-level request fields (request-sink constraint)', () => {
    const listDef = dataRendererDefinitions.find((d) => d.type === 'list');
    expect(listDef).toBeTruthy();
    const fieldKeys = (listDef!.fields ?? []).map((f) => f.key);
    const contractKeys = Object.keys(listDef!.propContracts ?? {});
    const eventKeys = Object.keys(listDef!.eventContracts ?? {});
    const allKeys = new Set([...fieldKeys, ...contractKeys, ...eventKeys]);
    // No request-trigger fields: api / source / initFetch / action / interval / sendOn
    for (const forbidden of ['api', 'source', 'initFetch', 'action', 'interval', 'sendOn']) {
      expect(allKeys.has(forbidden)).toBe(false);
    }
  });

  it('renders all items when pagination is disabled (backwards compatible)', async () => {
    render(
      <SchemaRenderer
        schemaUrl="test://list/no-pagination"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              items: twelveItems,
              item: { type: 'text', text: '${$slot.item.label}' },
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(itemLabels().length).toBe(12));
    expect(listRoot()?.getAttribute('data-current-page')).toBeNull();
  });
});

describe('list infinite-scroll integration', () => {
  function triggerIntersection() {
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

  it('dispatches onLoadMore when the sentinel intersects', async () => {
    const onLoadMore = vi.fn();

    render(
      <SchemaRenderer
        schemaUrl="test://list/infinite-trigger"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              id: 'list-infinite',
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
          if (!actionScope) {
            return;
          }
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

    await waitFor(() => {
      expect(document.querySelector('[data-slot="list-infinite-sentinel"]')).toBeTruthy();
    });
    // Cumulative display: page 1 → first pageSize items.
    expect(itemLabels().length).toBe(3);

    expect(triggerIntersection()).toBe(true);

    await waitFor(() => expect(onLoadMore).toHaveBeenCalledTimes(1));
  });

  it('hides the sentinel and stops dispatching at the last page', async () => {
    const onLoadMore = vi.fn();

    render(
      <SchemaRenderer
        schemaUrl="test://list/infinite-last"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              id: 'list-infinite-last',
              items: twelveItems,
              pagination: { enabled: true, mode: 'infinite', pageSize: 6, total: 12 },
              onLoadMore: { action: 'probe:onLoadMore' },
              item: { type: 'text', text: '${$slot.item.label}' },
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={(actionScope) => {
          if (!actionScope) {
            return;
          }
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

    // pageSize=6, total=12 → 2 pages. Initially page 1, hasMore=true → sentinel present.
    await waitFor(() => {
      expect(document.querySelector('[data-slot="list-infinite-sentinel"]')).toBeTruthy();
    });
    expect(itemLabels().length).toBe(6);

    expect(triggerIntersection()).toBe(true);
    await waitFor(() => expect(onLoadMore).toHaveBeenCalledTimes(1));

    // After advancing to page 2 (currentPage >= totalPages), hasMore becomes false → sentinel removed.
    await waitFor(() => {
      expect(document.querySelector('[data-slot="list-infinite-sentinel"]')).toBeNull();
    });

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('does not crash when hasMore is explicitly false (no sentinel, no dispatch)', async () => {
    const onLoadMore = vi.fn();

    render(
      <SchemaRenderer
        schemaUrl="test://list/infinite-no-more"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              items: twelveItems,
              pagination: { enabled: true, mode: 'infinite', pageSize: 3, hasMore: false },
              onLoadMore: { action: 'probe:onLoadMore' },
              item: { type: 'text', text: '${$slot.item.label}' },
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={(actionScope) => {
          if (!actionScope) {
            return;
          }
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

    await waitFor(() => expect(itemLabels().length).toBeGreaterThan(0));
    // hasMore=false from the start → no sentinel rendered, no dispatch path.
    expect(document.querySelector('[data-slot="list-infinite-sentinel"]')).toBeNull();
    expect(onLoadMore).not.toHaveBeenCalled();
    expect(document.querySelector('[data-slot="list-infinite-status"]')?.textContent).toContain(
      t('flux.list.noMore'),
    );
  });
});
