import { describe, expect, it } from 'vitest';
import { mergeClassAliases, resolveClassAliases } from './class-aliases.js';

describe('resolveClassAliases contract', () => {
  it('returns empty string for undefined className', () => {
    expect(resolveClassAliases(undefined, {})).toBe('');
  });

  it('returns empty string for empty className', () => {
    expect(resolveClassAliases('', {})).toBe('');
  });

  it('returns className as-is for undefined aliases', () => {
    expect(resolveClassAliases('btn', undefined)).toBe('btn');
  });

  it('returns className as-is for empty aliases', () => {
    expect(resolveClassAliases('btn', {})).toBe('btn');
  });

  it('resolves single alias', () => {
    expect(resolveClassAliases('btn', { btn: 'rounded px-4' })).toBe('rounded px-4');
  });

  it('resolves multiple space-separated tokens independently', () => {
    expect(
      resolveClassAliases('card active', {
        card: 'rounded shadow',
        active: 'ring-2',
      }),
    ).toBe('rounded shadow ring-2');
  });

  it('passes through tokens with no matching alias', () => {
    expect(resolveClassAliases('btn unknown', { btn: 'rounded' })).toBe('rounded unknown');
  });

  it('handles self-referencing alias without infinite loop', () => {
    expect(resolveClassAliases('a', { a: 'a' })).toBe('a');
  });

  it('handles A->B->A cycle without infinite loop', () => {
    expect(resolveClassAliases('a', { a: 'b', b: 'a' })).toBe('a');
  });

  it('handles three-node cycle A->B->C->A', () => {
    expect(resolveClassAliases('a', { a: 'b', b: 'c', c: 'a' })).toBe('a');
  });

  it('resolves nested aliases transitively', () => {
    expect(
      resolveClassAliases('shell', {
        shell: 'card p-4',
        card: 'rounded shadow',
      }),
    ).toBe('rounded shadow p-4');
  });

  it('deduplicates across expansion', () => {
    expect(
      resolveClassAliases('shell card', {
        shell: 'card p-4',
        card: 'rounded shadow',
      }),
    ).toBe('rounded shadow p-4 rounded shadow');
  });

  it('handles extra whitespace in className', () => {
    expect(resolveClassAliases('  btn   card  ', { btn: 'a', card: 'b' })).toBe('a b');
  });
});

describe('mergeClassAliases contract', () => {
  it('returns undefined when both are undefined', () => {
    expect(mergeClassAliases(undefined, undefined)).toBeUndefined();
  });

  it('returns child when parent is undefined', () => {
    const child = { a: '1' };
    expect(mergeClassAliases(undefined, child)).toBe(child);
  });

  it('returns parent when child is undefined', () => {
    const parent = { a: '1' };
    expect(mergeClassAliases(parent, undefined)).toBe(parent);
  });

  it('merges with child taking precedence', () => {
    expect(mergeClassAliases({ a: 'parent', b: 'keep' }, { a: 'child', c: 'new' })).toEqual({
      a: 'child',
      b: 'keep',
      c: 'new',
    });
  });

  it('returns new object (does not mutate)', () => {
    const parent = { a: '1' };
    const child = { b: '2' };
    const result = mergeClassAliases(parent, child);
    expect(result).not.toBe(parent);
    expect(result).not.toBe(child);
  });
});
