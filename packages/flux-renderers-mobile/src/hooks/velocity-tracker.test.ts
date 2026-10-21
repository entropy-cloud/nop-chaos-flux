import { describe, expect, it } from 'vitest';
import {
  FLICK_VELOCITY_THRESHOLD,
  VELOCITY_WINDOW_MS,
  VelocityTracker,
} from './velocity-tracker.js';

describe('VelocityTracker', () => {
  it('exposes the documented sampling window and flick threshold', () => {
    expect(VELOCITY_WINDOW_MS).toBe(170);
    expect(FLICK_VELOCITY_THRESHOLD).toBe(0.1);
  });

  it('reports zero velocity before any sample', () => {
    const tracker = new VelocityTracker();
    expect(tracker.velocityX).toBe(0);
    expect(tracker.velocityY).toBe(0);
    expect(tracker.isFlick()).toBe(false);
  });

  it('reports zero velocity for a single sample', () => {
    const tracker = new VelocityTracker();
    tracker.add(100, 50, 1000);
    expect(tracker.velocityX).toBe(0);
    expect(tracker.velocityY).toBe(0);
  });

  it('computes signed px/ms velocity across samples', () => {
    const tracker = new VelocityTracker();
    tracker.add(0, 0, 1000);
    tracker.add(100, -40, 1050);
    expect(tracker.velocityX).toBeCloseTo(2, 6);
    expect(tracker.velocityY).toBeCloseTo(-0.8, 6);
  });

  it('drops samples older than the 170ms window (slow early motion ignored)', () => {
    const tracker = new VelocityTracker();
    tracker.add(0, 0, 0);
    tracker.add(10, 0, 100);
    tracker.add(30, 0, 200);
    // t=0 was dropped (cutoff 30): velocity from the t=100..200 pair
    expect(tracker.velocityX).toBeCloseTo(0.2, 6);
  });

  it('decays to zero after stillness longer than the window', () => {
    const tracker = new VelocityTracker();
    tracker.add(0, 0, 0);
    tracker.add(60, 0, 50);
    tracker.add(60.5, 0, 500);
    // only the t=500 sample survives its own window -> single sample -> 0
    expect(tracker.velocityX).toBe(0);
    expect(tracker.isFlick()).toBe(false);
  });

  it('returns 0 when the sample interval is below 1ms (degenerate dt)', () => {
    const tracker = new VelocityTracker();
    tracker.add(0, 0, 1000);
    tracker.add(5, 5, 1000.5);
    expect(tracker.velocityX).toBe(0);
    expect(tracker.velocityY).toBe(0);
  });

  it('returns 0 when time goes backwards (monotonic guard)', () => {
    const tracker = new VelocityTracker();
    tracker.add(0, 0, 100);
    tracker.add(50, 0, 50);
    expect(tracker.velocityX).toBe(0);
  });

  it('classifies flicks against the 0.1 px/ms threshold', () => {
    const fast = new VelocityTracker();
    fast.add(0, 0, 0);
    fast.add(30, 0, 100); // 0.3 px/ms
    expect(fast.isFlick()).toBe(true);

    const slow = new VelocityTracker();
    slow.add(0, 0, 0);
    slow.add(5, 0, 100); // 0.05 px/ms
    expect(slow.isFlick()).toBe(false);
    expect(FLICK_VELOCITY_THRESHOLD).toBe(0.1);
  });

  it('resets to the empty state', () => {
    const tracker = new VelocityTracker();
    tracker.add(0, 0, 0);
    tracker.add(100, 0, 50);
    tracker.reset();
    expect(tracker.velocityX).toBe(0);
    expect(tracker.velocityY).toBe(0);
  });

  it('skips samples with non-finite timestamps instead of poisoning NaN velocities', () => {
    const tracker = new VelocityTracker();
    tracker.add(0, 0, Number.NaN);
    tracker.add(50, 0, undefined as unknown as number);
    expect(tracker.velocityX).toBe(0);
    const good = new VelocityTracker();
    good.add(0, 0, Number.NaN);
    good.add(40, 0, 100);
    // the NaN sample is dropped; the good sample becomes the single baseline
    expect(good.velocityX).toBe(0);
    good.add(80, 0, 150);
    expect(good.velocityX).toBeCloseTo(0.8, 6);
  });
});
