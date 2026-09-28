import { describe, expect, it } from 'vitest';
import { parsePath, resolveRelativePath } from '../path.js';

// plan 2026-09-28-6 Phase 1 — P14 parsePath baseline. Current behavior: cache
// hits return a defensive copy ([...cached]) and resolveRelativePath mutates
// its parsed segments via pop(). The copy-elision fix must keep values equal
// and must only land after the mutation surface audit (resolveRelativePath).

describe('parsePath baseline (plan 2026-09-28-6 P14)', () => {
  it('returns equal-value segments for repeated parses', () => {
    const first = parsePath('user.profile.name');
    const second = parsePath('user.profile.name');

    expect(first).toEqual(['user', 'profile', 'name']);
    expect(second).toEqual(first);
  });

  it('cache hits share the cached array identity (P14 copy elision, audit-backed)', () => {
    const first = parsePath('a.b.c');
    const second = parsePath('a.b.c');

    // P14 landed: cache hits share the stored array (mutation-surface audit
    // verified the only mutator was resolveRelativePath, now non-mutating)
    expect(first).toBe(second);
  });

  it('resolveRelativePath consumes relative segments without mutating shared cache entries', () => {
    parsePath('a.b.c');
    const shared = parsePath('a.b');
    const resolved = resolveRelativePath('a.b', '../c');

    expect(resolved).toBe('a.c');
    // non-mutating rewrite: the shared array must be untouched after the
    // upward walk (it previously popped segments from its own copy)
    expect(shared).toEqual(['a', 'b']);
    expect(parsePath('a.b')).toBe(shared);
  });

  it('handles bracket and dotted forms', () => {
    expect(parsePath('items[0].id')).toEqual(['items', '0', 'id']);
    expect(parsePath('')).toEqual([]);
  });
});
