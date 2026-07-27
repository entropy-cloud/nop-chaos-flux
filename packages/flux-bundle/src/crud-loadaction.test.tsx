import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createFluxSchemaRenderer } from './index.js';

/**
 * 复现 nop-chaos-next 实际场景：用 createFluxSchemaRenderer（全 registry + div 包装），
 * 而非 flux-renderers-data 测试用的 createDataSchemaRenderer（手工注册）。
 * 如果这里渲染而 nop-chaos-next 不渲染，差异在 mainHttpClient 时序；
 * 如果这里也不渲染，差异在 registry/包装层。
 */
describe('createFluxSchemaRenderer + loadAction crud', () => {
  it('renders rows via full flux registry + ajax loadAction + fetcher', async () => {
    cleanup();
    const fetcher = vi.fn(async () => ({
      ok: true,
      status: 0,
      data: {
        items: [
          { id: '1', name: 'BundleItem1' },
          { id: '2', name: 'BundleItem2' },
        ],
        total: 2,
      },
    })) as never;

    const SchemaRenderer = createFluxSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://bundle-crud-loadaction"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'load-crud',
              loadAction: { action: 'ajax', args: { url: '/r/Test__findPage' } },
              columns: [{ name: 'name', label: 'Name' }],
              rowKey: 'id',
            },
          ],
        }}
        env={{ notify: () => undefined, fetcher }}
      />,
    );

    await waitFor(
      () => {
        expect(screen.getByText('BundleItem1')).toBeTruthy();
        expect(screen.getByText('BundleItem2')).toBeTruthy();
      },
      { timeout: 3000 },
    );
  });
});
