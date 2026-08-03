import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetLeaferMock } from '../../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../register-builtin.js';
import { clearScadaSymbolRegistry, hasScadaSymbol } from '../symbol-registry.js';
import { instantiateSymbol } from '../symbol-factory.js';
import { ScadaCanvasEngine } from '../../engine/scada-engine.js';
import { PointStore } from '../../binding/point-store.js';
import { ReverseIndex } from '../../binding/reverse-index.js';
import { DirtyCollector, RefreshPipeline } from '../../binding/dirty-collector.js';
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
    expect(liquid.y).toBe(24);
    expect(childOf(engine.getSymbol('t1')!.node, 'bulb').tag).toBe('Ellipse');
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
