import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { refreshAccessToken, resetRefreshInflightForTesting, isInflightRefreshActive } from './refresh';
import { useMallStore } from '../store';

interface MockRequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

function installFetchMock(
  responder: (url: string, init: MockRequestInit) => Promise<{ status: number; body: unknown }> | { status: number; body: unknown },
) {
  const fn = vi.fn(async (url: string, init: MockRequestInit = {}) => {
    const r = await responder(url, init);
    const text = typeof r.body === 'string' ? r.body : JSON.stringify(r.body);
    return {
      status: r.status,
      headers: {
        get: () => null,
        forEach: () => undefined,
      },
      text: async () => text,
      json: async () => JSON.parse(text),
    } as unknown as Response;
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('refreshAccessToken single-flight', () => {
  beforeEach(() => {
    useMallStore.getState().reset();
    resetRefreshInflightForTesting();
  });

  afterEach(() => {
    useMallStore.getState().reset();
    resetRefreshInflightForTesting();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns null when there is no refresh token', async () => {
    const fetchMock = installFetchMock(() => ({ status: 200, body: { status: 0, data: {} } }));
    const result = await refreshAccessToken();
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refreshes and writes new token to store', async () => {
    useMallStore.getState().setAuth({
      accessToken: 'old',
      refreshToken: 'rr',
      userInfo: { userId: 'u', userName: 'u' },
    });
    const fetchMock = installFetchMock((url) => {
      if (url === '/r/LoginApi__refreshToken') {
        return {
          status: 200,
          body: { status: 0, data: { accessToken: 'new', refreshToken: 'rr2', expiresIn: 7200 } },
        };
      }
      return { status: 404, body: {} };
    });

    const result = await refreshAccessToken();
    expect(result).toBe('new');
    const [calledUrl, init] = fetchMock.mock.calls[0] as [string, MockRequestInit];
    expect(calledUrl).toBe('/r/LoginApi__refreshToken');
    expect(JSON.parse(init.body ?? '{}')).toEqual({ refreshToken: 'rr' });
    expect(useMallStore.getState().accessToken).toBe('new');
    expect(useMallStore.getState().refreshToken).toBe('rr2');
  });

  it('coalesces concurrent 401 refreshes into a single network call (single-flight)', async () => {
    useMallStore.getState().setAuth({
      accessToken: 'old',
      refreshToken: 'rr',
      userInfo: { userId: 'u', userName: 'u' },
    });

    let resolveRefresh!: (v: { status: number; body: unknown }) => void;
    const refreshPromise = new Promise<{ status: number; body: unknown }>((resolve) => {
      resolveRefresh = resolve;
    });
    const fetchMock = installFetchMock(() => refreshPromise);

    const p1 = refreshAccessToken();
    expect(isInflightRefreshActive()).toBe(true);
    const p2 = refreshAccessToken();
    const p3 = refreshAccessToken();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveRefresh({ status: 200, body: { status: 0, data: { accessToken: 'shared', refreshToken: 'rr' } } });

    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
    expect(r1).toBe('shared');
    expect(r2).toBe('shared');
    expect(r3).toBe('shared');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(isInflightRefreshActive()).toBe(false);
  });

  it('clears auth and returns null when refresh fails (HTTP non-2xx)', async () => {
    useMallStore.getState().setAuth({
      accessToken: 'old',
      refreshToken: 'rr',
      userInfo: { userId: 'u', userName: 'u' },
    });
    installFetchMock(() => ({ status: 401, body: { status: 401, msg: 'invalid refresh' } }));

    const result = await refreshAccessToken();
    expect(result).toBeNull();
    expect(useMallStore.getState().accessToken).toBeNull();
    expect(useMallStore.getState().refreshToken).toBeNull();
  });

  it('clears auth and returns null when refresh envelope reports non-zero status', async () => {
    useMallStore.getState().setAuth({
      accessToken: 'old',
      refreshToken: 'rr',
      userInfo: { userId: 'u', userName: 'u' },
    });
    installFetchMock(() => ({
      status: 200,
      body: { status: 1006, msg: 'refresh token expired', data: null },
    }));

    const result = await refreshAccessToken();
    expect(result).toBeNull();
    expect(useMallStore.getState().accessToken).toBeNull();
  });
});
