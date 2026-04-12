import { describe, expect, it } from 'vitest';
import { getIn, parsePath, setIn } from './path';

describe('path utils', () => {
  it('parses bracket indexes without changing path semantics', () => {
    expect(parsePath('list[0].name')).toEqual(['list', '0', 'name']);
  });

  it('returns equal segments for repeated cached paths without sharing the same array instance', () => {
    const first = parsePath('user.profile.name');
    const second = parsePath('user.profile.name');

    expect(second).toEqual(first);
    expect(second).not.toBe(first);
  });

  it('does not let callers mutate cached parse results', () => {
    const first = parsePath('user.profile.name');
    first.push('extra');

    expect(parsePath('user.profile.name')).toEqual(['user', 'profile', 'name']);
  });

  it('keeps getIn semantics intact with cached parse results', () => {
    expect(getIn({ user: { profile: { name: 'Alice' } } }, 'user.profile.name')).toBe('Alice');
  });

  it('keeps setIn semantics intact with cached parse results', () => {
    expect(setIn({}, 'user.profile.name', 'Alice')).toEqual({
      user: {
        profile: {
          name: 'Alice'
        }
      }
    });
  });
});
