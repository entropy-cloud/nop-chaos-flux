import React from 'react';
import type { ActionSchema } from '@nop-chaos/flux-core';
import type { RendererHelpers } from '@nop-chaos/flux-react';
import type { TreeSourceConfig } from '@nop-chaos/flux-renderers-form';
import {
  buildTreeOptionMetaList,
  mergeChildOptions,
  type TreeOptionConfig,
  type TreeOptionMeta,
} from './tree-options.js';

export interface TreeRemoteSearchResult {
  remoteOptions: TreeOptionMeta[] | null;
  loading: boolean;
  error: string | undefined;
}

export interface TreeLazyNodeState {
  loading: boolean;
  error?: string;
}

/**
 * Execute a tree source config (formula or action) against a scope patched
 * with parameter values (e.g. `{ searchQuery }` or `{ expandedNodeValue }`).
 *
 * Uses `helpers.dispatch` / `helpers.evaluate` rather than
 * `helpers.executeSource` because `executeSource` does not currently propagate
 * the caller-provided scope through `mergeActionContext` — the render scope
 * would override the child scope and the patched parameter would be invisible
 * to the fetcher. Both paths create a patched one-shot scope and pair it with
 * `disposeScope`: the formula path disposes immediately after the synchronous
 * evaluation, the action path disposes once the async dispatch has settled
 * (the scope must stay alive while the fetcher reads it).
 */
export async function executeTreeSource(
  config: TreeSourceConfig,
  helpers: RendererHelpers,
  patch: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<{ ok: boolean; data?: unknown; error?: unknown }> {
  if (config.formula !== undefined) {
    const scope = helpers.createScope(patch);
    try {
      const value = helpers.evaluate(config.formula, scope);
      return { ok: true, data: value };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err : new Error(String(err)) };
    } finally {
      helpers.disposeScope(scope.id);
    }
  }
  if (!config.action) {
    return { ok: false, error: new Error('Tree source requires action or formula') };
  }
  const actionInput = { ...config } as unknown as ActionSchema;
  const scope = helpers.createScope(patch);
  try {
    const result = await helpers.dispatch(actionInput, { scope, signal });
    return result;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err : new Error(String(err)) };
  } finally {
    helpers.disposeScope(scope.id);
  }
}

/**
 * Owns remote (data-source-driven) tree search.
 *
 * Caller wires `query` via the {@link useTreeOptionListController.onQueryChange}
 * callback. This hook debounces (300ms) and then invokes executeTreeSource with
 * `{ searchQuery: <trimmed query> }`. Schema authors reference `${searchQuery}`
 * in the `searchSource` config's `args.data` / formula.
 *
 * Returns `remoteOptions: null` while inactive (no query or disabled) so the
 * caller falls back to static options.
 */
