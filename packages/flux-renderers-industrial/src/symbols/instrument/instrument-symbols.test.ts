import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetLeaferMock } from '../../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../register-builtin.js';
import { clearScadaSymbolRegistry, hasScadaSymbol } from '../symbol-registry.js';
import { instantiateSymbol } from '../symbol-factory.js';
import { ScadaCanvasEngine } from '../../engine/scada-engine.js';
import { PointStore } from '../../binding/point-store.js';
import { ReverseIndex } from '../../binding/reverse-index.js';
import { DirtyCollector } from '../../binding/dirty-collector.js';
import { RefreshPipeline } from '../../binding/refresh-pipeline.js';
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

interface InstrumentHarness {
  engine: ScadaCanvasEngine;
  setValue: (pointId: string, value: number | boolean | string) => void;
  flush: () => void;
}

function createInstrumentHarness(config: ScadaConfig, points: Array<{ id: string; value: number | boolean | string }>): InstrumentHarness {
  const engine = ScadaCanvasEngine.create({ container: makeContainer() });
  engine.reset(config);
  const pointStore = new PointStore();
  pointStore.loadDeclarations(points.map((p) => ({ id: p.id, source: 'static' as const, value: p.value })));
  const pipeline = new RefreshPipeline({
    pointStore,
    reverseIndex: new ReverseIndex(config.symbols),
    collector: new DirtyCollector({ scheduleTick: () => () => {} }),
  });
  return {
    engine,
    setValue: (pointId, value) => pointStore.setPointValues({ [pointId]: value }),
    flush: () => pipeline.flushFrame((attrs) => engine.applyAttrs(attrs)),
  };
}

const instrumentNode = (id: string, type: string, extra: Partial<ScadaSymbolNode> = {}): ScadaSymbolNode => ({
  id,
  type,
  x: 0,
  y: 0,
  ...extra,
});

const instantiateInstrument = (type: string, props: Record<string, unknown>): LeafNode =>
  instantiateSymbol(type, {
    id: 'x',
    props: props as never,
    engine: {},
    config: { world: { x: 0, y: 0, scale: 1 } },
  });

beforeEach(() => {
  resetLeaferMock();
  clearScadaSymbolRegistry();
  registerBuiltinScadaSymbols();
});

describe('I9.2 instrument symbol registration (scada-instrument-*)', () => {
  it('should register the 4 instrument symbols as builtins', () => {
    for (const type of [
      'scada-instrument-gauge',
      'scada-instrument-level',
      'scada-instrument-thermometer',
      'scada-instrument-progress',
    ]) {
      expect(hasScadaSymbol(type)).toBe(true);
    }
  });

  it('should validate configs containing instrument instances', () => {
    const config: ScadaConfig = {
      version: 1,
      symbols: ['scada-instrument-gauge', 'scada-instrument-level', 'scada-instrument-thermometer', 'scada-instrument-progress'].map(
        (type, index) => instrumentNode(`i${index + 1}`, type),
      ),
    };
    expect(validateScadaConfig(config)).toEqual({ ok: true });
  });
});

