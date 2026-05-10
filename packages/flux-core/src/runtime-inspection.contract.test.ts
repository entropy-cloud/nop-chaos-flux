import { describe, expect, it } from 'vitest';
import { isAbortError, buildScopeChain } from './runtime-inspection.js';
import type { ScopeRef } from './types/scope.js';

describe('isAbortError contract', () => {
  it('returns false for null', () => {
    expect(isAbortError(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isAbortError(undefined)).toBe(false);
  });

  it('returns false for string', () => {
    expect(isAbortError('AbortError')).toBe(false);
  });

  it('returns false for number', () => {
    expect(isAbortError(42)).toBe(false);
  });

  it('returns true for DOMException with name AbortError', () => {
    const error = new DOMException('Aborted', 'AbortError');
    expect(isAbortError(error)).toBe(true);
  });

  it('returns true for object with name AbortError', () => {
    expect(isAbortError({ name: 'AbortError' })).toBe(true);
  });

  it('returns true for object with code ABORT_ERR', () => {
    expect(isAbortError({ code: 'ABORT_ERR' })).toBe(true);
  });

  it('returns false for generic error', () => {
    expect(isAbortError(new Error('generic'))).toBe(false);
  });
});

describe('buildScopeChain contract', () => {
  it('returns undefined for undefined scope', () => {
    expect(buildScopeChain(undefined)).toBeUndefined();
  });

  it('returns single-element chain for scope without parent', () => {
    const scope: ScopeRef = {
      id: 'scope:root',
      path: '$',
      value: {},
      get: () => undefined,
      has: () => false,
      readOwn: () => ({ a: 1 }),
      readVisible: () => ({}),
      materializeVisible: () => ({}),
      update: () => undefined,
      merge: () => undefined,
    };

    const chain = buildScopeChain(scope);
    expect(chain).toHaveLength(1);
    expect(chain![0].id).toBe('scope:root');
    expect(chain![0].path).toBe('$');
    expect(chain![0].data).toEqual({ a: 1 });
  });

  it('walks parent chain', () => {
    const parent: ScopeRef = {
      id: 'scope:parent',
      path: '$',
      value: {},
      get: () => undefined,
      has: () => false,
      readOwn: () => ({ parent: true }),
      readVisible: () => ({}),
      materializeVisible: () => ({}),
      update: () => undefined,
      merge: () => undefined,
    };

    const child: ScopeRef = {
      id: 'scope:child',
      path: '$.form',
      value: {},
      get: () => undefined,
      has: () => false,
      readOwn: () => ({ child: true }),
      readVisible: () => ({}),
      materializeVisible: () => ({}),
      update: () => undefined,
      merge: () => undefined,
      parent,
    };

    const chain = buildScopeChain(child);
    expect(chain).toHaveLength(2);
    expect(chain![0].id).toBe('scope:child');
    expect(chain![1].id).toBe('scope:parent');
  });
});
