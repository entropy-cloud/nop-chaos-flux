import { quartEaseOut } from './gesture-math.js';

export interface MomentumAnimationOptions {
  from: number;
  to: number;
  duration: number;
  onUpdate: (value: number) => void;
  onComplete?: () => void;
}

/**
 * Interruptible rAF interpolator following the TDesign picker路线
 * (quartEaseOut manual frames, no CSS transition) so schema-driven
 * consumers can stopMomentum at any time (M6a).
 *
 * In environments without requestAnimationFrame (SSR, old jsdom), start()
 * degrades to a synchronous jump to `to`.
 */
export class MomentumAnimator {
  private frame: number | null = null;
  private startValue = 0;
  private delta = 0;
  private duration = 0;
  private startTime = -1;
  private updateCallback: ((value: number) => void) | null = null;
  private completeCallback: (() => void) | null = null;

  get running(): boolean {
    return this.frame !== null;
  }

  start(options: MomentumAnimationOptions): void {
    this.stop();
    this.startValue = options.from;
    this.delta = options.to - options.from;
    this.duration = Math.max(0, options.duration);
    this.updateCallback = options.onUpdate;
    this.completeCallback = options.onComplete ?? null;

    if (typeof requestAnimationFrame !== 'function') {
      this.frame = null;
      options.onUpdate(options.to);
      options.onComplete?.();
      return;
    }

    const step = (now: number) => {
      if (this.startTime < 0) this.startTime = now;
      const t = this.duration === 0 ? 1 : (now - this.startTime) / this.duration;
      this.updateCallback?.(this.startValue + this.delta * quartEaseOut(t));
      if (t >= 1) {
        this.frame = null;
        this.completeCallback?.();
        return;
      }
      this.frame = requestAnimationFrame(step);
    };

    this.startTime = -1;
    this.frame = requestAnimationFrame(step);
  }

  stop(): void {
    if (this.frame !== null) {
      cancelAnimationFrame(this.frame);
      this.frame = null;
    }
  }
}
