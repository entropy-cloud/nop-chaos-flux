import type { DictBean, RendererEnv, SchemaInput } from '@nop-chaos/flux-core';
import {
  clearDictCache,
  configureDictCache,
  dictCacheKey,
  readDictCache,
  setDictCachePending,
} from './dict-cache.js';
import {
  clearPageCache,
  configurePageCache,
  pageCacheKey,
  readPageCache,
  setPageCachePending,
} from './page-cache.js';

function resolveLocale(env: RendererEnv): string {
  return env.locale ?? '';
}

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface LoadFluxPageOptions {
  env: RendererEnv;
  signal?: AbortSignal;
}

/**
 * Loads a remote page schema by path through `env.pageProvider`, with a
 * process-global LRU cache (locale-keyed) and in-flight de-duplication.
 * Returns a deep clone so callers cannot mutate the cached schema.
 *
 * Throws when `env.pageProvider` is not configured.
 */
export async function loadFluxPage(
  path: string,
  options: LoadFluxPageOptions,
): Promise<SchemaInput> {
  const { env, signal } = options;
  const provider = env.pageProvider;

  if (!provider) {
    throw new Error(
      'loadFluxPage: env.pageProvider is not configured. Wire a FluxPageProvider ' +
        '(backed by PageProvider__getPage) to load remote pages.',
    );
  }

  const key = pageCacheKey(resolveLocale(env), path);
  const hit = readPageCache<SchemaInput>(key);

  if (hit.kind === 'resolved') {
    return clone(hit.value);
  }

  if (hit.kind === 'pending') {
    return clone(await hit.promise) as SchemaInput;
  }

  const promise = setPageCachePending(key, provider.getPage(path, signal));
  return clone(await promise) as SchemaInput;
}

export interface LoadDictOptions {
  env: RendererEnv;
  signal?: AbortSignal;
}

/**
 * Loads a DictBean by name through `env.dictProvider`, with a process-global
 * short-TTL cache (locale-keyed) and in-flight de-duplication. Errors are not
 * cached. Returns a deep clone of the cached bean.
 *
 * Throws when `env.dictProvider` is not configured.
 */
export async function loadDict(
  dictName: string,
  options: LoadDictOptions,
): Promise<DictBean> {
  const { env, signal } = options;
  const provider = env.dictProvider;

  if (!provider) {
    throw new Error(
      'loadDict: env.dictProvider is not configured. Wire a FluxDictProvider ' +
        '(backed by DictProvider__getDict) to resolve @dict: URLs.',
    );
  }

  const key = dictCacheKey(resolveLocale(env), dictName);
  const hit = readDictCache<DictBean>(key, Date.now());

  if (hit.kind === 'resolved') {
    return clone(hit.value);
  }

  if (hit.kind === 'pending') {
    return clone(await hit.promise) as DictBean;
  }

  const promise = setDictCachePending(key, provider.getDict(dictName, signal));
  return clone(await promise) as DictBean;
}

export {
  clearDictCache,
  clearPageCache,
  configureDictCache,
  configurePageCache,
};
