import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { ScadaCanvasEngine } from './scada-engine.js';
import type { ScadaConfig } from '../serialization/config-types.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));

const makeContainer = () => {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: 800, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: 600, configurable: true });
  return el;
};

const validConfig = (overrides: Record<string, unknown> = {}) => ({
  version: 1,
  symbols: [
    { id: 'rect-1', type: 'scada-rect', x: 10, y: 20, width: 100, height: 50, fill: '#ff0000' },
    { id: 'rect-2', type: 'scada-rect', x: 200, y: 20, width: 100, height: 50, fill: '#00ff00' },
  ],
  ...overrides,
});

beforeEach(() => {
  resetLeaferMock();
  registerBuiltinScadaSymbols();
});

// 拆分自 scada-engine.test.ts：插件 zoom/move 同步、视口钳制兜底、交互覆盖层（P1-7/P1-9/D3）
// 全部属于「视口/插件状态同步 + 交互层」聚焦域。仅移动、不改断言。
describe('ScadaCanvasEngine 插件交互状态同步与钳制兜底 (I11.2)', () => {
  it('should sync in-bounds plugin zoom into the viewport state on tree zoom event', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    const zoomLayer = engine.app.tree.zoomLayer as unknown as { scaleX: number };
    zoomLayer.scaleX = 2;
    engine.tree.emit('zoom', { scale: 2 });
    expect(engine.getViewport()).toEqual({ x: 0, y: 0, scale: 2 });
    engine.destroy();
  });

  it('should clamp out-of-bounds plugin zoom back to MAX_SCALE (越界缩放重钳制)', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    const zoomLayer = engine.app.tree.zoomLayer as unknown as { scaleX: number };
    zoomLayer.scaleX = 25;
    engine.tree.emit('zoom', { scale: 25 });
    expect(engine.getViewport().scale).toBe(20);
    expect(zoomLayer.scaleX).toBeCloseTo(20, 10);
    engine.destroy();
  });

  it('should clamp out-of-bounds plugin zoom back to MIN_SCALE', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    const zoomLayer = engine.app.tree.zoomLayer as unknown as { scaleX: number };
    zoomLayer.scaleX = 0.01;
    engine.tree.emit('zoom', { scale: 0.01 });
    expect(engine.getViewport().scale).toBe(0.1);
    expect(zoomLayer.scaleX).toBeCloseTo(0.1, 10);
    engine.destroy();
  });

  it('should sync plugin pan into the viewport state on tree move event', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.setViewport({ x: 0, y: 0, scale: 2 });
    engine.app.tree.zoomLayer.move({ x: -100, y: -60 });
    engine.tree.emit('move', { moveX: 100, moveY: 60 });
    expect(engine.getViewport()).toEqual({ x: 50, y: 30, scale: 2 });
    engine.destroy();
  });

  it('should keep engine viewport state consistent with engine commands after plugin sync', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.setViewport({ x: 50, y: 30, scale: 2 });
    engine.app.tree.zoomLayer.move({ x: -20, y: -10 });
    engine.tree.emit('move', {});
    expect(engine.getViewport()).toEqual({ x: 60, y: 35, scale: 2 });
    engine.destroy();
  });

  it('applyDiff should clear the interaction overlay of removed symbols and reposition updated ones', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer(), interactionLayer: true });
    engine.reset(validConfig() as ScadaConfig);
    const overlay = engine.interactionOverlay;
    expect(overlay).toBeDefined();
    overlay!.highlight('rect-1');
    expect(overlay!.activeCount).toBe(1);
    engine.applyDiff({ added: [], removed: ['rect-1'], updated: [] }, validConfig() as ScadaConfig);
    expect(overlay!.activeCount).toBe(0);
    engine.destroy();
  });

  it('applyDiff should reposition the overlay of an updated symbol while hovered', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer(), interactionLayer: true });
    engine.reset(validConfig() as ScadaConfig);
    const overlay = engine.interactionOverlay!;
    overlay.highlight('rect-1');
    expect(overlay.activeCount).toBe(1);
    engine.applyDiff(
      { added: [], removed: [], updated: [{ id: 'rect-1', patch: { x: 500, y: 300 } }] },
      validConfig() as ScadaConfig,
    );
    const group = (engine.app.sky as unknown as { children: Array<{ children: Array<{ x: number; y: number }> }> }).children.find(
      (child) => (child as { name?: string }).name === 'scada-interaction-overlay',
    );
    const rects = group?.children ?? [];
    expect(rects).toHaveLength(1);
    expect(rects[0].x).toBe(500);
    expect(rects[0].y).toBe(300);
    engine.destroy();
  });

  it('overlay group should be non-hittable so pointer events reach the tree (P1-7)', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer(), interactionLayer: true });
    engine.reset(validConfig() as ScadaConfig);
    engine.interactionOverlay!.highlight('rect-1');
    const group = (engine.app.sky as unknown as { children: Array<{ name?: string; hittable?: boolean }> }).children.find(
      (child) => (child as { name?: string }).name === 'scada-interaction-overlay',
    );
    expect(group?.hittable).toBe(false);
    engine.destroy();
  });

  it('overlay should be drawn in screen coordinates aligned with the symbol under a non-identity viewport (P1-7)', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer(), interactionLayer: true });
    engine.reset(validConfig() as ScadaConfig);
    engine.setViewport({ x: 100, y: 0, scale: 2 });
    engine.interactionOverlay!.highlight('rect-1');
    const group = (engine.app.sky as unknown as { children: Array<{ children: Array<Record<string, unknown>> }> }).children.find(
      (child) => (child as { name?: string }).name === 'scada-interaction-overlay',
    );
    const rects = group?.children ?? [];
    expect(rects).toHaveLength(1);
    // world rect-1 = {x:10,y:20,w:100,h:50} → screen (world - vx)·s = {(-180), 40}；宽/高乘 scale
    expect(rects[0].x).toBeCloseTo(-180, 6);
    expect(rects[0].y).toBeCloseTo(40, 6);
    expect(rects[0].width).toBeCloseTo(200, 6);
    expect(rects[0].height).toBeCloseTo(100, 6);
    // strokeWidth 保持 preset 屏幕像素（不除 scale）
    expect(rects[0].strokeWidth).toBe(2);
    engine.destroy();
  });

  it('overlay should be repositioned after a viewport command change (refresh hook, P1-7)', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer(), interactionLayer: true });
    engine.reset(validConfig() as ScadaConfig);
    engine.setViewport({ x: 100, y: 0, scale: 2 });
    engine.interactionOverlay!.highlight('rect-1');
    // 命令路径：setViewport/zoomAt/fit/center → applyViewportState → refresh
    engine.setViewport({ x: 0, y: 0, scale: 1 });
    const group = (engine.app.sky as unknown as { children: Array<{ children: Array<Record<string, unknown>> }> }).children.find(
      (child) => (child as { name?: string }).name === 'scada-interaction-overlay',
    );
    const rects = group?.children ?? [];
    expect(rects).toHaveLength(1);
    expect(rects[0].x).toBeCloseTo(10, 6);
    expect(rects[0].y).toBeCloseTo(20, 6);
    expect(rects[0].width).toBeCloseTo(100, 6);
    expect(rects[0].height).toBeCloseTo(50, 6);
    engine.destroy();
  });

  it('overlay should be repositioned after plugin zoom/move sync (refresh hook, P1-7)', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer(), interactionLayer: true });
    engine.reset(validConfig() as ScadaConfig);
    engine.setViewport({ x: 100, y: 0, scale: 2 });
    engine.interactionOverlay!.highlight('rect-1');
    const zoomLayer = engine.app.tree.zoomLayer as unknown as { scaleX: number };
    const group = () => {
      const g = (engine.app.sky as unknown as { children: Array<{ children: Array<Record<string, unknown>> }> }).children.find(
        (child) => (child as { name?: string }).name === 'scada-interaction-overlay',
      );
      return g?.children ?? [];
    };
    // 插件 zoom 路径：zoomLayer.scaleX=4 → 视口 {x:50,y:0,scale:4} → screen (10-50)*4=-160, 20*4=80
    zoomLayer.scaleX = 4;
    engine.tree.emit('zoom', { scale: 4 });
    expect(engine.getViewport()).toEqual({ x: 50, y: 0, scale: 4 });
    expect(group()[0].x).toBeCloseTo(-160, 6);
    expect(group()[0].y).toBeCloseTo(80, 6);
    expect(group()[0].width).toBeCloseTo(400, 6);
    expect(group()[0].height).toBeCloseTo(200, 6);
    // 插件 move 路径：zoomLayer 平移 -40 → 视口 x 60 → screen (10-60)*4=-200
    engine.app.tree.zoomLayer.move({ x: -40, y: 0 });
    engine.tree.emit('move', {});
    expect(engine.getViewport()).toEqual({ x: 60, y: 0, scale: 4 });
    expect(group()[0].x).toBeCloseTo(-200, 6);
    engine.destroy();
  });
});
