import { describe, expect, it } from 'vitest';
import { appendToJsonPointer, getIn, parsePath, setIn, toJsonPointer } from './path.js';

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

describe('toJsonPointer / appendToJsonPointer (cq-2)', () => {
  it('converts a dot path to an escaped JSON pointer, dropping the $ root', () => {
    expect(toJsonPointer('$.table.columns', '0', 'editable')).toBe('/table/columns/0/editable');
    expect(toJsonPointer('$.user.name')).toBe('/user/name');
    expect(toJsonPointer('$.a/b', 'c~d')).toBe('/a~1b/c~0d');
    expect(toJsonPointer('list[0].name', 'x')).toBe('/list/0/name/x');
  });

  it('returns an empty pointer for a bare root path with no extra segments', () => {
    expect(toJsonPointer('$')).toBe('');
    expect(toJsonPointer('')).toBe('');
  });

  it('appends raw segments to an already pointer-shaped path without escaping the path', () => {
    expect(appendToJsonPointer('/echarts/option', 'series', 0)).toBe('/echarts/option/series/0');
    expect(appendToJsonPointer('', 'option')).toBe('/option');
  });
});
