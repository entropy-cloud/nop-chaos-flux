import { describe, it, expect, vi } from 'vitest';
import { Animator } from './animator.js';
import { DirtyCollector } from './dirty-collector.js';
import type { CollectedEntry } from './dirty-collector.js';

interface ClockHarness {
  now: () => number;
  advance: (ms: number) => void;
  runTick: () => void;
  animator: Animator;
  collected: CollectedEntry[];
}

function createClock(options?: { interval?: number; collect?: (entry: CollectedEntry) => void; requestFrame?: () => void }): ClockHarness {
  let time = 0;
  let pendingTick: (() => void) | undefined;
  const collected: CollectedEntry[] = [];
  const animator = new Animator({
    now: () => time,
    scheduleTick: (cb) => {
      pendingTick = cb;
      return () => {
        pendingTick = undefined;
      };
    },
    interval: options?.interval,
    collect: (entry) => {
      collected.push(entry);
      options?.collect?.(entry);
    },
    requestFrame: options?.requestFrame,
  });
  return {
    now: () => time,
    advance: (ms) => {
      time += ms;
    },
    runTick: () => {
      pendingTick?.();
    },
    animator,
    collected,
  };
}

describe('Animator 时钟与生命周期 (I6.3)', () => {
  it('start should begin playback and emit animation:start', () => {
    const harness = createClock();
    const onStart = vi.fn();
    const onStop = vi.fn();
    harness.animator.on('animation:start', onStart);
    harness.animator.on('animation:stop', onStop);
    harness.animator.start('fan-1', { kind: 'rotate', period: 1000 });
    expect(harness.animator.isPlaying('fan-1')).toBe(true);
    expect(harness.animator.isPlaying('fan-1', 'rotate')).toBe(true);
    expect(onStart).toHaveBeenCalledWith({ symbolId: 'fan-1', kind: 'rotate' });
    expect(onStop).not.toHaveBeenCalled();
  });

  it('stop should end playback, emit animation:stop and stop the clock', () => {
    const harness = createClock();
    const onStop = vi.fn();
    harness.animator.on('animation:stop', onStop);
    harness.animator.start('fan-1', { kind: 'rotate' });
    harness.animator.stop('fan-1');
    expect(harness.animator.isPlaying('fan-1')).toBe(false);
    expect(onStop).toHaveBeenCalledWith({ symbolId: 'fan-1', kind: 'rotate' });
    harness.advance(100);
    harness.runTick();
    expect(harness.collected).toHaveLength(0);
  });

  it('stop with kind should stop only that animation kind', () => {
    const harness = createClock();
    const onStop = vi.fn();
    harness.animator.on('animation:stop', onStop);
    harness.animator.start('s1', { kind: 'rotate' });
    harness.animator.start('s1', { kind: 'blink', period: 100 });
    harness.animator.stop('s1', 'rotate');
    expect(harness.animator.isPlaying('s1', 'rotate')).toBe(false);
    expect(harness.animator.isPlaying('s1', 'blink')).toBe(true);
    expect(onStop).toHaveBeenCalledWith({ symbolId: 's1', kind: 'rotate' });
  });

  it('start with same kind should update parameters while keeping playback (setAttrs 参数更新)', () => {
    const harness = createClock();
    const onStart = vi.fn();
    harness.animator.on('animation:start', onStart);
    harness.animator.start('s1', { kind: 'rotate', period: 1000 });
    harness.animator.start('s1', { kind: 'rotate', period: 2000, from: 0, to: 180 });
    expect(onStart).toHaveBeenCalledTimes(1);
    harness.advance(1000);
    harness.runTick();
    expect(harness.collected).toEqual([{ symbolId: 's1', property: 'rotation', value: 90 }]);
  });

  it('pause/resume should freeze and resume elapsed time', () => {
    const harness = createClock();
    harness.animator.start('s1', { kind: 'rotate', period: 1000 });
    harness.advance(500);
    harness.runTick();
    harness.animator.pause('s1');
    harness.advance(5000);
    harness.runTick();
    expect(harness.collected[harness.collected.length - 1].value).toBe(180);
    harness.animator.resume('s1');
    harness.advance(250);
    harness.runTick();
    expect(harness.collected[harness.collected.length - 1].value).toBe(270);
  });

  it('pause on unknown/not-playing animations should be a no-op', () => {
    const harness = createClock();
    harness.animator.pause('ghost');
    harness.animator.resume('ghost');
    expect(harness.animator.isPlaying('ghost')).toBe(false);
  });

  it('destroy should stop all animations and emit stops', () => {
    const harness = createClock();
    const onStop = vi.fn();
    harness.animator.on('animation:stop', onStop);
    harness.animator.start('a', { kind: 'rotate' });
    harness.animator.start('b', { kind: 'blink' });
    harness.animator.destroy();
    expect(onStop).toHaveBeenCalledTimes(2);
    expect(harness.animator.isPlaying('a')).toBe(false);
    harness.advance(50);
    harness.runTick();
    expect(harness.collected).toHaveLength(0);
  });

  it('should schedule a tick only while animations are playing', () => {
    const harness = createClock();
    harness.animator.start('a', { kind: 'rotate' });
    harness.runTick();
    harness.animator.stop('a');
    harness.runTick();
    harness.advance(100);
    harness.runTick();
    expect(harness.collected).toHaveLength(1);
  });

  it('should fall back to requestAnimationFrame scheduling when no scheduler is injected', () => {
    const animator = new Animator({ now: () => 100 });
    animator.start('a', { kind: 'rotate', period: 100 });
    expect(animator.isPlaying('a')).toBe(true);
    animator.destroy();
    expect(animator.isPlaying('a')).toBe(false);
  });

  it('getActiveKinds should report playing kinds and empty for idle symbols', () => {
    const harness = createClock();
    expect(harness.animator.getActiveKinds('ghost')).toEqual([]);
    harness.animator.start('s1', { kind: 'rotate' });
    harness.animator.start('s1', { kind: 'blink' });
    expect(harness.animator.getActiveKinds('s1').sort()).toEqual(['blink', 'rotate']);
  });

  it('pause/resume with kind should target only that animation', () => {
    const harness = createClock();
    harness.animator.pause('ghost', 'rotate');
    harness.animator.resume('ghost', 'rotate');
    harness.animator.start('s1', { kind: 'rotate', period: 1000 });
    harness.animator.pause('s1', 'blink');
    harness.animator.resume('s1', 'blink');
    expect(harness.animator.isPlaying('s1', 'rotate')).toBe(true);
  });

  // plan 2026-08-09-0121-2 Workstream A F7：pause 全部 active 后停止 rAF 时钟，避免每帧重算冻结增量。
  it('F7: pausing all animations stops the rAF clock (no requestFrame after pause, resume restarts)', () => {
    const requestFrame = vi.fn();
    const harness = createClock({ requestFrame });
    harness.animator.start('s1', { kind: 'rotate', period: 1000 });
    harness.advance(100);
    harness.runTick();
    expect(requestFrame).toHaveBeenCalledTimes(1);

    harness.animator.pause('s1');
    // 全 paused → stopClock：调度被取消，advance + runTick 不应再触达 tick / requestFrame。
    harness.advance(100);
    harness.runTick();
    expect(requestFrame).toHaveBeenCalledTimes(1);

    // resume → ensureClock 重启时钟，下一 tick 恢复推进 + requestFrame。
    harness.animator.resume('s1');
    harness.advance(100);
    harness.runTick();
    expect(requestFrame).toHaveBeenCalledTimes(2);
  });

  it('F7: partial pause keeps the clock running for the non-paused animation', () => {
    const requestFrame = vi.fn();
    const harness = createClock({ requestFrame });
    harness.animator.start('s1', { kind: 'rotate', period: 1000 });
    harness.animator.start('s1', { kind: 'blink', period: 500 });
    harness.advance(100);
    harness.runTick();
    harness.animator.pause('s1', 'rotate'); // 仅 pause rotate，blink 仍 playing → clock 不停
    harness.advance(100);
    harness.runTick();
    expect(requestFrame).toHaveBeenCalledTimes(2); // blink 推进，clock 继续
  });
});

