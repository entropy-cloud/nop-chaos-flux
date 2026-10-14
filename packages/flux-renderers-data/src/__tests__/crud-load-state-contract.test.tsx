import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { ActionContext } from '@nop-chaos/flux-core';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

/**
 * CRUD / table 加载就绪 DOM 契约测试（plan 593 C2 + C3）
 *
 * C2 — `.nop-crud` 根 `data-load-state`（vocab: idle | loading | ready | error）：
 *  - loadAction 模式：首帧即 `loading`（无 busy 缺席窗口），settle 后 `ready`，
 *    失败 `error`；enabled 假时 `idle`。
 *  - source 模式：已知 in-flight 时 `loading`，不可知保持 `idle`。
 *
 * C3 — table 投影：
 *  - `.nop-table` 根在 loading 时输出 `data-loading=""` + `aria-busy="true"`。
 *  - 首载空行 `[data-slot="table-empty-row"]` 带 `data-loading-placeholder`，
 *    真·零结果不带（区分"还在加载"与"确实没数据"）。
 *
 * 配套文档：`docs/architecture/renderer-markers-and-selectors.md`（Phase 5 登记）。
 */

interface DeferredLoad {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}

function createDeferredProbe(deferred: { current: DeferredLoad | null }) {
  return (actionScope: unknown) => {
    if (!actionScope) {
      return;
    }
    (actionScope as { registerNamespace(ns: string, config: unknown): void }).registerNamespace(
      'probe',
      {
        kind: 'host',
        invoke(method: string, _payload: Record<string, unknown> | undefined, _ctx: ActionContext) {
          if (method === 'load') {
            return new Promise((resolve) => {
              deferred.current = {
                resolve: (value: unknown) => resolve({ ok: true, data: value }),
                reject: (reason?: unknown) => resolve({ ok: false, error: reason ?? new Error('fail') }),
              };
            });
          }
          return { ok: false, error: new Error(`Unsupported method: ${method}`) };
        },
      },
    );
  };
}

function createInstantProbe(respond: () => unknown) {
  return (actionScope: unknown) => {
    if (!actionScope) {
      return;
    }
    (actionScope as { registerNamespace(ns: string, config: unknown): void }).registerNamespace(
      'probe',
      {
        kind: 'host',
        invoke(method: string) {
          if (method === 'load') {
            return { ok: true, data: respond() };
          }
          return { ok: false, error: new Error(`Unsupported method: ${method}`) };
        },
      },
    );
  };
}

function crudRoot() {
  return document.querySelector('.nop-crud');
}

function tableRoot() {
  return document.querySelector('.nop-table');
}

function emptyRow() {
  return document.querySelector('[data-slot="table-empty-row"]');
}

afterEach(() => cleanup());

describe('CRUD data-load-state DOM contract (plan 593 C2)', () => {
  it('loadAction CRUD first frame reports data-load-state=loading (first-frame-honest)', async () => {
    const deferred: { current: DeferredLoad | null } = { current: null };
    const SchemaRenderer = createDataSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-load-state-first-frame"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'crud-load-state-ff',
              loadAction: { action: 'probe:load', dependsOn: ['__init_load__'] },
              columns: [{ name: 'name', label: 'Name' }],
              rowKey: 'id',
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={createDeferredProbe(deferred)}
      />,
    );

    // First committed frame reports loading — pins the observable contract that
    // no idle frame precedes the load. Caveat (plan 593 closure audit F3): RTL's
    // render() flushes passive effects inside act, so this assertion alone does
    // NOT discriminate lazy-init from a synchronous effect-time setState; the
    // first-frame-honest property (lazy initializer in crud-renderer-load.ts) is
    // verified by source reading. It still catches async/deferred setState.
    expect(crudRoot()?.getAttribute('data-load-state')).toBe('loading');

    // While the load request is still in flight the root MUST still report
    // loading — this is the first-frame-honest contract.
    await waitFor(() => {
      expect(crudRoot()?.getAttribute('data-load-state')).toBe('loading');
    });
    expect(deferred.current).toBeTruthy();
  });

  it('loadAction CRUD transitions to ready after settle, with rows hydrated', async () => {
    const deferred: { current: DeferredLoad | null } = { current: null };
    const SchemaRenderer = createDataSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-load-state-ready"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'crud-load-state-ready',
              loadAction: { action: 'probe:load', dependsOn: ['__init_load__'] },
              columns: [{ name: 'name', label: 'Name' }],
              rowKey: 'id',
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={createDeferredProbe(deferred)}
      />,
    );

    await waitFor(() => {
      expect(crudRoot()?.getAttribute('data-load-state')).toBe('loading');
    });

    await act(async () => {
      deferred.current?.resolve({ items: [{ id: '1', name: 'Alice' }], total: 1 });
    });

    await waitFor(() => {
      expect(crudRoot()?.getAttribute('data-load-state')).toBe('ready');
    });
  });

  it('loadAction CRUD failure transitions to error', async () => {
    const deferred: { current: DeferredLoad | null } = { current: null };
    const SchemaRenderer = createDataSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-load-state-error"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'crud-load-state-error',
              loadAction: { action: 'probe:load', dependsOn: ['__init_load__'] },
              columns: [{ name: 'name', label: 'Name' }],
              rowKey: 'id',
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={createDeferredProbe(deferred)}
      />,
    );

    await waitFor(() => {
      expect(crudRoot()?.getAttribute('data-load-state')).toBe('loading');
    });

    await act(async () => {
      deferred.current?.reject(new Error('network down'));
    });

    await waitFor(() => {
      expect(crudRoot()?.getAttribute('data-load-state')).toBe('error');
    });
  });

  it('source-mode CRUD (no loadAction) stays idle when loading is unknowable', async () => {
    const SchemaRenderer = createDataSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-load-state-source-idle"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'crud-load-state-source',
              source: [{ id: '1', name: 'Bob' }],
              columns: [{ name: 'name', label: 'Name' }],
              rowKey: 'id',
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(crudRoot()?.getAttribute('data-load-state')).toBe('idle');
    });
  });
});

