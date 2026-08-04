import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetLeaferMock, MockRect } from '../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { registerScadaSymbol, unregisterScadaSymbol } from '../symbols/symbol-registry.js';
import { scadaTestHandleKey } from './test-handle.js';
import { ScadaCanvasEngine } from './scada-engine.js';
import { PointStore } from '../binding/point-store.js';
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

describe('ScadaCanvasEngine lifecycle (I5.1)', () => {
  it('create should assemble three layers with viewport tree type (A1)', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    const app = engine.app as unknown as {
      config: { tree: { type: string }; ground?: unknown; sky?: unknown };
      tree: unknown;
      ground: unknown;
      sky: unknown;
    };
    expect(app.config.tree.type).toBe('viewport');
    // 三层必须真实存在：leafer App 仅当 config 含对应 key 时创建该层
    // （web.module.js App.init）——缺失 sky 时 InteractionOverlay 构造崩溃（hover 链路，regression gate）。
    expect(app.ground).toBeDefined();
    expect(app.sky).toBeDefined();
    expect(app.config.ground).toEqual({});
    expect(app.config.sky).toEqual({});
    expect(engine.tree).toBe(app.tree);
    expect(engine.ground).toBe(app.ground);
    expect(engine.sky).toBe(app.sky);
    expect((app.tree as { zoomLayer?: unknown }).zoomLayer).toBeDefined();
  });

  it('create should forward performance options into leafer config', () => {
    const engine = ScadaCanvasEngine.create({
      container: makeContainer(),
      performance: { usePartRender: false, lazySpeard: 50 },
    });
    const config = (engine.app as unknown as { config: Record<string, unknown> }).config;
    expect(config.usePartRender).toBe(false);
    expect(config.lazySpeard).toBe(50);
    expect(config.usePartLayout).toBe(true);
  });

  it('create should apply background color to the ground layer', () => {
    const engine = ScadaCanvasEngine.create({
      container: makeContainer(),
      background: { color: '#112233' },
    });
    const ground = engine.ground as unknown as { fill?: string };
    expect(ground.fill).toBe('#112233');
    engine.destroy();
  });

  it('tree render event should drive onRender frames (A2)', () => {
    const onRender = vi.fn();
    const engine = ScadaCanvasEngine.create({ container: makeContainer(), onRender });
    engine.tree.emit('render', {});
    expect(onRender).toHaveBeenCalledTimes(1);
    expect(onRender).toHaveBeenCalledWith({ frame: 1, dirtyBlocks: 0 });
    engine.tree.emit('render', {});
    expect(onRender).toHaveBeenCalledWith({ frame: 2, dirtyBlocks: 0 });
  });

  it('destroy should be idempotent, release app, remove handle and detach render listener', () => {
    const onRender = vi.fn();
    const engine = ScadaCanvasEngine.create({
      container: makeContainer(),
      exposeTestHandle: true,
      cid: 7,
      onRender,
    });
    const app = engine.app as unknown as { destroyed: boolean };
    engine.destroy();
    engine.destroy();
    expect(app.destroyed).toBe(true);
    expect(engine.isDestroyed()).toBe(true);
    expect((window as unknown as Record<string, unknown>)[scadaTestHandleKey(7)]).toBeUndefined();
    engine.tree.emit('render', {});
    expect(onRender).not.toHaveBeenCalled();
    expect(engine.registry.size()).toBe(0);
  });

  it('duplicate create should yield independent instances with distinct cids', () => {
    const a = ScadaCanvasEngine.create({ container: makeContainer(), exposeTestHandle: true });
    const b = ScadaCanvasEngine.create({ container: makeContainer(), exposeTestHandle: true });
    expect(a).not.toBe(b);
    a.destroy();
    b.destroy();
  });

  it('reset should rebuild the scene tree', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset(validConfig() as ScadaConfig);
    expect(engine.registry.size()).toBe(2);
    expect(engine.getSymbols().map((l) => l.id)).toEqual(['rect-1', 'rect-2']);
    engine.reset(validConfig({ symbols: [{ id: 'only', type: 'scada-rect', x: 0, y: 0 }] }) as ScadaConfig);
    expect(engine.registry.size()).toBe(1);
    expect(engine.getSymbol('only')).toBeDefined();
    expect(engine.getSymbol('rect-1')).toBeUndefined();
  });
});

