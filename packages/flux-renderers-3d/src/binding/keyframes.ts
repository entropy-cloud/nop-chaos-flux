import type { AnimationConfig } from '../schemas.js';
import { lerpTweenable, type TweenValue } from '../engine/tween-registry.js';

export type KeyframeErrorHandler = (code: string, message: string) => void;

const EASINGS: Record<string, (t: number) => number> = {
  linear: (t) => t,
  easeIn: (t) => t * t * t,
  easeOut: (t) => 1 - Math.pow(1 - t, 3),
  easeInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};

interface Segment {
  duration: number;
  from: TweenValue;
  to: TweenValue;
  eased: (t: number) => number;
}

/**
 * 关键帧 clip 播放器（design-data-binding.md §6，I2.2）：
 * time 数组按数组序播放（非单调不重排，零长段瞬时越过后一次性诊断 keyframes-degenerate）；
 * loop once/loop(count)/pingpong；逐段 easing（未知回退 linear + 一次性诊断 easing-unknown）；
 * state/event 触发由调用方在满足条件时调用 start()。
 */
export class KeyframeClip {
  private readonly segments: Segment[] = [];
  private readonly total: number;
  private readonly apply: (value: unknown) => void;
  private readonly now: () => number;
  private readonly onError?: KeyframeErrorHandler;
  private readonly reported = new Set<string>();
  private startedAt = 0;
  private readonly loopType: 'once' | 'loop' | 'pingpong';
  private readonly loopCount: number;
  private started = false;
  private done = false;

  readonly config: AnimationConfig;

  constructor(
    private configInput: AnimationConfig,
    options: { now?: () => number; apply: (value: unknown) => void; onError?: KeyframeErrorHandler },
  ) {
    this.config = configInput;
    this.apply = options.apply;
    this.now = options.now ?? (() => performance.now());
    this.onError = options.onError;
    this.loopType = configInput.loop?.type ?? 'once';
    this.loopCount = configInput.loop?.count ?? Infinity;
    const frames = configInput.keyframes;
    if (frames.length === 0) {
      this.total = 0;
      this.done = true;
      return;
    }
    if (frames.length === 1) {
      this.total = 0;
      return;
    }
    let nonMonotonic = false;
    let cursor = Math.max(0, frames[0].time);
    for (let i = 1; i < frames.length; i++) {
      const to = Math.max(0, frames[i].time);
      const delta = to - cursor;
      if (delta < 0) nonMonotonic = true;
      // 非单调（时间回退）按数组序播放，段时长取绝对差（不重排）
      const duration = Math.abs(delta);
      const eased = EASINGS[frames[i].easing ?? 'linear'];
      if (!eased && !this.reported.has('easing-unknown')) {
        this.reported.add('easing-unknown');
        this.onError?.('easing-unknown', `Unknown easing '${frames[i].easing}', falling back to linear`);
      }
      this.segments.push({
        duration,
        from: frames[i - 1].value as TweenValue,
        to: frames[i].value as TweenValue,
        eased: eased ?? EASINGS.linear,
      });
      cursor = Math.max(cursor, to);
    }
    this.total = this.segments.reduce((sum, seg) => sum + seg.duration, 0);
    if (nonMonotonic) {
      this.reported.add('keyframes-degenerate');
      this.onError?.('keyframes-degenerate', 'Non-monotonic keyframe times play in array order');
    }
    if (this.total === 0 && frames.length > 1) {
      this.reported.add('keyframes-degenerate');
      this.onError?.('keyframes-degenerate', 'Zero-length keyframe timeline');
    }
  }

  get finished(): boolean {
    return this.done;
  }

  /** state/event 触发入口；time 触发由引擎注册即调用。 */
  start(): void {
    if (this.started || this.done) return;
    this.started = true;
    this.startedAt = this.now();
  }

  /** 帧推进；返回是否仍在播放。 */
  advance(now: number): boolean {
    if (!this.started || this.done) return false;
    const frames = this.config.keyframes;
    if (frames.length === 1) {
      this.apply(frames[0].value);
      this.done = true;
      return false;
    }
    if (this.total === 0) {
      this.apply(frames[frames.length - 1].value);
      this.done = true;
      return false;
    }
    const elapsed = now - this.startedAt;
    if (this.loopType === 'once') {
      if (elapsed >= this.total) {
        this.apply(frames[frames.length - 1].value);
        this.done = true;
        return false;
      }
      this.applyAt(elapsed);
      return true;
    }
    if (this.loopType === 'loop') {
      if (Number.isFinite(this.loopCount) && elapsed >= this.total * this.loopCount) {
        this.apply(frames[frames.length - 1].value);
        this.done = true;
        return false;
      }
      this.applyAt(elapsed % this.total);
      return true;
    }
    // pingpong：前向 + 回程为一圈；count 有限时一圈数计满后停在首帧值
    const cycle = this.total * 2;
    if (Number.isFinite(this.loopCount) && elapsed >= cycle * this.loopCount) {
      this.apply(frames[0].value);
      this.done = true;
      return false;
    }
    const pingpongElapsed = elapsed % cycle;
    if (pingpongElapsed <= this.total) {
      this.applyAt(pingpongElapsed);
    } else {
      this.applyAt(cycle - pingpongElapsed);
    }
    return true;
  }

  private applyAt(localElapsed: number): void {
    let remaining = localElapsed;
    for (const segment of this.segments) {
      if (remaining <= segment.duration) {
        const t = segment.duration === 0 ? 1 : segment.eased(remaining / segment.duration);
        this.apply(lerpTweenable(segment.from, segment.to, t));
        return;
      }
      remaining -= segment.duration;
    }
    this.apply(this.config.keyframes[this.config.keyframes.length - 1].value);
  }

  /** 无限循环 clip 的停止入口（组件卸载/引擎 dispose）。 */
  stop(): void {
    this.done = true;
  }
}
