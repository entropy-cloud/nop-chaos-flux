import type { ScadaAnimation, ScadaAnimationKind } from '../serialization/config-types.js';
import { EventHub, type Unsubscribe } from './point-store.js';
import type { CollectedEntry, FrameScheduler, TickScheduler } from './dirty-collector.js';

export interface AnimationStartStopEvent {
  symbolId: string;
  kind: ScadaAnimationKind;
}

export interface AnimatorEvents {
  'animation:start': (payload: AnimationStartStopEvent) => void;
  'animation:stop': (payload: AnimationStartStopEvent) => void;
}

export interface AnimatorOptions {
  /** 时钟（测试注入确定性时间源）。 */
  now?: () => number;
  /** 帧调度（rAF 对齐；测试注入手动调度器）。 */
  scheduleTick?: FrameScheduler;
  /** tick 限频（默认 30ms，meta2d animateInterval 蓝本）。 */
  interval?: number;
  /** 动画增量汇入帧内脏收集（合帧，禁止每帧全量重建）。 */
  collect?: (entry: CollectedEntry) => void;
  /** 帧尾批量写请求（绑定 pipeline.requestRender(applyAttrs)）。 */
  requestFrame?: () => void;
}

interface ActiveAnimation {
  animation: ScadaAnimation;
  kind: ScadaAnimationKind;
  runStartAt: number;
  elapsed: number;
  paused: boolean;
}

const DEFAULT_INTERVAL = 30;
const DEFAULT_ROTATE_PERIOD = 1000;
const DEFAULT_BLINK_PERIOD = 500;
const DEFAULT_FLOW_PERIOD = 1000;
const DEFAULT_MOVE_PERIOD = 1000;

function cycleOf(animation: ScadaAnimation): number {
  switch (animation.kind) {
    case 'rotate':
      return animation.period ?? DEFAULT_ROTATE_PERIOD;
    case 'blink':
      return animation.period ?? DEFAULT_BLINK_PERIOD;
    case 'flow':
      return animation.period ?? DEFAULT_FLOW_PERIOD;
    case 'move':
      return animation.period ?? DEFAULT_MOVE_PERIOD;
  }
}

interface Increment {
  property: string;
  value: unknown;
}

/**
 * 状态动画引擎（I6.3）：单一动画时钟（rAF 对齐 + 30ms 限频）、生命周期
 * start/stop/pause/resume/isPlaying、rotate/blink/flow/move 四类属性插值、
 * 动画增量汇入帧内脏收集（与点表刷新同一帧批量写收敛，A5 合帧义务）。
 */
export class Animator {
  private readonly playing = new Map<string, Map<ScadaAnimationKind, ActiveAnimation>>();
  private readonly events = new EventHub<AnimatorEvents>();
  private readonly now: () => number;
  private readonly scheduleTick: TickScheduler;
  private readonly interval: number;
  private clockScheduled = false;
  private cancelClock: (() => void) | undefined;
  private lastTickAt = Number.NEGATIVE_INFINITY;

  constructor(private readonly options: AnimatorOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.scheduleTick = options.scheduleTick ?? ((cb) => {
      const id = requestAnimationFrame(() => cb());
      return () => cancelAnimationFrame(id);
    });
    this.interval = options.interval ?? DEFAULT_INTERVAL;
  }

  start(symbolId: string, animation: ScadaAnimation): void {
    const byKind = this.byKindOf(symbolId, true);
    const existing = byKind.get(animation.kind);
    if (existing) {
      existing.animation = animation;
    } else {
      byKind.set(animation.kind, {
        animation,
        kind: animation.kind,
        runStartAt: this.now(),
        elapsed: 0,
        paused: false,
      });
      this.events.emit('animation:start', { symbolId, kind: animation.kind });
    }
    this.ensureClock();
  }

  stop(symbolId: string, kind?: ScadaAnimationKind): void {
    const byKind = this.playing.get(symbolId);
    if (!byKind) return;
    if (kind === undefined) {
      for (const active of [...byKind.values()]) {
        byKind.delete(active.kind);
        this.events.emit('animation:stop', { symbolId, kind: active.kind });
      }
      this.playing.delete(symbolId);
    } else {
      const active = byKind.get(kind);
      if (!active) return;
      byKind.delete(kind);
      if (byKind.size === 0) this.playing.delete(symbolId);
      this.events.emit('animation:stop', { symbolId, kind });
    }
    if (this.playing.size === 0) this.stopClock();
  }

  pause(symbolId: string, kind?: ScadaAnimationKind): void {
    for (const active of this.activesOf(symbolId, kind)) {
      if (active.paused) continue;
      active.elapsed += this.now() - active.runStartAt;
      active.paused = true;
    }
  }

  resume(symbolId: string, kind?: ScadaAnimationKind): void {
    for (const active of this.activesOf(symbolId, kind)) {
      if (!active.paused) continue;
      active.runStartAt = this.now();
      active.paused = false;
    }
    this.ensureClock();
  }

