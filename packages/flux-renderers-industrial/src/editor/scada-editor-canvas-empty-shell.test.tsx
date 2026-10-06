import React from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSchemaRenderer, createDefaultEnv } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { industrialEditorRendererDefinitions } from './renderer-definitions.js';
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

describe('plan 532 S3 Phase 2 — 空态升级与面板宽度接线', () => {
  it('empty state renders icon + title + guidance copy (文案级守卫)', async () => {
    const { container } = renderEditor('empty-state');
    await waitFor(() => {
      expect(container.querySelector('[data-slot="scada-editor-empty"]')).not.toBeNull();
    });
    const empty = container.querySelector('[data-slot="scada-editor-empty"]') as HTMLElement;
    // 图标（lucide svg）+ 标题 + 引导行（emptyScene 复用）——既有断言仅覆盖 data-slot 存在性，此为文案级守卫。
    expect(empty.querySelector('svg')).not.toBeNull();
    expect(empty.textContent).toContain('空白画面');
    expect(empty.textContent).toContain('从左侧图元库拖入图元');
  });

  it('left/right resize handles are mounted (WorkbenchShell resizable 接线)', async () => {
    const { container } = renderEditor('shell-resizable');
    await waitFor(() => {
      expect(container.querySelector('[data-testid="left-resize-handle"]')).not.toBeNull();
    });
    expect(container.querySelector('[data-testid="right-resize-handle"]')).not.toBeNull();
  });

  it('keyboard resize on the left handle flows through onLeftWidthChange into panel width', async () => {
    const { container } = renderEditor('shell-resize-kbd');
    await waitFor(() => {
      expect(container.querySelector('[data-testid="left-resize-handle"]')).not.toBeNull();
    });
    const handle = container.querySelector('[data-testid="left-resize-handle"]') as HTMLElement;
    handle.focus();
    // 宽度落点 = workbench-body 元素的内联 gridTemplateColumns（leftResizable 常驻开关下列宽 = resolvedLeftWidth）。
    const body = container.querySelector('[data-testid="workbench-body"]') as HTMLElement;
    const colsBefore = body.style.gridTemplateColumns;
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    await waitFor(() => {
      expect((container.querySelector('[data-testid="workbench-body"]') as HTMLElement).style.gridTemplateColumns).not.toBe(colsBefore);
    });
  });
});
