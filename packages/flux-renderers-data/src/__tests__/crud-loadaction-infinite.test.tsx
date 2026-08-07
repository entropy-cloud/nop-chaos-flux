import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ActionContext } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

interface LoadCall {
  method: string;
  evaluationBindings: Record<string, unknown> | undefined;
}

function makePageData(page: number, pageSize: number, total = 50) {
  const startId = (page - 1) * pageSize + 1;
  const rows = Array.from({ length: pageSize }, (_, i) => ({
    id: String(startId + i),
    name: `Item ${startId + i}`,
  }));
  return { items: rows, total, page, pageSize };
}

describe('CRUD loadAction × infinite accumulate (1-2)', () => {
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

  function createLoadProbe(
    calls: LoadCall[],
    respond: (pagination: { currentPage?: number; pageSize?: number }) => unknown,
  ) {
    return (actionScope: unknown) => {
      if (!actionScope) {
        return;
      }
      (actionScope as {
        registerNamespace(ns: string, config: unknown): void;
      }).registerNamespace('probe', {
        kind: 'host',
        invoke(method: string, _payload: Record<string, unknown> | undefined, ctx: ActionContext) {
          calls.push({ method, evaluationBindings: ctx.evaluationBindings });
          if (method === 'load') {
            const bindings = ctx.evaluationBindings ?? {};
            const pagination = (bindings as { pagination?: Record<string, unknown> }).pagination ?? {};
            return {
              ok: true,
              data: respond(pagination as { currentPage?: number; pageSize?: number }),
            };
          }
          return { ok: false, error: new Error(`Unsupported method: ${method}`) };
        },
      });
    };
  }

  it('accumulates rows across load-more pages instead of replacing them', async () => {
    cleanup();
    const calls: LoadCall[] = [];
    const SchemaRenderer = createDataSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-loadaction-infinite-accumulate"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'crud-infinite-acc',
              loadAction: { action: 'probe:load', dependsOn: ['__crud_test__'] },
              pagination: { mode: 'infinite' },
              columns: [{ name: 'name', label: 'Name' }],
              rowKey: 'id',
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={createLoadProbe(calls, (pagination) =>
          makePageData(pagination.currentPage ?? 1, pagination.pageSize ?? 10),
        )}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeTruthy();
    });

    // First load-more: page 2 rows must be appended, not replace page 1.
    triggerIntersection('[data-slot="crud-infinite-sentinel"]');
    await waitFor(() => {
      expect(screen.getByText('Item 11')).toBeTruthy();
    });
    expect(screen.getByText('Item 1')).toBeTruthy();

    // Second load-more: page 3 rows appended on top of the accumulated set.
    triggerIntersection('[data-slot="crud-infinite-sentinel"]');
    await waitFor(() => {
      expect(screen.getByText('Item 21')).toBeTruthy();
    });
    expect(screen.getByText('Item 1')).toBeTruthy();
    expect(screen.getByText('Item 11')).toBeTruthy();

    expect(calls.filter((c) => c.method === 'load')).toHaveLength(3);
  });

  it('stops at the last page: bounded requests and the full accumulated rows stay visible', async () => {
    cleanup();
    const calls: LoadCall[] = [];
    const SchemaRenderer = createDataSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-loadaction-infinite-last"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'crud-infinite-last-acc',
              loadAction: { action: 'probe:load', dependsOn: ['__crud_test__'] },
              pagination: { mode: 'infinite' },
              columns: [{ name: 'name', label: 'Name' }],
              rowKey: 'id',
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={createLoadProbe(calls, (pagination) => {
          const page = pagination.currentPage ?? 1;
          const pageSize = pagination.pageSize ?? 10;
          // Page 1 holds 10 rows; the short final page holds the remaining 5
          // (offset contract: rows 11-15 follow the 10-row first page).
          if (page >= 2) {
            const finalPageRows = Array.from({ length: 5 }, (_, i) => ({
              id: String(11 + i),
              name: `Item ${11 + i}`,
            }));
            // The server echoes the REQUESTED pageSize (offset contract); only
            // the last page's payload is short.
            return { items: finalPageRows, total: 15, page, pageSize };
          }
          return makePageData(page, pageSize, 15);
        })}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeTruthy();
    });

    triggerIntersection('[data-slot="crud-infinite-sentinel"]');
    await waitFor(() => {
      expect(screen.getByText('Item 15')).toBeTruthy();
    });
    expect(screen.getByText('Item 1')).toBeTruthy();

    // Last page reached (currentPage 2 >= ceil(15/10)): further sentinel
    // triggers must not race through to page 3+ — no runaway page fetches.
    const loadCount = calls.filter((c) => c.method === 'load').length;
    triggerIntersection('[data-slot="crud-infinite-sentinel"]');
    triggerIntersection('[data-slot="crud-infinite-sentinel"]');
    await waitFor(() => {
      expect(calls.filter((c) => c.method === 'load')).toHaveLength(loadCount);
    });
    expect(screen.getByText('Item 1')).toBeTruthy();
    expect(screen.getByText('Item 15')).toBeTruthy();
  });

  it('surfaces a page-fetch failure through the infinite hook (thenable load-more + G5 guard)', async () => {
    cleanup();
    let loadCount = 0;
    let resolvePage2: ((value: unknown) => void) | undefined;
    const SchemaRenderer = createDataSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-loadaction-infinite-error"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'crud-infinite-error',
              loadAction: { action: 'probe:load', dependsOn: ['__crud_test__'] },
              pagination: { mode: 'infinite' },
              columns: [{ name: 'name', label: 'Name' }],
              rowKey: 'id',
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={(actionScope) => {
          if (!actionScope) {
            return;
          }
          (actionScope as {
            registerNamespace(ns: string, config: unknown): void;
          }).registerNamespace('probe', {
            kind: 'host',
            invoke(method: string) {
              if (method === 'load') {
                loadCount += 1;
                if (loadCount === 1) {
                  return { ok: true, data: makePageData(1, 10) };
                }
                return new Promise((resolve) => {
                  resolvePage2 = resolve;
                });
              }
              return { ok: false, error: new Error(`Unsupported method: ${method}`) };
            },
          });
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeTruthy();
    });

    triggerIntersection('[data-slot="crud-infinite-sentinel"]');

    // handleLoadMore must return a thenable: the infinite hook owns loading.
    await waitFor(() => {
      const status = document.querySelector('[data-slot="crud-infinite-status"]');
      expect(status?.textContent ?? '').toContain(t('flux.crud.loadingMore'));
    });

    // G5 concurrent guard: a repeated trigger while the fetch is pending must
    // not start a second page load.
    triggerIntersection('[data-slot="crud-infinite-sentinel"]');
    expect(loadCount).toBe(2);

    resolvePage2?.({ ok: false, error: new Error('Server down') });
    await waitFor(() => {
      const status = document.querySelector('[data-slot="crud-infinite-status"]');
      expect(status?.textContent ?? '').toContain(t('flux.crud.loadFailed'));
    });
  });

  it('2-9: retries the failed page instead of bumping to the next one (loadAction mode)', async () => {
    cleanup();
    const requestedPages: number[] = [];
    let failPage2 = true;
    const SchemaRenderer = createDataSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-loadaction-infinite-retry"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'crud-infinite-retry',
              loadAction: { action: 'probe:load', dependsOn: ['__crud_test__'] },
              pagination: { mode: 'infinite' },
              columns: [{ name: 'name', label: 'Name' }],
              rowKey: 'id',
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={(actionScope) => {
          if (!actionScope) {
            return;
          }
          (actionScope as {
            registerNamespace(ns: string, config: unknown): void;
          }).registerNamespace('probe', {
            kind: 'host',
            invoke(method: string, _payload: Record<string, unknown> | undefined, ctx: ActionContext) {
              if (method === 'load') {
                const bindings = ctx.evaluationBindings ?? {};
                const current = (bindings as { pagination?: { currentPage?: number } })
                  .pagination?.currentPage ?? 1;
                requestedPages.push(current);
                if (current === 2 && failPage2) {
                  failPage2 = false;
                  return { ok: false, error: new Error('Server down') };
                }
                return { ok: true, data: makePageData(current, 10) };
              }
              return { ok: false, error: new Error(`Unsupported method: ${method}`) };
            },
          });
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeTruthy();
    });
    expect(requestedPages).toEqual([1]);

    // Load-more to page 2 → the fetch fails → the retry button appears.
    triggerIntersection('[data-slot="crud-infinite-sentinel"]');
    await waitFor(() => {
      const status = document.querySelector('[data-slot="crud-infinite-status"]');
      expect(status?.textContent ?? '').toContain(t('flux.crud.loadFailed'));
    });

    // Retry must re-request page 2 (the failed page), NOT bump to page 3.
    fireEvent.click(screen.getByRole('button', { name: t('flux.common.retry') }));
    await waitFor(() => {
      expect(requestedPages).toEqual([1, 2, 2]);
    });

    // The page-2 rows land on the retry (accumulated on top of page 1).
    await waitFor(() => {
      expect(screen.getByText('Item 11')).toBeTruthy();
    });
    expect(screen.getByText('Item 1')).toBeTruthy();
    expect(screen.getByText('Item 20')).toBeTruthy();
  });
});
