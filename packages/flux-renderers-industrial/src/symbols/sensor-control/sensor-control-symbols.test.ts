import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetLeaferMock } from '../../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../register-builtin.js';
import { clearScadaSymbolRegistry, hasScadaSymbol } from '../symbol-registry.js';
import { ScadaCanvasEngine } from '../../engine/scada-engine.js';
import { PointStore } from '../../binding/point-store.js';
import { ReverseIndex } from '../../binding/reverse-index.js';
import { DirtyCollector } from '../../binding/dirty-collector.js';
import { RefreshPipeline } from '../../binding/refresh-pipeline.js';
import { Animator } from '../../binding/animator.js';
import { StateVisualApplier } from '../visual-state.js';
import { validateScadaConfig } from '../../serialization/validate.js';
import { serializeScadaConfig } from '../../serialization/serialize.js';
import type { ScadaConfig, ScadaSymbolNode } from '../../serialization/config-types.js';
import type { LeafNode } from '../symbol-types.js';

vi.mock('leafer-ui', () => import('../../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));

const makeContainer = () => {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: 800, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: 600, configurable: true });
  return el;
};

const childOf = (root: LeafNode, name: string): Record<string, unknown> => {
  const found = ((root as unknown as { children: Array<Record<string, unknown>> }).children ?? []).find(
    (child) => child.name === name,
  );
  if (!found) throw new Error(`child ${name} not found`);
  return found;
};

interface SensorHarness {
  engine: ScadaCanvasEngine;
  animator: Animator;
  setValue: (pointId: string, value: number | boolean | string) => void;
  flush: () => void;
}

function createSensorHarness(config: ScadaConfig, points: Array<{ id: string; value: number | boolean | string }>): SensorHarness {
  const engine = ScadaCanvasEngine.create({ container: makeContainer(), interactionLayer: true });
  engine.reset(config);
  const pointStore = new PointStore();
  pointStore.loadDeclarations(points.map((p) => ({ id: p.id, source: 'static' as const, value: p.value })));
  const animator = new Animator({ now: () => 0, scheduleTick: () => () => {} });
  const pipeline = new RefreshPipeline({
    pointStore,
    reverseIndex: new ReverseIndex(config.symbols),
    collector: new DirtyCollector({ scheduleTick: () => () => {} }),
    animator,
    getStates: (id) => engine.getSymbolDeclarations(id)?.states,
    getAnimations: (id) => engine.getSymbolDeclarations(id)?.animations,
  });
  const applier = new StateVisualApplier(engine);
  applier.attachTo(pipeline);
  return {
    engine,
    animator,
    setValue: (pointId, value) => pointStore.setPointValues({ [pointId]: value }),
    flush: () => pipeline.flushFrame((attrs) => engine.applyAttrs(attrs)),
  };
}

const sensorNode = (id: string, type: string, extra: Partial<ScadaSymbolNode> = {}): ScadaSymbolNode => ({
  id,
  type,
  x: 0,
  y: 0,
  bindings: { fill: { point: 'flag' } },
  ...extra,
});

beforeEach(() => {
  resetLeaferMock();
  clearScadaSymbolRegistry();
  registerBuiltinScadaSymbols();
});

describe('I9.3 sensor-control symbol registration (scada-sensor-control-*)', () => {
  it('should register the 4 sensor-control symbols as builtins', () => {
    for (const type of [
      'scada-sensor-control-sensor',
      'scada-sensor-control-indicator',
      'scada-sensor-control-switch',
      'scada-sensor-control-button',
    ]) {
      expect(hasScadaSymbol(type)).toBe(true);
    }
  });

  it('should validate configs containing sensor-control instances', () => {
    const config: ScadaConfig = {
      version: 1,
      symbols: [
        sensorNode('s1', 'scada-sensor-control-sensor'),
        sensorNode('i1', 'scada-sensor-control-indicator'),
        sensorNode('w1', 'scada-sensor-control-switch', { custom: { on: true } }),
        sensorNode('b1', 'scada-sensor-control-button'),
      ],
    };
    expect(validateScadaConfig(config)).toEqual({ ok: true });
  });
});

