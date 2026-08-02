import React from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '../index.js';
import { env as baseEnv } from '../test-support.js';
import type { BaseSchema, ApiRequestContext } from '@nop-chaos/flux-core';

type SchemaInput = BaseSchema | BaseSchema[];

/**
 * submitAction 解析 scope 契约测试
 *
 * 问题背景：真实 nop-entropy 编辑 e2e 中，CRUD 行 action 打开编辑 dialog，
 * submitAction 的 `${field}` 模板解析出**行 scope 的旧值**（api.data 只有
 * CRUD 列表的 7 列），而非 form store 的编辑值。
 *
 * 本测试复刻该场景：页面 scope 带行数据（7 列）→ openDialog → form
 * （loadAction 加载完整数据 + submitAction ${field} 模板）→ 编辑 → 提交，
 * 在 fetcher 中捕获 ctx.scope 与 api.data，验证：
 *  1. submitAction 解析 scope 是什么（readOwn / readVisible 内容）
 *  2. 提交的 api.data 是编辑值还是行 scope 旧值
 */
describe('submitAction resolution scope (row-context dialog form)', () => {
  it('submits edited form value, NOT row-scope value', async () => {
    cleanup();

    // 记录 fetcher 收到的 scope 与 api.data
    const captured: {
      phase: string;
      scopeReadOwnKeys?: string[];
      scopeReadOwnNickName?: unknown;
      scopeVisibleNickName?: unknown;
      apiDataNickName?: unknown;
      apiDataKeys?: string[];
    }[] = [];

    const testEnv = {
      ...baseEnv,
      fetcher: async (api: { url?: string; data?: unknown }, ctx: ApiRequestContext) => {
        if (typeof api.url === 'string' && api.url.includes('__get')) {
          captured.push({
            phase: 'loadAction',
            scopeReadOwnKeys: Object.keys(ctx.scope.readOwn()),
            scopeReadOwnNickName: (ctx.scope.readOwn() as Record<string, unknown>).nickName,
          });
          // loadAction 返回完整用户数据（26 字段，非行数据 7 列）
          return {
            ok: true,
            status: 200,
            data: {
              id: '1',
              userId: '1',
              userName: 'RowUser',
              status: 1,
              status_label: '1-正常',
              nickName: 'OldNick',
              deptId: null,
              dept: { deptName: 'Dev' },
              avatar: null,
              userType: 1,
              userType_label: '1-普通用户',
              gender: 1,
              gender_label: '1-男',
              email: 'old@x.com',
              phone: '111',
              expireAt: null,
              changePwdAtLogin: 0,
              idType: null,
              idNbr: null,
              birthday: null,
              workNo: null,
              positionId: null,
              position: { name: 'Engineer' },
              telephone: null,
              remark: 'orig',
            },
          };
        }
        if (typeof api.url === 'string' && api.url.includes('__update')) {
          captured.push({
            phase: 'submitAction',
            scopeReadOwnKeys: Object.keys(ctx.scope.readOwn()),
            scopeReadOwnNickName: (ctx.scope.readOwn() as Record<string, unknown>).nickName,
            scopeVisibleNickName: (ctx.scope.readVisible() as Record<string, unknown>).nickName,
            apiDataNickName: (api.data as Record<string, unknown> | undefined)?.nickName,
            apiDataKeys: Object.keys((api.data as Record<string, unknown>) ?? {}),
          });
          return { ok: true, status: 200, data: { id: '1' } };
        }
        return { ok: true, status: 200, data: null };
      },
    } as unknown as typeof baseEnv;

    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...formRendererDefinitions,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://submit-scope-row-context"
        schema={
          {
            type: 'page',
            body: [
              {
                type: 'button',
                id: 'edit',
                label: 'Edit',
                onClick: {
                  action: 'openDialog',
                  args: {
                    title: 'Edit',
                    body: {
                      type: 'form',
                      id: 'edit-form',
                      name: 'edit',
                      submitScope: 'surface',
                      loadAction: {
                        action: 'ajax',
                        args: { url: '/r/User__get?id=${id}', method: 'post', includeScope: '*' },
                      },
                      submitAction: {
                        action: 'ajax',
                        args: {
                          url: '/r/User__update?id=${id}',
                          method: 'post',
                          data: {
                            userName: '${userName}',
                            status: '${status}',
                            nickName: '${nickName}',
                            email: '${email}',
                            phone: '${phone}',
                          },
                        },
                      },
                      onSubmitSuccess: [{ action: 'closeSurface' }],
                      body: [
                        { type: 'input-text', name: 'nickName', label: 'Nick' },
                        // scope-debug 控件：显示 dialog form 的渲染 scope
                        {
                          type: 'scope-debug',
                          title: 'Edit Form Scope',
                          defaultExpand: true,
                          testid: 'edit-form-scope',
                        },
                      ],
                      actions: [
                        {
                          type: 'button',
                          id: 'submit',
                          label: 'OK',
                          level: 'primary',
                          onClick: { action: 'submitForm', then: { action: 'closeSurface' } },
                        },
                      ],
                    },
                  },
                },
              },
            ],
          } as SchemaInput
        }
        // 页面 scope 带行数据（CRUD 列表 7 列）——模拟行 action 上下文
        data={{
          id: '1',
          userName: 'RowUser',
          status: 1,
          nickName: 'RowNick',
          deptId: null,
          userType: 1,
          gender: 1,
          phone: '999',
        }}
        env={testEnv}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    // 打开 dialog
    fireEvent.click(screen.getByText('Edit'));
    await waitFor(() => expect(screen.getByText('OK')).toBeTruthy(), { timeout: 5000 });

    // loadAction 完成 → input 显示旧值（ajax 加载）
    const input = await screen.findByLabelText('Nick');
    await waitFor(() => expect((input as HTMLInputElement).value).toBe('OldNick'), { timeout: 5000 });

    // 编辑 nickName
    fireEvent.change(input, { target: { value: 'EditedValue' } });
    await waitFor(() => expect((input as HTMLInputElement).value).toBe('EditedValue'), {
      timeout: 5000,
    });

    // scope-debug 控件显示 dialog form 的 scope（编辑后）
    const scopeDebugText = screen.getByTestId('edit-form-scope').textContent ?? '';
    expect(scopeDebugText).not.toBe('');

    // 提交
    fireEvent.click(screen.getByText('OK'));
    await waitFor(() => {
      expect(captured.some((c) => c.phase === 'submitAction')).toBe(true);
    }, { timeout: 5000 });

    const load = captured.find((c) => c.phase === 'loadAction');
    const submit = captured.find((c) => c.phase === 'submitAction');

    expect(load?.scopeReadOwnKeys?.length).toBeGreaterThan(0);
    expect(submit?.scopeReadOwnKeys?.length).toBeGreaterThan(0);

    // 契约：提交的 api.data 必须携带编辑后的值（lazy 执行，读 form store）
    expect(submit?.apiDataNickName).toBe('EditedValue');
  });
});
