import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockInit = vi.fn((..._args: unknown[]) => ({
  setOption: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
}));

// 失败注入：echarts chunk 不可用（optional peer 缺失的宿主形态）
vi.mock('../../flux-renderers-data/src/echarts-setup.js', () => ({
  getECharts: () => {
    throw new Error('echarts chunk unavailable');
  },
}));

import { echartsRendererDefinition } from '@nop-chaos/flux-renderers-data';
import { createDashboardSchemaRenderer, env, formulaCompiler } from './test-support.js';

beforeEach(() => {
  mockInit.mockClear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('dashboard echarts panel degradation isolation', () => {
  it('degrades only the echarts panel to the error placeholder while sibling panels keep rendering', async () => {
    const SchemaRenderer = createDashboardSchemaRenderer([echartsRendererDefinition]);
    render(
      <SchemaRenderer
        schemaUrl="test://dashboard/echarts-panel-failure"
        schema={
          {
            type: 'page',
            body: [
              {
                type: 'dashboard',
                testid: 'echarts-failure-dashboard',
                panels: [
                  {
                    id: 'chart-panel',
                    type: 'echarts',
                    x: 0,
                    y: 0,
                    w: 6,
                    h: 4,
                    props: { option: { series: [] } },
                  },
                  {
                    id: 'text-panel',
                    type: 'text',
                    x: 6,
                    y: 0,
                    w: 6,
                    h: 4,
                    props: { text: 'sibling survives' },
                  },
                ],
              },
            ],
          } as never
        }
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await vi.waitFor(() => {
      const errorSlot = document.querySelector('[data-slot="echarts-error"]');
      if (!errorSlot) {
        throw new Error('echarts error placeholder not rendered yet');
      }
    });
    expect(mockInit).not.toHaveBeenCalled();
    expect(screen.getByText('sibling survives')).toBeTruthy();
  });
});
