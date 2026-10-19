/**
 * Embla DragTracker-style velocity sampling (M6a).
 *
 * Keeps a sliding window of touch samples; velocity is computed from the
 * oldest sample still inside the window to the newest, in px/ms with sign.
 * Samples older than the window are dropped, so a finger that pauses longer
 * than the window decays to 0 velocity and cannot trigger a flick from
 * stale motion ("防长按慢拖误飞").
 */

export const VELOCITY_WINDOW_MS = 170;
export const FLICK_VELOCITY_THRESHOLD = 0.1;

// Internal sample shape (knip: consumers read velocityX/velocityY only).
interface VelocitySample {
  x: number;
  y: number;
  time: number;
}

export class VelocityTracker {
  private samples: VelocitySample[] = [];

  constructor(private readonly windowMs: number = VELOCITY_WINDOW_MS) {}

  reset(): void {
    this.samples = [];
  }

  add(x: number, y: number, time: number): void {
    // Synthetic events (fireEvent-based tests, some frameworks) may carry a
    // missing/non-finite timeStamp; a NaN dt would poison every decision
    // downstream with NaN velocities, so such samples are skipped entirely.
    if (!Number.isFinite(time)) return;
    this.samples.push({ x, y, time });
    const cutoff = time - this.windowMs;
    this.samples = this.samples.filter((sample) => sample.time >= cutoff);
  }

  get velocityX(): number {
    return this.axisVelocity((sample) => sample.x);
  }

  get velocityY(): number {
    return this.axisVelocity((sample) => sample.y);
  }

  /** A flick is any axis whose |velocity| clears the threshold (px/ms). */
  isFlick(threshold: number = FLICK_VELOCITY_THRESHOLD): boolean {
    return (
      Math.abs(this.velocityX) >= threshold || Math.abs(this.velocityY) >= threshold
    );
  }

  private axisVelocity(pick: (sample: VelocitySample) => number): number {
    const { samples } = this;
    if (samples.length === 0) return 0;
    const oldest = samples[0];
    const newest = samples[samples.length - 1];
    const dt = newest.time - oldest.time;
    if (dt < 1) return 0;
    return (pick(newest) - pick(oldest)) / dt;
  }
}
