import { describe, expect, it } from 'vitest';
import { KeyframeClip } from './keyframes.js';
import type { AnimationConfig } from '../schemas.js';

function clip(overrides: Partial<AnimationConfig> = {}): AnimationConfig {
  return {
    id: 'c1',
    trigger: { type: 'time', source: '' },
    target: { modelId: 'valve', property: 'position.x' },
    keyframes: [
      { time: 0, value: 0 },
      { time: 1000, value: 10 },
    ],
    ...overrides,
  };
}

function makePlayer(config: AnimationConfig) {
  let now = 0;
  const writes: unknown[] = [];
  const diagnostics: Array<{ code: string }> = [];
  const player = new KeyframeClip(config, {
    now: () => now,
    apply: (v) => writes.push(v),
    onError: (code) => diagnostics.push({ code }),
  });
  return {
    player,
    diagnostics,
    writes,
    tick(ms: number) {
      now += ms;
      player.advance(now);
    },
  };
}

describe('KeyframeClip player (plan 466 Phase 4, design-data-binding.md §6)', () => {
  it('time clip: interpolates per segment and finishes at the last keyframe', () => {
    const r = makePlayer(clip());
    r.player.start();
    r.tick(500);
    expect(r.writes.at(-1)).toBeCloseTo(5, 5);
    r.tick(500);
    expect(r.writes.at(-1)).toBe(10);
    expect(r.player.finished).toBe(true);
  });

  it('loop count 2 replays the timeline and finishes at the last value', () => {
    const r = makePlayer(clip({ loop: { type: 'loop', count: 2 } }));
    r.player.start();
    r.tick(1500);
    expect(r.writes.at(-1)).toBeCloseTo(5, 5); // 第二圈的前半段
    r.tick(500);
    expect(r.writes.at(-1)).toBe(10);
    expect(r.player.finished).toBe(true);
  });

  it('pingpong plays forward then backward and finishes at the first value', () => {
    const r = makePlayer(clip({ loop: { type: 'pingpong', count: 1 } }));
    r.player.start();
    r.tick(500);
    expect(r.writes.at(-1)).toBeCloseTo(5, 5);
    r.tick(500);
    expect(r.writes.at(-1)).toBe(10); // 前向终点
    r.tick(500);
    expect(r.writes.at(-1)).toBeCloseTo(5, 5); // 回程
    r.tick(500);
    expect(r.writes.at(-1)).toBe(0); // 回程终点（首帧值）
    expect(r.player.finished).toBe(true);
  });

  it('per-keyframe easing applies to the segment', () => {
    const r = makePlayer(
      clip({
        keyframes: [
          { time: 0, value: 0 },
          { time: 1000, value: 10, easing: 'easeOut' },
        ],
      }),
    );
    r.player.start();
    r.tick(500);
    expect(r.writes.at(-1)).toBeGreaterThan(5); // easeOut 前半程超过线性
  });

  it('single-keyframe clip applies the constant and finishes', () => {
    const r = makePlayer(clip({ keyframes: [{ time: 0, value: 7 }] }));
    r.player.start();
    r.tick(100);
    expect(r.writes.at(-1)).toBe(7);
    expect(r.player.finished).toBe(true);
  });

  it('non-monotonic keyframe times play in array order (no re-sort) with one diagnostic', () => {
    const r = makePlayer(
      clip({
        keyframes: [
          { time: 1000, value: 10 },
          { time: 0, value: 0 },
        ],
      }),
    );
    r.player.start();
    r.tick(500);
    expect(r.writes.at(-1)).toBeCloseTo(5, 5);
    expect(r.diagnostics.filter((d) => d.code === 'keyframes-degenerate')).toHaveLength(1);
  });

  it('unknown easing in a keyframe falls back to linear with one-shot diagnostic', () => {
    const r = makePlayer(
      clip({
        keyframes: [
          { time: 0, value: 0 },
          { time: 1000, value: 10, easing: 'wobbly' },
        ],
      }),
    );
    r.player.start();
    r.tick(1000);
    expect(r.writes.at(-1)).toBe(10);
    expect(r.diagnostics.filter((d) => d.code === 'easing-unknown')).toHaveLength(1);
  });

  it('empty keyframes never start (registration-time rejection is upstream, player guards anyway)', () => {
    const r = makePlayer(clip({ keyframes: [] }));
    r.player.start();
    r.tick(100);
    expect(r.writes).toEqual([]);
    expect(r.player.finished).toBe(true);
  });

  it('state-triggered clips only run after start() is invoked', () => {
    const r = makePlayer(clip({ trigger: { type: 'state', source: 'sceneState.valve' } }));
    r.tick(500);
    expect(r.writes).toEqual([]);
    r.player.start();
    r.tick(500);
    expect(r.writes.at(-1)).toBeCloseTo(5, 5);
  });
});

describe('KeyframeClip branch supplement (plan 466 coverage policy)', () => {
  it('zero-length timeline (multi-frame same time) snaps to last value with diagnostic', () => {
    const r = makePlayer(
      clip({
        keyframes: [
          { time: 500, value: 1 },
          { time: 500, value: 2 },
        ],
      }),
    );
    r.player.start();
    r.tick(100);
    expect(r.writes.at(-1)).toBe(2);
    expect(r.diagnostics.filter((d) => d.code === 'keyframes-degenerate')).toHaveLength(1);
  });

  it('zero-length mid segment applies the target instantly (t=1 branch)', () => {
    const r = makePlayer(
      clip({
        keyframes: [
          { time: 0, value: 0 },
          { time: 0, value: 5 },
          { time: 1000, value: 10 },
        ],
      }),
    );
    r.player.start();
    r.tick(500);
    expect(r.writes.at(-1)).toBeCloseTo(7.5, 1);
  });

  it('easeInOut covers both ternary sides', () => {
    const r = makePlayer(
      clip({
        keyframes: [
          { time: 0, value: 0 },
          { time: 1000, value: 10, easing: 'easeInOut' },
        ],
      }),
    );
    r.player.start();
    r.tick(250);
    expect(r.writes.at(-1)).toBeLessThan(5);
    r.tick(500);
    expect(r.writes.at(-1)).toBeGreaterThan(5);
  });
});
