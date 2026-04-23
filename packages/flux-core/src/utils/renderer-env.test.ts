import { describe, expect, it, vi } from 'vitest';
import type { ApiFetcher, RendererEnv } from '../types/renderer-api';
import { decorateRendererEnv } from './renderer-env';

function createEnv(): RendererEnv {
  const fetcher: ApiFetcher = async <T>(api: unknown) => ({
    ok: true,
    status: 200,
    data: api as T
  });

  return {
    fetcher: vi.fn(fetcher) as unknown as ApiFetcher,
    notify: vi.fn(),
    navigate: vi.fn(),
    monitor: {}
  };
}

describe('decorateRendererEnv', () => {
  it('returns the same env when no hooks are provided', () => {
    const env = createEnv();

    expect(decorateRendererEnv(env, {})).toBe(env);
  });

  it('decorates fetcher calls without mutating other env fields', async () => {
    const env = createEnv();
    const fetchHook = vi.fn(async (next, api, ctx) => next({ ...api, tagged: true }, ctx));
    const decorated = decorateRendererEnv(env, { fetcher: fetchHook });

    const result = await decorated.fetcher<{ tagged: boolean }>({ url: '/api/test' }, {
      env: decorated,
      scope: {} as never
    });

    expect(fetchHook).toHaveBeenCalledTimes(1);
    expect(env.fetcher).toHaveBeenCalledTimes(1);
    expect(result.data).toMatchObject({ url: '/api/test', tagged: true });
    expect(decorated.notify).toBe(env.notify);
    expect(decorated.navigate).toBe(env.navigate);
  });

  it('decorates notify and navigate independently', () => {
    const env = createEnv();
    const calls: string[] = [];
    const decorated = decorateRendererEnv(env, {
      notify(next, level, message) {
        calls.push(`notify:${level}:${message}`);
        next(level, `${message}!`);
      },
      navigate(next, to, options) {
        calls.push(`navigate:${String(to)}`);
        next(to, options);
      }
    });

    decorated.notify('warning', 'watch out');
    decorated.navigate?.('/target', { replace: true });

    expect(calls).toEqual(['notify:warning:watch out', 'navigate:/target']);
    expect(env.notify).toHaveBeenCalledWith('warning', 'watch out!');
    expect(env.navigate).toHaveBeenCalledWith('/target', { replace: true });
  });
});
