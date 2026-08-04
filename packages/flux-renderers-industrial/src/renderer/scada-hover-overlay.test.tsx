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
    symbols: [
      { id: 'rect-a', type: 'scada-rect', x: 10, y: 20, width: 100, height: 50, fill: '#ff0000' },
      { id: 'rect-b', type: 'scada-rect', x: 200, y: 20, width: 100, height: 50, fill: '#00ff00' },
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
      cid: 31,
    } as RendererComponentProps<ScadaCanvasSchema>['meta'],
    regions: {},
    events: {},
    reactions: {},
    helpers: { dispatch } as unknown as RendererComponentProps<ScadaCanvasSchema>['helpers'],
    ...overrides,
  };
}

async function waitForEngine(): Promise<ScadaCanvasEngine> {
  await waitFor(() =>
    expect((window as unknown as Record<string, unknown>)[`__flux_scada_31`]).toBeDefined(),
  );
  return ((window as unknown as Record<string, unknown>)[`__flux_scada_31`] as { engine: ScadaCanvasEngine }).engine;
}

/** 模拟指针移到指定图元（命中解析 stub 指向该图元节点）。 */
function movePointerTo(engine: ScadaCanvasEngine, symbolId: string | null, point: { x: number; y: number }): void {
  const leaf = symbolId === null ? undefined : engine.getSymbol(symbolId)?.node;
  (engine.tree as unknown as { selector: { getByPoint: (p: unknown) => unknown } }).selector.getByPoint = () =>
    (leaf ? { target: leaf, path: [leaf] } : { target: null, path: [] });
  engine.app.emit('pointer.move', point);
}

function overlayRects(engine: ScadaCanvasEngine): Array<{ x: number; y: number; width: number; height: number }> {
  const group = (engine.app.sky as unknown as { children: Array<{ children: unknown[] }> }).children.find(
    (child) => (child as { name?: string }).name === 'scada-interaction-overlay',
  );
  return (group?.children ?? []) as Array<{ x: number; y: number; width: number; height: number }>;
}

beforeEach(() => {
  resetLeaferMock();
  registerBuiltinScadaSymbols();
});

afterEach(() => {
  cleanup();
});

describe('scada-canvas hover 命中反馈覆盖物 (I11.2)', () => {
  it('shows an InteractionOverlay rect on symbol:hover and clears it on hover-miss', async () => {
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(makeProps({ node: { scope: environment.scope } as RendererComponentProps<ScadaCanvasSchema>['node'] }), environment);
    const engine = await waitForEngine();
    expect(engine.interactionOverlay).toBeDefined();

    movePointerTo(engine, 'rect-a', { x: 50, y: 50 });
    await waitFor(() => expect(engine.interactionOverlay?.activeCount).toBe(1));
    const rects = overlayRects(engine);
    expect(rects).toHaveLength(1);
    expect(rects[0]).toMatchObject({ x: 10, y: 20, width: 100, height: 50 });

    movePointerTo(engine, null, { x: 500, y: 500 });
    await waitFor(() => expect(engine.interactionOverlay?.activeCount).toBe(0));
    expect(overlayRects(engine)).toHaveLength(0);
  });

  it('follows the symbol when the node moves while hovered (覆盖物跟随图元移动)', async () => {
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(makeProps({ node: { scope: environment.scope } as RendererComponentProps<ScadaCanvasSchema>['node'] }), environment);
    const engine = await waitForEngine();

    movePointerTo(engine, 'rect-a', { x: 50, y: 50 });
    await waitFor(() => expect(engine.interactionOverlay?.activeCount).toBe(1));

    engine.getSymbol('rect-a')?.node.set({ x: 60, y: 80 });
    movePointerTo(engine, 'rect-a', { x: 100, y: 100 });
    await waitFor(() => expect(overlayRects(engine)[0].x).toBe(60));
    expect(overlayRects(engine)[0].y).toBe(80);
  });

  it('switches the overlay from A to B without residue (A→B 切换清前一覆盖物)', async () => {
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(makeProps({ node: { scope: environment.scope } as RendererComponentProps<ScadaCanvasSchema>['node'] }), environment);
    const engine = await waitForEngine();

    movePointerTo(engine, 'rect-a', { x: 50, y: 50 });
    await waitFor(() => expect(engine.interactionOverlay?.activeCount).toBe(1));

    movePointerTo(engine, 'rect-b', { x: 250, y: 50 });
    await waitFor(() => {
      const rects = overlayRects(engine);
      expect(rects).toHaveLength(1);
      expect(rects[0].x).toBe(200);
    });
    expect(engine.interactionOverlay?.activeCount).toBe(1);
  });

  it('clears the overlay of a symbol removed by applyDiff (覆盖物随图元移除清理)', async () => {
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(makeProps({ node: { scope: environment.scope } as RendererComponentProps<ScadaCanvasSchema>['node'] }), environment);
    const engine = await waitForEngine();

    movePointerTo(engine, 'rect-a', { x: 50, y: 50 });
    await waitFor(() => expect(engine.interactionOverlay?.activeCount).toBe(1));

    engine.applyDiff({ added: [], removed: ['rect-a'], updated: [] }, {
      version: 1,
      symbols: [{ id: 'rect-b', type: 'scada-rect', x: 200, y: 20, width: 100, height: 50 }],
    });
    expect(engine.interactionOverlay?.activeCount).toBe(0);
  });

  it('does not create an overlay when interactionLayer is off (开关行为)', () => {
    const engine = ScadaCanvasEngine.create({
      container: document.createElement('div'),
      width: 800,
      height: 600,
    });
    expect(engine.interactionOverlay).toBeUndefined();
    engine.destroy();

    const engineOn = ScadaCanvasEngine.create({
      container: document.createElement('div'),
      width: 800,
      height: 600,
      interactionLayer: true,
    });
    expect(engineOn.interactionOverlay).toBeDefined();
    engineOn.destroy();
  });

  it('shows a non-zero-size overlay for line/polygon symbols via points-bounds fallback (gate-4 m-C)', async () => {
    const config = {
      version: 1,
      symbols: [
        { id: 'line-a', type: 'scada-line', x: 10, y: 40, width: 120, height: 0 },
        { id: 'poly-a', type: 'scada-polygon', x: 20, y: 80 },
      ],
    } as ScadaConfig;
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(
      makeProps({
        props: { config: configProp(config), width: 800, height: 600 },
        node: { scope: environment.scope } as RendererComponentProps<ScadaCanvasSchema>['node'],
      }),
      environment,
    );
    const engine = await waitForEngine();
    await waitFor(() => expect(engine.getSymbol('line-a')).toBeDefined());

    movePointerTo(engine, 'line-a', { x: 50, y: 40 });
    await waitFor(() => expect(engine.interactionOverlay?.activeCount).toBe(1));
    let rect = overlayRects(engine)[0];
    expect(rect.width).toBeGreaterThan(0);
    expect(rect.height).toBeGreaterThan(0);
    expect(rect.x).toBeGreaterThanOrEqual(10);
    expect(rect.y).toBeGreaterThanOrEqual(40);

    movePointerTo(engine, 'poly-a', { x: 60, y: 120 });
    await waitFor(() => {
      rect = overlayRects(engine)[0];
      expect(rect.width).toBeGreaterThan(0);
      expect(rect.height).toBeGreaterThan(0);
      expect(rect.x).toBeGreaterThanOrEqual(20);
      expect(rect.y).toBeGreaterThanOrEqual(80);
    });
  });
});
