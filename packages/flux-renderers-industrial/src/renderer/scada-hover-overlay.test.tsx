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
import type { ScadaCanvasSchema } from '../schemas.js';
import type { ScadaConfig } from '../serialization/config-types.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));

const overlayConfig = (): ScadaConfig =>
  validCanvasConfig({
    symbols: [
      { id: 'rect-a', type: 'scada-rect', x: 10, y: 20, width: 100, height: 50, fill: '#ff0000' },
      { id: 'rect-b', type: 'scada-rect', x: 200, y: 20, width: 100, height: 50, fill: '#00ff00' },
    ],
  });

async function waitForEngine(): Promise<ScadaCanvasEngine> {
  await waitFor(() => expect(scadaTestHandle(31)).toBeDefined());
  return scadaTestHandle(31)?.engine as ScadaCanvasEngine;
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
    renderScadaCanvas(makeScadaCanvasProps({ cid: 31, props: { config: configProp(overlayConfig()), width: 800, height: 600 }, node: { scope: environment.scope } as RendererComponentProps<ScadaCanvasSchema>['node'] }), environment);
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

  it('does not refresh the overlay when the pointer moves within the same hovered symbol (WD-4 emit-level dedup)', async () => {
    // plan 2026-08-04-1558-2 Phase 2 WD-4：`symbol:hover` 同符号只发射一次（emit 层去重）。
    // 悬停同一图元时多次 pointer.move 不再触发 driveHover/overlay.highlight——覆盖物只在首次
    // 命中时绘制，视口变化经 `refresh()` 钩子维护（pan/zoom），图元几何变化重画属 deferred。
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(makeScadaCanvasProps({ cid: 31, props: { config: configProp(overlayConfig()), width: 800, height: 600 }, node: { scope: environment.scope } as RendererComponentProps<ScadaCanvasSchema>['node'] }), environment);
    const engine = await waitForEngine();

    movePointerTo(engine, 'rect-a', { x: 50, y: 50 });
    await waitFor(() => expect(engine.interactionOverlay?.activeCount).toBe(1));
    const initialRect = overlayRects(engine)[0];
    expect(initialRect).toMatchObject({ x: 10, y: 20, width: 100, height: 50 });

    // 同符号多次 pointer.move：覆盖物保持首次命中几何（不重读图元节点）
    engine.getSymbol('rect-a')?.node.set({ x: 60, y: 80 });
    movePointerTo(engine, 'rect-a', { x: 80, y: 40 });
    const stableRect = overlayRects(engine)[0];
    expect(stableRect.x).toBe(initialRect.x);
    expect(stableRect.y).toBe(initialRect.y);

    // 离开后重入同符号：覆盖物按最新几何重画（hover-miss 后 lastHovered 重置，重入再发射）
    movePointerTo(engine, null, { x: 500, y: 500 });
    await waitFor(() => expect(engine.interactionOverlay?.activeCount).toBe(0));
    movePointerTo(engine, 'rect-a', { x: 70, y: 90 });
    await waitFor(() => expect(overlayRects(engine)[0].x).toBe(60));
    expect(overlayRects(engine)[0].y).toBe(80);
  });

  it('switches the overlay from A to B without residue (A→B 切换清前一覆盖物)', async () => {
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(makeScadaCanvasProps({ cid: 31, props: { config: configProp(overlayConfig()), width: 800, height: 600 }, node: { scope: environment.scope } as RendererComponentProps<ScadaCanvasSchema>['node'] }), environment);
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
    renderScadaCanvas(makeScadaCanvasProps({ cid: 31, props: { config: configProp(overlayConfig()), width: 800, height: 600 }, node: { scope: environment.scope } as RendererComponentProps<ScadaCanvasSchema>['node'] }), environment);
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
      makeScadaCanvasProps({ cid: 31,
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