describe('Animator 30ms 限频与插值计算 (I6.3)', () => {
  it('should throttle ticks to the 30ms interval (高频率请求合并)', () => {
    const harness = createClock();
    harness.animator.start('s1', { kind: 'rotate', period: 3600 });
    harness.runTick();
    harness.advance(10);
    harness.runTick();
    harness.advance(10);
    harness.runTick();
    expect(harness.collected).toHaveLength(1);
    harness.advance(10);
    harness.runTick();
    expect(harness.collected).toHaveLength(2);
  });

  it('rotate should interpolate rotation over the period', () => {
    const harness = createClock();
    harness.animator.start('s1', { kind: 'rotate', period: 1000, from: 0, to: 180 });
    harness.advance(250);
    harness.runTick();
    expect(harness.collected[0]).toEqual({ symbolId: 's1', property: 'rotation', value: 45 });
    harness.advance(250);
    harness.runTick();
    expect(harness.collected[1].value).toBe(90);
    harness.advance(250);
    harness.runTick();
    expect(harness.collected[2].value).toBe(135);
    harness.advance(250);
    harness.runTick();
    expect(harness.collected[3].value).toBe(0);
  });

  it('rotate should wrap around the cycle (整圈周期)', () => {
    const harness = createClock();
    harness.animator.start('s1', { kind: 'rotate', period: 1000 });
    harness.advance(2500);
    harness.runTick();
    expect(harness.collected[harness.collected.length - 1].value).toBe(180);
  });

  it('blink should toggle visible as a square wave (方波)', () => {
    const harness = createClock();
    harness.animator.start('s1', { kind: 'blink', period: 1000 });
    harness.advance(1);
    harness.runTick();
    expect(harness.collected[0]).toEqual({ symbolId: 's1', property: 'visible', value: true });
    harness.advance(600);
    harness.runTick();
    expect(harness.collected[1].value).toBe(false);
    harness.advance(500);
    harness.runTick();
    expect(harness.collected[2].value).toBe(true);
  });

  it('blink should toggle opacity when from/to are given', () => {
    const harness = createClock();
    harness.animator.start('s1', { kind: 'blink', period: 1000, from: 1, to: 0.2 });
    harness.advance(1);
    harness.runTick();
    expect(harness.collected[0]).toEqual({ symbolId: 's1', property: 'opacity', value: 1 });
    harness.advance(600);
    harness.runTick();
    expect(harness.collected[1].value).toBe(0.2);
  });

  it('flow should sweep dashOffset over the period', () => {
    const harness = createClock();
    harness.animator.start('pipe-1', { kind: 'flow', period: 1000 });
    harness.advance(500);
    harness.runTick();
    expect(harness.collected[0]).toEqual({ symbolId: 'pipe-1', property: 'dashOffset', value: 50 });
  });

  it('move should interpolate x/y between from/to', () => {
    const harness = createClock();
    harness.animator.start('slider', { kind: 'move', period: 1000, from: { x: 0, y: 0 }, to: { x: 100, y: 50 } });
    harness.advance(250);
    harness.runTick();
    expect(harness.collected[0]).toEqual({ symbolId: 'slider', property: 'x', value: 25 });
    expect(harness.collected[1]).toEqual({ symbolId: 'slider', property: 'y', value: 12.5 });
  });

  it('loop should auto-stop after the given cycles and 0 means infinite', () => {
    const harness = createClock();
    const onStop = vi.fn();
    harness.animator.on('animation:stop', onStop);
    harness.animator.start('s1', { kind: 'move', period: 100, from: { x: 0, y: 0 }, to: { x: 10, y: 0 }, loop: 2 });
    harness.advance(250);
    harness.runTick();
    expect(onStop).toHaveBeenCalledWith({ symbolId: 's1', kind: 'move' });
    expect(harness.animator.isPlaying('s1')).toBe(false);

    harness.animator.start('s2', { kind: 'rotate', period: 100, loop: 0 });
    harness.advance(1000);
    harness.runTick();
    expect(harness.animator.isPlaying('s2')).toBe(true);
  });

  it('should request a frame flush when animations are playing (合帧)', () => {
    const requestFrame = vi.fn();
    const harness = createClock({ requestFrame });
    harness.animator.start('s1', { kind: 'rotate' });
    harness.advance(100);
    harness.runTick();
    expect(requestFrame).toHaveBeenCalledTimes(1);
    harness.animator.stop('s1');
  });
});

describe('Animator 动画合帧（汇入帧内脏收集） (I6.3)', () => {
  it('should merge animation increments with point refresh in the same frame batch write', () => {
    const collector = new DirtyCollector({ scheduleTick: () => () => {} });
    const requestFrame = vi.fn();
    const harness = createClock({ collect: (entry) => collector.collect(entry), requestFrame });
    harness.animator.start('fan-1', { kind: 'rotate', period: 1000 });
    harness.advance(100);
    harness.runTick();
    expect(requestFrame).toHaveBeenCalledTimes(1);

    collector.collect({ symbolId: 'fan-1', property: 'opacity', value: 0.5 });
    const applied: Array<Record<string, Record<string, unknown>>> = [];
    expect(collector.flush((attrs) => applied.push(attrs as Record<string, Record<string, unknown>>))).toBe(true);
    expect(applied).toHaveLength(1);
    expect(applied[0]['fan-1']).toEqual({ opacity: 0.5, rotation: 36 });
  });
});
