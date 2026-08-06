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
import { readScadaEditorTestHandle } from './editor-test-handle.js';
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
  const actionScope = runtime.createActionScope({ id: 'editor-test-action-scope' });
  const componentRegistry = runtime.createComponentHandleRegistry({ id: 'editor-test-component-registry' });
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

interface MakePropsOpts {
  cid?: number;
  dispatch?: ReturnType<typeof vi.fn>;
  regions?: RendererComponentProps<ScadaEditorCanvasSchema>['regions'];
  events?: Record<string, unknown>;
}

function makeEditorProps(opts: MakePropsOpts = {}): RendererComponentProps<ScadaEditorCanvasSchema> {
  const { cid = 701, dispatch = vi.fn().mockResolvedValue({ ok: true }), regions = {}, events } = opts;
  return {
    id: 'editor-1',
    path: 'test.editor-1',
    schema: { type: 'scada-editor-canvas' } as ScadaEditorCanvasSchema & SchemaObject,
    templateNode: {} as RendererComponentProps<ScadaEditorCanvasSchema>['templateNode'],
    node: {} as RendererComponentProps<ScadaEditorCanvasSchema>['node'],
    props: {
      config: validEditorConfig() as unknown as ScadaEditorCanvasSchema['config'],
      ...(events ? { events } : {}),
    } as RendererComponentProps<ScadaEditorCanvasSchema>['props'],
    meta: {
      visible: true,
      hidden: false,
      disabled: false,
      changed: false,
      cid,
    } as RendererComponentProps<ScadaEditorCanvasSchema>['meta'],
    regions: regions as RendererComponentProps<ScadaEditorCanvasSchema>['regions'],
    events: {},
    reactions: {},
    helpers: { dispatch } as unknown as RendererComponentProps<ScadaEditorCanvasSchema>['helpers'],
  };
}

async function waitForReady(container: HTMLElement): Promise<number> {
  await waitFor(() => {
    expect(container.querySelector('[data-slot="scada-editor-canvas"]')?.getAttribute('data-status')).toBe('ready');
  });
  const root = container.querySelector('[data-slot="scada-editor-canvas"]') as HTMLElement;
  return Number(root.getAttribute('data-cid'));
}

describe('scada-editor-canvas region override (E6 m-2 fix: palette/inspector consult props.regions)', () => {
  it('renders built-in palette/inspector panels when no region override provided', async () => {
    const env = makeEnvironment();
    const { container } = render(
      <Providers env={env}>
        <ScadaEditorCanvasRenderer {...makeEditorProps()} />
      </Providers>,
    );
    await waitForReady(container);
    expect(container.querySelector('[data-slot="scada-editor-palette"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="scada-editor-inspector"]')).toBeTruthy();
  });

  it('renders host-provided palette region override instead of built-in panel', async () => {
    const env = makeEnvironment();
    const paletteRegion = {
      render: vi.fn(() => <div data-testid="host-palette">host-palette-content</div>),
    } as unknown as RendererComponentProps<ScadaEditorCanvasSchema>['regions'][string];
    const { container } = render(
      <Providers env={env}>
        <ScadaEditorCanvasRenderer {...makeEditorProps({ cid: 702, regions: { palette: paletteRegion } })} />
      </Providers>,
    );
    await waitForReady(container);
    expect(container.querySelector('[data-testid="host-palette"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="host-palette"]')?.textContent).toContain('host-palette-content');
    // Built-in palette panel not rendered when override present.
    expect(container.querySelector('[data-slot="scada-editor-palette"]')).toBeFalsy();
    expect(paletteRegion.render).toHaveBeenCalled();
  });

  it('renders host-provided inspector region override instead of built-in panel', async () => {
    const env = makeEnvironment();
    const inspectorRegion = {
      render: vi.fn(() => <div data-testid="host-inspector">host-inspector-content</div>),
    } as unknown as RendererComponentProps<ScadaEditorCanvasSchema>['regions'][string];
    const { container } = render(
      <Providers env={env}>
        <ScadaEditorCanvasRenderer {...makeEditorProps({ cid: 703, regions: { inspector: inspectorRegion } })} />
      </Providers>,
    );
    await waitForReady(container);
    expect(container.querySelector('[data-testid="host-inspector"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="scada-editor-inspector"]')).toBeFalsy();
    expect(inspectorRegion.render).toHaveBeenCalled();
  });
});

describe('scada-editor-canvas onSessionChange payload (E6 m-3 fix: four-field payload)', () => {
  it('onSessionChange dispatches canUndo/canRedo/selection/mode (all four fields)', async () => {
    const dispatch = vi.fn().mockResolvedValue({ ok: true });
    const env = makeEnvironment();
    const { container } = render(
      <Providers env={env}>
        <ScadaEditorCanvasRenderer
          {...makeEditorProps({
            cid: 704,
            dispatch,
            events: { onSessionChange: { action: 'noop' } },
          })}
        />
      </Providers>,
    );
    const cid = await waitForReady(container);
    const handle = readScadaEditorTestHandle(cid)!;
    dispatch.mockClear();
    handle.setSelection(['editor-rect']);
    const sessionCall = dispatch.mock.calls.find(
      ([, ctx]) => (ctx as { event?: { type?: string } }).event?.type === 'scada-editor:sessionChange',
    ) as [unknown, { event: Record<string, unknown> }] | undefined;
    expect(sessionCall).toBeDefined();
    const event = sessionCall![1].event;
    expect(event.canUndo).toBe(false);
    expect(event.canRedo).toBe(false);
    expect(event.selection).toEqual(['editor-rect']);
    expect(event.mode).toBe('edit');
  });

  it('switchMode reflects in onSessionChange payload mode field', async () => {
    const dispatch = vi.fn().mockResolvedValue({ ok: true });
    const env = makeEnvironment();
    const { container } = render(
      <Providers env={env}>
        <ScadaEditorCanvasRenderer
          {...makeEditorProps({
            cid: 705,
            dispatch,
            events: { onSessionChange: { action: 'noop' } },
          })}
        />
      </Providers>,
    );
    const cid = await waitForReady(container);
    const handle = readScadaEditorTestHandle(cid)!;
    dispatch.mockClear();
    handle.switchMode('preview');
    const sessionCall = dispatch.mock.calls.find(
      ([, ctx]) => (ctx as { event?: { type?: string } }).event?.type === 'scada-editor:sessionChange',
    ) as [unknown, { event: Record<string, unknown> }] | undefined;
    expect(sessionCall).toBeDefined();
    expect(sessionCall![1].event.mode).toBe('preview');
  });
});
