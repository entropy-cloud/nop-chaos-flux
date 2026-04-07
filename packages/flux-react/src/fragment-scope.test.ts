import { describe, expect, it } from 'vitest';
import { createFragmentScopeChange } from './fragment-scope';

describe('createFragmentScopeChange', () => {
  it('returns minimal changed roots for fragment scope updates', () => {
    expect(createFragmentScopeChange(
      {
        currentUser: { name: 'Alice' },
        note: 'keep'
      },
      {
        currentUser: { name: 'Bob' },
        note: 'keep'
      }
    )).toEqual({
      paths: ['currentUser'],
      kind: 'replace'
    });
  });

  it('returns undefined when fragment data is root-stable', () => {
    const currentUser = { name: 'Alice' };

    expect(createFragmentScopeChange(
      {
        currentUser,
        note: 'keep'
      },
      {
        currentUser,
        note: 'keep'
      }
    )).toBeUndefined();
  });

  it('includes added and removed roots', () => {
    const currentUser = { name: 'Alice' };

    expect(createFragmentScopeChange(
      {
        currentUser,
        note: 'remove'
      },
      {
        currentUser,
        status: 'added'
      }
    )).toEqual({
      paths: ['note', 'status'],
      kind: 'replace'
    });
  });
});