describe('I9.3 scada-sensor-control-sensor (探测点 + 状态色)', () => {
  it('should apply run/stop/fault state colors to the probe stem', () => {
    const { engine, setValue, flush } = createSensorHarness(
      { version: 1, symbols: [sensorNode('s1', 'scada-sensor-control-sensor')] },
      [{ id: 'flag', value: false }],
    );
    setValue('flag', true);
    flush();
    expect(childOf(engine.getSymbol('s1')!.node, 'body').fill).toBe('#00cc66');
    setValue('flag', false);
    flush();
    expect(childOf(engine.getSymbol('s1')!.node, 'body').fill).toBe('#9e9e9e');
    engine.destroy();
  });

  it('should blink the whole sensor on fault via animator linkage', () => {
    const node = sensorNode('s1', 'scada-sensor-control-sensor', {
      bindings: { fill: { point: 'value' } },
      states: { states: {}, ranges: [{ min: 80, state: 'fault' }] },
    });
    const { engine, animator, setValue, flush } = createSensorHarness(
      { version: 1, symbols: [node] },
      [{ id: 'value', value: 10 }],
    );
    setValue('value', 90);
    flush();
    expect(childOf(engine.getSymbol('s1')!.node, 'body').fill).toBe('#e53935');
    expect(animator.isPlaying('s1', 'blink')).toBe(true);
    setValue('value', 10);
    flush();
    expect(animator.isPlaying('s1', 'blink')).toBe(false);
    engine.destroy();
  });
});

describe('I9.3 scada-sensor-control-indicator (指示灯多态色 + fault 闪烁)', () => {
  it('should color the lamp by state and blink on fault (状态判定→样式→blink 链路)', () => {
    const { engine, animator, setValue, flush } = createSensorHarness(
      {
        version: 1,
        symbols: [
          sensorNode('i1', 'scada-sensor-control-indicator', {
            bindings: { fill: { point: 'value' } },
            states: { states: {}, ranges: [{ max: 30, state: 'stop' }, { min: 80, state: 'fault' }] },
          }),
        ],
      },
      [{ id: 'value', value: 50 }],
    );
    setValue('value', 90);
    flush();
    expect(childOf(engine.getSymbol('i1')!.node, 'body').fill).toBe('#e53935');
    expect(animator.isPlaying('i1', 'blink')).toBe(true);
    setValue('value', 20);
    flush();
    expect(childOf(engine.getSymbol('i1')!.node, 'body').fill).toBe('#9e9e9e');
    expect(animator.isPlaying('i1', 'blink')).toBe(false);
    setValue('value', 50);
    flush();
    expect(childOf(engine.getSymbol('i1')!.node, 'body').fill).toBe('#00cc66');
    engine.destroy();
  });

  it('should keep the housing static while the lamp carries the state color', () => {
    const { engine, setValue, flush } = createSensorHarness(
      { version: 1, symbols: [sensorNode('i1', 'scada-sensor-control-indicator')] },
      [{ id: 'flag', value: false }],
    );
    setValue('flag', true);
    flush();
    expect(childOf(engine.getSymbol('i1')!.node, 'housing').fill).toBe('#455a64');
    engine.destroy();
  });
});

