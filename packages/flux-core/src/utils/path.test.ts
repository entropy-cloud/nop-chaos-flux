import { describe, expect, it } from 'vitest';
import { getIn, parsePath, setIn } from './path.js';

describe('path utils', () => {
  it('parses bracket indexes without changing path semantics', () => {
    expect(parsePath('list[0].name')).toEqual(['list', '0', 'name']);
  });

  // plan 2026-09-28-6 P14: cache hits deliberately SHARE the cached array
  // (copy elision on the hot path). The mutation-surface audit found exactly
  // one mutator (resolveRelativePath), rewritten to non-mutating form — see
  // the parse-path-baseline.test.ts companion file.
  it('returns equal segments for repeated cached paths sharing the cached array', () => {
    const first = parsePath('user.profile.name');
    const second = parsePath('user.profile.name');

    expect(second).toEqual(first);
    expect(second).toBe(first);
  });

  // plan 2026-09-28-6 P14: the returned array is the shared cache entry —
  // callers MUST NOT mutate it (the audit-verified non-mutating contract).
  // getIn/setIn below still pass through the shared parse without copying.
  it('treats returned parse results as shared read-only cache entries', () => {
    const first = parsePath('user.profile.name');
    expect(first).toEqual(['user', 'profile', 'name']);
    // getIn/setIn consume the shared array without mutating it
    expect(getIn({ user: { profile: { name: 'Alice' } } }, 'user.profile.name')).toBe('Alice');
    expect(parsePath('user.profile.name')).toEqual(['user', 'profile', 'name']);
  });

  it('keeps getIn semantics intact with cached parse results', () => {
    expect(getIn({ user: { profile: { name: 'Alice' } } }, 'user.profile.name')).toBe('Alice');
  });

  it('keeps setIn semantics intact with cached parse results', () => {
    expect(setIn({}, 'user.profile.name', 'Alice')).toEqual({
      user: {
        profile: {
          name: 'Alice',
        },
      },
    });
  });

  it('getIn returns undefined for dangerous path segments', () => {
    const obj = { safe: { value: 1 } };
    expect(getIn(obj, '__proto__')).toBeUndefined();
    expect(getIn(obj, 'safe.constructor')).toBeUndefined();
    expect(getIn(obj, 'prototype')).toBeUndefined();
  });

  it('setIn throws for dangerous path segments', () => {
    const obj = { safe: 1 };
    expect(() => setIn(obj, '__proto__', {})).toThrow(/not allowed/);
    expect(() => setIn(obj, 'constructor', {})).toThrow(/not allowed/);
    expect(() => setIn(obj, 'a.prototype.b', 1)).toThrow(/not allowed/);
    // Verify Object.prototype was not polluted
    expect((Object.prototype as any).polluted).toBeUndefined();
  });
});
