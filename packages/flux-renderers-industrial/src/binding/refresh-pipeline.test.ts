import { describe, it, expect, vi } from 'vitest';
import { PointStore } from './point-store.js';
import { ReverseIndex } from './reverse-index.js';
import { DirtyCollector, RefreshPipeline } from './dirty-collector.js';
import { Animator } from './animator.js';
import type { ApplyAttrs } from './dirty-collector.js';
import type {
  ScadaAnimation,
  ScadaPointDeclaration,
  ScadaStateDeclaration,
  ScadaSymbolNode,
} from '../serialization/config-types.js';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createDefaultEnv } from '@nop-chaos/flux-react';

const expressionCompiler = createExpressionCompiler(createFormulaCompiler());
const env = createDefaultEnv();
const evalContext = { compiler: expressionCompiler, env };

interface PipelineHarness {
  pointStore: PointStore;
  collector: DirtyCollector;
  pipeline: RefreshPipeline;
  applied: Array<Record<string, Record<string, unknown>>>;
}

function createHarness(options?: {
  declarations?: ScadaPointDeclaration[];
  symbols?: ScadaSymbolNode[];
  getStates?: (symbolId: string) => ScadaStateDeclaration | undefined;
  onStateChange?: (payload: { symbolId: string; state: string }) => void;
  onError?: (message: string) => void;
}): PipelineHarness {
  const pointStore = new PointStore();
  pointStore.loadDeclarations(
    options?.declarations ?? [
      { id: 'level', source: 'static', value: 10 },
      { id: 'speed', source: 'static', value: 100 },
      { id: 'mode', source: 'static', value: 'auto' },
    ],
  );
  const reverseIndex = new ReverseIndex(
    options?.symbols ?? [
      {
        id: 'pump-1',
        type: 'scada-rect',
        x: 0,
        y: 0,
        bindings: {
          fill: { expression: '${level > 50 ? \'#ff0000\' : \'#00ff00\'}' },
          rotation: { point: 'speed', scale: { k: 0.1 } },
        },
      },
    ],
    evalContext,
  );
  const collector = new DirtyCollector({ scheduleTick: () => () => {} });
  const applied: Array<Record<string, Record<string, unknown>>> = [];
  const pipeline = new RefreshPipeline({
    pointStore,
    reverseIndex,
    collector,
    compiler: expressionCompiler,
    env,
    getStates: options?.getStates,
    onStateChange: options?.onStateChange,
    onError: options?.onError,
  });
  return {
    pointStore,
    collector,
    pipeline,
    applied,
  };
}

const harnessApply = (harness: PipelineHarness): ApplyAttrs => (attrs) => {
  harness.applied.push(attrs as Record<string, Record<string, unknown>>);
};