export function useTreeRemoteSearch(input: {
  query: string;
  searchSource?: TreeSourceConfig;
  searchable: boolean;
  disabled: boolean;
  helpers: RendererHelpers;
  config: TreeOptionConfig;
}): TreeRemoteSearchResult {
  const { query, searchSource, searchable, disabled, helpers, config } = input;
  const active = searchable && Boolean(searchSource) && !disabled;
  const [remoteOptions, setRemoteOptions] = React.useState<TreeOptionMeta[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (!active) {
      setRemoteOptions(null);
      setLoading(false);
      setError(undefined);
      return;
    }
    const trimmed = query.trim();
    if (!trimmed) {
      setRemoteOptions(null);
      setLoading(false);
      setError(undefined);
      return;
    }
    const controller = new AbortController();
    const handle = setTimeout(() => {
      if (controller.signal.aborted) {
        return;
      }
      setLoading(true);
      setError(undefined);
      executeTreeSource(searchSource!, helpers, { searchQuery: trimmed }, controller.signal)
        .then((result) => {
          if (controller.signal.aborted) {
            return;
          }
          if (result.ok) {
            setRemoteOptions(buildTreeOptionMetaList(result.data, config));
          } else {
            setError(
              typeof result.error === 'string' && result.error
                ? result.error
                : result.error instanceof Error
                  ? result.error.message
                  : 'Search failed.',
            );
            setRemoteOptions([]);
          }
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) {
            return;
          }
          setError(err instanceof Error ? err.message : 'Search failed.');
          setRemoteOptions([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        });
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(handle);
    };
  }, [active, config, helpers, query, searchSource]);

  return { remoteOptions, loading, error };
}

export interface TreeLazyChildrenController {
  options: TreeOptionMeta[];
  nodeStates: ReadonlyMap<string, TreeLazyNodeState>;
  loadChildren: (option: TreeOptionMeta) => void;
  retryLoadChildren: (option: TreeOptionMeta) => void;
  reset: () => void;
}

/**
 * Owns lazy (on-demand) child loading for tree options.
 *
 * Tracks per-node loading/error state keyed by `valueKey`. When a
 * `deferChildren` node is expanded, the renderer calls `loadChildren(option)`,
 * which triggers `executeTreeSource(childrenSource, helpers,
 * { expandedNodeValue: option.value })`. On success, children are merged
 * immutably into the options tree via {@link mergeChildOptions} and
 * `deferChildren` is cleared. On failure, the node shows inline error + retry.
 *
 * Coexists with cascade (E0b): after children arrive, the options change
 * triggers re-derivation of `deriveCheckedState` for the parent.
 */
export function useTreeLazyChildren(input: {
  baseOptions: TreeOptionMeta[];
  childrenSource?: TreeSourceConfig;
  helpers: RendererHelpers;
  config: TreeOptionConfig;
  enabled: boolean;
}): TreeLazyChildrenController {
  const { baseOptions, childrenSource, helpers, config, enabled } = input;
  const [mergedOptions, setMergedOptions] = React.useState<TreeOptionMeta[] | null>(null);
  const [nodeStates, setNodeStates] = React.useState<ReadonlyMap<string, TreeLazyNodeState>>(
    new Map(),
  );
  const requestedRef = React.useRef<Set<string>>(new Set());

  // H14: guard lazy-load resolutions so they never setState after unmount or
  // stale-merge into a baseOptions snapshot that has since changed. The mounted
  // ref shields unmount; the generation token invalidates in-flight loads when
  // the inputs that define the load (baseOptions/childrenSource/config/helpers)
  // change.
  const mountedRef = React.useRef(true);
  const generationRef = React.useRef(0);
  React.useEffect(() => {
    // Reset on (re-)mount: StrictMode double-mounts effects (mount → cleanup
    // → mount); the cleanup must not leave the ref false for the second mount,
    // or every in-flight lazy load would be discarded as "unmounted".
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  React.useEffect(() => {
    return () => {
      generationRef.current += 1;
    };
  }, [baseOptions, childrenSource, config, helpers]);

  const reset = React.useCallback(() => {
    setMergedOptions(null);
    setNodeStates(new Map());
    requestedRef.current = new Set();
  }, []);

  const runLoad = React.useCallback(
    (option: TreeOptionMeta) => {
      if (!childrenSource) {
        return;
      }
      const generation = generationRef.current;
      // Snapshot the base at dispatch time so a later resolve does not merge
      // children into a stale base captured by an older closure.
      const baseSnapshot = baseOptions;
      setNodeStates((prev) => {
        const next = new Map(prev);
        next.set(option.valueKey, { loading: true });
        return next;
      });

      executeTreeSource(childrenSource, helpers, { expandedNodeValue: option.value })
        .then((result) => {
          if (!mountedRef.current || generationRef.current !== generation) {
            return;
          }
          if (result.ok) {
            setMergedOptions((prev) =>
              mergeChildOptions(prev ?? baseSnapshot, option.valueKey, result.data, config),
            );
            setNodeStates((prev) => {
              const next = new Map(prev);
              next.delete(option.valueKey);
              return next;
            });
          } else {
            const message =
              typeof result.error === 'string'
                ? result.error
                : result.error instanceof Error
                  ? result.error.message
                  : 'Failed to load children.';
            setNodeStates((prev) => {
              const next = new Map(prev);
              next.set(option.valueKey, { loading: false, error: message });
              return next;
            });
          }
        })
        .catch((err: unknown) => {
          if (!mountedRef.current || generationRef.current !== generation) {
            return;
          }
          const message = err instanceof Error ? err.message : 'Failed to load children.';
          setNodeStates((prev) => {
            const next = new Map(prev);
            next.set(option.valueKey, { loading: false, error: message });
            return next;
          });
        });
    },
    [baseOptions, childrenSource, config, helpers],
  );

  const loadChildren = React.useCallback(
    (option: TreeOptionMeta) => {
      if (!enabled || option.deferChildren !== true || !childrenSource) {
        return;
      }
      if (requestedRef.current.has(option.valueKey)) {
        return;
      }
      requestedRef.current.add(option.valueKey);
      runLoad(option);
    },
    [childrenSource, enabled, runLoad],
  );

  const retryLoadChildren = React.useCallback(
    (option: TreeOptionMeta) => {
      if (!enabled || option.deferChildren !== true || !childrenSource) {
        return;
      }
      requestedRef.current.add(option.valueKey);
      runLoad(option);
    },
    [childrenSource, enabled, runLoad],
  );

  React.useEffect(() => {
    if (!enabled) {
      reset();
    }
  }, [enabled, reset]);

  return {
    options: enabled ? mergedOptions ?? baseOptions : baseOptions,
    nodeStates,
    loadChildren,
    retryLoadChildren,
    reset,
  };
}
