import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import { builtinScadaSymbolDefinitions, registerBuiltinScadaSymbols } from './register-builtin.js';
import { clearScadaSymbolRegistry, getScadaSymbolDefinition, hasScadaSymbol, listScadaSymbols } from './symbol-registry.js';
import { instantiateSymbol } from './symbol-factory.js';
import { groupScadaPaletteSymbols } from '../editor/palette/palette-filter.js';
import type { LeafNode } from './symbol-types.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));

const childrenOf = (root: LeafNode): Array<Record<string, unknown>> =>
  (root as unknown as { children: Array<Record<string, unknown>> }).children ?? [];

const childOf = (root: LeafNode, name: string): Record<string, unknown> => {
  const found = childrenOf(root).find((child) => child.name === name);
  if (!found) throw new Error(`child ${name} not found`);
  return found;
};

const make = (type: string, props: Record<string, unknown> = {}): LeafNode =>
  instantiateSymbol(type, {
    id: `${type}-0`,
    props: { x: 0, y: 0, ...props },
    engine: {},
    config: { world: { x: 0, y: 0, scale: 1 } },
  }) as LeafNode;

const apply = (type: string, node: LeafNode, props: Record<string, unknown>): void => {
  const definition = getScadaSymbolDefinition(type);
  if (!definition?.applyProps) throw new Error(`no applyProps for ${type}`);
  definition.applyProps(node, props as never);
};

const nameOf = (def: { type: string; name: string }) => def.name;

beforeEach(() => {
  resetLeaferMock();
  clearScadaSymbolRegistry();
  registerBuiltinScadaSymbols();
});

describe('559 Phase 1 builtin symbol expansion (24 -> 37)', () => {
  it('registers 37 builtin definitions with all 13 new types', () => {
    expect(builtinScadaSymbolDefinitions).toHaveLength(37);
    expect(listScadaSymbols()).toHaveLength(37);
    for (const type of [
      'scada-device-tank',
      'scada-device-heat-exchanger',
      'scada-device-conveyor',
      'scada-device-gate-valve',
      'scada-device-check-valve',
      'scada-pipe-elbow',
      'scada-pipe-tee',
      'scada-pipe-cross',
      'scada-elec-breaker',
      'scada-elec-transformer',
      'scada-instrument-trend',
      'scada-instrument-numeric',
      'scada-sensor-control-alarm-light',
    ]) {
      expect(hasScadaSymbol(type)).toBe(true);
    }
  });

  it('assigns electrical category to breaker/transformer and pipe category to fittings', () => {
    expect(getScadaSymbolDefinition('scada-elec-breaker')?.category).toBe('electrical');
    expect(getScadaSymbolDefinition('scada-elec-transformer')?.category).toBe('electrical');
    for (const type of ['scada-pipe-elbow', 'scada-pipe-tee', 'scada-pipe-cross']) {
      expect(getScadaSymbolDefinition(type)?.category).toBe('pipe');
    }
  });
});

describe('scada-device-tank', () => {
  it('builds wall/roof/liquid composite and anchors liquid to the tank bottom', () => {
    const root = make('scada-device-tank');
    const liquid = childOf(root, 'liquid');
    expect(liquid.height).toBe(0);
    apply('scada-device-tank', root, { height: 40 });
    const body = childOf(root, 'body');
    const bodyBottom = (body.y as number) + (body.height as number);
    expect(liquid.height).toBe(40);
    expect(liquid.y).toBe(bodyBottom - 40);
  });

  it('keeps shell geometry on width resize without moving liquid height semantics', () => {
    const root = make('scada-device-tank');
    apply('scada-device-tank', root, { width: 120 });
    expect(childOf(root, 'body').width).toBe(120);
    expect(childOf(root, 'roof').width).toBe(120);
    expect(childOf(root, 'liquid').width).toBe(114);
  });
});

