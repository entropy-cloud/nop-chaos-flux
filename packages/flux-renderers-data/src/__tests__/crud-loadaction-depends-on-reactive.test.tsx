import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useEffect } from 'react';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { useRenderScope } from '@nop-chaos/flux-react';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

/**
 * C4.2 crud audit — dimension 11 (异步生命周期) dependsOn 反应式触发死路径检查。
 *
 * loadAction 声明 `dependsOn: ['deptId']` 时，外部 binding 变更应触发重新加载，
 * 且新请求必须携带最新的外部绑定值（args 模板在 dispatch scope 下求值），
 * 结果渲染进 CRUD。修复前该路径被反应注册表吞掉（fetch 发出但结果丢弃，
 * 且 args 模板在错误 scope 求值）——bug 73 模式：单测绿但真实链路死。
 */
describe('CRUD loadAction dependsOn reactive refetch', () => {
  it('renders new rows after an external dependsOn binding change', async () => {
    cleanup();
    const calls: Array<{ deptId?: string }> = [];

    const scopeWriter: RendererDefinition = {
      type: 'scope-writer',
      component: function ScopeWriter() {
        const scope = useRenderScope();
        useEffect(() => {
          const timer = setTimeout(() => {
            scope?.update('deptId', 'd7');
          }, 400);
          return () => clearTimeout(timer);
        }, [scope]);
        return null;
      },
      fields: [],
    };

    const SchemaRenderer = createDataSchemaRenderer([scopeWriter]);

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-depends-on-reactive"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'dep-crud',
              loadAction: {
                action: 'probe:load',
                dependsOn: ['deptId'],
                args: { deptId: '${deptId}' },
              },
              columns: [{ name: 'name', label: 'Name' }],
              rowKey: 'id',
            },
            { type: 'scope-writer' },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={(actionScope) => {
          if (!actionScope) return;
          (actionScope as {
            registerNamespace(ns: string, config: unknown): void;
          }).registerNamespace('probe', {
            kind: 'host',
            invoke(
              method: string,
              payload: Record<string, unknown> | undefined,
            ) {
              if (method === 'load') {
                const deptId = (payload as { deptId?: string } | undefined)?.deptId;
                calls.push({ deptId });
                return {
                  ok: true,
                  data: {
                    items: [
                      { id: '1', name: deptId ? `RowsFor${String(deptId)}` : 'InitialRows' },
                    ],
                    total: 1,
                  },
                };
              }
              return { ok: false, error: new Error(`Unsupported method: ${method}`) };
            },
          });
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('InitialRows')).toBeTruthy();
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({ deptId: undefined });

    // The scope-writer bumps `deptId` after 400ms; the dependsOn reactive path
    // must re-fetch with the new binding value and render the new rows.
    await waitFor(
      () => {
        expect(screen.getByText('RowsFord7')).toBeTruthy();
      },
      { timeout: 3000 },
    );

    // The reactive re-fetch carried the latest external binding value.
    expect(calls).toHaveLength(2);
    expect(calls[1]).toEqual({ deptId: 'd7' });
  });
});