describe('RefreshPipeline 端到端刷新流水线 (I6.2)', () => {
  it('setPointValues → 绑定求值 → 帧尾单次批量写全链路收敛', () => {
    const harness = createHarness();
    harness.pointStore.setPointValues({ level: 60, speed: 200 });
    const result = harness.pipeline.flushFrame(harnessApply(harness));
    expect(result).toBe(true);
    expect(harness.applied).toHaveLength(1);
    expect(harness.applied[0]).toEqual({
      'pump-1': { fill: '#ff0000', rotation: 20 },
    });
  });

  it('should batch multiple changed points into one applyAttrs call (1 帧内多属性合并为单次批量写)', () => {
    const symbols: ScadaSymbolNode[] = [];
    const declarations: ScadaPointDeclaration[] = [];
    for (let i = 0; i < 1000; i++) {
      declarations.push({ id: `p${i}`, source: 'static', value: i });
      symbols.push({
        id: `s${i}`,
        type: 'scada-rect',
        x: 0,
        y: 0,
        bindings: { opacity: { point: `p${i}` } },
      });
    }
    const harness = createHarness({ declarations, symbols });
    const values: Record<string, number> = {};
    for (let i = 0; i < 1000; i++) values[`p${i}`] = i + 1;
    harness.pointStore.setPointValues(values);
    harness.pipeline.flushFrame(harnessApply(harness));
    expect(harness.applied).toHaveLength(1);
    expect(Object.keys(harness.applied[0])).toHaveLength(1000);
    expect(harness.applied[0].s42).toEqual({ opacity: 43 });
  });

  it('should recompute dependent expression points and propagate to bindings (依赖链)', () => {
    const harness = createHarness({
      declarations: [
        { id: 'v1', source: 'static', value: 2 },
        { id: 'v2', source: 'expression', expression: '${v1 * 10}' },
      ],
      symbols: [
        {
          id: 'meter',
          type: 'scada-rect',
          x: 0,
          y: 0,
          bindings: { text: { point: 'v2' } },
        },
      ],
    });
    harness.pipeline.flushFrame(harnessApply(harness));
    expect(harness.applied).toHaveLength(1);
    expect(harness.applied[0].meter).toEqual({ text: 20 });
    expect(harness.pointStore.getPointValue('v2')).toBe(20);

    harness.applied.length = 0;
    harness.pointStore.setPointValue('v1', 5);
    harness.pipeline.flushFrame(harnessApply(harness));
    expect(harness.applied).toHaveLength(1);
    expect(harness.applied[0].meter).toEqual({ text: 50 });
  });

  it('should recompute transitive expression chains in one frame', () => {
    const harness = createHarness({
      declarations: [
        { id: 'a', source: 'static', value: 2 },
        { id: 'b', source: 'expression', expression: '${a * 2}' },
        { id: 'c', source: 'expression', expression: '${b + 1}' },
      ],
      symbols: [
        {
          id: 'sym',
          type: 'scada-rect',
          x: 0,
          y: 0,
          bindings: { text: { point: 'c' } },
        },
      ],
    });
    harness.pipeline.flushFrame(harnessApply(harness));
    expect(harness.applied[0].sym).toEqual({ text: 5 });

    harness.applied.length = 0;
    harness.pointStore.setPointValue('a', 10);
    harness.pipeline.flushFrame(harnessApply(harness));
    expect(harness.applied[0].sym).toEqual({ text: 21 });
  });

  it('should detect binding cycles and keep last valid values (binding-cycle Failure Path)', () => {
    const onError = vi.fn();
    const harness = createHarness({
      declarations: [
        { id: 'v1', source: 'expression', expression: '${v2 * 2}' },
        { id: 'v2', source: 'expression', expression: '${v1 + 1}' },
      ],
      symbols: [
        {
          id: 'sym',
          type: 'scada-rect',
          x: 0,
          y: 0,
          bindings: { text: { point: 'v1' } },
        },
      ],
      onError,
    });
    harness.pipeline.flushFrame(harnessApply(harness));
    const circular = onError.mock.calls.filter((call) => String(call[0]).includes('circular dependency'));
    expect(circular).toHaveLength(2);
    expect(harness.pipeline.flushFrame(harnessApply(harness))).toBe(false);
    expect(onError).toHaveBeenCalledTimes(2);
  });

  it('should skip unknown point bindings and continue with the rest (point-id-unknown)', () => {
    const harness = createHarness({
      symbols: [
        {
          id: 'sym',
          type: 'scada-rect',
          x: 0,
          y: 0,
          bindings: {
            fill: { point: 'ghost' },
            opacity: { point: 'level' },
          },
        },
      ],
    });
    harness.pointStore.setPointValues({ level: 30 });
    harness.pipeline.flushFrame(harnessApply(harness));
    expect(harness.applied).toHaveLength(1);
    expect(harness.applied[0].sym).toEqual({ opacity: 30 });
  });

  it('should keep last valid value when an expression errors and report via onError once', () => {
    const onError = vi.fn();
    const harness = createHarness({
      declarations: [
        { id: 'v1', source: 'static', value: 1 },
        // I18 flux 一元化：成员访问 undefined 标识符（ghost 未声明）经 flux-formula evaluate 抛
        // 'Expression evaluation failed for: ${ghost.foo}' → evaluateFlux catch 吞为 undefined →
        // syncExpressionPoint 上报 'expression evaluation failed' 并保留 init=42。
        { id: 'v2', source: 'expression', expression: '${ghost.foo}', init: 42 },
      ],
      symbols: [
        {
          id: 'sym',
          type: 'scada-rect',
          x: 0,
          y: 0,
          bindings: { text: { point: 'v2' } },
        },
      ],
      onError,
    });
    harness.pipeline.flushFrame(harnessApply(harness));
    expect(onError).toHaveBeenCalledWith('expression evaluation failed');
    expect(harness.pointStore.getPointValue('v2')).toBe(42);
    harness.pointStore.setPointValue('v1', 2);
    harness.pipeline.flushFrame(harnessApply(harness));
    expect(onError).toHaveBeenCalledTimes(1);
    expect(harness.pointStore.getPointValue('v2')).toBe(42);
  });

  it('should not write anything when nothing changed', () => {
    const harness = createHarness();
    harness.pipeline.flushFrame(harnessApply(harness));
    harness.applied.length = 0;
    expect(harness.pipeline.flushFrame(harnessApply(harness))).toBe(false);
    expect(harness.applied).toHaveLength(0);
  });

  it('should flush pending collector entries even without point changes (动画合帧入口)', () => {
    const harness = createHarness();
    harness.collector.collect({ symbolId: 'pump-1', property: 'opacity', value: 0.5 });
    expect(harness.pipeline.flushFrame(harnessApply(harness))).toBe(true);
    expect(harness.applied).toHaveLength(1);
    expect(harness.applied[0]['pump-1']).toEqual(expect.objectContaining({ opacity: 0.5 }));
    harness.applied.length = 0;
    harness.collector.collect({ symbolId: 'pump-1', property: 'opacity', value: 0.6 });
    expect(harness.pipeline.flushFrame(harnessApply(harness))).toBe(true);
    expect(harness.applied).toHaveLength(1);
    expect(harness.applied[0]).toEqual({ 'pump-1': { opacity: 0.6 } });
  });

  it('requestRender should flush at frame tick with merged writes', () => {
    let tick: (() => void) | undefined;
    const reverseIndex = new ReverseIndex(
      [
        { id: 'pump-1', type: 'scada-rect', x: 0, y: 0, bindings: { rotation: { point: 'speed' } } },
      ],
      evalContext,
    );
    const pointStore = new PointStore();
    pointStore.loadDeclarations([{ id: 'speed', source: 'static', value: 1 }]);
    const collector = new DirtyCollector({ scheduleTick: () => () => {} });
    const pipeline = new RefreshPipeline({
      pointStore,
      reverseIndex,
      collector,
      compiler: expressionCompiler,
      env,
      scheduleTick: (cb) => {
        tick = cb;
        return () => {
          tick = undefined;
        };
      },
    });
    const applied: Array<Record<string, Record<string, unknown>>> = [];
    pointStore.setPointValue('speed', 2);
    pipeline.requestRender((attrs) => applied.push(attrs as Record<string, Record<string, unknown>>));
    pointStore.setPointValue('speed', 3);
    pipeline.requestRender((attrs) => applied.push(attrs as Record<string, Record<string, unknown>>));
    expect(tick).toBeDefined();
    tick?.();
    expect(applied).toHaveLength(1);
    expect(applied[0]).toEqual({ 'pump-1': { rotation: 3 } });
  });

  it('destroy should cancel scheduled frames and drop pipeline state', () => {
    const cancel = vi.fn();
    const reverseIndex = new ReverseIndex([], evalContext);
    const pointStore = new PointStore();
    const collector = new DirtyCollector({ scheduleTick: () => () => {} });
    const pipeline = new RefreshPipeline({
      pointStore,
      reverseIndex,
      collector,
      compiler: expressionCompiler,
      env,
      scheduleTick: (cb) => {
        void cb;
        return cancel;
      },
    });
    pipeline.requestRender(() => {});
    expect(cancel).toHaveBeenCalledTimes(0);
    pipeline.destroy();
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(collector.hasPending()).toBe(false);
  });

  it('should report when expression recompute exceeds the iteration budget', () => {
    const onError = vi.fn();
    const declarations: ScadaPointDeclaration[] = [{ id: 'p0', source: 'static', value: 0 }];
    for (let i = 1; i <= 4; i++) {
      declarations.push({
        id: `e${i}`,
        source: 'expression',
        expression: i === 1 ? '${p0 + 1}' : `\${e${i - 1} + 1}`,
        init: 0,
      });
    }
    const pointStore = new PointStore();
    pointStore.loadDeclarations(declarations);
    const collector = new DirtyCollector({ scheduleTick: () => () => {} });
    const pipeline = new RefreshPipeline({
      pointStore,
      reverseIndex: new ReverseIndex([], evalContext),
      collector,
      compiler: expressionCompiler,
      env,
      onError,
      maxExpressionIterations: 2,
    });
    pipeline.flushFrame(() => {});
    expect(onError).toHaveBeenCalledWith('expression recompute exceeded iteration budget');
  });
});

