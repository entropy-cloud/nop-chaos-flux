import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';

export interface MallUserInfo {
  userId: string;
  userName: string;
  nickName?: string;
  avatar?: string;
}

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  userInfo: MallUserInfo | null;
}

export interface LoginPayload {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  userInfo?: MallUserInfo;
}

interface MallStoreState extends AuthState {
  cartBadge: number;
  setAuth: (payload: LoginPayload) => void;
  setUserInfo: (info: MallUserInfo | null) => void;
  clearAuth: () => void;
  setCartBadge: (count: number) => void;
  incCartBadge: (delta?: number) => void;
  reset: () => void;
}

export const AUTH_STORAGE_KEY = 'mall-mobile-auth';

const initialState: AuthState = {
  accessToken: null,
  refreshToken: null,
  userInfo: null,
};

function resolvePersistentStorage(): StateStorage {
  if (typeof window === 'undefined') return createMemoryStorage();
  try {
    const probeKey = '__mall_mobile_storage_probe__';
    window.localStorage.setItem(probeKey, '1');
    window.localStorage.removeItem(probeKey);
    return window.localStorage;
  } catch {
    return createMemoryStorage();
  }
}

export function createMallStore(getStorage: () => StateStorage = resolvePersistentStorage) {
  return create<MallStoreState>()(
    persist(
      (set) => ({
        ...initialState,
        cartBadge: 0,
        setAuth: (payload) =>
          set({
            accessToken: payload.accessToken,
            refreshToken: payload.refreshToken ?? null,
            userInfo: payload.userInfo ?? null,
          }),
        setUserInfo: (info) => set({ userInfo: info }),
        clearAuth: () => set({ ...initialState }),
        setCartBadge: (count) => set({ cartBadge: Math.max(0, Math.floor(count)) }),
        incCartBadge: (delta = 1) =>
          set((state) => ({ cartBadge: Math.max(0, state.cartBadge + delta) })),
        reset: () => set({ ...initialState, cartBadge: 0 }),
      }),
      {
        name: AUTH_STORAGE_KEY,
        version: 1,
        storage: createJSONStorage(getStorage),
        partialize: (state) => ({
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
          userInfo: state.userInfo,
        }),
      },
    ),
  );
}

export const useMallStore = createMallStore();

export function createMemoryStorage(seed: Record<string, string> = {}): StateStorage {
  const map = new Map<string, string>(Object.entries(seed));
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

export function selectIsLoggedIn(state: MallStoreState): boolean {
  return !!state.accessToken;
}

export function getToken(): string | null {
  return useMallStore.getState().accessToken;
}

export function getRefreshToken(): string | null {
  return useMallStore.getState().refreshToken;
}
