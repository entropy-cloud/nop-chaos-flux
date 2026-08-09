import { describe, it, expect, vi } from 'vitest';
import type {
  ScadaPointDeclaration,
  ScadaStateDeclaration,
  ScadaSymbolNode,
} from '../serialization/config-types.js';
import {
  createHarness,
  harnessApply,
  type PipelineHarness,
} from './refresh-pipeline-fixtures.js';

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
