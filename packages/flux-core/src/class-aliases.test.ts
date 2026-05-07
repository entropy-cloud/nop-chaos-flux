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
