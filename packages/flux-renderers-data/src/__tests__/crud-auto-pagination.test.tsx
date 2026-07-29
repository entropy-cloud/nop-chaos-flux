import { cleanup, render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';
import type { ActionContext } from '@nop-chaos/flux-core';

/**
 * 验证 CRUD 自动分页参数（__autoPagination）注入机制。
 *
 * CRUD 在 evaluationBindings 中放入 __autoPagination，
 * 然后 executeRuntimeAjaxAction 将其注入到 api.params 中，
 * 最终通过 buildUrlWithParams 序列化为 URL query params。
 */

describe('CRUD __autoPagination injection', () => {
  type CallInfo = { method: string; bindings: Record<string, unknown> | undefined };

  function makeProbe(calls: CallInfo[]) {
    return (actionScope: unknown) => {
      if (!actionScope) return;
      (actionScope as any).registerNamespace('probe', {
        kind: 'host',
        invoke(method: string, _p: unknown, ctx: ActionContext) {
          calls.push({ method, bindings: ctx.evaluationBindings });
          if (method === 'load') {
            return { ok: true, data: { items: [], total: 0 } };
          }
          return { ok: false, error: new Error('unknown') };
        },
      });
    };
  }

  it('injects __autoPagination into evaluationBindings for page-mode CRUD', async () => {
    cleanup();
    const calls: CallInfo[] = [];

    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://auto-pagination"
        schema={{
          type: 'page',
          body: [{
            type: 'crud',
            id: 'crud1',
            loadAction: { action: 'probe:load', dependsOn: ['__test__'] },
            columns: [{ name: 'name', label: 'Name' }],
            rowKey: 'id',
          }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={makeProbe(calls)}
      />,
    );

    await waitFor(() => expect(calls.length).toBeGreaterThanOrEqual(1));

    const bindings = calls[0].bindings;
    expect(bindings?.pagination).toBeDefined();
    expect(bindings?.pagination).toEqual({ currentPage: 1, pageSize: 10 });

    // __autoPagination should be present with page/perPage keys
    expect(bindings?.__autoPagination).toBeDefined();
    expect((bindings?.__autoPagination as Record<string, number>).page).toBe(1);
    expect((bindings?.__autoPagination as Record<string, number>).perPage).toBe(10);
  });

  it('__autoPagination uses pageField/pageSizeField when configured', async () => {
    cleanup();
    const calls: CallInfo[] = [];

    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://auto-pagination-custom"
        schema={{
          type: 'page',
          body: [{
            type: 'crud',
            id: 'crud2',
            pageField: 'offset',
            pageSizeField: 'limit',
            loadAction: { action: 'probe:load', dependsOn: ['__test__'] },
            columns: [{ name: 'name', label: 'Name' }],
            rowKey: 'id',
          }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={makeProbe(calls)}
      />,
    );

    await waitFor(() => expect(calls.length).toBeGreaterThanOrEqual(1));

    const bindings = calls[0].bindings;
    expect(bindings?.__autoPagination).toBeDefined();
    expect((bindings?.__autoPagination as Record<string, number>).offset).toBe(1);
    expect((bindings?.__autoPagination as Record<string, number>).limit).toBe(10);
  });

  it('tree-style load without pagination still gets default __autoPagination', async () => {
    // Tree 组件不使用分页，但 CRUD 默认总是创建 __autoPagination
    // 即使 loadAllData: true 或树形 CRUD，__autoPagination 仍然存在
    cleanup();
    const calls: CallInfo[] = [];

    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://auto-pagination-tree"
        schema={{
          type: 'page',
          body: [{
            type: 'crud',
            id: 'crud3',
            loadAllData: true,
            loadAction: { action: 'probe:load', dependsOn: ['__test__'] },
            columns: [{ name: 'name', label: 'Name' }],
            rowKey: 'id',
          }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={makeProbe(calls)}
      />,
    );

    await waitFor(() => expect(calls.length).toBeGreaterThanOrEqual(1));

    const bindings = calls[0].bindings;
    // loadAllData: true 的 CRUD 仍然有 __autoPagination
    expect(bindings?.__autoPagination).toBeDefined();
    expect((bindings?.__autoPagination as Record<string, number>).page).toBe(1);
    expect((bindings?.__autoPagination as Record<string, number>).perPage).toBe(10);
  });
});
