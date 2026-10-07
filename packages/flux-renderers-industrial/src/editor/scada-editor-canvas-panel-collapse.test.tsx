import React from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSchemaRenderer, createDefaultEnv } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { industrialEditorRendererDefinitions } from './renderer-definitions.js';
import { EditorPalettePanel } from './palette/editor-palette.js';
import type { EditorEngineRuntime } from './renderer/hooks/use-editor-engine.js';
import type { ScadaConfig } from '../serialization/config-types.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));
vi.mock('@leafer-in/editor', () => ({}));

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

beforeEach(() => {
  resetLeaferMock();
  registerBuiltinScadaSymbols();
});

afterEach(() => {
  cleanup();
});

const emptyConfig: ScadaConfig = { version: 1, variables: [], symbols: [] };

function renderEditor(tag: string, config: ScadaConfig = emptyConfig) {
  const SchemaRenderer = createSchemaRenderer(industrialEditorRendererDefinitions);
  return render(
    <SchemaRenderer
      schemaUrl={`test://editor-shell/${tag}`}
      schema={{ type: 'scada-editor-canvas', config: config as never }}
      env={createDefaultEnv()}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

async function waitForPanels() {
  await waitFor(() => {
    expect(document.querySelector('[data-testid="left-panel-expanded"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="right-panel-expanded"]')).toBeTruthy();
  });
}

// plan 538 Phase 1 判别测试：面板头收起按钮必须驱动 WorkbenchShell collapsed rail。
// 旧实现（canvas 未接 collapsed 契约、面板组件无收起按钮）下两个用例均挂——按钮不存在。
describe('plan 538 Phase 1 — scada 侧板 collapsed 契约接线', () => {
  it('palette 头部收起按钮收起左侧板，rail 点击展开恢复', async () => {
    renderEditor('collapse-left');
    await waitForPanels();

    const collapseButton = document.querySelector('[data-testid="collapse-palette"]');
    expect(collapseButton).toBeTruthy();
    fireEvent.click(collapseButton!);

    await waitFor(() => {
      expect(document.querySelector('[data-testid="left-panel-collapsed"]')).toBeTruthy();
      expect(document.querySelector('[data-testid="left-panel-expanded"]')).toBeNull();
    });
    // 右侧不受影响（左右状态独立）。
    expect(document.querySelector('[data-testid="right-panel-expanded"]')).toBeTruthy();

    fireEvent.click(document.querySelector('[data-testid="expand-left-panel"]')!);
    await waitFor(() => {
      expect(document.querySelector('[data-testid="left-panel-expanded"]')).toBeTruthy();
      expect(document.querySelector('[data-testid="left-panel-collapsed"]')).toBeNull();
    });
  });

  it('inspector 头部收起按钮收起右侧板，rail 点击展开恢复', async () => {
    renderEditor('collapse-right');
    await waitForPanels();

    const collapseButton = document.querySelector('[data-testid="collapse-inspector"]');
    expect(collapseButton).toBeTruthy();
    fireEvent.click(collapseButton!);

    await waitFor(() => {
      expect(document.querySelector('[data-testid="right-panel-collapsed"]')).toBeTruthy();
      expect(document.querySelector('[data-testid="right-panel-expanded"]')).toBeNull();
    });
    expect(document.querySelector('[data-testid="left-panel-expanded"]')).toBeTruthy();

    fireEvent.click(document.querySelector('[data-testid="expand-right-panel"]')!);
    await waitFor(() => {
      expect(document.querySelector('[data-testid="right-panel-expanded"]')).toBeTruthy();
      expect(document.querySelector('[data-testid="right-panel-collapsed"]')).toBeNull();
    });
  });

  it('不传 onCollapse 的面板零渲染收起按钮（custom slot 消费方零回归）', () => {
    const runtime = { addWorkingSymbol: () => undefined } as unknown as EditorEngineRuntime;
    const { container } = render(<EditorPalettePanel runtime={runtime} onError={() => undefined} />);
    expect(container.querySelector('[data-testid="collapse-palette"]')).toBeNull();
  });
});
