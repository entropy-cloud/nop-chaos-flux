import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createMallStore,
  createMemoryStorage,
  selectIsLoggedIn,
  useMallStore,
  getToken,
  getRefreshToken,
  AUTH_STORAGE_KEY,
} from './index';

function clearDefaultStorage() {
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // ignore (non-browser or restricted storage)
  }
}

describe('mall store auth + cart badge (singleton, default storage)', () => {
  beforeEach(() => {
    clearDefaultStorage();
    useMallStore.getState().reset();
  });

  afterEach(() => {
    clearDefaultStorage();
    useMallStore.getState().reset();
  });

  it('starts logged out with zero cart badge', () => {
    const state = useMallStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.userInfo).toBeNull();
    expect(state.cartBadge).toBe(0);
    expect(selectIsLoggedIn(state)).toBe(false);
    expect(getToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it('setAuth writes token + userInfo and flips isLoggedIn', () => {
    useMallStore.getState().setAuth({
      accessToken: 'tok-1',
      refreshToken: 'refresh-1',
      expiresIn: 3600,
      userInfo: { userId: 'u1', userName: 'alice', nickName: 'Alice' },
    });

    const state = useMallStore.getState();
    expect(state.accessToken).toBe('tok-1');
    expect(state.refreshToken).toBe('refresh-1');
    expect(state.userInfo?.userId).toBe('u1');
    expect(selectIsLoggedIn(state)).toBe(true);
    expect(getToken()).toBe('tok-1');
    expect(getRefreshToken()).toBe('refresh-1');
  });

  it('clearAuth wipes auth but keeps cart badge', () => {
    useMallStore.getState().setAuth({
      accessToken: 'tok-2',
      userInfo: { userId: 'u2', userName: 'bob' },
    });
    useMallStore.getState().setCartBadge(5);

    useMallStore.getState().clearAuth();

    const state = useMallStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.userInfo).toBeNull();
    expect(state.cartBadge).toBe(5);
    expect(selectIsLoggedIn(state)).toBe(false);
  });

  it('setCartBadge clamps to non-negative integers', () => {
    useMallStore.getState().setCartBadge(-3);
    expect(useMallStore.getState().cartBadge).toBe(0);
    useMallStore.getState().setCartBadge(2.9);
    expect(useMallStore.getState().cartBadge).toBe(2);
  });

  it('incCartBadge adds and never goes negative', () => {
    useMallStore.getState().setCartBadge(2);
    useMallStore.getState().incCartBadge(3);
    expect(useMallStore.getState().cartBadge).toBe(5);
    useMallStore.getState().incCartBadge(-10);
    expect(useMallStore.getState().cartBadge).toBe(0);
  });
});

describe('mall store persistence (injected memory storage)', () => {
  it('persist partial only contains accessToken/refreshToken/userInfo (not cartBadge)', () => {
    const storage = createMemoryStorage();
    const store = createMallStore(() => storage);

    store.getState().setAuth({
      accessToken: 'tok-3',
      userInfo: { userId: 'u3', userName: 'carol' },
    });
    store.getState().setCartBadge(9);

    const raw = storage.getItem(AUTH_STORAGE_KEY) as string | null;
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!) as { state: Record<string, unknown> };
    expect(parsed.state.accessToken).toBe('tok-3');
    expect(parsed.state.userInfo).toEqual({ userId: 'u3', userName: 'carol' });
    expect(parsed.state).not.toHaveProperty('cartBadge');
  });

  it('rehydrates token + userInfo from seeded storage', () => {
    const seeded = JSON.stringify({
      state: {
        accessToken: 'tok-4',
        refreshToken: 'refresh-4',
        userInfo: { userId: 'u4', userName: 'dave' },
      },
      version: 1,
    });
    const storage = createMemoryStorage({ [AUTH_STORAGE_KEY]: seeded });
    const store = createMallStore(() => storage);

    const state = store.getState();
    expect(state.accessToken).toBe('tok-4');
    expect(state.refreshToken).toBe('refresh-4');
    expect(state.userInfo).toEqual({ userId: 'u4', userName: 'dave' });
    expect(selectIsLoggedIn(state)).toBe(true);
  });

  it('clearAuth writes empty auth back to storage', () => {
    const storage = createMemoryStorage();
    const store = createMallStore(() => storage);

    store.getState().setAuth({ accessToken: 'tok-5', userInfo: { userId: 'u5', userName: 'eve' } });
    store.getState().clearAuth();

    const raw = storage.getItem(AUTH_STORAGE_KEY) as string | null;
    const parsed = JSON.parse(raw!) as { state: Record<string, unknown> };
    expect(parsed.state.accessToken).toBeNull();
    expect(parsed.state.userInfo).toBeNull();
  });
});
