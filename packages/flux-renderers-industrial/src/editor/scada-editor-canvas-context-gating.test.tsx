import React from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRendererRegistry, type SchemaObject } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '@nop-chaos/flux-runtime';
import {
  ActionScopeContext,
  ComponentRegistryContext,
  PageContext,
  RuntimeContext,
  ScopeContext,
  SurfaceContext,
  createDefaultEnv,
} from '@nop-chaos/flux-react';
import { resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { validEditorConfig } from '../test-support/editor-config-fixtures.js';
import { ScadaEditorCanvasRenderer } from './scada-editor-canvas.js';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { ScadaEditorCanvasSchema } from './schemas.js';

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

function makeEnvironment() {
  const runtime = createRendererRuntime({
    registry: createRendererRegistry([]),
    env: createDefaultEnv(),
    expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
  });
  const page = runtime.createPageRuntime({});
  const actionScope = runtime.createActionScope({ id: 'editor-ctx-gating-action-scope' });
  const componentRegistry = runtime.createComponentHandleRegistry({ id: 'editor-ctx-gating-registry' });
  const surfaceRuntime = runtime.createSurfaceRuntime();
  return { runtime, page, actionScope, componentRegistry, surfaceRuntime };
}

function Providers({ env, children }: { env: ReturnType<typeof makeEnvironment>; children: React.ReactNode }) {
  return (
    <RuntimeContext.Provider value={env.runtime}>
      <ActionScopeContext.Provider value={env.actionScope}>
        <ComponentRegistryContext.Provider value={env.componentRegistry}>
          <ScopeContext.Provider value={env.page.scope}>
            <PageContext.Provider value={env.page}>
              <SurfaceContext.Provider value={env.surfaceRuntime}>{children}</SurfaceContext.Provider>
            </PageContext.Provider>
          </ScopeContext.Provider>
        </ComponentRegistryContext.Provider>
      </ActionScopeContext.Provider>
    </RuntimeContext.Provider>
  );
}

function makeEditorProps(disabled: boolean): RendererComponentProps<ScadaEditorCanvasSchema> {
  return {
    id: 'editor-ctx-gating-1',
    path: 'test.editor-ctx-gating-1',
    schema: { type: 'scada-editor-canvas' } as ScadaEditorCanvasSchema & SchemaObject,
    templateNode: {} as RendererComponentProps<ScadaEditorCanvasSchema>['templateNode'],
    node: {} as RendererComponentProps<ScadaEditorCanvasSchema>['node'],
    props: {
      config: validEditorConfig() as unknown as ScadaEditorCanvasSchema['config'],
    } as RendererComponentProps<ScadaEditorCanvasSchema>['props'],
    meta: {
      visible: true,
      hidden: false,
      disabled,
      changed: false,
      cid: 733,
    } as RendererComponentProps<ScadaEditorCanvasSchema>['meta'],
    regions: {} as RendererComponentProps<ScadaEditorCanvasSchema>['regions'],
    events: {},
    reactions: {},
    helpers: { dispatch: vi.fn().mockResolvedValue({ ok: true }) } as unknown as RendererComponentProps<
      ScadaEditorCanvasSchema
    >['helpers'],
  };
}

describe('plan 532 S3 — 右键菜单 readOnly 收敛（meta.disabled 门控）', () => {
  it('enabled canvas: contextmenu opens the menu', async () => {
    const env = makeEnvironment();
    const { container } = render(
      <Providers env={env}>
        <ScadaEditorCanvasRenderer {...makeEditorProps(false)} />
      </Providers>,
    );
    const canvasArea = await waitFor(() => {
      const el = container.querySelector('.nop-scada-editor-layout-canvas') as HTMLElement;
      expect(el).not.toBeNull();
      return el;
    });
    fireEvent.contextMenu(canvasArea, { clientX: 120, clientY: 90 });
    await waitFor(() => {
      expect(container.querySelector('[data-testid="scada-editor-context-menu"]')).not.toBeNull();
    });
  });

  it('disabled canvas: contextmenu does NOT open the menu (readOnly 收敛)', async () => {
    const env = makeEnvironment();
    const { container } = render(
      <Providers env={env}>
        <ScadaEditorCanvasRenderer {...makeEditorProps(true)} />
      </Providers>,
    );
    const canvasArea = await waitFor(() => {
      const el = container.querySelector('.nop-scada-editor-layout-canvas') as HTMLElement;
      expect(el).not.toBeNull();
      return el;
    });
    fireEvent.contextMenu(canvasArea, { clientX: 120, clientY: 90 });
    // 门控早退：无菜单（也无 preventDefault 之外的副作用面）。
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(container.querySelector('[data-testid="scada-editor-context-menu"]')).toBeNull();
  });
});
