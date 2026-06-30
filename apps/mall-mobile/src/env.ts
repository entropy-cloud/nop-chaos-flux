import type { RendererEnv, ExecutableApiRequest, ApiResponse, ApiRequestContext } from '@nop-chaos/flux-core';
import { toast } from '@nop-chaos/ui';

export interface NopEnvelope<T = unknown> {
  status?: number;
  code?: number;
  msg?: string;
  data?: T;
  errors?: unknown;
}

export interface EnvHooks {
  getToken?: () => string | null;
  refreshAccessToken?: () => Promise<string | null>;
  onUnauthorized?: () => void;
  navigate?: (to: string | number, options?: { replace?: boolean }) => void;
  confirm?: (message: string, title?: string) => Promise<boolean>;
}

const noop = () => undefined;

export function isNopError(body: NopEnvelope | null | undefined): boolean {
  if (!body) return false;
  const code = body.status ?? body.code;
  return typeof code === 'number' && code !== 0;
}

export function extractErrorMessage(body: NopEnvelope | undefined, fallback: string): string {
  if (!body) return fallback;
  return body.msg?.trim() || fallback;
}

async function readResponseBody(res: Response): Promise<NopEnvelope | unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as NopEnvelope;
  } catch {
    return text;
  }
}

export function createFetcher(hooks: EnvHooks = {}) {
  async function execute<T>(
    api: ExecutableApiRequest,
    options: { injectToken: boolean; forcedToken?: string },
  ): Promise<ApiResponse<T>> {
    const method = (api.method ?? 'post').toUpperCase();
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(api.headers ?? {}),
    };
    if (options.forcedToken) {
      headers.Authorization = `Bearer ${options.forcedToken}`;
    } else if (options.injectToken) {
      const token = hooks.getToken?.() ?? null;
      if (token && !headers.Authorization && !headers.authorization) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    const init: RequestInit = { method, headers };
    if (method !== 'GET' && method !== 'HEAD') {
      headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
      init.body = api.data === undefined ? undefined : (JSON.stringify(api.data) as BodyInit);
    }

    const res = await fetch(api.url, init);
    const body = (await readResponseBody(res)) as NopEnvelope | unknown;

    const envelope = (body && typeof body === 'object' ? (body as NopEnvelope) : null) ?? null;
    const httpOk = res.status >= 200 && res.status < 300;

    if (envelope && typeof envelope.status === 'number') {
      const ok = envelope.status === 0 && httpOk;
      return {
        ok,
        status: res.status,
        data: (envelope.data ?? envelope) as T,
        headers: resHeaders(res),
        raw: body,
      };
    }

    return {
      ok: httpOk,
      status: res.status,
      data: (envelope ?? body) as T,
      headers: resHeaders(res),
      raw: body,
    };
  }

  return async function fetcher<T = unknown>(
    api: ExecutableApiRequest,
    _ctx: ApiRequestContext,
  ): Promise<ApiResponse<T>> {
    const first = await execute<T>(api, { injectToken: true });

    if (first.status !== 401) return first;

    if (hooks.refreshAccessToken) {
      const newToken = await hooks.refreshAccessToken();
      if (newToken) {
        return execute<T>(api, { injectToken: false, forcedToken: newToken });
      }
    }

    hooks.onUnauthorized?.();
    return first;
  };
}

function resHeaders(res: Response): Record<string, string> {
  const out: Record<string, string> = {};
  res.headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

export function createNotify() {
  return function notify(level: 'info' | 'success' | 'warning' | 'error', message: string) {
    const text = String(message ?? '').trim();
    if (!text) return;
    switch (level) {
      case 'success':
        toast.success(text);
        break;
      case 'warning':
        toast.warning(text);
        break;
      case 'error':
        toast.error(text);
        break;
      default:
        toast.info(text);
        break;
    }
  };
}

export function createConfirm() {
  return async function confirm(message: string, _title?: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    return window.confirm(message);
  };
}

export function createEnv(hooks: EnvHooks = {}): RendererEnv {
  return {
    fetcher: createFetcher(hooks),
    notify: createNotify(),
    confirm: hooks.confirm ?? createConfirm(),
    navigate: hooks.navigate ?? noop,
  };
}
