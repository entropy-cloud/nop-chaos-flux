import type { ApiResponse } from '@nop-chaos/flux-core';
import type { MallUserInfo } from '../store';
import { useMallStore } from '../store';
import { getAppEnv } from '../env-instance';

const LOGIN_URL = '/r/LoginApi__login';
const SIGNUP_URL = '/r/LoginApi__signUp';
const SEND_RESET_CODE_URL = '/r/LoginApi__sendResetCode';
const RESET_PASSWORD_URL = '/r/LoginApi__resetPassword';
const LOGOUT_URL = '/r/LoginApi__logout';

export const LOGIN_TYPE_USERNAME_PASSWORD = 1;

export interface LoginArgs {
  principalId: string;
  principalSecret: string;
  loginType?: number;
}

export interface LoginResult {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  userInfo?: MallUserInfo;
}

export interface SignUpArgs {
  username: string;
  password: string;
  mobile: string;
}

export interface ResetPasswordArgs {
  mobile: string;
  code: string;
  newPassword: string;
}

export class GraphQLError extends Error {
  readonly status: number;
  readonly code?: number;
  constructor(message: string, status: number, code?: number) {
    super(message);
    this.name = 'GraphQLError';
    this.status = status;
    this.code = code;
  }
}

function toUserInfo(raw: unknown): MallUserInfo | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  if (typeof r.userId !== 'string' && typeof r.userId !== 'number') return undefined;
  return {
    userId: String(r.userId),
    userName: typeof r.userName === 'string' ? r.userName : String(r.userId),
    nickName: typeof r.nickName === 'string' ? r.nickName : undefined,
    avatar: typeof r.avatar === 'string' ? r.avatar : undefined,
  };
}

async function postRpc<T>(url: string, data: object): Promise<T> {
  const env = getAppEnv();
  const res: ApiResponse<T> = await env.fetcher<T>(
    { url, method: 'POST', data: data as never },
    { env, scope: { readOwn: () => ({}) } as never },
  );
  if (!res.ok) {
    const msg = pickErrorMessage(res.raw) ?? `请求失败 (${res.status})`;
    throw new GraphQLError(msg, res.status);
  }
  return res.data;
}

function pickErrorMessage(raw: unknown): string | undefined {
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    if (typeof r.msg === 'string' && r.msg.trim()) return r.msg;
  }
  return undefined;
}

export async function login(args: LoginArgs): Promise<LoginResult> {
  const data = await postRpc<LoginResult>(LOGIN_URL, {
    principalId: args.principalId,
    principalSecret: args.principalSecret,
    loginType: args.loginType ?? LOGIN_TYPE_USERNAME_PASSWORD,
  });
  const result: LoginResult = {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresIn: data.expiresIn,
    userInfo: data.userInfo ?? toUserInfo(data),
  };
  useMallStore.getState().setAuth(result);
  return result;
}

export async function signUp(args: SignUpArgs): Promise<{ userId: string }> {
  const data = await postRpc<{ userId?: string }>(SIGNUP_URL, args);
  if (!data?.userId) {
    throw new GraphQLError('注册响应缺失 userId', 200);
  }
  return { userId: String(data.userId) };
}

export async function sendResetCode(mobile: string): Promise<void> {
  await postRpc(SEND_RESET_CODE_URL, { mobile });
}

export async function resetPassword(args: ResetPasswordArgs): Promise<void> {
  await postRpc(RESET_PASSWORD_URL, args);
}

export async function logout(): Promise<void> {
  try {
    await postRpc(LOGOUT_URL, {});
  } finally {
    useMallStore.getState().clearAuth();
  }
}
