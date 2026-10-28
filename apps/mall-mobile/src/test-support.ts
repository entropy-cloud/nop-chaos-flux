import { vi } from 'vitest';

export interface MockRequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export type FetchResponder = (url: string, init: MockRequestInit) => {
  status: number;
  body: unknown;
};

export function envelope(data: unknown, status = 0, msg = 'ok') {
  return { status, msg, data };
}

export function installFetchMock(responder: FetchResponder) {
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

export function readBody(init?: MockRequestInit): Record<string, unknown> {
  if (!init?.body) return {};
  try {
    return JSON.parse(init.body) as Record<string, unknown>;
  } catch {
    return {};
  }
}
