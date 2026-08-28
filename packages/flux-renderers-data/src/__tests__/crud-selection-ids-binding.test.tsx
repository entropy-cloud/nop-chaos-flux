import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { buttonRenderer, createDataSchemaRenderer, formulaCompiler } from '../test-support.js';

afterEach(cleanup);

/**
 * 回归：CRUD 批量操作按钮的 `${ids}`（或 selectionField 自定义名）必须解析为选中行键。
 * 复现 nop-entropy grid_crud 生成的 `@mutation:X__batchDelete?ids=${ids}` 场景——
 * 修复前 `${ids}` 在按钮 scope 中不存在 → 求值为空串 → 后端收到 ids:['']。
 */
describe('CRUD selectionField (ids) binding for batch actions', () => {
  it('resolves ${ids} to selected row keys in the batch button ajax url', async () => {
    cleanup();
    const fetcher = vi.fn(async <T,>(_api: unknown): Promise<{ status: number; data: T | null }> => ({ status: 0, data: {} as T }));
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-ids-batch"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'ids-crud',
              rowKey: 'id',
              selection: { type: 'checkbox' },
              source: [
                { id: '1', name: 'Alice' },
                { id: '2', name: 'Bob' },
                { id: '3', name: 'Carol' },
              ],
              listActions: [
                {
                  type: 'button',
                  label: 'Batch Delete',
                  disabled: '${!$crud.hasSelection}',
                  onClick: {
                    action: 'ajax',
                    args: {
                      url: '@mutation:Demo__batchDelete?ids=${ids}',
                      method: 'post',
                    },
                  },
                },
              ],
              columns: [{ name: 'name', label: 'Name' }],
            },
          ],
        }}
        env={
          {
            notify: () => undefined,
            fetcher: fetcher as unknown as RendererEnv['fetcher'],
          } as RendererEnv
        }
        formulaCompiler={formulaCompiler}
      />,
    );

    const checkboxes = document.querySelectorAll('[data-slot="checkbox"]');
    fireEvent.click(checkboxes[1] as HTMLElement);
    fireEvent.click(checkboxes[2] as HTMLElement);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Batch Delete' }).hasAttribute('disabled')).toBe(
        false,
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'Batch Delete' }));

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalled();
    });

    const calledApi = fetcher.mock.calls[0][0] as { url: string };
    // 修复前：ids= 空串；修复后：ids 为选中行键（checkbox[1]=Alice id=1, checkbox[2]=Bob id=2）
    expect(calledApi.url).toBe('@mutation:Demo__batchDelete?ids=1,2');
  });

  it('honors custom selectionField name', async () => {
    cleanup();
    const fetcher = vi.fn(async <T,>(_api: unknown): Promise<{ status: number; data: T | null }> => ({ status: 0, data: {} as T }));
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-ids-custom-field"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'ids-crud-custom',
              rowKey: 'id',
              selection: { type: 'checkbox' },
              selectionField: 'selectedPositionIds',
              source: [
                { id: '1', name: 'Alice' },
                { id: '2', name: 'Bob' },
              ],
              listActions: [
                {
                  type: 'button',
                  label: 'Batch Delete Custom',
                  disabled: '${!$crud.hasSelection}',
                  onClick: {
                    action: 'ajax',
                    args: {
                      url: '@mutation:Demo__batchDelete?ids=${selectedPositionIds}',
                      method: 'post',
                    },
                  },
                },
              ],
              columns: [{ name: 'name', label: 'Name' }],
            },
          ],
        }}
        env={
          {
            notify: () => undefined,
            fetcher: fetcher as unknown as RendererEnv['fetcher'],
          } as RendererEnv
        }
        formulaCompiler={formulaCompiler}
      />,
    );

    const checkboxes = document.querySelectorAll('[data-slot="checkbox"]');
    fireEvent.click(checkboxes[1] as HTMLElement);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Batch Delete Custom' }).hasAttribute('disabled'),
      ).toBe(false);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Batch Delete Custom' }));

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalled();
    });

    const calledApi = fetcher.mock.calls[0][0] as { url: string };
    expect(calledApi.url).toBe('@mutation:Demo__batchDelete?ids=1');
  });
});
