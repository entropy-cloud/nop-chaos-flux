import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '../index.js';
import { env as baseEnv } from '../test-support.js';
import type { BaseSchema } from '@nop-chaos/flux-core';

type SchemaInput = BaseSchema | BaseSchema[];

/**
 * 复现真实 nop-entropy 编辑链路：dialog form 带 loadAction 加载原值，用户修改字段后提交，
 * submitAction 的 args.data 使用**显式 `${field}` 模板**（而非 includeScope:'*'）。
 *
 * 真实 e2e（编辑用户）观察到：update 请求体携带旧 nickName（loadAction 加载的值），
 * 而非用户编辑后的新值。现有 `dialog-form-loadaction-edit.test.tsx` 用 `includeScope:'*'`
 * 无法复现（includeScope 收集全部 scope，含 form store）。本测试用 `api.data: {field: ${field}}`
 * 显式模板，精确复现真实 schema 模式，验证编辑后的值是否流入提交数据。
 */
describe('dialog form edit with explicit ${field} api.data templates', () => {
  it('loadAction → edit → submit with api.data ${field} sends edited value', async () => {
    cleanup();

    let savedData: Record<string, unknown> | undefined;

    const testEnv = {
      ...baseEnv,
      fetcher: vi.fn(async (api: { url: string; data?: unknown }) => {
        if (api.url.includes('__get')) {
          return { ok: true, data: { name: 'Original', nickName: 'OldNick' } };
        }
        if (api.url.includes('__save') || api.url.includes('__update')) {
          savedData = api.data as Record<string, unknown>;
          return { ok: true, data: { id: '1' } };
        }
        return { ok: true, data: {} };
      }),
    } as unknown as typeof baseEnv;

    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...formRendererDefinitions,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://dialog-edit-field-template"
        schema={{
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
                    // 真实 schema: submitScope surface 桥接 form store
                    submitScope: 'surface',
                    loadAction: {
                      action: 'ajax',
                      args: { url: '/r/TestEntity__get?id=${id}', method: 'post', includeScope: '*' },
                    },
                    // 真实 schema: submitAction.args.data 用显式 ${field} 模板（非 includeScope:'*'）
                    submitAction: {
                      action: 'ajax',
                      args: {
                        url: '/r/TestEntity__update?id=${id}',
                        method: 'post',
                        data: {
                          name: '${name}',
                          nickName: '${nickName}',
                        },
                      },
                    },
                    body: [
                      { type: 'input-text', name: 'name', label: 'Name' },
                      { type: 'input-text', name: 'nickName', label: 'NickName' },
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
        } as SchemaInput}
        env={testEnv}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    // 打开 dialog
    fireEvent.click(screen.getByText('Edit'));
    await waitFor(() => expect(screen.getByText('OK')).toBeTruthy(), { timeout: 5000 });

    // loadAction 完成 → input 显示原值
    const nickInput = await screen.findByLabelText('NickName');
    await waitFor(() => expect((nickInput as HTMLInputElement).value).toBe('OldNick'), {
      timeout: 5000,
    });

    // 修改 nickName 字段（模拟用户编辑）
    fireEvent.change(nickInput, { target: { value: 'NewNick_E2E' } });
    expect((nickInput as HTMLInputElement).value).toBe('NewNick_E2E');

    // 提交
    fireEvent.click(screen.getByText('OK'));

    await waitFor(() => expect(savedData).toBeDefined(), { timeout: 5000 });

    // 提交必须携带编辑后的值（而非 loadAction 加载的旧值）
    expect(savedData?.nickName).toBe('NewNick_E2E');
  });
});
