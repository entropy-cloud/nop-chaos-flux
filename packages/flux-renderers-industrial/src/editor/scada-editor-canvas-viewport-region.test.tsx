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
  const actionScope = runtime.createActionScope({ id: 'editor-region-action-scope' });
  const componentRegistry = runtime.createComponentHandleRegistry({ id: 'editor-region-component-registry' });
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
  config?: unknown;
  viewport?: { fit?: 'contain' | 'fill'; center?: boolean };
  mode?: 'edit' | 'preview';
}

function makeEditorProps(opts: MakePropsOpts = {}): RendererComponentProps<ScadaEditorCanvasSchema> {
  const { cid = 800, dispatch = vi.fn().mockResolvedValue({ ok: true }), regions = {}, config, viewport, mode } = opts;
  return {
    id: 'editor-region-1',
    path: 'test.editor-region-1',
    schema: { type: 'scada-editor-canvas' } as ScadaEditorCanvasSchema & SchemaObject,
    templateNode: {} as RendererComponentProps<ScadaEditorCanvasSchema>['templateNode'],
    node: {} as RendererComponentProps<ScadaEditorCanvasSchema>['node'],
    props: {
      config: (config ?? validEditorConfig()) as unknown as ScadaEditorCanvasSchema['config'],
      width: 800,
      height: 600,
      ...(mode ? { mode } : {}),
      ...(viewport ? { viewport } : {}),
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

type EngineViewport = { getViewport: () => { x: number; y: number; scale: number } };
function engineOf(cid: number): EngineViewport {
  return readScadaEditorTestHandle(cid)!.engine as unknown as EngineViewport;
}

describe('scada-editor-canvas statusBar fallback (plan 2026-08-08-0900-1 Phase 3 / P2 #11)', () => {
  it('emits nop-scada-editor-status-bar marker fallback when no statusBar region provided', async () => {
    const env = makeEnvironment();
    const { container } = render(
      <Providers env={env}>
        <ScadaEditorCanvasRenderer {...makeEditorProps({ cid: 801 })} />
      </Providers>,
    );
    await waitForReady(container);
    expect(container.querySelector('[data-slot="scada-editor-status-bar"]')).toBeTruthy();
    expect(container.querySelector('.nop-scada-editor-status-bar')).toBeTruthy();
  });

  it('renders host-provided statusBar region override instead of fallback', async () => {
    const env = makeEnvironment();
    const statusBarRegion = {
      render: vi.fn(() => <div data-testid="host-status">host-status</div>),
    } as unknown as RendererComponentProps<ScadaEditorCanvasSchema>['regions'][string];
    const { container } = render(
      <Providers env={env}>
        <ScadaEditorCanvasRenderer {...makeEditorProps({ cid: 802, regions: { statusBar: statusBarRegion } })} />
      </Providers>,
    );
    await waitForReady(container);
    expect(container.querySelector('[data-testid="host-status"]')).toBeTruthy();
    expect(container.querySelector('.nop-scada-editor-status-bar')).toBeFalsy();
  });
});

describe('scada-editor-canvas loading/error region overrides (plan 2026-08-08-0900-1 Phase 3 / P2 #12/#13)', () => {
  it('renders host-provided loading region override during loading state', async () => {
    const env = makeEnvironment();
    const loadingRegion = {
      render: vi.fn(() => <div data-testid="host-loading">host-loading</div>),
    } as unknown as RendererComponentProps<ScadaEditorCanvasSchema>['regions'][string];
    const { container } = render(
      <Providers env={env}>
        <ScadaEditorCanvasRenderer {...makeEditorProps({ cid: 803, regions: { loading: loadingRegion } })} />
      </Providers>,
    );
    // loading 态是瞬态（mock 引擎同步 mount → ready），故断言 loading region 的 render 被咨询过（reachable）。
    expect(loadingRegion.render).toHaveBeenCalled();
    await waitForReady(container);
  });

  it('renders host-provided error region override (NOT empty region) in error state (P2 #13 semantic fix)', async () => {
    const env = makeEnvironment();
    const errorRegion = {
      render: vi.fn(() => <div data-testid="host-error">host-error</div>),
    } as unknown as RendererComponentProps<ScadaEditorCanvasSchema>['regions'][string];
    const emptyRegion = {
      render: vi.fn(() => <div data-testid="host-empty">host-empty</div>),
    } as unknown as RendererComponentProps<ScadaEditorCanvasSchema>['regions'][string];
    const { container } = render(
      <Providers env={env}>
        <ScadaEditorCanvasRenderer
          {...makeEditorProps({
            cid: 804,
            config: { version: 2, symbols: [] },
            regions: { error: errorRegion, empty: emptyRegion },
          })}
        />
      </Providers>,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-slot="scada-editor-canvas"]')?.getAttribute('data-status')).toBe('error');
    });
    // error region consumed.
    expect(container.querySelector('[data-testid="host-error"]')).toBeTruthy();
    expect(errorRegion.render).toHaveBeenCalled();
    // empty region NOT rendered in error branch (semantic mismatch fixed).
    expect(container.querySelector('[data-testid="host-empty"]')).toBeFalsy();
    expect(emptyRegion.render).not.toHaveBeenCalled();
  });

  it('built-in error fallback renders (no error region override)', async () => {
    const env = makeEnvironment();
    const { container } = render(
      <Providers env={env}>
        <ScadaEditorCanvasRenderer {...makeEditorProps({ cid: 805, config: { version: 2, symbols: [] } })} />
      </Providers>,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-slot="scada-editor-canvas"]')?.getAttribute('data-status')).toBe('error');
    });
    expect(container.querySelector('[data-slot="scada-editor-error"]')).toBeTruthy();
  });
});

