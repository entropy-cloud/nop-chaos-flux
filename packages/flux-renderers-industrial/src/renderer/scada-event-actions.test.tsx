import { cleanup, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { ScadaCanvasEngine } from '../engine/scada-engine.js';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import {
  configProp,
  createScadaTestEnvironment,
  makeScadaCanvasProps,
  renderScadaCanvas,
  scadaTestHandle,
  validCanvasConfig,
} from '../test-support/renderer-test-support.js';
import { collectSymbolEvents } from './hooks/use-scada-events.js';
import type { ScadaCanvasSchema } from '../schemas.js';
import type { ScadaConfig } from '../serialization/config-types.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));

const DIALOG_ACTION = { action: 'openDialog', args: { dialogId: 'i11-dialog' } };
const NAVIGATE_ACTION = { action: 'navigate', args: { url: '#/flux-basic' } };
const AJAX_ACTION = { action: 'ajax', args: { url: '/api/i11/points', method: 'get' } };

const actionsConfig = (): ScadaConfig =>
  validCanvasConfig({
    variables: [{ id: 'level', source: 'static', value: 10 }],
    symbols: [
      {
        id: 'rect-a',
        type: 'scada-rect',
        x: 10,
        y: 20,
        width: 100,
        height: 50,
        fill: '#ff0000',
        bindings: { fill: { point: 'level' } },
        events: [
          { on: 'click', action: DIALOG_ACTION },
          { on: 'dblclick', action: NAVIGATE_ACTION },
        ],
      },
      {
        id: 'rect-b',
        type: 'scada-rect',
        x: 200,
        y: 20,
        width: 100,
        height: 50,
        fill: '#00ff00',
        events: [{ on: 'click', action: AJAX_ACTION }],
      },
    ],
  });

async function waitForEngine(): Promise<ScadaCanvasEngine> {
  await waitFor(() => expect(scadaTestHandle(21)).toBeDefined());
  return scadaTestHandle(21)?.engine as ScadaCanvasEngine;
}

function pointAt(engine: ScadaCanvasEngine, symbolId: string, point: { x: number; y: number }): void {
  const leaf = engine.getSymbol(symbolId)?.node;
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

describe('collectSymbolEvents 声明索引纯逻辑 (I11.1)', () => {
  it('should index events declarations by symbolId including group children', () => {
    const config = {
      version: 1,
      symbols: [
        { id: 'a', type: 'scada-rect', events: [{ on: 'click', action: { action: 'noop' } }] },
        {
          id: 'g',
          type: 'scada-group',
          children: [{ id: 'b', type: 'scada-rect', events: [{ on: 'hover', action: { action: 'noop' } }] }],
        },
        { id: 'c', type: 'scada-rect' },
      ],
    } as unknown as ScadaConfig;
    const index = collectSymbolEvents(config);
    expect(index.get('a')).toHaveLength(1);
    expect(index.get('b')).toHaveLength(1);
    expect(index.get('c')).toBeUndefined();
  });

  it('should return an empty index for an undefined config', () => {
    expect(collectSymbolEvents(undefined).size).toBe(0);
  });
});

describe('scada-canvas 组态内图元事件声明→action 全链路 (I11.1)', () => {
  it('dispatches the declared action for symbol:click with the normalized payload shape', async () => {
    const dispatch = vi.fn().mockResolvedValue({ ok: true });
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(
      makeScadaCanvasProps({
        cid: 21,
        props: { config: configProp(actionsConfig()), width: 800, height: 600 },
        node: { scope: environment.scope } as RendererComponentProps<ScadaCanvasSchema>['node'],
        helpers: { dispatch } as unknown as RendererComponentProps<ScadaCanvasSchema>['helpers'],
      }),
      environment,
    );
    const engine = await waitForEngine();
    pointAt(engine, 'rect-a', { x: 100, y: 200 });
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
    expect(action).toMatchObject(DIALOG_ACTION);
    expect(ctx.event.type).toBe('symbol:click');
    expect(ctx.event.symbolId).toBe('rect-a');
    expect(ctx.event.symbolType).toBe('scada-rect');
    expect(ctx.event.world).toEqual({ x: 100, y: 200 });
    expect(ctx.event.viewport).toEqual({ x: 100, y: 200 });
    expect(ctx.event.pointValues).toEqual({ level: 10 });
    expect(ctx.scope).toBe(environment.scope);
  });

  it('declaration wins over the schema-level global hook (声明优先，props.events 兜底)', async () => {
    const dispatch = vi.fn().mockResolvedValue({ ok: true });
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(
      makeScadaCanvasProps({ cid: 21,
        props: {
          config: configProp(actionsConfig()),
          width: 800,
          height: 600,
          events: { onSymbolClick: { action: 'showToast', args: { message: 'global hook' } } },
        },
        node: { scope: environment.scope } as RendererComponentProps<ScadaCanvasSchema>['node'],
        helpers: { dispatch } as unknown as RendererComponentProps<ScadaCanvasSchema>['helpers'],
      }),
      environment,
    );
    const engine = await waitForEngine();
    pointAt(engine, 'rect-a', { x: 100, y: 200 });
    await waitFor(() => expect(dispatch).toHaveBeenCalled());
    expect(dispatch.mock.calls[0][0]).toMatchObject(DIALOG_ACTION);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('falls back to the schema-level global hook when the symbol has no declaration', async () => {
    const dispatch = vi.fn().mockResolvedValue({ ok: true });
    const environment = createScadaTestEnvironment([]);
    const config = actionsConfig();
    const noDeclarationConfig = {
      ...config,
      symbols: [{ id: 'rect-c', type: 'scada-rect', x: 10, y: 20, width: 100, height: 50 }],
    } as ScadaConfig;
    renderScadaCanvas(
      makeScadaCanvasProps({ cid: 21,
        props: {
          config: configProp(noDeclarationConfig),
          width: 800,
          height: 600,
          events: { onSymbolClick: { action: 'showToast', args: { message: 'global hook' } } },
        },
        node: { scope: environment.scope } as RendererComponentProps<ScadaCanvasSchema>['node'],
        helpers: { dispatch } as unknown as RendererComponentProps<ScadaCanvasSchema>['helpers'],
      }),
      environment,
    );
    const engine = await waitForEngine();
    pointAt(engine, 'rect-c', { x: 50, y: 60 });
    await waitFor(() => expect(dispatch).toHaveBeenCalled());
    expect(dispatch.mock.calls[0][0]).toMatchObject({ action: 'showToast' });
  });

  it('dispatches the dblclick declaration when a declaration exists for that event', async () => {
    const dispatch = vi.fn().mockResolvedValue({ ok: true });
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(
      makeScadaCanvasProps({
        cid: 21,
        props: { config: configProp(actionsConfig()), width: 800, height: 600 },
        node: { scope: environment.scope } as RendererComponentProps<ScadaCanvasSchema>['node'],
        helpers: { dispatch } as unknown as RendererComponentProps<ScadaCanvasSchema>['helpers'],
      }),
      environment,
    );
    const engine = await waitForEngine();
    const leaf = engine.getSymbol('rect-a')?.node;
    (engine.tree as unknown as { selector: { getByPoint: (p: unknown) => unknown } }).selector.getByPoint = () =>
      ({ target: leaf, path: [leaf] });
    engine.tree.emit('double_tap', { x: 10, y: 20 });
    await waitFor(() => expect(dispatch).toHaveBeenCalled());
    expect(dispatch.mock.calls[0][0]).toMatchObject(NAVIGATE_ACTION);
    expect(
      (dispatch.mock.calls[0][1] as { event: { type: string } }).event.type,
    ).toBe('symbol:dblclick');
  });

  it('double tap merges into dblclick only — no click dispatch (双击只派发 dblclick)', async () => {
    const dispatch = vi.fn().mockResolvedValue({ ok: true });
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(
      makeScadaCanvasProps({ cid: 21,
        props: {
          config: configProp(actionsConfig()),
          width: 800,
          height: 600,
          events: { onSymbolClick: { action: 'showToast' } },
        },
        node: { scope: environment.scope } as RendererComponentProps<ScadaCanvasSchema>['node'],
        helpers: { dispatch } as unknown as RendererComponentProps<ScadaCanvasSchema>['helpers'],
      }),
      environment,
    );
    const engine = await waitForEngine();
    pointAt(engine, 'rect-a', { x: 10, y: 20 });
    pointAt(engine, 'rect-a', { x: 10, y: 20 });
    await waitFor(() => expect(dispatch).toHaveBeenCalled());
    expect(dispatch).toHaveBeenCalledTimes(1);
    const [action, ctx] = dispatch.mock.calls[0] as [{ action: string }, { event: { type: string } }];
    expect(action).toMatchObject(NAVIGATE_ACTION);
    expect(ctx.event.type).toBe('symbol:dblclick');
  });

  it('routes an illegal declaration to onError via config validation (非法声明 → onError)', async () => {
    const dispatch = vi.fn().mockResolvedValue({ ok: true });
    const environment = createScadaTestEnvironment([]);
    const invalidConfig = {
      version: 1,
      symbols: [
        {
          id: 'rect-bad',
          type: 'scada-rect',
          x: 10,
          y: 20,
          width: 100,
          height: 50,
          events: [{ on: 'drag', action: { action: 'noop' } }],
        },
      ],
    } as unknown as ScadaConfig;
    renderScadaCanvas(
      makeScadaCanvasProps({ cid: 21,
        props: {
          config: configProp(invalidConfig),
          width: 800,
          height: 600,
          events: { onError: { action: 'showToast', args: { message: 'invalid' } } },
        },
        node: { scope: environment.scope } as RendererComponentProps<ScadaCanvasSchema>['node'],
        helpers: { dispatch } as unknown as RendererComponentProps<ScadaCanvasSchema>['helpers'],
      }),
      environment,
    );
    await waitFor(() => expect(dispatch).toHaveBeenCalled());
    const [action, ctx] = dispatch.mock.calls[0] as [
      { action: string },
      { event: { type: string; code: string } },
    ];
    expect(action).toMatchObject({ action: 'showToast' });
    expect(ctx.event.type).toBe('scada:error');
    expect(ctx.event.code).toBe('config-invalid');
  });

  it('does not dispatch when neither declaration nor global hook exists', async () => {
    const dispatch = vi.fn().mockResolvedValue({ ok: true });
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(
      makeScadaCanvasProps({
        cid: 21,
        props: { config: configProp(actionsConfig()), width: 800, height: 600 },
        node: { scope: environment.scope } as RendererComponentProps<ScadaCanvasSchema>['node'],
        helpers: { dispatch } as unknown as RendererComponentProps<ScadaCanvasSchema>['helpers'],
      }),
      environment,
    );
    const engine = await waitForEngine();
    const leaf = engine.getSymbol('rect-b')?.node;
    (engine.tree as unknown as { selector: { getByPoint: (p: unknown) => unknown } }).selector.getByPoint = () =>
      ({ target: leaf, path: [leaf] });
    engine.app.emit('pointer.move', { x: 30, y: 40 });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(dispatch).not.toHaveBeenCalled();
  });
});