describe('ScadaCanvasEngine test handle (I5.1)', () => {
  it('should mount window.__flux_scada_<cid> with engine/tree/app/getSymbol/getViewport/forceRender', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer(), exposeTestHandle: true, cid: 42 });
    engine.reset(validConfig() as ScadaConfig);
    const handle = (window as unknown as Record<string, unknown>)[scadaTestHandleKey(42)] as {
      engine: unknown;
      tree: unknown;
      app: unknown;
      getSymbol: (id: string) => unknown;
      getViewport: () => unknown;
      forceRender: () => void;
    };
    expect(handle).toBeDefined();
    expect(handle.engine).toBe(engine);
    expect(handle.tree).toBe(engine.tree);
    expect(handle.app).toBe(engine.app);
    expect((handle.getSymbol('rect-1') as { fill?: string }).fill).toBe('#ff0000');
    expect(handle.getViewport()).toEqual({ x: 0, y: 0, scale: 1 });
    const treeRender = vi.fn();
    engine.tree.on('render', treeRender);
    handle.forceRender();
    expect(treeRender).toHaveBeenCalled();
    engine.destroy();
    expect((window as unknown as Record<string, unknown>)[scadaTestHandleKey(42)]).toBeUndefined();
  });

  it('should not mount a handle when exposeTestHandle is false', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer(), cid: 43 });
    expect((window as unknown as Record<string, unknown>)[scadaTestHandleKey(43)]).toBeUndefined();
    engine.destroy();
  });

  it('getPointValue should project point store values when injected (I6.1)', () => {
    const store = new PointStore();
    store.loadDeclarations([
      { id: 'level', source: 'static', value: 42 },
      { id: 'raw', source: 'static', value: 1, scale: { k: 2, b: 1 } },
    ]);
    store.setPointValue('raw', 3);
    const engine = ScadaCanvasEngine.create({
      container: makeContainer(),
      exposeTestHandle: true,
      cid: 44,
      pointStore: store,
    });
    const handle = (window as unknown as Record<string, unknown>)[scadaTestHandleKey(44)] as {
      getPointValue: (pointId: string) => unknown;
    };
    expect(handle.getPointValue('level')).toBe(42);
    expect(handle.getPointValue('raw')).toBe(7);
    engine.destroy();
  });

  it('getPointValue should return undefined when no point store is injected', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer(), exposeTestHandle: true, cid: 45 });
    const handle = (window as unknown as Record<string, unknown>)[scadaTestHandleKey(45)] as {
      getPointValue: (pointId: string) => unknown;
    };
    expect(handle.getPointValue('level')).toBeUndefined();
    engine.destroy();
  });
});

