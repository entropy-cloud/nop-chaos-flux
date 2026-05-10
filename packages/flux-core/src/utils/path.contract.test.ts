import { describe, expect, it } from 'vitest';
import { getIn, normalizeRootPath, normalizeRootPaths, parsePath, setIn } from './path.js';

describe('parsePath contract', () => {
  it('returns empty array for empty string', () => {
    expect(parsePath('')).toEqual([]);
  });

  it('trims whitespace around segments', () => {
    expect(parsePath(' a . b ')).toEqual(['a', 'b']);
  });

  it('filters empty segments from consecutive dots', () => {
    expect(parsePath('a..b')).toEqual(['a', 'b']);
  });

  it('parses bracket notation into dot segments', () => {
    expect(parsePath('items[2].name')).toEqual(['items', '2', 'name']);
  });

  it('parses nested bracket notation', () => {
    expect(parsePath('a[0][1]')).toEqual(['a', '0', '1']);
  });

  it('handles single key', () => {
    expect(parsePath('name')).toEqual(['name']);
  });

  it('handles numeric-only path', () => {
    expect(parsePath('0.1.2')).toEqual(['0', '1', '2']);
  });

  it('handles dot-only path', () => {
    expect(parsePath('.')).toEqual([]);
  });

  it('handles trailing dot', () => {
    expect(parsePath('a.')).toEqual(['a']);
  });

  it('handles leading dot', () => {
    expect(parsePath('.a')).toEqual(['a']);
  });
});

describe('getIn contract', () => {
  it('returns root for empty path', () => {
    expect(getIn({ a: 1 }, '')).toEqual({ a: 1 });
  });

  it('returns undefined for null root', () => {
    expect(getIn(null, 'a')).toBeUndefined();
  });

  it('returns undefined for undefined root', () => {
    expect(getIn(undefined, 'a')).toBeUndefined();
  });

  it('returns undefined for number root', () => {
    expect(getIn(42, 'a')).toBeUndefined();
  });

  it('returns undefined for string root', () => {
    expect(getIn('hello', 'length')).toBeUndefined();
  });

  it('returns value at shallow path', () => {
    expect(getIn({ a: 1 }, 'a')).toBe(1);
  });

  it('returns value at deep path', () => {
    expect(getIn({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42);
  });

  it('returns undefined for missing key', () => {
    expect(getIn({ a: 1 }, 'b')).toBeUndefined();
  });

  it('returns undefined for path exceeding structure', () => {
    expect(getIn({ a: 1 }, 'a.b.c')).toBeUndefined();
  });

  it('reads array index via bracket notation', () => {
    expect(getIn({ items: ['x', 'y'] }, 'items[1]')).toBe('y');
  });

  it('reads array index beyond bounds as undefined', () => {
    expect(getIn({ items: [1] }, 'items[5]')).toBeUndefined();
  });

  it('returns undefined for __proto__', () => {
    expect(getIn({}, '__proto__')).toBeUndefined();
  });

  it('returns undefined for constructor', () => {
    expect(getIn({}, 'constructor')).toBeUndefined();
  });

  it('returns undefined for prototype', () => {
    expect(getIn({}, 'prototype')).toBeUndefined();
  });

  it('handles unicode keys', () => {
    expect(getIn({ 名前: '太郎' }, '名前')).toBe('太郎');
  });

  it('handles keys with spaces after trim', () => {
    expect(getIn({ 'a b': 1 }, 'a b')).toBe(1);
  });

  it('does not access array length via path', () => {
    expect(getIn([1, 2, 3], 'length')).toBe(3);
  });
});

describe('setIn contract', () => {
  it('returns value as object for empty path when value is plain object', () => {
    const result = setIn({}, '', { x: 1 });
    expect(result).toEqual({ x: 1 });
  });

  it('returns input for empty path when value is not a plain object', () => {
    const input = { a: 1 };
    const result = setIn(input, '', 42);
    expect(result).toBe(input);
  });

  it('sets shallow value immutably', () => {
    const input = { a: 1 };
    const result = setIn(input, 'b', 2);
    expect(result).toEqual({ a: 1, b: 2 });
    expect(result).not.toBe(input);
  });

  it('sets deep value creating intermediate objects', () => {
    const result = setIn({}, 'a.b.c', 42);
    expect(result).toEqual({ a: { b: { c: 42 } } });
  });

  it('creates intermediate arrays when next segment is numeric', () => {
    const result = setIn({}, 'items[0].name', 'first');
    expect(result).toEqual({ items: [{ name: 'first' }] });
  });

  it('does not mutate original object', () => {
    const input = { a: { b: 1 } };
    setIn(input, 'a.b', 2);
    expect(input.a.b).toBe(1);
  });

  it('does not mutate sibling keys', () => {
    const input = { a: { b: 1, c: 2 } };
    const result = setIn(input, 'a.b', 99);
    expect(result.a.c).toBe(2);
    expect(input.a.c).toBe(2);
  });

  it('throws for __proto__ segment', () => {
    expect(() => setIn({}, '__proto__.polluted', true)).toThrow(/not allowed/);
  });

  it('throws for constructor segment', () => {
    expect(() => setIn({}, 'constructor', class {})).toThrow(/not allowed/);
  });

  it('throws for prototype segment', () => {
    expect(() => setIn({}, 'a.prototype.b', 1)).toThrow(/not allowed/);
  });

  it('works with array root', () => {
    const result = setIn([1, 2, 3], '1', 99);
    expect(result).toEqual([1, 99, 3]);
  });

  it('overwrites existing value', () => {
    const result = setIn({ a: 1 }, 'a', 2);
    expect(result).toEqual({ a: 2 });
  });

  it('handles unicode keys', () => {
    const result = setIn({}, '名前', '太郎');
    expect(result).toEqual({ 名前: '太郎' });
  });

  it('preserves array structure when setting nested', () => {
    const input = { items: [{ x: 1 }, { x: 2 }] };
    const result = setIn(input, 'items.0.x', 99);
    expect(result.items[1].x).toBe(2);
    expect(result.items[0].x).toBe(99);
  });
});

describe('normalizeRootPath contract', () => {
  it('returns undefined for empty string', () => {
    expect(normalizeRootPath('')).toBeUndefined();
  });

  it('returns * for wildcard', () => {
    expect(normalizeRootPath('*')).toBe('*');
  });

  it('returns first segment', () => {
    expect(normalizeRootPath('a.b.c')).toBe('a');
  });

  it('returns single key', () => {
    expect(normalizeRootPath('name')).toBe('name');
  });
});

describe('normalizeRootPaths contract', () => {
  it('returns empty for empty input', () => {
    expect(normalizeRootPaths([])).toEqual([]);
  });

  it('deduplicates roots', () => {
    expect(normalizeRootPaths(['a.b', 'a.c', 'd'])).toEqual(['a', 'd']);
  });

  it('returns wildcard when present', () => {
    expect(normalizeRootPaths(['a.b', '*'])).toEqual(['*']);
  });

  it('sorts roots', () => {
    expect(normalizeRootPaths(['c.a', 'b.x', 'a.y'])).toEqual(['a', 'b', 'c']);
  });
});
