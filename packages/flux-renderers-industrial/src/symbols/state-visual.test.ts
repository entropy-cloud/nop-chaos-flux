import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from './register-builtin.js';
import { clearScadaSymbolRegistry } from './symbol-registry.js';
import { ScadaCanvasEngine } from '../engine/scada-engine.js';
import { PointStore } from '../binding/point-store.js';
import { ReverseIndex } from '../binding/reverse-index.js';
import { DirtyCollector, RefreshPipeline } from '../binding/dirty-collector.js';
import { Animator } from '../binding/animator.js';
import { StateVisualApplier } from './visual-state.js';
import { InteractionOverlay, INTERACTION_STYLE_PRESETS } from '../engine/interaction-overlay.js';
import type { ScadaConfig, ScadaSymbolNode } from '../serialization/config-types.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));

const makeContainer = () => {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: 800, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: 600, configurable: true });
  return el;
};

const pumpNode = (): ScadaSymbolNode => ({
  id: 'pump',
  type: 'scada-rect',
  x: 10,
  y: 20,
  width: 60,
  height: 40,
  bindings: { rotation: { point: 'flag' } },
  states: {
    states: {
      run: { style: { fill: '#00aa00' } },
      fault: { style: { fill: '#ff0000' } },
      stop: {},
    },
    valueMap: { 0: 'run', 1: 'fault', 2: 'stop' },
  },
  animations: [{ kind: 'blink', period: 500, when: { state: 'fault' } }],
});

interface Harness {
  engine: ScadaCanvasEngine;
  pipeline: RefreshPipeline;
  animator: Animator;
  applier: StateVisualApplier;
  setFlag: (value: number) => void;
  flush: () => void;
}

function createHarness(config: ScadaConfig, options?: { attach?: boolean }): Harness {
  const engine = ScadaCanvasEngine.create({ container: makeContainer(), interactionLayer: true });
  engine.reset(config);
  const pointStore = new PointStore();
  pointStore.loadDeclarations([{ id: 'flag', source: 'static', value: 0 }]);
  const reverseIndex = new ReverseIndex(config.symbols);
  const collector = new DirtyCollector({ scheduleTick: () => () => {} });
  const animator = new Animator({ now: () => 0, scheduleTick: () => () => {} });
  const pipeline = new RefreshPipeline({
    pointStore,
    reverseIndex,
    collector,
    animator,
    getStates: (id) => engine.getConfigNode(id)?.states,
    getAnimations: (id) => engine.getConfigNode(id)?.animations,
  });
  const applier = new StateVisualApplier(engine);
  if (options?.attach !== false) {
    applier.attachTo(pipeline);
  }
  return {
    engine,
    pipeline,
    animator,
    applier,
    setFlag: (value) => pointStore.setPointValues({ flag: value }),
    flush: () => pipeline.flushFrame((attrs) => engine.applyAttrs(attrs)),
  };
}

beforeEach(() => {
  resetLeaferMock();
  clearScadaSymbolRegistry();
  registerBuiltinScadaSymbols();
});

