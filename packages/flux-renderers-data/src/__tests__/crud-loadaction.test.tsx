import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ActionContext } from '@nop-chaos/flux-core';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

interface LoadCall {
  method: string;
  evaluationBindings: Record<string, unknown> | undefined;
}

function createLoadProbe(calls: LoadCall[], responseData: (bindings: Record<string, unknown> | undefined) => unknown) {
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
          return { ok: true, data: responseData(ctx.evaluationBindings) };
        }
        return { ok: false, error: new Error(`Unsupported method: ${method}`) };
      },
    });
  };
}

function getLoadCalls(calls: LoadCall[]) {
  return calls.filter((call) => call.method === 'load');
}

function makePageData(page: number, pageSize: number) {
  const startId = (page - 1) * pageSize + 1;
  const rows = Array.from({ length: pageSize }, (_, i) => ({
    id: String(startId + i),
    name: `Item ${startId + i}`,
  }));
  return { items: rows, total: 50, page, pageSize };
}

describe('CRUD loadAction', () => {
  it('dispatches loadAction on mount with pagination bindings', async () => {
    cleanup();
    const calls: LoadCall[] = [];
    const SchemaRenderer = createDataSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-loadaction-mount"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'load-crud',
              loadAction: { action: 'probe:load' },
              columns: [{ name: 'name', label: 'Name' }],
              rowKey: 'id',
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={createLoadProbe(calls, (b) =>
          makePageData(
            (b?.pagination as { currentPage?: number })?.currentPage ?? 1,
            (b?.pagination as { pageSize?: number })?.pageSize ?? 10,
          ),
        )}
      />,
    );

    await waitFor(() => {
      expect(calls.filter((c) => c.method === 'load')).toHaveLength(1);
    });

    const firstCall = calls[0];
    expect(firstCall.evaluationBindings?.pagination).toEqual({ currentPage: 1, pageSize: 10 });

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeTruthy();
      expect(screen.getByText('Item 10')).toBeTruthy();
    });
  });

  it('re-dispatches loadAction when page changes with correct pagination.currentPage', async () => {
    cleanup();
    const calls: LoadCall[] = [];
    const SchemaRenderer = createDataSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-loadaction-page"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'load-crud',
              loadAction: { action: 'probe:load' },
              columns: [{ name: 'name', label: 'Name' }],
              rowKey: 'id',
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={createLoadProbe(calls, (b) =>
          makePageData(
            (b?.pagination as { currentPage?: number })?.currentPage ?? 1,
            (b?.pagination as { pageSize?: number })?.pageSize ?? 10,
          ),
        )}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeTruthy();
    });

    const nextButton = document.querySelector('[aria-label="Go to next page"]');
    expect(nextButton).toBeTruthy();
    fireEvent.click(nextButton as Element);

    await waitFor(() => {
      const loadCalls = getLoadCalls(calls);
      expect(loadCalls).toHaveLength(2);
      expect(loadCalls[1]?.evaluationBindings?.pagination).toEqual({ currentPage: 2, pageSize: 10 });
    });

    await waitFor(() => {
      expect(screen.getByText('Item 11')).toBeTruthy();
    });
  });

  it('syncs server-returned page field back to CRUD pagination', async () => {
    cleanup();
    const calls: LoadCall[] = [];
    const SchemaRenderer = createDataSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-loadaction-server-page"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'load-crud',
              loadAction: { action: 'probe:load' },
              columns: [{ name: 'name', label: 'Name' }],
              rowKey: 'id',
              footerToolbar: [
                {
                  type: 'text',
                  text: 'Page: ${$crud.pagination.currentPage}',
                },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={createLoadProbe(calls, () => ({
          items: [{ id: '1', name: 'OnlyItem' }],
          total: 1,
          page: 1,
          pageSize: 10,
        }))}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Page: 1')).toBeTruthy();
    });
  });

  it('loadAllData mode fetches once and does not dispatch on page change', async () => {
    cleanup();
    const calls: LoadCall[] = [];
    const allRows = Array.from({ length: 25 }, (_, i) => ({
      id: String(i + 1),
      name: `Item ${i + 1}`,
    }));
    const SchemaRenderer = createDataSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-loadaction-loadall"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'load-crud',
              loadAction: { action: 'probe:load' },
              loadAllData: true,
              columns: [{ name: 'name', label: 'Name' }],
              rowKey: 'id',
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={createLoadProbe(calls, () => ({
          items: allRows,
          total: 25,
        }))}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeTruthy();
    });

    const initialLoadCount = calls.filter((c) => c.method === 'load').length;
    expect(initialLoadCount).toBe(1);

    const nextButton = screen.getByRole('button', { name: 'Go to next page' });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Item 11')).toBeTruthy();
      expect(screen.queryByText('Item 1')).toBeNull();
    });

    // Should still be only 1 load call — loadAllData caches
    expect(calls.filter((c) => c.method === 'load').length).toBe(1);
  });

  it('keeps current data and notifies on error when loadAction fails', async () => {
    cleanup();
    const notify = vi.fn();
    const calls: LoadCall[] = [];
    const SchemaRenderer = createDataSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-loadaction-error"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'load-crud',
              loadAction: { action: 'probe:load' },
              columns: [{ name: 'name', label: 'Name' }],
              rowKey: 'id',
            },
          ],
        }}
        env={{ ...env, notify }}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={(actionScope) => {
          if (!actionScope) return;
          (actionScope as {
            registerNamespace(ns: string, config: unknown): void;
          }).registerNamespace('probe', {
            kind: 'host',
            invoke(method: string, _payload: Record<string, unknown> | undefined, ctx: ActionContext) {
              calls.push({ method, evaluationBindings: ctx.evaluationBindings });
              if (method === 'load') {
                return { ok: false, error: new Error('Server down') };
              }
              return { ok: false, error: new Error(`Unsupported method: ${method}`) };
            },
          });
        }}
      />,
    );

    await waitFor(() => {
      expect(notify).toHaveBeenCalledWith('error', 'Server down');
    });

    // Data remains empty (initial state)
    expect(screen.queryByText('Item 1')).toBeNull();
    // Only one dispatch attempt
    expect(calls.filter((c) => c.method === 'load').length).toBe(1);
  });

  it('dispatches onError event instead of default toast when configured', async () => {
    cleanup();
    const notify = vi.fn();
    const errorEvents: unknown[] = [];
    const SchemaRenderer = createDataSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-loadaction-onerror"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'load-crud',
              loadAction: { action: 'probe:load' },
              onError: { action: 'probe:recordError', args: { msg: 'custom-error' } },
              columns: [{ name: 'name', label: 'Name' }],
              rowKey: 'id',
            },
          ],
        }}
        env={{ ...env, notify }}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={(actionScope) => {
          if (!actionScope) return;
          (actionScope as {
            registerNamespace(ns: string, config: unknown): void;
          }).registerNamespace('probe', {
            kind: 'host',
            invoke(method: string, payload: Record<string, unknown> | undefined, _ctx: ActionContext) {
              if (method === 'load') {
                return { ok: false, error: new Error('Server down') };
              }
              if (method === 'recordError') {
                errorEvents.push(payload);
                return { ok: true };
              }
              return { ok: false, error: new Error(`Unsupported method: ${method}`) };
            },
          });
        }}
      />,
    );

    await waitFor(() => {
      expect(errorEvents).toHaveLength(1);
      expect(errorEvents[0]).toMatchObject({ msg: 'custom-error' });
    });

    expect(notify).toHaveBeenCalledWith('error', 'Server down');
  });
});
