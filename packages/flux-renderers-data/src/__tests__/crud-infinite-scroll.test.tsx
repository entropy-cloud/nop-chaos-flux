import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  act,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@nop-chaos/flux-i18n';
import { buttonRenderer, createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);

afterEach(() => {
  cleanup();
});

describe('CRUD infinite scroll (E1d)', () => {
  function triggerIntersection(sentinelSelector: string) {
    const sentinel = document.querySelector(sentinelSelector);
    if (!sentinel) {
      throw new Error(`Sentinel ${sentinelSelector} not found`);
    }
    act(() => {
      const observer = (window as unknown as { __crudInfiniteObserver?: IntersectionObserver })
        .__crudInfiniteObserver;
      if (observer) {
        (observer as unknown as { __fireIntersection: (el: Element) => void }).__fireIntersection(
          sentinel,
        );
      } else {
        sentinel.dispatchEvent(new CustomEvent('crud-infinite-intersect'));
      }
    });
  }

  it('triggers next-page load when sentinel intersects', async () => {
    const onNextPage = vi.fn();

    render(
      <SchemaRenderer
        schemaUrl="test://crud/infinite-trigger"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'crud-infinite',
              source: [
                { id: '1', name: 'Alice' },
                { id: '2', name: 'Bob' },
                { id: '3', name: 'Charlie' },
                { id: '4', name: 'Dave' },
                { id: '5', name: 'Eve' },
                { id: '6', name: 'Fiona' },
                { id: '7', name: 'George' },
                { id: '8', name: 'Hannah' },
                { id: '9', name: 'Ivan' },
                { id: '10', name: 'Judy' },
                { id: '11', name: 'Kevin' },
                { id: '12', name: 'Linda' },
              ],
              pagination: { mode: 'infinite' },
              pageSizeStatePath: 'infinite.pageSize',
              paginationOwnership: 'scope',
              paginationStatePath: 'infinite.pagination',
              onRefresh: { action: 'probe:onNextPage' },
              columns: [{ name: 'name', label: 'Name' }],
            },
          ],
        }}
        data={{ infinite: { pagination: { currentPage: 1, pageSize: 5 } } }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={(actionScope) => {
          if (!actionScope) {
            return;
          }
          actionScope.registerNamespace('probe', {
            kind: 'host',
            invoke(method: string) {
              if (method === 'onNextPage') {
                onNextPage();
                return { ok: true };
              }
              return { ok: false, error: new Error(`Unsupported: ${method}`) };
            },
          });
        }}
      />,
    );

    await waitFor(() => {
      const sentinel = document.querySelector('[data-slot="crud-infinite-sentinel"]');
      expect(sentinel).toBeTruthy();
    });

    triggerIntersection('[data-slot="crud-infinite-sentinel"]');

    await waitFor(() => {
      expect(onNextPage).toHaveBeenCalled();
    });
  });

  it('disables infinite trigger when clientMode.loadDataOnce is true', async () => {
    render(
      <SchemaRenderer
        schemaUrl="test://crud/infinite-loadOnce"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'crud-infinite-loadOnce',
              source: [{ id: '1', name: 'Alice' }],
              pagination: { mode: 'infinite' },
              clientMode: { loadDataOnce: true },
              paginationOwnership: 'scope',
              paginationStatePath: 'infinite.pagination',
              columns: [{ name: 'name', label: 'Name' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      const marker = document.querySelector('[data-slot="crud-infinite-status"]');
      expect(marker).toBeTruthy();
      expect(marker?.textContent ?? '').toContain(t('flux.crud.loadedAll', { count: 1 }));
    });

    expect(document.querySelector('[data-slot="crud-infinite-sentinel"]')).toBeNull();
  });

  it('stops triggering next-page load at last page', async () => {
    const onNextPage = vi.fn();

    render(
      <SchemaRenderer
        schemaUrl="test://crud/infinite-last"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'crud-infinite-last',
              source: [
                { id: '1', name: 'Alice' },
                { id: '2', name: 'Bob' },
              ],
              pagination: { mode: 'infinite' },
              paginationOwnership: 'scope',
              paginationStatePath: 'infiniteLast.pagination',
              onRefresh: { action: 'probe:onNextPage' },
              columns: [{ name: 'name', label: 'Name' }],
            },
          ],
        }}
        data={{ infiniteLast: { pagination: { currentPage: 1, pageSize: 5 }, total: 2 } }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={(actionScope) => {
          if (!actionScope) {
            return;
          }
          actionScope.registerNamespace('probe', {
            kind: 'host',
            invoke(method: string) {
              if (method === 'onNextPage') {
                onNextPage();
                return { ok: true };
              }
              return { ok: false, error: new Error(`Unsupported: ${method}`) };
            },
          });
        }}
      />,
    );

    await waitFor(() => {
      const sentinel = document.querySelector('[data-slot="crud-infinite-sentinel"]');
      expect(sentinel).toBeTruthy();
    });

    triggerIntersection('[data-slot="crud-infinite-sentinel"]');

    expect(onNextPage).not.toHaveBeenCalled();
  });

  it('2-9: infinite retry re-requests the current page in source mode (no page skip)', async () => {
    cleanup();
    let refreshCount = 0;
    const SchemaRenderer = createDataSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://crud/infinite-retry-source"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'crud-infinite-retry-source',
              source: Array.from({ length: 30 }, (_, i) => ({
                id: String(i + 1),
                name: `Item ${i + 1}`,
              })),
              pagination: { mode: 'infinite' },
              paginationOwnership: 'scope',
              paginationStatePath: 'infRetry.pagination',
              onRefresh: { action: 'probe:refresh' },
              footerToolbar: [
                { type: 'text', text: 'Page: ${$crud.pagination.currentPage}' },
              ],
              columns: [{ name: 'name', label: 'Name' }],
            },
          ],
        }}
        data={{ infRetry: { pagination: { currentPage: 1, pageSize: 5 } } }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={(actionScope) => {
          if (!actionScope) {
            return;
          }
          actionScope.registerNamespace('probe', {
            kind: 'host',
            invoke(method: string) {
              if (method === 'refresh') {
                refreshCount += 1;
                if (refreshCount === 1) {
                  return { ok: false, error: new Error('Server down') };
                }
                return { ok: true };
              }
              return { ok: false, error: new Error(`Unsupported: ${method}`) };
            },
          });
        }}
      />,
    );

    await waitFor(() => {
      const sentinel = document.querySelector('[data-slot="crud-infinite-sentinel"]');
      expect(sentinel).toBeTruthy();
    });

    // Load-more bumps to page 2; the refresh dispatch fails → retry button.
    triggerIntersection('[data-slot="crud-infinite-sentinel"]');
    await waitFor(() => {
      const status = document.querySelector('[data-slot="crud-infinite-status"]');
      expect(status?.textContent ?? '').toContain(t('flux.crud.loadFailed'));
    });
    expect(screen.getByText('Page: 2')).toBeTruthy();

    // Retry re-fires the refresh with the SAME page (2) — the failed page is
    // retried instead of skipping to page 3 (2-9).
    fireEvent.click(screen.getByRole('button', { name: t('flux.common.retry') }));
    await waitFor(() => {
      expect(refreshCount).toBe(2);
    });
    expect(screen.getByText('Page: 2')).toBeTruthy();
  });
});