describe('StateVisualApplier (I8.2 视觉状态应用，消费 I6.3 状态机输出)', () => {
  it('should apply the state style patch computed via resolveSymbolStyle onto the engine node', () => {
    const { engine, setFlag, flush } = createHarness({ version: 1, symbols: [pumpNode()] });
    setFlag(1);
    flush();
    expect((engine.getSymbolProps('pump') as { fill?: string }).fill).toBe('#ff0000');
    engine.destroy();
  });

  it('should restore the normal style when exiting a state', () => {
    const { engine, setFlag, flush } = createHarness({ version: 1, symbols: [pumpNode()] });
    setFlag(1);
    flush();
    expect((engine.getSymbolProps('pump') as { fill?: string }).fill).toBe('#ff0000');
    setFlag(0);
    flush();
    expect((engine.getSymbolProps('pump') as { fill?: string }).fill).toBe('#00aa00');
    engine.destroy();
  });

  it('should restore instance/default styles when entering a state without a style patch', () => {
    const { engine, setFlag, flush } = createHarness({ version: 1, symbols: [pumpNode()] });
    setFlag(1);
    flush();
    expect((engine.getSymbolProps('pump') as { fill?: string }).fill).toBe('#ff0000');
    setFlag(2);
    flush();
    // stop 状态无 style → 恢复 base（defaults fill #ffffff）
    expect((engine.getSymbolProps('pump') as { fill?: string }).fill).toBe('#ffffff');
    engine.destroy();
  });

  it('visible:false from a state style should set node visible instead of removing the node', () => {
    const node: ScadaSymbolNode = {
      ...pumpNode(),
      states: {
        states: { run: { style: { visible: false } }, fault: {} },
        valueMap: { 0: 'run', 1: 'fault' },
      },
    };
    const { engine, setFlag, flush } = createHarness({ version: 1, symbols: [node] });
    setFlag(0);
    flush();
    expect((engine.getSymbolProps('pump') as { visible?: boolean }).visible).toBe(false);
    expect(engine.registry.has('pump')).toBe(true);
    setFlag(1);
    flush();
    expect((engine.getSymbolProps('pump') as { visible?: boolean }).visible).toBe(true);
    engine.destroy();
  });

  it('should stop applying after unsubscribe', () => {
    const { engine, pipeline, setFlag, flush } = createHarness({ version: 1, symbols: [pumpNode()] }, { attach: false });
    const applier = new StateVisualApplier(engine);
    const unsubscribe = applier.attachTo(pipeline);
    setFlag(1);
    flush();
    expect((engine.getSymbolProps('pump') as { fill?: string }).fill).toBe('#ff0000');
    unsubscribe();
    setFlag(2);
    flush();
    // 退订后不跟随：stop 状态无 style → 联动层无 patch 且本层退订 → fill 保持 fault 红（无 revert）
    expect((engine.getSymbolProps('pump') as { fill?: string }).fill).toBe('#ff0000');
    engine.destroy();
  });

  it('should run fault→blink linkage end-to-end and stop on exit (消费 I6.3 animator，不重复实现)', () => {
    const { engine, animator, setFlag, flush } = createHarness({ version: 1, symbols: [pumpNode()] });
    setFlag(0);
    flush();
    expect(animator.isPlaying('pump', 'blink')).toBe(false);
    setFlag(1);
    flush();
    expect(animator.isPlaying('pump', 'blink')).toBe(true);
    setFlag(0);
    flush();
    expect(animator.isPlaying('pump', 'blink')).toBe(false);
    expect((engine.getSymbolProps('pump') as { fill?: string }).fill).toBe('#00aa00');
    engine.destroy();
  });

  it('should keep interaction states (hover/press/selected/disabled) layered apart from business states', () => {
    const { engine, setFlag, flush } = createHarness({ version: 1, symbols: [pumpNode()] });
    const overlay = engine.interactionOverlay as InteractionOverlay;
    expect(overlay).toBeDefined();
    overlay.highlight('pump', INTERACTION_STYLE_PRESETS.selected);
    expect(overlay.activeCount).toBe(1);
    setFlag(1);
    flush();
    // 业务状态写图元节点（fill 红），交互覆盖物独立在 sky 层（高亮描边）——互不冲突
    expect((engine.getSymbolProps('pump') as { fill?: string }).fill).toBe('#ff0000');
    expect(overlay.activeCount).toBe(1);
    overlay.clear();
    expect(overlay.activeCount).toBe(0);
    engine.destroy();
  });

  it('should no-op for unknown or definition-less (group) symbols', () => {
    const { engine, applier, setFlag, flush } = createHarness({
      version: 1,
      symbols: [
        pumpNode(),
        { id: 'g', type: 'scada-group', x: 0, y: 0, children: [{ id: 'inner', type: 'scada-rect', x: 0, y: 0 }] },
      ],
    });
    applier.applyState('nope', 'fault');
    applier.applyState('g', 'fault');
    setFlag(1);
    flush();
    expect((engine.getSymbolProps('pump') as { fill?: string }).fill).toBe('#ff0000');
    engine.destroy();
  });

  it('should keep fields without a resettable base value tracked (shadow revert edge)', () => {
    const node: ScadaSymbolNode = {
      ...pumpNode(),
      states: {
        states: {
          run: {},
          fault: { style: { shadow: { x: 0, y: 0, blur: 4, color: '#ff0000' } } },
        },
        valueMap: { 0: 'run', 1: 'fault' },
      },
    };
    const { engine, setFlag, flush } = createHarness({ version: 1, symbols: [node] });
    setFlag(1);
    flush();
    expect((engine.getSymbolProps('pump') as { shadow?: unknown }).shadow).toEqual({
      x: 0,
      y: 0,
      blur: 4,
      color: '#ff0000',
    });
    setFlag(0);
    flush();
    // base 无 shadow 且无重置默认 → 保持状态值（不产生退化写入），后续再进状态仍可覆盖
    expect((engine.getSymbolProps('pump') as { shadow?: unknown }).shadow).toEqual({
      x: 0,
      y: 0,
      blur: 4,
      color: '#ff0000',
    });
    setFlag(1);
    flush();
    expect((engine.getSymbolProps('pump') as { shadow?: unknown }).shadow).toEqual({
      x: 0,
      y: 0,
      blur: 4,
      color: '#ff0000',
    });
    engine.destroy();
  });
});

