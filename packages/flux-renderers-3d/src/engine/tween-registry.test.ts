import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { TweenRegistry } from './tween-registry.js';
import type { BindingAnimationConfig } from '../schemas.js';

function anim(overrides: Partial<BindingAnimationConfig> = {}): BindingAnimationConfig {
  return { type: 'tween', duration: 1000, easing: 'linear', ...overrides };
}

function makeRegistry() {
  let now = 0;
  const writes: Array<unknown> = [];
  const diagnostics: Array<{ code: string }> = [];
  const registry = new TweenRegistry({
    now: () => now,
    onError: (code) => diagnostics.push({ code }),
  });
  return {
    registry,
    diagnostics,
    writes,
    tick(ms: number) {
      now += ms;
      registry.advance(now);
    },
  };
}

describe('TweenRegistry (plan 466 Phase 2)', () => {
  it('number tween: interpolates linearly and snaps to target at end', () => {
    const r = makeRegistry();
    const apply = vi.fn((v: unknown) => r.writes.push(v));
    r.registry.start('k', () => 0, apply, 10, anim());
    r.tick(500);
    expect(apply).toHaveBeenCalled();
    expect(r.writes.at(-1)).toBeCloseTo(5, 5);
    r.tick(500);
    expect(r.writes.at(-1)).toBe(10); // 精确到目标
    // 完成后不再推进
    const count = apply.mock.calls.length;
    r.tick(100);
    expect(apply.mock.calls.length).toBe(count);
  });

  it('easeOut reaches beyond linear midpoint at half duration', () => {
    const r = makeRegistry();
    const writes: number[] = [];
    r.registry.start('k', () => 0, (v) => writes.push(v as number), 10, anim({ easing: 'easeOut' }));
    r.tick(500);
    expect(writes.at(-1)!).toBeGreaterThan(5);
  });

  it('step holds the start value until duration elapses then snaps', () => {
    const r = makeRegistry();
    const writes: unknown[] = [];
    r.registry.start('k', () => 0, (v) => writes.push(v), 10, anim({ type: 'step', easing: 'linear' }));
    r.tick(600);
    expect(writes.at(-1)).toBe(0);
    r.tick(400);
    expect(writes.at(-1)).toBe(10);
  });

  it('spring converges monotonically toward the target and snaps', () => {
    const r = makeRegistry();
    const writes: number[] = [];
    r.registry.start('k', () => 0, (v) => writes.push(v as number), 10, anim({ type: 'spring' }));
    let previousGap = 10;
    let monotone = true;
    for (let i = 0; i < 20; i++) {
      r.tick(50);
      const current = writes.at(-1) as number;
      const gap = Math.abs(10 - current);
      if (gap > previousGap + 1e-9) monotone = false;
      previousGap = gap;
    }
    expect(monotone).toBe(true);
    expect(previousGap).toBeLessThan(0.5);
    r.tick(3000);
    expect(writes.at(-1)).toBe(10);
  });

  it('vec3 tween interpolates componentwise', () => {
    const r = makeRegistry();
    const writes: unknown[] = [];
    r.registry.start('k', () => [0, 0, 0], (v) => writes.push(v), [10, 20, 30], anim());
    r.tick(500);
    expect(writes.at(-1)).toEqual([5, 10, 15]);
  });

  it('color tween interpolates hex colors', () => {
    const r = makeRegistry();
    const writes: unknown[] = [];
    r.registry.start('k', () => '#000000', (v) => writes.push(v), '#ffffff', anim());
    r.tick(500);
    // three r152+ 默认色彩管理：hex 置入转线性空间、getHexString 回 sRGB，
    // 中点值非 808080（线性插值）——断言方向性与严格介于两端即可
    const mid = new THREE.Color(writes.at(-1) as string);
    expect(mid.getHex()).toBeGreaterThan(new THREE.Color('#000000').getHex());
    expect(mid.getHex()).toBeLessThan(new THREE.Color('#ffffff').getHex());
    r.tick(500);
    expect(new THREE.Color(writes.at(-1) as string).getHexString()).toBe('ffffff');
  });

  it('new target overrides in-flight tween starting from the current interpolated value', () => {
    const r = makeRegistry();
    const writes: number[] = [];
    r.registry.start('k', () => 0, (v) => writes.push(v as number), 10, anim());
    r.tick(500); // ~5
    r.registry.start('k', () => writes.at(-1) ?? 0, (v) => writes.push(v as number), 20, anim());
    r.tick(500);
    // 从 ~5 出发走一半 → ~12.5，而不是从 0 出发的 10 或 15
    expect(writes.at(-1)).toBeCloseTo(12.5, 1);
    r.tick(500);
    expect(writes.at(-1)).toBe(20);
  });

  it('unknown easing falls back to linear with a one-shot diagnostic', () => {
    const r = makeRegistry();
    const writes: number[] = [];
    r.registry.start('k', () => 0, (v) => writes.push(v as number), 10, anim({ easing: 'wobbly' }));
    expect(r.diagnostics.filter((d) => d.code === 'easing-unknown')).toHaveLength(1);
    r.tick(500);
    expect(writes.at(-1)).toBeCloseTo(5, 5);
  });

  it('non-tweenable values apply instantly without registration', () => {
    const r = makeRegistry();
    const apply = vi.fn();
    r.registry.start('k', () => 'label', apply, 'other-label', anim());
    expect(apply).toHaveBeenCalledWith('other-label');
    r.tick(100);
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it('clear removes all active tweens', () => {
    const r = makeRegistry();
    const apply = vi.fn();
    r.registry.start('k', () => 0, apply, 10, anim());
    r.registry.clear();
    r.tick(2000);
    expect(apply).not.toHaveBeenCalled();
  });
});

describe('TweenRegistry branch supplement (plan 466 coverage policy)', () => {
  it('zero-duration tween snaps on the first advance', () => {
    const r = makeRegistry();
    const writes: number[] = [];
    r.registry.start('k', () => 0, (v) => writes.push(v as number), 10, { type: 'tween', duration: 0 });
    r.tick(50);
    expect(writes.at(-1)).toBe(10);
  });

  it('default easing and duration apply when omitted', () => {
    const r = makeRegistry();
    const writes: number[] = [];
    r.registry.start('k', () => 0, (v) => writes.push(v as number), 10, { type: 'tween' });
    r.tick(150); // 默认 300ms 的中点 → 线性 5
    expect(writes.at(-1)).toBeCloseTo(5, 1);
    r.tick(150);
    expect(writes.at(-1)).toBe(10);
  });

  it('easeInOut covers both halves of the curve', () => {
    const r = makeRegistry();
    const writes: number[] = [];
    r.registry.start('k', () => 0, (v) => writes.push(v as number), 10, anim({ easing: 'easeInOut' }));
    r.tick(250);
    expect(writes.at(-1)).toBeLessThan(5);
    r.tick(500);
    expect(writes.at(-1)).toBeGreaterThan(5);
  });
});
