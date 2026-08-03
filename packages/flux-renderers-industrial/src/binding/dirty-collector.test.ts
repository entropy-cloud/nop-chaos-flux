import { describe, it, expect, vi } from 'vitest';
import { DirtyCollector, createTickScheduler } from './dirty-collector.js';
import type { ApplyAttrs } from './dirty-collector.js';

const noopApplyAttrs: ApplyAttrs = () => {};

describe('DirtyCollector 帧内脏属性收集 (I6.1)', () => {
  it('should merge multiple collects for the same symbol/property (脏属性收敛)', () => {
    const collector = new DirtyCollector();
    collector.collect({ symbolId: 'a', property: 'fill', value: '#111' });
    collector.collect({ symbolId: 'a', property: 'fill', value: '#222' });
    const applied: Array<Record<string, unknown>> = [];
    const result = collector.flush((attrs) => applied.push(attrs));
    expect(result).toBe(true);
    expect(applied).toEqual([{ a: { fill: '#222' } }]);
  });

  it('should merge multi-symbol multi-property entries into one batch write (单帧合并)', () => {
    const collector = new DirtyCollector();
    collector.collect([
      { symbolId: 'a', property: 'fill', value: '#111' },
      { symbolId: 'a', property: 'opacity', value: 0.5 },
      { symbolId: 'b', property: 'x', value: 10 },
    ]);
    const applied: Array<Record<string, unknown>> = [];
    collector.flush((attrs) => applied.push(attrs));
    expect(applied).toEqual([{ a: { fill: '#111', opacity: 0.5 }, b: { x: 10 } }]);
  });

  it('should return false and not call applyAttrs when nothing is pending', () => {
    const collector = new DirtyCollector();
    const applyAttrs = vi.fn();
    expect(collector.flush(applyAttrs)).toBe(false);
    expect(collector.flushFrame(applyAttrs)).toBe(false);
    expect(applyAttrs).not.toHaveBeenCalled();
  });

  it('should skip undefined values', () => {
    const collector = new DirtyCollector();
    collector.collect({ symbolId: 'a', property: 'fill', value: undefined });
    expect(collector.hasPending()).toBe(false);
    expect(collector.flush(noopApplyAttrs)).toBe(false);
  });

  it('hasPending should reflect pending entries', () => {
    const collector = new DirtyCollector();
    expect(collector.hasPending()).toBe(false);
    collector.collect({ symbolId: 'a', property: 'x', value: 1 });
    expect(collector.hasPending()).toBe(true);
    collector.flush(noopApplyAttrs);
    expect(collector.hasPending()).toBe(false);
  });
});

describe('DirtyCollector requestRender 帧对齐 (I6.1)', () => {
  it('should flush via injected scheduler at frame end (帧尾批量写)', () => {
    let tick: (() => void) | undefined;
    const scheduleTick = vi.fn((cb: () => void) => {
      tick = cb;
      return () => {
        tick = undefined;
      };
    });
    const collector = new DirtyCollector({ scheduleTick });
    collector.collect({ symbolId: 'a', property: 'fill', value: '#abc' });
    const applied: Array<Record<string, unknown>> = [];
    collector.requestRender(() => collector.flush((attrs) => applied.push(attrs)));
    expect(scheduleTick).toHaveBeenCalledTimes(1);
    tick?.();
    expect(applied).toEqual([{ a: { fill: '#abc' } }]);
    expect(collector.hasPending()).toBe(false);
  });

  it('should merge multiple requestRender calls within one frame (限频合并)', () => {
    let tick: (() => void) | undefined;
    const scheduleTick = (cb: () => void) => {
      tick = cb;
      return () => {
        tick = undefined;
      };
    };
    const collector = new DirtyCollector({ scheduleTick });
    collector.collect({ symbolId: 'a', property: 'x', value: 1 });
    collector.requestRender();
    collector.collect({ symbolId: 'a', property: 'x', value: 2 });
    collector.requestRender();
    collector.collect({ symbolId: 'b', property: 'y', value: 3 });
    collector.requestRender();
    expect(tick).toBeDefined();
    tick?.();
    const applied: Array<Record<string, unknown>> = [];
    collector.flushFrame((attrs) => applied.push(attrs));
    expect(applied).toEqual([{ a: { x: 2 }, b: { y: 3 } }]);
  });

  it('should not schedule a frame when nothing is pending (帧内无写入不触发渲染请求)', () => {
    const scheduleTick = vi.fn((_cb: () => void) => () => {});
    const collector = new DirtyCollector({ scheduleTick });
    collector.requestRender();
    expect(scheduleTick).not.toHaveBeenCalled();
  });

  it('flushFrame should cancel the pending scheduled tick and flush immediately', () => {
    const cancel = vi.fn();
    const scheduleTick = vi.fn((_cb: () => void) => cancel);
    const collector = new DirtyCollector({ scheduleTick });
    collector.collect({ symbolId: 'a', property: 'x', value: 1 });
    collector.requestRender();
    expect(scheduleTick).toHaveBeenCalledTimes(1);
    const applied: Array<Record<string, unknown>> = [];
    expect(collector.flushFrame((attrs) => applied.push(attrs))).toBe(true);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(applied).toEqual([{ a: { x: 1 } }]);
  });

  it('destroy should cancel pending tick and drop pending entries', () => {
    const cancel = vi.fn();
    const collector = new DirtyCollector({
      scheduleTick: (_cb: () => void) => {
        void _cb;
        return cancel;
      },
    });
    collector.collect({ symbolId: 'a', property: 'x', value: 1 });
    collector.requestRender();
    collector.destroy();
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(collector.hasPending()).toBe(false);
    expect(collector.flush(noopApplyAttrs)).toBe(false);
  });
});

describe('createTickScheduler (I6.1)', () => {
  it('should fall back to requestAnimationFrame by default', () => {
    const scheduler = createTickScheduler();
    const cb = vi.fn();
    const cancel = scheduler(() => {
      cb();
    });
    expect(typeof cancel).toBe('function');
    cancel();
  });
});
