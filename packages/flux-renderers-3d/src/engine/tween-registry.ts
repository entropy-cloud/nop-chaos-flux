import * as THREE from 'three';
import type { BindingAnimationConfig } from '../schemas.js';

export type TweenValue = number | [number, number, number] | string;

export interface TweenRegistryOptions {
  now?: () => number;
  onError?: (code: string, message: string) => void;
}

type Apply = (value: unknown) => void;

interface ActiveTween {
  current: TweenValue;
  to: TweenValue;
  startedAt: number;
  apply: Apply;
  eased: (t: number) => number;
  duration: number;
  spring: boolean;
  step: boolean;
}

const EASINGS: Record<string, (t: number) => number> = {
  linear: (t) => t,
  easeIn: (t) => t * t * t,
  easeOut: (t) => 1 - Math.pow(1 - t, 3),
  easeInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};

const SPRING_OMEGA = 6; // rad/s，临界阻尼近似，~0.7s 收敛

/**
 * 绑定级过渡动画注册表（design-data-binding.md §1 transform.animation，I2.2）：
 * 每 `modelId::path` 单活跃 tween；值域 number / [x,y,z] / hex 颜色，其余值即时应用；
 * step 到期瞬移、tween easing 插值、spring 临界阻尼近似（单调收敛）；
 * 新目标从当前插值续走（覆盖式重启动，`current` 为最近一次写出值）。
 */
export class TweenRegistry {
  private tweens = new Map<string, ActiveTween>();
  private now: () => number;
  private reportedEasings = new Set<string>();

  constructor(private options: TweenRegistryOptions = {}) {
    this.now = options.now ?? (() => performance.now());
  }

  start(
    key: string,
    getCurrent: () => unknown,
    apply: Apply,
    target: unknown,
    config: BindingAnimationConfig,
  ): void {
    const to = target as TweenValue;
    const from = (this.tweens.get(key)?.current ?? getCurrent()) as TweenValue;
    if (!isTweenable(from) || !isTweenable(to) || typeof from !== typeof to) {
      apply(target);
      return;
    }
    const easingName = config.easing ?? 'linear';
    let eased = EASINGS[easingName];
    if (!eased) {
      if (!this.reportedEasings.has(easingName)) {
        this.reportedEasings.add(easingName);
        this.options.onError?.('easing-unknown', `Unknown easing '${easingName}', falling back to linear`);
      }
      eased = EASINGS.linear;
    }
    const entry: ActiveTween = {
      current: from,
      to,
      startedAt: this.now(),
      apply,
      eased,
      duration: Math.max(0, config.duration ?? 300),
      spring: config.type === 'spring',
      step: config.type === 'step',
    };
    entry.apply = (value) => {
      entry.current = value as TweenValue;
      apply(value);
    };
    this.tweens.set(key, entry);
  }

  /** 帧推进：到期即精确落目标并移除；spring 用临界阻尼近似。缺省用注入时钟。 */
  advance(now: number = this.now()): void {
    for (const [key, tween] of [...this.tweens]) {
      if (tween.spring) {
        const elapsed = (now - tween.startedAt) / 1000;
        const settle = 1 + elapsed * SPRING_OMEGA;
        const factor = Math.max(0, settle * Math.exp(-SPRING_OMEGA * elapsed));
        if (factor <= 1e-4) {
          tween.apply(tween.to);
          this.tweens.delete(key);
          continue;
        }
        tween.apply(lerp(tween.current, tween.to, 1 - factor));
        continue;
      }
      if (tween.duration === 0) {
        tween.apply(tween.to);
        this.tweens.delete(key);
        continue;
      }
      const raw = (now - tween.startedAt) / tween.duration;
      if (raw >= 1) {
        tween.apply(tween.to);
        this.tweens.delete(key);
        continue;
      }
      // step：保持起点值，到期帧瞬移
      if (tween.step) {
        tween.apply(tween.current);
        continue;
      }
      tween.apply(lerp(tween.current, tween.to, tween.eased(Math.max(0, raw))));
    }
  }

  /** 停止指定 key 的进行中 tween（即时写语义取代过渡）。 */
  stop(key: string): void {
    this.tweens.delete(key);
  }

  clear(): void {
    this.tweens.clear();
  }
}

function isTweenable(value: unknown): value is TweenValue {
  if (typeof value === 'number' && Number.isFinite(value)) return true;
  if (Array.isArray(value) && value.length === 3 && value.every((v) => typeof v === 'number')) return true;
  if (typeof value === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value)) return true;
  return false;
}

/** 可插值值域（number/三维向量/hex 颜色）的线性插值；KeyframeClip 复用。 */
export function lerpTweenable(from: TweenValue, to: TweenValue, t: number): TweenValue {
  return lerp(from, to, t);
}

function lerp(from: TweenValue, to: TweenValue, t: number): TweenValue {
  if (typeof from === 'number' && typeof to === 'number') return from + (to - from) * t;
  if (typeof from === 'string' && typeof to === 'string') {
    const a = new THREE.Color(from);
    const b = new THREE.Color(to);
    return `#${a.lerp(b, t).getHexString()}`;
  }
  const fa = from as [number, number, number];
  const fb = to as [number, number, number];
  return [fa[0] + (fb[0] - fa[0]) * t, fa[1] + (fb[1] - fa[1]) * t, fa[2] + (fb[2] - fa[2]) * t];
}
