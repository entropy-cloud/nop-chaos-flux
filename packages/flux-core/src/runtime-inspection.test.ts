import { describe, expect, it } from 'vitest';
import { isAbortError, buildScopeChain } from './runtime-inspection.js';
import type { ScopeRef } from './types/scope.js';

describe('isAbortError', () => {
  it('returns true for AbortError name', () => {
    expect(isAbortError({ name: 'AbortError' })).toBe(true);
  });

  it('returns true for ABORT_ERR code', () => {
    expect(isAbortError({ code: 'ABORT_ERR' })).toBe(true);
  });

  it('returns true for DOMException-like AbortError', () => {
    expect(isAbortError(new DOMException('aborted', 'AbortError'))).toBe(true);
  });

  it('returns false for null/undefined/primitives', () => {
    expect(isAbortError(null)).toBe(false);
    expect(isAbortError(undefined)).toBe(false);
    expect(isAbortError('AbortError')).toBe(false);
    expect(isAbortError(42)).toBe(false);
  });

  it('returns false for non-abort errors', () => {
    expect(isAbortError(new Error('something'))).toBe(false);
    expect(isAbortError({ name: 'TypeError' })).toBe(false);
    expect(isAbortError({})).toBe(false);
  });
});

describe('buildScopeChain', () => {
  it('returns undefined for undefined scope', () => {
    expect(buildScopeChain(undefined)).toBeUndefined();
  });

  it('builds chain from single scope', () => {
    const scope = {
      id: 'root',
      path: '/root',
      parent: undefined,
      readOwn: () => ({ key: 'value' }),
    } as unknown as ScopeRef;

    const chain = buildScopeChain(scope);
    expect(chain).toHaveLength(1);
    expect(chain![0]).toEqual({
      id: 'root',
      path: '/root',
      label: '/root',
      data: { key: 'value' },
    });
  });

  it('builds chain walking up parents', () => {
    const parent = {
      id: 'parent',
      path: '/parent',
      parent: undefined,
      readOwn: () => ({ p: 1 }),
    } as unknown as ScopeRef;
    const child = {
      id: 'child',
      path: '/child',
      parent,
      readOwn: () => ({ c: 2 }),
    } as unknown as ScopeRef;

    const chain = buildScopeChain(child);
    expect(chain).toHaveLength(2);
    expect(chain![0].id).toBe('child');
    expect(chain![1].id).toBe('parent');
  });

  it('uses id as label when path is empty', () => {
    const scope = {
      id: 'anon',
      path: '',
      parent: undefined,
      readOwn: () => ({}),
    } as unknown as ScopeRef;

    const chain = buildScopeChain(scope);
    expect(chain![0].label).toBe('anon');
  });
});
