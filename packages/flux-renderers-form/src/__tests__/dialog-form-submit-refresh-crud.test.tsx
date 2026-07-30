import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '../index.js';
import { crudRendererDefinition } from '@nop-chaos/flux-renderers-data';
import { env as baseEnv } from '../test-support.js';
import type { BaseSchema } from '@nop-chaos/flux-core';

type SchemaInput = BaseSchema | BaseSchema[];

/**
 * 验证 dialog form submit → onSubmitSuccess → refreshNearest → CRUD reload 完整链路。
 *
 * 这是 e2e 测试中 auth-resource "创建新资源" 的 flux 层面等价测试。
 * 如果此测试通过但 e2e 失败，说明问题在 e2e 基础设施（FormDialog.submit() 时序），
 * 而非 flux 引擎本身。
 */
describe('dialog form submit → refreshNearest → CRUD reload', () => {
  it('CRUD table refreshes after dialog form submit', async () => {
    cleanup();

    let saveCallCount = 0;
    let findListCallCount = 0;

    const notifyMessages: string[] = [];
    const env = {
      ...baseEnv,
      notify: vi.fn((level: string, message: string) => {
        notifyMessages.push(`${level}: ${message}`);
        if (message.includes('refreshNearest')) {
          console.log('[notify]', level, message);
          console.log('[notify] notifyMessages so far:', notifyMessages.length);
        }
      }),
      fetcher: vi.fn(async (api: { url: string; method?: string; data?: unknown }) => {
        console.log('[fetcher]', api.url, 'call#' + (api.url.includes('save') ? saveCallCount + 1 : findListCallCount + 1));
        if (api.url.includes('__save')) {
          saveCallCount++;
          return { ok: true, data: { id: 'new-1' } };
        }
        if (api.url.includes('__findList') || api.url.includes('__findPage')) {
          findListCallCount++;
          const items = findListCallCount <= 1 ? [] : [{ id: 'new-1', name: 'Test Item' }];
          return { ok: true, data: { items, total: items.length } };
        }
        return { ok: true, data: {} };
      }),
    } as typeof baseEnv;

    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...formRendererDefinitions,
      crudRendererDefinition,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://crud-dialog-submit"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              name: 'grid',
              id: 'grid',
              loadAction: {
                action: 'ajax',
                args: { url: '/r/TestEntity__findList', method: 'post' },
              },
              toolbar: [
                {
                  type: 'button',
                  id: 'add',
                  label: 'Add',
                  level: 'primary',
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
                          args: { url: '/r/TestEntity__save', method: 'post', data: { name: 'Test Item' } },
                        },
                        onSubmitSuccess: [{ action: 'refreshNearest' }],
                        body: [
                          { type: 'input-text', name: 'name', label: 'Name', value: 'Test Item' },
                        ],
                      },
                      onSubmitSuccess: [{ action: 'refreshNearest' }],
                      actions: [
                        { type: 'button', id: 'cancel', label: 'Cancel', onClick: { action: 'closeSurface' } },
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
              ],
              columns: [
                { name: 'id', label: 'ID', type: 'text' },
                { name: 'name', label: 'Name', type: 'text' },
              ],
            },
          ],
        } as SchemaInput}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    // Wait for initial CRUD load
    await waitFor(() => { expect(findListCallCount).toBeGreaterThanOrEqual(1); });
    const initialFindListCount = findListCallCount;

    // Click "Add" to open dialog
    fireEvent.click(screen.getByText('Add'));

    // Wait for dialog
    await waitFor(() => { expect(screen.getByText('OK')).toBeTruthy(); });

    // Click submit button (same as FormDialog.submit() does)
    fireEvent.click(screen.getByText('OK'));

    // Wait for save to be called
    await waitFor(() => { expect(saveCallCount).toBe(1); }, { timeout: 5000 });

    // Wait for CRUD to reload (refreshNearest should trigger loadAction)
    await waitFor(
      () => { expect(findListCallCount).toBeGreaterThan(initialFindListCount); },
      { timeout: 5000 },
    );

    // Verify the new item appears in the table
    await waitFor(
      () => { expect(screen.getByText('Test Item')).toBeTruthy(); },
      { timeout: 5000 },
    );
  });
});
