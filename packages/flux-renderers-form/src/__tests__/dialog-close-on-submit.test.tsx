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
 * closeOnSubmit 端到端验证：真实渲染 dialog/drawer + form + submit 按钮，
 * 走完整提交链（submitForm/Enter → form.submit() → submitAction ajax →
 * surface submit:success hook → runtime 自动 closeSurface）。
 *
 * 覆盖 nop-entropy 生成器场景：openDialog args.closeOnSubmit: true +
 * 提交按钮 `{ action: 'submitForm' }`（无 then closeSurface）。
 */
describe('closeOnSubmit — dialog/drawer auto-close after submit', () => {
  function renderPage(
    env: typeof baseEnv,
    schema: SchemaInput,
  ) {
    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...formRendererDefinitions,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://dialog-close-on-submit"
        schema={schema}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
  }

  function openDialogSchema(args: Record<string, unknown>): SchemaInput {
    return {
      type: 'page',
      body: [
        {
          type: 'button',
          id: 'add',
          label: 'Add',
          onClick: {
            action: 'openDialog',
            args: {
              title: 'Add',
              body: {
                type: 'form',
                id: 'add-form',
                submitScope: 'surface',
                submitAction: {
                  action: 'ajax',
                  args: { url: '/r/TestEntity__save', method: 'post', includeScope: '*' },
                },
                body: [{ type: 'input-text', name: 'name', label: 'Name' }],
              },
              actions: [
                { type: 'button', id: 'cancel', label: 'Cancel', onClick: { action: 'closeSurface' } },
                {
                  type: 'button',
                  id: 'submit',
                  label: 'OK',
                  level: 'primary',
                  onClick: { action: 'submitForm' },
                },
              ],
              ...args,
            },
          },
        },
      ],
    } as SchemaInput;
  }

  function openDrawerSchema(args: Record<string, unknown>): SchemaInput {
    return {
      type: 'page',
      body: [
        {
          type: 'button',
          id: 'open',
          label: 'Open Drawer',
          onClick: {
            action: 'openDrawer',
            args: {
              title: 'Edit',
              body: {
                type: 'form',
                id: 'edit-form',
                submitScope: 'surface',
                submitAction: {
                  action: 'ajax',
                  args: { url: '/r/TestEntity__save', method: 'post', includeScope: '*' },
                },
                body: [{ type: 'input-text', name: 'name', label: 'Name' }],
              },
              actions: [
                {
                  type: 'button',
                  id: 'submit',
                  label: 'Save',
                  level: 'primary',
                  onClick: { action: 'submitForm' },
                },
              ],
              ...args,
            },
          },
        },
      ],
    } as SchemaInput;
  }

  function makeEnv(saveResponse: () => { ok: boolean; data?: unknown; error?: Error }) {
    return {
      ...baseEnv,
      fetcher: vi.fn(async (api: { url: string }) => {
        if (api.url.includes('__save')) {
          return saveResponse();
        }
        return { ok: true, data: {} };
      }),
    } as unknown as typeof baseEnv;
  }

  it('closes the dialog after button submit when closeOnSubmit is true', async () => {
    cleanup();
    const env = makeEnv(() => ({ ok: true, data: { id: 'new-1' } }));
    renderPage(env, openDialogSchema({ closeOnSubmit: true }));

    fireEvent.click(screen.getByText('Add'));
    await waitFor(() => expect(screen.getByText('OK')).toBeTruthy(), { timeout: 5000 });

    fireEvent.click(screen.getByText('OK'));

    await waitFor(() => expect(env.fetcher).toHaveBeenCalled(), { timeout: 5000 });
    // dialog 提交成功后自动关闭
    await waitFor(() => expect(screen.queryByText('OK')).toBeNull(), { timeout: 5000 });
    expect(screen.queryByText('Cancel')).toBeNull();
  });

  it('closes the dialog after Enter-key submit when closeOnSubmit is true', async () => {
    cleanup();
    const env = makeEnv(() => ({ ok: true, data: { id: 'new-1' } }));
    renderPage(env, openDialogSchema({ closeOnSubmit: true }));

    fireEvent.click(screen.getByText('Add'));
    await waitFor(() => expect(screen.getByText('OK')).toBeTruthy(), { timeout: 5000 });

    // 输入框内按 Enter → form 内置提交（不经过按钮 onClick）
    const nameInput = await screen.findByLabelText('Name');
    fireEvent.keyDown(nameInput, { key: 'Enter' });

    await waitFor(() => expect(env.fetcher).toHaveBeenCalled(), { timeout: 5000 });
    await waitFor(() => expect(screen.queryByText('OK')).toBeNull(), { timeout: 5000 });
  });

  it('closes the drawer after submit when closeOnSubmit is true', async () => {
    cleanup();
    const env = makeEnv(() => ({ ok: true, data: { id: 'new-1' } }));
    renderPage(env, openDrawerSchema({ closeOnSubmit: true }));

    fireEvent.click(screen.getByText('Open Drawer'));
    await waitFor(() => expect(screen.getByText('Save')).toBeTruthy(), { timeout: 5000 });

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(env.fetcher).toHaveBeenCalled(), { timeout: 5000 });
    await waitFor(() => expect(screen.queryByText('Save')).toBeNull(), { timeout: 5000 });
  });

  it('keeps the dialog open after submit when closeOnSubmit is absent', async () => {
    cleanup();
    const env = makeEnv(() => ({ ok: true, data: { id: 'new-1' } }));
    renderPage(env, openDialogSchema({}));

    fireEvent.click(screen.getByText('Add'));
    await waitFor(() => expect(screen.getByText('OK')).toBeTruthy(), { timeout: 5000 });

    fireEvent.click(screen.getByText('OK'));

    await waitFor(() => expect(env.fetcher).toHaveBeenCalled(), { timeout: 5000 });
    // 未设置 closeOnSubmit：dialog 保持打开
    expect(screen.getByText('OK')).toBeTruthy();
  });

  it('keeps the dialog open when submit fails even with closeOnSubmit', async () => {
    cleanup();
    const env = makeEnv(() => ({ ok: false, error: new Error('boom') }));
    renderPage(env, openDialogSchema({ closeOnSubmit: true }));

    fireEvent.click(screen.getByText('Add'));
    await waitFor(() => expect(screen.getByText('OK')).toBeTruthy(), { timeout: 5000 });

    fireEvent.click(screen.getByText('OK'));

    await waitFor(() => expect(env.fetcher).toHaveBeenCalled(), { timeout: 5000 });
    // 提交失败不触发 submit:success → 不关闭
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.getByText('OK')).toBeTruthy();
  });
});