  isPlaying(symbolId: string, kind?: ScadaAnimationKind): boolean {
    const byKind = this.playing.get(symbolId);
    if (!byKind) return false;
    if (kind === undefined) return byKind.size > 0;
    return byKind.has(kind);
  }

  getActiveKinds(symbolId: string): ScadaAnimationKind[] {
    return [...(this.playing.get(symbolId)?.keys() ?? [])];
  }

  on(event: 'animation:start' | 'animation:stop', cb: (payload: AnimationStartStopEvent) => void): Unsubscribe {
    return this.events.on(event, cb);
  }

  destroy(): void {
    for (const [symbolId, byKind] of this.playing) {
      for (const kind of [...byKind.keys()]) {
        this.events.emit('animation:stop', { symbolId, kind });
      }
    }
    this.playing.clear();
    this.stopClock();
    this.events.removeAll();
  }

  private byKindOf(symbolId: string, create: true): Map<ScadaAnimationKind, ActiveAnimation>;
  private byKindOf(symbolId: string, create?: false): Map<ScadaAnimationKind, ActiveAnimation> | undefined;
  private byKindOf(
    symbolId: string,
    create?: boolean,
  ): Map<ScadaAnimationKind, ActiveAnimation> | undefined {
    let byKind = this.playing.get(symbolId);
    if (!byKind && create) {
      byKind = new Map<ScadaAnimationKind, ActiveAnimation>();
      this.playing.set(symbolId, byKind);
    }
    return byKind;
  }

  private activesOf(symbolId: string, kind?: ScadaAnimationKind): ActiveAnimation[] {
    const byKind = this.playing.get(symbolId);
    if (!byKind) return [];
    if (kind === undefined) return [...byKind.values()];
    const active = byKind.get(kind);
    return active ? [active] : [];
  }

  private ensureClock(): void {
    if (this.clockScheduled || this.playing.size === 0) return;
    this.clockScheduled = true;
    this.cancelClock = this.scheduleTick(() => {
      this.clockScheduled = false;
      this.cancelClock = undefined;
      this.tick();
    });
  }

  private stopClock(): void {
    this.cancelClock?.();
    this.cancelClock = undefined;
    this.clockScheduled = false;
    this.lastTickAt = Number.NEGATIVE_INFINITY;
  }

  private tick(): void {
    const now = this.now();
    if (now - this.lastTickAt < this.interval) {
      this.ensureClock();
      return;
    }
    this.lastTickAt = now;
    for (const [symbolId, byKind] of this.playing) {
      for (const [kind, active] of byKind) {
        const elapsed = this.elapsedOf(active, now);
        const cycle = cycleOf(active.animation);
        const loop = active.animation.loop ?? 0;
        if (loop > 0 && elapsed >= cycle * loop) {
          this.stop(symbolId, kind);
          continue;
        }
        const progress = cycle > 0 ? (elapsed % cycle) / cycle : 0;
        const increments = this.computeIncrements(active.animation, progress);
        for (const increment of increments) {
          this.options.collect?.({ symbolId, property: increment.property, value: increment.value });
        }
      }
    }
    if (this.playing.size > 0) {
      this.options.requestFrame?.();
      this.ensureClock();
    }
  }

  private elapsedOf(active: ActiveAnimation, now: number): number {
    return active.elapsed + (active.paused ? 0 : now - active.runStartAt);
  }

  private computeIncrements(animation: ScadaAnimation, progress: number): Increment[] {
    switch (animation.kind) {
      case 'rotate': {
        const from = typeof animation.from === 'number' ? animation.from : 0;
        const to = typeof animation.to === 'number' ? animation.to : 360;
        return [{ property: 'rotation', value: from + (to - from) * progress }];
      }
      case 'blink': {
        const on = progress < 0.5;
        if (typeof animation.from === 'number' || typeof animation.to === 'number') {
          const from = typeof animation.from === 'number' ? animation.from : 1;
          const to = typeof animation.to === 'number' ? animation.to : 0;
          return [{ property: 'opacity', value: on ? from : to }];
        }
        return [{ property: 'visible', value: on }];
      }
      case 'flow': {
        const from = typeof animation.from === 'number' ? animation.from : 0;
        const to = typeof animation.to === 'number' ? animation.to : 100;
        return [{ property: 'dashOffset', value: from + (to - from) * progress }];
      }
      case 'move': {
        const fromX = typeof animation.from === 'object' ? animation.from.x : 0;
        const fromY = typeof animation.from === 'object' ? animation.from.y : 0;
        const toX = typeof animation.to === 'object' ? animation.to.x : 100;
        const toY = typeof animation.to === 'object' ? animation.to.y : 0;
        return [
          { property: 'x', value: fromX + (toX - fromX) * progress },
          { property: 'y', value: fromY + (toY - fromY) * progress },
        ];
      }
    }
  }
}