describe('I9.2 scada-instrument-gauge (表盘/指针/数值文本 + 值→指针角量程换算)', () => {
  it('should assemble face/needle/label composite and route rotation to the needle', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({
      version: 1,
      symbols: [
        instrumentNode('g1', 'scada-instrument-gauge', { bindings: { rotation: { point: 'temp', scale: { k: 2.7, b: -135 } } } }),
      ],
    });
    const needle = childOf(engine.getSymbol('g1')!.node, 'needle');
    expect(needle.tag).toBe('Line');
    expect(childOf(engine.getSymbol('g1')!.node, 'label').tag).toBe('Text');
    engine.destroy();
  });

  it('should map bound value to needle angle via scale conversion (换算链：scale 声明 → applyScale → 指针角)', () => {
    const { engine, setValue, flush } = createInstrumentHarness(
      {
        version: 1,
        symbols: [
          instrumentNode('g1', 'scada-instrument-gauge', {
            bindings: { rotation: { point: 'temp', scale: { k: 2.7, b: -135 } } },
          }),
        ],
      },
      [{ id: 'temp', value: 50 }],
    );
    setValue('temp', 50);
    flush();
    expect(childOf(engine.getSymbol('g1')!.node, 'needle').rotation).toBe(0);
    setValue('temp', 90);
    flush();
    expect(childOf(engine.getSymbol('g1')!.node, 'needle').rotation).toBeCloseTo(108, 6);
    engine.destroy();
  });

  it('should render the formatted value into the label (formatValue 消费)', () => {
    const { engine, setValue, flush } = createInstrumentHarness(
      {
        version: 1,
        symbols: [
          instrumentNode('g1', 'scada-instrument-gauge', {
            bindings: { text: { point: 'temp', format: '%d °C' } },
          }),
        ],
      },
      [{ id: 'temp', value: 36.7 }],
    );
    setValue('temp', 36.7);
    flush();
    expect(childOf(engine.getSymbol('g1')!.node, 'label').text).toBe('37 °C');
    engine.destroy();
  });
});

describe('I9.2 scada-instrument-level (罐体/液柱 + 量程换算液位)', () => {
  it('should assemble tank/liquid/label and anchor the liquid at the tank bottom', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({ version: 1, symbols: [instrumentNode('l1', 'scada-instrument-level')] });
    const liquid = childOf(engine.getSymbol('l1')!.node, 'liquid');
    expect(liquid.tag).toBe('Rect');
    expect(liquid.height).toBe(0);
    engine.destroy();
  });

  it('should drive the liquid height and bottom anchor from the bound scaled value', () => {
    const { engine, setValue, flush } = createInstrumentHarness(
      {
        version: 1,
        symbols: [
          instrumentNode('l1', 'scada-instrument-level', {
            height: 100,
            bindings: { height: { point: 'level', scale: { k: 1, b: 0 } } },
          }),
        ],
      },
      [{ id: 'level', value: 0 }],
    );
    setValue('level', 40);
    flush();
    const liquid = childOf(engine.getSymbol('l1')!.node, 'liquid');
    expect(liquid.height).toBe(40);
    expect(liquid.y).toBe(60);
    engine.destroy();
  });
});

describe('I9.2 scada-instrument-thermometer (液柱管/感温泡 + 温度换算)', () => {
  it('should drive the liquid column height from the bound scaled temperature', () => {
    const { engine, setValue, flush } = createInstrumentHarness(
      {
        version: 1,
        symbols: [
          instrumentNode('t1', 'scada-instrument-thermometer', {
            height: 120,
            bindings: { height: { point: 'temp', scale: { k: 1, b: 0 } } },
          }),
        ],
      },
      [{ id: 'temp', value: 20 }],
    );
    setValue('temp', 80);
    flush();
    const liquid = childOf(engine.getSymbol('t1')!.node, 'liquid');
    expect(liquid.height).toBe(80);
    // plan 2026-08-06-0900-2 P2-9：BULB_RESERVE=-24 统一（原 applyProps 离群 -16 → 24，现与 create -24 对齐 → 16）
    expect(liquid.y).toBe(16);
    expect(childOf(engine.getSymbol('t1')!.node, 'bulb').tag).toBe('Ellipse');
    engine.destroy();
  });
});

