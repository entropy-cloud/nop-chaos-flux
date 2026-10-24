import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ActionContext } from '@nop-chaos/flux-core';
import { buttonRenderer, createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

// P1-MA4.2-004 regression guard: stale-result governance on the renderer
// consumer side. A superseded (cancelled) load must not own loading state —
// the onSettle cancelled branch (crud-renderer-load.ts:293-302) early-returns
// so the NEWER dispatch owns `data-load-state`. Prior coverage had runtime
// unit tests for the race, a form-layer test behind full module mocks, and
// no integration assertion on out-of-order arrival at all (audit Round D
// D-01 / Round F F-01/F-02).

const STALE_ROWS = { items: [{ id: 's1', name: 'Stale-One' }], total: 1 };
const FRESH_ROWS = { items: [{ id: 'f1', name: 'Fresh-One' }], total: 1 };

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
});

describe('crud stale-result governance on out-of-order loads (P1-MA4.2-004)', () => {
  it('a superseded late response never projects rows or steals the load state from the newer request', async () => {
    const calls: string[] = [];
    const errorEvents: unknown[] = [];
    let resolveStaleFirst!: () => void;
    let loadCount = 0;

    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-stale-result-governance"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'stale-crud',
              loadAction: { action: 'probe:load', dependsOn: ['__crud_test__'] },
              onError: { action: 'probe:onError' },
              columns: [{ name: 'name', label: 'Name' }],
              itemKey: 'id',
              toolbar: [
                {
                  type: 'button',
                  label: 'ReloadNow',
                  onClick: { action: 'component:refresh', componentId: 'stale-crud' },
                },
              ],
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
              if (method === 'onError') {
                errorEvents.push((_payload as { error?: unknown } | undefined)?.error);
                return { ok: true, data: null };
              }
              if (method !== 'load') {
                return { ok: false, error: new Error(`Unsupported method: ${method}`) };
              }
              calls.push(method);
              loadCount += 1;
              if (loadCount === 1) {
                // First (about-to-be-superseded) load: hang until the test
                // resolves it AFTER the second load settled. Abort-aware:
                // once the newer dispatch aborts this controller, the late
                // resolve surfaces as {ok:false, cancelled:true}.
                return new Promise((resolve) => {
                  const signal = ctx.signal;
                  const onAbort = () => {
                    resolve({ ok: false, cancelled: true, data: STALE_ROWS });
                  };
                  if (signal?.aborted) {
                    onAbort();
                    return;
                  }
                  signal?.addEventListener('abort', onAbort, { once: true });
                  resolveStaleFirst = () => {
                    signal?.removeEventListener('abort', onAbort);
                    resolve({ ok: true, data: STALE_ROWS });
                  };
                });
              }
              return { ok: true, data: FRESH_ROWS };
            },
          });
        }}
      />,
    );

    await waitFor(() => expect(calls.length).toBeGreaterThanOrEqual(1));
    expect(screen.queryByText('Fresh-One')).toBeNull();

    // Supersede the hanging first load with a fast second one.
    fireEvent.click(screen.getByText('ReloadNow'));
    await waitFor(() => expect(screen.getByText('Fresh-One')).toBeTruthy());
    const crudRoot = document.querySelector('[data-load-state]');
    expect(crudRoot?.getAttribute('data-load-state')).toBe('ready');

    // The stale first response arrives late.
    act(() => {
      resolveStaleFirst();
    });

    await waitFor(() => {
      expect(screen.queryByText('Stale-One')).toBeNull();
      expect(screen.getByText('Fresh-One')).toBeTruthy();
      const root = document.querySelector('[data-load-state]');
      expect(root?.getAttribute('data-load-state')).toBe('ready');
    });
    // The superseded load must not own state OR report an error: the newer
    // dispatch owns the whole settle surface (cancelled branch :293-302).
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(errorEvents).toHaveLength(0);
  });
});
