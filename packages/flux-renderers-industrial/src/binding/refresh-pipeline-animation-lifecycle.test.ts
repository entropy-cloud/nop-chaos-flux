import { describe, it, expect, vi } from 'vitest';
import { PointStore } from './point-store.js';
import { ReverseIndex } from './reverse-index.js';
import { DirtyCollector, RefreshPipeline } from './dirty-collector.js';
import type { ApplyAttrs } from './dirty-collector.js';
import { Animator } from './animator.js';
import type {
  ScadaAnimation,
  ScadaStateDeclaration,
} from '../serialization/config-types.js';
import { expressionCompiler, env, evalContext } from './refresh-pipeline-fixtures.js';

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