describe('ScadaCanvasEngine commands (I5.1/I5.2 wiring)', () => {
  it('applyAttrs should batch-apply via generic set path and skip unknown ids', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset(validConfig() as ScadaConfig);
    engine.applyAttrs({ 'rect-1': { fill: '#123456' }, 'rect-2': { x: 999 }, missing: { fill: '#000' } });
    expect((engine.getSymbol('rect-1')?.node as { fill: string }).fill).toBe('#123456');
    expect((engine.getSymbol('rect-2')?.node as { x: number }).x).toBe(999);
  });

  it('applyAttrs should route to custom definition applyProps when provided', () => {
    const applyProps = vi.fn();
    registerScadaSymbol({
      type: 'scada-test-custom',
      name: 'Custom',
      props: { x: { type: 'number' }, y: { type: 'number' }, fill: { type: 'string' } },
      create: () => new MockRect({ x: 0, y: 0 }) as never,
      applyProps,
    });
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({ version: 1, symbols: [{ id: 'c1', type: 'scada-test-custom', x: 1, y: 2 }] } as ScadaConfig);
    engine.applyAttrs({ c1: { fill: '#abc' } });
    expect(applyProps).toHaveBeenCalledWith(
      engine.getSymbol('c1')?.node,
      expect.objectContaining({ fill: '#abc' }),
    );
    unregisterScadaSymbol('scada-test-custom');
  });

  it('getSymbolProps / setSymbolProps / getSymbols should work as convenience commands', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset(validConfig() as ScadaConfig);
    expect(engine.getSymbols().map((l) => l.id)).toEqual(['rect-1', 'rect-2']);
    engine.setSymbolProps('rect-1', { fill: '#00ff00' });
    expect((engine.getSymbolProps('rect-1') as { fill?: string }).fill).toBe('#00ff00');
    expect(engine.getSymbol('nope')).toBeUndefined();
    expect(engine.getSymbolProps('nope')).toBeUndefined();
  });

  it('pan-then-zoomAt keeps the anchor world point fixed on screen with no matrix drift (P1-9)', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    const zoomLayer = engine.app.tree.zoomLayer as unknown as { x: number; y: number; scaleX: number };
    engine.setViewport({ x: 50, y: 30, scale: 2 });
    expect(zoomLayer.x).toBeCloseTo(-100, 6);
    expect(zoomLayer.y).toBeCloseTo(-60, 6);
    engine.zoomAt({ x: 100, y: 100 }, 2);
    // zoomAt 语义：锚点世界点在其 screen 位置保持固定 → 视口 {75,65,4}
    expect(engine.getViewport()).toEqual({ x: 75, y: 65, scale: 4 });
    // 矩阵级断言：zoomLayer.x = -viewport.x * scale（gate-3-review §5 M-3 推导）——旧引擎
    // 传内容坐标锚点（viewportToWorld(cur,{0,0})）→ scaleOfWorld 把它当 screen 点固定，
    // 产生 (vx·(1-k), vy·(1-k)) 漂移（x=-450 而非 -300），此断言在新 mock + 旧引擎下失败。
    expect(zoomLayer.scaleX).toBeCloseTo(4, 6);
    expect(zoomLayer.x).toBeCloseTo(-300, 6);
    expect(zoomLayer.y).toBeCloseTo(-260, 6);
    expect(zoomLayer.x).toBeCloseTo(-engine.getViewport().x * engine.getViewport().scale, 6);
    expect(zoomLayer.y).toBeCloseTo(-engine.getViewport().y * engine.getViewport().scale, 6);
    engine.destroy();
  });

  it('plugin zoom clamp fallback should not drift the zoomLayer matrix either (P1-9 handlePluginZoom)', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    const zoomLayer = engine.app.tree.zoomLayer as unknown as { x: number; y: number; scaleX: number };
    engine.setViewport({ x: 50, y: 30, scale: 2 });
    expect(zoomLayer.x).toBeCloseTo(-100, 6);
    // 模拟插件 zoom 到越界 25x（矩阵保持与视口一致：x = -vx·scale）
    zoomLayer.scaleX = 25;
    zoomLayer.x = -50 * 25;
    zoomLayer.y = -30 * 25;
    engine.tree.emit('zoom', { scale: 25 });
    // 越界重钳制回 20：screen 原点锚定 → 视口 x/y 不变（旧实现内容坐标锚点 → 漂移 vx·(1-k)），矩阵无漂移
    expect(engine.getViewport()).toEqual({ x: 50, y: 30, scale: 20 });
    expect(zoomLayer.scaleX).toBeCloseTo(20, 6);
    expect(zoomLayer.x).toBeCloseTo(-50 * 20, 6);
    expect(zoomLayer.y).toBeCloseTo(-30 * 20, 6);
    engine.destroy();
  });

  it('setViewport / zoomAt should drive zoomLayer move and scaleOfWorld (M-3 回归：平移符号)', () => {    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    const zoomLayer = engine.tree.zoomLayer as unknown as {
      moveCalls: Array<{ x: number; y: number }>;
      scaleOfWorldCalls: Array<{ world: { x: number; y: number }; scale: number }>;
    };
    const result = engine.setViewport({ x: 50, y: 30, scale: 2 });
    expect(result).toEqual({ x: 50, y: 30, scale: 2 });
    expect(zoomLayer.scaleOfWorldCalls).toHaveLength(1);
    // zoomLayer.x = -viewport.x * scale：setViewport({50,30,2}) 应从 (0,0,1) 平移 -(50-0)*2 = -100 / -(30-0)*2 = -60
    expect(zoomLayer.moveCalls).toEqual([{ x: -100, y: -60 }]);
    const zoomed = engine.zoomAt({ x: 100, y: 100 }, 2);
    expect(zoomed.scale).toBe(4);
    expect(zoomLayer.scaleOfWorldCalls).toHaveLength(2);
    expect(engine.getViewport()).toEqual({ x: 75, y: 65, scale: 4 });
    expect(zoomLayer.moveCalls[1]).toEqual({ x: -100, y: -140 });
  });

  it('setViewport should clamp scale beyond bounds', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    expect(engine.setViewport({ x: 0, y: 0, scale: 999 }).scale).toBe(20);
  });

  it('fit / center should update viewport state', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer(), width: 800, height: 600 });
    const fitted = engine.fit({ x: 0, y: 0, width: 200, height: 100 }, 20);
    expect(fitted.scale).toBe(3.8);
    const centered = engine.center({ x: 0, y: 0, width: 200, height: 100 });
    expect(centered.scale).toBe(3.8);
  });

  it('setSize should update size and resize the app', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.setSize(1024, 768);
    const app = engine.app as unknown as { resizeCalls: Array<{ width: number; height: number }> };
    expect(app.resizeCalls).toContainEqual({ width: 1024, height: 768 });
  });

  it('getWorldPoint / getViewportPoint should map coordinates through the viewport state', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.setViewport({ x: 10, y: 20, scale: 2 });
    expect(engine.getWorldPoint({ x: 20, y: 40 })).toEqual({ x: 20, y: 40 });
    expect(engine.getViewportPoint({ x: 30, y: 60 })).toEqual({ x: 40, y: 80 });
  });
});

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

  it('overlay should be drawn in screen coordinates aligned with the symbol under a non-identity viewport (P1-7)', () => {    const engine = ScadaCanvasEngine.create({ container: makeContainer(), interactionLayer: true });
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

describe('ScadaCanvasEngine 事件桥接线 (I6.4)', () => {
  it('should emit symbol:click with normalized payload on tree tap', async () => {
    const onSymbolEvent = vi.fn();
    const engine = ScadaCanvasEngine.create({ container: makeContainer(), onSymbolEvent });
    engine.reset(validConfig() as ScadaConfig);
    const leaf = engine.getSymbol('rect-1')?.node;
    (engine.tree as unknown as { selector: { getByPoint: (p: unknown) => unknown } }).selector.getByPoint = () =>
      ({ target: leaf, path: [leaf] });
    // tap 经双击合并延迟 120ms 发射（leafer 交互层语义，I11.1 Proof）
    engine.tree.emit('tap', { x: 100, y: 200 });
    await vi.waitFor(() => expect(onSymbolEvent).toHaveBeenCalledTimes(1));
    expect(onSymbolEvent).toHaveBeenCalledWith(
      'symbol:click',
      expect.objectContaining({
        symbolId: 'rect-1',
        symbolType: 'scada-rect',
        world: { x: 100, y: 200 },
        viewport: { x: 100, y: 200 },
      }),
    );
    engine.destroy();
  });

  it('should project bound point values via getPointValuesFor into the payload', () => {
    const onSymbolEvent = vi.fn();
    const getPointValuesFor = vi.fn(() => ({ level: 42 }));
    const engine = ScadaCanvasEngine.create({ container: makeContainer(), onSymbolEvent, getPointValuesFor });
    engine.reset(validConfig() as ScadaConfig);
    const leaf = engine.getSymbol('rect-1')?.node;
    (engine.tree as unknown as { selector: { getByPoint: (p: unknown) => unknown } }).selector.getByPoint = () =>
      ({ target: leaf, path: [leaf] });
    engine.tree.emit('double_tap', { x: 10, y: 20 });
    expect(getPointValuesFor).toHaveBeenCalledWith('rect-1');
    expect(onSymbolEvent).toHaveBeenCalledWith(
      'symbol:dblclick',
      expect.objectContaining({ symbolId: 'rect-1', pointValues: { level: 42 } }),
    );
    engine.destroy();
  });

  it('should map world coordinates through the viewport state', () => {
    const onSymbolEvent = vi.fn();
    const engine = ScadaCanvasEngine.create({ container: makeContainer(), onSymbolEvent });
    engine.reset(validConfig() as ScadaConfig);
    engine.setViewport({ x: 0, y: 0, scale: 2 });
    const leaf = engine.getSymbol('rect-1')?.node;
    (engine.tree as unknown as { selector: { getByPoint: (p: unknown) => unknown } }).selector.getByPoint = () =>
      ({ target: leaf, path: [leaf] });
    engine.app.emit('pointer.move', { x: 100, y: 200 });
    expect(onSymbolEvent).toHaveBeenCalledWith(
      'symbol:hover',
      expect.objectContaining({ world: { x: 50, y: 100 }, viewport: { x: 100, y: 200 } }),
    );
    engine.destroy();
  });

  it('should not emit when no onSymbolEvent handler is provided', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset(validConfig() as ScadaConfig);
    const leaf = engine.getSymbol('rect-1')?.node;
    (engine.tree as unknown as { selector: { getByPoint: (p: unknown) => unknown } }).selector.getByPoint = () =>
      ({ target: leaf, path: [leaf] });
    engine.tree.emit('tap', { x: 10, y: 20 });
    engine.destroy();
  });

  it('destroy should detach the event bridge', () => {
    const onSymbolEvent = vi.fn();
    const engine = ScadaCanvasEngine.create({ container: makeContainer(), onSymbolEvent });
    engine.reset(validConfig() as ScadaConfig);
    const leaf = engine.getSymbol('rect-1')?.node;
    (engine.tree as unknown as { selector: { getByPoint: (p: unknown) => unknown } }).selector.getByPoint = () =>
      ({ target: leaf, path: [leaf] });
    engine.destroy();
    engine.tree.emit('tap', { x: 10, y: 20 });
    expect(onSymbolEvent).not.toHaveBeenCalled();
  });
});

describe('getSymbolDeclarations 无声明快路径 (I14.2)', () => {
  it('should return undefined when neither instance nor defaults declare states/animations', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset(validConfig() as ScadaConfig);
    expect(engine.getSymbolDeclarations('rect-1')).toBeUndefined();
    engine.destroy();
  });

  it('should return merged instance states when only the instance declares them', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({
      version: 1,
      symbols: [
        {
          id: 's',
          type: 'scada-rect',
          x: 0,
          y: 0,
          states: {
            states: { alarm: { style: { fill: '#ff0000' } } },
            booleanMap: { true: 'alarm', false: 'normal' },
          },
        },
      ],
    } as ScadaConfig);
    const declarations = engine.getSymbolDeclarations('s');
    expect(declarations?.states?.booleanMap).toEqual({ true: 'alarm', false: 'normal' });
    engine.destroy();
  });

  it('should return merged defaults when only the definition defaults declare them', () => {
    registerScadaSymbol({
      type: 'scada-test-decl-defaults',
      name: 'DeclDefaults',
      props: { x: { type: 'number' }, y: { type: 'number' }, fill: { type: 'string' } },
      defaults: {
        x: 0,
        y: 0,
        states: { states: { fault: { style: { fill: '#0000ff' } } }, booleanMap: { true: 'fault', false: 'normal' } },
      },
      create: () => ({ tag: 'Rect', set: (patch: unknown) => Object.assign({}, patch) } as never),
    });
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({
      version: 1,
      symbols: [{ id: 'd', type: 'scada-test-decl-defaults', x: 0, y: 0 }],
    } as ScadaConfig);
    const declarations = engine.getSymbolDeclarations('d');
    expect(declarations?.states?.booleanMap).toEqual({ true: 'fault', false: 'normal' });
    engine.destroy();
    unregisterScadaSymbol('scada-test-decl-defaults');
  });

  it('should let instance declarations override definition defaults', () => {
    registerScadaSymbol({
      type: 'scada-test-decl-override',
      name: 'DeclOverride',
      props: { x: { type: 'number' }, y: { type: 'number' } },
      defaults: {
        x: 0,
        y: 0,
        states: { states: { a: { style: { fill: '#ffffff' } } }, booleanMap: { true: 'a', false: 'b' } },
      },
      create: () => ({ tag: 'Rect', set: (patch: unknown) => Object.assign({}, patch) } as never),
    });
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({
      version: 1,
      symbols: [
        {
          id: 'o',
          type: 'scada-test-decl-override',
          x: 0,
          y: 0,
          states: { states: { z: { style: { fill: '#123456' } } }, booleanMap: { true: 'z', false: 'n' } },
        },
      ],
    } as ScadaConfig);
    const declarations = engine.getSymbolDeclarations('o');
    expect(declarations?.states?.booleanMap).toEqual({ true: 'z', false: 'n' });
    engine.destroy();
    unregisterScadaSymbol('scada-test-decl-override');
  });

  it('should keep returning declarations for symbols with only animations declared', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({
      version: 1,
      symbols: [
        {
          id: 'a',
          type: 'scada-rect',
          x: 0,
          y: 0,
          animations: [{ kind: 'rotate', period: 1000, when: 'always' }],
        },
      ],
    } as ScadaConfig);
    const declarations = engine.getSymbolDeclarations('a');
    expect(declarations?.animations).toEqual([{ kind: 'rotate', period: 1000, when: 'always' }]);
    engine.destroy();
  });
});

