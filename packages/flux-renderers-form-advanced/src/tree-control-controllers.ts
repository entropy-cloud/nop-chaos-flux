import React from 'react';
import type { ActionSchema } from '@nop-chaos/flux-core';
import type { RendererHelpers, SourceTransientState } from '@nop-chaos/flux-react';
import type { TreeSourceConfig } from '@nop-chaos/flux-renderers-form';
import {
  cascadeDeselectParent,
  cascadeSelectParent,
  deriveCheckedState,
  flattenTreeOptions,
  isTreeSelectionChecked,
  mergeChildOptions,
  toggleTreeSelection,
  type TreeCheckedState,
  type TreeOptionConfig,
  type TreeOptionMeta,
} from './tree-options.js';
import { buildTreeOptionMetaList } from './tree-options.js';

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
 * to the fetcher. `dispatch({ scope })` routes the scope correctly via
 * `mergeActionContext(input, { scope })`.
 */
export async function executeTreeSource(
  config: TreeSourceConfig,
  helpers: RendererHelpers,
  patch: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<{ ok: boolean; data?: unknown; error?: unknown }> {
  const scope = helpers.createScope(patch);
  if (config.formula !== undefined) {
    try {
      const value = helpers.evaluate(config.formula, scope);
      return { ok: true, data: value };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  }
  if (!config.action) {
    return { ok: false, error: new Error('Tree source requires action or formula') };
  }
  const actionInput = { ...config } as unknown as ActionSchema;
  try {
    const result = await helpers.dispatch(actionInput, { scope, signal });
    return result;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err : new Error(String(err)) };
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
    let cancelled = false;
    // AUDIT-12: abort the in-flight request on cleanup (newer query, unmount,
    // or dep change). The `cancelled` flag is retained as the stale-response
    // guard for paths that do not honor the signal (e.g. formula sources).
    const controller = new AbortController();
    const handle = setTimeout(() => {
      if (cancelled) {
        return;
      }
      setLoading(true);
      setError(undefined);
      executeTreeSource(searchSource!, helpers, { searchQuery: trimmed }, controller.signal)
        .then((result) => {
          if (cancelled) {
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
          if (cancelled) {
            return;
          }
          setError(err instanceof Error ? err.message : 'Search failed.');
          setRemoteOptions([]);
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    }, 300);
    return () => {
      cancelled = true;
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

export function getSourceErrorMessage(sourceState: SourceTransientState | undefined) {
  if (sourceState?.status !== 'error') {
    return undefined;
  }

  if (typeof sourceState.error === 'string' && sourceState.error) {
    return sourceState.error;
  }

  if (
    sourceState.error &&
    typeof sourceState.error === 'object' &&
    'message' in sourceState.error
  ) {
    const message = (sourceState.error as { message?: unknown }).message;

    if (typeof message === 'string' && message) {
      return message;
    }
  }

  return 'Failed to load tree options.';
}

export function isMultipleMode(treeMode: unknown) {
  return treeMode === 'checkbox';
}

function filterTreeOptions(entries: TreeOptionMeta[], lowerQuery: string): TreeOptionMeta[] {
  return entries.flatMap((entry) => {
    const nextChildren = filterTreeOptions(entry.children, lowerQuery);
    const matches =
      entry.label.toLowerCase().includes(lowerQuery) ||
      entry.pathLabel.toLowerCase().includes(lowerQuery);

    if (!matches && nextChildren.length === 0) {
      return [];
    }

    return [{ ...entry, children: nextChildren }];
  });
}

function flattenVisibleTreeOptions(entries: TreeOptionMeta[], expandedKeys: ReadonlySet<string>) {
  const flattened: TreeOptionMeta[] = [];

  function walk(nodes: TreeOptionMeta[]) {
    for (const node of nodes) {
      flattened.push(node);
      if (node.children.length > 0 && expandedKeys.has(node.valueKey)) {
        walk(node.children);
      }
    }
  }

  walk(entries);
  return flattened;
}

export function useTreeOptionNodeController(input: {
  option: TreeOptionMeta;
  value: unknown;
  multiple: boolean;
  cascade?: boolean;
  onlyLeaf?: boolean;
  disabled: boolean;
  onChange: (value: unknown) => void;
  expanded: boolean;
  focused: boolean;
  itemId: string;
  onToggleExpanded: (option: TreeOptionMeta, expanded: boolean) => void;
  onMoveFocus: (direction: 'prev' | 'next' | 'first' | 'last') => void;
  onFocusItem: (option: TreeOptionMeta) => void;
}) {
  const {
    option,
    value,
    multiple,
    cascade,
    onlyLeaf,
    disabled,
    onChange,
    expanded,
    focused,
    itemId,
    onToggleExpanded,
    onMoveFocus,
    onFocusItem,
  } = input;
  const cascadeEnabled = Boolean(cascade && multiple);
  const checkedState: TreeCheckedState = cascadeEnabled
    ? deriveCheckedState(option, Array.isArray(value) ? value : [], Boolean(onlyLeaf))
    : {
        checked: isTreeSelectionChecked(value, option.value, multiple),
        indeterminate: false,
      };
  const checked = checkedState.checked;
  const indeterminate = checkedState.indeterminate;
  const hasChildren = option.children.length > 0 || option.deferChildren === true;

  const handleSelect = React.useCallback(() => {
    if (disabled) {
      return;
    }

    if (cascadeEnabled) {
      const current = Array.isArray(value) ? value : [];
      const nextChecked = deriveCheckedState(option, current, Boolean(onlyLeaf)).checked;
      onChange(
        nextChecked
          ? cascadeDeselectParent(current, option, Boolean(onlyLeaf))
          : cascadeSelectParent(current, option, Boolean(onlyLeaf)),
      );
      return;
    }

    onChange(toggleTreeSelection(value, option.value, multiple));
  }, [
    cascadeEnabled,
    disabled,
    multiple,
    onChange,
    onlyLeaf,
    option,
    value,
  ]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) {
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSelect();
      }

      if (event.key === 'ArrowRight' && hasChildren) {
        event.preventDefault();
        onToggleExpanded(option, true);
      }

      if (event.key === 'ArrowLeft' && hasChildren) {
        event.preventDefault();
        onToggleExpanded(option, false);
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        onMoveFocus('next');
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        onMoveFocus('prev');
      }

      if (event.key === 'Home') {
        event.preventDefault();
        onMoveFocus('first');
      }

      if (event.key === 'End') {
        event.preventDefault();
        onMoveFocus('last');
      }
    },
    [disabled, handleSelect, hasChildren, onMoveFocus, onToggleExpanded, option],
  );

  const handleChevronClick = React.useCallback((event: React.MouseEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onToggleExpanded(option, !expanded);
  }, [expanded, onToggleExpanded, option]);

  const handleChevronKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (!hasChildren) {
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        onToggleExpanded(option, !expanded);
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        event.stopPropagation();
        onToggleExpanded(option, true);
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        event.stopPropagation();
        onToggleExpanded(option, false);
      }
    },
    [expanded, hasChildren, onToggleExpanded, option],
  );

  const handleFocus = React.useCallback(() => {
    onFocusItem(option);
  }, [onFocusItem, option]);

  return {
    expanded,
    checked,
    indeterminate,
    hasChildren,
    focused,
    itemId,
    handleSelect,
    handleKeyDown,
    handleChevronClick,
    handleChevronKeyDown,
    handleFocus,
  };
}

export function useTreeOptionListController(input: {
  options: TreeOptionMeta[];
  searchable: boolean;
  disabled: boolean;
  remoteSearch?: boolean;
  onQueryChange?: (query: string) => void;
}) {
  const { options, searchable, disabled, remoteSearch, onQueryChange } = input;
  const [query, setQuery] = React.useState('');
  const [expandedKeys, setExpandedKeys] = React.useState<Set<string>>(() => {
    const keys = new Set<string>();
    for (const option of flattenTreeOptions(options)) {
      if (option.children.length > 0) {
        keys.add(option.valueKey);
      }
    }
    return keys;
  });

  React.useEffect(() => {
    onQueryChange?.(query);
  }, [onQueryChange, query]);

  const filteredOptions = React.useMemo(() => {
    if (remoteSearch) {
      return options;
    }
    if (!searchable || !query.trim()) {
      return options;
    }

    return filterTreeOptions(options, query.trim().toLowerCase());
  }, [options, query, remoteSearch, searchable]);

  const visibleOptions = React.useMemo(
    () => flattenVisibleTreeOptions(filteredOptions, expandedKeys),
    [expandedKeys, filteredOptions],
  );

  const [activeItemKey, setActiveItemKey] = React.useState<string | undefined>(undefined);

  // H15: track which valueKeys were expandable before, so an options identity
  // change (lazy children merge, refresh) does NOT wipe the user's manual
  // collapses. Newly expandable nodes default to expanded; already-known
  // expandable nodes keep their current expanded/collapsed state; keys that are
  // no longer expandable are pruned.
  const prevExpandableRef = React.useRef<ReadonlySet<string>>(new Set());
  React.useEffect(() => {
    const expandableKeys = new Set<string>();
    for (const option of flattenTreeOptions(options)) {
      if (option.children.length > 0) {
        expandableKeys.add(option.valueKey);
      }
    }
    const prevExpandable = prevExpandableRef.current;
    prevExpandableRef.current = expandableKeys;
    setExpandedKeys((previous) => {
      const next = new Set(previous);
      for (const key of expandableKeys) {
        if (!prevExpandable.has(key)) {
          next.add(key);
        }
      }
      for (const key of next) {
        if (!expandableKeys.has(key)) {
          next.delete(key);
        }
      }
      return next;
    });
  }, [options]);

  React.useEffect(() => {
    if (disabled || visibleOptions.length === 0) {
      setActiveItemKey(undefined);
      return;
    }

    if (!activeItemKey || !visibleOptions.some((option) => option.valueKey === activeItemKey)) {
      setActiveItemKey(visibleOptions[0]?.valueKey);
    }
  }, [activeItemKey, disabled, visibleOptions]);

  const toggleExpanded = React.useCallback((option: TreeOptionMeta, nextExpanded: boolean) => {
    if (option.children.length === 0 && option.deferChildren !== true) {
      return;
    }

    setExpandedKeys((previous) => {
      const next = new Set(previous);
      if (nextExpanded) {
        next.add(option.valueKey);
      } else {
        next.delete(option.valueKey);
      }
      return next;
    });
  }, []);

  const moveFocus = React.useCallback(
    (direction: 'prev' | 'next' | 'first' | 'last') => {
      if (visibleOptions.length === 0) {
        return;
      }

      if (direction === 'first') {
        setActiveItemKey(visibleOptions[0]?.valueKey);
        return;
      }

      if (direction === 'last') {
        setActiveItemKey(visibleOptions[visibleOptions.length - 1]?.valueKey);
        return;
      }

      const currentIndex = activeItemKey
        ? visibleOptions.findIndex((option) => option.valueKey === activeItemKey)
        : -1;
      const fallbackIndex = direction === 'next' ? 0 : visibleOptions.length - 1;
      const nextIndex =
        currentIndex < 0
          ? fallbackIndex
          : Math.max(
              0,
              Math.min(
                visibleOptions.length - 1,
                currentIndex + (direction === 'next' ? 1 : -1),
              ),
            );
      setActiveItemKey(visibleOptions[nextIndex]?.valueKey);
    },
    [activeItemKey, visibleOptions],
  );

  const focusItem = React.useCallback((option: TreeOptionMeta) => {
    setActiveItemKey(option.valueKey);
  }, []);

  return {
    query,
    setQuery,
    filteredOptions,
    visibleOptions,
    activeItemKey,
    expandedKeys,
    toggleExpanded,
    moveFocus,
    focusItem,
  };
}

export function useTreeSelectController(input: {
  options: TreeOptionMeta[];
  treeConfig: TreeOptionConfig;
  value: unknown;
  multiple: boolean;
  placeholder: unknown;
}) {
  const { options, treeConfig, value, multiple, placeholder } = input;
  const selectedValueSet = React.useMemo(() => {
    if (!multiple || !Array.isArray(value)) {
      return undefined;
    }

    return new Set(value);
  }, [multiple, value]);

  const triggerText = React.useMemo(() => {
    const flattenedOptions = flattenTreeOptions(options, treeConfig);
    const selectedLabels = multiple
      ? flattenedOptions
          .filter((entry) => selectedValueSet?.has(entry.value))
          .map((entry) => entry.label)
      : flattenedOptions.find((entry) => Object.is(entry.value, value))?.label;

    return Array.isArray(selectedLabels) ? selectedLabels.join(', ') : selectedLabels;
  }, [multiple, options, selectedValueSet, treeConfig, value]);

  const triggerLabel =
    typeof placeholder === 'string' && placeholder ? placeholder : 'Select tree option';

  return {
    triggerText,
    triggerLabel,
    hasSelection: Boolean(triggerText),
  };
}