describe('RefreshPipeline 状态判定联动 (I6.2)', () => {
  const statesOf = (symbolId: string): ScadaStateDeclaration | undefined => {
    if (symbolId !== 'valve-1') return undefined;
    return {
      states: {
        run: { style: { fill: '#00ff00' } },
        stop: { style: { fill: '#888888' } },
        fault: { style: { fill: '#ff0000' } },
      },
      ranges: [
        { max: 0, state: 'stop' },
        { min: 80, state: 'fault' },
      ],
    };
  };

  it('should determine state from primary bound point and merge style patch (样式覆盖汇入脏收集)', () => {
    const onStateChange = vi.fn();
    const harness = createHarness({
      declarations: [{ id: 'open', source: 'static', value: 50 }],
      symbols: [
        {
          id: 'valve-1',
          type: 'scada-rect',
          x: 0,
          y: 0,
          bindings: { text: { point: 'open' } },
          states: statesOf('valve-1'),
        },
      ],
      getStates: statesOf,
      onStateChange,
    });
    harness.pipeline.flushFrame(harnessApply(harness));
    expect(harness.applied[0]['valve-1']).toEqual({ text: 50, fill: '#00ff00' });

    harness.applied.length = 0;
    harness.pointStore.setPointValue('open', 90);
    harness.pipeline.flushFrame(harnessApply(harness));
    expect(harness.applied[0]['valve-1']).toEqual({ text: 90, fill: '#ff0000' });
    expect(onStateChange).toHaveBeenNthCalledWith(1, { symbolId: 'valve-1', state: 'run' });
    expect(onStateChange).toHaveBeenNthCalledWith(2, { symbolId: 'valve-1', state: 'fault' });
    expect(onStateChange).toHaveBeenCalledTimes(2);
  });

  it('should emit state:change only on transitions and keep style applied on touched frames', () => {
    const onStateChange = vi.fn();
    const harness = createHarness({
      declarations: [{ id: 'open', source: 'static', value: 90 }],
      symbols: [
        {
          id: 'valve-1',
          type: 'scada-rect',
          x: 0,
          y: 0,
          bindings: { text: { point: 'open' } },
          states: statesOf('valve-1'),
        },
      ],
      getStates: statesOf,
      onStateChange,
    });
    harness.pipeline.flushFrame(harnessApply(harness));
    expect(onStateChange).toHaveBeenCalledTimes(1);
    harness.applied.length = 0;
    harness.pointStore.setPointValue('open', 95);
    harness.pipeline.flushFrame(harnessApply(harness));
    expect(onStateChange).toHaveBeenCalledTimes(1);
    expect(harness.applied[0]['valve-1']).toEqual({ text: 95, fill: '#ff0000' });
  });

  it('should leave symbols without state declarations untouched', () => {
    const harness = createHarness({
      symbols: [
        {
          id: 'plain',
          type: 'scada-rect',
          x: 0,
          y: 0,
          bindings: { text: { point: 'level' } },
        },
      ],
    });
    harness.pointStore.setPointValue('level', 5);
    harness.pipeline.flushFrame(harnessApply(harness));
    expect(harness.applied[0].plain).toEqual({ text: 5 });
  });
});

