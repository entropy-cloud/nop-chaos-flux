import { describe, expect, it } from 'vitest';
import { mergeClassAliases, resolveClassAliases } from './index.js';

describe('class-aliases', () => {
  it('expands nested aliases recursively', () => {
    expect(
      resolveClassAliases('card shell', {
        card: 'rounded shadow',
        shell: 'card p-4',
      }),
    ).toBe('rounded shadow rounded shadow p-4');
  });

  it('keeps cyclic aliases stable instead of recursing forever', () => {
    expect(
      resolveClassAliases('a', {
        a: 'b',
        b: 'a',
      }),
    ).toBe('a');
  });

  it('passes through unknown classes untouched and handles a direct self-reference', () => {
    expect(resolveClassAliases('foo bar', { card: 'rounded' })).toBe('foo bar');
    expect(resolveClassAliases('a', { a: 'a' })).toBe('a');
  });

  it('resolves deep chains to the terminal expansion', () => {
    expect(resolveClassAliases('l1', { l1: 'l2', l2: 'l3', l3: 'final' })).toBe('final');
  });

  it('ignores empty-string aliases instead of emitting empty tokens', () => {
    expect(resolveClassAliases('card', { card: '' })).toBe('card');
  });

  it('merges parent and child aliases with child precedence', () => {
    expect(
      mergeClassAliases({ stack: 'gap-2', card: 'rounded' }, { stack: 'gap-4', panel: 'border' }),
    ).toEqual({
      stack: 'gap-4',
      card: 'rounded',
      panel: 'border',
    });
  });
});
