import React from 'react';
import { createSchemaRenderer, createDefaultEnv } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { industrialEditorRendererDefinitions } from './renderer-definitions.js';

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

/**
 * P2.2（plan 550）M1 结构断言：jsdom 无布局，canvas 槽 flex 包装以 DOM 结构验证——
 * WorkbenchShell canvas 卡片与 `.nop-scada-editor-layout-canvas` 之间必须存在 flex 包装元素
 * （PANEL_CARD 是 block 容器，无 flex 父级时 canvas div 的 flex:1 失效，生产布局塌缩 0 尺寸）。
 */
describe('scada editor workbench shell migration (P2.2 structural contract)', () => {
  it('wraps the leafer canvas div in a flex container inside the shell canvas card', async () => {
    const SchemaRenderer = createSchemaRenderer(industrialEditorRendererDefinitions);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://industrial-editor/shell-contract"
        schema={{ type: 'scada-editor-canvas' }}
        env={createDefaultEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    const canvasDiv = await waitFor(() => {
      const el = container.querySelector('.nop-scada-editor-layout-canvas') as HTMLElement;
      if (!el || el.getAttribute('data-status') !== 'ready') throw new Error('not ready');
      return el;
    });

    // flex wrapper sits between the shell canvas card and the leafer canvas div
    const wrap = canvasDiv.parentElement;
    expect(wrap).toBeTruthy();
    expect(wrap!.className).toContain('flex');
    const canvasCard = container.querySelector('[data-slot="workbench-canvas"]');
    expect(canvasCard).toBeTruthy();
    expect(canvasCard!.contains(wrap!)).toBe(true);

    // five-slot mapping rendered
    expect(container.querySelector('[data-slot="workbench-header"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="workbench-left-panel"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="workbench-right-panel"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="workbench-footer"]')).toBeTruthy();
    // family markers preserved
    expect(container.querySelector('.nop-scada-editor-status-bar')).toBeTruthy();
  });
});

describe('scada editor shell hidden-state contract (P2.2 undefined-not-null)', () => {
  it('renders no panel cards in the error state — hidden slots receive undefined, not null', async () => {
    const SchemaRenderer = createSchemaRenderer(industrialEditorRendererDefinitions);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://industrial-editor/shell-error-state"
        schema={{
          type: 'scada-editor-canvas',
          config: 'not-valid-json-at-all',
        }}
        env={createDefaultEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    // error state: overlays render inside the canvas slot; conditional slots stay undefined
    await waitFor(() => {
      expect(container.querySelector('.nop-scada-editor-error')).toBeTruthy();
    });
    expect(container.querySelector('[data-slot="workbench-canvas"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="workbench-header"]')).toBeNull();
    expect(container.querySelector('[data-slot="workbench-left-panel"]')).toBeNull();
    expect(container.querySelector('[data-slot="workbench-right-panel"]')).toBeNull();
    expect(container.querySelector('[data-slot="workbench-footer"]')).toBeNull();
  });
});