describe('RefreshPipeline 状态判定 scale 转发 (F4, plan 2026-08-04-1558-3 Phase 1)', () => {
  // 语义钉死：判定作用于 point-store 存储值（声明级 scale 已在 convert 施加）。
  // binding.scale 仅在声明级无 scale、或与声明级为同一 scale 对象时转发，避免双重换算。
  const rangesStates = (boundary: number): ScadaStateDeclaration => ({
    states: { low: { style: { fill: '#00ff00' } }, high: { style: { fill: '#ff0000' } } },
    ranges: [{ min: boundary, state: 'high' }],
  });
  // 单 rect symbol + getStates 收口（scale 转发三场景共用）
  const scaleHarness = (
    sid: string,
    declarations: ScadaPointDeclaration[],
    bindings: Record<string, unknown>,
    boundary: number,
  ): PipelineHarness =>
    createHarness({
      declarations,
      symbols: [{ id: sid, type: 'scada-rect', x: 0, y: 0, bindings } as ScadaSymbolNode],
      getStates: (id) => (id === sid ? rangesStates(boundary) : undefined),
    });

  it('声明级有 scale + binding 不同 scale → 不转发 binding.scale（判定作用于存储值）', () => {
    // declaration scale k=0.1：setPointValue(500) → convert → stored 50。binding scale k=2（不同对象）。
    // 边界 60：存储值 50 < 60 → low（不转发）。若（错误地）转发 k=2 → 100 ≥ 60 → high。
    const harness = scaleHarness('s1', [{ id: 'raw', source: 'flux', scale: { k: 0.1 } }], {
      text: { point: 'raw', scale: { k: 2 } },
    }, 60);
    harness.pointStore.setPointValue('raw', 500); // convert k=0.1 → stored 50
    harness.pipeline.flushFrame(harnessApply(harness));
    // 判定作用于存储值 50 → low（fill #00ff00）；binding.scale 未转发（避免双重换算）。
    // text = BindResolver 对存储值 50 施加 binding.scale k=2 → 100。
    expect(harness.applied[0]['s1']).toEqual({ text: 100, fill: '#00ff00' });
  });

  it('声明级无 scale + binding 有 scale → 转发 binding.scale（判定对齐绑定消费值）', () => {
    // declaration 无 scale：setPointValue(50) → stored 50（无换算）。binding scale k=2。
    // 边界 100：转发后 2×50=100 ≥ 100 → high；不转发则 50 < 100 → low。
    const harness = scaleHarness('s2', [{ id: 'val', source: 'flux' }], {
      text: { point: 'val', scale: { k: 2 } },
    }, 100);
    harness.pointStore.setPointValue('val', 50); // 无声明 scale → stored 50
    harness.pipeline.flushFrame(harnessApply(harness));
    // 转发 binding.scale → 100 ≥ 100 → high（fill #ff0000）；text 同为 100。
    expect(harness.applied[0]['s2']).toEqual({ text: 100, fill: '#ff0000' });
  });

  it('binding 无 scale → 判定作用于存储值（无转发）', () => {
    const harness = scaleHarness('s3', [{ id: 'val', source: 'static', value: 70 }], {
      text: { point: 'val' },
    }, 60);
    harness.pipeline.flushFrame(harnessApply(harness));
    expect(harness.applied[0]['s3']).toEqual({ text: 70, fill: '#ff0000' });
  });
});

