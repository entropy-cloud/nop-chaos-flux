import { describe, expect, it } from 'vitest';
import { supportsPassiveEvents } from './supports-passive.js';

describe('supportsPassiveEvents', () => {
  it('returns a boolean and caches the probe result', () => {
    const first = supportsPassiveEvents();
    expect(typeof first).toBe('boolean');
    expect(supportsPassiveEvents()).toBe(first);
    expect(supportsPassiveEvents()).toBe(first);
  });
});
