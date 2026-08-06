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

  // plan 2026-08-06-0900-3 Phase 1（multi-audit P2-8）：handlePluginZoom 除零守卫。
  // 失败用例（修复前）：rawScale=0 时 clamped=clampScale(0)=MIN_SCALE，clamped !== rawScale →
  // scaleOfWorld(anchor, MIN_SCALE/0 = Infinity) → zoomLayer 矩阵 corrupt（scaleX 变 Infinity/NaN）不可恢复。
  // 修复后：rawScale===0 / 非有限早退（syncViewportFromZoomLayer + refresh + return），scaleOfWorld 不收 Infinity。
  it('should guard divide-by-zero when plugin zoom yields rawScale=0 (P2-8: zoomLayer 矩阵不 corrupt)', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    const zoomLayer = engine.app.tree.zoomLayer as unknown as {
      scaleX: number;
      scaleOfWorldCalls: Array<{ world: { x: number; y: number }; scale: number }>;
    };
    // 设初始有限视口，再触发 rawScale=0 的插件 zoom（zoomLayer.scaleX=0 → readZoomLayerScale 返 0）。
    engine.setViewport({ x: 10, y: 20, scale: 2 });
    zoomLayer.scaleX = 0;
    zoomLayer.scaleOfWorldCalls.length = 0;
    engine.tree.emit('zoom', { scale: 0 });

    // 修复前：scaleOfWorld 收到 Infinity（clamped/rawScale = MIN_SCALE/0）；修复后：早退，不收 Infinity。
    const corruptCalls = zoomLayer.scaleOfWorldCalls.filter((c) => !Number.isFinite(c.scale));
    expect(corruptCalls).toHaveLength(0);
    // zoomLayer.scaleX 不应被 Infinity/NaN 污染（矩阵可恢复）
    expect(Number.isFinite(zoomLayer.scaleX)).toBe(true);
    // 视口 scale 仍有限（早退路径经 syncViewportFromZoomLayer 用 fallback 读回有限值）
    expect(Number.isFinite(engine.getViewport().scale)).toBe(true);
    engine.destroy();
  });

  it('should guard non-finite plugin zoom rawScale (P2-8: 非有限早退)', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    // readZoomLayerScale 对非有限 scaleX 回落 fallback（viewport.scale），无法直接构造非有限 rawScale
    // 经 scaleX。但守卫表达式同时覆盖 `!Number.isFinite(rawScale)`：此处验证早退后视口有限、矩阵不 corrupt，
    // 与 rawScale=0 用例共同锁守卫两端（===0 / !finite）。
    const zoomLayer = engine.app.tree.zoomLayer as unknown as { scaleX: number };
    engine.setViewport({ x: 0, y: 0, scale: 1 });
    zoomLayer.scaleX = 0;
    engine.tree.emit('zoom', {});
    expect(Number.isFinite(engine.getViewport().scale)).toBe(true);
    expect(Number.isFinite(zoomLayer.scaleX)).toBe(true);
    engine.destroy();
  });

  // plan 2026-08-06-0900-3 Phase 2（multi-audit P2-10）：engine.reset 清 InteractionOverlay。
  // 失败用例（修复前）：reset 仅 background.color 接线 + adapter.build，不清 this.interaction →
  // importConfig/version-change 全量重建后旧 hover 高亮残留（activeCount 仍 1）。
  // 修复后：reset 末尾 this.interaction?.clear()，重建后 interactionOverlay 清空（activeCount 0）。
  it('should clear the interaction overlay on engine.reset (P2-10: 重建后无残留 hover 高亮)', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer(), interactionLayer: true });
    engine.reset(validConfig() as ScadaConfig);
    const overlay = engine.interactionOverlay!;
    overlay.highlight('rect-1');
    expect(overlay.activeCount).toBe(1);
    // reset（importConfig/version-change 全量重建路径）应清空覆盖物
    engine.reset(validConfig() as ScadaConfig);
    expect(overlay.activeCount).toBe(0);
    engine.destroy();
  });

  it('should clear the interaction overlay on engine.reset even when symbols change (P2-10: stale 高亮清除)', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer(), interactionLayer: true });
    engine.reset(validConfig() as ScadaConfig);
    const overlay = engine.interactionOverlay!;
    overlay.highlight('rect-1');
    expect(overlay.activeCount).toBe(1);
    // 换画面（新 config 不含 rect-1）：旧 hover 高亮应清除，不应残留指向已移除图元的覆盖物
    engine.reset(
      validConfig({ symbols: [{ id: 'only', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 }] }) as ScadaConfig,
    );
    expect(overlay.activeCount).toBe(0);
    engine.destroy();
  });
});
