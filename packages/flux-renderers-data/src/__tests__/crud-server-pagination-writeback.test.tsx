import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import type { ActionContext } from '@nop-chaos/flux-core';
import { buttonRenderer, createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

// P1-MA4.2-005 regression guard: serverPagination corrective write-back.
// When a page-mode CRUD response carries server pagination facts on top of
// rows/total (top-level `page|currentPage` / `pageSize|perPage`), the
// corrected page/pageSize must be written back to the pagination state path
// (crud-renderer-load.ts:336-343, extracted in crud-renderer-state.ts:325-345)
// and the loop must stay bounded — the correction itself is the only second
// load trigger here (the write-back feeds the pagination state selector that
// the load effect depends on; scope.update value-equality absorbs the second
// identical correction, so the loop self-stabilizes at 2 loads).
beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
});

describe('crud serverPagination corrective write-back (P1-MA4.2-005)', () => {
  it('corrects scope pagination from the server response and stabilizes without a reload loop', async () => {
    const loadBindings: Array<Record<string, unknown> | undefined> = [];

    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-server-pagination-writeback"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'server-page-crud',
              loadAction: { action: 'probe:load', dependsOn: ['__crud_test__'] },
              columns: [{ name: 'name', label: 'Name' }],
              itemKey: 'id',
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={(actionScope: unknown) => {
          if (!actionScope) {
            return;
          }
          (actionScope as {
            registerNamespace(ns: string, config: unknown): void;
          }).registerNamespace('probe', {
            kind: 'host',
            invoke(method: string, _payload: Record<string, unknown> | undefined, ctx: ActionContext) {
              if (method !== 'load') {
                return { ok: false, error: new Error(`Unsupported method: ${method}`) };
              }
              const bindings = (ctx.evaluationBindings ?? {}) as {
                pagination?: { currentPage?: number; pageSize?: number };
              };
              loadBindings.push(bindings.pagination);
              // Server "says otherwise": client asked page 1/10, server
              // returns page-3 rows with page=3/pageSize=50 on top.
              return {
                ok: true,
                data: {
                  items: [
                    { id: '101', name: 'Item 101' },
                    { id: '102', name: 'Item 102' },
                  ],
                  total: 500,
                  page: 3,
                  pageSize: 50,
                },
              };
            },
          });
        }}
      />,
    );

    await waitFor(() => expect(screen.getByText('Item 101')).toBeTruthy());

    // The corrected pagination must reach the second load's bindings.
    await waitFor(() => {
      const second = loadBindings[1];
      expect(second?.currentPage).toBe(3);
      expect(second?.pageSize).toBe(50);
    });

    // Loop bounded: value-equality absorbs the second identical correction.
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(loadBindings.length).toBeLessThanOrEqual(3);
    // Page-3 rows stay projected.
    expect(screen.getByText('Item 102')).toBeTruthy();
  });
});
