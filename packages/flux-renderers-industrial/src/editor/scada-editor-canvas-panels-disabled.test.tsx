import React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import {
  ComponentRegistryContext,
  PageContext,
  RuntimeContext,
  ScopeContext,
  SurfaceContext,
  ActionScopeContext,
  createDefaultEnv,
} from '@nop-chaos/flux-react';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '@nop-chaos/flux-runtime';
import { createRendererRegistry, type SchemaObject } from '@nop-chaos/flux-core';
import { resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { validEditorConfig } from '../test-support/editor-config-fixtures.js';
import { ScadaEditorCanvasRenderer } from './scada-editor-canvas.js';
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
  const actionScope = runtime.createActionScope({ id: 'editor-panels-disabled-action-scope' });
  const componentRegistry = runtime.createComponentHandleRegistry({ id: 'editor-panels-disabled-registry' });
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
    id: 'editor-panels-disabled-1',
    path: 'test.editor-panels-disabled-1',
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
      cid: 711,
    } as RendererComponentProps<ScadaEditorCanvasSchema>['meta'],
    regions: {} as RendererComponentProps<ScadaEditorCanvasSchema>['regions'],
    events: {},
    reactions: {},
    helpers: { dispatch: vi.fn().mockResolvedValue({ ok: true }) } as unknown as RendererComponentProps<
      ScadaEditorCanvasSchema
    >['helpers'],
  };
}

// [G5-R3-视角3-01] (R2 consistency audit, P2, swept with batch ①): meta.disabled
// gated only the canvas area — the toolbox / symbol palette / inspector panels
// stayed fully interactive, so a "disabled editor" could still add, edit and
// remove symbols (disabled-channel-block family).
describe('[G5-R3-视角3-01] scada editor panels honor meta.disabled', () => {
  it('toolbox / palette / inspector carry inert + data-disabled when the editor is disabled', async () => {
    const env = makeEnvironment();
    const { container } = render(
      <Providers env={env}>
        <ScadaEditorCanvasRenderer {...makeEditorProps(true)} />
      </Providers>,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-slot="scada-editor-canvas"]')?.getAttribute('data-status')).toBe('ready');
    });

    for (const slot of [
      'scada-editor-toolbox',
      'scada-editor-palette',
      'scada-editor-inspector',
    ]) {
      const panel = container.querySelector(`[data-slot="${slot}"]`) as HTMLElement | null;
      expect(panel, `panel ${slot} must render`).toBeTruthy();
      expect(panel!.hasAttribute('inert'), `panel ${slot} must be inert`).toBe(true);
      expect(panel!.getAttribute('data-disabled')).toBe('true');
    }
  });

  it('panels stay interactive when the editor is enabled (no regression)', async () => {
    const env = makeEnvironment();
    const { container } = render(
      <Providers env={env}>
        <ScadaEditorCanvasRenderer {...makeEditorProps(false)} />
      </Providers>,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-slot="scada-editor-canvas"]')?.getAttribute('data-status')).toBe('ready');
    });

    for (const slot of ['scada-editor-toolbox', 'scada-editor-palette']) {
      const panel = container.querySelector(`[data-slot="${slot}"]`) as HTMLElement | null;
      expect(panel, `panel ${slot} must render`).toBeTruthy();
      expect(panel!.hasAttribute('inert')).toBe(false);
      expect(panel!.getAttribute('data-disabled')).toBeNull();
    }
  });
});
