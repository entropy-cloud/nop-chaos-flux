import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFetcher, isNopError, extractErrorMessage } from './env';
import type { ExecutableApiRequest } from '@nop-chaos/flux-core';

interface MockRequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

function buildFetchMock(responder: (url: string, init: MockRequestInit) => {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}) {
  return vi.fn(async (url: string, init: MockRequestInit = {}) => {
    const r = responder(url, init);
    const h = new Map<string, string>(Object.entries(r.headers ?? {}));
    return {
      status: r.status,
      headers: {
        get: (k: string) => h.get(k.toLowerCase()) ?? null,
        forEach: (cb: (v: string, k: string) => void) => h.forEach((v, k) => cb(v, k)),
      },
      text: async () => (typeof r.body === 'string' ? r.body : JSON.stringify(r.body)),
    } as unknown as Response;
  });
}

const sampleCtx = {} as Parameters<ReturnType<typeof createFetcher>>[1];

describe('createFetcher', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('posts JSON body and returns data for a successful Nop envelope', async () => {
    const fetchMock = buildFetchMock(() => ({
      status: 200,
      body: { status: 0, msg: 'ok', data: { userId: 'u1', userName: 'alice' } },
    }));
    vi.stubGlobal('fetch', fetchMock);

    const fetcher = createFetcher({});
    const api: ExecutableApiRequest = {
      url: '/r/LoginApi__login',
      method: 'POST',
      data: { principalId: 'alice', principalSecret: 'pw', loginType: 1 },
    };
    const res = await fetcher(api, sampleCtx);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, init] = fetchMock.mock.calls[0] as [string, MockRequestInit];
    expect(calledUrl).toBe('/r/LoginApi__login');
    expect(init.method).toBe('POST');
    expect(init.headers?.['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body ?? '{}')).toEqual({
      principalId: 'alice',
      principalSecret: 'pw',
      loginType: 1,
    });
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ userId: 'u1', userName: 'alice' });
  });

  it('injects Authorization header from getToken hook', async () => {
    const fetchMock = buildFetchMock((_url, init) => ({
      status: 200,
      body: { status: 0, data: { ok: true } },
      headers: { authorization: init.headers?.['Authorization'] ?? '' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    const fetcher = createFetcher({ getToken: () => 'abc123' });
    await fetcher({ url: '/api', method: 'POST', data: { q: '{__typename}' } }, sampleCtx);

    const init = fetchMock.mock.calls[0]![1] as MockRequestInit;
    expect(init.headers?.['Authorization']).toBe('Bearer abc123');
  });

  it('marks ok=false when Nop envelope status is non-zero', async () => {
    vi.stubGlobal(
      'fetch',
      buildFetchMock(() => ({
        status: 200,
        body: { status: 1002, msg: '密码错误', data: null },
      })),
    );
    const fetcher = createFetcher({});
    const res = await fetcher({ url: '/r/LoginApi__login', method: 'POST', data: {} }, sampleCtx);
    expect(res.ok).toBe(false);
    expect(res.status).toBe(200);
  });

  it('invokes onUnauthorized on HTTP 401', async () => {
    const onUnauthorized = vi.fn();
    vi.stubGlobal(
      'fetch',
      buildFetchMock(() => ({ status: 401, body: { status: 401, msg: 'unauthorized' } })),
    );
    const fetcher = createFetcher({ onUnauthorized });
    await fetcher({ url: '/api', method: 'POST', data: {} }, sampleCtx);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('falls back to raw body when response is not a Nop envelope', async () => {
    vi.stubGlobal(
      'fetch',
      buildFetchMock(() => ({ status: 200, body: { hello: 'world' } })),
    );
    const fetcher = createFetcher({});
    const res = await fetcher({ url: '/api/ping', method: 'GET' }, sampleCtx);
    expect(res.ok).toBe(true);
    expect(res.data).toEqual({ hello: 'world' });
  });

  it('on 401: refreshes token via refreshAccessToken and replays the original request once', async () => {
    let callCount = 0;
    const authHeaders: (string | undefined)[] = [];
    const fetchMock = buildFetchMock((_url, init) => {
      callCount += 1;
      authHeaders.push(init.headers?.['Authorization']);
      if (callCount === 1) {
        return { status: 401, body: { status: 401, msg: 'expired' } };
      }
      return { status: 200, body: { status: 0, data: { replayed: true } } };
    });
    vi.stubGlobal('fetch', fetchMock);

    const refreshAccessToken = vi.fn(async () => 'newtok');
    const onUnauthorized = vi.fn();
    const fetcher = createFetcher({
      getToken: () => 'stale',
      refreshAccessToken,
      onUnauthorized,
    });

    const res = await fetcher({ url: '/api/protected', method: 'POST', data: { a: 1 } }, sampleCtx);

    expect(callCount).toBe(2);
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(authHeaders[0]).toBe('Bearer stale');
    expect(authHeaders[1]).toBe('Bearer newtok');
    expect(res.ok).toBe(true);
    expect(res.data).toEqual({ replayed: true });
  });

  it('on 401 with refresh returning null: does not retry and calls onUnauthorized', async () => {
    let callCount = 0;
    const fetchMock = buildFetchMock(() => {
      callCount += 1;
      return { status: 401, body: { status: 401, msg: 'expired' } };
    });
    vi.stubGlobal('fetch', fetchMock);

    const refreshAccessToken = vi.fn(async () => null);
    const onUnauthorized = vi.fn();
    const fetcher = createFetcher({
      getToken: () => 'stale',
      refreshAccessToken,
      onUnauthorized,
    });

    const res = await fetcher({ url: '/api/protected', method: 'POST' }, sampleCtx);

    expect(callCount).toBe(1);
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(401);
    expect(res.ok).toBe(false);
  });
});

describe('Nop envelope helpers', () => {
  it('isNopError detects non-zero status', () => {
    expect(isNopError({ status: 0 })).toBe(false);
    expect(isNopError({ status: 1002 })).toBe(true);
    expect(isNopError(null)).toBe(false);
  });

  it('extractErrorMessage prefers envelope msg', () => {
    expect(extractErrorMessage({ status: 1, msg: '密码错误' }, 'fallback')).toBe('密码错误');
    expect(extractErrorMessage({ status: 1, msg: '  ' }, 'fallback')).toBe('fallback');
    expect(extractErrorMessage(undefined, 'fallback')).toBe('fallback');
  });
});