// plan 2026-08-06-0900-2 Phase 2（open P2-9 thermometer anchor 常量统一 proof）：
// thermometer.ts create `y: height - 24` vs applyProps `y: tubeHeight - 16 - props.height` 离群，
// 空液位首帧 binding tick 跳 8px（sibling level 两路径一致）。修复后共用 BULB_RESERVE 常量，首帧无跳变。
describe('I9.2 thermometer create/applyProps anchor consistency (plan 2026-08-06-0900-2 Phase 2 open P2-9)', () => {
  it('空液位首帧 create y === applyProps y（无 8px 跳变）', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({
      version: 1,
      symbols: [instrumentNode('t1', 'scada-instrument-thermometer', { height: 140 })],
    });
    const createY = (childOf(engine.getSymbol('t1')!.node, 'liquid').y as number);
    // 首帧 binding tick：空液位（height=0），applyProps 液柱锚定应与 create 一致
    engine.setSymbolProps('t1', { height: 0 });
    expect(childOf(engine.getSymbol('t1')!.node, 'liquid').y).toBe(createY);
    engine.destroy();
  });
});

describe('I9.2 scada-instrument-progress (进度条/文本 + formatValue 消费)', () => {
  it('should drive the bar width from the bound scaled value', () => {
    const { engine, setValue, flush } = createInstrumentHarness(
      {
        version: 1,
        symbols: [
          instrumentNode('p1', 'scada-instrument-progress', {
            width: 200,
            bindings: { width: { point: 'progress', scale: { k: 2, b: 0 } } },
          }),
        ],
      },
      [{ id: 'progress', value: 25 }],
    );
    setValue('progress', 50);
    flush();
    expect(childOf(engine.getSymbol('p1')!.node, 'bar').width).toBe(100);
    engine.destroy();
  });

  it('should render the formatted percentage into the label', () => {
    const { engine, setValue, flush } = createInstrumentHarness(
      {
        version: 1,
        symbols: [
          instrumentNode('p1', 'scada-instrument-progress', {
            bindings: { text: { point: 'progress', format: '%d%%' } },
          }),
        ],
      },
      [{ id: 'progress', value: 33 }],
    );
    setValue('progress', 42);
    flush();
    expect(childOf(engine.getSymbol('p1')!.node, 'label').text).toBe('42%');
    engine.destroy();
  });
  it('should start with an empty label text when the instance provides none', () => {
    const node = instantiateInstrument('scada-instrument-gauge', { x: 0, y: 0 });
    expect(childOf(node, 'label').text).toBe('');
  });

  it('should ignore non-height patches in the liquid anchor hook', () => {
    const { engine, setValue, flush } = createInstrumentHarness(
      {
        version: 1,
        symbols: [
          instrumentNode('l1', 'scada-instrument-level', {
            height: 100,
            bindings: { height: { point: 'level', scale: { k: 1 } } },
          }),
        ],
      },
      [{ id: 'level', value: 0 }],
    );
    setValue('level', 30);
    flush();
    engine.setSymbolProps('l1', { text: 'ignored' });
    expect(childOf(engine.getSymbol('l1')!.node, 'liquid').height).toBe(30);
    engine.destroy();
  });
});

describe('I9.2 instrument full path (注册 → 校验 → 实例化 → 场景树加载 → 绑定联动 → 序列化 → 卸载)', () => {
  it('should load instrument instances through the config-adapter path and serialize minimal overrides', () => {
    const config: ScadaConfig = {
      version: 1,
      symbols: [
        instrumentNode('g1', 'scada-instrument-gauge', {
          x: 10,
          bindings: { rotation: { point: 'temp', scale: { k: 2.7, b: -135 } } },
        }),
        instrumentNode('l1', 'scada-instrument-level'),
        instrumentNode('t1', 'scada-instrument-thermometer', { custom: { unit: '°C' } }),
        instrumentNode('p1', 'scada-instrument-progress'),
      ],
    };
    expect(validateScadaConfig(config)).toEqual({ ok: true });
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset(config);
    expect(engine.registry.size()).toBe(4);
    expect(engine.getSymbol('g1')?.definition?.type).toBe('scada-instrument-gauge');
    const serialized = JSON.parse(serializeScadaConfig(config)) as ScadaConfig;
    expect(serialized.symbols[0]).toEqual({
      id: 'g1',
      type: 'scada-instrument-gauge',
      x: 10,
      bindings: { rotation: { point: 'temp', scale: { k: 2.7, b: -135 } } },
    });
    expect(serialized.symbols[1]).toEqual({ id: 'l1', type: 'scada-instrument-level' });
    expect(serialized.symbols[2]).toEqual({
      id: 't1',
      type: 'scada-instrument-thermometer',
      custom: { unit: '°C' },
    });
    engine.destroy();
  });
});

