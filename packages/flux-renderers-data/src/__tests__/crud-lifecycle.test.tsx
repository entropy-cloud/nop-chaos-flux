import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  act,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ComponentCapabilityActionContext } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import { buttonRenderer, createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);

afterEach(() => {
  cleanup();
});

describe('CRUD polling orchestration (E1d)', () => {
  it('invokes start on the upstream data-source when polling is resumed via toggle', async () => {
    const invokeStartSpy = vi.fn();

    render(
      <SchemaRenderer
        schemaUrl="test://crud/polling-start"
        schema={{
          type: 'page',
          body: [
            {
              type: 'data-source',
              id: 'polling-ds',
              name: 'payload',
              action: 'ajax',
              args: { url: '/api/value' },
              initFetch: false,
            },
            {
              type: 'crud',
              id: 'polling-crud',
              source: '${payload}',
              polling: { enabled: true, sourceId: 'polling-ds' },
              toolbarLayout: {
                header: [{ type: 'polling-toggle' }],
              },
              columns: [{ name: 'name', label: 'Name' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onComponentRegistryChange={(registry) => {
          if (!registry) {
            return;
          }
          const handle = registry.resolve({ componentId: 'polling-ds' });
          if (handle?.capabilities) {
            const original = handle.capabilities.invoke.bind(handle.capabilities);
            handle.capabilities.invoke = (
              method: string,
              payload?: Record<string, unknown>,
              ctx?: ComponentCapabilityActionContext,
            ) => {
              if (method === 'start') {
                invokeStartSpy();
              }
              return (original as any)(method, payload, ctx);
            };
          }
        }}
      />,
    );

    await waitFor(() => {
      const toggleButton = document.querySelector(
        '[data-slot="header-toolbar-polling-toggle"] button',
      );
      expect(toggleButton).toBeTruthy();
    });

    const toggleButton = document.querySelector(
      '[data-slot="header-toolbar-polling-toggle"] button',
    ) as HTMLButtonElement;

    await act(async () => {
      fireEvent.click(toggleButton);
    });

    await waitFor(() => {
      expect(toggleButton.getAttribute('data-active')).toBeNull();
    });

    await act(async () => {
      fireEvent.click(toggleButton);
    });

    await waitFor(() => {
      expect(invokeStartSpy).toHaveBeenCalled();
    });
  });

  it('invokes cancel on the upstream data-source when CRUD unmounts', async () => {
    const invokeCancelSpy = vi.fn();

    function TestApp({ showCrud }: { showCrud: boolean }) {
      const body: any[] = [
        {
          type: 'data-source',
          id: 'polling-ds-stop',
          name: 'payload',
          action: 'ajax',
          args: { url: '/api/value' },
          initFetch: false,
        },
      ];
      if (showCrud) {
        body.push({
          type: 'crud',
          id: 'polling-crud-stop',
          source: '${payload}',
          polling: { enabled: true, sourceId: 'polling-ds-stop' },
          columns: [{ name: 'name', label: 'Name' }],
        });
      }
      return (
        <SchemaRenderer
          schemaUrl="test://crud/polling-stop"
          schema={{
            type: 'page',
            body,
          }}
          env={env}
          formulaCompiler={formulaCompiler}
          onComponentRegistryChange={(registry) => {
            if (!registry) {
              return;
            }
            const handle = registry.resolve({ componentId: 'polling-ds-stop' });
            if (handle?.capabilities) {
              const original = handle.capabilities.invoke.bind(handle.capabilities);
              handle.capabilities.invoke = (
                method: string,
                payload?: Record<string, unknown>,
                ctx?: ComponentCapabilityActionContext,
              ) => {
                if (method === 'cancel') {
                  invokeCancelSpy();
                }
                return (original as any)(method, payload, ctx);
              };
            }
          }}
        />
      );
    }

    const { rerender } = render(<TestApp showCrud={true} />);

    await waitFor(() => {
      const crudRoot = document.querySelector('.nop-crud');
      expect(crudRoot).toBeTruthy();
    });

    rerender(<TestApp showCrud={false} />);

    await waitFor(() => {
      expect(invokeCancelSpy).toHaveBeenCalled();
    });
  });

  it('addresses only the data-source matching polling.sourceId', async () => {
    const startCalls: string[] = [];

    render(
      <SchemaRenderer
        schemaUrl="test://crud/polling-sourceid"
        schema={{
          type: 'page',
          body: [
            {
              type: 'data-source',
              id: 'ds-a',
              name: 'payloadA',
              action: 'ajax',
              args: { url: '/api/a' },
              initFetch: false,
            },
            {
              type: 'data-source',
              id: 'ds-b',
              name: 'payloadB',
              action: 'ajax',
              args: { url: '/api/b' },
              initFetch: false,
            },
            {
              type: 'crud',
              id: 'crud-sourceid',
              source: '${payloadA}',
              polling: { enabled: true, sourceId: 'ds-b' },
              toolbarLayout: {
                header: [{ type: 'polling-toggle' }],
              },
              columns: [{ name: 'name', label: 'Name' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onComponentRegistryChange={(registry) => {
          if (!registry) {
            return;
          }
          for (const id of ['ds-a', 'ds-b']) {
            const handle = registry.resolve({ componentId: id });
            if (handle?.capabilities) {
              const original = handle.capabilities.invoke.bind(handle.capabilities);
              handle.capabilities.invoke = (
                method: string,
                payload?: Record<string, unknown>,
                ctx?: ComponentCapabilityActionContext,
              ) => {
                if (method === 'start') {
                  startCalls.push(id);
                }
                return (original as any)(method, payload, ctx);
              };
            }
          }
        }}
      />,
    );

    await waitFor(() => {
      const toggleButton = document.querySelector(
        '[data-slot="header-toolbar-polling-toggle"] button',
      );
      expect(toggleButton).toBeTruthy();
    });

    const toggleButton = document.querySelector(
      '[data-slot="header-toolbar-polling-toggle"] button',
    ) as HTMLButtonElement;

    startCalls.length = 0;

    await act(async () => {
      fireEvent.click(toggleButton);
    });

    await waitFor(() => {
      expect(toggleButton.getAttribute('data-active')).toBeNull();
    });

    await act(async () => {
      fireEvent.click(toggleButton);
    });

    await waitFor(() => {
      expect(startCalls).toContain('ds-b');
    });
    expect(startCalls).not.toContain('ds-a');
  });
});

describe('CRUD filterTogglable (E1d)', () => {
  it('renders query region in collapsed state when filterTogglable defaultCollapsed is true', async () => {
    render(
      <SchemaRenderer
        schemaUrl="test://crud/filter-collapsed"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'crud-filter-collapsed',
              source: [{ id: '1', name: 'Alice' }],
              filterTogglable: { defaultCollapsed: true },
              queryForm: {
                body: [{ type: 'input-text', name: 'keyword', label: 'Keyword' }],
              },
              columns: [{ name: 'name', label: 'Name' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      const toggleRoot = document.querySelector('[data-slot="crud-query"]');
      expect(toggleRoot).toBeTruthy();
    });

    const collapseContainer = document.querySelector('[data-slot="crud-query-collapse"]');
    expect(collapseContainer).toBeTruthy();

    const expandButton = screen.queryByRole('button', { name: t('flux.crud.expandQuery') });
    expect(expandButton).toBeTruthy();

    const keywordInput = screen.queryByLabelText('Keyword');
    expect(keywordInput).toBeNull();
  });

  it('expands the query region when the toggle button is clicked', async () => {
    render(
      <SchemaRenderer
        schemaUrl="test://crud/filter-expand"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'crud-filter-expand',
              source: [{ id: '1', name: 'Alice' }],
              filterTogglable: { defaultCollapsed: true },
              queryForm: {
                body: [{ type: 'input-text', name: 'keyword', label: 'Keyword' }],
              },
              columns: [{ name: 'name', label: 'Name' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(document.querySelector('[data-slot="crud-query-collapse"]')).toBeTruthy();
    });

    expect(screen.queryByLabelText('Keyword')).toBeNull();

    const expandButton = screen.getByRole('button', { name: t('flux.crud.expandQuery') });
    await act(async () => {
      fireEvent.click(expandButton);
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Keyword')).toBeTruthy();
    });
  });
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
});