describe('ScadaCanvasEngine image cache + config projection (plan 2026-08-04-1558-3 Phase 3 覆盖缺口)', () => {
  it('cacheImage / resolveImageUrl round-trip：缓存命中返回 resolved，未缓存回退原 url', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    // 未缓存：返回原 url
    expect(engine.resolveImageUrl('https://x/a.png')).toBe('https://x/a.png');
    // 缓存写入后：命中返回 resolved
    engine.cacheImage('https://x/a.png', 'blob:resolved-a');
    expect(engine.resolveImageUrl('https://x/a.png')).toBe('blob:resolved-a');
    // 不同 url 仍未缓存
    expect(engine.resolveImageUrl('https://x/b.png')).toBe('https://x/b.png');
    engine.destroy();
  });

  it('exportConfig returns undefined before any config is built (no currentConfig)', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    expect(engine.exportConfig()).toBeUndefined();
    engine.destroy();
  });

  it('test handle measureAddStrategies projection returns count + timing shape (m-8 探针投影)', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer(), exposeTestHandle: true, cid: 77 });
    const handle = (window as unknown as Record<string, unknown>)[scadaTestHandleKey(77)] as {
      measureAddStrategies?: (count: number) => { count: number; perNodeMs: number; batchMs: number; ratio: number };
    };
    expect(handle.measureAddStrategies).toBeDefined();
    const probe = handle.measureAddStrategies!(30);
    expect(probe.count).toBe(30);
    expect(Object.keys(probe).sort()).toEqual(['batchMs', 'count', 'perNodeMs', 'ratio']);
    expect(Number.isFinite(probe.ratio)).toBe(true);
    engine.destroy();
  });
});
