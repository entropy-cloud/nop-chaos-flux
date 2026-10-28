import { getRefreshToken, useMallStore, type LoginPayload } from '../store';

const REFRESH_URL = '/r/LoginApi__refreshToken';

let inflightRefresh: Promise<string | null> | null = null;

interface RefreshResponse {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  userInfo?: unknown;
}

export function resetRefreshInflightForTesting(): void {
  inflightRefresh = null;
}

export function isInflightRefreshActive(): boolean {
  return inflightRefresh !== null;
}

export async function refreshAccessToken(): Promise<string | null> {
  if (inflightRefresh) return inflightRefresh;

  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  inflightRefresh = (async () => {
    try {
      const res = await fetch(REFRESH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (res.status < 200 || res.status >= 300) {
        onRefreshFailed();
        return null;
      }
      const body = (await res.json()) as { status?: number; data?: RefreshResponse } | RefreshResponse;
      const envelope = body as { status?: number; data?: RefreshResponse };
      const payload = envelope && typeof envelope.data === 'object' ? envelope.data : (body as RefreshResponse);
      const status = envelope?.status;
      const newToken = payload?.accessToken;
      if (!newToken || (typeof status === 'number' && status !== 0)) {
        onRefreshFailed();
        return null;
      }
      const next: LoginPayload = {
        accessToken: newToken,
        refreshToken: payload.refreshToken ?? refreshToken,
        expiresIn: payload.expiresIn,
        userInfo: (payload.userInfo as LoginPayload['userInfo']) ?? useMallStore.getState().userInfo ?? undefined,
      };
      useMallStore.getState().setAuth(next);
      return newToken;
    } catch {
      onRefreshFailed();
      return null;
    } finally {
      inflightRefresh = null;
    }
  })();

  return inflightRefresh;
}

function onRefreshFailed(): void {
  useMallStore.getState().clearAuth();
}
