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
  const actionScope = runtime.createActionScope({ id: 'editor-disabled-action-scope' });
  const componentRegistry = runtime.createComponentHandleRegistry({ id: 'editor-disabled-registry' });
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
    id: 'editor-disabled-1',
    path: 'test.editor-disabled-1',
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
      cid: 710,
    } as RendererComponentProps<ScadaEditorCanvasSchema>['meta'],
    regions: {} as RendererComponentProps<ScadaEditorCanvasSchema>['regions'],
    events: {},
    reactions: {},
    helpers: { dispatch: vi.fn().mockResolvedValue({ ok: true }) } as unknown as RendererComponentProps<
      ScadaEditorCanvasSchema
    >['helpers'],
  };
}

describe('scada-editor-canvas disabled meta four-state (HCA7 P2-2 + P2-3 / HCAX-2)', () => {
  it('canvas area carries role/aria-label a11y semantics regardless of disabled', async () => {
    const env = makeEnvironment();
    const { container } = render(
      <Providers env={env}>
        <ScadaEditorCanvasRenderer {...makeEditorProps(false)} />
      </Providers>,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-slot="scada-editor-canvas"]')?.getAttribute('data-status')).toBe('ready');
    });
    const canvasArea = container.querySelector('[data-slot="scada-editor-canvas"]') as HTMLElement;
    expect(canvasArea.getAttribute('role')).toBe('application');
    expect(canvasArea.getAttribute('aria-label')).toBeTruthy();
  });

  it('meta.disabled=true reflects aria-disabled + inert + guards on the canvas surface', async () => {
    const env = makeEnvironment();
    const { container } = render(
      <Providers env={env}>
        <ScadaEditorCanvasRenderer {...makeEditorProps(true)} />
      </Providers>,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-slot="scada-editor-canvas"]')?.getAttribute('data-status')).toBe('ready');
    });
    const canvasArea = container.querySelector('[data-slot="scada-editor-canvas"]') as HTMLElement;
    expect(canvasArea.getAttribute('aria-disabled')).toBe('true');
    expect(canvasArea.hasAttribute('inert')).toBe(true);
  });

  it('meta.disabled=false leaves the canvas surface interactive (no aria-disabled/inert)', async () => {
    const env = makeEnvironment();
    const { container } = render(
      <Providers env={env}>
        <ScadaEditorCanvasRenderer {...makeEditorProps(false)} />
      </Providers>,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-slot="scada-editor-canvas"]')?.getAttribute('data-status')).toBe('ready');
    });
    const canvasArea = container.querySelector('[data-slot="scada-editor-canvas"]') as HTMLElement;
    expect(canvasArea.hasAttribute('aria-disabled')).toBe(false);
    expect(canvasArea.hasAttribute('inert')).toBe(false);
  });
});