describe('scada-device-heat-exchanger', () => {
  it('builds shell/tube/nozzle composite', () => {
    const root = make('scada-device-heat-exchanger');
    expect(childOf(root, 'tube-0')).toBeDefined();
    expect(childOf(root, 'tube-2')).toBeDefined();
    expect(childOf(root, 'nozzle-in')).toBeDefined();
    expect(childOf(root, 'drain-right')).toBeDefined();
  });

  it('recomputes shell geometry on resize', () => {
    const root = make('scada-device-heat-exchanger');
    apply('scada-device-heat-exchanger', root, { width: 200, height: 100 });
    expect(childOf(root, 'body').width).toBe(160);
    expect(childOf(root, 'body').height).toBe(52);
  });
});

describe('scada-device-conveyor', () => {
  it('defaults to run-state rotor rotation with 1200ms period', () => {
    const definition = getScadaSymbolDefinition('scada-device-conveyor');
    const animation = definition?.defaults?.animations?.[0] as { kind: string; period: number; when?: unknown };
    expect(animation.kind).toBe('rotate');
    expect(animation.period).toBe(1200);
    expect(animation.when).toEqual({ state: 'run' });
  });

  it('builds belt/rollers/legs composite with rotor hub', () => {
    const root = make('scada-device-conveyor');
    expect(childOf(root, 'rotor')).toBeDefined();
    expect(childOf(root, 'roller-left')).toBeDefined();
    expect(childOf(root, 'belt-dash')).toBeDefined();
  });
});

describe('scada-device-gate-valve', () => {
  it('lifts the gate between closed seat and raised open position', () => {
    const root = make('scada-device-gate-valve');
    const closedY = childOf(root, 'core').y as number;
    apply('scada-device-gate-valve', root, { custom: { openRatio: 0 } });
    expect(childOf(root, 'core').y).toBeCloseTo(closedY, 6);
    apply('scada-device-gate-valve', root, { custom: { openRatio: 1 } });
    const openY = childOf(root, 'core').y as number;
    expect(openY).toBeLessThan(closedY);
  });
});

describe('scada-device-check-valve', () => {
  it('swings the disc from closed seat (0deg) to open flow (70deg)', () => {
    const root = make('scada-device-check-valve');
    apply('scada-device-check-valve', root, { custom: { openRatio: 0 } });
    expect(childOf(root, 'core').rotation).toBe(0);
    apply('scada-device-check-valve', root, { custom: { openRatio: 1 } });
    expect(childOf(root, 'core').rotation).toBe(70);
  });
});

describe('pipe fittings (elbow/tee/cross)', () => {
  it('lays elbow segments from declaration geometry', () => {
    const root = make('scada-pipe-elbow');
    expect(childOf(root, 'segment-0').points).toEqual([0, 30, 30, 30]);
    expect(childOf(root, 'segment-1').points).toEqual([30, 30, 30, 60]);
  });

  it('recomputes all segments on width/height resize', () => {
    const root = make('scada-pipe-tee');
    apply('scada-pipe-tee', root, { width: 120, height: 80 });
    expect(childOf(root, 'segment-0').points).toEqual([0, 40, 120, 40]);
    expect(childOf(root, 'segment-1').points).toEqual([60, 40, 60, 0]);
  });

  it('routes flow dash and stroke restyle to every segment', () => {
    const root = make('scada-pipe-cross');
    apply('scada-pipe-cross', root, { flow: { enabled: true, speed: 1 } });
    expect(childOf(root, 'segment-0').dashPattern).toEqual([10, 6]);
    expect(childOf(root, 'segment-1').dashPattern).toEqual([10, 6]);
    apply('scada-pipe-cross', root, { stroke: '#ff0000', strokeWidth: 4 });
    expect(childOf(root, 'segment-0').stroke).toBe('#ff0000');
    expect(childOf(root, 'segment-1').strokeWidth).toBe(4);
  });

  it('disables flow dash, honors custom dash, dashOffset and partial-size resize', () => {
    const root = make('scada-pipe-elbow');
    // flow disabled → dashPattern 清空；声明 dash 走 flow.dash 覆盖
    apply('scada-pipe-elbow', root, { flow: { enabled: false, speed: 1 } });
    expect(childOf(root, 'segment-0').dashPattern).toEqual([]);
    apply('scada-pipe-elbow', root, { flow: { enabled: true, speed: 1, dash: [4, 2] }, dashOffset: 12, fill: '#225577' });
    expect(childOf(root, 'segment-0').dashPattern).toEqual([4, 2]);
    expect(childOf(root, 'segment-0').dashOffset).toBe(12);
    expect(childOf(root, 'segment-1').fill).toBe('#225577');
    // 只给 width（height 走 body 现值回退）：60x60 → 90x60 布局重算
    apply('scada-pipe-elbow', root, { width: 90 });
    expect(childOf(root, 'segment-0').points).toEqual([0, 30, 45, 30]);
    expect(childOf(root, 'segment-1').points).toEqual([45, 30, 45, 60]);
  });
});

