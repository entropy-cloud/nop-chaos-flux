import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  decodeFilterValue,
  encodeFilterValue,
  isUrlKeyReserved,
  queryToUrlValues,
  useUrlFilterSync,
} from '../use-url-filter-sync.js';
import { renderHook } from '@testing-library/react';
// Side-effect import initializes the flux i18n test locale.
import '../test-support.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('url filter serialization (plan 512 L3.5)', () => {
  it('encodes arrays by comma join and drops empty values', () => {
    expect(encodeFilterValue(['a', 'b'])).toBe('a,b');
    expect(encodeFilterValue([])).toBeUndefined();
    expect(encodeFilterValue('')).toBeUndefined();
    expect(encodeFilterValue(null)).toBeUndefined();
    expect(encodeFilterValue('kw')).toBe('kw');
    expect(encodeFilterValue(5)).toBe('5');
  });

  it('decode is symmetric with encode honoring the default shape', () => {
    expect(decodeFilterValue('a,b', ['x'])).toEqual(['a', 'b']);
    expect(decodeFilterValue('kw', '')).toBe('kw');
    expect(decodeFilterValue('1', 0)).toBe('1');
  });

  it('reserved host keys never project to the URL', () => {
    expect(isUrlKeyReserved('page')).toBe(true);
    expect(isUrlKeyReserved('keyword')).toBe(false);
    const values = queryToUrlValues({ keyword: 'x', status: '1', page: 2, pageSize: 10, tagIds: ['a', 'b'] });
    expect(values).toEqual({ keyword: 'x', status: '1', tagIds: 'a,b' });
  });
});

describe('useUrlFilterSync', () => {
  const updateCalls = () => {
    const updates: Array<[string, unknown]> = [];
    const scope = {
      update: (path: string, value: unknown) => updates.push([path, value]),
      readVisible: () => ({}),
    };
    return { updates, scope };
  };

  it('restores URL params into the query state once on mount (reserved keys skipped)', () => {
    const { updates, scope } = updateCalls();
    const location = {
      getQuery: () => ({ keyword: '顾', status: '1', page: '3' }),
      setQuery: vi.fn(),
    };
    renderHook(() =>
      useUrlFilterSync({
        enabled: true,
        instanceId: 't1',
        location,
        scope: scope as never,
        queryStatePath: '$crud.query',
        query: { keyword: '', status: '' },
        defaultQuery: { keyword: '', status: '' },
      }),
    );
    expect(updates).toContainEqual(['$crud.query.keyword', '顾']);
    expect(updates).toContainEqual(['$crud.query.status', '1']);
    expect(updates.find(([path]) => path.includes('page'))).toBeUndefined();
  });

  it('writes query changes back with replace semantics', () => {
    const setQuery = vi.fn();
    const { scope } = updateCalls();
    const location = { getQuery: () => ({}), setQuery };
    const { rerender } = renderHook(
      ({ query }) =>
        useUrlFilterSync({
          enabled: true,
          instanceId: 't2',
          location,
          scope: scope as never,
          queryStatePath: '$crud.query',
          query,
          defaultQuery: { keyword: '' },
        }),
      { initialProps: { query: { keyword: '' } as Record<string, unknown> } },
    );
    rerender({ query: { keyword: '顾北辰' } });
    expect(setQuery).toHaveBeenCalledWith({ keyword: '顾北辰' }, { replace: true });
    // identical state does not rewrite
    rerender({ query: { keyword: '顾北辰' } });
    expect(setQuery).toHaveBeenCalledTimes(1);
  });

  it('degrades a colliding second instance with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { scope } = updateCalls();
    const location = { getQuery: () => ({}), setQuery: vi.fn() };
    const common = {
      instanceId: 'dup',
      location,
      scope: scope as never,
      queryStatePath: '$crud.query',
      query: {},
      defaultQuery: {},
    };
    const first = renderHook(() => useUrlFilterSync({ enabled: true, ...common }));
    const { result, rerender } = renderHook(() => useUrlFilterSync({ enabled: true, ...common }));
    rerender();
    expect(result.current).toBe(false);
    void first;
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('collides'));
  });

  it('is inactive without env.location', () => {
    const { scope } = updateCalls();
    const { result } = renderHook(() =>
      useUrlFilterSync({
        enabled: true,
        instanceId: 't4',
        location: undefined,
        scope: scope as never,
        queryStatePath: '$crud.query',
        query: {},
        defaultQuery: {},
      }),
    );
    expect(result.current).toBe(false);
  });
});