describe('RefreshPipeline 状态→动画联动 (I6.3)', () => {
  const faultDeclaration = (): ScadaStateDeclaration => ({
    states: {
      run: { style: { fill: '#00ff00' } },
      fault: { style: { fill: '#ff0000' }, animations: [{ kind: 'blink', period: 500 }] },
    },
    ranges: [{ min: 80, state: 'fault' }],
  });

  interface StateHarness {
    pointStore: PointStore;
    pipeline: RefreshPipeline;
    applied: Array<Record<string, Record<string, unknown>>>;
    apply: (attrs: Record<string, Record<string, unknown>>) => void;
  }

  function createStateHarness(options: {
    animator: Animator;
    getAnimations?: (symbolId: string) => ScadaAnimation[] | undefined;
  }): StateHarness {
    const pointStore = new PointStore();
    pointStore.loadDeclarations([{ id: 'temp', source: 'static', value: 50 }]);
    const reverseIndex = new ReverseIndex(
      [
        {
          id: 'device-1',
          type: 'scada-rect',
          x: 0,
          y: 0,
          bindings: { text: { point: 'temp' } },
          states: faultDeclaration(),
        },
      ],
      evalContext,
    );
    const collector = new DirtyCollector({ scheduleTick: () => () => {} });
    const applied: Array<Record<string, Record<string, unknown>>> = [];
    const pipeline = new RefreshPipeline({
      pointStore,
      reverseIndex,
      collector,
      compiler: expressionCompiler,
      env,
      getStates: (symbolId) => (symbolId === 'device-1' ? faultDeclaration() : undefined),
      getAnimations: options.getAnimations,
      animator: options.animator,
    });
    return {
      pointStore,
      pipeline,
      applied,
      apply: (attrs: Record<string, Record<string, unknown>>) => {
        applied.push(attrs);
      },
    };
  }

  it('should auto-start fault-state blink on state entry and stop it on exit (fault 态自动 blink)', () => {
    const animator = new Animator({ now: () => 0, scheduleTick: () => () => {} });
    const harness = createStateHarness({ animator });
    harness.pipeline.flushFrame(harness.apply);
    expect(animator.isPlaying('device-1', 'blink')).toBe(false);

    harness.pointStore.setPointValue('temp', 90);
    harness.pipeline.flushFrame(harness.apply);
    expect(animator.isPlaying('device-1', 'blink')).toBe(true);

    harness.pointStore.setPointValue('temp', 10);
    harness.pipeline.flushFrame(harness.apply);
    expect(animator.isPlaying('device-1', 'blink')).toBe(false);
  });

  it('should start when:always and when:{state} symbol-level animations via linkage', () => {
    const animator = new Animator({ now: () => 0, scheduleTick: () => () => {} });
    const getAnimations = (): ScadaAnimation[] => [
      { kind: 'rotate', period: 1000, when: 'always' },
      { kind: 'flow', period: 1000, when: { state: 'fault' } },
    ];
    const harness = createStateHarness({ animator, getAnimations });
    harness.pipeline.flushFrame(harness.apply);
    expect(animator.isPlaying('device-1', 'rotate')).toBe(true);
    expect(animator.isPlaying('device-1', 'flow')).toBe(false);

    harness.pointStore.setPointValue('temp', 90);
    harness.pipeline.flushFrame(harness.apply);
    expect(animator.isPlaying('device-1', 'flow')).toBe(true);

    harness.pointStore.setPointValue('temp', 10);
    harness.pipeline.flushFrame(harness.apply);
    expect(animator.isPlaying('device-1', 'flow')).toBe(false);
    expect(animator.isPlaying('device-1', 'rotate')).toBe(true);
  });

  it('should emit state:change via the unified subscription exit (I6.4 数据层事件)', () => {
    const harness = createStateHarness({ animator: new Animator({ now: () => 0, scheduleTick: () => () => {} }) });
    const onStateChange = vi.fn();
    const unsubscribe = harness.pipeline.on('state:change', onStateChange);
    harness.pipeline.flushFrame(harness.apply);
    expect(onStateChange).toHaveBeenCalledTimes(1);
    expect(onStateChange).toHaveBeenCalledWith({ symbolId: 'device-1', state: 'run' });

    harness.pointStore.setPointValue('temp', 90);
    harness.pipeline.flushFrame(harness.apply);
    expect(onStateChange).toHaveBeenLastCalledWith({ symbolId: 'device-1', state: 'fault' });

    unsubscribe();
    harness.pointStore.setPointValue('temp', 10);
    harness.pipeline.flushFrame(harness.apply);
    expect(onStateChange).toHaveBeenCalledTimes(2);
  });
});

