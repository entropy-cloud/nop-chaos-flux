import type { ApiResponse } from '@nop-chaos/flux-core';
import { getAppEnv } from '../env-instance';

export class RpcError extends Error {
  readonly status: number;
  readonly code?: number;
  constructor(message: string, status: number, code?: number) {
    super(message);
    this.name = 'RpcError';
    this.status = status;
    this.code = code;
  }
}

export interface PageBean<T> {
  items?: T[];
  total?: number;
  offset?: number;
  limit?: number;
}

export async function postRpc<T>(url: string, data: object): Promise<T> {
  const env = getAppEnv();
  const res: ApiResponse<T> = await env.fetcher<T>(
    { url, method: 'POST', data: data as never },
    { env, scope: { readOwn: () => ({}) } as never },
  );
  if (!res.ok) {
    const msg = pickErrorMessage(res.raw) ?? `请求失败 (${res.status})`;
    throw new RpcError(msg, res.status);
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

export function asPage<T>(raw: unknown): PageBean<T> {
  if (raw && typeof raw === 'object') {
    return raw as PageBean<T>;
  }
  return {};
}
