import { describe, expect, it } from 'vitest';
import {
  booleanStringAdapter,
  identityAdapter,
  nullableAdapter,
  numberAdapter,
  stringAdapter,
} from './value-adapter.js';

const ctx = { readOnly: false };

describe('identityAdapter contract', () => {
  it('passes through any value in both directions', () => {
    const adapter = identityAdapter();
    expect(adapter.in(42, ctx)).toBe(42);
    expect(adapter.out(42, ctx)).toBe(42);
    expect(adapter.in('hello', ctx)).toBe('hello');
    expect(adapter.out('hello', ctx)).toBe('hello');
  });

  it('passes through null and undefined', () => {
    const adapter = identityAdapter();
    expect(adapter.in(null, ctx)).toBe(null);
    expect(adapter.out(null, ctx)).toBe(null);
    expect(adapter.in(undefined, ctx)).toBe(undefined);
    expect(adapter.out(undefined, ctx)).toBe(undefined);
  });

  it('passes through objects by reference', () => {
    const adapter = identityAdapter();
    const obj = { a: 1 };
    expect(adapter.in(obj, ctx)).toBe(obj);
    expect(adapter.out(obj, ctx)).toBe(obj);
  });
});

describe('stringAdapter contract', () => {
  it('converts null to empty string on in', () => {
    expect(stringAdapter().in(null, ctx)).toBe('');
  });

  it('converts undefined to empty string on in', () => {
    expect(stringAdapter().in(undefined, ctx)).toBe('');
  });

  it('converts number to string on in', () => {
    expect(stringAdapter().in(42, ctx)).toBe('42');
  });

  it('passes through string on in', () => {
    expect(stringAdapter().in('hello', ctx)).toBe('hello');
  });

  it('passes through value on out (no transform)', () => {
    expect(stringAdapter().out('anything', ctx)).toBe('anything');
  });

  it('passes through non-string on out', () => {
    expect(stringAdapter().out(42 as any, ctx)).toBe(42);
  });
});

describe('booleanStringAdapter contract', () => {
  it('converts string "true" to true on in', () => {
    expect(booleanStringAdapter().in('true', ctx)).toBe(true);
  });

  it('converts string "false" to false (not true!) on in', () => {
    expect(booleanStringAdapter().in('false', ctx)).toBe(false);
  });

  it('converts non-"true" string to false on in (only "true" maps to true)', () => {
    expect(booleanStringAdapter().in('anything', ctx)).toBe(false);
    expect(booleanStringAdapter().in('false', ctx)).toBe(false);
    expect(booleanStringAdapter().in('', ctx)).toBe(false);
  });

  it('converts number via Boolean on in', () => {
    expect(booleanStringAdapter().in(1, ctx)).toBe(true);
    expect(booleanStringAdapter().in(0, ctx)).toBe(false);
  });

  it('converts null via Boolean on in', () => {
    expect(booleanStringAdapter().in(null, ctx)).toBe(false);
  });

  it('converts undefined via Boolean on in', () => {
    expect(booleanStringAdapter().in(undefined, ctx)).toBe(false);
  });

  it('converts via Boolean on out', () => {
    expect(booleanStringAdapter().out(true, ctx)).toBe(true);
    expect(booleanStringAdapter().out(false, ctx)).toBe(false);
    expect(booleanStringAdapter().out(0 as any, ctx)).toBe(false);
    expect(booleanStringAdapter().out(1 as any, ctx)).toBe(true);
  });
});

describe('numberAdapter contract', () => {
  it('returns undefined for null on in', () => {
    expect(numberAdapter().in(null, ctx)).toBeUndefined();
  });

  it('returns undefined for empty string on in', () => {
    expect(numberAdapter().in('', ctx)).toBeUndefined();
  });

  it('returns undefined for NaN on in', () => {
    expect(numberAdapter().in(NaN, ctx)).toBeUndefined();
  });

  it('returns number as-is on in', () => {
    expect(numberAdapter().in(42, ctx)).toBe(42);
  });

  it('parses string to number on in', () => {
    expect(numberAdapter().in('3.14', ctx)).toBeCloseTo(3.14);
  });

  it('returns undefined for non-numeric string on in', () => {
    expect(numberAdapter().in('abc', ctx)).toBeUndefined();
  });

  it('returns undefined for null on out', () => {
    expect(numberAdapter().out(null as any, ctx)).toBeUndefined();
  });

  it('returns undefined for empty string on out', () => {
    expect(numberAdapter().out('' as any, ctx)).toBeUndefined();
  });

  it('returns number as-is on out', () => {
    expect(numberAdapter().out(42, ctx)).toBe(42);
  });

  it('parses string on out', () => {
    expect(numberAdapter().out('99' as any, ctx)).toBe(99);
  });

  it('returns undefined for NaN string on out', () => {
    expect(numberAdapter().out('not-a-number' as any, ctx)).toBeUndefined();
  });

  it('handles zero correctly on in', () => {
    expect(numberAdapter().in(0, ctx)).toBe(0);
  });

  it('handles negative numbers on in', () => {
    expect(numberAdapter().in(-5, ctx)).toBe(-5);
  });

  it('handles Infinity on in', () => {
    expect(numberAdapter().in(Infinity, ctx)).toBe(Infinity);
  });

  it('returns undefined for -Infinity on in', () => {
    expect(numberAdapter().in(-Infinity, ctx)).toBe(-Infinity);
  });
});

describe('nullableAdapter contract', () => {
  it('passes null through on in', async () => {
    expect(await nullableAdapter(stringAdapter()).in(null, ctx)).toBeNull();
  });

  it('passes undefined through on in', async () => {
    expect(await nullableAdapter(stringAdapter()).in(undefined, ctx)).toBeUndefined();
  });

  it('delegates non-null to inner adapter on in', async () => {
    expect(await nullableAdapter(stringAdapter()).in(42, ctx)).toBe('42');
  });

  it('passes null through on out', async () => {
    expect(await nullableAdapter(stringAdapter()).out(null, ctx)).toBeNull();
  });

  it('passes undefined through on out', async () => {
    expect(await nullableAdapter(stringAdapter()).out(undefined, ctx)).toBeUndefined();
  });

  it('delegates non-null to inner adapter on out', async () => {
    expect(await nullableAdapter(stringAdapter()).out('hello', ctx)).toBe('hello');
  });

  it('returns valid:true for null when inner has validate', () => {
    const inner = {
      in: (v: string) => v,
      out: (v: string) => v,
      validate: () => ({ valid: false, issues: [{ level: 'error' as const, message: 'fail' }] }),
    };
    expect(nullableAdapter(inner).validate!(null, ctx)).toEqual({ valid: true });
  });

  it('returns valid:true for undefined when inner has validate', () => {
    const inner = {
      in: (v: string) => v,
      out: (v: string) => v,
      validate: () => ({ valid: false, issues: [{ level: 'error' as const, message: 'fail' }] }),
    };
    expect(nullableAdapter(inner).validate!(undefined, ctx)).toEqual({ valid: true });
  });

  it('delegates non-null to inner validate', () => {
    const inner = {
      in: (v: string) => v,
      out: (v: string) => v,
      validate: () => ({ valid: false, issues: [{ level: 'error' as const, message: 'fail' }] }),
    };
    expect(nullableAdapter(inner).validate!('x', ctx)).toEqual({
      valid: false,
      issues: [{ level: 'error', message: 'fail' }],
    });
  });
});
