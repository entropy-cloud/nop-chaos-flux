import { describe, expect, it } from 'vitest';
import { genId } from './id.js';

describe('genId (cq-2)', () => {
  it('uses the canonical `<ms>-<base36>` shape and is unique across rapid calls', () => {
    const id = genId();
    expect(id).toMatch(/^\d+-[a-z0-9]{7}$/);
    const seen = new Set(Array.from({ length: 2000 }, () => genId()));
    expect(seen.size).toBe(2000);
  });

  it('stamps the current epoch time as the numeric prefix (within a sane window)', () => {
    const before = Date.now();
    const id = genId();
    const after = Date.now();
    const stamped = Number(id.slice(0, id.indexOf('-')));
    expect(stamped).toBeGreaterThanOrEqual(before);
    expect(stamped).toBeLessThanOrEqual(after);
  });

  it('never emits empty or malformed suffixes across a longer burst', () => {
    for (let i = 0; i < 500; i += 1) {
      const id = genId();
      const suffix = id.slice(id.indexOf('-') + 1);
      expect(suffix).toMatch(/^[a-z0-9]{7}$/);
      expect(suffix).not.toContain('-');
    }
  });
});