describe('instrument label 居中：显式 width 主路径 (plan 2026-08-04-1558-3 Phase 1)', () => {
  // leafer-ui@2.2.9 自动宽 Text 下 autoSizeAlign 无 layoutWidth，textAlign:'center' 偏移不生效（仍左对齐）。
  // 修复：仪表数值标签按仪表宽度设置显式 width，使 textAlign:'center' 产生有效居中。
  it('gauge/level/thermometer label 均带显式 width 与 textAlign:center', () => {
    const gauge = instantiateInstrument('scada-instrument-gauge', { width: 120, height: 120 });
    expect(childOf(gauge, 'label').textAlign).toBe('center');
    expect(childOf(gauge, 'label').width).toBe(120);

    const level = instantiateInstrument('scada-instrument-level', { width: 60, height: 140 });
    expect(childOf(level, 'label').textAlign).toBe('center');
    expect(childOf(level, 'label').width).toBe(60);

    const thermo = instantiateInstrument('scada-instrument-thermometer', { width: 40, height: 140 });
    expect(childOf(thermo, 'label').textAlign).toBe('center');
    expect(childOf(thermo, 'label').width).toBe(40);
  });
});

// plan 2026-08-06-0900-2 Phase 1（open P2-4 复合族 resize 几何响应 proof）：
// gauge 无 extent part（无 liquid/bar）——width/height 经 applyProps 原短路静默丢弃。修复后回落 resize hook 重算 body/needle/label。
describe('I9.2 instrument composite resize via applyProps (plan 2026-08-06-0900-2 Phase 1 open P2-4)', () => {
  it('gauge: width applyProps 重算 body width 并重定位 needle/label', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({ version: 1, symbols: [instrumentNode('g1', 'scada-instrument-gauge')] });
    expect(childOf(engine.getSymbol('g1')!.node, 'body').width).toBe(120);
    engine.setSymbolProps('g1', { width: 200 });
    const body = childOf(engine.getSymbol('g1')!.node, 'body');
    expect(body.width).toBe(200);
    // body/needle 中心 = width/2（新几何响应）
    expect(body.x).toBe(100);
    expect(childOf(engine.getSymbol('g1')!.node, 'needle').x).toBe(100);
    // label width 跟随容器宽度
    expect(childOf(engine.getSymbol('g1')!.node, 'label').width).toBe(200);
    engine.destroy();
  });

  it('gauge: height applyProps 重算 body height 并重定位 needle/label（两维独立路由）', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({ version: 1, symbols: [instrumentNode('g1', 'scada-instrument-gauge')] });
    engine.setSymbolProps('g1', { height: 200 });
    expect(childOf(engine.getSymbol('g1')!.node, 'body').height).toBe(200);
    expect(childOf(engine.getSymbol('g1')!.node, 'body').y).toBe(100);
    expect(childOf(engine.getSymbol('g1')!.node, 'needle').y).toBe(100);
    engine.destroy();
  });
});

