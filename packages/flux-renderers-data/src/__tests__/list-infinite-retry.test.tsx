import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

const SchemaRenderer = createDataSchemaRenderer();

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/**
 * G3-视角5-03 (V12b plan 485 Phase 2): a failed infinite load shows the
 * 'Load failed' status AND a retry entry (crud-infinite-scroll-area
 * precedent). Retrying re-dispatches onLoadMore for the CURRENT page and
 * clears the error on success.
 */
describe('list infinite-scroll load-failure retry (G3-视角5-03)', () => {
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

  it('offers a retry entry after a failed load and recovers on retry', async () => {
    const onLoadMore = vi.fn();
    let failures = 0;

    render(
      <SchemaRenderer
        schemaUrl="test://list/infinite-retry"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              id: 'list-retry',
              items: Array.from({ length: 12 }, (_, i) => ({ id: `k${i + 1}`, label: `Item ${i + 1}` })),
              pagination: { enabled: true, mode: 'infinite', pageSize: 3, total: 12 },
              onLoadMore: [{ action: 'probe:onLoadMore' }],
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
                // First trigger fails the way the action dispatcher reports
                // failures (resolved ActionResult { ok:false }).
                if (failures === 0) {
                  failures += 1;
                  return { ok: false, error: 'boom' };
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
      expect(document.querySelector('[data-slot="list-infinite-sentinel"]')).toBeTruthy();
    });

    triggerIntersection();
    await waitFor(() => expect(onLoadMore).toHaveBeenCalledTimes(1));

    // Failure surfaces in the status line...
    await waitFor(() => {
      expect(document.querySelector('[data-slot="list-infinite-status"]')?.textContent).toContain('Load failed');
    });
    // ...and the retry entry exists (previously absent — dead end).
    const retry = document.querySelector<HTMLButtonElement>('[data-slot="list-infinite-retry"]');
    expect(retry).not.toBeNull();

    // Retry re-dispatches onLoadMore and clears the error surface.
    retry!.click();
    await waitFor(() => expect(onLoadMore).toHaveBeenCalledTimes(2));
    await waitFor(() => {
      expect(document.querySelector('[data-slot="list-infinite-retry"]')).toBeNull();
    });
    expect(document.querySelector('[data-slot="list-infinite-status"]')?.textContent).not.toContain('Load failed');
  });
});
