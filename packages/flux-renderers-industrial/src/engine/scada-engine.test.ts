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

  // plan 2026-08-06-0900-2 Phase 3（open P2-10 getSymbolProps 读写对称 proof）：
  // getSymbolProps 原 `node.get() as ScadaSymbolProps` 返回 leafer 内部属性名（fontSize/scaleX+scaleY/dashPattern/
  // fill-for-textColor），而写侧 setSymbolProps/toNodePatch 期望 schema 名 → host getSymbol→setSymbolProps 往返喂错键。
  // 修复后 getSymbolProps 经 toNodePatch 的逆映射返回 schema 名，往返键名对称。
  it('getSymbolProps returns schema key names symmetric with setSymbolProps (plan 2026-08-06-0900-2 Phase 3 open P2-10)', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({
      version: 1,
      symbols: [
        {
          id: 't1',
          type: 'scada-text',
          x: 5,
          y: 6,
          text: 'hi',
          textSize: 18,
          textColor: '#abcdef',
          scale: 2,
          strokeDash: [4, 2],
          align: 'center',
        },
      ],
    } as unknown as ScadaConfig);
    const props = engine.getSymbolProps('t1') as unknown as Record<string, unknown>;
    // schema 键名（非 leafer fontSize/scaleX/scaleY/dashPattern/fill）
    expect(props.textSize).toBe(18);
    expect(props.scale).toBe(2);
    expect(props.strokeDash).toEqual([4, 2]);
    expect(props.textColor).toBe('#abcdef');
    expect(props.align).toBe('center');
    expect(props.text).toBe('hi');
    // leafer 别名不泄漏
    expect(props.fontSize).toBeUndefined();
    expect(props.scaleX).toBeUndefined();
    expect(props.scaleY).toBeUndefined();
    expect(props.dashPattern).toBeUndefined();

    // 往返稳定：setSymbolProps(id, getSymbolProps(id)) 后各 schema 键值不变
    engine.setSymbolProps('t1', props);
    const roundtrip = engine.getSymbolProps('t1') as unknown as Record<string, unknown>;
    expect(roundtrip.textSize).toBe(18);
    expect(roundtrip.scale).toBe(2);
    expect(roundtrip.strokeDash).toEqual([4, 2]);
    expect(roundtrip.textColor).toBe('#abcdef');
    expect(roundtrip.align).toBe('center');
    engine.destroy();
  });

  it('getSymbolProps keeps fill passthrough for non-Text nodes (rect fill stays schema fill)', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset(validConfig() as ScadaConfig);
    const props = engine.getSymbolProps('rect-1') as unknown as Record<string, unknown>;
    expect(props.fill).toBe('#ff0000');
    // rect 非 Text → 不误射 textColor
    expect(props.textColor).toBeUndefined();
    engine.destroy();
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

  // plan 2026-08-04-2243-2 D3：wheel-zoom 越界钳制以光标 screen 锚钳制（替代原点 {0,0} 兜底）。
  // 失败用例（修复前）：handlePluginZoom 钳制用 screen 原点 {0,0}，而插件 wheel 经 Transformer.zoom
  // 已按光标 scaleOfWorld 缩放 → 钳制锚点与缩放锚点不一致 → 光标下内容点视觉偏移。修复：从 ZoomEvent
  // 载荷读光标 screen 坐标作 clamp 锚（leafer-in viewport getZoomEventData 透传 event.x/y）。
  it('plugin zoom out-of-bounds clamp uses the cursor screen anchor so content under cursor stays fixed (D3)', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    const zoomLayer = engine.app.tree.zoomLayer as unknown as { x: number; y: number; scaleX: number };
    engine.setViewport({ x: 50, y: 30, scale: 2 });
    // 模拟插件 wheel 在光标 screen {200,100} 处 zoom 到越界 25x（scaleOfWorld({200,100}, 25/2) 后矩阵）：
    //   x = (-100-200)·12.5 + 200 = -3550；y = (-60-100)·12.5 + 100 = -1900；scaleX = 25
    zoomLayer.scaleX = 25;
    zoomLayer.x = -3550;
    zoomLayer.y = -1900;
    // ZoomEvent.ZOOM 经 getZoomEventData 透传光标 screen 坐标（已核实 leafer-in viewport 源码）
    engine.tree.emit('zoom', { scale: 25, x: 200, y: 100 });
    // 钳制 25→20 沿光标 {200,100}：scaleOfWorld({200,100}, 0.8) → x=-2800, y=-1500 → 视口 {140,75,20}
    expect(engine.getViewport()).toEqual({ x: 140, y: 75, scale: 20 });
    // 光标下世界点保持固定（无视觉偏移）：缩放前光标世界点 = viewportToWorld({50,30,2},{200,100}) = {150,80}
    expect(engine.getViewportPoint({ x: 150, y: 80 })).toEqual({ x: 200, y: 100 });
    engine.destroy();
  });

  it('plugin zoom clamp falls back to screen-origin anchor when the zoom event lacks cursor coords (D3 non-regression)', () => {
    // 程序触发/旧消费方：zoom 事件不携带 x/y → 回落 {0,0}（P1-9 命令路径不变式：视口 x/y 不变）。
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    const zoomLayer = engine.app.tree.zoomLayer as unknown as { x: number; y: number; scaleX: number };
    engine.setViewport({ x: 50, y: 30, scale: 2 });
    zoomLayer.scaleX = 25;
    zoomLayer.x = -50 * 25;
    zoomLayer.y = -30 * 25;
    engine.tree.emit('zoom', { scale: 25 });
    expect(engine.getViewport()).toEqual({ x: 50, y: 30, scale: 20 });
    engine.destroy();
  });

  it('setViewport / zoomAt should drive zoomLayer move and scaleOfWorld (M-3 回归：平移符号)', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
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

// HCA2-P3-ENG-1（归 HCA-CR）：engine 公共命令 API 缺 destroyed 门控——destroy 后再调操作已销毁 app。
// 对照 binding 层（DirtyCollector/RefreshPipeline 公共入口 destroy 后 no-op）。防御纵深：no-op 不抛。
describe('ScadaCanvasEngine destroyed guard (HCA2-P3-ENG-1)', () => {
  it('reset is a no-op after destroy (registry stays cleared)', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset(validConfig() as ScadaConfig);
    expect(engine.registry.size()).toBe(2);
    engine.destroy();
    expect(engine.registry.size()).toBe(0);
    // destroy 后 reset 不应重建场景树（registry 应保持 0）。
    engine.reset(validConfig() as ScadaConfig);
    expect(engine.registry.size()).toBe(0);
  });

  it('viewport commands are no-ops after destroy (viewport unchanged)', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.setViewport({ x: 10, y: 20, scale: 2 });
    const before = engine.getViewport();
    engine.destroy();
    engine.setViewport({ x: 99, y: 99, scale: 9 });
    engine.zoomAt({ x: 0, y: 0 }, 5);
    engine.fit({ x: 0, y: 0, width: 100, height: 100 });
    engine.center({ x: 0, y: 0, width: 100, height: 100 });
    expect(engine.getViewport()).toEqual(before);
  });

  it('applyAttrs / setSymbolProps / applyDiff / setSize / importConfig are no-ops after destroy', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset(validConfig() as ScadaConfig);
    engine.destroy();
    // 这些命令 destroy 后应 no-op，不抛、不操作已销毁 app。
    expect(() => engine.applyAttrs({ 'rect-1': { fill: '#000' } })).not.toThrow();
    expect(() => engine.setSymbolProps('rect-1', { fill: '#000' })).not.toThrow();
    expect(() => engine.applyDiff({ added: [], removed: ['rect-1'], updated: [] })).not.toThrow();
    expect(() => engine.setSize(10, 10)).not.toThrow();
    expect(() => engine.importConfig(JSON.stringify(validConfig()))).not.toThrow();
    expect(engine.registry.size()).toBe(0);
  });
});
