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
// (loadDict identity, dict name): concurrent mounts coalesce into one request
// owned by its own AbortController, with per-consumer subscription counting —
// a single consumer unmounting only decrements the count; the shared request
// is aborted (and its entry removed) only when the last subscriber leaves.
// Resolved option lists are cached so later mounts skip the network entirely.
// Failures are NOT cached — a transient failure must not pin an empty
// dropdown; the next mount retries. Correctness per consumer is guarded by
// the generation counter below (plan 862 L1/L10).
interface SharedDictLoad {
  promise: Promise<DictBean>;
  controller: AbortController;
  refs: number;
  settled: boolean;
}

const inFlightDictLoads = new WeakMap<object, Map<string, SharedDictLoad>>();
const resolvedDictCache = new WeakMap<object, Map<string, ChoiceOption[]>>();
const RESOLVED_DICT_CACHE_LIMIT = 64;

export const __inFlightDictLoadsForTests = inFlightDictLoads;

function releaseSharedDictLoad(byDict: Map<string, SharedDictLoad>, dictName: string, entry: SharedDictLoad): void {
  entry.refs -= 1;
  if (entry.refs > 0 || entry.settled) return;
  // Last subscriber left before settle: tear the shared request down and
  // remove the entry immediately so a late joiner never reuses an aborted load.
  byDict.delete(dictName);
  entry.controller.abort();
}

function loadDictShared(loadDict: (name: string, signal?: AbortSignal) => Promise<DictBean>, dictName: string): { promise: Promise<DictBean>; release: () => void } {
  let byDict = inFlightDictLoads.get(loadDict);
  if (!byDict) {
    byDict = new Map();
    inFlightDictLoads.set(loadDict, byDict);
  }
  const existing = byDict.get(dictName);
  if (existing) {
    existing.refs += 1;
    return { promise: existing.promise, release: () => releaseSharedDictLoad(byDict!, dictName, existing) };
  }
  const controller = new AbortController();
  const entry: SharedDictLoad = {
    refs: 1,
    settled: false,
    controller,
    promise: loadDict(dictName, controller.signal).finally(() => {
      entry.settled = true;
      byDict!.delete(dictName);
    }),
  };
  byDict.set(dictName, entry);
  return { promise: entry.promise, release: () => releaseSharedDictLoad(byDict!, dictName, entry) };
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

    const shared = loadDictShared(loadDict, dictName);
    void shared.promise
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
      shared.release();
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