describe('scada-elec-breaker', () => {
  it('pivots the contact bridge between closed (0deg) and open (-35deg)', () => {
    const root = make('scada-elec-breaker');
    expect(childOf(root, 'core').rotation).toBe(0);
    apply('scada-elec-breaker', root, { custom: { closed: false } });
    expect(childOf(root, 'core').rotation).toBe(-35);
    apply('scada-elec-breaker', root, { custom: { closed: true } });
    expect(childOf(root, 'core').rotation).toBe(0);
  });

  it('defaults to electrical states with booleanMap to closed/open', () => {
    const states = getScadaSymbolDefinition('scada-elec-breaker')?.defaults?.states;
    expect(states?.booleanMap).toEqual({ true: 'closed', false: 'open' });
    expect(states?.states?.trip?.animations?.[0]?.kind).toBe('blink');
  });
});

describe('scada-elec-transformer', () => {
  it('builds dual windings with core legs and terminals', () => {
    const root = make('scada-elec-transformer');
    expect(childOf(root, 'winding-primary')).toBeDefined();
    expect(childOf(root, 'winding-secondary')).toBeDefined();
    expect(childOf(root, 'core-left')).toBeDefined();
    expect(childOf(root, 'terminal-top')).toBeDefined();
  });
});

describe('scada-instrument-trend', () => {
  it('appends bound height samples into the polyline ring buffer', () => {
    const root = make('scada-instrument-trend');
    apply('scada-instrument-trend', root, { height: 30 });
    apply('scada-instrument-trend', root, { height: 50 });
    const points = childOf(root, 'trend-line').points as number[];
    expect(points).toHaveLength(4);
    expect(points[3]).toBe(80 - 4 - 50);
  });

  it('honors custom.capacity trimming oldest samples', () => {
    const root = make('scada-instrument-trend', { custom: { capacity: 2 } });
    apply('scada-instrument-trend', root, { custom: { capacity: 2 } });
    apply('scada-instrument-trend', root, { height: 10 });
    apply('scada-instrument-trend', root, { height: 20 });
    apply('scada-instrument-trend', root, { height: 30 });
    const points = childOf(root, 'trend-line').points as number[];
    expect(points).toHaveLength(4);
    expect(points[1]).toBe(80 - 4 - 20);
  });
});

describe('scada-instrument-numeric', () => {
  it('routes text binding to the LED label and custom.unit to the unit caption', () => {
    const root = make('scada-instrument-numeric');
    apply('scada-instrument-numeric', root, { text: '42.5' });
    expect(childOf(root, 'label').text).toBe('42.5');
    apply('scada-instrument-numeric', root, { custom: { unit: 'kPa' } });
    expect(childOf(root, 'unit').text).toBe('kPa');
  });
});

describe('scada-sensor-control-alarm-light', () => {
  it('defaults to off/alarm states with blink on alarm', () => {
    const states = getScadaSymbolDefinition('scada-sensor-control-alarm-light')?.defaults?.states;
    expect(states?.booleanMap).toEqual({ true: 'alarm', false: 'off' });
    expect(states?.states?.alarm?.animations?.[0]?.kind).toBe('blink');
  });

  it('builds dome/halo/base composite', () => {
    const root = make('scada-sensor-control-alarm-light');
    expect(childOf(root, 'body')).toBeDefined();
    expect(childOf(root, 'halo')).toBeDefined();
    expect(childOf(root, 'mount')).toBeDefined();
  });
});

