import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetLeaferMock } from '../../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../register-builtin.js';
import { clearScadaSymbolRegistry, hasScadaSymbol } from '../symbol-registry.js';
import { ScadaCanvasEngine } from '../../engine/scada-engine.js';
import { PointStore } from '../../binding/point-store.js';
import { ReverseIndex } from '../../binding/reverse-index.js';
import { DirtyCollector, RefreshPipeline } from '../../binding/dirty-collector.js';
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