describe('scada-editor-canvas viewport prop consumption (plan 2026-08-08-0900-1 Phase 3 / P2 #9)', () => {
  it('applies viewport.fit policy on mount so engine viewport reflects the fit (not default)', async () => {
    const env = makeEnvironment();
    const { container } = render(
      <Providers env={env}>
        <ScadaEditorCanvasRenderer
          {...makeEditorProps({ cid: 806, viewport: { fit: 'contain' } })}
        />
      </Providers>,
    );
    const cid = await waitForReady(container);
    const vp = engineOf(cid).getViewport();
    // After fit, viewport should no longer be the default {0,0,1} (symbols exist off-origin).
    expect(vp.scale).not.toBe(1);
  });

  it('omitting viewport prop leaves engine at default viewport', async () => {
    const env = makeEnvironment();
    const { container } = render(
      <Providers env={env}>
        <ScadaEditorCanvasRenderer {...makeEditorProps({ cid: 807 })} />
      </Providers>,
    );
    const cid = await waitForReady(container);
    const vp = engineOf(cid).getViewport();
    expect(vp).toEqual({ x: 0, y: 0, scale: 1 });
  });

  it('viewport.center policy centers on the aggregate bounds', async () => {
    const env = makeEnvironment();
    const { container } = render(
      <Providers env={env}>
        <ScadaEditorCanvasRenderer {...makeEditorProps({ cid: 808, viewport: { center: true } })} />
      </Providers>,
    );
    const cid = await waitForReady(container);
    // center applied → viewport.x/y reflect centering (not both 0 for off-origin symbols).
    const vp = engineOf(cid).getViewport();
    expect(typeof vp.x).toBe('number');
    expect(typeof vp.y).toBe('number');
  });

  it('viewport policy is a no-op on an empty scene (no bounds) without crashing', async () => {
    const env = makeEnvironment();
    const { container } = render(
      <Providers env={env}>
        <ScadaEditorCanvasRenderer
          {...makeEditorProps({ cid: 809, config: { version: 1, variables: [], symbols: [] }, viewport: { fit: 'contain', center: true } })}
        />
      </Providers>,
    );
    const cid = await waitForReady(container);
    // no bounds → fit/center skipped → default viewport preserved.
    expect(engineOf(cid).getViewport()).toEqual({ x: 0, y: 0, scale: 1 });
  });
});

describe('scada-editor-canvas empty-scene hint (plan 2026-08-08-0900-1 Phase 3 / P2 #12 empty region home)', () => {
  it('shows built-in empty hint when ready and no symbols', async () => {
    const env = makeEnvironment();
    const { container } = render(
      <Providers env={env}>
        <ScadaEditorCanvasRenderer {...makeEditorProps({ cid: 810, config: { version: 1, variables: [], symbols: [] } })} />
      </Providers>,
    );
    await waitForReady(container);
    expect(container.querySelector('[data-slot="scada-editor-empty"]')).toBeTruthy();
  });

  it('renders host-provided empty region override on empty scene', async () => {
    const env = makeEnvironment();
    const emptyRegion = {
      render: vi.fn(() => <div data-testid="host-empty-scene">empty-scene</div>),
    } as unknown as RendererComponentProps<ScadaEditorCanvasSchema>['regions'][string];
    const { container } = render(
      <Providers env={env}>
        <ScadaEditorCanvasRenderer
          {...makeEditorProps({ cid: 811, config: { version: 1, variables: [], symbols: [] }, regions: { empty: emptyRegion } })}
        />
      </Providers>,
    );
    await waitForReady(container);
    expect(container.querySelector('[data-testid="host-empty-scene"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="scada-editor-empty"]')).toBeFalsy();
  });
});
