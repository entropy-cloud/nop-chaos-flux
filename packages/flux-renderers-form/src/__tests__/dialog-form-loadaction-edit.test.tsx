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
 * 编辑 dialog 场景：openDialog 打开的表单带 loadAction 加载原值，
 * 用户修改字段后提交，请求必须携带修改后的值。
 *
 * 对应 e2e 编辑测试（auth-resource 编辑资源）：DOM input 显示新值但
 * 提交请求发送旧值。本测试验证 dialog 内嵌表单 + loadAction 组合下
 * onChange → store → 提交数据链路是否正确。
 */
describe('dialog form with loadAction then edit', () => {
  it('dialog form: loadAction populates value, edit field, submit sends edited value', async () => {
    cleanup();

    let savedData: Record<string, unknown> | undefined;

    const testEnv = {
      ...baseEnv,
      fetcher: vi.fn(async (api: { url: string; data?: unknown }) => {
        if (api.url.includes('__get')) {
          return { ok: true, data: { name: 'Original' } };
        }
        if (api.url.includes('__save')) {
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
        schemaUrl="test://dialog-form-loadaction-edit"
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
                    submitScope: 'surface',
                    loadAction: {
                      action: 'ajax',
                      args: { url: '/r/TestEntity__get', method: 'post', includeScope: '*' },
                    },
                    submitAction: {
                      action: 'ajax',
                      args: { url: '/r/TestEntity__save', includeScope: '*' },
                    },
                    body: [{ type: 'input-text', name: 'name', label: 'Name' }],
                    actions: [
                      {
                        type: 'button',
                        id: 'cancel',
                        label: 'Cancel',
                        onClick: { action: 'closeSurface' },
                      },
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
    const nameInput = await screen.findByLabelText('Name');
    await waitFor(() => expect((nameInput as HTMLInputElement).value).toBe('Original'), {
      timeout: 5000,
    });

    // 修改字段
    fireEvent.change(nameInput, { target: { value: 'Edited' } });
    expect((nameInput as HTMLInputElement).value).toBe('Edited');

    // 提交
    fireEvent.click(screen.getByText('OK'));

    await waitFor(() => expect(savedData).toBeDefined(), { timeout: 5000 });

    // 提交必须携带修改后的值
    expect(savedData?.name).toBe('Edited');
  });
});
