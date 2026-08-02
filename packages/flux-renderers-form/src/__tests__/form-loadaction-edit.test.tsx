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
 * 编辑场景：表单 mount 时 loadAction 加载已有数据（模拟编辑 dialog 的 get），
 * 用户修改字段后提交，请求必须携带**修改后的值**（而非 loadAction 的原值）。
 *
 * 对应 e2e 编辑测试（auth-resource 编辑资源）暴露的行为：
 * DOM input 显示新值但提交请求发送旧值 —— 本测试确定性验证 flux 表单
 * onChange → store → 提交数据 链路在 loadAction 之后是否仍正确。
 */
describe('form loadAction then edit', () => {
  it('after loadAction populates values, onChange updates store and submit sends edited value', async () => {
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
        schemaUrl="test://form-loadaction-edit"
        schema={{
          type: 'page',
          body: [
            {
              type: 'form',
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
                  label: 'Save',
                  level: 'primary',
                  onClick: { action: 'submitForm' },
                },
              ],
            },
          ],
        } as SchemaInput}
        env={testEnv}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    // loadAction 完成 → input 显示原值
    const nameInput = await screen.findByLabelText('Name');
    await waitFor(() => expect((nameInput as HTMLInputElement).value).toBe('Original'), {
      timeout: 5000,
    });

    // 用户修改字段
    fireEvent.change(nameInput, { target: { value: 'Edited' } });
    expect((nameInput as HTMLInputElement).value).toBe('Edited');

    // 提交
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(savedData).toBeDefined(), { timeout: 5000 });

    // 提交必须携带修改后的值
    expect(savedData?.name).toBe('Edited');
  });

  it('multiple fields: loadAction values are all editable and submit sends all edited values', async () => {
    cleanup();

    let savedData: Record<string, unknown> | undefined;

    const testEnv = {
      ...baseEnv,
      fetcher: vi.fn(async (api: { url: string; data?: unknown }) => {
        if (api.url.includes('__get')) {
          return { ok: true, data: { name: 'Original', role: 'admin' } };
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
        schemaUrl="test://form-loadaction-edit-multi"
        schema={{
          type: 'page',
          body: [
            {
              type: 'form',
              loadAction: {
                action: 'ajax',
                args: { url: '/r/TestEntity__get', method: 'post', includeScope: '*' },
              },
              submitAction: {
                action: 'ajax',
                args: { url: '/r/TestEntity__save', includeScope: '*' },
              },
              body: [
                { type: 'input-text', name: 'name', label: 'Name' },
                { type: 'input-text', name: 'role', label: 'Role' },
              ],
              actions: [
                {
                  type: 'button',
                  label: 'Save',
                  level: 'primary',
                  onClick: { action: 'submitForm' },
                },
              ],
            },
          ],
        } as SchemaInput}
        env={testEnv}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const nameInput = await screen.findByLabelText('Name');
    const roleInput = await screen.findByLabelText('Role');
    await waitFor(
      () =>
        (nameInput as HTMLInputElement).value === 'Original' &&
        (roleInput as HTMLInputElement).value === 'admin',
      { timeout: 5000 },
    );

    // 修改两个字段（role 保持原值不改）
    fireEvent.change(nameInput, { target: { value: 'EditedName' } });

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(savedData).toBeDefined(), { timeout: 5000 });

    expect(savedData?.name).toBe('EditedName');
    expect(savedData?.role).toBe('admin');
  });

  it('native input event (fireEvent.input) after loadAction also updates store and submit', async () => {
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
        schemaUrl="test://form-loadaction-edit-input-event"
        schema={{
          type: 'page',
          body: [
            {
              type: 'form',
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
                  label: 'Save',
                  level: 'primary',
                  onClick: { action: 'submitForm' },
                },
              ],
            },
          ],
        } as SchemaInput}
        env={testEnv}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const nameInput = await screen.findByLabelText('Name');
    await waitFor(() => expect((nameInput as HTMLInputElement).value).toBe('Original'), {
      timeout: 5000,
    });

    // 模拟真实浏览器输入：fireEvent.input（React 受控 input 的底层原生事件）
    fireEvent.input(nameInput, { target: { value: 'TypedValue' } });
    expect((nameInput as HTMLInputElement).value).toBe('TypedValue');

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(savedData).toBeDefined(), { timeout: 5000 });

    expect(savedData?.name).toBe('TypedValue');
  });
});