describe('RefreshPipeline 销毁门控 + collector 单一 owner (plan 2026-08-04-2243-1 Phase 1 L1/L3)', () => {
  it('destroy 后 requestRender/flushFrame 均为 no-op（L1：阻断陈旧 runtime 闭包重激活）', () => {
    const reverseIndex = new ReverseIndex(
      [
        { id: 'sym', type: 'scada-rect', x: 0, y: 0, bindings: { text: { point: 'p' } } },
      ],
      evalContext,
    );
    const pointStore = new PointStore();
    pointStore.loadDeclarations([{ id: 'p', source: 'static', value: 1 }]);
    const collector = new DirtyCollector({ scheduleTick: () => () => {} });
    let tick: (() => void) | undefined;
    const pipeline = new RefreshPipeline({
      pointStore,
      reverseIndex,
      collector,
      compiler: expressionCompiler,
      env,
      scheduleTick: (cb) => {
        tick = cb;
        return () => {
          tick = undefined;
        };
      },
    });
    const applied: Array<Record<string, Record<string, unknown>>> = [];
    const applyAttrs = (attrs: Record<string, Record<string, unknown>>) => applied.push(attrs);

    pipeline.destroy();

    // destroy 后 requestRender 不调度帧（不设 tick）
    pointStore.setPointValue('p', 99);
    pipeline.requestRender(applyAttrs as ApplyAttrs);
    expect(tick).toBeUndefined();
    if (tick) tick();
    // destroy 后 flushFrame no-op 返 false，不写 applyAttrs
    expect(pipeline.flushFrame(applyAttrs as ApplyAttrs)).toBe(false);
    expect(applied).toHaveLength(0);
  });

  it('pipeline.destroy() 是 collector 销毁的单一 owner，仅销毁一次（L3 single-owner）', () => {
    const reverseIndex = new ReverseIndex([], evalContext);
    const pointStore = new PointStore();
    const collector = new DirtyCollector({ scheduleTick: () => () => {} });
    const pipeline = new RefreshPipeline({
      pointStore,
      reverseIndex,
      collector,
      compiler: expressionCompiler,
      env,
    });
    const destroySpy = vi.spyOn(collector, 'destroy');

    pipeline.destroy();
    // 单一 owner：pipeline.destroy() 内部销毁 collector 恰好一次
    expect(destroySpy).toHaveBeenCalledTimes(1);
    // 二次调用 pipeline.destroy() 幂等 no-op（不重复销毁 collector）
    pipeline.destroy();
    expect(destroySpy).toHaveBeenCalledTimes(1);
    destroySpy.mockRestore();
  });
});

