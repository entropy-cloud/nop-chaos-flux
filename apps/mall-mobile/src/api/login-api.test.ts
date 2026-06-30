import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  login,
  signUp,
  sendResetCode,
  resetPassword,
  logout,
  GraphQLError,
} from './login-api';
import { useMallStore } from '../store';

interface MockRequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

type Responder = (url: string, init: MockRequestInit) => {
  status: number;
  body: unknown;
};

function installFetchMock(responder: Responder) {
  const fn = vi.fn(async (url: string, init: MockRequestInit = {}) => {
    const r = responder(url, init);
    const headers = new Map<string, string>();
    return {
      status: r.status,
      headers: {
        get: (k: string) => headers.get(k.toLowerCase()) ?? null,
        forEach: (cb: (v: string, k: string) => void) => headers.forEach((v, k) => cb(v, k)),
      },
      text: async () => (typeof r.body === 'string' ? r.body : JSON.stringify(r.body)),
    } as unknown as Response;
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

const LOGGED_OUT = { accessToken: null, refreshToken: null, userInfo: null };

describe('login-api client', () => {
  beforeEach(() => {
    useMallStore.getState().reset();
  });

  afterEach(() => {
    useMallStore.getState().reset();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('login writes accessToken + userInfo to store', async () => {
    const fetchMock = installFetchMock((url) => {
      if (url === '/r/LoginApi__login') {
        return {
          status: 200,
          body: {
            status: 0,
            data: {
              accessToken: 'tok-login',
              refreshToken: 'refresh-login',
              expiresIn: 3600,
              userInfo: { userId: 'u1', userName: 'alice', nickName: 'Alice' },
            },
          },
        };
      }
      return { status: 404, body: { status: 1, msg: 'not found' } };
    });

    const result = await login({ principalId: 'alice', principalSecret: 'pw' });

    expect(result.accessToken).toBe('tok-login');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, init] = fetchMock.mock.calls[0] as [string, MockRequestInit];
    expect(calledUrl).toBe('/r/LoginApi__login');
    expect(JSON.parse(init.body ?? '{}')).toEqual({
      principalId: 'alice',
      principalSecret: 'pw',
      loginType: 1,
    });
    expect(init.headers?.['Authorization']).toBeUndefined();

    const state = useMallStore.getState();
    expect(state.accessToken).toBe('tok-login');
    expect(state.refreshToken).toBe('refresh-login');
    expect(state.userInfo).toEqual({ userId: 'u1', userName: 'alice', nickName: 'Alice' });
  });

  it('login throws GraphQLError on wrong password (envelope status != 0)', async () => {
    installFetchMock(() => ({
      status: 200,
      body: { status: 1002, msg: '用户名或密码错误', data: null },
    }));

    await expect(login({ principalId: 'x', principalSecret: 'bad' })).rejects.toMatchObject({
      name: 'GraphQLError',
      message: '用户名或密码错误',
      status: 200,
    });
    expect(useMallStore.getState().accessToken).toBeNull();
  });

  it('signUp returns userId and does not auto-login the store', async () => {
    const fetchMock = installFetchMock((url) => {
      if (url === '/r/LoginApi__signUp') {
        return {
          status: 200,
          body: { status: 0, data: { userId: 'new-1', userName: 'newbie', phone: '13800138000' } },
        };
      }
      return { status: 404, body: {} };
    });

    const res = await signUp({ username: 'newbie', password: 'Pass@1', mobile: '13800138000' });
    expect(res.userId).toBe('new-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(useMallStore.getState().accessToken).toBeNull();
  });

  it('signUp surfaces duplicate-username error', async () => {
    installFetchMock(() => ({
      status: 200,
      body: { status: 1003, msg: '用户名已注册', data: null },
    }));
    await expect(
      signUp({ username: 'dup', password: 'Pass@1', mobile: '13800138001' }),
    ).rejects.toMatchObject({ name: 'GraphQLError', message: '用户名已注册' });
  });

  it('sendResetCode posts mobile', async () => {
    const fetchMock = installFetchMock(() => ({
      status: 200,
      body: { status: 0, data: null },
    }));
    await sendResetCode('13800138000');
    const [url, init] = fetchMock.mock.calls[0] as [string, MockRequestInit];
    expect(url).toBe('/r/LoginApi__sendResetCode');
    expect(JSON.parse(init.body ?? '{}')).toEqual({ mobile: '13800138000' });
  });

  it('sendResetCode surfaces mobile-not-found error', async () => {
    installFetchMock(() => ({
      status: 200,
      body: { status: 1004, msg: '手机号未注册', data: null },
    }));
    await expect(sendResetCode('19900000000')).rejects.toMatchObject({
      name: 'GraphQLError',
      message: '手机号未注册',
    });
  });

  it('resetPassword posts mobile + code + newPassword', async () => {
    const fetchMock = installFetchMock(() => ({
      status: 200,
      body: { status: 0, data: null },
    }));
    await resetPassword({ mobile: '13800138000', code: '123456', newPassword: 'NewPass@1' });
    const [url, init] = fetchMock.mock.calls[0] as [string, MockRequestInit];
    expect(url).toBe('/r/LoginApi__resetPassword');
    expect(JSON.parse(init.body ?? '{}')).toEqual({
      mobile: '13800138000',
      code: '123456',
      newPassword: 'NewPass@1',
    });
  });

  it('resetPassword surfaces invalid-code error', async () => {
    installFetchMock(() => ({
      status: 200,
      body: { status: 1005, msg: '验证码错误或已过期', data: null },
    }));
    await expect(
      resetPassword({ mobile: '13800138000', code: 'bad', newPassword: 'NewPass@1' }),
    ).rejects.toMatchObject({ name: 'GraphQLError', message: '验证码错误或已过期' });
  });

  it('logout clears the store even when the network call fails', async () => {
    installFetchMock(() => ({ status: 500, body: { status: 1, msg: 'boom' } }));
    useMallStore.getState().setAuth({
      accessToken: 'tok-logout',
      userInfo: { userId: 'u', userName: 'u' },
    });

    await expect(logout()).rejects.toBeInstanceOf(GraphQLError);
    expect(useMallStore.getState()).toMatchObject(LOGGED_OUT);
  });

  it('logout injects the stored Authorization header', async () => {
    const fetchMock = installFetchMock(() => ({ status: 200, body: { status: 0, data: null } }));
    useMallStore.getState().setAuth({
      accessToken: 'tok-logout',
      userInfo: { userId: 'u', userName: 'u' },
    });

    await logout();
    const init = fetchMock.mock.calls[0]![1] as MockRequestInit;
    expect(init.headers?.['Authorization']).toBe('Bearer tok-logout');
    expect(useMallStore.getState()).toMatchObject(LOGGED_OUT);
  });
});