describe('559 symbols resize/default-fallback branches', () => {
  it('gate-valve and check-valve recompute geometry on width/height resize', () => {
    const gate = make('scada-device-gate-valve');
    apply('scada-device-gate-valve', gate, { width: 120 });
    expect(childOf(gate, 'body').width).toBe(120);
    apply('scada-device-gate-valve', gate, { height: 96 });
    expect(childOf(gate, 'body').height).toBeCloseTo(96 * 0.24, 6);
    const check = make('scada-device-check-valve');
    apply('scada-device-check-valve', check, { width: 100 });
    expect(childOf(check, 'body').width).toBeCloseTo(100 * 0.56, 6);
    apply('scada-device-check-valve', check, { height: 60 });
    expect(childOf(check, 'bore').height).toBeCloseTo(60 * 0.2, 6);
  });

  it('breaker rebuilds terminals geometry and defaults falls back when stroke omitted', () => {
    const root = make('scada-elec-breaker');
    apply('scada-elec-breaker', root, { width: 120 });
    expect(childOf(root, 'body').width).toBeCloseTo(120 * 0.64, 6);
    expect(childOf(root, 'wire-right').points).toEqual([120 * 0.86, 22, 120, 22]);
    // transformer height resize 分支
    const transformer = make('scada-elec-transformer');
    apply('scada-elec-transformer', transformer, { height: 120 });
    expect(childOf(transformer, 'body').height).toBeCloseTo(120 * 0.76, 6);
  });

  it('numeric falls back to defaults and honors textSize/unit partial updates', () => {
    const root = make('scada-instrument-numeric', { text: undefined as never });
    expect(childOf(root, 'label').text).toBe('0');
    expect(childOf(root, 'unit').text).toBe('');
    apply('scada-instrument-numeric', root, { textSize: 32 });
    expect(childOf(root, 'label').fontSize).toBe(32);
  });

  it('trend honors declared capacity, single-sample layout, textColor restyle and width resize', () => {
    const root = make('scada-instrument-trend', { custom: { capacity: 2 } });
    apply('scada-instrument-trend', root, { height: 40 });
    // 单样本：折线唯一点落在图表右侧（count===1 布局分支）
    let points = childOf(root, 'trend-line').points as number[];
    expect(points).toEqual([4 + (160 - 8), 80 - 4 - 40]);
    apply('scada-instrument-trend', root, { height: 55 });
    apply('scada-instrument-trend', root, { textColor: '#ff8f6b' });
    expect(childOf(root, 'trend-line').stroke).toBe('#ff8f6b');
    apply('scada-instrument-trend', root, { width: 200 });
    points = childOf(root, 'trend-line').points as number[];
    expect(points).toHaveLength(4);
  });

  it('fittings apply create-time flow with declared dash and dashOffset', () => {
    const root = make('scada-pipe-tee', { flow: { enabled: true, speed: 1, dash: [8, 4] }, dashOffset: 5 });
    expect(childOf(root, 'segment-0').dashPattern).toEqual([8, 4]);
    expect(childOf(root, 'segment-0').dashOffset).toBe(5);
  });
});

describe('palette grouping with electrical category', () => {
  it('groups breaker/transformer under electrical between sensor-control and pipe', () => {
    const groups = groupScadaPaletteSymbols(listScadaSymbols(), nameOf, '');
    const order = groups.map((group) => group.category);
    expect(order.indexOf('electrical')).toBeGreaterThan(-1);
    expect(order.indexOf('electrical')).toBeLessThan(order.indexOf('pipe'));
    const electrical = groups.find((group) => group.category === 'electrical');
    expect(electrical?.symbols.map((def) => def.type).sort()).toEqual(['scada-elec-breaker', 'scada-elec-transformer']);
  });

  it('search query still matches new symbol types and names', () => {
    const groups = groupScadaPaletteSymbols(listScadaSymbols(), nameOf, 'tank');
    const all = groups.flatMap((group) => group.symbols.map((def) => def.type));
    expect(all).toContain('scada-device-tank');
  });
});
