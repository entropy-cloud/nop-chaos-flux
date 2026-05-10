import { describe, expect, it } from 'vitest';
import { shallowEqual, shallowEqualRecords } from './object.js';
import { getIn, setIn, parsePath } from './path.js';
import { moveArrayValue, swapArrayValue, removeArrayValue, insertArrayValue } from './array.js';

describe('shallowEqual edge cases', () => {
  it('ignores inherited properties', () => {
    const proto = { inherited: 1 };
    const a = Object.create(proto);
    a.own = 2;
    const b = { own: 2 };
    expect(shallowEqual(a, b)).toBe(true);
  });

  it('sees own enumerable only via Object.keys', () => {
    const a = Object.create({}, { hidden: { value: 1, enumerable: false } });
    a.visible = 2;
    const b = { visible: 2 };
    expect(shallowEqual(a, b)).toBe(true);
  });

  it('handles NaN in arrays', () => {
    expect(shallowEqual([NaN], [NaN])).toBe(true);
  });

  it('handles sparse-like arrays with undefined', () => {
    expect(shallowEqual([undefined], [undefined])).toBe(true);
  });
});

describe('shallowEqualRecords edge cases', () => {
  it('only checks own keys from left side', () => {
    const a = { x: 1 };
    const b = { x: 1, y: 2 };
    expect(shallowEqualRecords(a, b)).toBe(false);
  });

  it('returns true for symbol-keyed properties being absent', () => {
    const a = { x: 1 };
    const b = { x: 1 };
    (a as any)[Symbol.for('test')] = 'sym';
    expect(shallowEqualRecords(a, b)).toBe(true);
  });
});

describe('setIn array creation edge cases', () => {
  it('creates array when next segment looks numeric', () => {
    const result = setIn({}, 'list.0', 'first');
    expect(Array.isArray(result.list)).toBe(true);
    expect(result.list[0]).toBe('first');
  });

  it('overwrites existing non-object intermediate value', () => {
    const input = { a: 'string' };
    const result = setIn(input, 'a.b', 'value');
    expect(result.a).toEqual({ b: 'value' });
  });

  it('sets value on deeply nested new path', () => {
    const result = setIn({}, 'a.b.c.d.e', 99);
    expect(result.a.b.c.d.e).toBe(99);
  });
});

describe('getIn array edge cases', () => {
  it('accesses array element by numeric string key', () => {
    expect(getIn(['a', 'b', 'c'], '1')).toBe('b');
  });

  it('returns undefined for non-numeric key on array', () => {
    expect(getIn([1, 2, 3], 'foo')).toBeUndefined();
  });

  it('can access array.length via path "length"', () => {
    expect(getIn([1, 2, 3], 'length')).toBe(3);
  });

  it('does not access Function properties on array', () => {
    expect(getIn([], 'push')).toBe(Array.prototype.push);
  });
});

describe('parsePath edge cases', () => {
  it('handles deeply nested bracket notation', () => {
    expect(parsePath('a[0][1][2]')).toEqual(['a', '0', '1', '2']);
  });

  it('handles mixed dots and brackets', () => {
    expect(parsePath('a.b[0].c')).toEqual(['a', 'b', '0', 'c']);
  });

  it('handles bracket at start', () => {
    expect(parsePath('[0].name')).toEqual(['0', 'name']);
  });

  it('handles multi-digit bracket indices', () => {
    expect(parsePath('items[123]')).toEqual(['items', '123']);
  });

  it('does not parse non-numeric brackets', () => {
    expect(parsePath('items[abc]')).toEqual(['items[abc]']);
  });

  it('handles path that is just brackets', () => {
    expect(parsePath('[0]')).toEqual(['0']);
  });
});

describe('array operations: move semantics', () => {
  it('moveArrayValue with both indices clamped to same is no-op', () => {
    const arr = ['a', 'b'];
    expect(moveArrayValue(arr, -5, -5)).toEqual(['a', 'b']);
  });

  it('moveArrayValue to same position after clamping is no-op', () => {
    const arr = ['a', 'b', 'c'];
    const result = moveArrayValue(arr, 1, 1);
    expect(result).toEqual(['a', 'b', 'c']);
    expect(result).not.toBe(arr);
  });
});

describe('array operations: swap semantics', () => {
  it('swapArrayValue with both indices clamped to same is no-op', () => {
    const arr = ['a', 'b'];
    expect(swapArrayValue(arr, -5, -5)).toEqual(['a', 'b']);
  });

  it('swapArrayValue returns new array even for same element', () => {
    const arr = ['a', 'b'];
    const result = swapArrayValue(arr, 0, 0);
    expect(result).toEqual(['a', 'b']);
    expect(result).not.toBe(arr);
  });
});

describe('array operations: remove on single element', () => {
  it('removeArrayValue on single-element always produces empty', () => {
    expect(removeArrayValue(['x'], 0)).toEqual([]);
    expect(removeArrayValue(['x'], -1)).toEqual([]);
    expect(removeArrayValue(['x'], 99)).toEqual([]);
  });
});

describe('insertArrayValue immutability', () => {
  it('returns new array even when appending at end', () => {
    const arr = ['a'];
    const result = insertArrayValue(arr, 1, 'b');
    expect(result).toEqual(['a', 'b']);
    expect(result).not.toBe(arr);
    expect(arr).toEqual(['a']);
  });
});
