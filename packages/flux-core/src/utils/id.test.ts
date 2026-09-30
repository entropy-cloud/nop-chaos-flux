import { describe, expect, it } from 'vitest';
import { genId } from './id.js';

describe('genId (cq-2)', () => {
  it('uses the canonical `<ms>-<base36>` shape and is unique across rapid calls', () => {
    const id = genId();
    expect(id).toMatch(/^\d+-[a-z0-9]{7}$/);
    const seen = new Set(Array.from({ length: 2000 }, () => genId()));
    expect(seen.size).toBe(2000);
  });
});
