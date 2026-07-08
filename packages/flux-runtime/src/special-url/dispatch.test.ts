import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiResponse, RendererEnv, ScopeRef } from '@nop-chaos/flux-core';
import { clearDictCache } from './loaders.js';
import { createApiRequestExecutor } from '../async-data/request-runtime.js';
import { splitSpecialPrefix } from './dispatch.js';

function createScope(): ScopeRef {
  return {
    id: 'scope-test',
    path: '$',
    value: {},
    get: () => undefined,
    has: () => false,
    readOwn: () => ({}),
    readVisible: () => ({}),
    materializeVisible: () => ({}),
    update() {},
    merge() {},
  } as ScopeRef;
}

const ROLE_OPTIONS = [
  { label: '管理员', value: 'admin' },
  { label: '用户', value: 'user' },
];

beforeEach(() => {
  clearDictCache();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('splitSpecialPrefix', () => {
  it('splits @type:path on the first colon', () => {
    expect(splitSpecialPrefix('@dict:user/role')).toEqual(['dict', 'user/role']);
  });

  it('splits type://path schemes', () => {
    expect(splitSpecialPrefix('dict://user/role')).toEqual(['dict', 'user/role']);
  });

  it('returns undefined for relative urls without a scheme', () => {
    expect(splitSpecialPrefix('/api/users')).toBeUndefined();
    expect(splitSpecialPrefix('api/users')).toBeUndefined();
  });

  it('splits http(s) schemes into a tuple (passthrough is enforced at dispatch level, matching AMIS splitPrefixUrl)', () => {
    expect(splitSpecialPrefix('https://example.com/api')).toEqual(['https', 'example.com/api']);
    expect(splitSpecialPrefix('http://example.com/api')).toEqual(['http', 'example.com/api']);
  });

  it('returns undefined for empty / non-string', () => {
    expect(splitSpecialPrefix('')).toBeUndefined();
    expect(splitSpecialPrefix('@')).toBeUndefined();
  });

  it('handles @dict: with empty path', () => {
    expect(splitSpecialPrefix('@dict:')).toEqual(['dict', '']);
  });
});

describe('executeApiRequest @dict: dispatch', () => {
  it('resolves @dict: through loadDict and returns the options array (no responseAdaptor)', async () => {
    const getDict = vi.fn(async () => ({
      name: 'user/role',
      options: ROLE_OPTIONS,
    }));
    const fetcher = vi.fn(async () => ({ status: 0, data: null }));
    const env: RendererEnv = {
      fetcher: fetcher as never,
      notify: () => undefined,
      dictProvider: { getDict },
    };
    const execute = createApiRequestExecutor(() => env);

    const response: ApiResponse<unknown> = await execute(
      'ajax',
      { url: '@dict:user/role', method: 'get' },
      createScope(),
    );

    expect(getDict).toHaveBeenCalledWith('user/role', expect.any(AbortSignal));
    expect(fetcher).not.toHaveBeenCalled();
    expect(response.status).toBe(0);
    expect(response.data).toEqual(ROLE_OPTIONS);
  });

  it('passes normal urls through to env.fetcher unchanged', async () => {
    const getDict = vi.fn();
    const fetcher = vi.fn(async <T,>(api: { url?: string }): Promise<ApiResponse<T>> => ({
      status: 0,
      data: { echoed: api.url } as T,
    }));
    const env: RendererEnv = {
      fetcher: fetcher as never,
      notify: () => undefined,
      dictProvider: { getDict },
    };
    const execute = createApiRequestExecutor(() => env);

    const response = await execute(
      'ajax',
      { url: '/api/users', method: 'get' },
      createScope(),
    );

    expect(getDict).not.toHaveBeenCalled();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(response.data).toEqual({ echoed: '/api/users' });
  });

  it('passes unknown @ schemes through to env.fetcher unchanged', async () => {
    const fetcher = vi.fn(async <T,>(api: { url?: string }): Promise<ApiResponse<T>> => ({
      status: 0,
      data: { echoed: api.url } as T,
    }));
    const env: RendererEnv = {
      fetcher: fetcher as never,
      notify: () => undefined,
    };
    const execute = createApiRequestExecutor(() => env);

    const response = await execute(
      'ajax',
      { url: '@unknown:thing', method: 'get' },
      createScope(),
    );

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(response.data).toEqual({ echoed: '@unknown:thing' });
  });

  it('caches @dict: across requests (dictProvider called once)', async () => {
    const getDict = vi.fn(async () => ({
      name: 'user/role',
      options: ROLE_OPTIONS,
    }));
    const env: RendererEnv = {
      fetcher: async <T,>() => ({ status: 0, data: null as T }),
      notify: () => undefined,
      dictProvider: { getDict },
    };
    const execute = createApiRequestExecutor(() => env);

    await execute('ajax', { url: '@dict:user/role' }, createScope());
    await execute('ajax', { url: '@dict:user/role' }, createScope());

    expect(getDict).toHaveBeenCalledTimes(1);
  });
});
