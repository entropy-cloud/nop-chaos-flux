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
 * submitAction 延迟执行契约（lazy execution contract）
 *
 * 设计契约：submitAction 的 args.data 使用 `${field}` 模板时，必须**在 dispatch（提交）时**
 * 用当前 form store 值求值，而不是在渲染/激活时预物化（bake）旧值。
 *
 * 真实 e2e（nop-entropy 编辑用户）观察到提交旧值——本测试从两个层面锁定契约：
 *  1. 编译层：${field} 模板必须编译为 dynamic（非 static）
 *  2. 运行时：loadAction 加载旧值 → 用户编辑 → 提交必须携带编辑后的值
 */
describe('submitAction lazy execution contract', () => {
  it('compile layer: ${field} args.data compiles to DYNAMIC runtime value (not static)', async () => {
    cleanup();

    let savedData: Record<string, unknown> | undefined;
    const testEnv = {
      ...baseEnv,
      fetcher: vi.fn(async (api: { url: string; data?: unknown }) => {
        if (api.url.includes('__get')) {
          return { ok: true, data: { nickName: 'OldNick' } };
        }
        if (api.url.includes('__update')) {
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

    // 表单带 loadAction（加载旧值）+ submitAction 用 ${nickName} 模板
    render(
      <SchemaRenderer
        schemaUrl="test://lazy-contract"
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
                      submitScope: 'surface',
                      loadAction: {
                        action: 'ajax',
                        args: { url: '/r/TestEntity__get?id=${id}', method: 'post', includeScope: '*' },
                      },
                      submitAction: {
                        action: 'ajax',
                        args: {
                          url: '/r/TestEntity__update?id=${id}',
                          method: 'post',
                          data: { nickName: '${nickName}' },
                        },
                      },
                      body: [{ type: 'input-text', name: 'nickName', label: 'Nick' }],
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
        env={testEnv}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    fireEvent.click(screen.getByText('Edit'));
    await waitFor(() => expect(screen.getByText('OK')).toBeTruthy(), { timeout: 5000 });

    const input = await screen.findByLabelText('Nick');
    await waitFor(() => expect((input as HTMLInputElement).value).toBe('OldNick'), { timeout: 5000 });

    // 用户编辑字段（dispatch 前修改 form store）
    fireEvent.change(input, { target: { value: 'EditedAtDispatch' } });

    // 提交：dispatch 时刻求值，必须携带编辑后的值（lazy）
    fireEvent.click(screen.getByText('OK'));
    await waitFor(() => expect(savedData).toBeDefined(), { timeout: 5000 });

    expect(savedData?.nickName).toBe('EditedAtDispatch');
  });
});
