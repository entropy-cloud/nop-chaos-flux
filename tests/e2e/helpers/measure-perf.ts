import type { Page } from '@playwright/test';

export interface FpsResult {
  avgFps: number;
  minFps: number;
  totalFrames: number;
  durationMs: number;
}

export interface TimingResult {
  durationMs: number;
  label: string;
}

export async function measureFps(page: Page, durationMs: number): Promise<FpsResult> {
  return page.evaluate(async (duration) => {
    return new Promise((resolve) => {
      const timestamps: number[] = [];
      let rafId: number;

      const frame = (now: number) => {
        timestamps.push(now);
        if (now - timestamps[0] >= duration) {
          cancelAnimationFrame(rafId);
          const deltas: number[] = [];
          for (let i = 1; i < timestamps.length; i++) {
            deltas.push(timestamps[i] - timestamps[i - 1]);
          }
          const totalMs = timestamps[timestamps.length - 1] - timestamps[0];
          const avgFps = deltas.length > 0 ? (deltas.length / totalMs) * 1000 : 0;
          const minFps = deltas.length > 0
            ? Math.min(...deltas.map((d) => (d > 0 ? 1000 / d : Infinity)))
            : 0;
          resolve({
            avgFps: Math.round(avgFps * 10) / 10,
            minFps: Math.round(minFps * 10) / 10,
            totalFrames: timestamps.length,
            durationMs: totalMs,
          });
          return;
        }
        rafId = requestAnimationFrame(frame);
      };

      rafId = requestAnimationFrame(frame);
    });
  }, durationMs);
}

export async function measureTiming(page: Page, label: string): Promise<TimingResult> {
  return page.evaluate(async (lbl) => {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        const now = performance.now();
        resolve({ durationMs: Math.round(now * 10) / 10, label: lbl });
      });
    });
  }, label);
}
