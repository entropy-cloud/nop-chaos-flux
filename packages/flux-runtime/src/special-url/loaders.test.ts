import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DictBean, RendererEnv, SchemaInput } from '@nop-chaos/flux-core';
import {
  clearDictCache,
  clearPageCache,
  configureDictCache,
  configurePageCache,
  loadDict,
  loadFluxPage,
} from './loaders.js';

function createEnv(overrides: Partial<RendererEnv> = {}): RendererEnv {
  return {
    fetcher: async <T>() => ({ status: 0, data: null as T }),
    notify: () => undefined,
    ...overrides,
  };
}

const ROLE_DICT: DictBean = {
  name: 'user/role',
  options: [
    { label: '管理员', value: 'admin' },
    { label: '用户', value: 'user' },
  ],
};

beforeEach(() => {
  clearDictCache();
  clearPageCache();
  configureDictCache({ ttlMs: 20_000 });
  configurePageCache({ max: 50 });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('loadDict', () => {
  it('calls dictProvider on cache miss and caches the bean', async () => {
    const getDict = vi.fn(async () => ROLE_DICT);
    const env = createEnv({ dictProvider: { getDict }, locale: 'zh-CN' });

    const first = await loadDict('user/role', { env });
    const second = await loadDict('user/role', { env });

    expect(first).toEqual(ROLE_DICT);
    expect(second).toEqual(ROLE_DICT);
    expect(getDict).toHaveBeenCalledTimes(1);
    expect(getDict).toHaveBeenCalledWith('user/role', undefined);
  });

  it('returns a clone so callers cannot mutate the cache', async () => {
    const getDict = vi.fn(async () => ROLE_DICT);
    const env = createEnv({ dictProvider: { getDict } });

    const first = await loadDict('user/role', { env });
    first.options.push({ label: 'X', value: 'x' });
    const second = await loadDict('user/role', { env });

    expect(second.options).toHaveLength(2);
  });

  it('re-fetches after the TTL expires', async () => {
    configureDictCache({ ttlMs: 20_000 });
    const getDict = vi.fn(async () => ROLE_DICT);
    const env = createEnv({ dictProvider: { getDict } });

    vi.useFakeTimers();
    await loadDict('user/role', { env });
    vi.advanceTimersByTime(19_999);
    await loadDict('user/role', { env });
    expect(getDict).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    await loadDict('user/role', { env });
    expect(getDict).toHaveBeenCalledTimes(2);
  });

  it('does not cache failures (next call re-fetches)', async () => {
    let calls = 0;
    const getDict = vi.fn(async () => {
      calls += 1;
      if (calls === 1) {
        throw new Error('boom');
      }
      return ROLE_DICT;
    });
    const env = createEnv({ dictProvider: { getDict } });

    await expect(loadDict('user/role', { env })).rejects.toThrow('boom');
    const ok = await loadDict('user/role', { env });
    expect(ok).toEqual(ROLE_DICT);
    expect(getDict).toHaveBeenCalledTimes(2);
  });

  it('de-duplicates concurrent in-flight requests', async () => {
    let resolveFn: ((value: DictBean) => void) | undefined;
    const getDict = vi.fn(
      () =>
        new Promise<DictBean>((resolve) => {
          resolveFn = resolve;
        }),
    );
    const env = createEnv({ dictProvider: { getDict } });

    const p1 = loadDict('user/role', { env });
    const p2 = loadDict('user/role', { env });
    resolveFn?.(ROLE_DICT);

    const [a, b] = await Promise.all([p1, p2]);
    expect(a).toEqual(ROLE_DICT);
    expect(b).toEqual(ROLE_DICT);
    expect(getDict).toHaveBeenCalledTimes(1);
  });

  it('isolates cache entries by locale', async () => {
    const getDict = vi.fn(async () => ROLE_DICT);
    const envZh = createEnv({ dictProvider: { getDict }, locale: 'zh-CN' });
    const envEn = createEnv({ dictProvider: { getDict }, locale: 'en-US' });

    await loadDict('user/role', { env: envZh });
    await loadDict('user/role', { env: envEn });

    expect(getDict).toHaveBeenCalledTimes(2);
  });

  it('uses empty-string locale segment when env.locale is absent', async () => {
    const getDict = vi.fn(async () => ROLE_DICT);
    const env = createEnv({ dictProvider: { getDict } });

    await loadDict('user/role', { env });
    await loadDict('user/role', { env });

    expect(getDict).toHaveBeenCalledTimes(1);
  });

  it('throws a clear error when dictProvider is not configured', async () => {
    const env = createEnv();
    await expect(loadDict('user/role', { env })).rejects.toThrow(/dictProvider is not configured/);
  });
});

describe('loadFluxPage', () => {
  it('calls pageProvider on cache miss and caches the schema', async () => {
    const schema = { type: 'page', body: [] };
    const getPage = vi.fn(async () => schema);
    const env = createEnv({ pageProvider: { getPage }, locale: 'zh-CN' });

    const first = await loadFluxPage('/p/a', { env });
    const second = await loadFluxPage('/p/a', { env });

    expect(first).toEqual(schema);
    expect(second).toEqual(schema);
    expect(getPage).toHaveBeenCalledTimes(1);
    expect(getPage).toHaveBeenCalledWith('/p/a', undefined);
  });

  it('returns a clone so callers cannot mutate the cache', async () => {
    const schema: SchemaInput = { type: 'page', body: [{ type: 'text', text: 'x' }] };
    const getPage = vi.fn(async () => schema);
    const env = createEnv({ pageProvider: { getPage } });

    const first = (await loadFluxPage('/p/a', { env })) as unknown as {
      body: Array<{ text: string }>;
    };
    first.body.push({ text: 'mutated' });
    const second = (await loadFluxPage('/p/a', { env })) as unknown as { body: unknown[] };

    expect(second.body).toHaveLength(1);
  });

  it('evicts the oldest entry when the LRU cap is reached', async () => {
    configurePageCache({ max: 2 });
    const getPage = vi.fn(async (path: string) => ({ type: 'page', path }) as SchemaInput);
    const env = createEnv({ pageProvider: { getPage } });

    await loadFluxPage('/p/1', { env });
    await loadFluxPage('/p/2', { env });
    await loadFluxPage('/p/3', { env }); // evicts /p/1
    await loadFluxPage('/p/1', { env }); // re-fetch because it was evicted

    expect(getPage).toHaveBeenCalledTimes(4);
  });

  it('marks an entry recently-used on access (not evicted before older ones)', async () => {
    configurePageCache({ max: 2 });
    const getPage = vi.fn(async (path: string) => ({ type: 'page', path }) as SchemaInput);
    const env = createEnv({ pageProvider: { getPage } });

    await loadFluxPage('/p/1', { env });
    await loadFluxPage('/p/2', { env });
    await loadFluxPage('/p/1', { env }); // /p/1 is now most-recent; /p/2 is oldest
    await loadFluxPage('/p/3', { env }); // evicts /p/2, not /p/1
    await loadFluxPage('/p/1', { env }); // still cached

    expect(getPage).toHaveBeenCalledTimes(3);
  });

  it('de-duplicates concurrent in-flight requests', async () => {
    let resolveFn: ((value: SchemaInput) => void) | undefined;
    const getPage = vi.fn(
      () =>
        new Promise<SchemaInput>((resolve) => {
          resolveFn = resolve;
        }),
    );
    const env = createEnv({ pageProvider: { getPage } });

    const p1 = loadFluxPage('/p/a', { env });
    const p2 = loadFluxPage('/p/a', { env });
    resolveFn?.({ type: 'page' });
    await Promise.all([p1, p2]);

    expect(getPage).toHaveBeenCalledTimes(1);
  });

  it('does not cache failures', async () => {
    let calls = 0;
    const getPage = vi.fn(async (): Promise<SchemaInput> => {
      calls += 1;
      if (calls === 1) {
        throw new Error('boom');
      }
      return { type: 'page' };
    });
    const env = createEnv({ pageProvider: { getPage } });

    await expect(loadFluxPage('/p/a', { env })).rejects.toThrow('boom');
    await loadFluxPage('/p/a', { env });
    expect(getPage).toHaveBeenCalledTimes(2);
  });

  it('isolates cache entries by locale', async () => {
    const getPage = vi.fn(async () => ({ type: 'page' }) as SchemaInput);
    const envZh = createEnv({ pageProvider: { getPage }, locale: 'zh-CN' });
    const envEn = createEnv({ pageProvider: { getPage }, locale: 'en-US' });

    await loadFluxPage('/p/a', { env: envZh });
    await loadFluxPage('/p/a', { env: envEn });

    expect(getPage).toHaveBeenCalledTimes(2);
  });

  it('throws a clear error when pageProvider is not configured', async () => {
    const env = createEnv();
    await expect(loadFluxPage('/p/a', { env })).rejects.toThrow(/pageProvider is not configured/);
  });
});
