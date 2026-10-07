import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createDashboardSchemaRenderer, env, formulaCompiler } from '../test-support.js';

afterEach(() => {
  cleanup();
});

const initialLayout = {
  panels: [
    { id: 'p1', type: 'chart', title: 'Sales', x: 0, y: 0, w: 6, h: 2 },
    { id: 'p2', type: 'chart', title: 'Traffic', x: 6, y: 0, w: 6, h: 2 },
  ],
};

function renderEditor(schema: Record<string, unknown> = {}) {
  const SchemaRenderer = createDashboardSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://dashboard/editor"
      schema={{
        type: 'page',
        body: [
          {
            type: 'dashboard-editor',
            testid: 'demo-editor',
            layout: initialLayout,
            ...schema,
          },
        ],
      }}
      data={{}}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

async function waitForPanels() {
  await waitFor(() => {
    expect(document.querySelector('[data-testid="left-panel-expanded"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="right-panel-expanded"]')).toBeTruthy();
  });
}

// rail aria-label 必须是展开语义（旧实现把 collapse 键挂在 rail label 上，语义反转）。
// 测试环境 locale 可能为 zh-CN 或 en-US，双 locale 展开文案都在集合内、collapse 文案不在。
const EXPAND_LEFT_LABELS = new Set(['展开面板组件库', 'Expand panel palette']);
const EXPAND_RIGHT_LABELS = new Set(['展开属性面板', 'Expand inspector']);

// plan 538 Phase 2 判别测试：dashboard 编辑器侧板收起按钮必须驱动 WorkbenchShell collapsed rail。
// 旧实现（renderer 未接 collapsed 契约、面板组件无收起按钮）下两个用例均挂——按钮不存在。
describe('plan 538 Phase 2 — dashboard 侧板 collapsed 契约接线', () => {
  it('palette 头部收起按钮收起左侧板，rail 以展开语义 aria-label 恢复', async () => {
    renderEditor();
    await waitForPanels();

    const collapseButton = document.querySelector('[data-testid="collapse-palette"]');
    expect(collapseButton).toBeTruthy();
    fireEvent.click(collapseButton!);

    await waitFor(() => {
      expect(document.querySelector('[data-testid="left-panel-collapsed"]')).toBeTruthy();
      expect(document.querySelector('[data-testid="left-panel-expanded"]')).toBeNull();
    });
    // rail aria-label 必须是展开语义（旧实现把 collapse 键挂在 rail label 上，语义反转）。
    expect(
      EXPAND_LEFT_LABELS.has(
        document.querySelector('[data-testid="left-panel-collapsed"]')!.getAttribute('aria-label') ?? '',
      ),
    ).toBe(true);
    expect(document.querySelector('[data-testid="right-panel-expanded"]')).toBeTruthy();

    fireEvent.click(document.querySelector('[data-testid="expand-left-panel"]')!);
    await waitFor(() => {
      expect(document.querySelector('[data-testid="left-panel-expanded"]')).toBeTruthy();
      expect(document.querySelector('[data-testid="left-panel-collapsed"]')).toBeNull();
    });
  });

  it('inspector 头部收起按钮收起右侧板（空选态同样可收起），rail 展开恢复', async () => {
    renderEditor();
    await waitForPanels();

    const collapseButton = document.querySelector('[data-testid="collapse-inspector"]');
    expect(collapseButton).toBeTruthy();
    fireEvent.click(collapseButton!);

    await waitFor(() => {
      expect(document.querySelector('[data-testid="right-panel-collapsed"]')).toBeTruthy();
      expect(document.querySelector('[data-testid="right-panel-expanded"]')).toBeNull();
    });
    expect(
      EXPAND_RIGHT_LABELS.has(
        document.querySelector('[data-testid="right-panel-collapsed"]')!.getAttribute('aria-label') ?? '',
      ),
    ).toBe(true);
    expect(document.querySelector('[data-testid="left-panel-expanded"]')).toBeTruthy();

    fireEvent.click(document.querySelector('[data-testid="expand-right-panel"]')!);
    await waitFor(() => {
      expect(document.querySelector('[data-testid="right-panel-expanded"]')).toBeTruthy();
      expect(document.querySelector('[data-testid="right-panel-collapsed"]')).toBeNull();
    });
  });
});
