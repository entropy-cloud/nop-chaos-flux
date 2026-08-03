import { cleanup, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RendererComponentProps, SchemaObject } from '@nop-chaos/flux-core';
import { ScadaCanvasEngine } from '../engine/scada-engine.js';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import { createScadaTestEnvironment, renderScadaCanvas } from '../test-support/renderer-test-support.js';
import type { ScadaCanvasSchema } from '../schemas.js';
import type { ScadaConfig } from '../serialization/config-types.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));

const validConfig = (): ScadaConfig =>
  ({
    version: 1,
    variables: [{ id: 'level', source: 'static', value: 10 }],
    symbols: [
      {
        id: 'rect-1',
        type: 'scada-rect',
        x: 10,
        y: 20,
        width: 100,
        height: 50,
        fill: '#ff0000',
        bindings: { fill: { point: 'level' } },
      },
    ],
  }) as ScadaConfig;

function configProp(config: ScadaConfig | { version: number } | string): ScadaCanvasConfigProp {
  return config as unknown as ScadaCanvasConfigProp;
}

type ScadaCanvasConfigProp = string | (ScadaConfig & SchemaObject);

function makeProps(
  overrides: Partial<RendererComponentProps<ScadaCanvasSchema>> & { props?: Record<string, unknown> } = {},
): RendererComponentProps<ScadaCanvasSchema> {
  const dispatch = vi.fn().mockResolvedValue({ ok: true });
  return {
    id: 'scada-1',
    path: 'test.scada-1',
    schema: { type: 'scada-canvas' } as ScadaCanvasSchema,
    templateNode: {} as RendererComponentProps<ScadaCanvasSchema>['templateNode'],
    node: {} as RendererComponentProps<ScadaCanvasSchema>['node'],
    props: { config: configProp(validConfig()), width: 800, height: 600 } as RendererComponentProps<ScadaCanvasSchema>['props'],
    meta: {
      visible: true,
      hidden: false,
      disabled: false,
      changed: false,
      cid: 11,
    } as RendererComponentProps<ScadaCanvasSchema>['meta'],
    regions: {},
    events: {},
    reactions: {},
    helpers: { dispatch } as unknown as RendererComponentProps<ScadaCanvasSchema>['helpers'],
    ...overrides,
  };
}

async function hitSymbol(environment: ReturnType<typeof createScadaTestEnvironment>, point: { x: number; y: number }) {
  const handle = (window as unknown as Record<string, unknown>)[`__flux_scada_11`] as {
    engine: ScadaCanvasEngine;
  };
  const engine = handle.engine;
  const leaf = engine.getSymbol('rect-1')?.node;
  (engine.tree as unknown as { selector: { getByPoint: (p: unknown) => unknown } }).selector.getByPoint = () =>
    ({ target: leaf, path: [leaf] });
  engine.tree.emit('tap', point);
}

beforeEach(() => {
  resetLeaferMock();
  registerBuiltinScadaSymbols();
});

afterEach(() => {
  cleanup();
});

describe('scada-canvas event bridging (I10.3)', () => {
  it('routes engine symbol:click to the onSymbolClick action with a normalized event payload', async () => {
    const dispatch = vi.fn().mockResolvedValue({ ok: true });
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(
      makeProps({
        props: { config: configProp(validConfig()), width: 800, height: 600, events: { onSymbolClick: { action: 'noop' } } },
        node: { scope: environment.scope } as RendererComponentProps<ScadaCanvasSchema>['node'],
        helpers: { dispatch } as unknown as RendererComponentProps<ScadaCanvasSchema>['helpers'],
      }),
      environment,
    );
    await waitFor(() =>
      expect((window as unknown as Record<string, unknown>)[`__flux_scada_11`]).toBeDefined(),
    );
    await hitSymbol(environment, { x: 100, y: 200 });
    await waitFor(() => expect(dispatch).toHaveBeenCalled());
    const [action, ctx] = dispatch.mock.calls[0] as [
      { action: string },
      {
        event: {
          type: string;
          symbolId: string;
          symbolType: string;
          world: { x: number; y: number };
          viewport: { x: number; y: number };
          pointValues: { level: number };
        };
        scope: unknown;
      },
    ];
    expect(action).toMatchObject({ action: 'noop' });
    expect(ctx.event.type).toBe('symbol:click');
    expect(ctx.event.symbolId).toBe('rect-1');
    expect(ctx.event.symbolType).toBe('scada-rect');
    expect(ctx.event.world).toEqual({ x: 100, y: 200 });
    expect(ctx.event.viewport).toEqual({ x: 100, y: 200 });
    expect(ctx.event.pointValues).toEqual({ level: 10 });
    expect(ctx.scope).toBe(environment.scope);
  });

  it('maps symbol:dblclick and symbol:hover to their own actions', async () => {
    const dispatch = vi.fn().mockResolvedValue({ ok: true });
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(
      makeProps({
        props: {
          config: configProp(validConfig()),
          width: 800,
          height: 600,
          events: {
            onSymbolDblClick: { action: 'noop' },
            onSymbolHover: { action: 'noop' },
          },
        },
        node: { scope: environment.scope } as RendererComponentProps<ScadaCanvasSchema>['node'],
        helpers: { dispatch } as unknown as RendererComponentProps<ScadaCanvasSchema>['helpers'],
      }),
      environment,
    );
    await waitFor(() =>
      expect((window as unknown as Record<string, unknown>)[`__flux_scada_11`]).toBeDefined(),
    );
    const handle = (window as unknown as Record<string, unknown>)[`__flux_scada_11`] as {
      engine: ScadaCanvasEngine;
    };
    const engine = handle.engine;
    const leaf = engine.getSymbol('rect-1')?.node;
    (engine.tree as unknown as { selector: { getByPoint: (p: unknown) => unknown } }).selector.getByPoint = () =>
      ({ target: leaf, path: [leaf] });

    engine.tree.emit('double_tap', { x: 10, y: 20 });
    engine.tree.emit('pointer.move', { x: 30, y: 40 });

    await waitFor(() => expect(dispatch.mock.calls.length).toBe(2));
    const types = dispatch.mock.calls.map((call) => (call[1] as { event: { type: string } }).event.type);
    expect(types).toEqual(['symbol:dblclick', 'symbol:hover']);
    expect(
      (dispatch.mock.calls[0][1] as { event: { symbolId: string } }).event.symbolId,
    ).toBe('rect-1');
  });

  it('does not dispatch when no schema-level handler is declared (I11.1 bridge base)', async () => {
    const dispatch = vi.fn().mockResolvedValue({ ok: true });
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(
      makeProps({
        props: { config: configProp(validConfig()), width: 800, height: 600 },
        node: { scope: environment.scope } as RendererComponentProps<ScadaCanvasSchema>['node'],
        helpers: { dispatch } as unknown as RendererComponentProps<ScadaCanvasSchema>['helpers'],
      }),
      environment,
    );
    await waitFor(() =>
      expect((window as unknown as Record<string, unknown>)[`__flux_scada_11`]).toBeDefined(),
    );
    await hitSymbol(environment, { x: 5, y: 5 });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(dispatch).not.toHaveBeenCalled();
  });
});