// plan 2026-08-05-0653-2 Phase 3（open P1-2 z-order proof）：
// indicator 复合子序必须为 [housing, lamp]——leafer `Group` 后入子在上层渲染，
// 原序 [lamp, housing] 使不透明 housing 覆盖灯体（Failure Paths `indicator-lamp-hidden`）。
// mock 的 `children` 数组按入序保留（即 render order），断言入序即可观测 z-order 逆序类缺陷，
// 关闭「mock 盲于 z-order」而不仅单例（sensor-control-symbols.test.ts 原仅直读 `.fill` 忽略入序）。
describe('scada-sensor-control-indicator z-order (plan 2026-08-05-0653-2 Phase 3 open P1-2)', () => {
  it('children 入序为 [housing, lamp]——housing 背景层、lamp 上层（状态色不被遮挡）', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({
      version: 1,
      symbols: [
        sensorNode('i1', 'scada-sensor-control-indicator', {
          fill: '#00cc66',
        }),
      ],
    });
    const root = engine.getSymbol('i1')!.node;
    const children = (root as unknown as { children: Array<Record<string, unknown>> }).children;
    // housing 在入序首位（背景层，先绘），lamp（name='body'）在后（上层，后绘覆盖 housing）
    expect(children[0]?.name).toBe('housing');
    expect(children[0]?.tag).toBe('Rect');
    expect(children[1]?.name).toBe('body');
    expect(children[1]?.tag).toBe('Ellipse');
    engine.destroy();
  });

  it('lamp（body）位于 housing 之上，状态色 fill 在最上层可见（rect housing 不透明 #455a64）', () => {
    const { engine, setValue, flush } = createSensorHarness(
      {
        version: 1,
        symbols: [
          sensorNode('i1', 'scada-sensor-control-indicator', {
            bindings: { fill: { point: 'value' } },
            states: { states: {}, ranges: [{ min: 80, state: 'fault' }] },
          }),
        ],
      },
      [{ id: 'value', value: 50 }],
    );
    setValue('value', 90);
    flush();
    const root = engine.getSymbol('i1')!.node;
    const children = (root as unknown as { children: Array<Record<string, unknown>> }).children;
    // 状态色落到 lamp（body, 上层）：fill=#e53935（fault 红）
    expect(childOf(root, 'body').fill).toBe('#e53935');
    // housing（背景层）保持 #455a64
    expect(childOf(root, 'housing').fill).toBe('#455a64');
    // z-order 不变量：housing 永远在 children[0]、lamp 永远在 children[1]
    expect(children[0]?.name).toBe('housing');
    expect(children[1]?.name).toBe('body');
    engine.destroy();
  });

  it('兄弟复合图元（motor/pump/fan/valve）子序同为 [body, active]，indicator swap 后与其对齐（唯一离群点消除）', () => {
    // 同包兄弟复合图元均为 [background_body, active_part] 序——indicator swap 后不再是逆序离群点。
    // 此处仅断言 indicator 的 body 在末位（active 上层），与兄弟图元的 body 序位语义一致。
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({
      version: 1,
      symbols: [
        sensorNode('m1', 'scada-device-motor'),
        sensorNode('i1', 'scada-sensor-control-indicator'),
      ],
    });
    const motorRoot = engine.getSymbol('m1')!.node;
    const indicatorRoot = engine.getSymbol('i1')!.node;
    const motorChildren = (motorRoot as unknown as { children: Array<Record<string, unknown>> }).children;
    const indicatorChildren = (indicatorRoot as unknown as { children: Array<Record<string, unknown>> }).children;
    // motor body 在首位（背景），indicator swap 后 body 也在末位（active 上层）——
    // 关键不变量：body 不被同 group 的不透明兄弟遮挡。motor body 在 [0]（无遮挡兄弟），
    // indicator body 在 [1]（housing 在 [0] 作背景，不遮挡 lamp）。
    expect(motorChildren[0]?.name).toBe('body');
    expect(indicatorChildren[1]?.name).toBe('body');
    engine.destroy();
  });
});

describe('I9.3 scada-sensor-control-switch (开/关位形态 + 状态色)', () => {
  it('should place the lever at the on/off position from custom.on', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({
      version: 1,
      symbols: [
        { id: 'w1', type: 'scada-sensor-control-switch', x: 0, y: 0, custom: { on: false } },
        { id: 'w2', type: 'scada-sensor-control-switch', x: 60, y: 0, custom: { on: true } },
      ],
    });
    const offLever = childOf(engine.getSymbol('w1')!.node, 'core');
    const onLever = childOf(engine.getSymbol('w2')!.node, 'core');
    expect(offLever.x).toBe(3);
    expect(onLever.x).toBe(23);
    engine.setSymbolProps('w1', { custom: { on: true } });
    expect(childOf(engine.getSymbol('w1')!.node, 'core').x).toBe(23);
    engine.destroy();
  });

  it('applyProps moves the lever back to the OFF position on true→false toggle (plan 2026-08-04-1558-3 Phase 3)', () => {
    // build 路径覆盖 on=true（右位）与 on=false（左位）；applyProps 路径需覆盖 true→false 的
    // `: 3` OFF 分支（switch.ts:55 cond-expr#1），既有用例仅覆盖 false→true。
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({
      version: 1,
      symbols: [{ id: 'w', type: 'scada-sensor-control-switch', x: 0, y: 0, custom: { on: true } }],
    });
    expect(childOf(engine.getSymbol('w')!.node, 'core').x).toBe(23);
    // applyProps true→false：拨杆回左位 OFF（x=3）
    engine.setSymbolProps('w', { custom: { on: false } });
    expect(childOf(engine.getSymbol('w')!.node, 'core').x).toBe(3);
    // applyProps false→true：拨杆回右位 ON（x=23）
    engine.setSymbolProps('w', { custom: { on: true } });
    expect(childOf(engine.getSymbol('w')!.node, 'core').x).toBe(23);
    engine.destroy();
  });

  it('should apply state colors to the switch base', () => {
    const { engine, setValue, flush } = createSensorHarness(
      { version: 1, symbols: [sensorNode('w1', 'scada-sensor-control-switch')] },
      [{ id: 'flag', value: false }],
    );
    setValue('flag', true);
    flush();
    expect(childOf(engine.getSymbol('w1')!.node, 'body').fill).toBe('#00cc66');
    engine.destroy();
  });
});