// plan 2026-08-08-1910-1 Phase 2（A11 open：level/thermometer/progress 补 parts.resize）：
// 三者有 extent part（liquid/bar），applyCompositeProps EXTENT_FIELDS 分支原只路由到 extent（liquid/bar 长度），
// body/tank/track 容器留在 create 期几何——改几何尺寸时液柱/bar 溢出容器。
// 修复后补 parts.resize hook（重算容器几何），extent 仍由 binding 驱动。
// 语义区分：level/thermometer 的 height = binding 液位（不 resize 容器），width = 几何（resize 容器）；
// progress 的 width = binding bar 长度（不 resize 容器），height = 几何（resize 容器）。
describe('I9.2 instrument composite resize via applyProps (plan 2026-08-08-1910-1 Phase 2 A11)', () => {
  it('level: width applyProps 重算 body width 并调整 liquid width（液柱不溢出罐体）', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({ version: 1, symbols: [instrumentNode('l1', 'scada-instrument-level')] });
    expect(childOf(engine.getSymbol('l1')!.node, 'body').width).toBe(60);
    engine.setSymbolProps('l1', { width: 200 });
    // body（罐体）width 随几何变更
    expect(childOf(engine.getSymbol('l1')!.node, 'body').width).toBe(200);
    // liquid（液柱）width = body width - 4（两侧 2px padding），不溢出
    expect(childOf(engine.getSymbol('l1')!.node, 'liquid').width).toBe(196);
    // label width 跟随容器
    expect(childOf(engine.getSymbol('l1')!.node, 'label').width).toBe(200);
    engine.destroy();
  });

  it('thermometer: width applyProps 重算 tube width 并调整 liquid/bulb（液柱不溢出管体）', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({ version: 1, symbols: [instrumentNode('t1', 'scada-instrument-thermometer')] });
    expect(childOf(engine.getSymbol('t1')!.node, 'body').width).toBe(40);
    engine.setSymbolProps('t1', { width: 200 });
    // body（管体）width 随几何变更 + cornerRadius 跟随
    expect(childOf(engine.getSymbol('t1')!.node, 'body').width).toBe(200);
    expect(childOf(engine.getSymbol('t1')!.node, 'body').cornerRadius).toBe(100);
    // liquid（液柱）width = body width - 8（两侧 4px padding）
    expect(childOf(engine.getSymbol('t1')!.node, 'liquid').width).toBe(192);
    // bulb 中心 x = width/2，尺寸 = width - 6
    expect(childOf(engine.getSymbol('t1')!.node, 'bulb').x).toBe(100);
    expect(childOf(engine.getSymbol('t1')!.node, 'bulb').width).toBe(194);
    engine.destroy();
  });

  it('progress: height applyProps 重算 track height 并调整 bar（bar 不溢出 track）', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({ version: 1, symbols: [instrumentNode('p1', 'scada-instrument-progress')] });
    expect(childOf(engine.getSymbol('p1')!.node, 'body').height).toBe(24);
    engine.setSymbolProps('p1', { height: 48 });
    // body（track）height 随几何变更 + cornerRadius 跟随
    expect(childOf(engine.getSymbol('p1')!.node, 'body').height).toBe(48);
    expect(childOf(engine.getSymbol('p1')!.node, 'body').cornerRadius).toBe(24);
    // bar height = track height - 4（上下 2px padding），不溢出
    expect(childOf(engine.getSymbol('p1')!.node, 'bar').height).toBe(44);
    expect(childOf(engine.getSymbol('p1')!.node, 'bar').cornerRadius).toBe(22);
    engine.destroy();
  });

  it('level: height binding 不被 resize 覆盖（extent 仍由 binding 驱动液位）', () => {
    const { engine, setValue, flush } = createInstrumentHarness(
      {
        version: 1,
        symbols: [
          instrumentNode('l1', 'scada-instrument-level', {
            height: 100,
            bindings: { height: { point: 'level', scale: { k: 1, b: 0 } } },
          }),
        ],
      },
      [{ id: 'level', value: 0 }],
    );
    setValue('level', 40);
    flush();
    // liquid.height = binding 液位（40），body.height 仍是 create 期几何（100，不是 40）
    expect(childOf(engine.getSymbol('l1')!.node, 'liquid').height).toBe(40);
    expect(childOf(engine.getSymbol('l1')!.node, 'body').height).toBe(100);
    engine.destroy();
  });
});