describe('table loading DOM contract (plan 593 C3)', () => {
  it('first-load empty row carries data-loading-placeholder while loading; true-empty does not', async () => {
    const deferred: { current: DeferredLoad | null } = { current: null };
    const SchemaRenderer = createDataSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-table-loading-placeholder"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'crud-table-placeholder',
              loadAction: { action: 'probe:load', dependsOn: ['__init_load__'] },
              columns: [{ name: 'name', label: 'Name' }],
              rowKey: 'id',
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={createDeferredProbe(deferred)}
      />,
    );

    // While in-flight: empty row is a loading placeholder, and the table root
    // exposes the machine-readable loading signals.
    await waitFor(() => {
      expect(emptyRow()?.hasAttribute('data-loading-placeholder')).toBe(true);
    });
    await waitFor(() => {
      expect(tableRoot()?.hasAttribute('data-loading')).toBe(true);
    });
    expect(tableRoot()?.getAttribute('aria-busy')).toBe('true');

    // After settle with a true-empty result: placeholder flag is gone.
    await act(async () => {
      deferred.current?.resolve({ items: [], total: 0 });
    });

    await waitFor(() => {
      expect(emptyRow()?.hasAttribute('data-loading-placeholder')).toBe(false);
    });
    await waitFor(() => {
      expect(tableRoot()?.hasAttribute('data-loading')).toBe(false);
    });
    expect(tableRoot()?.getAttribute('aria-busy')).toBeNull();
  });

  it('true empty result (instant load, zero rows) never carries the placeholder flag', async () => {
    const SchemaRenderer = createDataSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-table-true-empty"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'crud-table-true-empty',
              loadAction: { action: 'probe:load', dependsOn: ['__init_load__'] },
              columns: [{ name: 'name', label: 'Name' }],
              rowKey: 'id',
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={createInstantProbe(() => ({ items: [], total: 0 }))}
      />,
    );

    await waitFor(() => {
      expect(emptyRow()).toBeTruthy();
    });
    // After the instant load settles the empty row exists as a true-empty
    // result — it must NOT claim to be a loading placeholder.
    expect(emptyRow()?.hasAttribute('data-loading-placeholder')).toBe(false);
  });

  it('table root data-loading + aria-busy track the loadAction loading window', async () => {
    const deferred: { current: DeferredLoad | null } = { current: null };
    const SchemaRenderer = createDataSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-table-loading-window"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'crud-table-window',
              loadAction: { action: 'probe:load', dependsOn: ['__init_load__'] },
              columns: [{ name: 'name', label: 'Name' }],
              rowKey: 'id',
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={createDeferredProbe(deferred)}
      />,
    );

    await waitFor(() => {
      expect(tableRoot()?.hasAttribute('data-loading')).toBe(true);
    });
    expect(tableRoot()?.getAttribute('aria-busy')).toBe('true');

    await act(async () => {
      deferred.current?.resolve({ items: [{ id: '1', name: 'Zed' }], total: 1 });
    });

    await waitFor(() => {
      expect(tableRoot()?.hasAttribute('data-loading')).toBe(false);
    });
    expect(tableRoot()?.getAttribute('aria-busy')).toBeNull();
  });
});
