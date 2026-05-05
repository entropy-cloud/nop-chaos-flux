import { describe, expect, it } from 'vitest';
import { createFormulaCompiler, createFormulaRegistry } from './index';
import { customEquals } from './builtins';

describe('builtins', () => {
  function createBuiltinsSnapshot() {
    const registry = createFormulaRegistry();
    createFormulaCompiler(registry);
    return registry.getSnapshot();
  }

  it('installs v1 namespaces and eager builtins', () => {
    const snapshot = createBuiltinsSnapshot();

    expect((snapshot.namespaces.$Math as typeof Math).max(1, 4, 2)).toBe(4);
    expect((snapshot.namespaces.$JSON as typeof JSON).stringify({ ok: true })).toBe('{"ok":true}');
    expect(typeof (snapshot.namespaces.$Date as { now(): Date }).now()).toBe('object');

    expect(snapshot.functions.SUM(1, [2, 'x'], 3)).toBe(6);
    expect(snapshot.functions.AVG()).toBe(0);
    expect(snapshot.functions.AVG(2, 4, 6)).toBe(4);
    expect(snapshot.functions.COUNT([1, 2, 3])).toBe(3);
    expect(snapshot.functions.ARRAYMAP([1, 2], (value: number) => value * 2)).toEqual([2, 4]);
    expect(snapshot.functions.ARRAYFILTER([1, 2, 3], (value: number) => value > 1)).toEqual([2, 3]);
    expect(snapshot.functions.ARRAYFIND([1, 2, 3], (value: number) => value === 2)).toBe(2);
    expect(snapshot.functions.ARRAYFINDINDEX([1, 2, 3], (value: number) => value === 3)).toBe(2);
    expect(snapshot.functions.ARRAYSOME([1, 2, 3], (value: number) => value === 2)).toBe(true);
    expect(snapshot.functions.ARRAYEVERY([1, 2, 3], (value: number) => value > 0)).toBe(true);
    expect(snapshot.functions.ARRAYINCLUDES([1, 2, 3], 2)).toBe(true);
    expect(snapshot.functions.CONCAT([1], [2], 3)).toEqual([1, 2, 3]);
    expect(snapshot.functions.UNIQ([1, 1, 2])).toEqual([1, 2]);
    expect(snapshot.functions.COMPACT([0, 1, false, 2, null])).toEqual([1, 2]);
    expect(snapshot.functions.LEN(null)).toBe(0);
    expect(snapshot.functions.CONCATENATE('A', 1, null)).toBe('A1');
    expect(snapshot.functions.TRIM('  hi  ')).toBe('hi');
    expect(snapshot.functions.UPPER('hi')).toBe('HI');
    expect(snapshot.functions.LOWER('HI')).toBe('hi');
    expect(snapshot.functions.REPLACE('a-b-a', 'a', 'x')).toBe('x-b-x');
    expect(snapshot.functions.SPLIT('a,b', ',')).toEqual(['a', 'b']);
    expect(snapshot.functions.JOIN(['a', 'b'])).toBe('a,b');
    expect(snapshot.functions.CONTAINS('abc', 'b')).toBe(true);
    expect(snapshot.functions.ISEMPTY(null)).toBe(true);
    expect(snapshot.functions.ISEMPTY('')).toBe(true);
    expect(snapshot.functions.ISEMPTY([])).toBe(true);
    expect(snapshot.functions.ISEMPTY({ ok: true })).toBe(false);
    expect(snapshot.functions.INT(1.9)).toBe(1);
    expect(snapshot.functions.MOD(7, 4)).toBe(3);
    expect(snapshot.functions.RAND()).toBeGreaterThanOrEqual(0);
    expect(snapshot.functions.RAND()).toBeLessThan(1);
    expect(snapshot.functions.PI()).toBe(Math.PI);
  });

  it('keeps IF and SWITCH lazy', () => {
    const snapshot = createBuiltinsSnapshot();
    let touched = false;

    expect(snapshot.functionMeta.IF.invoke).toBe('lazy');
    expect(
      snapshot.functions.IF(
        () => true,
        () => 'ok',
        () => {
          touched = true;
          return 'bad';
        },
      ),
    ).toBe('ok');
    expect(touched).toBe(false);

    expect(snapshot.functionMeta.SWITCH.invoke).toBe('lazy');
    expect(
      snapshot.functions.SWITCH(
        () => 'match',
        () => 'match',
        () => 'picked',
        () => 'other',
        () => {
          touched = true;
          return 'bad';
        },
        () => 'fallback',
      ),
    ).toBe('picked');
    expect(touched).toBe(false);
  });

  it('covers lazy fallbacks and empty-input builtin branches', () => {
    const snapshot = createBuiltinsSnapshot();

    expect(
      snapshot.functions.IF(
        () => false,
        () => 'yes',
      ),
    ).toBeNull();
    expect(
      snapshot.functions.SWITCH(
        () => 'miss',
        () => 'match',
        () => 'picked',
        () => 'fallback',
      ),
    ).toBe('fallback');
    expect(
      snapshot.functions.SWITCH(
        () => 'miss',
        () => 'match',
        () => 'picked',
      ),
    ).toBeNull();

    expect(snapshot.functions.COUNT(null)).toBe(0);
    expect(snapshot.functions.ARRAYMAP(null, (value: unknown) => value)).toEqual([]);
    expect(snapshot.functions.ARRAYFILTER(null, (value: unknown) => value)).toEqual([]);
    expect(snapshot.functions.ARRAYFIND(null, (value: unknown) => value)).toBeUndefined();
    expect(snapshot.functions.ARRAYFINDINDEX(null, (value: unknown) => value)).toBe(-1);
    expect(snapshot.functions.ARRAYSOME(null, (value: unknown) => value)).toBe(false);
    expect(snapshot.functions.ARRAYEVERY(null, (value: unknown) => value)).toBe(true);
    expect(snapshot.functions.ARRAYINCLUDES([null], undefined)).toBe(true);
    expect(snapshot.functions.JOIN(null, null)).toBe('');
    expect(snapshot.functions.ISEMPTY('value')).toBe(false);
  });

  it('covers custom equality edge cases', () => {
    expect(customEquals(null, undefined)).toBe(true);
    expect(customEquals(undefined, null)).toBe(true);
    expect(customEquals(1, 1)).toBe(true);
    expect(customEquals('a', 'a')).toBe(true);
    expect(customEquals('1', 1)).toBe(false);
  });

  it('$JSON.parse strips dangerous keys from parsed objects', () => {
    const snapshot = createBuiltinsSnapshot();
    const $JSON = snapshot.namespaces.$JSON as {
      parse: (s: string) => unknown;
      stringify: typeof JSON.stringify;
    };

    const result = $JSON.parse(
      '{"safe": 1, "__proto__": {"polluted": true}, "constructor": "bad"}',
    ) as Record<string, unknown>;
    expect(result.safe).toBe(1);
    expect('__proto__' in result).toBe(false);
    expect('constructor' in result).toBe(false);
    expect(Object.getPrototypeOf(result)).toBeNull();
  });

  it('$JSON.parse strips dangerous keys recursively', () => {
    const snapshot = createBuiltinsSnapshot();
    const $JSON = snapshot.namespaces.$JSON as { parse: (s: string) => unknown };

    const result = $JSON.parse('{"a": {"__proto__": "bad", "ok": true}}') as Record<
      string,
      any
    >;
    expect(result.a.ok).toBe(true);
    expect('__proto__' in result.a).toBe(false);
  });
});