describe('I9.3 scada-sensor-control-button (静态呈现 + 状态色)', () => {
  it('should assemble base/cap and apply state colors', () => {
    const { engine, setValue, flush } = createSensorHarness(
      { version: 1, symbols: [sensorNode('b1', 'scada-sensor-control-button')] },
      [{ id: 'flag', value: true }],
    );
    expect(childOf(engine.getSymbol('b1')!.node, 'cap').tag).toBe('Rect');
    setValue('flag', false);
    flush();
    expect(childOf(engine.getSymbol('b1')!.node, 'body').fill).toBe('#9e9e9e');
    engine.destroy();
  });
});

describe('I9.3 sensor-control full path (注册 → 校验 → 实例化 → 场景树加载 → 状态样式应用 → 序列化 → 卸载)', () => {
  it('should load sensor-control instances through the config-adapter path and serialize minimal overrides', () => {
    const config: ScadaConfig = {
      version: 1,
      symbols: [
        sensorNode('s1', 'scada-sensor-control-sensor'),
        sensorNode('i1', 'scada-sensor-control-indicator', { x: 10 }),
        sensorNode('w1', 'scada-sensor-control-switch', { custom: { on: true } }),
        sensorNode('b1', 'scada-sensor-control-button'),
      ],
    };
    expect(validateScadaConfig(config)).toEqual({ ok: true });
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset(config);
    expect(engine.registry.size()).toBe(4);
    expect(engine.getSymbol('i1')?.definition?.type).toBe('scada-sensor-control-indicator');
    const serialized = JSON.parse(serializeScadaConfig(config)) as ScadaConfig;
    expect(serialized.symbols[1]).toEqual({
      id: 'i1',
      type: 'scada-sensor-control-indicator',
      x: 10,
      bindings: { fill: { point: 'flag' } },
    });
    expect(serialized.symbols[2]).toEqual({
      id: 'w1',
      type: 'scada-sensor-control-switch',
      custom: { on: true },
      bindings: { fill: { point: 'flag' } },
    });
    engine.destroy();
  });
});

// plan 2026-08-06-0900-2 Phase 1（open P2-4 复合族 resize 几何响应 proof）：
// sensor-control 族（indicator/button/sensor/switch）无 extent part——width/height 经 applyProps 原短路静默丢弃。
// 修复后回落 resize hook 重算 body/housing/container + 子形状相对锚点。
describe('I9.3 sensor-control composite resize via applyProps (plan 2026-08-06-0900-2 Phase 1 open P2-4)', () => {
  it('indicator: width applyProps 重算 housing width 并重定位 lamp', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({ version: 1, symbols: [sensorNode('i1', 'scada-sensor-control-indicator')] });
    engine.setSymbolProps('i1', { width: 200 });
    expect(childOf(engine.getSymbol('i1')!.node, 'housing').width).toBe(200);
    // lamp（body）中心 = width/2
    expect(childOf(engine.getSymbol('i1')!.node, 'body').x).toBe(100);
    engine.destroy();
  });

  it('button: width applyProps 重算 body width 并联动 cap 宽度', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({ version: 1, symbols: [sensorNode('b1', 'scada-sensor-control-button')] });
    engine.setSymbolProps('b1', { width: 120 });
    expect(childOf(engine.getSymbol('b1')!.node, 'body').width).toBe(120);
    expect(childOf(engine.getSymbol('b1')!.node, 'cap').width).toBe(112);
    engine.destroy();
  });

  it('sensor: width applyProps 重算 body width 并重定位 probe', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({ version: 1, symbols: [sensorNode('s1', 'scada-sensor-control-sensor')] });
    engine.setSymbolProps('s1', { width: 80 });
    expect(childOf(engine.getSymbol('s1')!.node, 'body').width).toBe(80);
    expect(childOf(engine.getSymbol('s1')!.node, 'probe').x).toBe(40);
    engine.destroy();
  });

  it('switch: width applyProps 重算 body width 并保持 lever on/off 位态', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({
      version: 1,
      symbols: [{ id: 'w1', type: 'scada-sensor-control-switch', x: 0, y: 0, custom: { on: true } }],
    });
    engine.setSymbolProps('w1', { width: 100 });
    expect(childOf(engine.getSymbol('w1')!.node, 'body').width).toBe(100);
    // lever 仍在 on 位（右位）= width - height + 3 = 100 - 28 + 3 = 75
    expect(childOf(engine.getSymbol('w1')!.node, 'core').x).toBe(75);
    engine.destroy();
  });
});
