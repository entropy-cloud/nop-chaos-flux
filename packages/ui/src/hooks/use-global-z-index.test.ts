import { afterEach, describe, expect, it } from 'vitest';
import {
  GLOBAL_Z_INDEX_BASELINE_VALUE,
  nextGlobalZIndex,
  peekGlobalZIndex,
  setGlobalZIndex,
} from './use-global-z-index.js';

const BASELINE = GLOBAL_Z_INDEX_BASELINE_VALUE;

describe('global z-index counter (M0.1d)', () => {
  afterEach(() => {
    setGlobalZIndex(BASELINE);
  });

  it('starts at the documented baseline (2000, aligned with Vant)', () => {
    setGlobalZIndex(BASELINE);
    expect(BASELINE).toBe(2000);
    expect(peekGlobalZIndex()).toBe(2000);
  });

  it('nextGlobalZIndex returns the current value and increments', () => {
    setGlobalZIndex(BASELINE);
    expect(nextGlobalZIndex()).toBe(2000);
    expect(nextGlobalZIndex()).toBe(2001);
    expect(nextGlobalZIndex()).toBe(2002);
    expect(peekGlobalZIndex()).toBe(2003);
  });

  it('setGlobalZIndex resets the counter to any value (test-only)', () => {
    setGlobalZIndex(5000);
    expect(peekGlobalZIndex()).toBe(5000);
    expect(nextGlobalZIndex()).toBe(5000);
    expect(nextGlobalZIndex()).toBe(5001);
  });

  it('concurrent callers never receive the same value (monotonic uniqueness)', () => {
    setGlobalZIndex(BASELINE);
    const seen = new Set<number>();
    for (let i = 0; i < 100; i++) {
      seen.add(nextGlobalZIndex());
    }
    expect(seen.size).toBe(100);
  });

  it('values stay above the legacy flat z-50 band', () => {
    setGlobalZIndex(BASELINE);
    const v = nextGlobalZIndex();
    expect(v).toBeGreaterThan(50);
  });
});