describe('InteractionOverlay (I8.2 sky 交互覆盖层，leafer-state-primitive-drift 回退路径)', () => {
  it('should be lazily available only when the interactionLayer option is enabled', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    expect(engine.interactionOverlay).toBeUndefined();
    engine.destroy();
    const engine2 = ScadaCanvasEngine.create({ container: makeContainer(), interactionLayer: true });
    expect(engine2.interactionOverlay).toBeDefined();
    engine2.destroy();
  });

  it('should highlight a symbol with an overlay rect matching its bounds and the preset style', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer(), interactionLayer: true });
    engine.reset({ version: 1, symbols: [{ id: 'r', type: 'scada-rect', x: 5, y: 7, width: 100, height: 50 }] });
    const overlay = engine.interactionOverlay as InteractionOverlay;
    overlay.highlight('r', INTERACTION_STYLE_PRESETS.hover);
    const sky = engine.sky as unknown as { children: Array<{ children: unknown[] }> };
    const group = sky.children[0] as unknown as { children: Array<Record<string, unknown>> };
    expect(group.children).toHaveLength(1);
    const rect = group.children[0] as unknown as Record<string, unknown>;
    expect(rect.x).toBe(5);
    expect(rect.y).toBe(7);
    expect(rect.width).toBe(100);
    expect(rect.height).toBe(50);
    expect(rect.stroke).toBe(INTERACTION_STYLE_PRESETS.hover.stroke);
    engine.destroy();
  });

  it('should update an existing overlay rect and clear per symbol or wholesale', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer(), interactionLayer: true });
    engine.reset({ version: 1, symbols: [{ id: 'r', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 }] });
    const overlay = engine.interactionOverlay as InteractionOverlay;
    overlay.highlight('r', INTERACTION_STYLE_PRESETS.selected);
    overlay.highlight('r', INTERACTION_STYLE_PRESETS.disabled);
    const sky = engine.sky as unknown as { children: Array<{ children: unknown[] }> };
    expect(sky.children[0]?.children).toHaveLength(1);
    overlay.clear('r');
    expect(sky.children[0]?.children).toHaveLength(0);
    overlay.highlight('r');
    overlay.clear();
    expect(sky.children[0]?.children).toHaveLength(0);
    engine.destroy();
  });

  it('should no-op for unknown symbol ids in highlight/clear', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer(), interactionLayer: true });
    engine.reset({ version: 1, symbols: [{ id: 'r', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 }] });
    const overlay = engine.interactionOverlay as InteractionOverlay;
    expect(() => overlay.highlight('missing')).not.toThrow();
    expect(() => overlay.clear('missing')).not.toThrow();
    expect(overlay.activeCount).toBe(0);
    engine.destroy();
  });

  it('should destroy the overlay group with the engine', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer(), interactionLayer: true });
    engine.reset({ version: 1, symbols: [{ id: 'r', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 }] });
    (engine.interactionOverlay as InteractionOverlay).highlight('r');
    const sky = engine.sky as unknown as { children: unknown[] };
    expect(sky.children).toHaveLength(1);
    engine.destroy();
    expect(sky.children).toHaveLength(0);
  });

  it('engine.getConfigNode should find nested group children and miss on unknown ids', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    expect(engine.getConfigNode('r')).toBeUndefined();
    engine.reset({
      version: 1,
      symbols: [
        { id: 'g', type: 'scada-group', x: 0, y: 0, children: [{ id: 'inner', type: 'scada-rect', x: 1, y: 2 }] },
      ],
    });
    expect(engine.getConfigNode('g')?.id).toBe('g');
    expect(engine.getConfigNode('inner')?.x).toBe(1);
    expect(engine.getConfigNode('nope')).toBeUndefined();
    engine.destroy();
  });
});