describe('RefreshPipeline stateSource 显式 state-driver (plan 2026-08-05-0653-3 B3)', () => {
  // 共享 ranges/states：[0,50]→run(#0f0)，[51,∞]→fault(#f00)
  const runFaultRanges = (stateSource?: string): ScadaStateDeclaration => ({
    states: { run: { style: { fill: '#0f0' } }, fault: { style: { fill: '#f00' } } },
    ranges: [{ min: 0, max: 50, state: 'run' }, { min: 51, state: 'fault' }],
    ...(stateSource ? { stateSource } : {}),
  });
  const b3Harness = (
    declarations: ScadaPointDeclaration[],
    bindings: Record<string, { point: string }>,
    stateSource?: string,
  ): PipelineHarness => {
    const symbols: ScadaSymbolNode[] = [{ id: 'sym', type: 'scada-rect', x: 0, y: 0, bindings }];
    return createHarness({
      declarations,
      symbols,
      getStates: (id) => (id === 'sym' ? runFaultRanges(stateSource) : undefined),
    });
  };

  it('should use declaration.stateSource as state-driver instead of reverse-index [0] (B3)', () => {
    // primary（reverse-index [0]）=p1=100，但 stateSource=p2=0 → run（[0,50]）
    const harness = b3Harness(
      [{ id: 'p1', source: 'static', value: 100 }, { id: 'p2', source: 'static', value: 0 }],
      { opacity: { point: 'p1' }, fill: { point: 'p2' } },
      'p2',
    );
    harness.pipeline.flushFrame(harnessApply(harness));
    expect(harness.applied.some((a) => a.sym?.fill === '#0f0')).toBe(true);
    harness.pointStore.setPointValue('p2', 80);
    harness.pipeline.flushFrame(harnessApply(harness));
    // p2=80 → fault（>50），即使 p1 仍=100
    expect(harness.applied.some((a) => a.sym?.fill === '#f00')).toBe(true);
  });

  it('should fall back to reverse-index [0] when stateSource is absent (B3 backward compat)', () => {
    // 无 stateSource → [0] = opacity/p1 =100 → fault（>50）
    const harness = b3Harness(
      [{ id: 'p1', source: 'static', value: 100 }, { id: 'p2', source: 'static', value: 0 }],
      { opacity: { point: 'p1' }, fill: { point: 'p2' } },
    );
    harness.pipeline.flushFrame(harnessApply(harness));
    expect(harness.applied.some((a) => a.sym?.fill === '#f00')).toBe(true);
  });

  it('should support stateSource with property qualifier "pointId.property" (B3)', () => {
    // drv=60 → drv.fill > 50 → fault
    const harness = b3Harness(
      [{ id: 'drv', source: 'static', value: 60 }],
      { fill: { point: 'drv' } },
      'drv.fill',
    );
    harness.pipeline.flushFrame(harnessApply(harness));
    expect(harness.applied.some((a) => a.sym?.fill === '#f00')).toBe(true);
  });
});
