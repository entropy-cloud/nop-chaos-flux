import { useEffect, useRef, useState } from 'react';
import type { ChoiceOption } from './input-choice-renderers.js';
import { useRendererEnv } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import type { DictBean } from '@nop-chaos/flux-core';

export interface DictOptionsState {
  options: ChoiceOption[];
  loading: boolean;
  errorMessage?: string;
}

// Cross-instance dedup: N fields declaring the same `dict` used to issue N
// identical loadDict calls (plan 2026-09-29-3 R2-P10). Loads are shared per
// (loadDict identity, dict name): concurrent mounts coalesce into one promise;
// resolved option lists are cached so later mounts skip the network entirely.
// Failures are NOT cached — a transient failure must not pin an empty
// dropdown; the next mount retries. Hosts that abort (signal) tear only their
// own subscription out; the shared promise result stays correct per-instance
// via the generation counter below.
const inFlightDictLoads = new Map<object, Map<string, Promise<DictBean>>>();
const resolvedDictCache = new WeakMap<object, Map<string, ChoiceOption[]>>();
const RESOLVED_DICT_CACHE_LIMIT = 64;

function loadDictShared(loadDict: (name: string, signal?: AbortSignal) => Promise<DictBean>, dictName: string, signal: AbortSignal): Promise<DictBean> {
  let byDict = inFlightDictLoads.get(loadDict);
  if (!byDict) {
    byDict = new Map();
    inFlightDictLoads.set(loadDict, byDict);
  }
  const existing = byDict.get(dictName);
  if (existing) return existing;
  const promise = loadDict(dictName, signal).finally(() => {
    byDict!.delete(dictName);
  });
  byDict.set(dictName, promise);
  return promise;
}

function getCachedDictOptions(loadDict: object, dictName: string): ChoiceOption[] | undefined {
  return resolvedDictCache.get(loadDict)?.get(dictName);
}

function putCachedDictOptions(loadDict: object, dictName: string, options: ChoiceOption[]): void {
  let byDict = resolvedDictCache.get(loadDict);
  if (!byDict) {
    byDict = new Map();
    resolvedDictCache.set(loadDict, byDict);
  }
  if (byDict.size >= RESOLVED_DICT_CACHE_LIMIT) {
    byDict.clear();
  }
  byDict.set(dictName, options);
}

export function useDictOptions(dictName: string | undefined): DictOptionsState {
  const { loadDict } = useRendererEnv();
  const cachedInitial = dictName && loadDict ? getCachedDictOptions(loadDict, dictName) : undefined;
  const [state, setState] = useState<DictOptionsState>(() =>
    cachedInitial
      ? { options: cachedInitial, loading: false, errorMessage: undefined }
      : { options: [], loading: false },
  );
  const genRef = useRef(0);

  const [prevDictName, setPrevDictName] = useState(dictName);
  if (prevDictName !== dictName) {
    setPrevDictName(dictName);
    // Resolved-cache reads happen at init/reset (render time) — an effect
    // would have to setState synchronously, which the compiler forbids.
    const cachedReset = dictName && loadDict ? getCachedDictOptions(loadDict, dictName) : undefined;
    setState(
      cachedReset
        ? { options: cachedReset, loading: false, errorMessage: undefined }
        : { options: [], loading: !!dictName, errorMessage: undefined },
    );
  }

  useEffect(() => {
    if (!dictName || !loadDict) return;

    const gen = ++genRef.current;

    const controller = new AbortController();
    void loadDictShared(loadDict, dictName, controller.signal)
      .then((bean) => {
        const options = (bean.options ?? []).map((opt) => ({
          label: opt.label,
          value: opt.value,
          disabled: false,
        }));
        putCachedDictOptions(loadDict, dictName, options);
        if (genRef.current !== gen) return;
        setState({ options, loading: false, errorMessage: undefined });
      })
      .catch((error) => {
        if (genRef.current !== gen) return;
        console.warn(`[flux-select] Failed to load dict "${dictName}":`, error);
        setState({ options: [], loading: false, errorMessage: t('flux.form.failedToLoadOptions') });
      });

    return () => {
      controller.abort();
    };
  }, [dictName, loadDict]);

  if (!dictName) return { options: [], loading: false };

  if (!loadDict) {
    console.warn(
      `[flux-select] dict "${dictName}" requested but env.loadDict is not configured.`,
    );
    return { options: [], loading: false };
  }

  return state;
}
